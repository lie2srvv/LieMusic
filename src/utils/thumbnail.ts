/**
 * High-resolution thumbnail resolver for music tracks.
 * Automatically upgrades low-resolution thumbnails from SoundCloud (-large 100x100 -> -t500x500 500x500),
 * YouTube (profile/channel avatars =s68 -> =s800, /default.jpg -> /hqdefault.jpg), and fallbacks.
 */
export function getHighResThumbnail(url?: string | null): string {
  if (!url || typeof url !== 'string') return '';
  let clean = url.trim();

  // 1. SoundCloud: upgrade any low-res thumbnail variants to 500x500 HD
  if (clean.includes('sndcdn.com')) {
    clean = clean.replace(
      /-(large|badge|small|tiny|mini|crop|t67x67|t120x120|t300x300)\.(jpe?g|png|webp)/i,
      '-t500x500.$2'
    );
  }

  // 2. YouTube / Google user avatars (=s68, =s88 -> =s800)
  if (clean.includes('ggpht.com') || clean.includes('googleusercontent.com')) {
    clean = clean.replace(/=s\d+(-c)?/g, '=s800$1');
  }

  // 3. YouTube video thumbnails: default.jpg (120x90) -> hqdefault.jpg (480x360)
  if (clean.includes('ytimg.com/vi/')) {
    clean = clean.replace(/\/default\.jpg(\?.*)?$/i, '/hqdefault.jpg$1');
  }

  // 4. Unsplash fallback images: increase resolution
  if (clean.includes('unsplash.com') && clean.includes('w=')) {
    clean = clean.replace(/w=\d+/, 'w=800');
  }

  return clean;
}
