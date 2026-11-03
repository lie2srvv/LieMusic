import React from 'react';
import { Play, Pause, SkipBack, SkipForward, Disc3 } from 'lucide-react';
import { Track } from '../types';
import { getHighResThumbnail } from '../utils/thumbnail';

interface MiniPlayerProps {
  currentTrack: Track | null;
  isPlaying: boolean;
  currentTime: number;
  duration: number;
  accentColor: string;
  glowColor: string;
  onTogglePlay: () => void;
  onPrev: () => void;
  onNext: () => void;
  onOpenFullPlayer: () => void;
}

export const MiniPlayer: React.FC<MiniPlayerProps> = ({
  currentTrack,
  isPlaying,
  currentTime,
  duration,
  accentColor,
  glowColor,
  onTogglePlay,
  onPrev,
  onNext,
  onOpenFullPlayer,
}) => {
  if (!currentTrack) return null;

  const progressPercent = duration > 0 ? (currentTime / duration) * 100 : 0;

  return (
    <div className="w-full max-w-md mx-auto px-2.5 pb-2">
      <div
        onClick={onOpenFullPlayer}
        className="relative overflow-hidden bg-[#211F1F]/95 backdrop-blur-2xl rounded-2xl border border-white/10 p-2.5 flex items-center justify-between shadow-2xl active:scale-[0.99] transition-all cursor-pointer"
        style={{
          boxShadow: `0 8px 24px -6px ${glowColor}`,
        }}
      >
        {/* Subtle Top Progress Bar */}
        <div className="absolute top-0 left-0 right-0 h-0.5 bg-white/10">
          <div
            className="h-full transition-all duration-200"
            style={{
              width: `${progressPercent}%`,
              backgroundColor: accentColor,
            }}
          />
        </div>

        {/* Track Info */}
        <div className="flex items-center space-x-3 overflow-hidden flex-1 mr-2 min-w-0">
          <div className="relative w-11 h-11 rounded-xl overflow-hidden shrink-0 bg-neutral-800 shadow-md">
            {currentTrack.thumbnail ? (
              <img
                src={getHighResThumbnail(currentTrack.thumbnail)}
                alt={currentTrack.title}
                className="w-full h-full object-cover"
              />
            ) : (
              <div className="w-full h-full flex items-center justify-center text-neutral-500">
                <Disc3 size={20} className={isPlaying ? 'animate-spin' : ''} />
              </div>
            )}
            {isPlaying && (
              <div className="absolute inset-0 bg-black/20 flex items-center justify-center">
                <div className="w-1.5 h-1.5 rounded-full bg-white animate-ping" />
              </div>
            )}
          </div>

          <div className="overflow-hidden flex-1 min-w-0">
            <h4 className="text-sm font-semibold text-white truncate tracking-tight">
              {currentTrack.title}
            </h4>
            <p className="text-xs text-neutral-400 truncate">
              {currentTrack.artist}
            </p>
          </div>
        </div>

        {/* Controls */}
        <div className="flex items-center space-x-1.5 shrink-0" onClick={(e) => e.stopPropagation()}>
          <button
            onClick={onPrev}
            className="w-8 h-8 rounded-full shrink-0 flex items-center justify-center text-neutral-400 hover:text-white transition-transform active:scale-90 cursor-pointer"
            title="Предыдущий трек"
          >
            <SkipBack size={18} />
          </button>

          <button
            onClick={onTogglePlay}
            className="w-10 h-10 rounded-full shrink-0 aspect-square flex items-center justify-center transition-transform active:scale-90 cursor-pointer shadow-md"
            style={{ backgroundColor: accentColor, color: '#151313' }}
            title={isPlaying ? 'Пауза' : 'Играть'}
          >
            {isPlaying ? (
              <Pause size={18} fill="#151313" />
            ) : (
              <Play size={17} fill="#151313" className="ml-0.5" />
            )}
          </button>

          <button
            onClick={onNext}
            className="w-8 h-8 rounded-full shrink-0 flex items-center justify-center text-neutral-400 hover:text-white transition-transform active:scale-90 cursor-pointer"
            title="Следующий трек"
          >
            <SkipForward size={18} />
          </button>
        </div>
      </div>
    </div>
  );
};
