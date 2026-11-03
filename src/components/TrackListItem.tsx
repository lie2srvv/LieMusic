import React from 'react';
import { Play, Heart, Download, Music2 } from 'lucide-react';
import { Track } from '../types';

interface TrackListItemProps {
  track: Track;
  isCurrent: boolean;
  isPlaying: boolean;
  isFavorite: boolean;
  accentColor: string;
  onPlay: () => void;
  onToggleFavorite: () => void;
  onDownload: () => void;
}

export const TrackListItem: React.FC<TrackListItemProps> = ({
  track,
  isCurrent,
  isPlaying,
  isFavorite,
  accentColor,
  onPlay,
  onToggleFavorite,
  onDownload,
}) => {
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
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center text-neutral-500">
              <Music2 size={20} />
            </div>
          )}

          {isCurrent && (
            <div className="absolute inset-0 bg-black/40 flex items-center justify-center">
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

        <button
          onClick={onDownload}
          className={`p-2 rounded-xl transition-all active:scale-90 cursor-pointer ${
            track.isDownloaded ? 'text-emerald-400' : 'text-neutral-500 hover:text-neutral-300'
          }`}
          title={track.isDownloaded ? 'Скачано' : 'Скачать'}
        >
          <Download size={16} />
        </button>

        <span className="text-xs font-mono text-neutral-500 w-10 text-right">
          {formatTime(track.duration)}
        </span>
      </div>
    </div>
  );
};
