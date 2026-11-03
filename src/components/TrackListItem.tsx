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
  onDownload: () => void;
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
      className={`group flex items-center justify-between p-2.5 rounded-2xl transition-all cursor-pointer ${
        isCurrent
          ? 'bg-white/10 shadow-lg'
          : 'hover:bg-white/5 active:bg-white/10'
      }`}
    >
      {/* Left: Thumbnail & Info */}
      <div className="flex items-center space-x-3 overflow-hidden flex-1 mr-2">
        <div className="relative w-12 h-12 rounded-xl overflow-hidden shrink-0 bg-neutral-800">
          {track.thumbnail ? (
            <img
              src={track.thumbnail}
              alt={track.title}
              className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
              loading="lazy"
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center text-neutral-600 bg-neutral-900">
              <span className="text-lg">🎵</span>
            </div>
          )}

          {/* Current track playing indicator overlay */}
          {isCurrent && (
            <div className="absolute inset-0 bg-black/50 backdrop-blur-xs flex items-center justify-center">
              {isPlaying ? (
                <div className="flex items-end space-x-0.5 h-3">
                  <span className="w-0.5 h-full bg-white animate-bounce" />
                  <span className="w-0.5 h-2/3 bg-white animate-bounce delay-75" />
                  <span className="w-0.5 h-full bg-white animate-bounce delay-150" />
                </div>
              ) : (
                <Play size={16} fill="white" className="text-white" />
              )}
            </div>
          )}
        </div>

        <div className="overflow-hidden flex-1">
          <h4
            className={`text-sm font-semibold truncate tracking-tight ${
              isCurrent ? 'font-bold' : 'text-neutral-200'
            }`}
            style={{ color: isCurrent ? accentColor : undefined }}
          >
            {track.title}
          </h4>
          <div className="flex items-center space-x-1.5 mt-0.5">
            <span
              className="text-[9px] font-extrabold uppercase px-1.5 py-0.2 rounded"
              style={{
                backgroundColor:
                  track.source === 'youtube'
                    ? '#EF444420'
                    : track.source === 'soundcloud'
                    ? '#F9731620'
                    : '#06B6D420',
                color:
                  track.source === 'youtube'
                    ? '#F87171'
                    : track.source === 'soundcloud'
                    ? '#FB923C'
                    : '#22D3EE',
              }}
            >
              {track.source === 'youtube' ? 'YT' : track.source === 'soundcloud' ? 'SC' : 'Local'}
            </span>
            <p className="text-xs text-neutral-400 truncate">{track.artist}</p>
            {trackFileSize && (
              <span className="text-[10px] text-emerald-400 font-mono bg-emerald-400/10 px-1 rounded">
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
        ) : (
          <button
            onClick={onDownload}
            className={`p-2 rounded-xl transition-all active:scale-90 cursor-pointer ${
              isTrackDownloaded ? 'text-emerald-400' : 'text-neutral-500 hover:text-neutral-300'
            }`}
            title={isTrackDownloaded ? 'Скачано на устройство' : 'Скачать'}
          >
            <Download size={16} />
          </button>
        )}

        <span className="text-xs font-mono text-neutral-500 w-10 text-right">
          {formatTime(track.duration)}
        </span>
      </div>
    </div>
  );
};
