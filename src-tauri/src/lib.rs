use serde::{Deserialize, Serialize};
use std::fs;
use std::io::{Read, Seek, SeekFrom};
use std::path::PathBuf;
use std::sync::atomic::{AtomicBool, Ordering};
use tauri::Manager;
use tokio::io::{AsyncReadExt, AsyncWriteExt};

#[derive(Debug, Serialize, Deserialize, Clone)]
#[serde(rename_all = "camelCase")]
pub struct SearchTrackResult {
    pub id: String,
    pub title: String,
    pub artist: String,
    pub album: Option<String>,
    pub duration: u64,
    pub thumbnail: String,
    pub source: String,
    pub stream_url: Option<String>,
}

static OFFLINE_SERVER_STARTED: AtomicBool = AtomicBool::new(false);

fn get_app_dir(app: &tauri::AppHandle) -> Result<PathBuf, String> {
    app.path()
        .app_data_dir()
        .map_err(|e| format!("Failed to get app data dir: {}", e))
}

fn sanitize_track_id(id: &str) -> String {
    id.chars()
        .filter(|c| c.is_alphanumeric() || *c == '_' || *c == '-')
        .collect()
}

fn ensure_offline_server_started(app_dir: PathBuf) {
    if OFFLINE_SERVER_STARTED.swap(true, Ordering::SeqCst) {
        return;
    }

    tauri::async_runtime::spawn(async move {
        let listener = match tokio::net::TcpListener::bind("127.0.0.1:28491").await {
            Ok(l) => l,
            Err(e) => {
                eprintln!("[OfflineServer] Error binding to 127.0.0.1:28491: {}", e);
                return;
            }
        };

        loop {
            if let Ok((mut stream, _)) = listener.accept().await {
                let dir = app_dir.clone();
                tokio::spawn(async move {
                    let mut buf = [0u8; 2048];
                    let n = match stream.read(&mut buf).await {
                        Ok(n) if n > 0 => n,
                        _ => return,
                    };
                    let req_str = String::from_utf8_lossy(&buf[..n]);
                    let first_line = req_str.lines().next().unwrap_or("");
                    let parts: Vec<&str> = first_line.split_whitespace().collect();
                    if parts.len() < 2 {
                        return;
                    }

                    let method = parts[0];
                    if method == "OPTIONS" {
                        let cors_resp = "HTTP/1.1 204 No Content\r\n\
                             Access-Control-Allow-Origin: *\r\n\
                             Access-Control-Allow-Methods: GET, HEAD, OPTIONS\r\n\
                             Access-Control-Allow-Headers: *\r\n\
                             Access-Control-Max-Age: 86400\r\n\
                             Connection: close\r\n\r\n";
                        let _ = stream.write_all(cors_resp.as_bytes()).await;
                        return;
                    }

                    if method != "GET" && method != "HEAD" {
                        return;
                    }

                    let path = parts[1];
                    let raw_id = path
                        .trim_start_matches("/offline/")
                        .trim_start_matches("/track/");
                    let clean_id = sanitize_track_id(raw_id);
                    if clean_id.is_empty() {
                        let bad_req = "HTTP/1.1 400 Bad Request\r\nContent-Length: 0\r\nConnection: close\r\n\r\n";
                        let _ = stream.write_all(bad_req.as_bytes()).await;
                        return;
                    }

                    let file_path = dir.join("downloads").join(format!("{}.audio", clean_id));

                    if !file_path.exists() {
                        let not_found = "HTTP/1.1 404 Not Found\r\nContent-Length: 0\r\nAccess-Control-Allow-Origin: *\r\nConnection: close\r\n\r\n";
                        let _ = stream.write_all(not_found.as_bytes()).await;
                        return;
                    }

                    let mut file = match std::fs::File::open(&file_path) {
                        Ok(f) => f,
                        Err(_) => return,
                    };

                    let total_len = match file.metadata() {
                        Ok(m) => m.len() as usize,
                        Err(_) => return,
                    };

                    // Detect MIME type by inspecting the header bytes without loading whole file
                    let mut header_buf = [0u8; 32];
                    let header_read_len = file.read(&mut header_buf).unwrap_or(0);
                    let header_slice = &header_buf[..header_read_len];

                    let mime_type = if header_slice.starts_with(b"ID3")
                        || (header_slice.len() > 1
                            && header_slice[0] == 0xFF
                            && (header_slice[1] & 0xE0) == 0xE0)
                    {
                        "audio/mpeg"
                    } else if header_slice.starts_with(b"OggS") {
                        "audio/ogg"
                    } else if header_slice.starts_with(b"RIFF") {
                        "audio/wav"
                    } else if header_slice.starts_with(b"fLaC") {
                        "audio/flac"
                    } else if header_slice.starts_with(&[0x1A, 0x45, 0xDF, 0xA3]) {
                        "audio/webm"
                    } else if header_slice.len() > 12
                        && (&header_slice[4..8] == b"ftyp" || &header_slice[4..8] == b"moov")
                    {
                        "audio/mp4"
                    } else {
                        "audio/mpeg"
                    };

                    // Check for Range request header
                    let range_header = req_str
                        .lines()
                        .find(|l| l.to_lowercase().starts_with("range:"))
                        .and_then(|l| l.split(':').nth(1))
                        .map(|s| s.trim());

                    if let Some(range_val) = range_header {
                        if let Some(bytes_spec) = range_val.strip_prefix("bytes=") {
                            let range_parts: Vec<&str> = bytes_spec.split('-').collect();
                            let start: usize = range_parts
                                .first()
                                .and_then(|s| s.parse().ok())
                                .unwrap_or(0);
                            let end: usize = range_parts
                                .get(1)
                                .and_then(|s| s.parse().ok())
                                .unwrap_or(total_len.saturating_sub(1));
                            let end = end.min(total_len.saturating_sub(1));

                            if start <= end && start < total_len {
                                let chunk_len = end - start + 1;
                                let header = format!(
                                    "HTTP/1.1 206 Partial Content\r\n\
                                     Content-Type: {}\r\n\
                                     Content-Length: {}\r\n\
                                     Content-Range: bytes {}-{}/{}\r\n\
                                     Accept-Ranges: bytes\r\n\
                                     Access-Control-Allow-Origin: *\r\n\
                                     Access-Control-Allow-Methods: GET, HEAD, OPTIONS\r\n\
                                     Access-Control-Allow-Headers: *\r\n\
                                     Access-Control-Expose-Headers: Content-Length, Content-Range, Accept-Ranges\r\n\
                                     Connection: close\r\n\r\n",
                                    mime_type, chunk_len, start, end, total_len
                                );
                                let _ = stream.write_all(header.as_bytes()).await;

                                if method == "GET" {
                                    if file.seek(SeekFrom::Start(start as u64)).is_ok() {
                                        let mut chunk = vec![0u8; chunk_len];
                                        if file.read_exact(&mut chunk).is_ok() {
                                            let _ = stream.write_all(&chunk).await;
                                        }
                                    }
                                }
                                return;
                            }
                        }
                    }

                    // Standard 200 OK response
                    let header = format!(
                        "HTTP/1.1 200 OK\r\n\
                         Content-Type: {}\r\n\
                         Content-Length: {}\r\n\
                         Accept-Ranges: bytes\r\n\
                         Access-Control-Allow-Origin: *\r\n\
                         Access-Control-Allow-Methods: GET, HEAD, OPTIONS\r\n\
                         Access-Control-Allow-Headers: *\r\n\
                         Access-Control-Expose-Headers: Content-Length, Content-Range, Accept-Ranges\r\n\
                         Connection: close\r\n\r\n",
                        mime_type, total_len
                    );
                    let _ = stream.write_all(header.as_bytes()).await;

                    if method == "GET" {
                        if file.seek(SeekFrom::Start(0)).is_ok() {
                            let mut file_bytes = Vec::with_capacity(total_len);
                            if file.read_to_end(&mut file_bytes).is_ok() {
                                let _ = stream.write_all(&file_bytes).await;
                            }
                        }
                    }
                });
            }
        }
    });
}

