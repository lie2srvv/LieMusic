import React, { useState } from 'react';
import { Radio, Check } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { translations, Language } from '../i18n/translations';

interface CellularDownloadModalProps {
  isOpen: boolean;
  count: number;
  language: Language;
  onConfirm: (dontAskAgain: boolean) => void;
  onCancel: () => void;
}

export const CellularDownloadModal: React.FC<CellularDownloadModalProps> = ({
  isOpen,
  count,
  language,
  onConfirm,
  onCancel,
}) => {
  const [dontAskAgain, setDontAskAgain] = useState(false);
  const t = translations[language];

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          key="cellular-modal"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.15 }}
          onClick={onCancel}
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md"
        >
          <motion.div
            initial={{ scale: 0.92, opacity: 0, y: 15 }}
            animate={{ scale: 1, opacity: 1, y: 0 }}
            exit={{ scale: 0.92, opacity: 0, y: 15 }}
            transition={{ type: 'spring', stiffness: 380, damping: 28 }}
            onClick={(e) => e.stopPropagation()}
            className="bg-[#1C1A1A] border border-white/10 rounded-3xl w-full max-w-sm p-6 shadow-2xl space-y-4"
          >
            {/* Header Icon & Title */}
            <div className="flex items-center space-x-3">
              <div className="w-11 h-11 rounded-2xl bg-amber-500/15 border border-amber-500/30 flex items-center justify-center text-amber-400 shrink-0">
                <Radio size={22} />
              </div>
              <div className="min-w-0 flex-1">
                <h3 className="text-base font-bold text-white">
                  {t.cellularTitle}
                </h3>
                <p className="text-xs text-neutral-400 mt-0.5">
                  {count > 1 ? t.cellularMessageMultiple(count) : t.cellularMessageSingle}
                </p>
              </div>
            </div>

            <p className="text-xs text-neutral-300 leading-relaxed bg-white/5 p-3 rounded-2xl border border-white/5">
              {t.cellularDataWarning}
            </p>

            {/* Checkbox "Больше не спрашивать" */}
            <label
              onClick={() => setDontAskAgain((prev) => !prev)}
              className="flex items-center space-x-3 cursor-pointer select-none py-1 group"
            >
              <div
                className={`w-5 h-5 rounded-lg flex items-center justify-center transition-all border ${
                  dontAskAgain
                    ? 'bg-amber-500 border-amber-500 text-black'
                    : 'border-white/20 bg-white/5 group-hover:border-white/40'
                }`}
              >
                {dontAskAgain && <Check size={14} className="stroke-[3]" />}
              </div>
              <span className="text-xs font-medium text-neutral-300 group-hover:text-white transition-colors">
                {t.cellularDontAskAgain}
              </span>
            </label>

            {/* Buttons */}
            <div className="grid grid-cols-2 gap-3 pt-1">
              <motion.button
                type="button"
                onClick={onCancel}
                whileTap={{ scale: 0.94 }}
                className="py-3 px-4 rounded-2xl bg-white/5 hover:bg-white/10 text-neutral-300 font-medium text-sm transition-colors border border-white/5 cursor-pointer"
              >
                {t.cancel}
              </motion.button>
              <motion.button
                type="button"
                onClick={() => onConfirm(dontAskAgain)}
                whileTap={{ scale: 0.94 }}
                className="py-3 px-4 rounded-2xl bg-amber-500 hover:bg-amber-400 text-black font-semibold text-sm shadow-lg shadow-amber-900/30 transition-colors cursor-pointer"
              >
                {t.confirmDownload}
              </motion.button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};
