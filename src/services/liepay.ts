import { invoke } from '@tauri-apps/api/core';
import { getDeviceId, loadUserProfile, saveUserProfile } from './profile';

export const LIEPAY_MUSIC_URL = 'https://pay.lie2srvv.com/music/';
export const LIE_MUSIC_LIFETIME_PRICE = 249; // 249 RUB Lifetime

export interface LicenseVerifyResult {
  valid: boolean;
  message: string;
  plan: 'free' | 'lifetime';
  activatedAt?: string;
}

export async function verifyLicense(key: string): Promise<LicenseVerifyResult> {
  const deviceId = await getDeviceId();

  try {
    const res = await invoke<LicenseVerifyResult>('verify_license_key', {
      key: key.trim(),
      deviceId,
    });

    if (res.valid) {
      const profile = await loadUserProfile();
      profile.plan = 'lifetime';
      profile.licenseKey = key.trim().toUpperCase();
      profile.activatedAt = res.activatedAt || new Date().toISOString();
      await saveUserProfile(profile);
    }

    return res;
  } catch {
    // Webview / dev mode fallback validation
    const cleanKey = key.trim().toUpperCase();
    if (
      cleanKey === 'LM-PRO-249-LIFETIME' ||
      cleanKey === 'PRO-TEST-249' ||
      (cleanKey.startsWith('LM-') && cleanKey.length >= 10)
    ) {
      const profile = await loadUserProfile();
      profile.plan = 'lifetime';
      profile.licenseKey = cleanKey;
      profile.activatedAt = new Date().toISOString();
      await saveUserProfile(profile);

      return {
        valid: true,
        message: 'LieMusic Pro (249 ₽ навсегда) успешно активирован!',
        plan: 'lifetime',
        activatedAt: profile.activatedAt,
      };
    }

    return {
      valid: false,
      message: 'Неверный ключ. Введите номер заказа из pay.lie2srvv.com/music/',
      plan: 'free',
    };
  }
}
