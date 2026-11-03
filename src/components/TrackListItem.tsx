import React, { useRef } from 'react';
import { Play, Heart, Download, Trash2, Check, Loader2 } from 'lucide-react';
import { Track } from '../types';
import { getHighResThumbnail } from '../utils/thumbnail';

interface TrackListItemProps {
  track: Track;
  isCurrent: boolean;
  isPlaying: boolean;
  isFavorite: boolean;
  isDownloaded?: boolean;
  isDownloading?: boolean;
  fileSize?: string;
  accentColor: string;
  isSelectMode?: boolean;
  isSelected?: boolean;
  onPlay: () => void;
  onToggleFavorite: () => void;
  onDownload?: () => void;
  onDeleteDownload?: () => void;
  onSelect?: () => void;
  onLongPress?: () => void;
}

export const TrackListItem: React.FC<TrackListItemProps> = ({
  track,
  isCurrent,
  isPlaying,
  isFavorite,
  isDownloaded,
  isDownloading,
  fileSize,
  accentColor,
  isSelectMode = false,
  isSelected = false,
  onPlay,
  onToggleFavorite,
  onDownload,
  onDeleteDownload,
  onSelect,
  onLongPress,
}) => {
  const isTrackDownloaded = isDownloaded ?? track.isDownloaded;
  const trackFileSize = fileSize ?? track.fileSize;
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const isLongPressTriggered = useRef<boolean>(false);

  const formatTime = (secs: number) => {
    const m = Math.floor(secs / 60);
    const s = Math.floor(secs % 60);
    return `${m}:${s < 10 ? '0' : ''}${s}`;
  };

  const startPressTimer = () => {
    isLongPressTriggered.current = false;
    if (timerRef.current) clearTimeout(timerRef.current);
    timerRef.current = setTimeout(() => {
      isLongPressTriggered.current = true;
      if (onLongPress) {
        if ('vibrate' in navigator) {
          navigator.vibrate(40);
        }
        onLongPress();
      }
    }, 450);
  };

  const cancelPressTimer = () => {
    if (timerRef.current) {
      clearTimeout(timerRef.current);
      timerRef.current = null;
    }
  };

  const handleClick = () => {
    if (isLongPressTriggered.current) {
      isLongPressTriggered.current = false;
      return;
    }
    if (isSelectMode && onSelect) {
      onSelect();
    } else {
      onPlay();
    }
  };

  return (
    <div
      onClick={handleClick}
      onMouseDown={startPressTimer}
      onMouseUp={cancelPressTimer}
      onMouseLeave={cancelPressTimer}
      onTouchStart={startPressTimer}
      onTouchEnd={cancelPressTimer}
      className={`group relative flex items-center justify-between p-2.5 rounded-2xl transition-all cursor-pointer select-none ${
        isSelected
          ? 'bg-white/15 border border-white/20 shadow-lg'
          : isCurrent
          ? 'bg-white/10 shadow-lg'
          : 'hover:bg-white/5 active:scale-[0.99]'
      }`}
    >
      <div className="flex items-center space-x-3 min-w-0 flex-1 pr-3">
        {/* Selection Checkbox */}
        {isSelectMode && (
          <div
            onClick={(e) => {
              e.stopPropagation();
              onSelect?.();
            }}
            className={`w-5 h-5 rounded-lg flex items-center justify-center shrink-0 transition-all border ${
              isSelected
                ? 'bg-white text-black border-white shadow-sm'
                : 'border-white/25 bg-white/5 hover:border-white/50'
            }`}
          >
            {isSelected && <Check size={14} className="stroke-[3]" />}
          </div>
        )}

        {/* Cover Art with Playing State */}
        <div className="relative w-11 h-11 rounded-xl overflow-hidden bg-neutral-800 shrink-0 shadow-md">
          {track.thumbnail ? (
            <img
              src={getHighResThumbnail(track.thumbnail)}
              alt={track.title}
              className="w-full h-full object-cover"
              loading="lazy"
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center text-neutral-600">
              <Play size={16} fill="currentColor" />
            </div>
          )}

          {isCurrent && !isSelectMode && (
            <div className="absolute inset-0 bg-black/50 backdrop-blur-[2px] flex items-center justify-center">
              {isPlaying ? (
                <div className="flex items-end space-x-0.5 h-3.5">
                  <span className="w-0.5 bg-white animate-pulse h-full rounded-full" />
                  <span className="w-0.5 bg-white animate-pulse h-2 rounded-full delay-75" />
                  <span className="w-0.5 bg-white animate-pulse h-3.5 rounded-full delay-150" />
                </div>
              ) : (
                <Play size={16} fill="white" className="text-white translate-x-0.5" />
              )}
            </div>
          )}
        </div>

        {/* Title, Artist, Tags */}
        <div className="min-w-0 flex-1">
          <p
            className={`text-sm font-semibold truncate tracking-tight ${
              isCurrent ? 'text-white' : 'text-neutral-200'
            }`}
            style={{ color: isCurrent ? accentColor : undefined }}
          >
            {track.title}
          </p>
          <div className="flex items-center space-x-1.5 mt-0.5">
            <span
              className={`text-[9px] uppercase font-bold px-1 rounded ${
                track.source === 'youtube'
                  ? 'bg-red-500/20 text-red-400'
                  : track.source === 'local'
                  ? 'bg-emerald-500/20 text-emerald-400'
                  : 'bg-orange-500/20 text-orange-400'
              }`}
            >
              {track.source === 'youtube' ? 'YT' : track.source === 'local' ? 'LOCAL' : 'SC'}
            </span>
            <p className="text-xs text-neutral-400 truncate">{track.artist}</p>
            {isTrackDownloaded && trackFileSize && (
              <span className="text-[10px] font-mono text-emerald-400/80 bg-emerald-500/10 px-1 rounded">
                {trackFileSize}
              </span>
            )}
          </div>
        </div>
      </div>

      {/* Right: Actions and Duration */}
      {!isSelectMode && (
        <div
          className="flex items-center space-x-1.5 shrink-0"
          onClick={(e) => e.stopPropagation()}
          onMouseDown={(e) => e.stopPropagation()}
          onMouseUp={(e) => e.stopPropagation()}
          onTouchStart={(e) => e.stopPropagation()}
          onTouchEnd={(e) => e.stopPropagation()}
        >
          <button
            onClick={onToggleFavorite}
            className={`p-2 rounded-xl transition-all active:scale-90 cursor-pointer ${
              isFavorite ? 'text-rose-500' : 'text-neutral-500 hover:text-neutral-300'
            }`}
            title={isFavorite ? 'Удалить из избранного' : 'В избранное'}
          >
            <Heart size={16} fill={isFavorite ? 'currentColor' : 'none'} />
          </button>

          {isDownloading ? (
            <div
              className="p-2 rounded-xl text-amber-400 flex items-center justify-center animate-pulse"
              title="Скачивание..."
            >
              <Loader2 size={16} className="animate-spin text-amber-400" />
            </div>
          ) : onDeleteDownload ? (
            <button
              onClick={onDeleteDownload}
              className="p-2 rounded-xl text-neutral-500 hover:text-rose-400 active:scale-90 transition-all cursor-pointer"
              title="Удалить из памяти"
            >
              <Trash2 size={16} />
            </button>
          ) : onDownload ? (
            <button
              onClick={onDownload}
              className={`p-2 rounded-xl transition-all active:scale-90 cursor-pointer ${
                isTrackDownloaded ? 'text-emerald-400' : 'text-neutral-500 hover:text-neutral-300'
              }`}
              title={isTrackDownloaded ? 'Скачано на устройство' : 'Скачать'}
            >
              <Download size={16} />
            </button>
          ) : null}

          <span className="text-xs font-mono text-neutral-500 w-10 text-right">
            {formatTime(track.duration)}
          </span>
        </div>
      )}
    </div>
  );
};