fn extract_youtube_videos(val: &serde_json::Value, out: &mut Vec<SearchTrackResult>) {
    if let Some(obj) = val.as_object() {
        let is_video = obj.contains_key("videoId")
            && (obj.contains_key("title") || obj.contains_key("headline"));

        if is_video {
            let vid = obj
                .get("videoId")
                .and_then(|v| v.as_str())
                .unwrap_or("")
                .to_string();

            let title = obj
                .get("title")
                .and_then(|t| {
                    t.get("runs")
                        .and_then(|r| r.as_array())
                        .and_then(|arr| arr.first())
                        .and_then(|item| item.get("text"))
                        .and_then(|text| text.as_str())
                        .or_else(|| t.get("simpleText").and_then(|s| s.as_str()))
                })
                .unwrap_or("")
                .trim()
                .to_string();

            let raw_artist = obj
                .get("ownerText")
                .or_else(|| obj.get("shortBylineText"))
                .and_then(|b| {
                    b.get("runs")
                        .and_then(|r| r.as_array())
                        .and_then(|arr| arr.first())
                        .and_then(|item| item.get("text"))
                        .and_then(|text| text.as_str())
                })
                .unwrap_or("YouTube Music")
                .trim();
            let artist = raw_artist
                .strip_suffix(" - Topic")
                .unwrap_or(raw_artist)
                .trim()
                .to_string();

            let thumb = obj
                .get("thumbnail")
                .and_then(|t| t.get("thumbnails"))
                .and_then(|arr| arr.as_array())
                .and_then(|arr| arr.last())
                .and_then(|t| t.get("url"))
                .and_then(|u| u.as_str())
                .unwrap_or("https://images.unsplash.com/photo-1511671782779-c97d3d27a1d4?w=500");

            let duration_text = obj
                .get("lengthText")
                .and_then(|lt| lt.get("simpleText"))
                .and_then(|s| s.as_str())
                .unwrap_or("3:00");

            let parts: Vec<&str> = duration_text.split(':').collect();
            let duration = if parts.len() >= 2 {
                match parts.len() {
                    2 => {
                        parts[0].parse::<u64>().unwrap_or(3) * 60
                            + parts[1].parse::<u64>().unwrap_or(0)
                    }
                    3 => {
                        parts[0].parse::<u64>().unwrap_or(1) * 3600
                            + parts[1].parse::<u64>().unwrap_or(0) * 60
                            + parts[2].parse::<u64>().unwrap_or(0)
                    }
                    _ => 180,
                }
            } else {
                180
            };

            let track_id = format!("yt_{}", vid);
            if !vid.is_empty() && !title.is_empty() && duration <= 1200 && !out.iter().any(|t| t.id == track_id) {
                let high_res_thumb = if !vid.is_empty() {
                    format!("https://i.ytimg.com/vi/{}/hqdefault.jpg", vid)
                } else {
                    thumb.to_string()
                };
                out.push(SearchTrackResult {
                    id: track_id,
                    title,
                    artist,
                    album: Some("YouTube Music".into()),
                    duration,
                    thumbnail: high_res_thumb,
                    source: "youtube".into(),
                    stream_url: None,
                });
            }
        }

        for (_, child) in obj {
            extract_youtube_videos(child, out);
        }
    } else if let Some(arr) = val.as_array() {
        for child in arr {
            extract_youtube_videos(child, out);
        }
    }
}

