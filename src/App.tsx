import React, { useState, useEffect, useRef } from 'react';
import {
  Search,
  Sparkles,
  Flame,
  Radio,
  DownloadCloud,
  Heart,
  Clock,
  Disc3,
} from 'lucide-react';
import { Track, UserProfile, EqualizerPreset, LyricsLine, AudioSource } from './types';
import { extractPaletteFromImage, ExtractedPalette } from './utils/colorExtractor';
import { audioEngine } from './services/audio';
import { searchYouTubeTracks, resolveStreamUrl, FEATURED_TRENDING_TRACKS } from './services/youtube';
import { searchSoundCloudTracks, FEATURED_SOUNDCLOUD_TRACKS } from './services/soundcloud';
import { fetchLyrics } from './services/lyrics';
import { loadUserProfile, saveUserProfile } from './services/profile';
import { BottomNav, TabType } from './components/BottomNav';
import { MiniPlayer } from './components/MiniPlayer';
import { FullPlayer } from './components/FullPlayer';
import { EqualizerModal } from './components/EqualizerModal';
import { LyricsModal } from './components/LyricsModal';
import { LiePayModal } from './components/LiePayModal';
import { ProfileModal } from './components/ProfileModal';
import { TrackListItem } from './components/TrackListItem';

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

  // Search State
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [searchSource, setSearchSource] = useState<AudioSource | 'all'>('all');
  const [searchResults, setSearchResults] = useState<Track[]>([]);
  const [isSearching, setIsSearching] = useState<boolean>(false);

  // Modals
  const [isFullPlayerOpen, setIsFullPlayerOpen] = useState<boolean>(false);
  const [isEqualizerOpen, setIsEqualizerOpen] = useState<boolean>(false);
  const [isLyricsOpen, setIsLyricsOpen] = useState<boolean>(false);
  const [isLiePayOpen, setIsLiePayOpen] = useState<boolean>(false);
  const [isProfileOpen, setIsProfileOpen] = useState<boolean>(false);

  // Equalizer Settings
  const [equalizerBands, setEqualizerBands] = useState<number[]>([0, 0, 0, 0, 0, 0, 0, 0, 0, 0]);
  const [bassBoost, setBassBoost] = useState<number>(0);

  // Lyrics State
  const [syncedLyrics, setSyncedLyrics] = useState<LyricsLine[]>([]);
  const [plainLyrics, setPlainLyrics] = useState<string>('');

  const visualizerRafRef = useRef<number | null>(null);

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

  // Audio Engine Event Subscriptions
  useEffect(() => {
    audioEngine.onPlayStateChange((playing) => setIsPlaying(playing));
    audioEngine.onTimeUpdate((curr, dur) => {
      setCurrentTime(curr);
      setDuration(dur);
    });
    audioEngine.onTrackEnd(() => handleNextTrack());

    audioEngine.setActionHandlers({
      onNext: () => handleNextTrack(),
      onPrev: () => handlePrevTrack(),
    });
  }, [currentTrack, queue, isShuffle, isRepeat]);

  // Visualizer Animation Loop
  useEffect(() => {
    const loop = () => {
      if (isPlaying) {
        setVisualizerData(audioEngine.getVisualizerData());
      }
      visualizerRafRef.current = requestAnimationFrame(loop);
    };
    loop();
    return () => {
      if (visualizerRafRef.current) cancelAnimationFrame(visualizerRafRef.current);
    };
  }, [isPlaying]);

  // Play a Track
  const handlePlayTrack = async (track: Track, newQueue?: Track[]) => {
    if (newQueue) {
      setQueue(newQueue);
    }

    setCurrentTrack(track);

    // Extract dynamic Material You palette
    if (track.thumbnail) {
      extractPaletteFromImage(track.thumbnail).then((pal) => setPalette(pal));
    }

    // Add to history if not stealth mode
    if (!profile?.privacy.stealthMode && profile?.privacy.showListeningHistory) {
      setHistory((prev) => [track, ...prev.filter((t) => t.id !== track.id)].slice(0, 50));
    }

    // Resolve audio stream URL
    try {
      const streamUrl = await resolveStreamUrl(track);
      await audioEngine.playTrack(track, streamUrl);
    } catch (err) {
      console.error('[LieMusic] Error playing track:', err);
    }

    // Fetch Lyrics in background
    fetchLyrics(track.title, track.artist, track.duration).then((res) => {
      if (res) {
        setSyncedLyrics(res.synced);
        setPlainLyrics(res.plain);
      } else {
        setSyncedLyrics([]);
        setPlainLyrics('');
      }
    });
  };

  const handleTogglePlay = () => {
    if (!currentTrack && queue.length > 0) {
      handlePlayTrack(queue[0]);
    } else {
      audioEngine.togglePlayPause();
    }
  };

  const handleNextTrack = () => {
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
  };

  const handlePrevTrack = () => {
    if (!currentTrack || queue.length === 0) return;
    if (currentTime > 3) {
      audioEngine.seek(0);
      return;
    }
    const currentIndex = queue.findIndex((t) => t.id === currentTrack.id);
    const prevIndex = (currentIndex - 1 + queue.length) % queue.length;
    handlePlayTrack(queue[prevIndex]);
  };

  const handleToggleFavorite = (track: Track) => {
    setFavorites((prev) => {
      const exists = prev.some((t) => t.id === track.id);
      if (exists) {
        return prev.filter((t) => t.id !== track.id);
      } else {
        return [track, ...prev];
      }
    });
  };

  const handleDownloadTrack = (track: Track) => {
    if (!isPro) {
      setIsLiePayOpen(true);
      return;
    }
    setDownloadedTracks((prev) => {
      if (prev.some((t) => t.id === track.id)) return prev;
      return [{ ...track, isDownloaded: true }, ...prev];
    });
  };

  // Search logic
  const handleSearch = async (query: string) => {
    setSearchQuery(query);
    if (!query.trim()) {
      setSearchResults([]);
      return;
    }

    setIsSearching(true);
    try {
      let results: Track[] = [];
      if (searchSource === 'youtube' || searchSource === 'all') {
        const yt = await searchYouTubeTracks(query);
        results = [...results, ...yt];
      }
      if (searchSource === 'soundcloud' || searchSource === 'all') {
        const sc = await searchSoundCloudTracks(query);
        results = [...results, ...sc];
      }
      setSearchResults(results);
    } catch {
      setSearchResults([]);
    } finally {
      setIsSearching(false);
    }
  };

  const isCurrentFavorite = currentTrack
    ? favorites.some((t) => t.id === currentTrack.id)
    : false;

  return (
    <div className="h-screen w-screen flex flex-col bg-[#151313] text-[#E7E1E1] overflow-hidden font-sans">
      {/* Top Header / Status */}
      <header className="px-4 py-3.5 flex items-center justify-between border-b border-white/5 bg-[#181616]/80 backdrop-blur-md shrink-0 safe-area-pt">
        <div className="flex items-center space-x-2.5">
          <div
            className="w-9 h-9 rounded-2xl flex items-center justify-center font-black text-sm tracking-tighter shadow-md"
            style={{ backgroundColor: palette.accent, color: '#151313' }}
          >
            LM
          </div>
          <div>
            <h1 className="text-base font-extrabold text-white tracking-tight flex items-center space-x-1.5">
              <span>LieMusic</span>
              <span className="text-[10px] font-mono px-1.5 py-0.2 rounded bg-white/10 text-neutral-400">
                0-Server
              </span>
            </h1>
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

      {/* Main Content View */}
      <main className="flex-1 overflow-y-auto px-4 py-4 pb-32">
        {/* TAB 1: HOME */}
        {activeTab === 'home' && (
          <div className="max-w-xl mx-auto space-y-6">
            {/* Quick Hero Banner */}
            <div
              className="relative overflow-hidden p-5 rounded-3xl border border-white/10 shadow-xl"
              style={{
                background: `linear-gradient(135deg, ${palette.surfaceTint} 0%, rgba(29, 27, 27, 0.95) 100%)`,
              }}
            >
              <div className="relative z-10 flex justify-between items-start">
                <div>
                  <span className="text-[10px] font-bold uppercase tracking-wider text-neutral-400">
                    Экосистема Lie
                  </span>
                  <h2 className="text-xl font-bold text-white mt-0.5">
                    Привет, {profile?.nickname || 'Слушатель'}!
                  </h2>
                  <p className="text-xs text-neutral-400 mt-1 max-w-xs">
                    Миллионы треков без рекламы. 0 личных данных, прямой стриминг с открытых CDN.
                  </p>
                </div>

                <div
                  className="w-12 h-12 rounded-2xl flex items-center justify-center text-2xl shadow-lg shrink-0"
                  style={{ backgroundColor: `${palette.accent}20` }}
                >
                  🎧
                </div>
              </div>

              {/* Quick Action Badges */}
              <div className="flex flex-wrap gap-2 mt-4 pt-3 border-t border-white/10">
                <button
                  onClick={() => handlePlayTrack(FEATURED_TRENDING_TRACKS[0], FEATURED_TRENDING_TRACKS)}
                  className="text-xs font-semibold px-3 py-1.5 rounded-xl bg-white/10 hover:bg-white/20 text-white flex items-center space-x-1.5 transition-all active:scale-95 cursor-pointer"
                >
                  <Flame size={14} className="text-rose-400" />
                  <span>Тренды YouTube</span>
                </button>

                <button
                  onClick={() => handlePlayTrack(FEATURED_SOUNDCLOUD_TRACKS[0], FEATURED_SOUNDCLOUD_TRACKS)}
                  className="text-xs font-semibold px-3 py-1.5 rounded-xl bg-white/10 hover:bg-white/20 text-white flex items-center space-x-1.5 transition-all active:scale-95 cursor-pointer"
                >
                  <Radio size={14} className="text-amber-400" />
                  <span>SoundCloud Ремиксы</span>
                </button>
              </div>
            </div>

            {/* Section: Trending on YouTube Music */}
            <div>
              <div className="flex items-center justify-between mb-3 px-1">
                <h3 className="text-base font-bold text-white flex items-center space-x-2">
                  <Flame size={18} className="text-rose-500" />
                  <span>Чарты и новинки (YouTube Music)</span>
                </h3>
              </div>

              <div className="space-y-1 bg-[#1A1818] p-2 rounded-3xl border border-white/5">
                {FEATURED_TRENDING_TRACKS.map((track) => (
                  <TrackListItem
                    key={track.id}
                    track={track}
                    isCurrent={currentTrack?.id === track.id}
                    isPlaying={isPlaying}
                    isFavorite={favorites.some((t) => t.id === track.id)}
                    accentColor={palette.accent}
                    onPlay={() => handlePlayTrack(track, FEATURED_TRENDING_TRACKS)}
                    onToggleFavorite={() => handleToggleFavorite(track)}
                    onDownload={() => handleDownloadTrack(track)}
                  />
                ))}
              </div>
            </div>

            {/* Section: SoundCloud Originals & Phonk */}
            <div>
              <div className="flex items-center justify-between mb-3 px-1">
                <h3 className="text-base font-bold text-white flex items-center space-x-2">
                  <Radio size={18} className="text-amber-500" />
                  <span>SoundCloud & Phonk Ремиксы</span>
                </h3>
              </div>

              <div className="space-y-1 bg-[#1A1818] p-2 rounded-3xl border border-white/5">
                {FEATURED_SOUNDCLOUD_TRACKS.map((track) => (
                  <TrackListItem
                    key={track.id}
                    track={track}
                    isCurrent={currentTrack?.id === track.id}
                    isPlaying={isPlaying}
                    isFavorite={favorites.some((t) => t.id === track.id)}
                    accentColor={palette.accent}
                    onPlay={() => handlePlayTrack(track, FEATURED_SOUNDCLOUD_TRACKS)}
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
                placeholder="Трек, артист, альбом или ремикс..."
                value={searchQuery}
                onChange={(e) => handleSearch(e.target.value)}
                autoFocus
                className="w-full bg-[#1D1B1B] border border-white/10 rounded-2xl pl-11 pr-4 py-3.5 text-sm text-white placeholder-neutral-500 focus:outline-none focus:border-white/30 transition-all shadow-lg"
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
                  onClick={() => setSearchSource(src.id as any)}
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

            {/* Search Results */}
            <div className="space-y-1 bg-[#1A1818] p-2 rounded-3xl border border-white/5 min-h-[300px]">
              {isSearching ? (
                <div className="py-16 text-center text-neutral-400 space-y-2">
                  <Disc3 size={32} className="animate-spin mx-auto text-neutral-500" />
                  <p className="text-xs">Поиск по мировым базам...</p>
                </div>
              ) : searchResults.length > 0 ? (
                searchResults.map((track) => (
                  <TrackListItem
                    key={track.id}
                    track={track}
                    isCurrent={currentTrack?.id === track.id}
                    isPlaying={isPlaying}
                    isFavorite={favorites.some((t) => t.id === track.id)}
                    accentColor={palette.accent}
                    onPlay={() => handlePlayTrack(track, searchResults)}
                    onToggleFavorite={() => handleToggleFavorite(track)}
                    onDownload={() => handleDownloadTrack(track)}
                  />
                ))
              ) : searchQuery ? (
                <div className="py-16 text-center text-neutral-500">
                  <p className="text-sm">Ничего не найдено по запросу «{searchQuery}»</p>
                </div>
              ) : (
                <div className="py-12 text-center text-neutral-500 space-y-2">
                  <Search size={32} className="mx-auto opacity-30" />
                  <p className="text-xs">Введите название песни или исполнителя</p>
                </div>
              )}
            </div>
          </div>
        )}

        {/* TAB 3: LIBRARY */}
        {activeTab === 'library' && (
          <div className="max-w-xl mx-auto space-y-5">
            <h2 className="text-lg font-bold text-white">Моя медиатека</h2>

            {/* Favorites Card */}
            <div className="space-y-3">
              <div className="flex items-center justify-between px-1">
                <span className="text-xs font-bold text-neutral-400 uppercase tracking-wider flex items-center space-x-1.5">
                  <Heart size={14} className="text-rose-500" />
                  <span>Любимые треки ({favorites.length})</span>
                </span>
              </div>

              <div className="space-y-1 bg-[#1A1818] p-2 rounded-3xl border border-white/5">
                {favorites.length > 0 ? (
                  favorites.map((track) => (
                    <TrackListItem
                      key={track.id}
                      track={track}
                      isCurrent={currentTrack?.id === track.id}
                      isPlaying={isPlaying}
                      isFavorite={true}
                      accentColor={palette.accent}
                      onPlay={() => handlePlayTrack(track, favorites)}
                      onToggleFavorite={() => handleToggleFavorite(track)}
                      onDownload={() => handleDownloadTrack(track)}
                    />
                  ))
                ) : (
                  <div className="py-10 text-center text-neutral-500 space-y-1">
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
                        isFavorite={favorites.some((t) => t.id === track.id)}
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
          <div className="max-w-xl mx-auto space-y-5">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-lg font-bold text-white flex items-center space-x-2">
                  <DownloadCloud size={20} className="text-emerald-400" />
                  <span>Офлайн треки</span>
                </h2>
                <p className="text-xs text-neutral-400 mt-0.5">
                  Слушайте любимую музыку без интернета в самолете или поездках
                </p>
              </div>

              {!isPro && (
                <button
                  onClick={() => setIsLiePayOpen(true)}
                  className="text-xs font-bold px-3 py-1.5 rounded-xl bg-amber-400 text-black hover:bg-amber-300 transition-all active:scale-95 cursor-pointer shadow-md"
                >
                  Pro (249 ₽)
                </button>
              )}
            </div>

            {/* Downloaded Tracks List */}
            <div className="space-y-1 bg-[#1A1818] p-2 rounded-3xl border border-white/5 min-h-[250px]">
              {downloadedTracks.length > 0 ? (
                downloadedTracks.map((track) => (
                  <TrackListItem
                    key={`dl_${track.id}`}
                    track={track}
                    isCurrent={currentTrack?.id === track.id}
                    isPlaying={isPlaying}
                    isFavorite={favorites.some((t) => t.id === track.id)}
                    accentColor={palette.accent}
                    onPlay={() => handlePlayTrack(track, downloadedTracks)}
                    onToggleFavorite={() => handleToggleFavorite(track)}
                    onDownload={() => {}}
                  />
                ))
              ) : (
                <div className="py-16 text-center text-neutral-500 space-y-2">
                  <DownloadCloud size={36} className="mx-auto opacity-30 text-emerald-400" />
                  <p className="text-sm font-medium">Нет скачанных треков</p>
                  <p className="text-xs text-neutral-500 max-w-xs mx-auto">
                    {isPro
                      ? 'Нажмите на иконку загрузки на любом треке, чтобы слушать его офлайн.'
                      : 'Офлайн-режим входит в LieMusic Pro (249 ₽ навсегда).'}
                  </p>
                </div>
              )}
            </div>
          </div>
        )}

        {/* TAB 5: PROFILE */}
        {activeTab === 'profile' && profile && (
          <div className="max-w-xl mx-auto space-y-4">
            <div className="p-5 rounded-3xl bg-[#1A1818] border border-white/5 flex items-center space-x-4">
              <div
                className="w-16 h-16 rounded-3xl flex items-center justify-center text-3xl shadow-lg shrink-0"
                style={{ backgroundColor: `${palette.accent}25` }}
              >
                {profile.avatar}
              </div>
              <div className="overflow-hidden flex-1">
                <div className="flex items-center space-x-2">
                  <h3 className="text-base font-bold text-white truncate">{profile.nickname}</h3>
                  {isPro && (
                    <span className="text-[10px] font-extrabold px-1.5 py-0.5 rounded bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 uppercase">
                      Pro
                    </span>
                  )}
                </div>
                <p className="text-xs text-neutral-400 font-mono mt-0.5 truncate">
                  Device ID: {profile.id}
                </p>
              </div>
            </div>

            <button
              onClick={() => setIsProfileOpen(true)}
              className="w-full py-3 px-4 rounded-2xl bg-[#211F1F] hover:bg-neutral-800 border border-white/5 text-sm font-semibold text-white flex items-center justify-between transition-all active:scale-98 cursor-pointer"
            >
              <span>Настройки профиля и приватности</span>
              <span className="text-xs text-neutral-400">Открыть →</span>
            </button>

            {!isPro && (
              <button
                onClick={() => setIsLiePayOpen(true)}
                className="w-full py-3 px-4 rounded-2xl bg-gradient-to-r from-amber-500/20 to-rose-500/20 hover:from-amber-500/30 hover:to-rose-500/30 border border-amber-500/30 text-sm font-bold text-amber-300 flex items-center justify-between transition-all active:scale-98 cursor-pointer"
              >
                <div className="flex items-center space-x-2">
                  <Sparkles size={16} />
                  <span>Купить LieMusic Pro навсегда</span>
                </div>
                <span className="text-xs font-black bg-amber-400 text-black px-2 py-0.5 rounded-lg">
                  249 ₽
                </span>
              </button>
            )}
          </div>
        )}
      </main>

      {/* Mini Player */}
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

      {/* Bottom Navigation */}
      <BottomNav
        activeTab={activeTab}
        onChangeTab={setActiveTab}
        accentColor={palette.accent}
      />

      {/* Fullscreen Player Sheet */}
      <FullPlayer
        isOpen={isFullPlayerOpen}
        onClose={() => setIsFullPlayerOpen(false)}
        track={currentTrack}
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
        onOpenLyrics={() => setIsLyricsOpen(true)}
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

      <LyricsModal
        isOpen={isLyricsOpen}
        onClose={() => setIsLyricsOpen(false)}
        trackTitle={currentTrack?.title || ''}
        trackArtist={currentTrack?.artist || ''}
        syncedLyrics={syncedLyrics}
        plainLyrics={plainLyrics}
        currentTimeMs={currentTime * 1000}
        onSeekToMs={(ms) => audioEngine.seek(ms / 1000)}
        accentColor={palette.accent}
        isPro={isPro}
        onOpenLiePay={() => {
          setIsLyricsOpen(false);
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
