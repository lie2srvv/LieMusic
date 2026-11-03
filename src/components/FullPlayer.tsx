import React, { useState, useEffect } from 'react';
import {
  ChevronDown,
  Play,
  Pause,
  SkipForward,
  SkipBack,
  Shuffle,
  Repeat,
  Heart,
  Sliders,
  Download,
  Check,
  Disc3,
  Loader2,
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { Track } from '../types';
import { Language, translations } from '../i18n/translations';
import { getHighResThumbnail } from '../utils/thumbnail';
import { audioEngine } from '../services/audio';

interface FullPlayerProps {
  isOpen: boolean;
  language?: Language;
  onClose: () => void;
  track: Track | null;
  isPlaying: boolean;
  currentTime: number;
  duration: number;
  accentColor: string;
  glowColor: string;
  isFavorite: boolean;
  isShuffle: boolean;
  isRepeat: boolean;
  isDownloading?: boolean;
  volume?: number;
  onVolumeChange?: (v: number) => void;
  onTogglePlay: () => void;
  onPrev: () => void;
  onNext: () => void;
  onSeek: (seconds: number) => void;
  onToggleFavorite: () => void;
  onToggleShuffle: () => void;
  onToggleRepeat: () => void;
  onOpenEqualizer: () => void;
  onDownloadTrack: () => void;
}

export const FullPlayer: React.FC<FullPlayerProps> = ({
  isOpen,
  language = 'ru',
  onClose,
  track,
  isPlaying,
  currentTime,
  duration,
  accentColor,
  glowColor,
  isFavorite,
  isShuffle,
  isRepeat,
  isDownloading,
  onTogglePlay,
  onPrev,
  onNext,
  onSeek,
  onToggleFavorite,
  onToggleShuffle,
  onToggleRepeat,
  onOpenEqualizer,
  onDownloadTrack,
}) => {
  const t = translations[language];

  // Self-contained visualizer loop: only runs when FullPlayer is open & audio is playing
  const [visualizerData, setVisualizerData] = useState<Uint8Array>(() => new Uint8Array(24));

  useEffect(() => {
    if (!isOpen || !isPlaying) return;
    let rafId: number;
    const loop = () => {
      setVisualizerData(audioEngine.getVisualizerData().slice(0, 24));
      rafId = requestAnimationFrame(loop);
    };
    rafId = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(rafId);
  }, [isOpen, isPlaying]);

  const formatTime = (secs: number) => {
    if (isNaN(secs)) return '0:00';
    const m = Math.floor(secs / 60);
    const s = Math.floor(secs % 60);
    return `${m}:${s < 10 ? '0' : ''}${s}`;
  };

  return (
    <AnimatePresence>
      {isOpen && track && (
        <motion.div
          key="full-player"
          initial={{ y: '100%', opacity: 0.6 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: '100%', opacity: 0.2 }}
          transition={{ type: 'spring', stiffness: 350, damping: 32 }}
          drag="y"
          dragConstraints={{ top: 0 }}
          dragElastic={{ top: 0, bottom: 0.45 }}
          onDragEnd={(_, info) => {
            if (info.offset.y > 120 || info.velocity.y > 450) {
              onClose();
            }
          }}
          className="fixed inset-0 z-50 flex flex-col justify-between overflow-hidden touch-none"
          style={{
            backgroundColor: '#151313',
            backgroundImage: `radial-gradient(circle at 50% 35%, ${glowColor} 0%, transparent 70%)`,
          }}
        >
          {/* Top Bar: Pull down handle & Navigation with safe-area spacing */}
          <div className="pt-[max(3.5rem,env(safe-area-inset-top,3.5rem))]">
            <div className="flex justify-center pb-2">
              <div className="w-10 h-1 bg-white/20 rounded-full" />
            </div>

            <div className="flex items-center justify-between px-6 py-2">
              <motion.button
                type="button"
                onClick={onClose}
                whileTap={{ scale: 0.85 }}
                className="w-10 h-10 rounded-full bg-white/5 hover:bg-white/10 flex items-center justify-center text-neutral-300 hover:text-white transition-colors cursor-pointer"
                title={t.close}
              >
                <ChevronDown size={24} />
              </motion.button>

              <div className="text-center">
                <span className="text-[11px] font-semibold text-neutral-400 uppercase tracking-widest block">
                  {t.nowPlaying}
                </span>
                <span className="text-xs font-medium text-white/90">
                  {track.album || track.source}
                </span>
              </div>

              <motion.button
                type="button"
                onClick={onToggleFavorite}
                whileTap={{ scale: 1.25 }}
                className={`w-10 h-10 rounded-full flex items-center justify-center transition-all cursor-pointer ${
                  isFavorite
                    ? 'bg-rose-500/20 text-rose-500 shadow-[0_0_15px_rgba(244,63,94,0.3)]'
                    : 'bg-white/5 text-neutral-400 hover:text-white'
                }`}
                title={isFavorite ? t.inFavorites : t.addToFavorites}
              >
                <Heart size={20} fill={isFavorite ? 'currentColor' : 'none'} />
              </motion.button>
            </div>
          </div>

          {/* Central Artwork & Visualizer */}
          <div className="flex-1 flex flex-col items-center justify-center px-8 min-h-0">
            <motion.div
              animate={{
                scale: isPlaying ? 1 : 0.93,
              }}
              transition={{
                type: 'spring',
                stiffness: 280,
                damping: 22,
              }}
              className="relative w-full max-w-[250px] sm:max-w-[280px] aspect-square rounded-3xl overflow-hidden shadow-[0_20px_50px_rgba(0,0,0,0.85)] border border-white/10 shrink-0"
              style={{
                boxShadow: isPlaying ? `0 24px 65px -10px ${glowColor}` : '0 20px 50px rgba(0,0,0,0.85)',
              }}
            >
              {track.thumbnail ? (
                <img
                  src={getHighResThumbnail(track.thumbnail)}
                  alt={track.title}
                  className="w-full h-full object-cover"
                />
              ) : (
                <div className="w-full h-full bg-neutral-900 flex items-center justify-center">
                  <Disc3 size={80} className="text-neutral-700 animate-spin" />
                </div>
              )}
            </motion.div>

            {/* Realtime Audio Visualizer Bars */}
            <div className="flex items-center justify-center space-x-1.5 h-7 mt-4 px-4 w-full max-w-xs">
              {Array.from({ length: 24 }).map((_, i) => {
                const val = visualizerData[i] || 0;
                const barHeight = isPlaying ? Math.max(3, (val / 255) * 24) : 3;

                return (
                  <div
                    key={i}
                    className="w-1 rounded-full transition-all duration-75"
                    style={{
                      height: `${barHeight}px`,
                      backgroundColor: accentColor,
                      opacity: isPlaying ? 0.85 : 0.2,
                    }}
                  />
                );
              })}
            </div>
          </div>

          {/* Track Metadata & Controls with elevated bottom padding */}
          <div className="px-7 pt-2 pb-[max(5.5rem,env(safe-area-inset-bottom,5.5rem))] space-y-5 shrink-0">
            {/* Track Title, Artist & Quick Actions */}
            <div className="flex items-center justify-between">
              <div className="min-w-0 pr-4 flex-1">
                <h2 className="text-2xl font-bold text-white truncate tracking-tight">
                  {track.title}
                </h2>
                <p className="text-base font-medium text-neutral-400 truncate mt-1">
                  {track.artist}
                </p>
              </div>

              <div className="flex items-center space-x-2.5 shrink-0">
                <motion.button
                  type="button"
                  onClick={onOpenEqualizer}
                  whileTap={{ scale: 0.88 }}
                  className="w-11 h-11 rounded-2xl bg-white/5 hover:bg-white/10 border border-white/10 flex items-center justify-center text-neutral-300 hover:text-white transition-colors cursor-pointer shadow-sm"
                  title={t.equalizer}
                >
                  <Sliders size={19} />
                </motion.button>

                <motion.button
                  type="button"
                  onClick={onDownloadTrack}
                  disabled={isDownloading}
                  whileTap={{ scale: 0.88 }}
                  className={`w-11 h-11 rounded-2xl border flex items-center justify-center transition-all cursor-pointer shadow-sm ${
                    isDownloading
                      ? 'bg-amber-500/20 text-amber-400 border-amber-500/30'
                      : track.isDownloaded
                      ? 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30 shadow-[0_0_15px_rgba(16,185,129,0.2)]'
                      : 'bg-white/5 hover:bg-white/10 border-white/10 text-neutral-300 hover:text-white'
                  }`}
                  title={
                    isDownloading
                      ? t.downloading
                      : track.isDownloaded
                      ? t.downloadedOffline
                      : t.downloadTrack
                  }
                >
                  {isDownloading ? (
                    <Loader2 size={19} className="animate-spin text-amber-400" />
                  ) : track.isDownloaded ? (
                    <Check size={19} className="stroke-[2.5]" />
                  ) : (
                    <Download size={19} />
                  )}
                </motion.button>
              </div>
            </div>

            {/* Progress Bar & Seek Scrub */}
            <div className="space-y-2">
              <input
                type="range"
                min="0"
                max={duration || 100}
                value={currentTime}
                onChange={(e) => onSeek(Number(e.target.value))}
                className="w-full h-1.5 bg-neutral-800 rounded-lg appearance-none cursor-pointer"
                style={{ accentColor: accentColor }}
              />
              <div className="flex justify-between text-xs font-mono text-neutral-400 pt-0.5 px-0.5">
                <span>{formatTime(currentTime)}</span>
                <span>-{formatTime(Math.max(0, duration - currentTime))}</span>
              </div>
            </div>

            {/* Playback Controls Row */}
            <div className="flex items-center justify-between pt-1 px-1">
              <motion.button
                type="button"
                onClick={onToggleShuffle}
                whileTap={{ scale: 0.85 }}
                className={`relative p-3 rounded-full transition-colors cursor-pointer flex items-center justify-center ${
                  isShuffle ? 'text-white' : 'text-neutral-500 hover:text-white'
                }`}
                title={t.shuffle}
              >
                <Shuffle size={22} className={isShuffle ? 'stroke-[2.5]' : ''} />
                {isShuffle && (
                  <span className="absolute bottom-1 w-1.5 h-1.5 rounded-full bg-white shadow-[0_0_6px_#fff]" />
                )}
              </motion.button>

              <motion.button
                type="button"
                onClick={onPrev}
                whileTap={{ scale: 0.85, x: -3 }}
                className="p-3 text-neutral-200 hover:text-white transition-colors cursor-pointer"
                title={t.prev}
              >
                <SkipBack size={30} />
              </motion.button>

              <motion.button
                type="button"
                onClick={onTogglePlay}
                whileTap={{ scale: 0.9 }}
                className="w-18 h-18 rounded-full flex items-center justify-center shadow-2xl transition-all cursor-pointer"
                style={{
                  backgroundColor: '#FFFFFF',
                  color: '#151313',
                  boxShadow: `0 12px 35px -4px ${glowColor}`,
                }}
                title={isPlaying ? t.pause : t.play}
              >
                {isPlaying ? (
                  <Pause size={30} fill="#151313" />
                ) : (
                  <Play size={30} fill="#151313" className="translate-x-0.5" />
                )}
              </motion.button>

              <motion.button
                type="button"
                onClick={onNext}
                whileTap={{ scale: 0.85, x: 3 }}
                className="p-3 text-neutral-200 hover:text-white transition-colors cursor-pointer"
                title={t.next}
              >
                <SkipForward size={30} />
              </motion.button>

              <motion.button
                type="button"
                onClick={onToggleRepeat}
                whileTap={{ scale: 0.85 }}
                className={`relative p-3 rounded-full transition-colors cursor-pointer flex items-center justify-center ${
                  isRepeat ? 'text-white' : 'text-neutral-500 hover:text-white'
                }`}
                title={t.repeat}
              >
                <Repeat size={22} className={isRepeat ? 'stroke-[2.5]' : ''} />
                {isRepeat && (
                  <span className="absolute bottom-1 w-1.5 h-1.5 rounded-full bg-white shadow-[0_0_6px_#fff]" />
                )}
              </motion.button>
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};