fn urlencoding(s: &str) -> String {
    let mut encoded = String::new();
    for b in s.bytes() {
        if b.is_ascii_alphanumeric() || b == b'-' || b == b'_' || b == b'.' || b == b'~' {
            encoded.push(b as char);
        } else {
            encoded.push_str(&format!("%{:02X}", b));
        }
    }
    encoded
}

#[tauri::command]
async fn search_music_native(
    query: String,
    source_filter: String,
) -> Result<Vec<SearchTrackResult>, String> {
    let clean_query = query.trim().to_string();
    if clean_query.is_empty() {
        return Ok(Vec::new());
    }

    let client = reqwest::Client::builder()
        .user_agent("Mozilla/5.0 (Linux; Android 14; Pixel 8) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Mobile Safari/537.36")
        .timeout(std::time::Duration::from_secs(7))
        .build()
        .map_err(|e| e.to_string())?;

    let mut results: Vec<SearchTrackResult> = Vec::new();

    // 1. YouTube Search
    if source_filter == "all" || source_filter == "youtube" {
        let yt_body = serde_json::json!({
            "context": {
                "client": {
                    "clientName": "WEB",
                    "clientVersion": "2.20231201.01.00"
                }
            },
            "query": clean_query
        });

        if let Ok(res) = client
            .post("https://www.youtube.com/youtubei/v1/search")
            .header("Content-Type", "application/json")
            .json(&yt_body)
            .send()
            .await
        {
            if let Ok(data) = res.json::<serde_json::Value>().await {
                extract_youtube_videos(&data, &mut results);
            }
        }
    }

    // 2. SoundCloud API Search
    if source_filter == "all" || source_filter == "soundcloud" {
        let sc_url = format!(
            "https://api-v2.soundcloud.com/search/tracks?q={}&client_id=2yeWkbX88QhTzS3OtZp8cLGaJRrOAWwF&limit=20",
            urlencoding(&clean_query)
        );

        if let Ok(res) = client.get(&sc_url).send().await {
            if let Ok(sc_data) = res.json::<serde_json::Value>().await {
                if let Some(collection) = sc_data.get("collection").and_then(|c| c.as_array()) {
                    for item in collection {
                        let id = item
                            .get("id")
                            .and_then(|v| v.as_u64())
                            .map(|n| format!("sc_{}", n))
                            .unwrap_or_default();
                        let title = item
                            .get("title")
                            .and_then(|v| v.as_str())
                            .unwrap_or("")
                            .trim()
                            .to_string();
                        let artist = item
                            .get("user")
                            .and_then(|u| u.get("username"))
                            .and_then(|v| v.as_str())
                            .unwrap_or("SoundCloud")
                            .trim()
                            .to_string();
                        let duration = item
                            .get("duration")
                            .and_then(|d| d.as_u64())
                            .map(|ms| ms / 1000)
                            .unwrap_or(180);
                        let raw_thumb = item
                            .get("artwork_url")
                            .and_then(|a| a.as_str())
                            .or_else(|| {
                                item.get("user")
                                    .and_then(|u| u.get("avatar_url"))
                                    .and_then(|a| a.as_str())
                            })
                            .unwrap_or("https://images.unsplash.com/photo-1518609878373-06d740f60d8b?w=500");
                        let thumbnail = raw_thumb
                            .replace("-large.", "-t500x500.")
                            .replace("-badge.", "-t500x500.")
                            .replace("-small.", "-t500x500.")
                            .replace("-tiny.", "-t500x500.")
                            .replace("-mini.", "-t500x500.")
                            .replace("-crop.", "-t500x500.")
                            .replace("-t67x67.", "-t500x500.")
                            .replace("-t120x120.", "-t500x500.")
                            .replace("-t300x300.", "-t500x500.");

                        let stream_url = item
                            .get("media")
                            .and_then(|m| m.get("transcodings"))
                            .and_then(|t| t.as_array())
                            .and_then(|arr| {
                                arr.iter()
                                    .find(|tc| {
                                        tc.get("format")
                                            .and_then(|f| f.get("protocol"))
                                            .and_then(|p| p.as_str())
                                            == Some("progressive")
                                    })
                                    .or_else(|| arr.first())
                            })
                            .and_then(|tc| tc.get("url"))
                            .and_then(|u| u.as_str())
                            .map(|u| format!("sc_transcoding:{}", u));

                        let track_id = id.clone();
                        if !id.is_empty()
                            && !title.is_empty()
                            && !results.iter().any(|t| t.id == track_id)
                        {
                            results.push(SearchTrackResult {
                                id,
                                title,
                                artist,
                                album: Some("SoundCloud".into()),
                                duration,
                                thumbnail,
                                source: "soundcloud".into(),
                                stream_url,
                            });
                        }
                    }
                }
            }
        }
    }

    Ok(results)
}

