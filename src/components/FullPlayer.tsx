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
  Mic2,
  Sliders,
  Download,
  Check,
  Disc3,
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
  onVolumeChange: (volume: number) => void;
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
  onOpenLyrics,
  onOpenEqualizer,
  onDownloadTrack,
  onOpenLiePay,
}) => {
  if (!isOpen || !track) return null;

  const formatTime = (secs: number) => {
    const m = Math.floor(secs / 60);
    const s = Math.floor(secs % 60);
    return `${m}:${s < 10 ? '0' : ''}${s}`;
  };

  return (
    <div
      className="fixed inset-0 z-50 flex flex-col justify-between bg-[#131111]/98 backdrop-blur-3xl text-white px-6 transition-all duration-300 overflow-y-auto"
      style={{
        backgroundImage: `radial-gradient(circle at 50% 30%, ${glowColor} 0%, transparent 70%)`,
        paddingTop: 'calc(max(env(safe-area-inset-top, 0px), 28px) + 12px)',
        paddingBottom: 'calc(max(env(safe-area-inset-bottom, 0px), 28px) + 36px)',
      }}
    >
      {/* Top Bar */}
      <div className="flex items-center justify-between shrink-0">
        <button
          onClick={onClose}
          className="w-10 h-10 rounded-full bg-white/5 hover:bg-white/10 flex items-center justify-center transition-transform active:scale-90 cursor-pointer"
          title="Свернуть"
        >
          <ChevronDown size={24} />
        </button>

        <div className="text-center">
          <p className="text-[10px] uppercase font-bold tracking-widest text-neutral-400">
            Сейчас играет
          </p>
          <p className="text-xs font-semibold text-neutral-200 mt-0.5">
            {track.album || (track.source === 'youtube' ? 'YouTube Music' : 'SoundCloud')}
          </p>
        </div>

        <button
          onClick={onToggleFavorite}
          className={`w-10 h-10 rounded-full bg-white/5 hover:bg-white/10 flex items-center justify-center transition-transform active:scale-90 cursor-pointer ${
            isFavorite ? 'text-rose-500' : 'text-neutral-300 hover:text-white'
          }`}
          title={isFavorite ? 'Удалить из избранного' : 'Добавить в избранное'}
        >
          <Heart size={20} fill={isFavorite ? 'currentColor' : 'none'} />
        </button>
      </div>

      {/* Album Artwork & Visualizer */}
      <div className="flex-1 min-h-0 flex flex-col items-center justify-center max-w-sm mx-auto w-full py-4">
        <div
          className="relative w-60 h-60 sm:w-72 sm:h-72 aspect-square rounded-3xl overflow-hidden shadow-2xl transition-all duration-500 bg-neutral-900 border border-white/10"
          style={{
            boxShadow: `0 20px 50px -10px ${glowColor}`,
          }}
        >
          {track.thumbnail ? (
            <img
              src={track.thumbnail}
              alt={track.title}
              className={`w-full h-full object-cover transition-transform duration-700 ${
                isPlaying ? 'scale-105' : 'scale-100'
              }`}
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center text-neutral-600">
              <Disc3 size={80} className={isPlaying ? 'animate-spin' : ''} />
            </div>
          )}

          {/* Source Badge */}
          <div className="absolute top-3 left-3 bg-black/60 backdrop-blur-md px-2.5 py-1 rounded-full text-[10px] font-bold tracking-wider uppercase border border-white/10 flex items-center space-x-1.5">
            <span
              className="w-1.5 h-1.5 rounded-full"
              style={{ backgroundColor: track.source === 'youtube' ? '#EF4444' : '#F97316' }}
            />
            <span>{track.source === 'youtube' ? 'YouTube Music' : 'SoundCloud'}</span>
          </div>
        </div>

        {/* Real-time Audio Spectrum Bars */}
        <div className="w-full flex items-center justify-center space-x-1 h-8 mt-5 px-4">
          {Array.from(visualizerData.slice(0, 24)).map((val, idx) => {
            const heightPercent = isPlaying ? Math.max(12, (val / 255) * 100) : 10;
            return (
              <div
                key={idx}
                className="w-1 rounded-full transition-all duration-75"
                style={{
                  height: `${heightPercent}%`,
                  backgroundColor: accentColor,
                  opacity: 0.35 + (heightPercent / 100) * 0.65,
                }}
              />
            );
          })}
        </div>
      </div>

      {/* Bottom Controls Area */}
      <div className="max-w-md mx-auto w-full shrink-0 space-y-4 pt-1">
        {/* Track Title, Artist & Pro Badges */}
        <div className="flex items-center justify-between">
          <div className="overflow-hidden flex-1 mr-4">
            <h2 className="text-xl font-bold text-white truncate tracking-tight">
              {track.title}
            </h2>
            <p className="text-sm text-neutral-400 truncate mt-0.5 font-medium">
              {track.artist}
            </p>
          </div>

          <div className="flex items-center space-x-2">
            {/* Synced Lyrics Button */}
            <button
              onClick={onOpenLyrics}
              className="w-10 h-10 rounded-2xl bg-white/5 hover:bg-white/10 border border-white/5 flex items-center justify-center text-neutral-300 hover:text-white transition-all active:scale-90 cursor-pointer"
              title="Текст песни (Караоке)"
            >
              <Mic2 size={18} />
            </button>

            {/* 10-band Equalizer Button */}
            <button
              onClick={onOpenEqualizer}
              className="w-10 h-10 rounded-2xl bg-white/5 hover:bg-white/10 border border-white/5 flex items-center justify-center text-neutral-300 hover:text-white transition-all active:scale-90 cursor-pointer"
              title="Эквалайзер и Bass Boost"
            >
              <Sliders size={18} />
            </button>

            {/* Offline Download Button */}
            <button
              onClick={() => {
                if (!isPro) {
                  onOpenLiePay();
                } else {
                  onDownloadTrack();
                }
              }}
              className={`w-10 h-10 rounded-2xl border flex items-center justify-center transition-all active:scale-90 cursor-pointer ${
                track.isDownloaded
                  ? 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30'
                  : 'bg-white/5 hover:bg-white/10 border-white/5 text-neutral-300 hover:text-white'
              }`}
              title={
                track.isDownloaded
                  ? 'Скачано офлайн'
                  : isPro
                  ? 'Скачать трек'
                  : 'Скачать (LieMusic Pro)'
              }
            >
              {track.isDownloaded ? <Check size={18} /> : <Download size={18} />}
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
            className={`p-2 rounded-full transition-colors cursor-pointer ${
              isShuffle ? 'text-white' : 'text-neutral-500 hover:text-neutral-300'
            }`}
            style={{ color: isShuffle ? accentColor : undefined }}
            title="Перемешать"
          >
            <Shuffle size={20} />
          </button>

          <button
            onClick={onPrev}
            className="p-2.5 rounded-full text-neutral-200 hover:text-white active:scale-90 transition-transform cursor-pointer"
            title="Предыдущий трек"
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
            className="p-2.5 rounded-full text-neutral-200 hover:text-white active:scale-90 transition-transform cursor-pointer"
            title="Следующий трек"
          >
            <SkipForward size={26} />
          </button>

          <button
            onClick={onToggleRepeat}
            className={`p-2 rounded-full transition-colors cursor-pointer ${
              isRepeat ? 'text-white' : 'text-neutral-500 hover:text-neutral-300'
            }`}
            style={{ color: isRepeat ? accentColor : undefined }}
            title="Повтор"
          >
            <Repeat size={20} />
          </button>
        </div>
      </div>
    </div>
  );
};
