import { invoke } from '@tauri-apps/api/core';
import { Track } from '../types';

export const FEATURED_SOUNDCLOUD_TRACKS: Track[] = [
  {
    id: 'sc_chill_1',
    title: 'Warm Nights (SoundCloud Edit)',
    artist: 'LAKEY INSPIRED',
    album: 'SoundCloud Originals',
    duration: 198,
    thumbnail: 'https://images.unsplash.com/photo-1518609878373-06d740f60d8b?w=500&auto=format&fit=crop&q=80',
    source: 'soundcloud',
    streamUrl: 'https://cdn.pixabay.com/download/audio/2022/03/10/audio_c3527e30e2.mp3?filename=chill-abstract-intention-12099.mp3',
  },
  {
    id: 'sc_remix_2',
    title: 'GigaChad Theme (Phonk Club Remix)',
    artist: 'Lie Beats',
    album: 'Drift Phonk 2026',
    duration: 142,
    thumbnail: 'https://images.unsplash.com/photo-1509198397868-475647b2a1e5?w=500&auto=format&fit=crop&q=80',
    source: 'soundcloud',
    streamUrl: 'https://cdn.pixabay.com/download/audio/2022/10/25/audio_24483fe6d1.mp3?filename=phonk-drift-124430.mp3',
  },
  {
    id: 'sc_lofi_3',
    title: 'Tokyo Rain & Neon Lights',
    artist: 'ChilledCow / Lofi Girl',
    album: 'Night Coffee',
    duration: 215,
    thumbnail: 'https://images.unsplash.com/photo-1509114397022-ed747cca3f65?w=500&auto=format&fit=crop&q=80',
    source: 'soundcloud',
    streamUrl: 'https://cdn.pixabay.com/download/audio/2021/09/06/audio_959ef098a5.mp3?filename=lofi-rain-chill-112344.mp3',
  },
  {
    id: 'sc_phonk_4',
    title: 'Metamorphosis (Slowed Reverb)',
    artist: 'INTERWORLD',
    album: 'SoundCloud Drift',
    duration: 165,
    thumbnail: 'https://images.unsplash.com/photo-1514525253161-7a46d19cd819?w=500&auto=format&fit=crop&q=80',
    source: 'soundcloud',
    streamUrl: 'https://cdn.pixabay.com/download/audio/2022/10/14/audio_9939f792cb.mp3?filename=trap-future-bass-royalty-free-music-122158.mp3',
  },
  {
    id: 'sc_drift_5',
    title: 'Midnight Shadows (Bass Boosted)',
    artist: 'Ghostface Playa',
    album: 'Underground Anthems',
    duration: 180,
    thumbnail: 'https://images.unsplash.com/photo-1508700115892-45ecd05ae2ad?w=500&auto=format&fit=crop&q=80',
    source: 'soundcloud',
    streamUrl: 'https://cdn.pixabay.com/download/audio/2021/08/04/audio_0625c1539c.mp3?filename=synthwave-80s-110045.mp3',
  },
];

export async function searchSoundCloudTracks(query: string): Promise<Track[]> {
  if (!query || query.trim().length === 0) {
    return FEATURED_SOUNDCLOUD_TRACKS;
  }

  const clean = query.trim();

  // Try Native Rust search first
  try {
    const raw = await invoke<any[]>('search_music_native', {
      query: clean,
      sourceFilter: 'soundcloud',
    });

    if (raw && Array.isArray(raw) && raw.length > 0) {
      return raw.map((item) => {
        const thumb = (item.thumbnail || item.artwork_url || '')
          .replace('-large.', '-t500x500.')
          .replace('-badge.', '-t500x500.');

        return {
          id: item.id,
          title: item.title,
          artist: item.artist || 'SoundCloud',
          album: item.album || 'SoundCloud',
          duration: item.duration || 180,
          thumbnail: thumb || 'https://images.unsplash.com/photo-1518609878373-06d740f60d8b?w=500',
          source: 'soundcloud' as const,
          streamUrl: item.streamUrl || item.stream_url,
        };
      });
    }
  } catch (err) {
    console.warn('[LieMusic] Native SoundCloud search failed, falling back:', err);
  }

  const lower = clean.toLowerCase();
  return FEATURED_SOUNDCLOUD_TRACKS.filter(
    (t) => t.title.toLowerCase().includes(lower) || t.artist.toLowerCase().includes(lower)
  );
}