#[tauri::command]
async fn resolve_stream_url_native(
    track_id: String,
    stream_url: Option<String>,
    source: String,
) -> Result<String, String> {
    let client = reqwest::Client::builder()
        .user_agent("Mozilla/5.0 (Linux; Android 14; Pixel 8) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Mobile Safari/537.36")
        .timeout(std::time::Duration::from_secs(8))
        .build()
        .map_err(|e| e.to_string())?;

    let is_sc = source == "soundcloud" || track_id.starts_with("sc_") || stream_url.as_ref().map_or(false, |u| u.starts_with("sc_transcoding:"));

    // 1. If SoundCloud track
    if is_sc {
        let sc_client_id = "2yeWkbX88QhTzS3OtZp8cLGaJRrOAWwF";

        if let Some(ref url) = stream_url {
            if url.starts_with("sc_transcoding:") {
                let actual_url = url.replace("sc_transcoding:", "");
                let sc_fetch = format!("{}?client_id={}", actual_url, sc_client_id);
                if let Ok(res) = client.get(&sc_fetch).send().await {
                    if let Ok(data) = res.json::<serde_json::Value>().await {
                        if let Some(media_url) = data.get("url").and_then(|u| u.as_str()) {
                            return Ok(media_url.to_string());
                        }
                    }
                }
            }
        }

        // Fetch track transcodings by SoundCloud numeric ID
        let numeric_id = track_id.replace("sc_", "");
        if !numeric_id.is_empty() {
            let sc_track_url = format!(
                "https://api-v2.soundcloud.com/tracks/{}?client_id={}",
                numeric_id, sc_client_id
            );
            if let Ok(res) = client.get(&sc_track_url).send().await {
                if let Ok(data) = res.json::<serde_json::Value>().await {
                    if let Some(transcodings) = data.get("media").and_then(|m| m.get("transcodings")).and_then(|t| t.as_array()) {
                        let selected_tc = transcodings.iter().find(|tc| {
                            tc.get("format").and_then(|f| f.get("protocol")).and_then(|p| p.as_str()) == Some("progressive")
                        }).or_else(|| transcodings.first());

                        if let Some(tc_url) = selected_tc.and_then(|tc| tc.get("url")).and_then(|u| u.as_str()) {
                            let sc_fetch = format!("{}?client_id={}", tc_url, sc_client_id);
                            if let Ok(m_res) = client.get(&sc_fetch).send().await {
                                if let Ok(m_data) = m_res.json::<serde_json::Value>().await {
                                    if let Some(media_url) = m_data.get("url").and_then(|u| u.as_str()) {
                                        return Ok(media_url.to_string());
                                    }
                                }
                            }
                        }
                    }
                }
            }
        }

        if let Some(ref url) = stream_url {
            if !url.is_empty() && !url.starts_with("sc_transcoding:") && !url.starts_with("yt_") {
                return Ok(url.clone());
            }
        }
    }

    // 2. If YouTube track
    if source == "youtube" || track_id.starts_with("yt_") {
        let video_id = track_id.replace("yt_", "");

        let invidious_hosts = [
            "https://yt.chocolatemoo53.com",
            "https://invidious.nerdvpn.de",
            "https://inv.tux.pizza",
            "https://invidious.drgns.space",
        ];

        for host in invidious_hosts {
            let inv_url = format!(
                "{}/latest_version?id={}&itag=140&local=true",
                host, video_id
            );
            if let Ok(res) = client.get(&inv_url).send().await {
                let final_url = res.url().to_string();
                if !final_url.is_empty() && final_url != inv_url {
                    return Ok(final_url);
                }
            }
        }

        return Ok(format!(
            "https://yt.chocolatemoo53.com/latest_version?id={}&itag=140&local=true",
            video_id
        ));
    }

    if let Some(ref url) = stream_url {
        if !url.is_empty() {
            return Ok(url.clone());
        }
    }

    Ok("https://cdn.pixabay.com/download/audio/2022/05/27/audio_1808fbf07a.mp3?filename=lofi-study-112191.mp3".into())
}

