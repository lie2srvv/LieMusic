import React, { useState, useMemo } from 'react';
import {
  ArrowLeft,
  Play,
  Upload,
  Search,
  Trash2,
  Music,
  Disc3,
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { Playlist, Track } from '../types';
import { Language, translations } from '../i18n/translations';
import { HeartPlaylistCover } from './HeartPlaylistCover';
import { TrackListItem } from './TrackListItem';

interface PlaylistDetailViewProps {
  playlist: Playlist;
  currentTrack: Track | null;
  isPlaying: boolean;
  favoriteTrackIds: Set<string>;
  downloadedTrackIds: Set<string>;
  downloadingIds: Set<string>;
  accentColor: string;
  glowColor: string;
  language: Language;
  onBack: () => void;
  onPlayTrack: (track: Track, queue: Track[]) => void;
  onPlayAll: (tracks: Track[]) => void;
  onToggleFavorite: (track: Track) => void;
  onDownloadTrack: (track: Track) => void;
  onTrackLongPress: (track: Track) => void;
  onRemoveTrackFromPlaylist?: (trackId: string) => void;
  onDeletePlaylist?: () => void;
  onUploadLocalTrack: (e: React.ChangeEvent<HTMLInputElement>) => void;
}

export const PlaylistDetailView: React.FC<PlaylistDetailViewProps> = ({
  playlist,
  currentTrack,
  isPlaying,
  favoriteTrackIds,
  downloadedTrackIds,
  downloadingIds,
  accentColor,
  glowColor: _glowColor,
  language,
  onBack,
  onPlayTrack,
  onPlayAll,
  onToggleFavorite,
  onDownloadTrack,
  onTrackLongPress,
  onRemoveTrackFromPlaylist: _onRemoveTrackFromPlaylist,
  onDeletePlaylist,
  onUploadLocalTrack,
}) => {
  const t = translations[language];
  const [searchQuery, setSearchQuery] = useState('');
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  const isFavorites = playlist.id === 'system_favorites';
  const isHistory = playlist.id === 'system_history';
  const isSystem = playlist.isSystem || isFavorites || isHistory;

  const filteredTracks = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    if (!q) return playlist.tracks;
    return playlist.tracks.filter(
      (tr) =>
        tr.title.toLowerCase().includes(q) ||
        tr.artist.toLowerCase().includes(q)
    );
  }, [playlist.tracks, searchQuery]);

  return (
    <motion.div
      initial={{ opacity: 0, x: 20 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: 20 }}
      transition={{ duration: 0.2 }}
      className="space-y-5 pb-36"
    >
      {/* Top Navigation Bar */}
      <div className="flex items-center justify-between">
        <button
          onClick={onBack}
          className="w-9 h-9 rounded-full bg-white/5 hover:bg-white/10 flex items-center justify-center text-white transition-colors cursor-pointer active:scale-95"
        >
          <ArrowLeft size={18} />
        </button>

        {!isSystem && onDeletePlaylist && (
          <button
            onClick={() => setShowDeleteConfirm(true)}
            className="w-9 h-9 rounded-full bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 flex items-center justify-center transition-colors cursor-pointer active:scale-95"
            title={t.deletePlaylist}
          >
            <Trash2 size={16} />
          </button>
        )}
      </div>

      {/* Hero Album / Playlist Header (Matching User's Reference Screenshot) */}
      <div className="flex flex-col sm:flex-row items-center sm:items-end space-y-4 sm:space-y-0 sm:space-x-5 text-center sm:text-left pt-2">
        {/* Cover Artwork */}
        <div className="shrink-0 shadow-2xl relative group">
          {isFavorites ? (
            <HeartPlaylistCover size={140} className="rounded-3xl" />
          ) : playlist.coverUrl ? (
            <img
              src={playlist.coverUrl}
              alt={playlist.title}
              className="w-36 h-36 rounded-3xl object-cover border border-white/10 shadow-2xl"
            />
          ) : (
            <div className="w-36 h-36 rounded-3xl bg-[#221F1F] border border-white/10 flex flex-col items-center justify-center text-neutral-500 space-y-1 shadow-2xl">
              <Music size={40} className="text-neutral-400" />
            </div>
          )}
        </div>

        {/* Metadata */}
        <div className="flex-1 min-w-0 space-y-1.5">
          <span className="text-[11px] font-bold tracking-wider uppercase text-neutral-400">
            {t.playlistLabel}
          </span>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight leading-tight truncate">
            {playlist.title}
          </h1>
          {playlist.description && (
            <p className="text-xs text-neutral-400 line-clamp-2">
              {playlist.description}
            </p>
          )}
          <div className="flex items-center justify-center sm:justify-start space-x-2 text-xs text-neutral-400 pt-1">
            <span className="font-semibold text-neutral-200">lie2srvv</span>
            <span>•</span>
            <span>{t.tracksCount(playlist.tracks.length)}</span>
          </div>
        </div>
      </div>

      {/* Action Buttons Row */}
      <div className="flex flex-wrap items-center gap-2.5 pt-1">
        {/* Big Yellow / Accent Play All Button */}
        <button
          onClick={() => onPlayAll(playlist.tracks)}
          disabled={playlist.tracks.length === 0}
          className="px-6 py-3 rounded-full font-extrabold text-xs text-black flex items-center space-x-2 cursor-pointer shadow-lg active:scale-95 transition-all disabled:opacity-40 disabled:cursor-not-allowed"
          style={{ backgroundColor: '#FDE047' }} // Yellow pill button like Yandex Music reference
        >
          <Play size={16} fill="black" />
          <span>{t.listen}</span>
        </button>

        {/* Upload Track from device (Matching Screenshot 6) */}
        <label className="px-4 py-3 rounded-full bg-white/10 hover:bg-white/15 text-white font-semibold text-xs flex items-center space-x-2 cursor-pointer active:scale-95 transition-colors border border-white/5">
          <Upload size={15} />
          <span>{t.uploadTrack}</span>
          <input
            type="file"
            accept="audio/*"
            multiple
            onChange={onUploadLocalTrack}
            className="hidden"
          />
        </label>
      </div>

      {/* Internal Track Search Bar (Matching Reference 4 and 5) */}
      <div className="relative pt-1">
        <Search
          size={16}
          className="absolute left-4 top-1/2 -translate-y-1/2 text-neutral-400 pointer-events-none"
        />
        <input
          type="text"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder={t.searchInsidePlaylist}
          className="w-full pl-11 pr-4 py-2.5 rounded-full bg-white/5 border border-white/10 text-white placeholder-neutral-500 text-xs focus:outline-none focus:border-white/30 transition-colors"
        />
        {searchQuery && (
          <button
            onClick={() => setSearchQuery('')}
            className="absolute right-3.5 top-1/2 -translate-y-1/2 text-neutral-400 hover:text-white text-xs px-1"
          >
            ✕
          </button>
        )}
      </div>

      {/* Tracks List */}
      <div className="space-y-1 bg-[#1A1818] p-2 rounded-3xl border border-white/5">
        {filteredTracks.length > 0 ? (
          filteredTracks.map((track) => (
            <TrackListItem
              key={`pl_${playlist.id}_${track.id}`}
              track={track}
              isCurrent={currentTrack?.id === track.id}
              isPlaying={isPlaying}
              isFavorite={favoriteTrackIds.has(track.id)}
              isDownloaded={downloadedTrackIds.has(track.id)}
              isDownloading={downloadingIds.has(track.id)}
              language={language}
              accentColor={accentColor}
              onPlay={() => onPlayTrack(track, playlist.tracks)}
              onToggleFavorite={() => onToggleFavorite(track)}
              onDownload={() => onDownloadTrack(track)}
              onLongPress={() => onTrackLongPress(track)}
            />
          ))
        ) : (
          <div className="py-14 text-center text-neutral-500 space-y-1.5">
            <Disc3 size={32} className="mx-auto text-neutral-600 opacity-60" />
            <p className="text-xs font-semibold text-neutral-400">{t.playlistEmpty}</p>
            <p className="text-[11px] text-neutral-600 max-w-xs mx-auto">
              {t.playlistEmptyDesc}
            </p>
          </div>
        )}
      </div>

      {/* Delete Playlist Confirmation Modal */}
      <AnimatePresence>
        {showDeleteConfirm && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setShowDeleteConfirm(false)}
            className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80"
          >
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              onClick={(e) => e.stopPropagation()}
              className="bg-[#1C1A1A] border border-white/10 rounded-3xl p-5 max-w-sm w-full space-y-4 shadow-2xl text-center"
            >
              <div className="w-12 h-12 rounded-2xl bg-rose-500/15 text-rose-400 flex items-center justify-center mx-auto border border-rose-500/25">
                <Trash2 size={24} />
              </div>
              <div className="space-y-1">
                <h3 className="text-sm font-bold text-white">{t.deletePlaylist}</h3>
                <p className="text-xs text-neutral-400">{t.deletePlaylistConfirm}</p>
              </div>
              <div className="flex items-center space-x-2 pt-2">
                <button
                  onClick={() => setShowDeleteConfirm(false)}
                  className="flex-1 py-2.5 rounded-2xl bg-white/5 hover:bg-white/10 text-neutral-300 font-semibold text-xs cursor-pointer"
                >
                  {t.cancel}
                </button>
                <button
                  onClick={() => {
                    setShowDeleteConfirm(false);
                    onDeletePlaylist?.();
                  }}
                  className="flex-1 py-2.5 rounded-2xl bg-rose-600 hover:bg-rose-500 text-white font-bold text-xs cursor-pointer shadow-lg active:scale-95"
                >
                  {t.delete}
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
};
