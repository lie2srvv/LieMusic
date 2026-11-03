import React, { useState } from 'react';
import { Check } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { Language } from '../i18n/translations';
import { FoxLogo } from './FoxLogo';

interface LanguageSelectModalProps {
  isOpen: boolean;
  currentLanguage: Language;
  onSelectLanguage: (lang: Language) => void;
  onClose: () => void;
}

export const LanguageSelectModal: React.FC<LanguageSelectModalProps> = ({
  isOpen,
  currentLanguage,
  onSelectLanguage,
  onClose,
}) => {
  const [selected, setSelected] = useState<Language>(currentLanguage);

  const handleConfirm = () => {
    onSelectLanguage(selected);
    onClose();
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          key="language-modal"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.15 }}
          onClick={onClose}
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-md"
        >
          <motion.div
            initial={{ scale: 0.92, opacity: 0, y: 15 }}
            animate={{ scale: 1, opacity: 1, y: 0 }}
            exit={{ scale: 0.92, opacity: 0, y: 15 }}
            transition={{ type: 'spring', stiffness: 380, damping: 28 }}
            onClick={(e) => e.stopPropagation()}
            className="relative w-full max-w-sm rounded-3xl bg-[#1A1818] border border-white/10 p-6 shadow-2xl text-center space-y-5"
          >
            {/* Glow Accent */}
            <div className="absolute -top-16 left-1/2 -translate-x-1/2 w-48 h-48 rounded-full bg-orange-500/20 blur-[60px] pointer-events-none" />

            {/* Fox Header */}
            <div className="flex flex-col items-center space-y-2 pt-1">
              <div className="p-3 rounded-2xl bg-white/5 border border-white/10 shadow-inner">
                <FoxLogo className="w-10 h-10 text-orange-500" />
              </div>
              <h2 className="text-xl font-bold text-white tracking-tight">
                {selected === 'ru' ? 'Выберите язык' : 'Choose Language'}
              </h2>
              <p className="text-xs text-neutral-400">
                {selected === 'ru'
                  ? 'Вы можете переключить его в любой момент'
                  : 'You can change this anytime from the header'}
              </p>
            </div>

            {/* Language Options */}
            <div className="space-y-2.5 pt-1 text-left">
              {/* Russian Option */}
              <motion.button
                type="button"
                onClick={() => setSelected('ru')}
                whileTap={{ scale: 0.96 }}
                className={`w-full flex items-center justify-between p-4 rounded-2xl border transition-all cursor-pointer ${
                  selected === 'ru'
                    ? 'bg-orange-500/15 border-orange-500/50 shadow-[0_0_20px_rgba(249,115,22,0.15)] ring-1 ring-orange-500/30'
                    : 'bg-white/5 border-white/5 hover:bg-white/10 text-neutral-300'
                }`}
              >
                <div className="flex items-center space-x-3.5">
                  <span className="text-2xl" role="img" aria-label="Russian">🇷🇺</span>
                  <div>
                    <p className="text-sm font-bold text-white">Русский</p>
                    <p className="text-[11px] text-neutral-400">Russian (RU)</p>
                  </div>
                </div>
                <div
                  className={`w-6 h-6 rounded-full flex items-center justify-center border transition-all ${
                    selected === 'ru'
                      ? 'bg-orange-500 border-orange-500 text-white shadow-md'
                      : 'border-white/20 bg-white/5'
                  }`}
                >
                  {selected === 'ru' && <Check size={14} className="stroke-[3]" />}
                </div>
              </motion.button>

              {/* English Option */}
              <motion.button
                type="button"
                onClick={() => setSelected('en')}
                whileTap={{ scale: 0.96 }}
                className={`w-full flex items-center justify-between p-4 rounded-2xl border transition-all cursor-pointer ${
                  selected === 'en'
                    ? 'bg-orange-500/15 border-orange-500/50 shadow-[0_0_20px_rgba(249,115,22,0.15)] ring-1 ring-orange-500/30'
                    : 'bg-white/5 border-white/5 hover:bg-white/10 text-neutral-300'
                }`}
              >
                <div className="flex items-center space-x-3.5">
                  <span className="text-2xl" role="img" aria-label="English">🇬🇧</span>
                  <div>
                    <p className="text-sm font-bold text-white">English</p>
                    <p className="text-[11px] text-neutral-400">English (US/UK)</p>
                  </div>
                </div>
                <div
                  className={`w-6 h-6 rounded-full flex items-center justify-center border transition-all ${
                    selected === 'en'
                      ? 'bg-orange-500 border-orange-500 text-white shadow-md'
                      : 'border-white/20 bg-white/5'
                  }`}
                >
                  {selected === 'en' && <Check size={14} className="stroke-[3]" />}
                </div>
              </motion.button>
            </div>

            {/* Confirm Button */}
            <div className="pt-2">
              <motion.button
                type="button"
                onClick={handleConfirm}
                whileTap={{ scale: 0.94 }}
                className="w-full py-3.5 rounded-2xl bg-gradient-to-r from-orange-500 to-amber-500 hover:from-orange-400 hover:to-amber-400 text-white font-bold text-sm shadow-lg shadow-orange-950/40 transition-all cursor-pointer"
              >
                {selected === 'ru' ? 'Продолжить' : 'Continue'}
              </motion.button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};