#[tauri::command]
async fn download_track_file(
    app: tauri::AppHandle,
    track_id: String,
    stream_url: Option<String>,
    source: String,
) -> Result<String, String> {
    let clean_id = sanitize_track_id(&track_id);
    if clean_id.is_empty() {
        return Err("Invalid track ID".into());
    }

    let dir = get_app_dir(&app)?;
    let dl_dir = dir.join("downloads");
    if !dl_dir.exists() {
        let _ = fs::create_dir_all(&dl_dir);
    }

    let resolved_url = resolve_stream_url_native(track_id.clone(), stream_url, source).await?;

    let client = reqwest::Client::builder()
        .user_agent("Mozilla/5.0 (Linux; Android 14; Pixel 8) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Mobile Safari/537.36")
        .timeout(std::time::Duration::from_secs(45))
        .build()
        .map_err(|e| e.to_string())?;

    let res = client
        .get(&resolved_url)
        .send()
        .await
        .map_err(|e| format!("Download stream failed: {}", e))?;

    let body_bytes = res
        .bytes()
        .await
        .map_err(|e| format!("Failed to read stream bytes: {}", e))?;

    let mut full_audio_bytes = Vec::new();

    // Check if this is an HLS playlist (SoundCloud m3u8)
    if body_bytes.starts_with(b"#EXTM3U") {
        let text = String::from_utf8_lossy(&body_bytes);
        if let Some(init_start) = text.find("#EXT-X-MAP:URI=\"") {
            let rest = &text[init_start + 16..];
            if let Some(init_end) = rest.find('\"') {
                let init_url = &rest[..init_end];
                if let Ok(init_res) = client.get(init_url).send().await {
                    if let Ok(init_b) = init_res.bytes().await {
                        full_audio_bytes.extend_from_slice(&init_b);
                    }
                }
            }
        }

        for line in text.lines() {
            let trimmed = line.trim();
            if trimmed.starts_with("http") {
                if let Ok(seg_res) = client.get(trimmed).send().await {
                    if let Ok(seg_b) = seg_res.bytes().await {
                        full_audio_bytes.extend_from_slice(&seg_b);
                    }
                }
            }
        }
    } else {
        full_audio_bytes = body_bytes.to_vec();
    }

    if full_audio_bytes.is_empty() {
        return Err("Downloaded audio content was empty".into());
    }

    let file_path = dl_dir.join(format!("{}.audio", clean_id));
    fs::write(&file_path, &full_audio_bytes)
        .map_err(|e| format!("Failed to write track file: {}", e))?;

    ensure_offline_server_started(dir);

    let size_mb = (full_audio_bytes.len() as f64) / (1024.0 * 1024.0);
    Ok(format!("{:.1} МБ", size_mb))
}

