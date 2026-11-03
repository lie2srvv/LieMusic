import { LyricsLine } from '../types';

export function parseLrc(lrcText: string): LyricsLine[] {
  const lines: LyricsLine[] = [];
  const regex = /\[(\d{2}):(\d{2})\.(\d{2,3})\](.*)/;

  const rawLines = lrcText.split('\n');
  for (const raw of rawLines) {
    const match = regex.exec(raw.trim());
    if (match) {
      const minutes = parseInt(match[1], 10);
      const seconds = parseInt(match[2], 10);
      const ms = match[3].length === 2 ? parseInt(match[3], 10) * 10 : parseInt(match[3], 10);
      const timeMs = (minutes * 60 + seconds) * 1000 + ms;
      const text = match[4].trim();
      if (text) {
        lines.push({ timeMs, text });
      }
    }
  }

  return lines.sort((a, b) => a.timeMs - b.timeMs);
}

export async function fetchLyrics(
  title: string,
  artist: string,
  duration?: number
): Promise<{ synced: LyricsLine[]; plain: string } | null> {
  try {
    const cleanTitle = title.replace(/\([^)]*\)|\[[^\]]*\]/g, '').trim();
    const cleanArtist = artist.replace(/feat\..*/i, '').trim();

    const params = new URLSearchParams({
      track_name: cleanTitle,
      artist_name: cleanArtist,
    });
    if (duration && duration > 0) {
      params.append('duration', Math.round(duration).toString());
    }

    const response = await fetch(`https://lrclib.net/api/get?${params.toString()}`, {
      headers: {
        'User-Agent': 'LieMusic/1.0.0 (https://github.com/lie-ecosystem/liemusic)',
      },
    });

    if (!response.ok) {
      return null;
    }

    const data = await response.json();
    if (data.syncedLyrics) {
      return {
        synced: parseLrc(data.syncedLyrics),
        plain: data.plainLyrics || '',
      };
    }

    if (data.plainLyrics) {
      return {
        synced: [],
        plain: data.plainLyrics,
      };
    }

    return null;
  } catch (error) {
    console.warn('[LieMusic] Failed to fetch lyrics:', error);
    return null;
  }
}
