import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { ListMusic, X, Sparkles } from 'lucide-react';
import { Language, translations } from '../i18n/translations';

interface CreatePlaylistModalProps {
  isOpen: boolean;
  accentColor: string;
  language: Language;
  onClose: () => void;
  onCreate: (title: string, description: string) => void;
}

export const CreatePlaylistModal: React.FC<CreatePlaylistModalProps> = ({
  isOpen,
  accentColor,
  language,
  onClose,
  onCreate,
}) => {
  const t = translations[language];
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');

  const handleCreate = (e: React.FormEvent) => {
    e.preventDefault();
    const cleanTitle = title.trim();
    if (!cleanTitle) return;
    onCreate(cleanTitle, description.trim());
    setTitle('');
    setDescription('');
    onClose();
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          key="create-playlist-backdrop"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.18 }}
          onClick={onClose}
          className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-black/75 touch-none"
        >
          <motion.div
            key="create-playlist-sheet"
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
                onClose();
              }
            }}
            onClick={(e) => e.stopPropagation()}
            className="bg-[#181616] border-t sm:border border-white/10 rounded-t-3xl sm:rounded-3xl w-full max-w-md p-5 pb-7 space-y-4 shadow-2xl flex flex-col will-change-transform"
          >
            {/* Pull handle */}
            <div className="w-10 h-1 bg-white/20 rounded-full mx-auto -mt-2 -mb-1 shrink-0 cursor-grab active:cursor-grabbing" />

            <div className="flex items-center justify-between border-b border-white/5 pb-3">
              <div className="flex items-center space-x-2.5">
                <div
                  className="w-8 h-8 rounded-xl flex items-center justify-center"
                  style={{ backgroundColor: `${accentColor}25`, color: accentColor }}
                >
                  <ListMusic size={18} />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-white tracking-tight">
                    {t.newPlaylist}
                  </h3>
                  <p className="text-[10px] text-neutral-400">LieMusic</p>
                </div>
              </div>
              <button
                type="button"
                onClick={onClose}
                className="w-7 h-7 rounded-full bg-white/5 hover:bg-white/10 flex items-center justify-center text-neutral-400 hover:text-white transition-colors cursor-pointer"
              >
                <X size={16} />
              </button>
            </div>

            <form onSubmit={handleCreate} className="space-y-3.5">
              <div className="space-y-1">
                <label className="text-xs font-semibold text-neutral-300">
                  {t.playlistName} <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder={t.enterPlaylistName}
                  autoFocus
                  required
                  maxLength={60}
                  className="w-full px-3.5 py-2.5 rounded-2xl bg-white/5 border border-white/10 text-white placeholder-neutral-500 text-sm focus:outline-none focus:border-white/30 transition-colors"
                />
              </div>

              <div className="space-y-1">
                <label className="text-xs font-semibold text-neutral-300">
                  {t.playlistDescription}
                </label>
                <textarea
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder={t.enterPlaylistDesc}
                  rows={2}
                  maxLength={160}
                  className="w-full px-3.5 py-2 rounded-2xl bg-white/5 border border-white/10 text-white placeholder-neutral-500 text-xs focus:outline-none focus:border-white/30 transition-colors resize-none"
                />
              </div>

              <div className="flex items-center space-x-2 pt-2">
                <button
                  type="button"
                  onClick={onClose}
                  className="flex-1 py-2.5 rounded-2xl bg-white/5 hover:bg-white/10 text-neutral-300 font-semibold text-xs transition-colors cursor-pointer"
                >
                  {t.cancel}
                </button>
                <button
                  type="submit"
                  disabled={!title.trim()}
                  className="flex-1 py-2.5 rounded-2xl font-bold text-xs text-black transition-all cursor-pointer shadow-lg active:scale-95 disabled:opacity-40 disabled:cursor-not-allowed flex items-center justify-center space-x-1.5"
                  style={{ backgroundColor: accentColor }}
                >
                  <Sparkles size={14} />
                  <span>{t.createPlaylist}</span>
                </button>
              </div>
            </form>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};
