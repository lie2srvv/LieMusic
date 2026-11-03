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

export interface UserPrivacySettings {
  showListeningHistory: boolean;
  showFavorites: boolean;
  stealthMode: boolean; // Do not save any history
}

export interface UserProfile {
  id: string;
  nickname: string;
  avatar: string;
  plan: 'free' | 'lifetime';
  licenseKey?: string;
  activatedAt?: string;
  privacy: UserPrivacySettings;
  createdAt: string;
}

export interface LyricsLine {
  timeMs: number;
  text: string;
}

export interface EqualizerBand {
  frequency: number;
  gain: number; // -12dB to +12dB
}

export interface EqualizerPreset {
  id: string;
  name: string;
  bands: number[]; // 10 values for 32, 64, 125, 250, 500, 1k, 2k, 4k, 8k, 16k
  bassBoost?: number; // 0 to 100
}

export interface Playlist {
  id: string;
  title: string;
  description: string;
  coverUrl?: string;
  tracks: Track[];
  createdAt: string;
}
