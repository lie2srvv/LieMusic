import { Track } from '../types';
import { MoodCoordinates } from '../components/MoodPad';
import { sanitizeAndFilterTracks, detectTrackLanguage } from './trackFilter';
import { applyCustomMetadataList } from '../utils/trackMetadata';
import { getHighResThumbnail } from '../utils/thumbnail';
import { searchSoundCloudTracks } from './soundcloud';
import { searchYouTubeTracks } from './youtube';

const SC_CLIENT_ID = '2yeWkbX88QhTzS3OtZp8cLGaJRrOAWwF';

export type WaveLanguageFilter = 'ru_en' | 'ru' | 'en' | 'all';

function parseDurationSeconds(durationStr: string | number): number {
  if (typeof durationStr === 'number') {
    return durationStr > 1000 ? Math.round(durationStr / 1000) : durationStr;
  }
  if (!durationStr || typeof durationStr !== 'string') return 180;

  const parts = durationStr.split(':').map((p) => parseInt(p, 10));
  if (parts.length === 2 && !isNaN(parts[0]) && !isNaN(parts[1])) {
    return parts[0] * 60 + parts[1];
  }
  if (parts.length === 3 && !isNaN(parts[0]) && !isNaN(parts[1]) && !isNaN(parts[2])) {
    return parts[0] * 3600 + parts[1] * 60 + parts[2];
  }
  return 180;
}

export class WaveService {
  private playedIds = new Set<string>();
  private currentMood: MoodCoordinates = { valence: 0, energy: 0 };
  private currentMode: 'favorites' | 'discover' = 'favorites';
  private currentLanguage: WaveLanguageFilter = 'ru_en';

  public setMood(mood: MoodCoordinates) {
    this.currentMood = mood;
  }

  public setMode(mode: 'favorites' | 'discover') {
    this.currentMode = mode;
  }

  public setLanguage(lang: WaveLanguageFilter) {
    this.currentLanguage = lang;
  }

  public getLanguage(): WaveLanguageFilter {
    return this.currentLanguage;
  }

  public markTrackPlayed(trackId: string) {
    this.playedIds.add(trackId);
    if (this.playedIds.size > 200) {
      const iter = this.playedIds.values();
      for (let i = 0; i < 50; i++) {
        const next = iter.next();
        if (!next.done) this.playedIds.delete(next.value);
      }
    }
  }

  public clearSession() {
    this.playedIds.clear();
  }

  /**
   * Fetch related tracks from SoundCloud API v2
   */
  public async fetchSoundCloudRelated(trackId: string): Promise<Track[]> {
    try {
      const numericId = trackId.replace(/^sc_/, '');
      if (!/^\d+$/.test(numericId)) return [];

      const url = `https://api-v2.soundcloud.com/tracks/${numericId}/related?client_id=${SC_CLIENT_ID}&limit=25`;
      const res = await fetch(url, { headers: { Accept: 'application/json' } });
      if (!res.ok) return [];

      const data = await res.json();
      if (!data?.collection || !Array.isArray(data.collection)) return [];

      return data.collection
        .filter((item: any) => item && item.id && item.title)
        .map((item: any) => ({
          id: `sc_${item.id}`,
          title: item.title,
          artist: item.user?.username || 'SoundCloud Artist',
          album: 'SoundCloud',
          duration: parseDurationSeconds(item.duration),
          thumbnail: getHighResThumbnail(item.artwork_url || item.user?.avatar_url || ''),
          source: 'soundcloud' as const,
          streamUrl: item.media?.transcodings?.[0]?.url,
        }));
    } catch (err) {
      console.warn('[WaveService] SC related fetch failed:', err);
      return [];
    }
  }

