import React, { useState, useEffect, useMemo, useCallback } from 'react';
import {
  Search,
  Sparkles,
  DownloadCloud,
  Heart,
  Clock,
  Disc3,
  Play,
  Zap,
} from 'lucide-react';
import { Track, UserProfile, EqualizerPreset, AudioSource } from './types';
import { extractPaletteFromImage, ExtractedPalette } from './utils/colorExtractor';
import { audioEngine } from './services/audio';
import { searchYouTubeTracks, resolveStreamUrl, FEATURED_TRENDING_TRACKS } from './services/youtube';
import { searchSoundCloudTracks } from './services/soundcloud';
import { loadUserProfile, saveUserProfile } from './services/profile';
import { BottomNav, TabType } from './components/BottomNav';
import { MiniPlayer } from './components/MiniPlayer';
import { FullPlayer } from './components/FullPlayer';
import { EqualizerModal } from './components/EqualizerModal';
import { LiePayModal } from './components/LiePayModal';
import { ProfileModal } from './components/ProfileModal';
import { TrackListItem } from './components/TrackListItem';
import { invoke } from '@tauri-apps/api/core';

export const App: React.FC = () => {
  // Global Profile & Plan
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const isPro = profile?.plan === 'lifetime';

  // Navigation Tabs
  const [activeTab, setActiveTab] = useState<TabType>('home');

  // Playback State
  const [currentTrack, setCurrentTrack] = useState<Track | null>(null);
  const [isPlaying, setIsPlaying] = useState<boolean>(false);
  const [currentTime, setCurrentTime] = useState<number>(0);
  const [duration, setDuration] = useState<number>(0);
  const [volume, setVolume] = useState<number>(0.85);
  const [isShuffle, setIsShuffle] = useState<boolean>(false);
  const [isRepeat, setIsRepeat] = useState<boolean>(false);
  const [visualizerData, setVisualizerData] = useState<Uint8Array>(new Uint8Array(32));

  // Dynamic Material You Palette
  const [palette, setPalette] = useState<ExtractedPalette>({
    dominant: 'rgb(245, 220, 223)',
    dominantHex: '#F5DCDF',
    glow: 'rgba(245, 220, 223, 0.25)',
    accent: '#F5DCDF',
    surfaceTint: 'rgba(245, 220, 223, 0.08)',
    contrastText: '#151313',
  });

  // Lists & Collections
  const [queue, setQueue] = useState<Track[]>(FEATURED_TRENDING_TRACKS);
  const [favorites, setFavorites] = useState<Track[]>([]);
  const [history, setHistory] = useState<Track[]>([]);
  const [downloadedTracks, setDownloadedTracks] = useState<Track[]>([]);
  const [downloadingIds, setDownloadingIds] = useState<Set<string>>(new Set());

  // Reactive ID Sets for O(1) state checks across all lists
  const downloadedTrackIds = useMemo(
    () => new Set(downloadedTracks.map((t) => t.id)),
    [downloadedTracks]
  );
  const favoriteTrackIds = useMemo(
    () => new Set(favorites.map((t) => t.id)),
    [favorites]
  );

  // Search State
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [searchSource, setSearchSource] = useState<AudioSource | 'all'>('all');
  const [searchResults, setSearchResults] = useState<Track[]>([]);
  const [isSearching, setIsSearching] = useState<boolean>(false);

  // Modals
  const [isFullPlayerOpen, setIsFullPlayerOpen] = useState<boolean>(false);
  const [isEqualizerOpen, setIsEqualizerOpen] = useState<boolean>(false);
  const [isLiePayOpen, setIsLiePayOpen] = useState<boolean>(false);
  const [isProfileOpen, setIsProfileOpen] = useState<boolean>(false);

  // Equalizer Settings
  const [equalizerBands, setEqualizerBands] = useState<number[]>([0, 0, 0, 0, 0, 0, 0, 0, 0, 0]);
  const [bassBoost, setBassBoost] = useState<number>(0);

  // Load Profile and local collections on mount
  useEffect(() => {
    loadUserProfile().then((p) => {
      setProfile(p);
    });

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

  // Sync favorites & history to local storage
  useEffect(() => {
    localStorage.setItem('liemusic_favorites', JSON.stringify(favorites));
  }, [favorites]);

  useEffect(() => {
    if (!profile?.privacy.stealthMode && profile?.privacy.showListeningHistory) {
      localStorage.setItem('liemusic_history', JSON.stringify(history));
    }
  }, [history, profile]);

  useEffect(() => {
    localStorage.setItem('liemusic_downloads', JSON.stringify(downloadedTracks));
  }, [downloadedTracks]);

  // Audio Playback Handlers
  const handlePlayTrack = useCallback(
    async (track: Track, newQueue?: Track[]) => {
      if (newQueue) {
        setQueue(newQueue);
      } else if (!queue.some((t) => t.id === track.id)) {
        setQueue((prev) => [track, ...prev]);
      }

      setCurrentTrack(track);

      // Extract Material You color palette
      if (track.thumbnail) {
        extractPaletteFromImage(track.thumbnail).then((pal) => {
          setPalette(pal);
        });
      }

      // Add to history if not stealth mode
      if (!profile?.privacy.stealthMode && profile?.privacy.showListeningHistory) {
        setHistory((prev) => [track, ...prev.filter((t) => t.id !== track.id)].slice(0, 50));
      }

      // Resolve audio stream URL (or fetch offline audio if downloaded)
      try {
        const streamUrl = await resolveStreamUrl(track);
        await audioEngine.playTrack(track, streamUrl);
      } catch (err) {
        console.error('[LieMusic] Error playing track:', err);
      }
    },
    [queue, profile]
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

  // Sync action handlers for Android system notification
  useEffect(() => {
    audioEngine.setActionHandlers({
      onNext: handleNextTrack,
      onPrev: handlePrevTrack,
    });
  }, [handleNextTrack, handlePrevTrack]);

  // Clean Audio Engine Subscriptions with cleanup
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

  // Visualizer Animation Loop (only active when playing to save CPU/battery)
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

  // Real offline download
  const handleDownloadTrack = async (track: Track) => {
    if (!isPro) {
      setIsLiePayOpen(true);
      return;
    }

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
    // Updating downloadedTracks immediately updates downloadedTrackIds everywhere
    setDownloadedTracks((prev) => prev.filter((t) => t.id !== trackId));
  };

  // Toggle favorite + AUTO-DOWNLOAD if liked!
  const handleToggleFavorite = (track: Track) => {
    const isCurrentlyFav = favoriteTrackIds.has(track.id);

    if (isCurrentlyFav) {
      setFavorites((prev) => prev.filter((t) => t.id !== track.id));
    } else {
      setFavorites((prev) => [track, ...prev]);
      // Auto-download on like for offline listening
      if (isPro) {
        handleDownloadTrack(track);
      }
    }
  };

  // Search logic
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
            className="w-9 h-9 rounded-2xl flex items-center justify-center font-black text-xs shadow-lg transition-transform active:scale-95"
            style={{
              backgroundColor: palette.accent,
              color: '#151313',
            }}
          >
            LM
          </div>
          <div>
            <div className="flex items-center space-x-1.5">
              <h1 className="text-base font-bold tracking-tight text-white">LieMusic</h1>
              <span className="text-[9px] uppercase px-1.5 py-0.5 rounded-md font-mono bg-white/10 text-neutral-400 font-semibold">
                0-Server
              </span>
            </div>
            <p className="text-[11px] text-neutral-400">Свободный стриминг музыки</p>
          </div>
        </div>

        {/* Right Header: Pro badge & Profile avatar */}
        <div className="flex items-center space-x-2">
          {isPro ? (
            <div className="flex items-center space-x-1 text-xs font-bold text-amber-400 bg-amber-400/10 border border-amber-400/20 px-2.5 py-1 rounded-xl">
              <Sparkles size={13} />
              <span>Pro</span>
            </div>
          ) : (
            <button
              onClick={() => setIsLiePayOpen(true)}
              className="text-xs font-bold px-2.5 py-1 rounded-xl bg-amber-400 text-black hover:bg-amber-300 transition-all active:scale-95 shadow cursor-pointer flex items-center space-x-1"
            >
              <Sparkles size={12} />
              <span>249 ₽</span>
            </button>
          )}

          <button
            onClick={() => setIsProfileOpen(true)}
            className="w-9 h-9 rounded-2xl bg-white/5 hover:bg-white/10 flex items-center justify-center text-lg active:scale-95 transition-all border border-white/5 cursor-pointer"
            title="Профиль"
          >
            {profile?.avatar || '🦊'}
          </button>
        </div>
      </header>

      {/* Main Content View with generous bottom padding for bottom dock */}
      <main className="flex-1 overflow-y-auto px-4 py-4 pb-44">
        {/* TAB 1: HOME (Clean Minimalist Hub) */}
        {activeTab === 'home' && (
          <div className="max-w-xl mx-auto space-y-5">
            {/* Quick Search Launcher */}
            <div
              onClick={() => setActiveTab('search')}
              className="flex items-center space-x-3 px-4 py-3 bg-[#1D1B1B] hover:bg-[#222020] border border-white/10 rounded-2xl cursor-pointer transition-all active:scale-[0.99] shadow-lg"
            >
              <Search size={18} className="text-neutral-400" />
              <span className="text-sm text-neutral-400">Найти трек, артиста или альбом...</span>
            </div>

            {/* Quick Vibe Chips */}
            <div className="flex space-x-2 overflow-x-auto no-scrollbar py-1">
              {[
                { label: '🎮 ZXC & Dota', q: 'zxc' },
                { label: '🚗 Drift Phonk', q: 'phonk drift' },
                { label: '🎧 Lo-Fi & Chill', q: 'lofi chill' },
                { label: '🌙 Ночной драйв', q: 'night drive phonk' },
                { label: '🎸 Rock', q: 'alternative rock' },
                { label: '⚡ Electronic', q: 'electronic bass' },
              ].map((chip) => (
                <button
                  key={chip.label}
                  onClick={() => {
                    setActiveTab('search');
                    handleSearch(chip.q);
                  }}
                  className="text-xs px-3.5 py-2 rounded-xl bg-white/5 hover:bg-white/10 text-neutral-300 hover:text-white border border-white/5 shrink-0 transition-all active:scale-95 cursor-pointer font-medium"
                >
                  {chip.label}
                </button>
              ))}
            </div>

            {/* Quick Access Tiles: Favorites & Offline */}
            <div className="grid grid-cols-2 gap-3">
              <div
                onClick={() => setActiveTab('library')}
                className="p-4 rounded-2xl bg-gradient-to-br from-rose-950/30 to-[#1A1818] border border-rose-500/20 cursor-pointer hover:border-rose-500/40 transition-all active:scale-98"
              >
                <div className="flex items-center justify-between mb-2">
                  <Heart size={20} className="text-rose-400" fill="currentColor" />
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
                  <DownloadCloud size={20} className="text-emerald-400" />
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

            {/* Recently Played Real History */}
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
                  history.slice(0, 5).map((track) => (
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
                      Воспользуйтесь поиском выше, чтобы найти любимую музыку
                    </p>
                  </div>
                )}
              </div>
            </div>

            {/* Quick Starter Pack (if queue exists) */}
            <div className="space-y-3 pt-2">
              <div className="flex items-center justify-between px-1">
                <span className="text-xs font-bold text-neutral-400 uppercase tracking-wider flex items-center space-x-1.5">
                  <Zap size={14} className="text-amber-400" />
                  <span>Рекомендации в один клик</span>
                </span>
              </div>

              <div className="space-y-1 bg-[#1A1818] p-2 rounded-3xl border border-white/5">
                {FEATURED_TRENDING_TRACKS.slice(0, 4).map((track) => (
                  <TrackListItem
                    key={`rec_${track.id}`}
                    track={track}
                    isCurrent={currentTrack?.id === track.id}
                    isPlaying={isPlaying}
                    isFavorite={favoriteTrackIds.has(track.id)}
                    isDownloaded={downloadedTrackIds.has(track.id)}
                    fileSize={downloadedTracks.find((t) => t.id === track.id)?.fileSize}
                    accentColor={palette.accent}
                    onPlay={() => handlePlayTrack(track, FEATURED_TRENDING_TRACKS)}
                    onToggleFavorite={() => handleToggleFavorite(track)}
                    onDownload={() => handleDownloadTrack(track)}
                  />
                ))}
              </div>
            </div>
          </div>
        )}

        {/* TAB 2: SEARCH */}
        {activeTab === 'search' && (
          <div className="max-w-xl mx-auto space-y-4">
            {/* Search Input Bar */}
            <div className="relative">
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => {
                  setSearchQuery(e.target.value);
                  handleSearch(e.target.value);
                }}
                placeholder="Ищи на YouTube Music и SoundCloud..."
                className="w-full bg-[#1D1B1B] text-white placeholder-neutral-500 text-sm pl-11 pr-4 py-3.5 rounded-2xl border border-white/10 focus:border-white/25 focus:outline-none transition-all shadow-inner"
                autoFocus
              />
              <Search
                size={18}
                className="absolute left-4 top-1/2 -translate-y-1/2 text-neutral-400"
              />
            </div>

            {/* Source Filters */}
            <div className="flex space-x-2 overflow-x-auto no-scrollbar py-1">
              {[
                { id: 'all', label: 'Все источники' },
                { id: 'youtube', label: 'YouTube Music' },
                { id: 'soundcloud', label: 'SoundCloud' },
              ].map((src) => (
                <button
                  key={src.id}
                  onClick={() => {
                    setSearchSource(src.id as any);
                    if (searchQuery.trim()) {
                      handleSearch(searchQuery, src.id as any);
                    }
                  }}
                  className={`text-xs px-3.5 py-1.5 rounded-xl font-medium transition-all shrink-0 cursor-pointer ${
                    searchSource === src.id
                      ? 'bg-white text-black font-bold shadow'
                      : 'bg-white/5 text-neutral-400 hover:text-white'
                  }`}
                >
                  {src.label}
                </button>
              ))}
            </div>

            {/* Quick Suggestion Chips if no query */}
            {!searchQuery.trim() && (
              <div className="space-y-2 pt-2">
                <span className="text-[11px] font-bold text-neutral-400 uppercase tracking-wider px-1">
                  Популярные запросы:
                </span>
                <div className="flex flex-wrap gap-2">
                  {[
                    'zxc',
                    'zxcursed blessed',
                    'Miyagi',
                    'FE!N',
                    'Starboy',
                    'Phonk remix',
                    'Lofi girl',
                    'Arctic Monkeys',
                  ].map((sug) => (
                    <button
                      key={sug}
                      onClick={() => handleSearch(sug)}
                      className="text-xs px-3 py-1.5 rounded-xl bg-white/5 hover:bg-white/10 text-neutral-300 border border-white/5 transition-all active:scale-95 cursor-pointer"
                    >
                      {sug}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Search Results */}
            <div className="space-y-1 bg-[#1A1818] p-2 rounded-3xl border border-white/5">
              {isSearching ? (
                <div className="py-12 flex flex-col items-center justify-center space-y-2 text-neutral-400">
                  <Disc3 size={32} className="animate-spin text-neutral-500" />
                  <p className="text-xs font-medium">Поиск треков на открытых CDN...</p>
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
              ) : searchQuery.trim() ? (
                <div className="py-12 text-center text-neutral-500">
                  <p className="text-xs">Ничего не найдено по запросу «{searchQuery}»</p>
                </div>
              ) : null}
            </div>
          </div>
        )}

        {/* TAB 3: LIBRARY */}
        {activeTab === 'library' && (
          <div className="max-w-xl mx-auto space-y-6">
            {/* Favorites Card */}
            <div className="space-y-3">
              <div className="flex items-center justify-between px-1">
                <span className="text-xs font-bold text-neutral-400 uppercase tracking-wider flex items-center space-x-1.5">
                  <Heart size={14} className="text-rose-400" />
                  <span>Любимые треки ({favorites.length})</span>
                </span>
                {favorites.length > 0 && (
                  <button
                    onClick={() => handlePlayTrack(favorites[0], favorites)}
                    className="text-xs text-rose-400 font-medium hover:underline"
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
                  <div className="py-8 text-center text-neutral-500 space-y-1">
                    <Heart size={28} className="mx-auto opacity-30" />
                    <p className="text-xs">Пока нет любимых треков. Нажмите сердечко на песне!</p>
                  </div>
                )}
              </div>
            </div>

            {/* History Card (respects privacy) */}
            {profile?.privacy.showListeningHistory && (
              <div className="space-y-3">
                <div className="flex items-center justify-between px-1">
                  <span className="text-xs font-bold text-neutral-400 uppercase tracking-wider flex items-center space-x-1.5">
                    <Clock size={14} />
                    <span>История прослушиваний ({history.length})</span>
                  </span>
                </div>

                <div className="space-y-1 bg-[#1A1818] p-2 rounded-3xl border border-white/5">
                  {history.length > 0 ? (
                    history.map((track) => (
                      <TrackListItem
                        key={`hist_${track.id}`}
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
                    <div className="py-8 text-center text-neutral-500">
                      <p className="text-xs">История пуста</p>
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        )}

        {/* TAB 4: OFFLINE */}
        {activeTab === 'offline' && (
          <div className="max-w-xl mx-auto space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-lg font-bold text-white flex items-center space-x-2">
                  <DownloadCloud size={20} className="text-emerald-400" />
                  <span>Офлайн треки ({downloadedTracks.length})</span>
                </h2>
                <p className="text-xs text-neutral-400 mt-0.5">
                  Сохранено на устройстве. Работает 100% без интернета.
                </p>
              </div>

              {downloadedTracks.length > 0 && (
                <button
                  onClick={() => handlePlayTrack(downloadedTracks[0], downloadedTracks)}
                  className="flex items-center space-x-1.5 px-3 py-1.5 rounded-xl bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 text-xs font-semibold hover:bg-emerald-500/30 active:scale-95 transition-all cursor-pointer shadow-sm"
                >
                  <Play size={13} fill="currentColor" />
                  <span>Слушать всё</span>
                </button>
              )}
            </div>

            {/* Downloaded Tracks List with Delete Button (tight, no empty box) */}
            <div className="space-y-1 bg-[#1A1818] p-2 rounded-3xl border border-white/5">
              {downloadedTracks.length > 0 ? (
                downloadedTracks.map((track) => (
                  <TrackListItem
                    key={`dl_${track.id}`}
                    track={track}
                    isCurrent={currentTrack?.id === track.id}
                    isPlaying={isPlaying}
                    isFavorite={favoriteTrackIds.has(track.id)}
                    isDownloaded={true}
                    fileSize={track.fileSize}
                    accentColor={palette.accent}
                    onPlay={() => handlePlayTrack(track, downloadedTracks)}
                    onToggleFavorite={() => handleToggleFavorite(track)}
                    onDownload={() => {}}
                    onDeleteDownload={() => handleDeleteDownload(track.id)}
                  />
                ))
              ) : (
                <div className="py-12 text-center text-neutral-500 space-y-2">
                  <DownloadCloud size={32} className="mx-auto opacity-30" />
                  <p className="text-xs">Нет скачанных треков.</p>
                  <p className="text-[11px] text-neutral-600">
                    Лайкайте треки (сердечко) или нажимайте кнопку скачивания в плеере!
                  </p>
                </div>
              )}
            </div>
          </div>
        )}

        {/* TAB 5: PROFILE */}
        {activeTab === 'profile' && profile && (
          <div className="max-w-xl mx-auto space-y-5">
            <div className="p-6 rounded-3xl bg-[#1D1B1B] border border-white/5 flex items-center space-x-4 shadow-xl">
              <div className="w-16 h-16 rounded-3xl bg-white/5 border border-white/10 flex items-center justify-center text-3xl">
                {profile.avatar}
              </div>
              <div className="flex-1">
                <div className="flex items-center space-x-2">
                  <h2 className="text-lg font-bold text-white">{profile.nickname}</h2>
                  {isPro && (
                    <span className="text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded-full bg-amber-400/20 text-amber-400 border border-amber-400/30">
                      Lifetime Pro
                    </span>
                  )}
                </div>
                <p className="text-xs text-neutral-400 font-mono mt-0.5">ID: {profile.id}</p>
                <p className="text-[11px] text-neutral-500 mt-1">Клиент с {profile.createdAt}</p>
              </div>
            </div>

            {/* Lifetime LiePay banner if not pro */}
            {!isPro && (
              <button
                onClick={() => setIsLiePayOpen(true)}
                className="w-full p-4 rounded-3xl bg-gradient-to-r from-amber-500/20 via-orange-500/20 to-amber-500/10 border border-amber-500/30 flex items-center justify-between text-left hover:border-amber-500/50 transition-all cursor-pointer shadow-lg active:scale-98"
              >
                <div>
                  <h4 className="font-bold text-sm text-amber-400 flex items-center space-x-1.5">
                    <Sparkles size={16} />
                    <span>Разблокировать LieMusic Pro</span>
                  </h4>
                  <p className="text-xs text-neutral-300 mt-0.5">
                    Офлайн скачивание, 10-полосный эквалайзер и Bass Boost навсегда
                  </p>
                </div>
                <span className="text-xs font-black bg-amber-400 text-black px-2 py-0.5 rounded-lg">
                  249 ₽
                </span>
              </button>
            )}
          </div>
        )}
      </main>

      {/* Bottom Floating Player + Navigation Bar Container: Guarantees MiniPlayer never slides under BottomNav */}
      <div className="fixed bottom-0 left-0 right-0 z-30 pointer-events-none">
        {/* Floating MiniPlayer */}
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

        {/* Bottom Navigation */}
        <div className="pointer-events-auto">
          <BottomNav
            activeTab={activeTab}
            onChangeTab={setActiveTab}
            accentColor={palette.accent}
          />
        </div>
      </div>

      {/* Fullscreen Player Sheet (Without lyrics button) */}
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
        isPro={isPro}
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
        onOpenLiePay={() => setIsLiePayOpen(true)}
      />

      {/* Modals */}
      <EqualizerModal
        isOpen={isEqualizerOpen}
        onClose={() => setIsEqualizerOpen(false)}
        isPro={isPro}
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
        onOpenLiePay={() => {
          setIsEqualizerOpen(false);
          setIsLiePayOpen(true);
        }}
      />

      <LiePayModal
        isOpen={isLiePayOpen}
        onClose={() => setIsLiePayOpen(false)}
        accentColor={palette.accent}
        onActivated={() => {
          if (profile) {
            setProfile({ ...profile, plan: 'lifetime' });
          }
        }}
      />

      {profile && (
        <ProfileModal
          isOpen={isProfileOpen}
          onClose={() => setIsProfileOpen(false)}
          profile={profile}
          accentColor={palette.accent}
          onUpdateProfile={(updated) => {
            setProfile(updated);
            saveUserProfile(updated);
          }}
          onOpenLiePay={() => setIsLiePayOpen(true)}
        />
      )}
    </div>
  );
};
export default App;
