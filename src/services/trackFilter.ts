import { Track } from '../types';

export interface FilterResult {
  isValid: boolean;
  cleanTitle: string;
  cleanArtist: string;
  reason?: string;
  detectedLang?: 'ru' | 'en' | 'cjk' | 'other';
}

const STOP_PATTERNS = [
  /\b1\s*hour\b/i,
  /\b2\s*hours\b/i,
  /\b3\s*hours\b/i,
  /\b10\s*hours?\b/i,
  /\b1\s*hr\b/i,
  /\b10\s*hr\b/i,
  /\b1h\s*loop\b/i,
  /\b10h\s*loop\b/i,
  /\bhour\s*loop\b/i,
  /\bfull\s*album\b/i,
  /\bfull\s*discography\b/i,
  /\bcompilation\b/i,
  /сборник/i,
  /дискография/i,
  /\bpodcast\b/i,
  /подкаст/i,
  /\bmegamix\b/i,
  /мегамикс/i,
  /\bdj\s*set\b/i,
  /\blive\s*set\b/i,
  /\ball\s*songs\b/i,
  /все\s*песни/i,
  /все\s*треки/i,
  /\bbest\s*songs\s*of\b/i,
  /лучшие\s*песни/i,
  /\bmashup\s*mix\b/i,
  /\bcontinuous\s*mix\b/i,
];

// Reupload / reposter channel clues
const SUSPICIOUS_CHANNEL_KEYWORDS = [
  'reupload',
  'перезалив',
  're-upload',
  'slowed',
  'lyrics',
  'records',
  'repost',
  'edits',
  'archive',
  'bass boosted',
  'speed up',
];

// Dedicated beats keywords (only filtered if user doesn't like beats)
const BEATS_PATTERNS = [
  /\btype\s*beat\b/i,
  /\bfree\s*beat\b/i,
  /\binstrumental\s*beat\b/i,
  /\bprod\s*by\b/i,
  /\bprod\.\s*by\b/i,
  /\bkaraoke\b/i,
  /\bкараоке\b/i,
  /\bflp\b/i,
  /\bremake\s*instrumental\b/i,
];

// Unicode ranges for exotic scripts (Vietnamese diacritics, Arabic, Devanagari/Hindi, Thai, etc.)
const EXOTIC_SCRIPTS_REGEX = /[\u0600-\u06FF\u0900-\u097F\u0E00-\u0E7F\u1EA0-\u1EF9\u0102\u0103\u0110\u0111\u0128\u0129\u0168\u0169\u01A0\u01A1\u01AF\u01B0]/;

// CJK scripts (Korean Hangul, Japanese Kana/Kanji, Chinese Hanzi)
const CJK_SCRIPTS_REGEX = /[\u3040-\u30ff\u3400-\u4dbf\u4e00-\u9fff\uf900-\ufaff\uff66-\uff9f\uac00-\ud7af]/;

// Cyrillic (Russian, Belarusian, Ukrainian)
const CYRILLIC_REGEX = /[\u0400-\u04FF]/;

/**
 * Detect language of a track title & artist
 */
export function detectTrackLanguage(title: string, artist: string): 'ru' | 'en' | 'cjk' | 'other' {
  const combined = `${title} ${artist}`;

  if (CYRILLIC_REGEX.test(combined)) {
    return 'ru';
  }
  if (CJK_SCRIPTS_REGEX.test(combined)) {
    return 'cjk';
  }
  if (EXOTIC_SCRIPTS_REGEX.test(combined)) {
    return 'other';
  }
  // Standard ASCII / Latin is classified as 'en'
  return 'en';
}

