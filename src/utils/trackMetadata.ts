import { Track } from '../types';

const STORAGE_KEY = 'liemusic_custom_metadata';

export interface CustomMetadataRecord {
  title?: string;
  artist?: string;
  thumbnail?: string;
  updatedAt?: string;
}

type MetadataMap = Record<string, CustomMetadataRecord>;

function getStoredMap(): MetadataMap {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return {};
    return JSON.parse(raw) as MetadataMap;
  } catch (err) {
    console.error('Failed to parse custom metadata from storage:', err);
    return {};
  }
}

function saveStoredMap(map: MetadataMap): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(map));
  } catch (err) {
    console.error('Failed to save custom metadata to storage:', err);
  }
}

export function getCustomMetadata(trackId: string): CustomMetadataRecord | null {
  if (!trackId) return null;
  const map = getStoredMap();
  return map[trackId] || null;
}

export function saveCustomMetadata(
  trackId: string,
  data: { title?: string; artist?: string; thumbnail?: string }
): void {
  if (!trackId) return;
  const map = getStoredMap();
  const existing = map[trackId] || {};
  map[trackId] = {
    ...existing,
    ...data,
    updatedAt: new Date().toISOString(),
  };
  saveStoredMap(map);
}

export function applyCustomMetadata<T extends Track>(track: T): T {
  if (!track || !track.id) return track;
  const map = getStoredMap();
  const custom = map[track.id];
  if (!custom) return track;

  return {
    ...track,
    title: custom.title?.trim() || track.title,
    artist: custom.artist?.trim() || track.artist,
    thumbnail: custom.thumbnail || track.thumbnail,
  };
}

export function applyCustomMetadataList(tracks: Track[]): Track[] {
  if (!tracks || !Array.isArray(tracks)) return [];
  const map = getStoredMap();
  if (Object.keys(map).length === 0) return tracks;

  return tracks.map((track) => {
    const custom = map[track.id];
    if (!custom) return track;
    return {
      ...track,
      title: custom.title?.trim() || track.title,
      artist: custom.artist?.trim() || track.artist,
      thumbnail: custom.thumbnail || track.thumbnail,
    };
  });
}
