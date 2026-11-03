import { UserProfile } from '../types';
import { invoke } from '@tauri-apps/api/core';

const PROFILE_STORAGE_KEY = 'liemusic_profile_v1';

export const AVATAR_PRESETS = [
  '🎧', '🦊', '⚡', '🌙', '🔥', '🎵', '👾', '🚀', '💎', '🐺'
];

export const DEFAULT_PROFILE: UserProfile = {
  id: 'usr_lie_guest',
  nickname: 'Lie Слушатель',
  avatar: '🦊',
  plan: 'free',
  privacy: {
    showListeningHistory: true,
    showFavorites: true,
    stealthMode: false,
  },
  createdAt: new Date().toISOString(),
};

export async function getDeviceId(): Promise<string> {
  try {
    const id = await invoke<string>('get_device_id');
    return id;
  } catch {
    let localId = localStorage.getItem('liemusic_device_id');
    if (!localId) {
      localId = 'LM-DEV-' + Math.random().toString(36).substring(2, 10).toUpperCase();
      localStorage.setItem('liemusic_device_id', localId);
    }
    return localId;
  }
}

export async function loadUserProfile(): Promise<UserProfile> {
  try {
    const profileJson = await invoke<string>('load_profile_file');
    const profile = JSON.parse(profileJson);
    return { ...DEFAULT_PROFILE, ...profile };
  } catch {
    const cached = localStorage.getItem(PROFILE_STORAGE_KEY);
    if (cached) {
      try {
        return { ...DEFAULT_PROFILE, ...JSON.parse(cached) };
      } catch {}
    }
  }

  const deviceId = await getDeviceId();
  const initial: UserProfile = {
    ...DEFAULT_PROFILE,
    id: deviceId,
  };
  await saveUserProfile(initial);
  return initial;
}

export async function saveUserProfile(profile: UserProfile): Promise<void> {
  const json = JSON.stringify(profile, null, 2);
  localStorage.setItem(PROFILE_STORAGE_KEY, json);

  try {
    await invoke('save_profile_file', { profileJson: json });
  } catch (e) {
    // web preview fallback
  }
}

export function exportProfileToFile(profile: UserProfile): void {
  const blob = new Blob([JSON.stringify(profile, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `liemusic_profile_${profile.nickname.replace(/\s+/g, '_')}.json`;
  a.click();
  URL.revokeObjectURL(url);
}

export function importProfileFromFile(file: File): Promise<UserProfile> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = async (e) => {
      try {
        const text = e.target?.result as string;
        const parsed = JSON.parse(text) as UserProfile;
        if (!parsed.id || !parsed.nickname) {
          throw new Error('Некорректный формат файла профиля');
        }
        await saveUserProfile(parsed);
        resolve(parsed);
      } catch (err) {
        reject(err);
      }
    };
    reader.onerror = () => reject(new Error('Ошибка чтения файла'));
    reader.readAsText(file);
  });
}