export function filterAndNormalizeTrack(
  track: Track,
  options?: {
    maxDuration?: number;
    minDuration?: number;
    strictAuthor?: boolean;
    languageFilter?: 'all' | 'ru_en' | 'ru' | 'en';
    allowExoticScripts?: boolean;
    filterBeats?: boolean;
  }
): FilterResult {
  const maxSec = options?.maxDuration ?? 600; // 10 minutes maximum
  const minSec = options?.minDuration ?? 45; // 45 seconds minimum

  // 1. Duration constraints
  if (track.duration > maxSec) {
    return {
      isValid: false,
      cleanTitle: track.title,
      cleanArtist: track.artist,
      reason: 'duration_exceeded',
    };
  }

  if (track.duration < minSec) {
    return {
      isValid: false,
      cleanTitle: track.title,
      cleanArtist: track.artist,
      reason: 'duration_too_short',
    };
  }

  const titleLower = track.title.toLowerCase();
  const artistLower = track.artist.toLowerCase();

  // 2. Stop words check for mixes / full sets
  for (const regex of STOP_PATTERNS) {
    if (regex.test(titleLower)) {
      return {
        isValid: false,
        cleanTitle: track.title,
        cleanArtist: track.artist,
        reason: 'stop_word',
      };
    }
  }

  // 3. Optional filter for instrumental type beats (unless user has beat likes)
  if (options?.filterBeats) {
    for (const regex of BEATS_PATTERNS) {
      if (regex.test(titleLower) || regex.test(artistLower)) {
        return {
          isValid: false,
          cleanTitle: track.title,
          cleanArtist: track.artist,
          reason: 'instrumental_beat',
        };
      }
    }
  }

  // 4. Language detection and filtering
  const detectedLang = detectTrackLanguage(track.title, track.artist);

  // If exotic scripts (e.g. Vietnamese, Arabic, Thai) are not allowed
  if (!options?.allowExoticScripts && detectedLang === 'other') {
    return {
      isValid: false,
      cleanTitle: track.title,
      cleanArtist: track.artist,
      reason: 'exotic_script_filtered',
      detectedLang,
    };
  }

  const langFilter = options?.languageFilter || 'ru_en';
  if (langFilter === 'ru' && detectedLang !== 'ru') {
    return {
      isValid: false,
      cleanTitle: track.title,
      cleanArtist: track.artist,
      reason: 'language_mismatch_ru',
      detectedLang,
    };
  }
  if (langFilter === 'en' && detectedLang !== 'en') {
    return {
      isValid: false,
      cleanTitle: track.title,
      cleanArtist: track.artist,
      reason: 'language_mismatch_en',
      detectedLang,
    };
  }
  if (langFilter === 'ru_en' && detectedLang !== 'ru' && detectedLang !== 'en') {
    // If user explicitly allowed CJK or has likes in other languages, it can pass; otherwise reject
    return {
      isValid: false,
      cleanTitle: track.title,
      cleanArtist: track.artist,
      reason: 'language_mismatch_ru_en',
      detectedLang,
    };
  }

  // 5. Detect explicit reupload flags in title
  if (/reupload|перезалив|re-upload/i.test(titleLower)) {
    return {
      isValid: false,
      cleanTitle: track.title,
      cleanArtist: track.artist,
      reason: 'reupload',
      detectedLang,
    };
  }

  let cleanArtist = track.artist.trim();
  let cleanTitle = track.title.trim();

  // Pattern "Artist - Title" or "Artist — Title"
  const dashMatch = track.title.match(/^(.+?)\s*[-—–]\s*(.+)$/);
  if (dashMatch) {
    const rawArtistPart = dashMatch[1].trim();
    const rawTitlePart = dashMatch[2].trim();

    const isSuspiciousChannel = SUSPICIOUS_CHANNEL_KEYWORDS.some((kw) =>
      artistLower.includes(kw)
    );

    // If channel is suspicious reposter and title has artist, check if we reject or sanitize
    if (isSuspiciousChannel && options?.strictAuthor) {
      return {
        isValid: false,
        cleanTitle: track.title,
        cleanArtist: track.artist,
        reason: 'reupload_channel',
        detectedLang,
      };
    }

    if (rawArtistPart.length > 0 && rawTitlePart.length > 0) {
      cleanArtist = rawArtistPart;
      cleanTitle = rawTitlePart;
    }
  }

  // Remove common video/audio suffixes from title
  cleanTitle = cleanTitle
    .replace(
      /\s*[\(\[]\s*(Official\s*Audio|Official\s*Video|Official\s*Music\s*Video|Lyric\s*Video|Audio|Visualizer|Премьера\s*трека|Премьера\s*клипа)\s*[\)\]]/gi,
      ''
    )
    .trim();

  return {
    isValid: true,
    cleanTitle,
    cleanArtist,
    detectedLang,
  };
}

export function sanitizeAndFilterTracks(
  tracks: Track[],
  options?: {
    maxDuration?: number;
    minDuration?: number;
    strictAuthor?: boolean;
    excludeIds?: Set<string>;
    excludeArtists?: Set<string>;
    languageFilter?: 'all' | 'ru_en' | 'ru' | 'en';
    allowExoticScripts?: boolean;
    filterBeats?: boolean;
  }
): Track[] {
  const seenIds = new Set<string>();
  const filtered: Track[] = [];

  for (const track of tracks) {
    if (!track || !track.id) continue;
    if (seenIds.has(track.id)) continue;
    if (options?.excludeIds?.has(track.id)) continue;

    const res = filterAndNormalizeTrack(track, options);
    if (!res.isValid) continue;

    if (options?.excludeArtists) {
      const artNorm = res.cleanArtist.toLowerCase();
      if (options.excludeArtists.has(artNorm)) continue;
    }

    seenIds.add(track.id);
    filtered.push({
      ...track,
      title: res.cleanTitle,
      artist: res.cleanArtist,
    });
  }

  return filtered;
}
