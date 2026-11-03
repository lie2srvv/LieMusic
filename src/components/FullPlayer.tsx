import React from 'react';
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
import { Track } from '../types';

interface FullPlayerProps {
  isOpen: boolean;
  onClose: () => void;
  track: Track | null;
  isPlaying: boolean;
  currentTime: number;
  duration: number;
  isFavorite: boolean;
  isShuffle: boolean;
  isRepeat: boolean;
  isDownloading?: boolean;
  volume: number;
  visualizerData: Uint8Array;
  accentColor: string;
  glowColor: string;
  onTogglePlay: () => void;
  onNext: () => void;
  onPrev: () => void;
  onSeek: (seconds: number) => void;
  onToggleFavorite: () => void;
  onToggleShuffle: () => void;
  onToggleRepeat: () => void;
  onVolumeChange: (volume: number) => void;
  onOpenEqualizer: () => void;
  onDownloadTrack: () => void;
}

export const FullPlayer: React.FC<FullPlayerProps> = ({
  isOpen,
  onClose,
  track,
  isPlaying,
  currentTime,
  duration,
  isFavorite,
  isShuffle,
  isRepeat,
  isDownloading,
  visualizerData,
  accentColor,
  glowColor,
  onTogglePlay,
  onNext,
  onPrev,
  onSeek,
  onToggleFavorite,
  onToggleShuffle,
  onToggleRepeat,
  onOpenEqualizer,
  onDownloadTrack,
}) => {
  if (!isOpen || !track) return null;

  const formatTime = (seconds: number) => {
    if (isNaN(seconds) || seconds < 0) return '0:00';
    const m = Math.floor(seconds / 60);
    const s = Math.floor(seconds % 60);
    return `${m}:${s < 10 ? '0' : ''}${s}`;
  };

  return (
    <div className="fixed inset-0 z-50 bg-[#121111] flex flex-col justify-between overflow-hidden animate-in fade-in slide-in-from-bottom-8 duration-300">
      {/* Dynamic Ambient Background Glow */}
      <div
        className="absolute -top-32 left-1/2 -translate-x-1/2 w-96 h-96 rounded-full blur-[120px] pointer-events-none opacity-40 transition-all duration-700"
        style={{ backgroundColor: glowColor }}
      />

      {/* Header */}
      <div className="flex items-center justify-between px-6 pt-12 pb-4 z-10 shrink-0">
        <button
          onClick={onClose}
          className="w-10 h-10 rounded-full bg-white/5 border border-white/5 flex items-center justify-center text-neutral-300 hover:text-white transition-all active:scale-90 cursor-pointer"
        >
          <ChevronDown size={22} />
        </button>

        <div className="text-center">
          <p className="text-[10px] font-bold uppercase tracking-widest text-neutral-400">
            СЕЙЧАС ИГРАЕТ
          </p>
          <p className="text-xs font-semibold text-neutral-200 mt-0.5">
            {track.album || (track.source === 'youtube' ? 'YouTube Music' : 'SoundCloud')}
          </p>
        </div>

        <button
          onClick={onToggleFavorite}
          className={`w-10 h-10 rounded-full border flex items-center justify-center transition-all active:scale-90 cursor-pointer ${
            isFavorite
              ? 'bg-rose-500/20 text-rose-500 border-rose-500/30'
              : 'bg-white/5 border-white/5 text-neutral-300 hover:text-white'
          }`}
        >
          <Heart
            size={18}
            fill={isFavorite ? 'currentColor' : 'none'}
          />
        </button>
      </div>

      {/* Artwork Canvas with subtle glow */}
      <div className="flex-1 flex flex-col items-center justify-center px-8 min-h-0 py-2">
        <div
          className="relative w-64 h-64 sm:w-72 sm:h-72 max-w-[70vw] max-h-[35vh] aspect-square rounded-3xl overflow-hidden shadow-2xl transition-all duration-500"
          style={{
            boxShadow: `0 20px 40px -10px ${glowColor}`,
          }}
        >
          {track.thumbnail ? (
            <img
              src={track.thumbnail}
              alt={track.title}
              className="w-full h-full object-cover"
            />
          ) : (
            <div className="w-full h-full bg-neutral-900 flex items-center justify-center">
              <Disc3 size={64} className="text-neutral-700 animate-spin-slow" />
            </div>
          )}

          <div className="absolute top-3 left-3 px-2 py-0.5 rounded-full bg-black/60 backdrop-blur-md border border-white/10 text-[9px] font-bold text-neutral-300 uppercase tracking-wider flex items-center space-x-1">
            <span
              className="w-1.5 h-1.5 rounded-full"
              style={{ backgroundColor: accentColor }}
            />
            <span>{track.source}</span>
          </div>
        </div>

        {/* Realtime Audio Visualizer Bars */}
        <div className="flex items-center justify-center space-x-1 h-8 mt-5 px-4 w-full max-w-xs">
          {Array.from({ length: 24 }).map((_, i) => {
            const val = visualizerData[i] || 0;
            const barHeight = isPlaying ? Math.max(3, (val / 255) * 28) : 3;

            return (
              <div
                key={i}
                className="w-1 rounded-full transition-all duration-75"
                style={{
                  height: `${barHeight}px`,
                  backgroundColor: accentColor,
                  opacity: isPlaying ? 0.8 : 0.2,
                }}
              />
            );
          })}
        </div>
      </div>

      {/* Track Metadata & Quick Controls */}
      <div className="px-7 space-y-3 pb-8 shrink-0">
        <div className="flex items-center justify-between">
          <div className="min-w-0 pr-4">
            <h2 className="text-xl font-bold text-white truncate tracking-tight">
              {track.title}
            </h2>
            <p className="text-sm font-medium text-neutral-400 truncate mt-0.5">
              {track.artist}
            </p>
          </div>

          <div className="flex items-center space-x-2 shrink-0">
            <button
              onClick={onOpenEqualizer}
              className="w-10 h-10 rounded-2xl bg-white/5 hover:bg-white/10 border border-white/5 flex items-center justify-center text-neutral-300 hover:text-white transition-all active:scale-90 cursor-pointer"
              title="Эквалайзер"
            >
              <Sliders size={18} />
            </button>

            <button
              onClick={onDownloadTrack}
              disabled={isDownloading}
              className={`w-10 h-10 rounded-2xl border flex items-center justify-center transition-all active:scale-90 cursor-pointer ${
                isDownloading
                  ? 'bg-amber-500/20 text-amber-400 border-amber-500/30'
                  : track.isDownloaded
                  ? 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30'
                  : 'bg-white/5 hover:bg-white/10 border-white/5 text-neutral-300 hover:text-white'
              }`}
              title={isDownloading ? 'Скачивание трека...' : track.isDownloaded ? 'Скачано офлайн' : 'Скачать трек'}
            >
              {isDownloading ? (
                <Loader2 size={18} className="animate-spin text-amber-400" />
              ) : track.isDownloaded ? (
                <Check size={18} />
              ) : (
                <Download size={18} />
              )}
            </button>
          </div>
        </div>

        {/* Progress Bar & Seek Scrub */}
        <div className="space-y-1.5 pt-1">
          <input
            type="range"
            min="0"
            max={duration || 100}
            value={currentTime}
            onChange={(e) => onSeek(Number(e.target.value))}
            className="w-full h-1.5 bg-neutral-800 rounded-lg appearance-none cursor-pointer"
            style={{ accentColor: accentColor }}
          />
          <div className="flex justify-between text-[11px] font-mono text-neutral-400">
            <span>{formatTime(currentTime)}</span>
            <span>-{formatTime(Math.max(0, duration - currentTime))}</span>
          </div>
        </div>

        {/* Playback Controls Row */}
        <div className="flex items-center justify-between pt-2 px-2">
          <button
            onClick={onToggleShuffle}
            className={`relative p-2.5 rounded-full transition-all active:scale-90 cursor-pointer flex flex-col items-center justify-center ${
              isShuffle
                ? 'text-white bg-white/20 shadow-[0_0_15px_rgba(255,255,255,0.4)] ring-1 ring-white/50'
                : 'text-neutral-500 hover:text-neutral-300'
            }`}
            title="Перемешать"
          >
            <Shuffle size={20} className={isShuffle ? 'stroke-[2.5]' : ''} />
            {isShuffle && (
              <span className="absolute -bottom-1 w-1.5 h-1.5 rounded-full bg-white shadow-[0_0_6px_#fff]" />
            )}
          </button>

          <button
            onClick={onPrev}
            className="p-3 text-neutral-200 hover:text-white transition-transform active:scale-90 cursor-pointer"
            title="Предыдущий"
          >
            <SkipBack size={28} />
          </button>

          <button
            onClick={onTogglePlay}
            className="w-16 h-16 rounded-full flex items-center justify-center shadow-xl transition-transform active:scale-90 cursor-pointer"
            style={{
              backgroundColor: '#FFFFFF',
              color: '#151313',
              boxShadow: `0 8px 30px -4px ${glowColor}`,
            }}
            title={isPlaying ? 'Пауза' : 'Играть'}
          >
            {isPlaying ? (
              <Pause size={28} fill="#151313" />
            ) : (
              <Play size={28} fill="#151313" className="translate-x-0.5" />
            )}
          </button>

          <button
            onClick={onNext}
            className="p-3 text-neutral-200 hover:text-white transition-transform active:scale-90 cursor-pointer"
            title="Следующий"
          >
            <SkipForward size={28} />
          </button>

          <button
            onClick={onToggleRepeat}
            className={`relative p-2.5 rounded-full transition-all active:scale-90 cursor-pointer flex flex-col items-center justify-center ${
              isRepeat
                ? 'text-white bg-white/20 shadow-[0_0_15px_rgba(255,255,255,0.4)] ring-1 ring-white/50'
                : 'text-neutral-500 hover:text-neutral-300'
            }`}
            title="Повтор трека"
          >
            <Repeat size={20} className={isRepeat ? 'stroke-[2.5]' : ''} />
            {isRepeat && (
              <span className="absolute -bottom-1 w-1.5 h-1.5 rounded-full bg-white shadow-[0_0_6px_#fff]" />
            )}
          </button>
        </div>
      </div>
    </div>
  );
};
