import { Track } from '../types';

const PIPED_INSTANCES = [
  'https://api.piped.privacydev.net',
  'https://pipedapi.kavin.rocks',
  'https://piped-api.lunar.icu',
  'https://pipedapi.tokhmi.xyz',
];

// High-confidence initial chart items for instant playback on start
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
    album: 'Hurry Up, We\'re Dreaming',
    duration: 243,
    thumbnail: 'https://images.unsplash.com/photo-1508700115892-45ecd05ae2ad?w=500&auto=format&fit=crop&q=80',
    source: 'youtube',
    streamUrl: 'https://cdn.pixabay.com/download/audio/2021/08/04/audio_0625c1539c.mp3?filename=synthwave-80s-110045.mp3',
  },
];

export async function searchYouTubeTracks(query: string): Promise<Track[]> {
  if (!query || query.trim().length === 0) {
    return FEATURED_TRENDING_TRACKS;
  }

  const cleanQuery = query.trim();

  for (const instance of PIPED_INSTANCES) {
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 4000);

      const res = await fetch(`${instance}/search?q=${encodeURIComponent(cleanQuery)}&filter=music_songs`, {
        signal: controller.signal,
      });
      clearTimeout(timeoutId);

      if (!res.ok) continue;

      const data = await res.json();
      const items = (data.items || []).filter((item: any) => item.type === 'stream');

      if (items.length > 0) {
        return items.map((item: any) => ({
          id: `yt_${item.url.replace('/watch?v=', '')}`,
          title: item.title,
          artist: item.uploaderName || 'Неизвестный исполнитель',
          album: 'YouTube Music',
          duration: item.duration || 180,
          thumbnail: item.thumbnail || 'https://images.unsplash.com/photo-1511671782779-c97d3d27a1d4?w=500',
          source: 'youtube' as const,
        }));
      }
    } catch {
      // try next instance
    }
  }

  // Local fallback filter if offline or upstream instances delayed
  return FEATURED_TRENDING_TRACKS.filter(
    (t) =>
      t.title.toLowerCase().includes(cleanQuery.toLowerCase()) ||
      t.artist.toLowerCase().includes(cleanQuery.toLowerCase())
  );
}

export async function resolveStreamUrl(track: Track): Promise<string> {
  if (track.streamUrl && !track.streamUrl.startsWith('piped:')) {
    return track.streamUrl;
  }

  const videoId = track.id.replace('yt_', '');

  for (const instance of PIPED_INSTANCES) {
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 4500);

      const res = await fetch(`${instance}/streams/${videoId}`, {
        signal: controller.signal,
      });
      clearTimeout(timeoutId);

      if (!res.ok) continue;

      const data = await res.json();
      const audioStreams = (data.audioStreams || []).sort(
        (a: any, b: any) => (b.bitrate || 0) - (a.bitrate || 0)
      );

      if (audioStreams.length > 0 && audioStreams[0].url) {
        return audioStreams[0].url;
      }
    } catch {
      // try next
    }
  }

  // If online stream resolution fails, fallback to clean demo audio
  return 'https://cdn.pixabay.com/download/audio/2022/05/27/audio_1808fbf07a.mp3?filename=lofi-study-112191.mp3';
}
