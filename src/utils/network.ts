export function isCellularConnection(): boolean {
  if (typeof navigator === 'undefined') return false;
  const conn =
    (navigator as any).connection ||
    (navigator as any).mozConnection ||
    (navigator as any).webkitConnection;
  if (!conn) return false;

  if (conn.type === 'cellular') return true;
  if (conn.type && conn.type !== 'wifi' && conn.type !== 'ethernet' && conn.type !== 'none') {
    return true;
  }
  return false;
}

export function isOfflineModeEnabled(): boolean {
  try {
    return localStorage.getItem('liemusic_offline_mode_enabled') === 'true';
  } catch {
    return false;
  }
}

export function setOfflineModeEnabled(enabled: boolean): void {
  try {
    localStorage.setItem('liemusic_offline_mode_enabled', enabled ? 'true' : 'false');
    window.dispatchEvent(new CustomEvent('liemusic_offline_mode_change', { detail: { enabled } }));
  } catch {}
}
