import React, { useState, useEffect, useRef } from 'react';
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
import { SquigglySlider } from './SquigglySlider';

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
  accentColor: _accentColor,
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

  // Touch gesture tracker for clean swipe-down dismiss
  const touchStartY = useRef<number | null>(null);
  const touchStartX = useRef<number | null>(null);

  const handleSwipeStart = (e: React.TouchEvent) => {
    touchStartY.current = e.touches[0].clientY;
    touchStartX.current = e.touches[0].clientX;
  };

  const handleSwipeEnd = (e: React.TouchEvent) => {
    if (touchStartY.current === null) return;
    const deltaY = e.changedTouches[0].clientY - touchStartY.current;
    const deltaX = Math.abs(e.changedTouches[0].clientX - (touchStartX.current || 0));
    touchStartY.current = null;
    touchStartX.current = null;
    if (deltaY > 50 && deltaY > deltaX) {
      onClose();
    }
  };

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
          dragConstraints={{ top: 0, bottom: 0 }}
          dragElastic={{ top: 0, bottom: 0.55 }}
          dragSnapToOrigin
          onDragEnd={(_, info) => {
            if (info.offset.y > 75 || info.velocity.y > 200) {
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
          <div
            onTouchStart={handleSwipeStart}
            onTouchEnd={handleSwipeEnd}
            className="pt-[max(3.5rem,env(safe-area-inset-top,3.5rem))]"
          >
            <div
              onClick={onClose}
              className="flex justify-center pb-2 cursor-pointer active:opacity-60"
              title={t.close}
            >
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
                <span className="text-xs font-bold text-white capitalize">
                  {track.source === 'youtube'
                    ? 'YouTube Music'
                    : track.source === 'local'
                    ? t.localFile
                    : 'SoundCloud'}
                </span>
              </div>

              <motion.button
                type="button"
                onClick={onToggleFavorite}
                whileTap={{ scale: 1.3 }}
                className="w-10 h-10 rounded-full bg-white/5 hover:bg-white/10 flex items-center justify-center transition-colors cursor-pointer"
                title={isFavorite ? t.inFavorites : t.addToFavorites}
              >
                <Heart
                  size={22}
                  className={
                    isFavorite
                      ? 'text-rose-500 fill-rose-500'
                      : 'text-neutral-400 hover:text-white'
                  }
                />
              </motion.button>
            </div>
          </div>

          {/* Central Artwork & Visualizer */}
          <div
            onTouchStart={handleSwipeStart}
            onTouchEnd={handleSwipeEnd}
            className="flex-1 flex flex-col items-center justify-center px-8 min-h-0 py-2 cursor-grab active:cursor-grabbing"
          >
            <div className="relative w-full max-w-[310px] aspect-square rounded-[36px] overflow-hidden shadow-2xl bg-neutral-900 border border-white/10 group">
              {track.thumbnail ? (
                <img
                  src={getHighResThumbnail(track.thumbnail)}
                  alt={track.title}
                  className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105"
                />
              ) : (
                <div className="w-full h-full flex items-center justify-center text-neutral-600 bg-[#1A1818]">
                  <Disc3 size={84} className={isPlaying ? 'animate-spin' : ''} />
                </div>
              )}
            </div>

            {/* Live Audio Visualizer Bars */}
            <div className="h-6 flex items-end justify-center space-x-1.5 mt-5">
              {Array.from(visualizerData).map((val, i) => {
                const heightPct = isPlaying ? Math.max(12, (val / 255) * 100) : 15;
                return (
                  <div
                    key={i}
                    className="w-1 rounded-full transition-all duration-75"
                    style={{
                      height: `${heightPct}%`,
                      backgroundColor: isPlaying ? '#FFFFFF' : 'rgba(255,255,255,0.2)',
                    }}
                  />
                );
              })}
            </div>
          </div>

          {/* Bottom Controls Panel */}
          <div className="px-6 pb-[max(2.5rem,env(safe-area-inset-bottom,2.5rem))] space-y-4">
            {/* Title & Metadata with Equalizer & Download buttons */}
            <div className="flex items-center justify-between">
              <div className="overflow-hidden flex-1 mr-3">
                <h2 className="text-xl font-bold text-white tracking-tight truncate">
                  {track.title}
                </h2>
                <div className="flex items-center space-x-2 mt-0.5">
                  <p className="text-sm text-neutral-400 truncate font-medium">
                    {track.artist}
                  </p>
                  {track.album && (
                    <>
                      <span className="text-neutral-600 text-xs">•</span>
                      <p className="text-xs text-neutral-500 truncate max-w-[120px]">
                        {track.album}
                      </p>
                    </>
                  )}
                </div>
              </div>

              {/* Action buttons next to track title */}
              <div className="flex items-center space-x-2 shrink-0">
                {/* 10-Band Equalizer Button */}
                <motion.button
                  type="button"
                  onClick={onOpenEqualizer}
                  whileTap={{ scale: 0.88 }}
                  className="w-10 h-10 rounded-2xl bg-white/5 hover:bg-white/10 border border-white/10 flex items-center justify-center text-neutral-300 hover:text-white transition-colors cursor-pointer shadow-sm"
                  title={t.equalizer}
                >
                  <Sliders size={18} />
                </motion.button>

                {/* Offline Download Button */}
                <motion.button
                  type="button"
                  onClick={onDownloadTrack}
                  disabled={track.isDownloaded || isDownloading}
                  whileTap={{ scale: 0.88 }}
                  className={`w-10 h-10 rounded-2xl border flex items-center justify-center transition-all cursor-pointer shadow-sm ${
                    track.isDownloaded
                      ? 'bg-emerald-500/15 border-emerald-500/30 text-emerald-400'
                      : isDownloading
                      ? 'bg-white/5 border-white/10 text-neutral-400'
                      : 'bg-white/5 border-white/10 text-neutral-300 hover:text-white hover:bg-white/10'
                  }`}
                  title={
                    track.isDownloaded
                      ? t.downloadedOffline
                      : isDownloading
                      ? t.downloading
                      : t.downloadTrack
                  }
                >
                  {track.isDownloaded ? (
                    <Check size={18} className="stroke-[2.5]" />
                  ) : isDownloading ? (
                    <Loader2 size={18} className="animate-spin" />
                  ) : (
                    <Download size={18} />
                  )}
                </motion.button>
              </div>
            </div>

            {/* Android 13/14 MD3 Squiggly Wave Scrubber */}
            <div className="space-y-1">
              <SquigglySlider
                currentTime={currentTime}
                duration={duration}
                isPlaying={isPlaying}
                onSeek={onSeek}
              />

              {/* Timestamp Labels */}
              <div className="flex justify-between text-xs font-mono text-neutral-400 px-0.5 select-none">
                <span>{formatTime(currentTime)}</span>
                <span className="text-neutral-500">
                  -{formatTime(Math.max(0, duration - currentTime))}
                </span>
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
                  <Play size={30} fill="#151313" />
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
