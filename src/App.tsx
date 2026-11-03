import React, { useState, useEffect, useMemo, useCallback } from 'react';
import {
  Search,
  DownloadCloud,
  Heart,
  Clock,
  Disc3,
  Play,
  Sliders,
  Trash2,
} from 'lucide-react';
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
import logoImg from './assets/logo.png';

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

  useEffect(() => {
    const cachedFavs = localStorage.getItem('liemusic_favorites');
    if (cachedFavs) {
      try {
        setFavorites(JSON.parse(cachedFavs));
      } catch {}
    }

    const cachedHistory = localStorage.getItem('liemusic_history');
    if (cachedHistory) {
      try {
        setHistory(JSON.parse(cachedHistory));
      } catch {}
    }

    const cachedDownloads = localStorage.getItem('liemusic_downloads');
    if (cachedDownloads) {
      try {
        setDownloadedTracks(JSON.parse(cachedDownloads));
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
    async (track: Track, newQueue?: Track[]) => {
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

  const handleDownloadTrack = async (track: Track) => {
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

  const handleDeleteDownload = async (trackId: string) => {
    try {
      await invoke('delete_downloaded_track_file', { trackId });
    } catch (err) {
      console.warn('[LieMusic] Error deleting track file:', err);
    }
    setDownloadedTracks((prev) => prev.filter((t) => t.id !== trackId));
  };

  const handleToggleFavorite = (track: Track) => {
    const isCurrentlyFav = favoriteTrackIds.has(track.id);

    if (isCurrentlyFav) {
      setFavorites((prev) => prev.filter((t) => t.id !== track.id));
    } else {
      setFavorites((prev) => [track, ...prev]);
      handleDownloadTrack(track);
    }
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
      {/* Top Header Bar */}
      <header className="flex items-center justify-between px-5 pt-8 pb-3 bg-[#151313]/90 backdrop-blur-md border-b border-white/5 safe-area-pt shrink-0 z-20">
        <div className="flex items-center space-x-3">
          <div
            className="w-10 h-10 rounded-2xl flex items-center justify-center p-1.5 shadow-lg transition-transform active:scale-95 border border-white/10"
            style={{
              backgroundColor: '#1E1B1B',
              boxShadow: `0 0 16px ${palette.glow}`,
            }}
          >
            <img src={logoImg} alt="LieMusic" className="w-full h-full object-contain" />
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
                  history.slice(0, 8).map((track) => (
                    <TrackListItem
                      key={`home_${track.id}`}
                      track={track}
                      isCurrent={currentTrack?.id === track.id}
                      isPlaying={isPlaying}
                      isFavorite={favoriteTrackIds.has(track.id)}
                      isDownloaded={downloadedTrackIds.has(track.id)}
                      fileSize={downloadedTracks.find((t) => t.id === track.id)?.fileSize}
                      accentColor={palette.accent}
                      onPlay={() => handlePlayTrack(track, history)}
                      onToggleFavorite={() => handleToggleFavorite(track)}
                      onDownload={() => handleDownloadTrack(track)}
                    />
                  ))
                ) : (
                  <div className="py-8 text-center text-neutral-500 space-y-1">
                    <p className="text-xs">Вы пока ничего не слушали</p>
                    <p className="text-[11px] text-neutral-600">
                      Воспользуйтесь поиском, чтобы найти любимую музыку
                    </p>
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
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => handleSearch(e.target.value)}
                placeholder="Поиск треков, артистов..."
                autoFocus
                className="w-full pl-11 pr-4 py-3 bg-[#1D1B1B] text-white rounded-2xl border border-white/10 focus:border-white/30 focus:outline-none transition-all placeholder:text-neutral-500 text-sm shadow-xl"
              />
              <Search
                size={18}
                className="absolute left-3.5 top-1/2 -translate-y-1/2 text-neutral-400"
              />
              {searchQuery && (
                <button
                  onClick={() => handleSearch('')}
                  className="absolute right-3.5 top-1/2 -translate-y-1/2 text-xs text-neutral-500 hover:text-white"
                >
                  Очистить
                </button>
              )}
            </div>

            {/* Source Filter Switcher */}
            <div className="flex space-x-2">
              {[
                { id: 'all', label: 'Все источники' },
                { id: 'youtube', label: 'YouTube Music' },
                { id: 'soundcloud', label: 'SoundCloud' },
              ].map((s) => (
                <button
                  key={s.id}
                  onClick={() => {
                    const nextSource = s.id as AudioSource | 'all';
                    setSearchSource(nextSource);
                    if (searchQuery) handleSearch(searchQuery, nextSource);
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
                    fileSize={downloadedTracks.find((t) => t.id === track.id)?.fileSize}
                    accentColor={palette.accent}
                    onPlay={() => handlePlayTrack(track, searchResults)}
                    onToggleFavorite={() => handleToggleFavorite(track)}
                    onDownload={() => handleDownloadTrack(track)}
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
            <div className="space-y-3">
              <div className="flex items-center justify-between px-1">
                <h3 className="text-sm font-bold text-white flex items-center space-x-2">
                  <Heart size={16} className="text-rose-500 fill-rose-500" />
                  <span>Любимые треки ({favorites.length})</span>
                </h3>
                {favorites.length > 0 && (
                  <button
                    onClick={() => handlePlayTrack(favorites[0], favorites)}
                    className="text-xs text-rose-400 hover:text-rose-300 font-semibold cursor-pointer"
                  >
                    Слушать все
                  </button>
                )}
              </div>

              <div className="space-y-1 bg-[#1A1818] p-2 rounded-3xl border border-white/5">
                {favorites.length > 0 ? (
                  favorites.map((track) => (
                    <TrackListItem
                      key={`fav_${track.id}`}
                      track={track}
                      isCurrent={currentTrack?.id === track.id}
                      isPlaying={isPlaying}
                      isFavorite={true}
                      isDownloaded={downloadedTrackIds.has(track.id)}
                      fileSize={downloadedTracks.find((t) => t.id === track.id)?.fileSize}
                      accentColor={palette.accent}
                      onPlay={() => handlePlayTrack(track, favorites)}
                      onToggleFavorite={() => handleToggleFavorite(track)}
                      onDownload={() => handleDownloadTrack(track)}
                    />
                  ))
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
                  history.map((track) => (
                    <TrackListItem
                      key={`lib_hist_${track.id}`}
                      track={track}
                      isCurrent={currentTrack?.id === track.id}
                      isPlaying={isPlaying}
                      isFavorite={favoriteTrackIds.has(track.id)}
                      isDownloaded={downloadedTrackIds.has(track.id)}
                      fileSize={downloadedTracks.find((t) => t.id === track.id)?.fileSize}
                      accentColor={palette.accent}
                      onPlay={() => handlePlayTrack(track, history)}
                      onToggleFavorite={() => handleToggleFavorite(track)}
                      onDownload={() => handleDownloadTrack(track)}
                    />
                  ))
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
            <div className="p-4 rounded-3xl bg-gradient-to-r from-emerald-950/40 to-[#1D1B1B] border border-emerald-500/20 flex items-center justify-between shadow-xl">
              <div className="flex items-center space-x-3">
                <div className="w-10 h-10 rounded-2xl bg-emerald-500/20 text-emerald-400 flex items-center justify-center">
                  <DownloadCloud size={20} />
                </div>
                <div>
                  <h3 className="font-bold text-sm text-white">Офлайн треки</h3>
                  <p className="text-[11px] text-neutral-300">
                    Сохранено на устройстве. Доступно без интернета!
                  </p>
                </div>
              </div>

              {downloadedTracks.length > 0 && (
                <button
                  onClick={() => handlePlayTrack(downloadedTracks[0], downloadedTracks)}
                  className="px-3 py-1.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-black font-bold text-xs flex items-center space-x-1.5 shadow transition-all active:scale-95 cursor-pointer"
                >
                  <Play size={13} fill="currentColor" />
                  <span>Слушать всё</span>
                </button>
              )}
            </div>

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
                    fileSize={track.fileSize}
                    accentColor={palette.accent}
                    onPlay={() => handlePlayTrack(track, downloadedTracks)}
                    onToggleFavorite={() => handleToggleFavorite(track)}
                    onDeleteDownload={() => handleDeleteDownload(track.id)}
                  />
                ))
              ) : (
                <div className="py-16 text-center text-neutral-500 space-y-2">
                  <DownloadCloud size={36} className="mx-auto text-neutral-600 opacity-60" />
                  <p className="text-xs font-medium">Нет скачанных треков</p>
                  <p className="text-[11px] text-neutral-600 max-w-xs mx-auto">
                    Лайкайте треки (сердечко) или нажимайте кнопку скачивания в плеере!
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
        onDownloadTrack={() => currentTrack && handleDownloadTrack(currentTrack)}
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
    </div>
  );
};

export default App;
