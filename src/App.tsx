import React, { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  Search,
  DownloadCloud,
  Heart,
  Clock,
  Disc3,
  Play,
  Sliders,
  Settings,
  Trash2,
  ChevronDown,
  ChevronUp,
  Download,
  FolderPlus,
  SlidersHorizontal,
} from 'lucide-react';
import { ConfirmDeleteModal } from './components/ConfirmDeleteModal';
import { CellularDownloadModal } from './components/CellularDownloadModal';
import { isCellularConnection } from './utils/network';
import { Track, AudioSource } from './types';
import { translations, Language } from './i18n/translations';
import { LanguageSelectModal } from './components/LanguageSelectModal';
import { DEFAULT_PRESETS } from './services/audio';
import { extractPaletteFromImage, ExtractedPalette } from './utils/colorExtractor';
import { audioEngine } from './services/audio';
import { searchYouTubeTracks, resolveStreamUrl } from './services/youtube';
import { searchSoundCloudTracks } from './services/soundcloud';
import { BottomNav, TabType } from './components/BottomNav';
import { MiniPlayer } from './components/MiniPlayer';
import { FullPlayer } from './components/FullPlayer';
import { EqualizerModal } from './components/EqualizerModal';
import { SettingsModal } from './components/SettingsModal';
import { TrackListItem } from './components/TrackListItem';
import { invoke } from '@tauri-apps/api/core';
import { FoxLogo } from './components/FoxLogo';
import { getHighResThumbnail } from './utils/thumbnail';

