import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Play, Pause, SlidersHorizontal, Sparkles, Heart, Loader2, Globe } from 'lucide-react';
import { MoodPad, MoodCoordinates } from './MoodPad';
import { translations, Language } from '../i18n/translations';
import { WaveLanguageFilter } from '../services/waveService';
import { Track } from '../types';

interface WaveCardProps {
  language: Language;
  isWaveActive: boolean;
  isPlaying: boolean;
  isLoading?: boolean;
  currentTrack?: Track | null;
  onToggleWave: () => void;
  onMoodChange: (mood: MoodCoordinates) => void;
  onMoodCommit?: (mood: MoodCoordinates) => void;
  onModeChange: (mode: 'favorites' | 'discover') => void;
  onLanguageFilterChange?: (lang: WaveLanguageFilter) => void;
  currentMode: 'favorites' | 'discover';
  currentMood: MoodCoordinates;
  currentLanguageFilter?: WaveLanguageFilter;
}

export const WaveCard: React.FC<WaveCardProps> = ({
  language,
  isWaveActive,
  isPlaying,
  isLoading,
  onToggleWave,
  onMoodChange,
  onMoodCommit,
  onModeChange,
  onLanguageFilterChange,
  currentMode,
  currentMood,
  currentLanguageFilter = 'ru_en',
}) => {
  const t = translations[language];
  const [isMoodPadOpen, setIsMoodPadOpen] = useState(false);
  const [isLangMenuOpen, setIsLangMenuOpen] = useState(false);

  const langOptions: { id: WaveLanguageFilter; label: string }[] = [
    { id: 'ru_en', label: t.waveLangRuEn || 'RU + EN' },
    { id: 'ru', label: t.waveLangRu || 'Только RU' },
    { id: 'en', label: t.waveLangEn || 'Только EN' },
    { id: 'all', label: t.waveLangAll || 'Все языки' },
  ];

  return (
    <div className="relative rounded-3xl bg-gradient-to-br from-[#201D1D] via-[#1A1818] to-[#151313] border border-white/10 p-5 shadow-2xl overflow-hidden space-y-4">
      {/* Ambient background glow when wave is active */}
      {isWaveActive && (
        <motion.div
          animate={{
            opacity: [0.25, 0.5, 0.25],
            scale: [1, 1.08, 1],
          }}
          transition={{ duration: 4, repeat: Infinity, ease: 'easeInOut' }}
          className="absolute -right-16 -top-16 w-56 h-56 rounded-full bg-gradient-to-br from-purple-600/30 via-pink-600/20 to-transparent blur-3xl pointer-events-none"
        />
      )}

      {/* Header Row: Title & Big Play/Pause Button */}
      <div className="flex items-center justify-between relative z-10">
        <div className="space-y-1 min-w-0 flex-1 pr-3">
          <div className="flex items-center space-x-2">
            <span className="w-2.5 h-2.5 rounded-full bg-rose-500 shadow-[0_0_8px_#f43f5e] animate-pulse shrink-0" />
            <h2 className="text-xl font-extrabold text-white tracking-tight truncate">
              {t.myWave || 'Моя волна'}
            </h2>
          </div>
          <p className="text-xs text-neutral-400 font-medium truncate">
            {isLoading
              ? t.waveLoadingTracks || 'Подбираем треки под ваш вайб...'
              : isWaveActive
              ? `${t.wavePlaying || 'Волна играет'} · ${t.waveVibeUnderWay || 'Подстраивается под вас'}`
              : t.myWaveSubtitle || 'Умный бесконечный поток'}
          </p>
        </div>

        {/* Big Action Button (Rigid 56x56 px, never compressed) */}
        <motion.button
          type="button"
          onClick={onToggleWave}
          disabled={isLoading}
          whileTap={{ scale: 0.9 }}
          className={`w-14 h-14 min-w-[3.5rem] min-h-[3.5rem] max-w-[3.5rem] max-h-[3.5rem] shrink-0 rounded-full flex items-center justify-center transition-all cursor-pointer shadow-2xl relative ${
            isWaveActive && isPlaying
              ? 'bg-rose-500 text-white shadow-[0_0_24px_rgba(244,63,94,0.45)]'
              : 'bg-white text-black hover:bg-neutral-100 shadow-[0_4px_20px_rgba(255,255,255,0.25)]'
          }`}
          title={isWaveActive && isPlaying ? t.pause : t.startWave || 'Запустить волну'}
        >
          {isLoading ? (
            <Loader2 size={24} className="animate-spin text-neutral-800 shrink-0" />
          ) : isWaveActive && isPlaying ? (
            <Pause size={24} fill="currentColor" className="shrink-0" />
          ) : (
            <Play size={24} fill="currentColor" className="ml-1 shrink-0" />
          )}
        </motion.button>
      </div>

      {/* Mode Switcher, Language Pill & Mood Pad Toggle Row */}
      <div className="flex items-center justify-between pt-1 relative z-10 flex-wrap gap-2">
        {/* Pills: Favorites vs Discoveries */}
        <div className="flex items-center bg-black/40 p-1 rounded-2xl border border-white/5 space-x-1">
          <button
            type="button"
            onClick={() => onModeChange('favorites')}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold flex items-center space-x-1.5 transition-all cursor-pointer ${
              currentMode === 'favorites'
                ? 'bg-white/15 text-white shadow-sm'
                : 'text-neutral-400 hover:text-white'
            }`}
          >
            <Heart size={13} fill={currentMode === 'favorites' ? 'currentColor' : 'none'} />
            <span>{t.waveFavoritesMode || 'Любимое'}</span>
          </button>

          <button
            type="button"
            onClick={() => onModeChange('discover')}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold flex items-center space-x-1.5 transition-all cursor-pointer ${
              currentMode === 'discover'
                ? 'bg-white/15 text-white shadow-sm'
                : 'text-neutral-400 hover:text-white'
            }`}
          >
            <Sparkles size={13} />
            <span>{t.waveDiscoverMode || 'Открытия'}</span>
          </button>
        </div>

        <div className="flex items-center space-x-1.5">
          {/* Language filter dropdown toggle */}
          {onLanguageFilterChange && (
            <button
              type="button"
              onClick={() => setIsLangMenuOpen(!isLangMenuOpen)}
              className="px-2.5 py-1.5 rounded-2xl border border-white/5 bg-white/5 hover:bg-white/10 text-xs font-bold text-neutral-300 hover:text-white flex items-center space-x-1 transition-colors cursor-pointer"
              title="Фильтр по языку"
            >
              <Globe size={13} className="text-rose-400" />
              <span>{langOptions.find((o) => o.id === currentLanguageFilter)?.label || 'Язык'}</span>
            </button>
          )}

          {/* Toggle 2D Mood Pad */}
          <button
            type="button"
            onClick={() => setIsMoodPadOpen(!isMoodPadOpen)}
            className={`px-3 py-1.5 rounded-2xl border text-xs font-bold flex items-center space-x-1.5 transition-colors cursor-pointer ${
              isMoodPadOpen
                ? 'bg-white/15 border-white/20 text-white'
                : 'bg-white/5 border-white/5 text-neutral-400 hover:text-white'
            }`}
          >
            <SlidersHorizontal size={14} />
            <span>{t.waveMoodSettings || 'Настроение'}</span>
          </button>
        </div>
      </div>

      {/* Language Selection Bar (Expanded) */}
      <AnimatePresence>
        {isLangMenuOpen && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="overflow-hidden pt-1"
          >
            <div className="grid grid-cols-2 gap-1.5 bg-black/40 p-2 rounded-2xl border border-white/5">
              {langOptions.map((opt) => (
                <button
                  key={opt.id}
                  type="button"
                  onClick={() => {
                    onLanguageFilterChange?.(opt.id);
                    setIsLangMenuOpen(false);
                  }}
                  className={`px-3 py-2 rounded-xl text-xs font-bold transition-all text-left cursor-pointer flex items-center justify-between ${
                    currentLanguageFilter === opt.id
                      ? 'bg-rose-500/20 text-rose-300 border border-rose-500/30'
                      : 'bg-white/5 text-neutral-400 hover:text-white hover:bg-white/10'
                  }`}
                >
                  <span>{opt.label}</span>
                  {currentLanguageFilter === opt.id && (
                    <span className="w-1.5 h-1.5 rounded-full bg-rose-400" />
                  )}
                </button>
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Expandable 2D Mood Pad */}
      <AnimatePresence>
        {isMoodPadOpen && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.24, ease: 'easeOut' }}
            className="overflow-hidden pt-2"
          >
            <MoodPad
              initialMood={currentMood}
              onChange={onMoodChange}
              onCommit={onMoodCommit || onMoodChange}
              labels={{
                energetic: t.moodEnergetic || 'ЭНЕРГИЧНОЕ',
                cheerful: t.moodCheerful || 'ВЕСЕЛОЕ',
                calm: t.moodCalm || 'СПОКОЙНОЕ',
                sad: t.moodSad || 'ГРУСТНОЕ',
              }}
            />
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};
