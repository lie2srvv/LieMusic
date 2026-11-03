import React, { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import {
  Search,
  DownloadCloud,
  Heart,
  Clock,
  Disc3,
  Play,
  Sliders,
  Trash2,
  ChevronDown,
  ChevronUp,
  Download,
  FolderPlus,
} from 'lucide-react';
import { ConfirmDeleteModal } from './components/ConfirmDeleteModal';
import { CellularDownloadModal } from './components/CellularDownloadModal';
import { isCellularConnection } from './utils/network';
import { Track, EqualizerPreset, AudioSource } from './types';
import { extractPaletteFromImage, ExtractedPalette } from './utils/colorExtractor';
import { audioEngine } from './services/audio';
import { searchYouTubeTracks, resolveStreamUrl } from './services/youtube';
import { searchSoundCloudTracks } from './services/soundcloud';
import { BottomNav, TabType } from './components/BottomNav';
import { MiniPlayer } from './components/MiniPlayer';
import { FullPlayer } from './components/FullPlayer';
import { EqualizerModal } from './components/EqualizerModal';
import { TrackListItem } from './components/TrackListItem';
import { invoke } from '@tauri-apps/api/core';
import { FoxLogo } from './components/FoxLogo';
import { getHighResThumbnail } from './utils/thumbnail';

export const App: React.FC = () => {
  const [activeTab, setActiveTab] = useState<TabType>('home');

  const [currentTrack, setCurrentTrack] = useState<Track | null>(null);
  const [isPlaying, setIsPlaying] = useState<boolean>(false);
  const [currentTime, setCurrentTime] = useState<number>(0);
  const [duration, setDuration] = useState<number>(0);
  const [volume, setVolume] = useState<number>(0.85);
  const [isShuffle, setIsShuffle] = useState<boolean>(false);
  const [isRepeat, setIsRepeat] = useState<boolean>(false);
  const [visualizerData, setVisualizerData] = useState<Uint8Array>(new Uint8Array(32));

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
  const [searchSource, setSearchSource] = useState<AudioSource | 'all'>('all');
  const [searchResults, setSearchResults] = useState<Track[]>([]);
  const [isSearching, setIsSearching] = useState<boolean>(false);

  const [isFullPlayerOpen, setIsFullPlayerOpen] = useState<boolean>(false);
  const [isEqualizerOpen, setIsEqualizerOpen] = useState<boolean>(false);

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
    async (rawTrack: Track, newQueue?: Track[]) => {
      const track: Track = { ...rawTrack, thumbnail: getHighResThumbnail(rawTrack.thumbnail) };
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
        const streamUrl = await resolveStreamUrl(track);
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

  useEffect(() => {
    if (!isPlaying) return;
    let rafId: number;
    const loop = () => {
      setVisualizerData(audioEngine.getVisualizerData());
      rafId = requestAnimationFrame(loop);
    };
    rafId = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(rafId);
  }, [isPlaying]);

  const handleTogglePlay = () => {
    if (!currentTrack && queue.length > 0) {
      handlePlayTrack(queue[0]);
    } else {
      audioEngine.togglePlayPause();
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
        fileSize: sizeStr || '2.5 МБ',
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
        let artist = 'Локальный файл';

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
        try {
          const tempAudio = new Audio(URL.createObjectURL(file));
          await new Promise<void>((resolve) => {
            tempAudio.addEventListener('loadedmetadata', () => {
              if (!isNaN(tempAudio.duration) && tempAudio.duration > 0) {
                duration = Math.round(tempAudio.duration);
              }
              resolve();
            });
            setTimeout(resolve, 600);
          });
        } catch {
          // Fallback duration
        }

        const localTrack: Track = {
          id: trackId,
          title,
          artist,
          album: 'Локальные треки',
          duration,
          thumbnail: '',
          source: 'local',
          isDownloaded: true,
          fileSize: sizeStr || `${(file.size / (1024 * 1024)).toFixed(1)} МБ`,
        };

        setDownloadedTracks((prev) => [localTrack, ...prev.filter((t) => t.id !== localTrack.id)]);
      } catch (err) {
        console.error('[LieMusic] Error importing local file:', err);
      }
    }

    e.target.value = '';
  };

  const handleSearch = async (query: string, sourceOverride?: AudioSource | 'all') => {
    setSearchQuery(query);
    const activeSource = sourceOverride || searchSource;
    const clean = query.trim();
    if (!clean) {
      setSearchResults([]);
      return;
    }

    setIsSearching(true);
    try {
      let combined: Track[] = [];

      if (activeSource === 'all') {
        const [ytResults, scResults] = await Promise.all([
          searchYouTubeTracks(clean),
          searchSoundCloudTracks(clean),
        ]);
        const maxLen = Math.max(ytResults.length, scResults.length);
        for (let i = 0; i < maxLen; i++) {
          if (ytResults[i]) combined.push(ytResults[i]);
          if (scResults[i]) combined.push(scResults[i]);
        }
      } else if (activeSource === 'youtube') {
        combined = await searchYouTubeTracks(clean);
      } else {
        combined = await searchSoundCloudTracks(clean);
      }

      setSearchResults(combined);
    } catch (err) {
      console.error('[LieMusic] Search error:', err);
      setSearchResults([]);
    } finally {
      setIsSearching(false);
    }
  };

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
            <p className="text-[11px] text-neutral-400">Свободный стриминг музыки</p>
          </div>
        </div>

        <div className="flex items-center space-x-2">
          <button
            onClick={() => setIsEqualizerOpen(true)}
            className="w-9 h-9 rounded-2xl bg-white/5 hover:bg-white/10 flex items-center justify-center text-neutral-300 hover:text-white transition-all border border-white/5 cursor-pointer active:scale-95"
            title="Эквалайзер"
          >
            <Sliders size={18} />
          </button>
        </div>
      </header>

      {/* Main Content View */}
      <main className="flex-1 overflow-y-auto px-4 py-4 pb-44">
        {/* TAB 1: HOME */}
        {activeTab === 'home' && (
          <div className="max-w-xl mx-auto space-y-5">
            {/* Search Trigger */}
            <div
              onClick={() => setActiveTab('search')}
              className="flex items-center space-x-3 px-4 py-3 bg-[#1D1B1B] hover:bg-[#222020] border border-white/10 rounded-2xl cursor-pointer transition-all active:scale-[0.99] shadow-lg"
            >
              <Search size={18} className="text-neutral-400" />
              <span className="text-sm text-neutral-400">Найти трек, артиста или альбом...</span>
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
                      <Play size={12} fill="currentColor" className="translate-x-0.5" />
                    </button>
                  )}
                </div>
                <h3 className="font-bold text-sm text-white">Любимые треки</h3>
                <p className="text-[11px] text-neutral-400 mt-0.5">{favorites.length} треков</p>
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
                      <Play size={12} fill="currentColor" className="translate-x-0.5" />
                    </button>
                  )}
                </div>
                <h3 className="font-bold text-sm text-white">Офлайн музыка</h3>
                <p className="text-[11px] text-neutral-400 mt-0.5">{downloadedTracks.length} скачано</p>
              </div>
            </div>

            {/* Recently Played History */}
            <div className="space-y-3 pt-2">
              <div className="flex items-center justify-between px-1">
                <span className="text-xs font-bold text-neutral-400 uppercase tracking-wider flex items-center space-x-1.5">
                  <Clock size={14} />
                  <span>Недавно слушали</span>
                </span>
                {history.length > 0 && (
                  <button
                    onClick={() => setActiveTab('library')}
                    className="text-[11px] text-neutral-400 hover:text-white"
                  >
                    Все ({history.length})
                  </button>
                )}
              </div>

              <div className="space-y-1 bg-[#1A1818] p-2 rounded-3xl border border-white/5">
                {history.length > 0 ? (
                  <>
                    {(isHomeHistoryExpanded ? history : history.slice(0, 3)).map((track) => (
                      <TrackListItem
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
                        <span>{isHomeHistoryExpanded ? 'Свернуть' : `Показать ещё (все ${history.length})`}</span>
                        {isHomeHistoryExpanded ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
                      </button>
                    )}
                  </>
                ) : (
                  <div className="py-8 text-center text-neutral-500">
                    <p className="text-xs">Вы еще не слушали треки</p>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* TAB 2: SEARCH */}
        {activeTab === 'search' && (
          <div className="max-w-xl mx-auto space-y-4">
            <div className="relative">
              <Search size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-neutral-400" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => handleSearch(e.target.value)}
                placeholder="Поиск треков, артистов..."
                className="w-full bg-[#1D1B1B] border border-white/10 rounded-2xl pl-11 pr-4 py-3 text-sm text-white placeholder-neutral-500 focus:outline-none focus:border-white/30 transition-all shadow-inner"
                autoFocus
              />
            </div>

            {/* Source Switcher Pills */}
            <div className="flex items-center space-x-2">
              {[
                { id: 'all', label: 'Все источники' },
                { id: 'youtube', label: 'YouTube Music' },
                { id: 'soundcloud', label: 'SoundCloud' },
              ].map((s) => (
                <button
                  key={s.id}
                  onClick={() => {
                    setSearchSource(s.id as any);
                    if (searchQuery) handleSearch(searchQuery, s.id as any);
                  }}
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
                  <p className="text-xs">Ищем аудиопотоки без серверов...</p>
                </div>
              ) : searchResults.length > 0 ? (
                searchResults.map((track) => (
                  <TrackListItem
                    key={track.id}
                    track={track}
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
              ) : searchQuery ? (
                <div className="py-20 text-center text-neutral-500">
                  <p className="text-sm">Ничего не найдено по запросу «{searchQuery}»</p>
                </div>
              ) : (
                <div className="py-20 text-center text-neutral-500 space-y-1">
                  <p className="text-sm">Введите название песни или исполнителя</p>
                  <p className="text-xs text-neutral-600">
                    Поиск по открытым каталогам YouTube Music и SoundCloud
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
                  <span>Любимые треки ({favorites.length})</span>
                </h3>
                {favorites.length > 0 && (
                  <button
                    onClick={() => handlePlayTrack(favorites[0], favorites)}
                    className="text-xs text-rose-400 hover:text-rose-300 font-semibold cursor-pointer whitespace-nowrap"
                  >
                    Слушать все
                  </button>
                )}
              </div>

              {/* Sub toolbar when expanded or has items */}
              {favorites.length > 0 && isFavoritesExpanded && (
                <div className="flex items-center space-x-2 px-1 overflow-x-auto whitespace-nowrap scrollbar-none py-0.5">
                  <button
                    onClick={() =>
                      requestDownloadMultiple(
                        favorites.filter((t) => !downloadedTrackIds.has(t.id))
                      )
                    }
                    className="text-xs text-neutral-300 hover:text-emerald-400 flex items-center space-x-1.5 py-1.5 px-3 rounded-xl bg-white/5 border border-white/5 transition-colors cursor-pointer shrink-0"
                    title="Скачать все в память"
                  >
                    <Download size={13} />
                    <span>Скачать все</span>
                  </button>
                  <button
                    onClick={() => {
                      setIsFavSelectMode((prev) => !prev);
                      setSelectedFavIds(new Set());
                    }}
                    className={`text-xs py-1.5 px-3 rounded-xl border transition-all cursor-pointer font-medium shrink-0 ${
                      isFavSelectMode
                        ? 'bg-rose-500 text-white border-rose-500'
                        : 'bg-white/5 border-white/5 text-neutral-300 hover:text-white'
                    }`}
                  >
                    {isFavSelectMode ? 'Готово' : 'Выбрать'}
                  </button>
                </div>
              )}

              {/* Selection action bar for Favorites */}
              {isFavSelectMode && favorites.length > 0 && (
                <div className="flex items-center justify-between p-3 bg-white/5 rounded-2xl border border-white/10 text-xs">
                  <span className="font-medium text-neutral-300">
                    Выбрано: {selectedFavIds.size} из {favorites.length}
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
                      {selectedFavIds.size === favorites.length ? 'Снять всё' : 'Все'}
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
                          <span>Скачать ({selectedFavIds.size})</span>
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
                          <span>Убрать</span>
                        </button>
                      </>
                    )}
                  </div>
                </div>
              )}

              <div className="space-y-1 bg-[#1A1818] p-2 rounded-3xl border border-white/5">
                {favorites.length > 0 ? (
                  <>
                    {(isFavoritesExpanded ? favorites : favorites.slice(0, 3)).map((track) => (
                      <TrackListItem
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
                        <span>{isFavoritesExpanded ? 'Свернуть' : `Показать все (${favorites.length})`}</span>
                        {isFavoritesExpanded ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
                      </button>
                    )}
                  </>
                ) : (
                  <div className="py-12 text-center text-neutral-500 space-y-1">
                    <p className="text-xs">В любимых пока пусто</p>
                    <p className="text-[11px] text-neutral-600">
                      Нажмите сердечко на любом треке, чтобы сохранить его
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
                  <span>История прослушиваний ({history.length})</span>
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
                    <span>Очистить</span>
                  </button>
                )}
              </div>

              <div className="space-y-1 bg-[#1A1818] p-2 rounded-3xl border border-white/5">
                {history.length > 0 ? (
                  <>
                    {(isLibraryHistoryExpanded ? history : history.slice(0, 3)).map((track) => (
                      <TrackListItem
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
                        <span>{isLibraryHistoryExpanded ? 'Свернуть' : `Показать ещё (все ${history.length})`}</span>
                        {isLibraryHistoryExpanded ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
                      </button>
                    )}
                  </>
                ) : (
                  <div className="py-12 text-center text-neutral-500">
                    <p className="text-xs">История пуста</p>
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
                    <h3 className="font-bold text-sm text-white">Офлайн треки</h3>
                    <p className="text-[11px] text-neutral-300">
                      Сохранено на устройстве ({downloadedTracks.length})
                    </p>
                  </div>
                </div>

                <div className="flex items-center space-x-1.5">
                  <button
                    onClick={() => fileInputRef.current?.click()}
                    className="px-2.5 py-1.5 rounded-xl bg-white/10 hover:bg-white/15 border border-white/10 text-white font-medium text-xs flex items-center space-x-1 transition-all active:scale-95 cursor-pointer"
                    title="Добавить трек с устройства"
                  >
                    <FolderPlus size={14} className="text-emerald-400" />
                    <span>+ Файл</span>
                  </button>
                  {downloadedTracks.length > 0 && (
                    <button
                      onClick={() => handlePlayTrack(downloadedTracks[0], downloadedTracks)}
                      className="px-2.5 py-1.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-black font-bold text-xs flex items-center space-x-1 shadow transition-all active:scale-95 cursor-pointer"
                    >
                      <Play size={12} fill="currentColor" />
                      <span>Слушать</span>
                    </button>
                  )}
                </div>
              </div>

              {downloadedTracks.length > 0 && (
                <div className="flex items-center justify-between pt-1 border-t border-white/5">
                  <span className="text-[11px] text-neutral-400">
                    {downloadedTracks.length} треков в памяти
                  </span>
                  <div className="flex items-center space-x-2">
                    <button
                      onClick={() => {
                        setIsOfflineSelectMode((prev) => !prev);
                        setSelectedOfflineIds(new Set());
                      }}
                      className={`px-2.5 py-1 rounded-lg border transition-all text-[11px] font-semibold cursor-pointer ${
                        isOfflineSelectMode
                          ? 'bg-rose-500 text-white border-rose-500'
                          : 'bg-white/5 border-white/10 text-neutral-300 hover:text-white'
                      }`}
                    >
                      {isOfflineSelectMode ? 'Готово' : 'Выбрать'}
                    </button>
                  </div>
                </div>
              )}
            </div>

            {/* Selection action bar for Offline */}
            {isOfflineSelectMode && downloadedTracks.length > 0 && (
              <div className="flex items-center justify-between p-3 bg-white/5 rounded-2xl border border-white/10 text-xs">
                <span className="font-medium text-neutral-300">
                  Выбрано: {selectedOfflineIds.size} из {downloadedTracks.length}
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
                    {selectedOfflineIds.size === downloadedTracks.length ? 'Снять всё' : 'Все'}
                  </button>
                  {selectedOfflineIds.size > 0 && (
                    <button
                      onClick={() => requestDeleteMultipleDownloads(Array.from(selectedOfflineIds))}
                      className="text-rose-400 hover:text-rose-300 px-3 py-1 rounded-lg bg-rose-500/15 border border-rose-500/30 font-medium flex items-center space-x-1 cursor-pointer active:scale-95"
                    >
                      <Trash2 size={13} />
                      <span>Удалить ({selectedOfflineIds.size})</span>
                    </button>
                  )}
                </div>
              </div>
            )}

            <div className="space-y-1 bg-[#1A1818] p-2 rounded-3xl border border-white/5">
              {downloadedTracks.length > 0 ? (
                downloadedTracks.map((track) => (
                  <TrackListItem
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
                  <p className="text-xs font-medium">Нет скачанных треков</p>
                  <p className="text-[11px] text-neutral-600 max-w-xs mx-auto">
                    Лайкайте треки (сердечко), качайте из поиска или добавьте локальный файл кнопкой «+ Файл»!
                  </p>
                </div>
              )}
            </div>
          </div>
        )}
      </main>

      {/* Bottom Floating Player + Navigation Bar Container */}
      <div className="fixed bottom-0 left-0 right-0 z-30 pointer-events-none">
        {currentTrack && (
          <div className="pointer-events-auto">
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
          </div>
        )}

        <div className="pointer-events-auto">
          <BottomNav
            activeTab={activeTab}
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
        isShuffle={isShuffle}
        isRepeat={isRepeat}
        isDownloading={currentTrack ? downloadingIds.has(currentTrack.id) : false}
        volume={volume}
        visualizerData={visualizerData}
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
        currentBands={equalizerBands}
        bassBoost={bassBoost}
        accentColor={palette.accent}
        onBandChange={(idx, gain) => {
          const next = [...equalizerBands];
          next[idx] = gain;
          setEqualizerBands(next);
          audioEngine.setBandGain(idx, gain);
        }}
        onBassBoostChange={(lvl) => {
          setBassBoost(lvl);
          audioEngine.setBassBoost(lvl);
        }}
        onSelectPreset={(preset: EqualizerPreset) => {
          setEqualizerBands(preset.bands);
          setBassBoost(preset.bassBoost || 0);
          audioEngine.applyPreset(preset);
        }}
      />

      <ConfirmDeleteModal
        isOpen={!!deletePrompt}
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

      <CellularDownloadModal
        isOpen={!!cellularPrompt}
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
