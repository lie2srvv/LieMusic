import React, { useState } from 'react';
import { Trash2, Check } from 'lucide-react';

interface ConfirmDeleteModalProps {
  isOpen: boolean;
  count: number;
  trackTitle?: string;
  onConfirm: (dontAskAgain: boolean) => void;
  onCancel: () => void;
}

export const ConfirmDeleteModal: React.FC<ConfirmDeleteModalProps> = ({
  isOpen,
  count,
  trackTitle,
  onConfirm,
  onCancel,
}) => {
  const [dontAskAgain, setDontAskAgain] = useState<boolean>(false);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="w-full max-w-sm rounded-3xl bg-[#1C1A1A] border border-white/10 p-6 shadow-2xl space-y-5">
        <div className="flex items-center space-x-3.5">
          <div className="w-12 h-12 rounded-2xl bg-rose-500/15 text-rose-400 flex items-center justify-center shrink-0 border border-rose-500/20">
            <Trash2 size={24} />
          </div>
          <div>
            <h3 className="text-base font-bold text-white">
              {count > 1 ? `Удалить ${count} треков?` : 'Удалить трек?'}
            </h3>
            <p className="text-xs text-neutral-400 mt-0.5 line-clamp-1">
              {count === 1 && trackTitle ? trackTitle : 'Файлы будут стёрты из памяти устройства.'}
            </p>
          </div>
        </div>

        <p className="text-xs text-neutral-300 leading-relaxed bg-white/5 p-3 rounded-2xl border border-white/5">
          Трек больше не будет доступен офлайн без интернета. Вы всегда сможете скачать его снова.
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
            {dontAskAgain && <Check size={14} className="stroke-[3]" />}
          </div>
          <span className="text-xs font-medium text-neutral-300 group-hover:text-white transition-colors">
            Больше не спрашивать
          </span>
        </label>

        {/* Buttons */}
        <div className="grid grid-cols-2 gap-3 pt-1">
          <button
            onClick={onCancel}
            className="py-3 px-4 rounded-2xl bg-white/5 hover:bg-white/10 text-neutral-300 font-medium text-sm transition-all border border-white/5 active:scale-95 cursor-pointer"
          >
            Отмена
          </button>
          <button
            onClick={() => onConfirm(dontAskAgain)}
            className="py-3 px-4 rounded-2xl bg-rose-600 hover:bg-rose-500 text-white font-medium text-sm shadow-lg shadow-rose-900/30 transition-all active:scale-95 cursor-pointer"
          >
            Удалить
          </button>
        </div>
      </div>
    </div>
  );
};
