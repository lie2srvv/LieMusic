import { invoke } from '@tauri-apps/api/core';
import { Track } from '../types';
import { getHighResThumbnail } from '../utils/thumbnail';

export async function searchYouTubeTracks(query: string): Promise<Track[]> {
  const cleanQuery = query.trim();
  if (!cleanQuery) return [];

  try {
    const raw = await invoke<any[]>('search_music_native', {
      query: cleanQuery,
      sourceFilter: 'youtube',
    });

    if (raw && Array.isArray(raw)) {
      return raw.map((item) => ({
        id: item.id,
        title: item.title,
        artist: item.artist || 'YouTube Music',
        album: item.album || 'YouTube Music',
        duration: item.duration || 180,
        thumbnail: getHighResThumbnail(item.thumbnail) || 'https://images.unsplash.com/photo-1511671782779-c97d3d27a1d4?w=800',
        source: 'youtube' as const,
        streamUrl: item.streamUrl || item.stream_url,
      }));
    }
  } catch (err) {
    console.warn('[LieMusic] Native YouTube search failed:', err);
  }

  return [];
}

export async function resolveStreamUrl(track: Track): Promise<string> {
  // Check local offline storage FIRST
  try {
    const offlineAudio = await invoke<string>('get_downloaded_track_audio', {
      trackId: track.id,
    });
    if (offlineAudio && offlineAudio.length > 0) {
      return offlineAudio;
    }
  } catch {
    // Track not found offline, stream from remote
  }

  if (track.streamUrl && !track.streamUrl.startsWith('sc_transcoding:') && !track.streamUrl.startsWith('yt_')) {
    return track.streamUrl;
  }

  try {
    const stream = await invoke<string>('resolve_stream_url_native', {
      trackId: track.id,
      streamUrl: track.streamUrl || null,
      source: track.source,
    });
    if (stream && stream.length > 0) {
      return stream;
    }
  } catch (err) {
    console.warn('[LieMusic] Error resolving stream URL natively:', err);
  }

  return track.streamUrl || '';
}