#[tauri::command]
fn save_local_track_file(
    app: tauri::AppHandle,
    track_id: String,
    file_bytes: Vec<u8>,
) -> Result<String, String> {
    let clean_id = sanitize_track_id(&track_id);
    if clean_id.is_empty() {
        return Err("Invalid track ID".into());
    }
    if file_bytes.is_empty() {
        return Err("Empty audio file".into());
    }
    let dir = get_app_dir(&app)?;
    let dl_dir = dir.join("downloads");
    if !dl_dir.exists() {
        let _ = fs::create_dir_all(&dl_dir);
    }
    let file_path = dl_dir.join(format!("{}.audio", clean_id));
    fs::write(&file_path, &file_bytes).map_err(|e| format!("Failed to write track file: {}", e))?;

    ensure_offline_server_started(dir);

    let size_mb = (file_bytes.len() as f64) / (1024.0 * 1024.0);
    Ok(format!("{:.1} МБ", size_mb))
}

#[tauri::command]
fn get_downloaded_track_audio(app: tauri::AppHandle, track_id: String) -> Result<String, String> {
    let clean_id = sanitize_track_id(&track_id);
    let dir = get_app_dir(&app)?;
    let file_path = dir.join("downloads").join(format!("{}.audio", clean_id));
    if !file_path.exists() {
        return Err("Track not found in local offline storage".into());
    }
    ensure_offline_server_started(dir);
    Ok(format!("http://127.0.0.1:28491/offline/{}", clean_id))
}

#[tauri::command]
fn delete_downloaded_track_file(app: tauri::AppHandle, track_id: String) -> Result<(), String> {
    let clean_id = sanitize_track_id(&track_id);
    let dir = get_app_dir(&app)?;
    let file_path = dir.join("downloads").join(format!("{}.audio", clean_id));
    if file_path.exists() {
        let _ = fs::remove_file(file_path);
    }
    Ok(())
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .setup(|app| {
            if let Ok(dir) = app.path().app_data_dir() {
                ensure_offline_server_started(dir);
            }
            Ok(())
        })
        .plugin(tauri_plugin_log::Builder::default().build())
        .invoke_handler(tauri::generate_handler![
            search_music_native,
            resolve_stream_url_native,
            download_track_file,
            save_local_track_file,
            get_downloaded_track_audio,
            delete_downloaded_track_file
        ])
        .run(tauri::generate_context!())
        .expect("error while building tauri application");
}
