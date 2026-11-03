import React from 'react';
import {
  ChevronDown,
  Heart,
  Play,
  Pause,
  SkipBack,
  SkipForward,
  Shuffle,
  Repeat,
  Sliders,
  Mic2,
  Download,
  Volume2,
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
  volume: number;
  visualizerData: Uint8Array;
  accentColor: string;
  glowColor: string;
  isPro: boolean;
  onTogglePlay: () => void;
  onNext: () => void;
  onPrev: () => void;
  onSeek: (seconds: number) => void;
  onToggleFavorite: () => void;
  onToggleShuffle: () => void;
  onToggleRepeat: () => void;
  onVolumeChange: (vol: number) => void;
  onOpenLyrics: () => void;
  onOpenEqualizer: () => void;
  onDownloadTrack: () => void;
  onOpenLiePay: () => void;
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
  volume,
  visualizerData,
  accentColor,
  glowColor,
  isPro,
  onTogglePlay,
  onNext,
  onPrev,
  onSeek,
  onToggleFavorite,
  onToggleShuffle,
  onToggleRepeat,
  onVolumeChange,
  onOpenLyrics,
  onOpenEqualizer,
  onDownloadTrack,
  onOpenLiePay,
}) => {
  if (!isOpen || !track) return null;

  const formatTime = (secs: number) => {
    if (isNaN(secs) || secs < 0) return '0:00';
    const m = Math.floor(secs / 60);
    const s = Math.floor(secs % 60);
    return `${m}:${s < 10 ? '0' : ''}${s}`;
  };

  return (
    <div className="fixed inset-0 z-40 bg-[#121010] flex flex-col justify-between overflow-hidden animate-in slide-in-from-bottom duration-300">
      {/* Monet Ambient Glow Backdrop */}
      <div
        className="absolute -top-32 -left-20 right-0 h-[65vh] opacity-40 blur-[110px] pointer-events-none transition-all duration-700"
        style={{
          background: `radial-gradient(circle at center, ${glowColor} 0%, transparent 70%)`,
        }}
      />

      {/* Top Header */}
      <div className="relative z-10 flex items-center justify-between p-4 safe-area-pt">
        <button
          onClick={onClose}
          className="w-10 h-10 rounded-full bg-white/5 hover:bg-white/10 flex items-center justify-center text-white active:scale-95 transition-all cursor-pointer"
        >
          <ChevronDown size={24} />
        </button>

        <div className="text-center overflow-hidden px-2">
          <span className="text-[10px] font-bold tracking-widest uppercase text-neutral-400">
            Сейчас играет
          </span>
          <p className="text-xs font-semibold text-neutral-300 truncate max-w-[200px]">
            {track.album || 'LieMusic'}
          </p>
        </div>

        <button
          onClick={onToggleFavorite}
          className={`w-10 h-10 rounded-full flex items-center justify-center active:scale-90 transition-all cursor-pointer ${
            isFavorite ? 'bg-rose-500/20 text-rose-500' : 'bg-white/5 text-neutral-300 hover:text-white'
          }`}
        >
          <Heart size={20} fill={isFavorite ? 'currentColor' : 'none'} />
        </button>
      </div>

      {/* Center: Large Artwork & Source Badge */}
      <div className="relative z-10 flex-1 flex flex-col items-center justify-center px-6 my-2">
        <div
          className="relative w-64 h-64 sm:w-80 sm:h-80 rounded-3xl overflow-hidden shadow-2xl transition-all duration-500 border border-white/10 group"
          style={{
            boxShadow: `0 20px 60px -15px ${glowColor}`,
          }}
        >
          <img
            src={track.thumbnail}
            alt={track.title}
            className="w-full h-full object-cover"
          />

          {/* Source Badge on Album Art */}
          <div className="absolute top-3 left-3 px-2.5 py-1 rounded-xl bg-black/60 backdrop-blur-md border border-white/10 text-[10px] font-bold tracking-wide uppercase text-white flex items-center space-x-1">
            <span
              className="w-2 h-2 rounded-full"
              style={{
                backgroundColor:
                  track.source === 'youtube'
                    ? '#EF4444'
                    : track.source === 'soundcloud'
                    ? '#F97316'
                    : '#06B6D4',
              }}
            />
            <span>
              {track.source === 'youtube'
                ? 'YouTube Music'
                : track.source === 'soundcloud'
                ? 'SoundCloud'
                : 'Локальный'}
            </span>
          </div>
        </div>

        {/* Live Audio Visualizer Bars */}
        <div className="flex items-end justify-center space-x-1 h-6 mt-4 w-48 opacity-75">
          {Array.from(visualizerData.slice(0, 20)).map((val, i) => (
            <div
              key={i}
              className="w-1.5 rounded-full transition-all duration-75"
              style={{
                height: `${Math.max(3, (val / 255) * 24)}px`,
                backgroundColor: accentColor,
              }}
            />
          ))}
        </div>
      </div>

      {/* Bottom Player Section */}
      <div className="relative z-10 bg-[#161414]/90 backdrop-blur-2xl border-t border-white/5 rounded-t-[32px] p-6 pb-8 safe-area-pb">
        {/* Track Title and Quick Feature Icons */}
        <div className="flex items-center justify-between mb-4">
          <div className="overflow-hidden flex-1 mr-3">
            <h2 className="text-xl font-bold text-white tracking-tight truncate">
              {track.title}
            </h2>
            <p className="text-sm text-neutral-400 truncate mt-0.5 font-medium">
              {track.artist}
            </p>
          </div>

          <div className="flex items-center space-x-2 shrink-0">
            {/* Lyrics Button */}
            <button
              onClick={onOpenLyrics}
              className="p-2.5 rounded-2xl bg-white/5 hover:bg-white/10 text-neutral-300 hover:text-white transition-all active:scale-95 cursor-pointer relative"
              title="Текст песни (LRCLIB)"
            >
              <Mic2 size={18} />
              {!isPro && (
                <span className="absolute -top-1 -right-1 w-2.5 h-2.5 rounded-full bg-amber-400" />
              )}
            </button>

            {/* Equalizer Button */}
            <button
              onClick={onOpenEqualizer}
              className="p-2.5 rounded-2xl bg-white/5 hover:bg-white/10 text-neutral-300 hover:text-white transition-all active:scale-95 cursor-pointer relative"
              title="Эквалайзер"
            >
              <Sliders size={18} />
              {!isPro && (
                <span className="absolute -top-1 -right-1 w-2.5 h-2.5 rounded-full bg-amber-400" />
              )}
            </button>

            {/* Download Button */}
            <button
              onClick={() => {
                if (!isPro) {
                  onOpenLiePay();
                } else {
                  onDownloadTrack();
                }
              }}
              className="p-2.5 rounded-2xl bg-white/5 hover:bg-white/10 text-neutral-300 hover:text-white transition-all active:scale-95 cursor-pointer relative"
              title={track.isDownloaded ? 'Скачано' : 'Скачать трек в офлайн'}
            >
              <Download size={18} className={track.isDownloaded ? 'text-emerald-400' : ''} />
              {!isPro && (
                <span className="absolute -top-1 -right-1 w-2.5 h-2.5 rounded-full bg-amber-400" />
              )}
            </button>
          </div>
        </div>

        {/* Progress Slider */}
        <div className="space-y-1.5 my-3">
          <input
            type="range"
            min="0"
            max={duration || 100}
            step="1"
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
        <div className="flex items-center justify-between mt-3 px-2">
          <button
            onClick={onToggleShuffle}
            className={`p-2 rounded-full transition-colors cursor-pointer ${
              isShuffle ? 'text-white' : 'text-neutral-500 hover:text-neutral-300'
            }`}
            style={{ color: isShuffle ? accentColor : undefined }}
          >
            <Shuffle size={20} />
          </button>

          <button
            onClick={onPrev}
            className="p-2.5 rounded-full text-neutral-200 hover:text-white active:scale-90 transition-transform cursor-pointer"
          >
            <SkipBack size={26} />
          </button>

          <button
            onClick={onTogglePlay}
            className="w-16 h-16 rounded-full flex items-center justify-center shadow-2xl active:scale-95 transition-transform cursor-pointer"
            style={{
              backgroundColor: accentColor,
              color: '#151313',
              boxShadow: `0 8px 30px ${glowColor}`,
            }}
          >
            {isPlaying ? (
              <Pause size={28} fill="#151313" />
            ) : (
              <Play size={28} fill="#151313" className="translate-x-0.5" />
            )}
          </button>

          <button
            onClick={onNext}
            className="p-2.5 rounded-full text-neutral-200 hover:text-white active:scale-90 transition-transform cursor-pointer"
          >
            <SkipForward size={26} />
          </button>

          <button
            onClick={onToggleRepeat}
            className={`p-2 rounded-full transition-colors cursor-pointer ${
              isRepeat ? 'text-white' : 'text-neutral-500 hover:text-neutral-300'
            }`}
            style={{ color: isRepeat ? accentColor : undefined }}
          >
            <Repeat size={20} />
          </button>
        </div>

        {/* Volume slider on Desktop / Tablet */}
        <div className="mt-4 pt-3 border-t border-white/5 flex items-center space-x-3 text-neutral-400">
          <Volume2 size={16} />
          <input
            type="range"
            min="0"
            max="1"
            step="0.01"
            value={volume}
            onChange={(e) => onVolumeChange(Number(e.target.value))}
            className="w-full h-1 bg-neutral-800 rounded-lg appearance-none cursor-pointer"
            style={{ accentColor: accentColor }}
          />
        </div>
      </div>
    </div>
  );
};