export const App: React.FC = () => {
  const [activeTab, setActiveTab] = useState<TabType>('home');

  const [language, setLanguage] = useState<Language>(() => {
    const saved = localStorage.getItem('liemusic_language');
    return (saved === 'en' || saved === 'ru') ? saved : 'ru';
  });
  const [isLanguageModalOpen, setIsLanguageModalOpen] = useState<boolean>(() => {
    return !localStorage.getItem('liemusic_language');
  });
  const [activePreset, setActivePreset] = useState<string>('flat');

  const t = translations[language];

  const [currentTrack, setCurrentTrack] = useState<Track | null>(null);
  const [isPlaying, setIsPlaying] = useState<boolean>(false);
  const [currentTime, setCurrentTime] = useState<number>(0);
  const [duration, setDuration] = useState<number>(0);
  const [volume, setVolume] = useState<number>(0.85);
  const [isShuffle, setIsShuffle] = useState<boolean>(false);
  const [isRepeat, setIsRepeat] = useState<boolean>(false);
  const searchRequestId = useRef<number>(0);
  const searchDebounceTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    return () => {
      if (searchDebounceTimer.current) {
        clearTimeout(searchDebounceTimer.current);
      }
    };
  }, []);

  const [palette, setPalette] = useState<ExtractedPalette>({
    dominant: 'rgb(245, 220, 223)',
    dominantHex: '#F5DCDF',
    glow: 'rgba(245, 220, 223, 0.25)',
    accent: '#F5DCDF',
    surfaceTint: 'rgba(245, 220, 223, 0.08)',
    contrastText: '#151313',
  });

  const [queue, setQueue] = useState<Track[]>([]);
  const [favorites, setFavorites] = useState<Track[]>([]);
  const [history, setHistory] = useState<Track[]>([]);
  const [downloadedTracks, setDownloadedTracks] = useState<Track[]>([]);
  const [downloadingIds, setDownloadingIds] = useState<Set<string>>(new Set());

  const fileInputRef = useRef<HTMLInputElement>(null);

  const downloadedTrackIds = useMemo(
    () => new Set(downloadedTracks.map((t) => t.id)),
    [downloadedTracks]
  );
  const favoriteTrackIds = useMemo(
    () => new Set(favorites.map((t) => t.id)),
    [favorites]
  );

  const [searchQuery, setSearchQuery] = useState<string>('');
  const [searchArtistQuery, setSearchArtistQuery] = useState<string>('');
  const [isFilterExpanded, setIsFilterExpanded] = useState<boolean>(false);
  const [searchSortBy, setSearchSortBy] = useState<'relevance' | 'title' | 'artist' | 'duration'>('relevance');
  const [searchSource, setSearchSource] = useState<AudioSource | 'all'>('all');
  const [searchResults, setSearchResults] = useState<Track[]>([]);
  const [isSearching, setIsSearching] = useState<boolean>(false);
  const lastErrorRetryTrackId = useRef<string | null>(null);

  const [isFullPlayerOpen, setIsFullPlayerOpen] = useState<boolean>(false);
  const [isEqualizerOpen, setIsEqualizerOpen] = useState<boolean>(false);
  const [isSettingsOpen, setIsSettingsOpen] = useState<boolean>(false);

  const [equalizerBands, setEqualizerBands] = useState<number[]>([0, 0, 0, 0, 0, 0, 0, 0, 0, 0]);
  const [bassBoost, setBassBoost] = useState<number>(0);

  // Section expand states (default 3 items)
  const [isHomeHistoryExpanded, setIsHomeHistoryExpanded] = useState<boolean>(false);
  const [isLibraryHistoryExpanded, setIsLibraryHistoryExpanded] = useState<boolean>(false);
  const [isFavoritesExpanded, setIsFavoritesExpanded] = useState<boolean>(false);

  // Multi-select states
  const [isFavSelectMode, setIsFavSelectMode] = useState<boolean>(false);
  const [selectedFavIds, setSelectedFavIds] = useState<Set<string>>(new Set());

  const [isOfflineSelectMode, setIsOfflineSelectMode] = useState<boolean>(false);
  const [selectedOfflineIds, setSelectedOfflineIds] = useState<Set<string>>(new Set());

  // Dialog prompts
  const [deletePrompt, setDeletePrompt] = useState<{ trackIds: string[]; trackTitle?: string } | null>(null);
  const [cellularPrompt, setCellularPrompt] = useState<{ tracks: Track[] } | null>(null);

  const canGoBack = Boolean(
    isFullPlayerOpen ||
    isEqualizerOpen ||
    isSettingsOpen ||
    isLanguageModalOpen ||
    cellularPrompt ||
    deletePrompt ||
    isOfflineSelectMode ||
    isFavSelectMode ||
    activeTab !== 'home'
  );

  useEffect(() => {
    try {
      (window as any).AndroidMediaNotification?.setBackIntercept(canGoBack);
    } catch {}
  }, [canGoBack]);

  useEffect(() => {
    const handleBackPressed = () => {
      if (deletePrompt) {
        setDeletePrompt(null);
        return;
      }
      if (cellularPrompt) {
        setCellularPrompt(null);
        return;
      }
      if (isLanguageModalOpen) {
        setIsLanguageModalOpen(false);
        return;
      }
      if (isEqualizerOpen) {
        setIsEqualizerOpen(false);
        return;
      }
      if (isSettingsOpen) {
        setIsSettingsOpen(false);
        return;
      }
      if (isFavSelectMode) {
        setIsFavSelectMode(false);
        setSelectedFavIds(new Set());
        return;
      }
      if (isOfflineSelectMode) {
        setIsOfflineSelectMode(false);
        setSelectedOfflineIds(new Set());
        return;
      }
      if (isFullPlayerOpen) {
        setIsFullPlayerOpen(false);
        return;
      }
      if (activeTab !== 'home') {
        setActiveTab('home');
        return;
      }
      try {
        (window as any).AndroidMediaNotification?.exitToBackground();
      } catch {}
    };

    window.addEventListener('android_back_pressed', handleBackPressed);
    return () => {
      window.removeEventListener('android_back_pressed', handleBackPressed);
    };
  }, [
    deletePrompt,
    cellularPrompt,
    isLanguageModalOpen,
    isEqualizerOpen,
    isSettingsOpen,
    isFavSelectMode,
    isOfflineSelectMode,
    isFullPlayerOpen,
    activeTab,
  ]);

  useEffect(() => {
    const unError = audioEngine.onError((err) => {
      console.warn('[LieMusic] Audio engine error caught in App:', err);
      if (currentTrack && lastErrorRetryTrackId.current !== currentTrack.id) {
        lastErrorRetryTrackId.current = currentTrack.id;
        console.log('[LieMusic] Auto-retrying playback with freshly resolved stream URL...');
        resolveStreamUrl(currentTrack, true)
          .then((freshUrl) => {
            if (freshUrl) {
              audioEngine.playTrack(currentTrack, freshUrl).catch(console.error);
            }
          })
          .catch(console.error);
      }
    });

    return () => {
      unError();
    };
  }, [currentTrack]);

  useEffect(() => {
    const cachedFavs = localStorage.getItem('liemusic_favorites');
    if (cachedFavs) {
      try {
        const list: Track[] = JSON.parse(cachedFavs);
        setFavorites(list.map((t) => ({ ...t, thumbnail: getHighResThumbnail(t.thumbnail) })));
      } catch {}
    }

    const cachedHistory = localStorage.getItem('liemusic_history');
    if (cachedHistory) {
      try {
        const list: Track[] = JSON.parse(cachedHistory);
        setHistory(list.map((t) => ({ ...t, thumbnail: getHighResThumbnail(t.thumbnail) })));
      } catch {}
    }

    const cachedDownloads = localStorage.getItem('liemusic_downloads');
    if (cachedDownloads) {
      try {
        const list: Track[] = JSON.parse(cachedDownloads);
        setDownloadedTracks(list.map((t) => ({ ...t, thumbnail: getHighResThumbnail(t.thumbnail) })));
      } catch {}
    }
  }, []);

  useEffect(() => {
    localStorage.setItem('liemusic_favorites', JSON.stringify(favorites));
  }, [favorites]);

  useEffect(() => {
    localStorage.setItem('liemusic_history', JSON.stringify(history));
  }, [history]);

  useEffect(() => {
    localStorage.setItem('liemusic_downloads', JSON.stringify(downloadedTracks));
  }, [downloadedTracks]);

  const handlePlayTrack = useCallback(
    async (rawTrack: Track, newQueue?: Track[], forceRefresh = false) => {
      const track: Track = { ...rawTrack, thumbnail: getHighResThumbnail(rawTrack.thumbnail) };
      lastErrorRetryTrackId.current = null;
      // Instantly stop previous playing track
      audioEngine.stop();
      setIsPlaying(false);
      setCurrentTime(0);
      setDuration(track.duration || 0);

      if (newQueue) {
        setQueue(newQueue);
      } else if (!queue.some((t) => t.id === track.id)) {
        setQueue((prev) => [track, ...prev]);
      }

      setCurrentTrack(track);

      if (track.thumbnail) {
        extractPaletteFromImage(track.thumbnail).then((pal) => {
          setPalette(pal);
        });
      }

      setHistory((prev) => [track, ...prev.filter((t) => t.id !== track.id)].slice(0, 100));

      try {
        const streamUrl = await resolveStreamUrl(track, forceRefresh);
        if (streamUrl) {
          await audioEngine.playTrack(track, streamUrl);
        }
      } catch (err) {
        console.error('[LieMusic] Playback error:', err);
      }
    },
    [queue]
  );

  const handleNextTrack = useCallback(() => {
    if (!currentTrack || queue.length === 0) return;
    if (isRepeat) {
      audioEngine.seek(0);
      audioEngine.togglePlayPause();
      return;
    }

    let nextIndex: number;
    if (isShuffle) {
      nextIndex = Math.floor(Math.random() * queue.length);
    } else {
      const currentIndex = queue.findIndex((t) => t.id === currentTrack.id);
      nextIndex = (currentIndex + 1) % queue.length;
    }
    handlePlayTrack(queue[nextIndex]);
  }, [currentTrack, queue, isRepeat, isShuffle, handlePlayTrack]);

  const handlePrevTrack = useCallback(() => {
    if (!currentTrack || queue.length === 0) return;
    if (currentTime > 3) {
      audioEngine.seek(0);
      return;
    }
    const currentIndex = queue.findIndex((t) => t.id === currentTrack.id);
    const prevIndex = (currentIndex - 1 + queue.length) % queue.length;
    handlePlayTrack(queue[prevIndex]);
  }, [currentTrack, queue, currentTime, handlePlayTrack]);

  useEffect(() => {
    audioEngine.setActionHandlers({
      onNext: handleNextTrack,
      onPrev: handlePrevTrack,
    });
  }, [handleNextTrack, handlePrevTrack]);

  useEffect(() => {
    const unPlay = audioEngine.onPlayStateChange((playing) => setIsPlaying(playing));
    const unTime = audioEngine.onTimeUpdate((curr, dur) => {
      setCurrentTime(curr);
      setDuration(dur);
    });
    const unEnd = audioEngine.onTrackEnd(() => handleNextTrack());

    return () => {
      unPlay();
      unTime();
      unEnd();
    };
  }, [handleNextTrack]);

  const handleTogglePlay = async () => {
    if (!currentTrack && queue.length > 0) {
      handlePlayTrack(queue[0]);
      return;
    }
    if (!currentTrack) return;

    if (audioEngine.hasError() || !audioEngine.hasSource()) {
      console.log('[LieMusic] Re-resolving stream on toggle play due to error/missing source...');
      handlePlayTrack(currentTrack, undefined, true);
      return;
    }

    const ok = await audioEngine.togglePlayPause();
    if (!ok && !audioEngine.isPlaying() && (audioEngine.hasError() || !audioEngine.hasSource())) {
      console.log('[LieMusic] Toggle play returned false with error/missing source, re-resolving...');
      handlePlayTrack(currentTrack, undefined, true);
    }
  };

  const executeDownload = async (track: Track) => {
    if (downloadingIds.has(track.id) || downloadedTrackIds.has(track.id)) {
      return;
    }

    setDownloadingIds((prev) => new Set(prev).add(track.id));

    try {
      const sizeStr = await invoke<string>('download_track_file', {
        trackId: track.id,
        streamUrl: track.streamUrl || null,
        source: track.source,
      });

      const downloadedItem: Track = {
        ...track,
        isDownloaded: true,
        fileSize: sizeStr || `2.5 ${t.mb}`, 
      };

      setDownloadedTracks((prev) => [downloadedItem, ...prev.filter((t) => t.id !== track.id)]);
    } catch (err) {
      console.warn('[LieMusic] Native download error:', err);
    } finally {
      setDownloadingIds((prev) => {
        const next = new Set(prev);
        next.delete(track.id);
        return next;
      });
    }
  };

  const requestDownloadTrack = (track: Track) => {
    if (isCellularConnection() && localStorage.getItem('liemusic_allow_cellular_downloads') !== 'true') {
      setCellularPrompt({ tracks: [track] });
      return;
    }
    executeDownload(track);
  };

  const handleDownloadAllFavorites = () => {
    const notDownloaded = favorites.filter((t) => !downloadedTrackIds.has(t.id));
    if (notDownloaded.length > 0) {
      requestDownloadMultiple(notDownloaded);
    }
  };

  const requestDownloadMultiple = (tracksToDownload: Track[]) => {
    if (tracksToDownload.length === 0) return;
    if (isCellularConnection() && localStorage.getItem('liemusic_allow_cellular_downloads') !== 'true') {
      setCellularPrompt({ tracks: tracksToDownload });
      return;
    }
    for (const t of tracksToDownload) {
      executeDownload(t);
    }
  };

  const executeDeleteDownload = async (trackIds: string[]) => {
    for (const id of trackIds) {
      try {
        await invoke('delete_downloaded_track_file', { trackId: id });
      } catch (err) {
        console.warn('[LieMusic] Error deleting track file:', err);
      }
    }
    const idSet = new Set(trackIds);
    setDownloadedTracks((prev) => prev.filter((t) => !idSet.has(t.id)));
  };

  const requestDeleteDownload = (trackId: string, trackTitle?: string) => {
    if (localStorage.getItem('liemusic_dont_ask_delete') === 'true') {
      executeDeleteDownload([trackId]);
      return;
    }
    setDeletePrompt({ trackIds: [trackId], trackTitle });
  };

  const requestDeleteMultipleDownloads = (trackIds: string[]) => {
    if (trackIds.length === 0) return;
    if (localStorage.getItem('liemusic_dont_ask_delete') === 'true') {
      executeDeleteDownload(trackIds);
      setSelectedOfflineIds(new Set());
      setIsOfflineSelectMode(false);
      return;
    }
    setDeletePrompt({ trackIds });
  };

  const handleToggleFavorite = (track: Track) => {
    const isCurrentlyFav = favoriteTrackIds.has(track.id);

    if (isCurrentlyFav) {
      setFavorites((prev) => prev.filter((t) => t.id !== track.id));
    } else {
      setFavorites((prev) => [track, ...prev]);
      requestDownloadTrack(track);
    }
  };

  const toggleSelectFav = (trackId: string) => {
    setSelectedFavIds((prev) => {
      const next = new Set(prev);
      if (next.has(trackId)) next.delete(trackId);
      else next.add(trackId);
      return next;
    });
  };

  const toggleSelectOffline = (trackId: string) => {
    setSelectedOfflineIds((prev) => {
      const next = new Set(prev);
      if (next.has(trackId)) next.delete(trackId);
      else next.add(trackId);
      return next;
    });
  };

  const handleImportLocalFiles = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      try {
        const arrayBuffer = await file.arrayBuffer();
        const bytes = Array.from(new Uint8Array(arrayBuffer));

        const rawName = file.name.replace(/\.[^/.]+$/, '');
        let title = rawName;
        let artist = t.localFile;

        if (rawName.includes(' - ')) {
          const parts = rawName.split(' - ');
          artist = parts[0].trim();
          title = parts.slice(1).join(' - ').trim();
        }

        const trackId = `local_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;

        const sizeStr = await invoke<string>('save_local_track_file', {
          trackId,
          fileBytes: bytes,
        });

        let duration = 180;
        const objectUrl = URL.createObjectURL(file);
        try {
          const tempAudio = new Audio(objectUrl);
          await new Promise<void>((resolve) => {
            tempAudio.addEventListener('loadedmetadata', () => {
              if (!isNaN(tempAudio.duration) && tempAudio.duration > 0) {
                duration = Math.round(tempAudio.duration);
              }
              resolve();
            });
            setTimeout(resolve, 600);
          });
        } catch (err) {
          console.warn('[LieMusic] Failed to read audio duration, using default:', err);
        } finally {
          URL.revokeObjectURL(objectUrl);
        }

        const localTrack: Track = {
          id: trackId,
          title,
          artist,
          album: t.localTracks,
          duration,
          thumbnail: '',
          source: 'local',
          isDownloaded: true,
          fileSize: sizeStr || `${(file.size / (1024 * 1024)).toFixed(1)} ${t.mb}`,
        };

        setDownloadedTracks((prev) => [localTrack, ...prev.filter((t) => t.id !== localTrack.id)]);
      } catch (err) {
        console.error('[LieMusic] Error importing local file:', err);
      }
    }

    e.target.value = '';
  };

  const executeSearch = useCallback(
    async (
      titleQuery: string,
      artistQuery: string,
      source: AudioSource | 'all',
      sortBy: 'relevance' | 'title' | 'artist' | 'duration'
    ) => {
      const cleanTitle = titleQuery.trim();
      const cleanArtist = artistQuery.trim();

      if (!cleanTitle && !cleanArtist) {
        setSearchResults([]);
        setIsSearching(false);
        return;
      }

      const combinedQuery = cleanTitle && cleanArtist
        ? `${cleanTitle} ${cleanArtist}`
        : cleanTitle || cleanArtist;

      const currentReqId = ++searchRequestId.current;
      setIsSearching(true);

      try {
        let combined: Track[] = [];

        if (source === 'all') {
          const [ytResults, scResults] = await Promise.all([
            searchYouTubeTracks(combinedQuery),
            searchSoundCloudTracks(combinedQuery),
          ]);
          if (searchRequestId.current !== currentReqId) return;
          const maxLen = Math.max(ytResults.length, scResults.length);
          for (let i = 0; i < maxLen; i++) {
            if (ytResults[i]) combined.push(ytResults[i]);
            if (scResults[i]) combined.push(scResults[i]);
          }
        } else if (source === 'youtube') {
          combined = await searchYouTubeTracks(combinedQuery);
        } else {
          combined = await searchSoundCloudTracks(combinedQuery);
        }

        if (searchRequestId.current !== currentReqId) return;

        // 1. Smart normalize track artist & title
        const normalized = combined.map((track) => {
          let title = track.title.trim();
          let artist = track.artist.trim();

          // Strip YouTube Music " - Topic"
          if (artist.endsWith(' - Topic')) {
            artist = artist.slice(0, -8).trim();
          }

          // Check if title has format "Artist - Title" (supporting -, –, —)
          const delimiterMatch = title.match(/^(.+?)\s+[-–—]\s+(.+)$/);
          if (delimiterMatch) {
            const candidateArtist = delimiterMatch[1].trim();
            const candidateTitle = delimiterMatch[2].trim();

            const artistLower = cleanArtist.toLowerCase();
            const candArtistLower = candidateArtist.toLowerCase();

            // If user searched for an artist and it matches candidate artist in title:
            if (artistLower && candArtistLower.includes(artistLower)) {
              artist = candidateArtist;
              title = candidateTitle;
            } else if (
              // Or if current artist is a generic label or matches candidate artist
              artist.toLowerCase() === 'youtube music' ||
              artist.toLowerCase() === 'soundcloud' ||
              artist.toLowerCase().endsWith('archive') ||
              candArtistLower === artist.toLowerCase()
            ) {
              artist = candidateArtist;
              title = candidateTitle;
            }
          }

          return {
            ...track,
            title,
            artist: artist || track.artist,
          };
        });

        // 2. Strict filtering
        let filtered = normalized;
        if (cleanArtist) {
          const aLower = cleanArtist.toLowerCase();
          filtered = filtered.filter((t) => {
            // Drop long podcasts / interviews > 20 min (1200s)
            if ((t.duration || 0) > 1200) return false;
            // STRICT author match: author MUST contain searched author name!
            return t.artist.toLowerCase().includes(aLower);
          });
        }

        if (cleanTitle) {
          const tLower = cleanTitle.toLowerCase();
          filtered = filtered.filter((t) =>
            t.title.toLowerCase().includes(tLower)
          );
        }

        // 3. Sorting
        if (sortBy === 'title') {
          filtered.sort((a, b) => a.title.localeCompare(b.title));
        } else if (sortBy === 'artist') {
          filtered.sort((a, b) => a.artist.localeCompare(b.artist));
        } else if (sortBy === 'duration') {
          filtered.sort((a, b) => (b.duration || 0) - (a.duration || 0));
        } else if (cleanArtist) {
          // Relevance sorting: prioritize exact author match at the top
          const aLower = cleanArtist.toLowerCase();
          filtered.sort((a, b) => {
            const aExact = a.artist.toLowerCase() === aLower ? 0 : 1;
            const bExact = b.artist.toLowerCase() === aLower ? 0 : 1;
            if (aExact !== bExact) return aExact - bExact;

            const aStarts = a.artist.toLowerCase().startsWith(aLower) ? 0 : 1;
            const bStarts = b.artist.toLowerCase().startsWith(aLower) ? 0 : 1;
            return aStarts - bStarts;
          });
        }

        setSearchResults(filtered);
      } catch (err) {
        if (searchRequestId.current === currentReqId) {
          console.error('[LieMusic] Search error:', err);
          setSearchResults([]);
        }
      } finally {
        if (searchRequestId.current === currentReqId) {
          setIsSearching(false);
        }
      }
    },
    []
  );

  const triggerDebouncedSearch = (
    title: string,
    artist: string,
    source: AudioSource | 'all',
    sort: 'relevance' | 'title' | 'artist' | 'duration'
  ) => {
    if (searchDebounceTimer.current) {
      clearTimeout(searchDebounceTimer.current);
    }
    if (!title.trim() && !artist.trim()) {
      searchRequestId.current++;
      setSearchResults([]);
      setIsSearching(false);
      return;
    }
    searchDebounceTimer.current = setTimeout(() => {
      executeSearch(title, artist, source, sort);
    }, 280);
  };

  const handleSourceChange = (newSource: AudioSource | 'all') => {
    setSearchSource(newSource);
    triggerDebouncedSearch(searchQuery, searchArtistQuery, newSource, searchSortBy);
  };

  const processedSearchResults = useMemo(() => {
    if (searchResults.length === 0) return [];

    const normalizeTitle = (str: string) =>
      str
        .toLowerCase()
        .replace(/\s*[\(\[](official|audio|video|lyrics|hd|4k|remastered|visualizer)[\)\]]/gi, '')
        .trim();

    const groups = new Map<string, Track[]>();
    for (const track of searchResults) {
      const norm = normalizeTitle(track.title);
      if (!groups.has(norm)) {
        groups.set(norm, []);
      }
      groups.get(norm)!.push(track);
    }

    const dimmedSet = new Set<string>();

    for (const [, tracksInGroup] of groups.entries()) {
      if (tracksInGroup.length <= 1) continue;

      const hasLikedOrDownloaded = tracksInGroup.some(
        (t) => favoriteTrackIds.has(t.id) || downloadedTrackIds.has(t.id)
      );

      if (hasLikedOrDownloaded) {
        let bestTrack = tracksInGroup[0];
        let bestScore = -1;

        for (const track of tracksInGroup) {
          const isFav = favoriteTrackIds.has(track.id);
          const isDl = downloadedTrackIds.has(track.id);
          let score = 0;
          if (isFav && isDl) score = 3;
          else if (isDl) score = 2;
          else if (isFav) score = 1;

          if (score > bestScore) {
            bestScore = score;
            bestTrack = track;
          }
        }

        for (const track of tracksInGroup) {
          if (track.id !== bestTrack.id) {
            dimmedSet.add(track.id);
          }
        }
      }
    }

    return searchResults.map((track) => ({
      track,
      isDimmed: dimmedSet.has(track.id),
    }));
  }, [searchResults, favoriteTrackIds, downloadedTrackIds]);

  const isCurrentFavorite = currentTrack ? favoriteTrackIds.has(currentTrack.id) : false;

  return (
    <div
      className="flex flex-col h-screen w-screen bg-[#151313] text-[#E7E1E1] overflow-hidden select-none"
      style={{
        backgroundImage: `radial-gradient(circle at 50% 0%, ${palette.glow} 0%, transparent 55%)`,
      }}
    >
      {/* Hidden local audio file input */}
      <input
        ref={fileInputRef}
        type="file"
        accept="audio/*"
        multiple
        onChange={handleImportLocalFiles}
        className="hidden"
      />

      {/* Top Header Bar */}
      <header className="flex items-center justify-between px-5 pt-8 pb-3 bg-[#151313]/90 backdrop-blur-md border-b border-white/5 safe-area-pt shrink-0 z-20">
        <div className="flex items-center space-x-3">
          <div
            className="flex items-center justify-center shrink-0 transition-transform active:scale-95 cursor-pointer"
            style={{
              filter: `drop-shadow(0 0 10px ${currentTrack ? palette.glow : 'rgba(249, 115, 22, 0.4)'})`,
            }}
          >
            <FoxLogo
              className="w-9 h-9 transition-colors duration-500"
              color={currentTrack ? palette.accent : '#F97316'}
            />
          </div>
          <div>
            <h1 className="text-base font-bold tracking-tight text-white leading-tight">LieMusic</h1>
            <p className="text-[11px] text-neutral-400">{t.appSubtitle}</p>
          </div>
        </div>

        <div className="flex items-center space-x-2">
          <motion.button
            type="button"
            whileTap={{ scale: 0.9 }}
            onClick={() => {
              const next = language === 'ru' ? 'en' : 'ru';
              setLanguage(next);
              localStorage.setItem('liemusic_language', next);
            }}
            className="px-2.5 py-1.5 rounded-xl bg-white/5 hover:bg-white/10 text-xs font-bold text-neutral-300 hover:text-white transition-colors border border-white/5 cursor-pointer"
            title={language === 'ru' ? 'Switch to English' : 'Переключить на русский'}
          >
            {language.toUpperCase()}
          </motion.button>
          <motion.button
            type="button"
            whileTap={{ scale: 0.9 }}
            onClick={() => setIsEqualizerOpen(true)}
            className="w-9 h-9 rounded-2xl bg-white/5 hover:bg-white/10 flex items-center justify-center text-neutral-300 hover:text-white transition-colors border border-white/5 cursor-pointer"
            title={t.equalizer}
          >
            <Sliders size={18} />
          </motion.button>
          <motion.button
            type="button"
            whileTap={{ scale: 0.9 }}
            onClick={() => setIsSettingsOpen(true)}
            className="w-9 h-9 rounded-2xl bg-white/5 hover:bg-white/10 flex items-center justify-center text-neutral-300 hover:text-white transition-colors border border-white/5 cursor-pointer"
            title={t.settings}
          >
            <Settings size={18} />
          </motion.button>
        </div>
      </header>

      {/* Main Content View */}
      <main className="flex-1 overflow-y-auto px-4 py-4 pb-44">
        <AnimatePresence mode="wait" initial={false}>
          <motion.div
            key={activeTab}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.16, ease: 'easeOut' }}
          >
        {/* TAB 1: HOME */}
        {activeTab === 'home' && (
          <div className="max-w-xl mx-auto space-y-5">
            {/* Search Trigger */}
            <div
              onClick={() => setActiveTab('search')}
              className="flex items-center space-x-3 px-4 py-3 bg-[#1D1B1B] hover:bg-[#222020] border border-white/10 rounded-2xl cursor-pointer transition-all active:scale-[0.99] shadow-lg"
            >
              <Search size={18} className="text-neutral-400" />
              <span className="text-sm text-neutral-400">{t.searchPlaceholder}</span>
            </div>

            {/* Quick Access Tiles: Favorites & Offline */}
            <div className="grid grid-cols-2 gap-3">
              <div
                onClick={() => setActiveTab('library')}
                className="p-4 rounded-2xl bg-gradient-to-br from-rose-950/30 to-[#1A1818] border border-rose-500/20 cursor-pointer hover:border-rose-500/40 transition-all active:scale-98"
              >
                <div className="flex items-center justify-between mb-2">
                  <div className="w-8 h-8 rounded-full bg-rose-500/20 text-rose-400 flex items-center justify-center">
                    <Heart size={16} fill="currentColor" />
                  </div>
                  {favorites.length > 0 && (
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handlePlayTrack(favorites[0], favorites);
                      }}
                      className="w-7 h-7 rounded-full bg-rose-500 text-white flex items-center justify-center shadow-lg active:scale-90"
                    >
                      <Play size={12} fill="currentColor" />
                    </button>
                  )}
                </div>
                <h3 className="font-bold text-sm text-white">{t.favoriteTracks}</h3>
                <p className="text-[11px] text-neutral-400 mt-0.5">{t.tracksCount(favorites.length)}</p>
              </div>

              <div
                onClick={() => setActiveTab('offline')}
                className="p-4 rounded-2xl bg-gradient-to-br from-emerald-950/30 to-[#1A1818] border border-emerald-500/20 cursor-pointer hover:border-emerald-500/40 transition-all active:scale-98"
              >
                <div className="flex items-center justify-between mb-2">
                  <div className="w-8 h-8 rounded-full bg-emerald-500/20 text-emerald-400 flex items-center justify-center">
                    <DownloadCloud size={16} />
                  </div>
                  {downloadedTracks.length > 0 && (
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handlePlayTrack(downloadedTracks[0], downloadedTracks);
                      }}
                      className="w-7 h-7 rounded-full bg-emerald-500 text-white flex items-center justify-center shadow-lg active:scale-90"
                    >
                      <Play size={12} fill="currentColor" />
                    </button>
                  )}
                </div>
                <h3 className="font-bold text-sm text-white">{t.offlineMusic}</h3>
                <p className="text-[11px] text-neutral-400 mt-0.5">{t.downloadedCount(downloadedTracks.length)}</p>
              </div>
            </div>

            {/* Recently Played History */}
            <div className="space-y-3 pt-2">
              <div className="flex items-center justify-between px-1">
                <span className="text-xs font-bold text-neutral-400 uppercase tracking-wider flex items-center space-x-1.5">
                  <Clock size={14} />
                  <span>{t.recentlyPlayed}</span>
                </span>
                {history.length > 0 && (
                  <button
                    onClick={() => setActiveTab('library')}
                    className="text-[11px] text-neutral-400 hover:text-white"
                  >
                    {t.allWithCount(history.length)}
                  </button>
                )}
              </div>

              <div className="space-y-1 bg-[#1A1818] p-2 rounded-3xl border border-white/5">
                {history.length > 0 ? (
                  <>
                    {(isHomeHistoryExpanded ? history : history.slice(0, 3)).map((track) => (
                      <TrackListItem
                        language={language}
                        key={`home_${track.id}`}
                        track={track}
                        isCurrent={currentTrack?.id === track.id}
                        isPlaying={isPlaying}
                        isFavorite={favoriteTrackIds.has(track.id)}
                        isDownloaded={downloadedTrackIds.has(track.id)}
                        isDownloading={downloadingIds.has(track.id)}
                        fileSize={downloadedTracks.find((t) => t.id === track.id)?.fileSize}
                        accentColor={palette.accent}
                        onPlay={() => handlePlayTrack(track, history)}
                        onToggleFavorite={() => handleToggleFavorite(track)}
                        onDownload={() => requestDownloadTrack(track)}
                      />
                    ))}
                    {history.length > 3 && (
                      <button
                        onClick={() => setIsHomeHistoryExpanded((prev) => !prev)}
                        className="w-full py-2.5 mt-1 text-xs text-neutral-400 hover:text-white flex items-center justify-center space-x-1.5 transition-colors cursor-pointer rounded-2xl hover:bg-white/5 active:scale-[0.99]"
                      >
                        <span>{isHomeHistoryExpanded ? t.showLess : t.showMore(history.length)}</span>
                        {isHomeHistoryExpanded ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
                      </button>
                    )}
                  </>
                ) : (
                  <div className="py-8 text-center text-neutral-500">
                    <p className="text-xs">{t.emptyRecent}</p>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* TAB 2: SEARCH */}
        {activeTab === 'search' && (
          <div className="max-w-xl mx-auto space-y-3">
            {/* Search Input Bar with Filter Button */}
            <div className="space-y-2">
              <div className="flex items-center space-x-2">
                <div className="relative flex-1">
                  <Search size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-neutral-400" />
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => {
                      const val = e.target.value;
                      setSearchQuery(val);
                      triggerDebouncedSearch(val, searchArtistQuery, searchSource, searchSortBy);
                    }}
                    placeholder={isFilterExpanded ? t.searchTrackPlaceholder : t.searchPlaceholder}
                    className="w-full bg-[#1D1B1B] border border-white/10 rounded-2xl pl-11 pr-4 py-3 text-sm text-white placeholder-neutral-500 focus:outline-none focus:border-white/30 transition-all shadow-inner"
                    autoFocus
                  />
                </div>
                <button
                  type="button"
                  onClick={() => setIsFilterExpanded(!isFilterExpanded)}
                  className={`p-3 rounded-2xl border transition-all cursor-pointer flex items-center justify-center shrink-0 ${
                    isFilterExpanded || searchArtistQuery.trim() || searchSortBy !== 'relevance'
                      ? 'bg-white text-black border-white shadow'
                      : 'bg-[#1D1B1B] border-white/10 text-neutral-400 hover:text-white'
                  }`}
                  title={t.searchFilters}
                >
                  <SlidersHorizontal size={18} />
                </button>
              </div>

              {/* Expandable Advanced Filter Panel */}
              <AnimatePresence>
                {isFilterExpanded && (
                  <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: 'auto' }}
                    exit={{ opacity: 0, height: 0 }}
                    className="overflow-hidden"
                  >
                    <div className="p-3 bg-[#1D1B1B] border border-white/10 rounded-2xl space-y-3">
                      <div>
                        <label className="text-[11px] font-medium text-neutral-400 block mb-1">
                          {t.searchArtistPlaceholder}
                        </label>
                        <input
                          type="text"
                          value={searchArtistQuery}
                          onChange={(e) => {
                            const val = e.target.value;
                            setSearchArtistQuery(val);
                            triggerDebouncedSearch(searchQuery, val, searchSource, searchSortBy);
                          }}
                          placeholder={t.searchArtistPlaceholder}
                          className="w-full bg-white/5 border border-white/10 rounded-xl px-3 py-2 text-xs text-white placeholder-neutral-500 focus:outline-none focus:border-white/30 transition-all"
                        />
                      </div>

                      <div>
                        <span className="text-[11px] font-medium text-neutral-400 block mb-1.5">
                          {t.searchSortByLabel}
                        </span>
                        <div className="flex flex-wrap gap-1.5">
                          {[
                            { id: 'relevance', label: t.sortRelevance },
                            { id: 'title', label: t.sortTitle },
                            { id: 'artist', label: t.sortArtist },
                            { id: 'duration', label: t.sortDuration },
                          ].map((sortOption) => (
                            <button
                              key={sortOption.id}
                              type="button"
                              onClick={() => {
                                const newSort = sortOption.id as any;
                                setSearchSortBy(newSort);
                                triggerDebouncedSearch(searchQuery, searchArtistQuery, searchSource, newSort);
                              }}
                              className={`text-[11px] px-2.5 py-1 rounded-lg border transition-all cursor-pointer ${
                                searchSortBy === sortOption.id
                                  ? 'bg-white text-black border-white font-semibold'
                                  : 'bg-white/5 border-white/10 text-neutral-400 hover:text-white'
                              }`}
                            >
                              {sortOption.label}
                            </button>
                          ))}
                        </div>
                      </div>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            {/* Source Switcher Pills */}
            <div className="flex items-center space-x-2">
              {[
                { id: 'all', label: t.allSources },
                { id: 'youtube', label: 'YouTube Music' },
                { id: 'soundcloud', label: 'SoundCloud' },
              ].map((s) => (
                <button
                  key={s.id}
                  onClick={() => handleSourceChange(s.id as any)}
                  className={`text-xs px-3 py-1.5 rounded-xl border transition-all cursor-pointer font-medium ${
                    searchSource === s.id
                      ? 'bg-white text-black border-white shadow'
                      : 'bg-white/5 border-white/5 text-neutral-400 hover:text-white'
                  }`}
                >
                  {s.label}
                </button>
              ))}
            </div>

            {/* Search Results */}
            <div className="space-y-1 bg-[#1A1818] p-2 rounded-3xl border border-white/5 min-h-[300px]">
              {isSearching ? (
                <div className="py-20 flex flex-col items-center justify-center space-y-3 text-neutral-400">
                  <Disc3 size={32} className="animate-spin text-neutral-500" />
                  <p className="text-xs">{t.searching}</p>
                </div>
              ) : processedSearchResults.length > 0 ? (
                processedSearchResults.map(({ track, isDimmed }) => (
                  <TrackListItem
                    language={language}
                    key={track.id}
                    track={track}
                    isDimmed={isDimmed}
                    isCurrent={currentTrack?.id === track.id}
                    isPlaying={isPlaying}
                    isFavorite={favoriteTrackIds.has(track.id)}
                    isDownloaded={downloadedTrackIds.has(track.id)}
                    isDownloading={downloadingIds.has(track.id)}
                    fileSize={downloadedTracks.find((t) => t.id === track.id)?.fileSize}
                    accentColor={palette.accent}
                    onPlay={() => handlePlayTrack(track, searchResults)}
                    onToggleFavorite={() => handleToggleFavorite(track)}
                    onDownload={() => requestDownloadTrack(track)}
                  />
                ))
              ) : searchQuery || searchArtistQuery ? (
                <div className="py-20 text-center text-neutral-500">
                  <p className="text-sm">{t.searchNoResults}</p>
                </div>
              ) : (
                <div className="py-20 text-center text-neutral-500 space-y-1">
                  <p className="text-sm">{t.searchEmptyTitle}</p>
                  <p className="text-xs text-neutral-600">
                    {t.searchEmptyDesc}
                  </p>
                </div>
              )}
            </div>
          </div>
        )}

        {/* TAB 3: LIBRARY */}
        {activeTab === 'library' && (
          <div className="max-w-xl mx-auto space-y-6">
            {/* Favorites Section */}
            <div className="space-y-3">
              <div className="flex items-center justify-between px-1">
                <h3 className="text-sm font-bold text-white flex items-center space-x-2">
                  <Heart size={16} className="text-rose-500 fill-rose-500" />
                  <span>{t.favoriteTracks} ({favorites.length})</span>
                </h3>
                {favorites.length > 0 && (
                  <div className="flex items-center space-x-2">
                    <button
                      onClick={handleDownloadAllFavorites}
                      disabled={favorites.every((f) => downloadedTrackIds.has(f.id))}
                      className="text-xs text-neutral-400 hover:text-white transition-colors cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed flex items-center space-x-1"
                      title={t.downloadAllTooltip}
                    >
                      <Download size={13} />
                      <span>{t.downloadAll}</span>
                    </button>
                    <span className="text-neutral-600 text-xs">·</span>
                    <button
                      onClick={() => handlePlayTrack(favorites[0], favorites)}
                      className="text-xs text-rose-400 hover:text-rose-300 font-semibold cursor-pointer whitespace-nowrap"
                    >
                      {t.playAll}
                    </button>
                  </div>
                )}
              </div>

              {/* Selection action bar for Favorites */}
              {isFavSelectMode && favorites.length > 0 && (
                <div className="flex items-center justify-between p-3 bg-white/5 rounded-2xl border border-white/10 text-xs">
                  <span className="font-medium text-neutral-300">
                    {t.selected}: {selectedFavIds.size} {t.of} {favorites.length}
                  </span>
                  <div className="flex items-center space-x-2">
                    <button
                      onClick={() => {
                        if (selectedFavIds.size === favorites.length) {
                          setSelectedFavIds(new Set());
                        } else {
                          setSelectedFavIds(new Set(favorites.map((t) => t.id)));
                        }
                      }}
                      className="text-neutral-400 hover:text-white px-2 py-1 rounded-lg bg-white/5 cursor-pointer"
                    >
                      {selectedFavIds.size === favorites.length ? t.deselectAll : t.all}
                    </button>
                    {selectedFavIds.size > 0 && (
                      <>
                        <button
                          onClick={() => {
                            const selected = favorites.filter((t) => selectedFavIds.has(t.id));
                            requestDownloadMultiple(selected);
                          }}
                          className="text-emerald-400 hover:text-emerald-300 px-2.5 py-1 rounded-lg bg-emerald-500/10 border border-emerald-500/20 font-medium flex items-center space-x-1 cursor-pointer active:scale-95"
                        >
                          <Download size={13} />
                          <span>{t.downloadCount(selectedFavIds.size)}</span>
                        </button>
                        <button
                          onClick={() => {
                            setFavorites((prev) => prev.filter((t) => !selectedFavIds.has(t.id)));
                            setSelectedFavIds(new Set());
                            setIsFavSelectMode(false);
                          }}
                          className="text-rose-400 hover:text-rose-300 px-2.5 py-1 rounded-lg bg-rose-500/10 border border-rose-500/20 font-medium flex items-center space-x-1 cursor-pointer active:scale-95"
                        >
                          <Trash2 size={13} />
                          <span>{t.remove}</span>
                        </button>
                      </>
                    )}
                    <button
                      onClick={() => {
                        setIsFavSelectMode(false);
                        setSelectedFavIds(new Set());
                      }}
                      className="text-neutral-300 hover:text-white px-2.5 py-1 rounded-lg bg-white/10 cursor-pointer font-medium"
                    >
                      {t.done}
                    </button>
                  </div>
                </div>
              )}

              <div className="space-y-1 bg-[#1A1818] p-2 rounded-3xl border border-white/5">
                {favorites.length > 0 ? (
                  <>
                    {(isFavoritesExpanded ? favorites : favorites.slice(0, 3)).map((track) => (
                      <TrackListItem
                        language={language}
                        key={`fav_${track.id}`}
                        track={track}
                        isCurrent={currentTrack?.id === track.id}
                        isPlaying={isPlaying}
                        isFavorite={true}
                        isDownloaded={downloadedTrackIds.has(track.id)}
                        isDownloading={downloadingIds.has(track.id)}
                        fileSize={downloadedTracks.find((t) => t.id === track.id)?.fileSize}
                        accentColor={palette.accent}
                        isSelectMode={isFavSelectMode}
                        isSelected={selectedFavIds.has(track.id)}
                        onSelect={() => toggleSelectFav(track.id)}
                        onLongPress={() => {
                          setIsFavoritesExpanded(true);
                          setIsFavSelectMode(true);
                          toggleSelectFav(track.id);
                        }}
                        onPlay={() => handlePlayTrack(track, favorites)}
                        onToggleFavorite={() => handleToggleFavorite(track)}
                        onDownload={() => requestDownloadTrack(track)}
                      />
                    ))}
                    {favorites.length > 3 && (
                      <button
                        onClick={() => setIsFavoritesExpanded((prev) => !prev)}
                        className="w-full py-2.5 mt-1 text-xs text-neutral-400 hover:text-white flex items-center justify-center space-x-1.5 transition-colors cursor-pointer rounded-2xl hover:bg-white/5 active:scale-[0.99]"
                      >
                        <span>{isFavoritesExpanded ? t.showLess : t.showMore(favorites.length)}</span>
                        {isFavoritesExpanded ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
                      </button>
                    )}
                  </>
                ) : (
                  <div className="py-12 text-center text-neutral-500 space-y-1">
                    <p className="text-xs">{t.noFavoritesYet}</p>
                    <p className="text-[11px] text-neutral-600">
                      {t.noFavoritesDesc}
                    </p>
                  </div>
                )}
              </div>
            </div>

            {/* History Section */}
            <div className="space-y-3">
              <div className="flex items-center justify-between px-1">
                <h3 className="text-sm font-bold text-white flex items-center space-x-2">
                  <Clock size={16} className="text-neutral-400" />
                  <span>{t.recentlyPlayed} ({history.length})</span>
                </h3>
                {history.length > 0 && (
                  <button
                    onClick={() => {
                      setHistory([]);
                      localStorage.removeItem('liemusic_history');
                    }}
                    className="text-xs text-neutral-400 hover:text-neutral-200 cursor-pointer flex items-center space-x-1"
                  >
                    <Trash2 size={13} />
                    <span>{t.clear}</span>
                  </button>
                )}
              </div>

              <div className="space-y-1 bg-[#1A1818] p-2 rounded-3xl border border-white/5">
                {history.length > 0 ? (
                  <>
                    {(isLibraryHistoryExpanded ? history : history.slice(0, 3)).map((track) => (
                      <TrackListItem
                        language={language}
                        key={`lib_hist_${track.id}`}
                        track={track}
                        isCurrent={currentTrack?.id === track.id}
                        isPlaying={isPlaying}
                        isFavorite={favoriteTrackIds.has(track.id)}
                        isDownloaded={downloadedTrackIds.has(track.id)}
                        isDownloading={downloadingIds.has(track.id)}
                        fileSize={downloadedTracks.find((t) => t.id === track.id)?.fileSize}
                        accentColor={palette.accent}
                        onPlay={() => handlePlayTrack(track, history)}
                        onToggleFavorite={() => handleToggleFavorite(track)}
                        onDownload={() => requestDownloadTrack(track)}
                      />
                    ))}
                    {history.length > 3 && (
                      <button
                        onClick={() => setIsLibraryHistoryExpanded((prev) => !prev)}
                        className="w-full py-2.5 mt-1 text-xs text-neutral-400 hover:text-white flex items-center justify-center space-x-1.5 transition-colors cursor-pointer rounded-2xl hover:bg-white/5 active:scale-[0.99]"
                      >
                        <span>{isLibraryHistoryExpanded ? t.showLess : t.showMore(history.length)}</span>
                        {isLibraryHistoryExpanded ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
                      </button>
                    )}
                  </>
                ) : (
                  <div className="py-12 text-center text-neutral-500">
                    <p className="text-xs">{t.emptyRecent}</p>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* TAB 4: OFFLINE */}
        {activeTab === 'offline' && (
          <div className="max-w-xl mx-auto space-y-4">
            <div className="p-4 rounded-3xl bg-gradient-to-r from-emerald-950/40 to-[#1D1B1B] border border-emerald-500/20 shadow-xl space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-3">
                  <div className="w-10 h-10 rounded-2xl bg-emerald-500/20 text-emerald-400 flex items-center justify-center">
                    <DownloadCloud size={20} />
                  </div>
                  <div>
                    <h3 className="font-bold text-sm text-white">{t.offlineMusic}</h3>
                    <p className="text-[11px] text-neutral-300">
                      {t.downloadedCount(downloadedTracks.length)}
                    </p>
                  </div>
                </div>

                <div className="flex items-center space-x-1.5">
                  <button
                    onClick={() => fileInputRef.current?.click()}
                    className="px-2.5 py-1.5 rounded-xl bg-white/10 hover:bg-white/15 border border-white/10 text-white font-medium text-xs flex items-center space-x-1 transition-all active:scale-95 cursor-pointer"
                    title={t.addTrackFromDevice}
                  >
                    <FolderPlus size={14} className="text-emerald-400" />
                    <span>+ {t.addFile}</span>
                  </button>
                  {downloadedTracks.length > 0 && (
                    <button
                      onClick={() => handlePlayTrack(downloadedTracks[0], downloadedTracks)}
                      className="px-2.5 py-1.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-black font-bold text-xs flex items-center space-x-1 shadow transition-all active:scale-95 cursor-pointer"
                    >
                      <Play size={12} fill="currentColor" />
                      <span>{t.playAll}</span>
                    </button>
                  )}
                </div>
              </div>

              {downloadedTracks.length > 0 && (
                <div className="flex items-center justify-between pt-1 border-t border-white/5">
                  <span className="text-[11px] text-neutral-400">
                    {t.storageCount(downloadedTracks.length)}
                  </span>
                  <span className="text-[10px] text-neutral-500">
                    {t.longPressToSelect}
                  </span>
                </div>
              )}
            </div>

            {/* Selection action bar for Offline */}
            {isOfflineSelectMode && downloadedTracks.length > 0 && (
              <div className="flex items-center justify-between p-3 bg-white/5 rounded-2xl border border-white/10 text-xs">
                <span className="font-medium text-neutral-300">
                  {t.selected}: {selectedOfflineIds.size} {t.of} {downloadedTracks.length}
                </span>
                <div className="flex items-center space-x-2">
                  <button
                    onClick={() => {
                      if (selectedOfflineIds.size === downloadedTracks.length) {
                        setSelectedOfflineIds(new Set());
                      } else {
                        setSelectedOfflineIds(new Set(downloadedTracks.map((t) => t.id)));
                      }
                    }}
                    className="text-neutral-400 hover:text-white px-2 py-1 rounded-lg bg-white/5 cursor-pointer"
                  >
                    {selectedOfflineIds.size === downloadedTracks.length ? t.deselectAll : t.all}
                  </button>
                  {selectedOfflineIds.size > 0 && (
                    <button
                      onClick={() => requestDeleteMultipleDownloads(Array.from(selectedOfflineIds))}
                      className="text-rose-400 hover:text-rose-300 px-3 py-1 rounded-lg bg-rose-500/15 border border-rose-500/30 font-medium flex items-center space-x-1 cursor-pointer active:scale-95"
                    >
                      <Trash2 size={13} />
                      <span>{t.delete} ({selectedOfflineIds.size})</span>
                    </button>
                  )}
                </div>
              </div>
            )}

            <div className="space-y-1 bg-[#1A1818] p-2 rounded-3xl border border-white/5">
              {downloadedTracks.length > 0 ? (
                downloadedTracks.map((track) => (
                  <TrackListItem
                        language={language}
                    key={`offline_${track.id}`}
                    track={track}
                    isCurrent={currentTrack?.id === track.id}
                    isPlaying={isPlaying}
                    isFavorite={favoriteTrackIds.has(track.id)}
                    isDownloaded={true}
                    isDownloading={downloadingIds.has(track.id)}
                    fileSize={track.fileSize}
                    accentColor={palette.accent}
                    isSelectMode={isOfflineSelectMode}
                    isSelected={selectedOfflineIds.has(track.id)}
                    onSelect={() => toggleSelectOffline(track.id)}
                    onLongPress={() => {
                      setIsOfflineSelectMode(true);
                      toggleSelectOffline(track.id);
                    }}
                    onPlay={() => handlePlayTrack(track, downloadedTracks)}
                    onToggleFavorite={() => handleToggleFavorite(track)}
                    onDeleteDownload={() => requestDeleteDownload(track.id, track.title)}
                  />
                ))
              ) : (
                <div className="py-16 text-center text-neutral-500 space-y-2">
                  <DownloadCloud size={36} className="mx-auto text-neutral-600 opacity-60" />
                  <p className="text-xs font-medium">{t.noDownloadedTracks}</p>
                  <p className="text-[11px] text-neutral-600 max-w-xs mx-auto">
                    {t.noDownloadedTracksDesc}
                  </p>
                </div>
              )}
            </div>
          </div>
        )}
          </motion.div>
        </AnimatePresence>
      </main>

      {/* Bottom Floating Player + Navigation Bar Container */}
      <div className="fixed bottom-0 left-0 right-0 z-30 pointer-events-none">
        <AnimatePresence>
          {currentTrack && (
            <motion.div
              key="miniplayer-animated-wrap"
              initial={{ y: 50, opacity: 0, scale: 0.95 }}
              animate={{ y: 0, opacity: 1, scale: 1 }}
              exit={{ y: 50, opacity: 0, scale: 0.95 }}
              transition={{ type: 'spring', stiffness: 380, damping: 28 }}
              className="pointer-events-auto"
            >
              <MiniPlayer
                currentTrack={currentTrack}
                isPlaying={isPlaying}
                currentTime={currentTime}
                duration={duration}
                accentColor={palette.accent}
                glowColor={palette.glow}
                onTogglePlay={handleTogglePlay}
                onPrev={handlePrevTrack}
                onNext={handleNextTrack}
                onOpenFullPlayer={() => setIsFullPlayerOpen(true)}
              />
            </motion.div>
          )}
        </AnimatePresence>

        <div className="pointer-events-auto">
          <BottomNav
            activeTab={activeTab}
            language={language}
            onChangeTab={setActiveTab}
            accentColor={palette.accent}
          />
        </div>
      </div>

      <FullPlayer
        isOpen={isFullPlayerOpen}
        onClose={() => setIsFullPlayerOpen(false)}
        track={currentTrack ? { ...currentTrack, isDownloaded: downloadedTrackIds.has(currentTrack.id) } : null}
        isPlaying={isPlaying}
        currentTime={currentTime}
        duration={duration}
        isFavorite={isCurrentFavorite}
        language={language}
        isShuffle={isShuffle}
        isRepeat={isRepeat}
        isDownloading={currentTrack ? downloadingIds.has(currentTrack.id) : false}
        volume={volume}
        accentColor={palette.accent}
        glowColor={palette.glow}
        onTogglePlay={handleTogglePlay}
        onNext={handleNextTrack}
        onPrev={handlePrevTrack}
        onSeek={(secs) => audioEngine.seek(secs)}
        onToggleFavorite={() => currentTrack && handleToggleFavorite(currentTrack)}
        onToggleShuffle={() => setIsShuffle((prev) => !prev)}
        onToggleRepeat={() => setIsRepeat((prev) => !prev)}
        onVolumeChange={(v) => {
          setVolume(v);
          audioEngine.setVolume(v);
        }}
        onOpenEqualizer={() => setIsEqualizerOpen(true)}
        onDownloadTrack={() => currentTrack && requestDownloadTrack(currentTrack)}
      />

      <EqualizerModal
        isOpen={isEqualizerOpen}
        onClose={() => setIsEqualizerOpen(false)}
        equalizerBands={equalizerBands}
        bassBoost={bassBoost}
        activePreset={activePreset}
        accentColor={palette.accent}
        language={language}
        onBandChange={(idx, gain) => {
          const next = [...equalizerBands];
          next[idx] = gain;
          setEqualizerBands(next);
          setActivePreset('');
          audioEngine.setBandGain(idx, gain);
        }}
        onBassBoostChange={(lvl) => {
          setBassBoost(lvl);
          setActivePreset('');
          audioEngine.setBassBoost(lvl);
        }}
        onSelectPreset={(presetId: string) => {
          setActivePreset(presetId);
          const preset = DEFAULT_PRESETS.find((p) => p.id === presetId);
          if (preset) {
            setEqualizerBands(preset.bands);
            setBassBoost(preset.bassBoost || 0);
            audioEngine.applyPreset(preset);
          }
        }}
      />

      <ConfirmDeleteModal
        isOpen={!!deletePrompt}
        language={language}
        count={deletePrompt?.trackIds.length || 0}
        trackTitle={deletePrompt?.trackTitle}
        onConfirm={(dontAskAgain) => {
          if (dontAskAgain) {
            localStorage.setItem('liemusic_dont_ask_delete', 'true');
          }
          if (deletePrompt) {
            executeDeleteDownload(deletePrompt.trackIds);
            if (isOfflineSelectMode) {
              setSelectedOfflineIds(new Set());
              setIsOfflineSelectMode(false);
            }
          }
          setDeletePrompt(null);
        }}
        onCancel={() => setDeletePrompt(null)}
      />

      <LanguageSelectModal
        isOpen={isLanguageModalOpen}
        currentLanguage={language}
        onSelectLanguage={(lang) => {
          setLanguage(lang);
          localStorage.setItem('liemusic_language', lang);
        }}
        onClose={() => setIsLanguageModalOpen(false)}
      />

      <SettingsModal
        isOpen={isSettingsOpen}
        onClose={() => setIsSettingsOpen(false)}
        language={language}
        onLanguageChange={(lang) => {
          setLanguage(lang);
          localStorage.setItem('liemusic_language', lang);
        }}
        downloadedTracks={downloadedTracks}
        onDeleteTrack={(trackId, trackTitle) => requestDeleteDownload(trackId, trackTitle)}
        onClearAllDownloads={() => {
          if (downloadedTracks.length > 0) {
            requestDeleteMultipleDownloads(downloadedTracks.map((t) => t.id));
          }
        }}
        onOpenEqualizer={() => setIsEqualizerOpen(true)}
        onClearHistory={() => {
          setHistory([]);
          localStorage.removeItem('liemusic_history');
        }}
        accentColor={palette.accent}
      />

      <CellularDownloadModal
        isOpen={!!cellularPrompt}
        language={language}
        count={cellularPrompt?.tracks.length || 1}
        onConfirm={(dontAskAgain) => {
          if (dontAskAgain) {
            localStorage.setItem('liemusic_allow_cellular_downloads', 'true');
          }
          if (cellularPrompt) {
            for (const t of cellularPrompt.tracks) {
              executeDownload(t);
            }
          }
          setCellularPrompt(null);
        }}
        onCancel={() => setCellularPrompt(null)}
      />
    </div>
  );
};

export default App;
