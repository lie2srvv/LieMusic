import React from 'react';
import { Play, Heart, Download, Trash2 } from 'lucide-react';
import { Track } from '../types';

interface TrackListItemProps {
  track: Track;
  isCurrent: boolean;
  isPlaying: boolean;
  isFavorite: boolean;
  isDownloaded?: boolean;
  fileSize?: string;
  accentColor: string;
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
  fileSize,
  accentColor,
  onPlay,
  onToggleFavorite,
  onDownload,
  onDeleteDownload,
}) => {
  const isTrackDownloaded = isDownloaded ?? track.isDownloaded;
  const trackFileSize = fileSize ?? track.fileSize;

  const formatTime = (secs: number) => {
    const m = Math.floor(secs / 60);
    const s = Math.floor(secs % 60);
    return `${m}:${s < 10 ? '0' : ''}${s}`;
  };

  return (
    <div
      onClick={onPlay}
      className={`group relative flex items-center justify-between p-2.5 rounded-2xl transition-all cursor-pointer ${
        isCurrent
          ? 'bg-white/10 shadow-lg'
          : 'hover:bg-white/5 active:scale-[0.99]'
      }`}
    >
      <div className="flex items-center space-x-3 min-w-0 flex-1 pr-3">
        {/* Cover Art with Playing State */}
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

          {isCurrent && (
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
                  : 'bg-orange-500/20 text-orange-400'
              }`}
            >
              {track.source === 'youtube' ? 'YT' : 'SC'}
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
      <div className="flex items-center space-x-1.5 shrink-0" onClick={(e) => e.stopPropagation()}>
        <button
          onClick={onToggleFavorite}
          className={`p-2 rounded-xl transition-all active:scale-90 cursor-pointer ${
            isFavorite ? 'text-rose-500' : 'text-neutral-500 hover:text-neutral-300'
          }`}
          title={isFavorite ? 'Удалить из избранного' : 'В избранное'}
        >
          <Heart size={16} fill={isFavorite ? 'currentColor' : 'none'} />
        </button>

        {onDeleteDownload ? (
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
    </div>
  );
};
