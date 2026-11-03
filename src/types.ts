export type AudioSource = 'youtube' | 'soundcloud' | 'local';

export interface Track {
  id: string;
  title: string;
  artist: string;
  album?: string;
  duration: number; // in seconds
  thumbnail: string;
  source: AudioSource;
  streamUrl?: string;
  streamExpiry?: number;
  isDownloaded?: boolean;
  fileSize?: string;
  localPath?: string;
}

export interface EqualizerBand {
  frequency: number;
  gain: number;
}

export interface EqualizerPreset {
  id: string;
  name: string;
  bands: number[];
  bassBoost?: number;
}

export interface Playlist {
  id: string;
  title: string;
  description: string;
  coverUrl?: string;
  tracks: Track[];
  createdAt: string;
}
