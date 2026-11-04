import React, { useState, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { X, ImagePlus, Check, Disc3, Link } from 'lucide-react';
import { Track } from '../types';
import { translations, Language } from '../i18n/translations';
import { getHighResThumbnail } from '../utils/thumbnail';

interface EditTrackModalProps {
  isOpen: boolean;
  onClose: () => void;
  track: Track | null;
  language: Language;
  onSave: (updated: { title: string; artist: string; thumbnail?: string }) => void;
}

export const EditTrackModal: React.FC<EditTrackModalProps> = ({
  isOpen,
  onClose,
  track,
  language,
  onSave,
}) => {
  const t = translations[language];
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [title, setTitle] = useState('');
  const [artist, setArtist] = useState('');
  const [thumbnail, setThumbnail] = useState('');
  const [showUrlInput, setShowUrlInput] = useState(false);
  const [customUrl, setCustomUrl] = useState('');

  // Sync state whenever modal opens or track changes
  React.useEffect(() => {
    if (track && isOpen) {
      setTitle(track.title);
      setArtist(track.artist);
      setThumbnail(track.thumbnail || '');
      setShowUrlInput(false);
      setCustomUrl('');
    }
  }, [track, isOpen]);

  if (!track) return null;

  const handleImageFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === 'string') {
        setThumbnail(reader.result);
      }
    };
    reader.readAsDataURL(file);
  };

  const handleApplyUrl = () => {
    if (customUrl.trim().length > 0) {
      setThumbnail(customUrl.trim());
      setShowUrlInput(false);
    }
  };

  const handleSave = () => {
    onSave({
      title: title.trim() || track.title,
      artist: artist.trim() || track.artist,
      thumbnail: thumbnail || track.thumbnail,
    });
    onClose();
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-[120] flex items-center justify-center p-4">
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 bg-black/80 backdrop-blur-md"
          />

          {/* Modal Container */}
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 15 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 15 }}
            transition={{ type: 'spring', damping: 26, stiffness: 350 }}
            className="relative w-full max-w-sm bg-[#1A1818] border border-white/10 rounded-3xl p-6 shadow-2xl z-10 space-y-5"
          >
            {/* Header */}
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-bold text-white tracking-tight">
                {t.editTrackModalTitle || 'Редактирование трека'}
              </h3>
              <button
                type="button"
                onClick={onClose}
                className="w-8 h-8 rounded-full bg-white/5 hover:bg-white/10 text-neutral-400 hover:text-white flex items-center justify-center transition-colors cursor-pointer"
              >
                <X size={18} />
              </button>
            </div>

            {/* Artwork Cover Preview & Change */}
            <div className="flex items-center space-x-4">
              <div className="relative w-20 h-20 rounded-2xl overflow-hidden bg-neutral-900 border border-white/10 shrink-0 shadow-lg group">
                {thumbnail ? (
                  <img
                    src={getHighResThumbnail(thumbnail)}
                    alt={title}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-neutral-600">
                    <Disc3 size={32} />
                  </div>
                )}
              </div>

              <div className="flex-1 space-y-1.5">
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  onChange={handleImageFileChange}
                  className="hidden"
                />

                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="w-full py-2 px-3 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-xs font-semibold text-white flex items-center justify-center space-x-1.5 transition-colors cursor-pointer"
                >
                  <ImagePlus size={14} />
                  <span>{t.changeCoverBtn || 'Выбрать фото'}</span>
                </button>

                <button
                  type="button"
                  onClick={() => setShowUrlInput(!showUrlInput)}
                  className="w-full py-1.5 px-3 rounded-xl hover:bg-white/5 text-[11px] font-medium text-neutral-400 hover:text-neutral-300 flex items-center justify-center space-x-1 transition-colors cursor-pointer"
                >
                  <Link size={12} />
                  <span>{showUrlInput ? t.cancel : t.orEnterImageUrl || 'Указать ссылку'}</span>
                </button>
              </div>
            </div>

            {/* URL input field if toggled */}
            {showUrlInput && (
              <div className="flex space-x-2">
                <input
                  type="url"
                  placeholder="https://..."
                  value={customUrl}
                  onChange={(e) => setCustomUrl(e.target.value)}
                  className="flex-1 px-3 py-2 rounded-xl bg-black/40 border border-white/10 text-xs text-white placeholder-neutral-500 focus:outline-none focus:border-white/30"
                />
                <button
                  type="button"
                  onClick={handleApplyUrl}
                  className="px-3 py-2 rounded-xl bg-white/10 hover:bg-white/20 text-xs font-bold text-white transition-colors cursor-pointer"
                >
                  OK
                </button>
              </div>
            )}

            {/* Title & Artist Input Fields */}
            <div className="space-y-3">
              <div>
                <label className="text-[11px] font-bold text-neutral-400 uppercase tracking-wider block mb-1.5">
                  {t.trackTitleLabel || 'Название трека'}
                </label>
                <input
                  type="text"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="Title"
                  className="w-full px-3.5 py-2.5 rounded-2xl bg-black/40 border border-white/10 text-sm text-white placeholder-neutral-600 focus:outline-none focus:border-white/30 transition-all font-medium"
                />
              </div>

              <div>
                <label className="text-[11px] font-bold text-neutral-400 uppercase tracking-wider block mb-1.5">
                  {t.trackArtistLabel || 'Исполнитель'}
                </label>
                <input
                  type="text"
                  value={artist}
                  onChange={(e) => setArtist(e.target.value)}
                  placeholder="Artist"
                  className="w-full px-3.5 py-2.5 rounded-2xl bg-black/40 border border-white/10 text-sm text-white placeholder-neutral-600 focus:outline-none focus:border-white/30 transition-all font-medium"
                />
              </div>
            </div>

            {/* Actions */}
            <div className="flex space-x-2.5 pt-2">
              <button
                type="button"
                onClick={onClose}
                className="flex-1 py-3 rounded-2xl bg-white/5 hover:bg-white/10 text-xs font-bold text-neutral-300 transition-colors cursor-pointer"
              >
                {t.cancel}
              </button>
              <button
                type="button"
                onClick={handleSave}
                className="flex-1 py-3 rounded-2xl bg-white hover:bg-neutral-100 text-xs font-bold text-black flex items-center justify-center space-x-1.5 transition-all shadow-lg active:scale-98 cursor-pointer"
              >
                <Check size={16} className="stroke-[2.5]" />
                <span>{t.saveMetadataBtn || 'Сохранить'}</span>
              </button>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
};
