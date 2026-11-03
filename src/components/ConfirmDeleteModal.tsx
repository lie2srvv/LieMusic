import React, { useState } from 'react';
import { Trash2, Check } from 'lucide-react';
import { translations, Language } from '../i18n/translations';

interface ConfirmDeleteModalProps {
  isOpen: boolean;
  count: number;
  trackTitle?: string;
  language: Language;
  onConfirm: (dontAskAgain: boolean) => void;
  onCancel: () => void;
}

export const ConfirmDeleteModal: React.FC<ConfirmDeleteModalProps> = ({
  isOpen,
  count,
  trackTitle,
  language,
  onConfirm,
  onCancel,
}) => {
  const [dontAskAgain, setDontAskAgain] = useState(false);
  const t = translations[language];

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-fade-in">
      <div className="bg-[#1C1A1A] border border-white/10 rounded-3xl w-full max-w-sm p-6 shadow-2xl space-y-4">
        {/* Header Icon & Title */}
        <div className="flex items-center space-x-3">
          <div className="w-11 h-11 rounded-2xl bg-rose-500/15 border border-rose-500/30 flex items-center justify-center text-rose-400 shrink-0">
            <Trash2 size={22} />
          </div>
          <div className="min-w-0 flex-1">
            <h3 className="text-base font-bold text-white">
              {count > 1 ? t.deleteTitleMultiple : t.deleteTitleSingle}
            </h3>
            <p className="text-xs text-neutral-400 mt-0.5 line-clamp-1">
              {count === 1 && trackTitle
                ? t.deleteMessageSingle(trackTitle)
                : t.deleteMessageMultiple(count)}
            </p>
          </div>
        </div>

        <p className="text-xs text-neutral-300 leading-relaxed bg-white/5 p-3 rounded-2xl border border-white/5">
          {t.deleteNotice}
        </p>

        {/* Checkbox "Больше не спрашивать" */}
        <label
          onClick={() => setDontAskAgain((prev) => !prev)}
          className="flex items-center space-x-3 cursor-pointer select-none py-1 group"
        >
          <div
            className={`w-5 h-5 rounded-lg flex items-center justify-center transition-all border ${
              dontAskAgain
                ? 'bg-rose-500 border-rose-500 text-white'
                : 'border-white/20 bg-white/5 group-hover:border-white/40'
            }`}
          >
            {dontAskAgain && <Check size={14} className="stroke-[3] cursor-pointer" />}
          </div>
          <span className="text-xs font-medium text-neutral-300 group-hover:text-white transition-colors">
            {t.dontAskAgain}
          </span>
        </label>

        {/* Buttons */}
        <div className="grid grid-cols-2 gap-3 pt-1">
          <button
            onClick={onCancel}
            className="py-3 px-4 rounded-2xl bg-white/5 hover:bg-white/10 text-neutral-300 font-medium text-sm transition-all border border-white/5 active:scale-95 cursor-pointer"
          >
            {t.cancel}
          </button>
          <button
            onClick={() => onConfirm(dontAskAgain)}
            className="py-3 px-4 rounded-2xl bg-rose-600 hover:bg-rose-500 text-white font-medium text-sm shadow-lg shadow-rose-900/30 transition-all active:scale-95 cursor-pointer"
          >
            {t.confirmDelete}
          </button>
        </div>
      </div>
    </div>
  );
};
