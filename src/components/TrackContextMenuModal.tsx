import React, { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  CheckSquare,
  ListPlus,
  Heart,
  Download,
  Trash2,
  Plus,
  Play,
  Check,
  ChevronRight,
  Disc3,
  X,
} from 'lucide-react';
import { Track, Playlist } from '../types';
import { Language, translations } from '../i18n/translations';
import { getHighResThumbnail } from '../utils/thumbnail';

interface TrackContextMenuModalProps {
  isOpen: boolean;
  track: Track | null;
  isFavorite: boolean;
  isDownloaded: boolean;
  playlists: Playlist[];
  accentColor: string;
  language: Language;
  onClose: () => void;
  onSelectMode: () => void;
  onToggleFavorite: () => void;
  onDownload: () => void;
  onDeleteDownload: () => void;
  onAddToPlaylist: (playlistId: string) => void;
  onCreatePlaylist: () => void;
  onPlayNext?: () => void;
}

export const TrackContextMenuModal: React.FC<TrackContextMenuModalProps> = ({
  isOpen,
  track,
  isFavorite,
  isDownloaded,
  playlists,
  accentColor: _accentColor,
  language,
  onClose,
  onSelectMode,
  onToggleFavorite,
  onDownload,
  onDeleteDownload,
  onAddToPlaylist,
  onCreatePlaylist,
  onPlayNext,
}) => {
  const t = translations[language];
  const [showPlaylistPicker, setShowPlaylistPicker] = useState<boolean>(false);
  const [addedNotice, setAddedNotice] = useState<string | null>(null);
  const noticeTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    return () => {
      if (noticeTimerRef.current) {
        clearTimeout(noticeTimerRef.current);
      }
    };
  }, []);

  if (!track) return null;

  // Filter out system playlists from the "add to playlist" list, since favorites has its own button
  const userPlaylists = playlists.filter((p) => !p.isSystem);

  const handleSelectPlaylist = (pId: string) => {
    onAddToPlaylist(pId);
    setAddedNotice(t.trackAddedToPlaylist);
    if (noticeTimerRef.current) {
      clearTimeout(noticeTimerRef.current);
    }
    noticeTimerRef.current = setTimeout(() => {
      setAddedNotice(null);
      setShowPlaylistPicker(false);
      onClose();
    }, 900);
  };

  const handleClose = () => {
    if (noticeTimerRef.current) {
      clearTimeout(noticeTimerRef.current);
    }
    setShowPlaylistPicker(false);
    onClose();
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          key="track-context-backdrop"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.18 }}
          onClick={handleClose}
          className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-black/75 touch-none"
        >
          <motion.div
            key="track-context-sheet"
            initial={{ y: '100%', opacity: 0.8 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: '100%', opacity: 0.2 }}
            transition={{ type: 'spring', stiffness: 380, damping: 32 }}
            drag="y"
            dragConstraints={{ top: 0, bottom: 0 }}
            dragElastic={{ top: 0, bottom: 0.45 }}
            dragSnapToOrigin
            onDragEnd={(_, info) => {
              if (info.offset.y > 70 || info.velocity.y > 220) {
                handleClose();
              }
            }}
            onClick={(e) => e.stopPropagation()}
            className="bg-[#181616] border-t sm:border border-white/10 rounded-t-3xl sm:rounded-3xl w-full max-w-md max-h-[85vh] flex flex-col shadow-2xl overflow-hidden will-change-transform"
          >
            {/* Pull handle */}
            <div className="w-10 h-1 bg-white/20 rounded-full mx-auto mt-2.5 shrink-0 cursor-grab active:cursor-grabbing" />

            {/* Track Mini Preview */}
            <div className="flex items-center space-x-3 px-5 py-3.5 border-b border-white/5 bg-[#1C1A1A]/70">
              <div className="w-12 h-12 rounded-xl overflow-hidden bg-neutral-800 shrink-0 shadow-md relative">
                {track.thumbnail ? (
                  <img
                    src={getHighResThumbnail(track.thumbnail)}
                    alt={track.title}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-neutral-500">
                    <Disc3 size={20} />
                  </div>
                )}
              </div>
              <div className="min-w-0 flex-1">
                <h3 className="text-sm font-bold text-white truncate tracking-tight">
                  {track.title}
                </h3>
                <p className="text-xs text-neutral-400 truncate mt-0.5">
                  {track.artist}
                </p>
              </div>
              <button
                onClick={handleClose}
                className="w-7 h-7 rounded-full bg-white/5 hover:bg-white/10 flex items-center justify-center text-neutral-400 hover:text-white transition-colors cursor-pointer"
              >
                <X size={16} />
              </button>
            </div>

            {/* Content view */}
            <div className="p-3 overflow-y-auto max-h-[60vh] space-y-1">
              {showPlaylistPicker ? (
                /* Playlist Picker View */
                <div className="space-y-2 py-1">
                  <div className="flex items-center justify-between px-2 pb-1 border-b border-white/5">
                    <button
                      onClick={() => setShowPlaylistPicker(false)}
                      className="text-xs text-neutral-400 hover:text-white flex items-center space-x-1 cursor-pointer py-1"
                    >
                      <span>← {t.selectPlaylist}</span>
                    </button>
                    <button
                      onClick={() => {
                        setShowPlaylistPicker(false);
                        onCreatePlaylist();
                      }}
                      className="text-xs font-semibold px-2.5 py-1 rounded-xl bg-white/10 hover:bg-white/15 text-white flex items-center space-x-1 cursor-pointer active:scale-95"
                    >
                      <Plus size={13} />
                      <span>{t.newPlaylist}</span>
                    </button>
                  </div>

                  {addedNotice && (
                    <div className="p-2.5 rounded-xl bg-emerald-500/20 border border-emerald-500/30 text-emerald-300 text-xs font-medium text-center flex items-center justify-center space-x-1.5">
                      <Check size={14} />
                      <span>{addedNotice}</span>
                    </div>
                  )}

                  {userPlaylists.length === 0 ? (
                    <div className="py-8 text-center text-neutral-400 space-y-2">
                      <p className="text-xs">{t.playlistEmpty}</p>
                      <button
                        onClick={() => {
                          setShowPlaylistPicker(false);
                          onCreatePlaylist();
                        }}
                        className="text-xs font-bold px-4 py-2 rounded-2xl bg-white text-black hover:bg-neutral-200 transition-transform active:scale-95 inline-flex items-center space-x-1.5 cursor-pointer shadow-lg"
                      >
                        <Plus size={14} />
                        <span>{t.createPlaylist}</span>
                      </button>
                    </div>
                  ) : (
                    userPlaylists.map((pl) => {
                      const alreadyIn = pl.tracks.some((tr) => tr.id === track.id);
                      return (
                        <button
                          key={pl.id}
                          onClick={() => handleSelectPlaylist(pl.id)}
                          className="w-full flex items-center justify-between p-2.5 rounded-2xl hover:bg-white/5 transition-colors cursor-pointer text-left group"
                        >
                          <div className="flex items-center space-x-3 min-w-0">
                            <div className="w-10 h-10 rounded-xl bg-neutral-800 flex items-center justify-center text-neutral-400 font-bold shrink-0 overflow-hidden border border-white/5">
                              {pl.coverUrl ? (
                                <img
                                  src={pl.coverUrl}
                                  alt={pl.title}
                                  className="w-full h-full object-cover"
                                />
                              ) : (
                                <ListPlus size={18} />
                              )}
                            </div>
                            <div className="min-w-0 flex-1">
                              <p className="text-xs font-bold text-white truncate">
                                {pl.title}
                              </p>
                              <p className="text-[10px] text-neutral-400">
                                {t.tracksCount(pl.tracks.length)}
                              </p>
                            </div>
                          </div>
                          {alreadyIn ? (
                            <span className="text-[10px] text-neutral-500 font-medium px-2 py-0.5 rounded bg-white/5">
                              {t.trackAlreadyInPlaylist}
                            </span>
                          ) : (
                            <Plus size={16} className="text-neutral-400 group-hover:text-white" />
                          )}
                        </button>
                      );
                    })
                  )}
                </div>
              ) : (
                /* Primary Actions List */
                <>
                  {/* 1. SELECT (Multiple) */}
                  <button
                    onClick={() => {
                      onSelectMode();
                      handleClose();
                    }}
                    className="w-full flex items-center space-x-3.5 px-3.5 py-3 rounded-2xl hover:bg-white/5 active:bg-white/10 transition-colors cursor-pointer text-left"
                  >
                    <div className="w-9 h-9 rounded-xl bg-white/5 flex items-center justify-center text-neutral-300 shrink-0">
                      <CheckSquare size={18} />
                    </div>
                    <div className="flex-1">
                      <p className="text-sm font-semibold text-white">{t.selectMultiple}</p>
                      <p className="text-[11px] text-neutral-400">{t.longPressToSelect}</p>
                    </div>
                  </button>

                  <div className="border-t border-white/5 my-1" />

                  {/* 2. ADD TO PLAYLIST */}
                  <button
                    onClick={() => setShowPlaylistPicker(true)}
                    className="w-full flex items-center justify-between px-3.5 py-3 rounded-2xl hover:bg-white/5 active:bg-white/10 transition-colors cursor-pointer text-left"
                  >
                    <div className="flex items-center space-x-3.5 min-w-0">
                      <div className="w-9 h-9 rounded-xl bg-purple-500/15 text-purple-400 flex items-center justify-center shrink-0 border border-purple-500/20">
                        <ListPlus size={18} />
                      </div>
                      <div>
                        <p className="text-sm font-semibold text-white">{t.addToPlaylist}</p>
                        <p className="text-[11px] text-neutral-400">{t.myPlaylists}</p>
                      </div>
                    </div>
                    <ChevronRight size={16} className="text-neutral-500" />
                  </button>

                  {/* 3. FAVORITES TOGGLE */}
                  <button
                    onClick={() => {
                      onToggleFavorite();
                      handleClose();
                    }}
                    className="w-full flex items-center space-x-3.5 px-3.5 py-3 rounded-2xl hover:bg-white/5 active:bg-white/10 transition-colors cursor-pointer text-left"
                  >
                    <div
                      className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 border ${
                        isFavorite
                          ? 'bg-rose-500/20 text-rose-400 border-rose-500/30'
                          : 'bg-white/5 text-neutral-300 border-white/5'
                      }`}
                    >
                      <Heart size={18} fill={isFavorite ? 'currentColor' : 'none'} />
                    </div>
                    <div>
                      <p className="text-sm font-semibold text-white">
                        {isFavorite ? t.inFavorites : t.addToFavorites}
                      </p>
                      <p className="text-[11px] text-neutral-400">{t.likePlaylist}</p>
                    </div>
                  </button>

                  {/* 4. DOWNLOAD / DELETE FROM MEMORY */}
                  {isDownloaded ? (
                    <button
                      onClick={() => {
                        onDeleteDownload();
                        handleClose();
                      }}
                      className="w-full flex items-center space-x-3.5 px-3.5 py-3 rounded-2xl hover:bg-rose-500/10 active:bg-rose-500/20 transition-colors cursor-pointer text-left group"
                    >
                      <div className="w-9 h-9 rounded-xl bg-rose-500/15 text-rose-400 flex items-center justify-center shrink-0 border border-rose-500/25">
                        <Trash2 size={18} />
                      </div>
                      <div>
                        <p className="text-sm font-semibold text-rose-400 group-hover:text-rose-300">
                          {t.deleteFromDevice}
                        </p>
                        <p className="text-[11px] text-neutral-400">{t.downloadedOffline}</p>
                      </div>
                    </button>
                  ) : (
                    <button
                      onClick={() => {
                        onDownload();
                        handleClose();
                      }}
                      className="w-full flex items-center space-x-3.5 px-3.5 py-3 rounded-2xl hover:bg-white/5 active:bg-white/10 transition-colors cursor-pointer text-left"
                    >
                      <div className="w-9 h-9 rounded-xl bg-emerald-500/15 text-emerald-400 flex items-center justify-center shrink-0 border border-emerald-500/25">
                        <Download size={18} />
                      </div>
                      <div>
                        <p className="text-sm font-semibold text-white">{t.downloadTrack}</p>
                        <p className="text-[11px] text-neutral-400">{t.noDownloadedTracksDesc}</p>
                      </div>
                    </button>
                  )}

                  {/* 5. PLAY NEXT (Optional) */}
                  {onPlayNext && (
                    <button
                      onClick={() => {
                        onPlayNext();
                        handleClose();
                      }}
                      className="w-full flex items-center space-x-3.5 px-3.5 py-3 rounded-2xl hover:bg-white/5 active:bg-white/10 transition-colors cursor-pointer text-left"
                    >
                      <div className="w-9 h-9 rounded-xl bg-white/5 text-neutral-300 flex items-center justify-center shrink-0">
                        <Play size={18} />
                      </div>
                      <div>
                        <p className="text-sm font-semibold text-white">{t.playNext}</p>
                      </div>
                    </button>
                  )}
                </>
              )}
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};
