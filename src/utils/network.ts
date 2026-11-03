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