  /**
   * Fetch radio tracks from YouTube Music Next Radio API (RDAMVM)
   */
  public async fetchYouTubeMusicRadio(videoId: string): Promise<Track[]> {
    try {
      const cleanId = videoId.replace(/^yt_/, '');
      if (!cleanId) return [];

      const res = await fetch('https://music.youtube.com/youtubei/v1/next', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          context: {
            client: {
              clientName: 'WEB_REMIX',
              clientVersion: '1.20240101.01.00',
            },
          },
          playlistId: `RDAMVM${cleanId}`,
        }),
      });

      if (!res.ok) return [];

      const data = await res.json();
      const queueItems =
        data?.contents?.singleColumnMusicWatchNextResultsRenderer?.tabbedRenderer
          ?.watchNextTabbedResultsRenderer?.tabs?.[0]?.tabRenderer?.content
          ?.musicQueueRenderer?.content?.playlistPanelRenderer?.contents;

      if (!queueItems || !Array.isArray(queueItems)) return [];

      const results: Track[] = [];
      for (const item of queueItems) {
        const video = item?.playlistPanelVideoRenderer;
        if (!video || !video.videoId) continue;

        const title = video.title?.runs?.[0]?.text || 'Track';
        const artist = video.longBylineText?.runs?.[0]?.text || 'Artist';
        const durationStr = video.lengthText?.runs?.[0]?.text || '3:00';
        const thumb =
          video.thumbnail?.thumbnails?.[video.thumbnail.thumbnails.length - 1]?.url || '';

        results.push({
          id: `yt_${video.videoId}`,
          title,
          artist,
          album: 'YouTube Music',
          duration: parseDurationSeconds(durationStr),
          thumbnail: getHighResThumbnail(thumb),
          source: 'youtube' as const,
        });
      }

      return results;
    } catch (err) {
      console.warn('[WaveService] YTM radio fetch failed:', err);
      return [];
    }
  }

  /**
   * Return quadrant-specific fallback search queries tailored by language and vibe
   */
  private getQuadrantQueries(mood: MoodCoordinates, lang: WaveLanguageFilter, hasRussianSeeds: boolean): string[] {
    const { valence, energy } = mood;

    const isRu = lang === 'ru' || (lang === 'ru_en' && hasRussianSeeds);

    if (energy >= 0.1 && valence < 0.1) {
      // Top-Left: Energetic + Sad / Dark / Rock
      if (isRu) {
        return [
          'Три дня дождя хиты',
          'CUPSIZE песни',
          'русский рок драйв',
          'Пошлая Молли',
          'кис кис песни',
          'GSPD',
        ];
      }
      return ['Linkin Park', 'Bring Me The Horizon', 'The Neighbourhood rock', 'twenty one pilots'];
    }

    if (energy >= 0.1 && valence >= 0.1) {
      // Top-Right: Energetic + Cheerful / Dance
      if (isRu) {
        return [
          'Cream Soda танцы',
          'GAYAZOV$ BROTHER$',
          'Король и Шут хиты',
          'русский дэнс поп',
          'Земфира',
        ];
      }
      return ['The Weeknd hits', 'Dua Lipa dance', 'Daft Punk', 'Calvin Harris pop'];
    }

    if (energy < 0.1 && valence >= 0.1) {
      // Bottom-Right: Calm + Cheerful / Warm / Indie
      if (isRu) {
        return [
          'Сироткин',
          ' Zoloto песни',
          'Therr Maitz',
          'русский инди поп уют',
          'Антоха МС',
        ];
      }
      return ['Boy Pablo', 'Mac DeMarco indie', 'Rex Orange County', 'Laufey calm'];
    }

    // Bottom-Left: Calm + Sad / Melancholic
    if (isRu) {
      return [
        'Дайте танк песни',
        'Молчат Дома',
        'Хадн Дадн',
        'русская меланхолия инди',
        'Перемотка песни',
      ];
    }
    return ['Cigarettes After Sex', 'Joji songs', 'Radiohead acoustic', 'Lana Del Rey'];
  }

  /**
   * Main recommendation pipeline:
   * 1. Check if user likes beats (to decide if type beats should be filtered)
   * 2. Gather candidates from seeds (SC related & YTM radio)
   * 3. Inject loved tracks periodically in 'favorites' mode
   * 4. Apply language, duration, anti-mix filters
   */
  public async getNextRecommendations(options: {
    seeds: Track[];
    favoriteTracks: Track[];
    count?: number;
    mood?: MoodCoordinates;
    mode?: 'favorites' | 'discover';
    language?: WaveLanguageFilter;
  }): Promise<Track[]> {
    const mood = options.mood || this.currentMood;
    const mode = options.mode || this.currentMode;
    const lang = options.language || this.currentLanguage;
    const targetCount = options.count || 12;

    const candidatePool: Track[] = [];

    // Analyze user favorites:
    const userLikesBeats = options.favoriteTracks.some((t) =>
      /beat|instrumental|phonk|type beat/i.test(`${t.title} ${t.artist}`)
    );

    const hasRussianSeeds = options.favoriteTracks.some(
      (t) => detectTrackLanguage(t.title, t.artist) === 'ru'
    ) || options.seeds.some((t) => detectTrackLanguage(t.title, t.artist) === 'ru');

    const allowExotic = options.favoriteTracks.some(
      (t) => detectTrackLanguage(t.title, t.artist) === 'other' || detectTrackLanguage(t.title, t.artist) === 'cjk'
    );

    // In 'favorites' mode, insert 1-2 loved tracks from library that haven't been played recently
    if (mode === 'favorites' && options.favoriteTracks.length > 0) {
      const eligibleFavorites = options.favoriteTracks.filter((t) => !this.playedIds.has(t.id));
      if (eligibleFavorites.length > 0) {
        // Shuffle and pick 1-2 loved tracks
        const shuffledFavs = [...eligibleFavorites].sort(() => Math.random() - 0.5).slice(0, 2);
        candidatePool.push(...shuffledFavs);
      }
    }

    // 1. Gather from available seeds
    const activeSeeds = [...options.seeds].slice(0, 4);

    for (const seed of activeSeeds) {
      if (seed.source === 'soundcloud' || seed.id.startsWith('sc_')) {
        const scRelated = await this.fetchSoundCloudRelated(seed.id);
        candidatePool.push(...scRelated);
      } else if (seed.source === 'youtube' || seed.id.startsWith('yt_')) {
        const ytRadio = await this.fetchYouTubeMusicRadio(seed.id);
        candidatePool.push(...ytRadio);
      }
    }

    // 2. If pool is too small, fetch by smart quadrant queries
    if (candidatePool.length < targetCount * 2) {
      const queries = this.getQuadrantQueries(mood, lang, hasRussianSeeds);
      const chosenQuery = queries[Math.floor(Math.random() * queries.length)];

      const [scResults, ytResults] = await Promise.all([
        searchSoundCloudTracks(chosenQuery).catch(() => []),
        searchYouTubeTracks(chosenQuery).catch(() => []),
      ]);

      candidatePool.push(...scResults, ...ytResults);
    }

    // 3. Exclusions
    const excludeIds = new Set<string>(this.playedIds);

    let excludeArtists: Set<string> | undefined;
    if (mode === 'discover' && options.favoriteTracks.length > 0) {
      excludeArtists = new Set<string>(
        options.favoriteTracks.map((t) => t.artist.toLowerCase().trim())
      );
    }

    // 4. Sanitize and filter
    const filtered = sanitizeAndFilterTracks(candidatePool, {
      maxDuration: 600, // 10 minutes maximum
      minDuration: 45, // 45 seconds minimum
      strictAuthor: true,
      excludeIds,
      excludeArtists,
      languageFilter: lang,
      allowExoticScripts: lang === 'all' ? true : allowExotic,
      filterBeats: !userLikesBeats,
    });

    // 5. Apply user custom metadata
    const finalTracks = applyCustomMetadataList(filtered);

    // 6. Return target count
    return finalTracks.slice(0, targetCount);
  }
}

export const waveService = new WaveService();
