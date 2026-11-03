import { invoke } from '@tauri-apps/api/core';
import { Track } from '../types';

export const FEATURED_TRENDING_TRACKS: Track[] = [
  {
    id: 'yt_trending_1',
    title: 'Minor',
    artist: 'Miyagi & Andy Panda',
    album: 'YAMAKASI',
    duration: 175,
    thumbnail: 'https://images.unsplash.com/photo-1511671782779-c97d3d27a1d4?w=500&auto=format&fit=crop&q=80',
    source: 'youtube',
    streamUrl: 'https://cdn.pixabay.com/download/audio/2022/05/27/audio_1808fbf07a.mp3?filename=lofi-study-112191.mp3',
  },
  {
    id: 'yt_trending_2',
    title: 'Starboy',
    artist: 'The Weeknd, Daft Punk',
    album: 'Starboy',
    duration: 230,
    thumbnail: 'https://images.unsplash.com/photo-1470225620780-dba8ba36b745?w=500&auto=format&fit=crop&q=80',
    source: 'youtube',
    streamUrl: 'https://cdn.pixabay.com/download/audio/2022/01/18/audio_d0a13f69d2.mp3?filename=electronic-future-beats-117997.mp3',
  },
  {
    id: 'yt_trending_3',
    title: 'Do I Wanna Know?',
    artist: 'Arctic Monkeys',
    album: 'AM',
    duration: 272,
    thumbnail: 'https://images.unsplash.com/photo-1498038432885-c6f3f1b912ee?w=500&auto=format&fit=crop&q=80',
    source: 'youtube',
    streamUrl: 'https://cdn.pixabay.com/download/audio/2022/03/15/audio_c8c8a73467.mp3?filename=reflected-light-14772.mp3',
  },
  {
    id: 'yt_trending_4',
    title: 'FE!N',
    artist: 'Travis Scott, Playboi Carti',
    album: 'UTOPIA',
    duration: 191,
    thumbnail: 'https://images.unsplash.com/photo-1514525253161-7a46d19cd819?w=500&auto=format&fit=crop&q=80',
    source: 'youtube',
    streamUrl: 'https://cdn.pixabay.com/download/audio/2022/10/14/audio_9939f792cb.mp3?filename=trap-future-bass-royalty-free-music-122158.mp3',
  },
  {
    id: 'yt_trending_5',
    title: 'Где прошла ты',
    artist: 'Кравц, Гио Пика',
    album: '17 мгновений осени',
    duration: 168,
    thumbnail: 'https://images.unsplash.com/photo-1487180144351-b8472da7d491?w=500&auto=format&fit=crop&q=80',
    source: 'youtube',
    streamUrl: 'https://cdn.pixabay.com/download/audio/2022/11/06/audio_97223b20e0.mp3?filename=cinematic-chillhop-125026.mp3',
  },
  {
    id: 'yt_trending_6',
    title: 'Midnight City',
    artist: 'M83',
    album: "Hurry Up, We're Dreaming",
    duration: 243,
    thumbnail: 'https://images.unsplash.com/photo-1508700115892-45ecd05ae2ad?w=500&auto=format&fit=crop&q=80',
    source: 'youtube',
    streamUrl: 'https://cdn.pixabay.com/download/audio/2021/08/04/audio_0625c1539c.mp3?filename=synthwave-80s-110045.mp3',
  },
  {
    id: 'yt_trending_7',
    title: 'Sweater Weather',
    artist: 'The Neighbourhood',
    album: 'I Love You.',
    duration: 240,
    thumbnail: 'https://images.unsplash.com/photo-1465847899084-d164df4dedc6?w=500&auto=format&fit=crop&q=80',
    source: 'youtube',
    streamUrl: 'https://cdn.pixabay.com/download/audio/2022/03/10/audio_c3527e30e2.mp3?filename=chill-abstract-intention-12099.mp3',
  },
  {
    id: 'yt_trending_8',
    title: 'After Dark',
    artist: 'Mr.Kitty',
    album: 'TIME',
    duration: 259,
    thumbnail: 'https://images.unsplash.com/photo-1518609878373-06d740f60d8b?w=500&auto=format&fit=crop&q=80',
    source: 'youtube',
    streamUrl: 'https://cdn.pixabay.com/download/audio/2022/10/25/audio_24483fe6d1.mp3?filename=phonk-drift-124430.mp3',
  },
];

export async function searchYouTubeTracks(query: string): Promise<Track[]> {
  if (!query || query.trim().length === 0) {
    return FEATURED_TRENDING_TRACKS;
  }

  const cleanQuery = query.trim();

  // Try Native Rust search first (bypasses CORS, hits InnerTube API)
  try {
    const raw = await invoke<any[]>('search_music_native', {
      query: cleanQuery,
      sourceFilter: 'youtube',
    });

    if (raw && Array.isArray(raw) && raw.length > 0) {
      return raw.map((item) => ({
        id: item.id,
        title: item.title,
        artist: item.artist || 'YouTube Music',
        album: item.album || 'YouTube Music',
        duration: item.duration || 180,
        thumbnail: item.thumbnail || 'https://images.unsplash.com/photo-1511671782779-c97d3d27a1d4?w=500',
        source: 'youtube' as const,
        streamUrl: item.streamUrl || item.stream_url,
      }));
    }
  } catch (err) {
    console.warn('[LieMusic] Native YouTube search failed, falling back:', err);
  }

  // Local fallback filter if offline
  return FEATURED_TRENDING_TRACKS.filter(
    (t) =>
      t.title.toLowerCase().includes(cleanQuery.toLowerCase()) ||
      t.artist.toLowerCase().includes(cleanQuery.toLowerCase())
  );
}

export async function resolveStreamUrl(track: Track): Promise<string> {
  // If track already has direct playable mp3
  if (track.streamUrl && !track.streamUrl.startsWith('sc_transcoding:') && !track.streamUrl.startsWith('piped:')) {
    return track.streamUrl;
  }

  // Call native stream resolver
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

  if (track.streamUrl) return track.streamUrl;
  return 'https://cdn.pixabay.com/download/audio/2022/05/27/audio_1808fbf07a.mp3?filename=lofi-study-112191.mp3';
}
