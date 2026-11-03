import React, { useRef } from 'react';
import { Play, Heart, Download, Trash2, Check, Loader2 } from 'lucide-react';
import { motion } from 'motion/react';
import { Track } from '../types';
import { translations, Language } from '../i18n/translations';

interface TrackListItemProps {
  track: Track;
  isCurrent: boolean;
  isPlaying: boolean;
  isFavorite: boolean;
  isDownloaded?: boolean;
  isDownloading?: boolean;
  fileSize?: string;
  showFileSize?: boolean;
  accentColor?: string;
  isSelectMode?: boolean;
  isSelected?: boolean;
  language: Language;
  onSelect?: () => void;
  onLongPress?: () => void;
  onPlay: () => void;
  onToggleFavorite: () => void;
  onDownload?: () => void;
  onDeleteDownload?: () => void;
}

export const TrackListItem: React.FC<TrackListItemProps> = ({
  track,
  isCurrent,
  isPlaying,
  isFavorite,
  isDownloaded,
  isDownloading,
  fileSize,
  showFileSize = false,
  accentColor = '#FF3366',
  isSelectMode = false,
  isSelected = false,
  language,
  onSelect,
  onLongPress,
  onPlay,
  onToggleFavorite,
  onDownload,
  onDeleteDownload,
}) => {
  const t = translations[language];
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const isLongPressTriggered = useRef<boolean>(false);

  const isTrackDownloaded = isDownloaded ?? track.isDownloaded;
  const trackFileSize = fileSize || track.fileSize;

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
    <motion.div
      onClick={handleClick}
      onMouseDown={startPressTimer}
      onMouseUp={cancelPressTimer}
      onMouseLeave={cancelPressTimer}
      onTouchStart={startPressTimer}
      onTouchEnd={cancelPressTimer}
      whileTap={{ scale: 0.985 }}
      className={`group relative flex items-center justify-between p-2.5 rounded-2xl transition-colors cursor-pointer select-none ${
        isSelected
          ? 'bg-white/15 border border-white/20 shadow-lg'
          : isCurrent
          ? 'bg-white/10 shadow-lg'
          : 'hover:bg-white/5'
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

        {/* Artwork */}
        <div className="relative w-11 h-11 rounded-xl overflow-hidden bg-neutral-800 shrink-0 shadow-md">
          {track.thumbnail ? (
            <img
              src={track.thumbnail}
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
            {showFileSize && isTrackDownloaded && trackFileSize && (
              <span className="text-[10px] font-mono font-medium text-emerald-400/90 bg-emerald-500/15 border border-emerald-500/20 px-1.5 py-0.5 rounded-md">
                {trackFileSize}
              </span>
            )}
          </div>
        </div>
      </div>

      {/* Action Buttons */}
      <div className="flex items-center space-x-1 shrink-0">
        <motion.button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            onToggleFavorite();
          }}
          whileTap={{ scale: 1.3 }}
          className={`p-2 rounded-xl transition-colors cursor-pointer ${
            isFavorite
              ? 'text-rose-500 hover:text-rose-400'
              : 'text-neutral-500 hover:text-white'
          }`}
          title={isFavorite ? t.inFavorites : t.addToFavorites}
        >
          <Heart size={16} fill={isFavorite ? 'currentColor' : 'none'} />
        </motion.button>

        {isDownloading ? (
          <div className="p-2 text-emerald-400" title={t.downloading}>
            <Loader2 size={16} className="animate-spin" />
          </div>
        ) : isTrackDownloaded ? (
          onDeleteDownload ? (
            <motion.button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                onDeleteDownload();
              }}
              whileTap={{ scale: 0.85 }}
              className="p-2 text-neutral-500 hover:text-rose-400 transition-colors cursor-pointer"
              title={t.deleteFromDevice}
            >
              <Trash2 size={16} />
            </motion.button>
          ) : (
            <div className="p-2 text-emerald-400" title={t.downloadedOffline}>
              <Check size={16} className="stroke-[2.5]" />
            </div>
          )
        ) : (
          <motion.button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              onDownload?.();
            }}
            whileTap={{ scale: 0.85 }}
            className="p-2 text-neutral-500 hover:text-white transition-colors cursor-pointer"
            title={t.downloadTrack}
          >
            <Download size={16} />
          </motion.button>
        )}

        <span className="text-xs text-neutral-500 font-mono w-10 text-right">
          {Math.floor(track.duration / 60)}:
          {(track.duration % 60).toString().padStart(2, '0')}
        </span>
      </div>
    </motion.div>
  );
};
