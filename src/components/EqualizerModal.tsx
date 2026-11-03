import React, { useRef } from 'react';
import { Sliders, X, Sparkles, Volume2 } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { translations, Language } from '../i18n/translations';

interface EqualizerModalProps {
  isOpen: boolean;
  onClose: () => void;
  accentColor?: string;
  equalizerBands: number[];
  bassBoost: number;
  activePreset: string;
  onBandChange: (index: number, value: number) => void;
  onBassBoostChange: (value: number) => void;
  onSelectPreset: (presetName: string) => void;
  language: Language;
}

const FREQUENCY_LABELS = ['31Hz', '62Hz', '125Hz', '250Hz', '500Hz', '1kHz', '2kHz', '4kHz', '8kHz', '16kHz'];

interface VerticalFaderProps {
  gain: number;
  label: string;
  accentColor: string;
  onChange: (value: number) => void;
}

const VerticalFader: React.FC<VerticalFaderProps> = ({
  gain,
  label,
  accentColor,
  onChange,
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const isDragging = useRef(false);

  // gain is -12 dB to +12 dB
  // percent from bottom: (-12 -> 0%, 0 -> 50%, +12 -> 100%)
  const clampedGain = Math.max(-12, Math.min(12, gain));
  const percent = ((clampedGain + 12) / 24) * 100;

  const updateFromPointer = (clientY: number) => {
    if (!containerRef.current) return;
    const rect = containerRef.current.getBoundingClientRect();
    const height = rect.height;
    if (height <= 0) return;

    const clampedY = Math.max(0, Math.min(height, clientY - rect.top));
    // 0 is top (+12), height is bottom (-12)
    const ratio = 1 - clampedY / height; // 0 (bottom) to 1 (top)
    const rawGain = ratio * 24 - 12; // -12 to +12
    const rounded = Math.round(rawGain * 2) / 2; // 0.5 step
    onChange(rounded);
  };

  const handlePointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    isDragging.current = true;
    (e.target as HTMLElement).setPointerCapture?.(e.pointerId);
    updateFromPointer(e.clientY);
  };

  const handlePointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!isDragging.current) return;
    updateFromPointer(e.clientY);
  };

  const handlePointerUp = (e: React.PointerEvent<HTMLDivElement>) => {
    if (isDragging.current) {
      isDragging.current = false;
      try {
        (e.target as HTMLElement).releasePointerCapture?.(e.pointerId);
      } catch {
        // ignore
      }
    }
  };

  return (
    <div className="flex flex-col items-center select-none h-full justify-between py-1">
      {/* Gain readout */}
      <span className="text-[10px] font-mono text-neutral-400 h-3 flex items-center justify-center">
        {clampedGain > 0 ? `+${clampedGain}` : clampedGain}
      </span>

      {/* Vertical Slider Track Container */}
      <div
        ref={containerRef}
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onPointerCancel={handlePointerUp}
        className="relative w-7 h-28 flex justify-center items-center cursor-pointer touch-none"
      >
        {/* Track groove */}
        <div className="w-1.5 h-full bg-white/10 rounded-full relative overflow-hidden">
          {/* Active fill from center (50%) to thumb */}
          <div
            className="absolute left-0 right-0 rounded-full transition-all duration-75"
            style={{
              backgroundColor: accentColor,
              bottom: percent >= 50 ? '50%' : `${percent}%`,
              top: percent >= 50 ? `${100 - percent}%` : '50%',
            }}
          />
        </div>

        {/* Center 0dB tick indicator */}
        <div className="absolute w-2.5 h-0.5 bg-white/20 rounded-full pointer-events-none top-1/2 -translate-y-1/2" />

        {/* Thumb */}
        <div
          className="absolute w-4.5 h-4.5 rounded-full bg-white shadow-[0_2px_8px_rgba(0,0,0,0.6)] border border-white/80 pointer-events-none transition-transform duration-75"
          style={{
            bottom: `calc(${percent}% - 9px)`,
          }}
        />
      </div>

      {/* Frequency label */}
      <span className="text-[9px] text-neutral-400 font-medium tracking-tighter">
        {label}
      </span>
    </div>
  );
};

export const EqualizerModal: React.FC<EqualizerModalProps> = ({
  isOpen,
  onClose,
  accentColor = '#FF3366',
  equalizerBands,
  bassBoost,
  activePreset,
  onBandChange,
  onBassBoostChange,
  onSelectPreset,
  language,
}) => {
  const t = translations[language];

  const presets = [
    { id: 'flat', label: t.presetFlat },
    { id: 'bass_boost', label: t.presetBassBoost },
    { id: 'vocal', label: t.presetVocal },
    { id: 'rock', label: t.presetRock },
    { id: 'electronic', label: t.presetElectronic },
    { id: 'pop', label: t.presetPop },
  ];

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          key="equalizer-modal"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.18 }}
          onClick={onClose}
          className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-black/80 backdrop-blur-md"
        >
          <motion.div
            initial={{ y: '100%', opacity: 0.8 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: '100%', opacity: 0 }}
            transition={{ type: 'spring', stiffness: 350, damping: 32 }}
            onClick={(e) => e.stopPropagation()}
            className="bg-[#181616] border-t sm:border border-white/10 rounded-t-3xl sm:rounded-3xl w-full max-w-md p-6 max-h-[85vh] overflow-y-auto space-y-6 shadow-2xl"
          >
            {/* Header */}
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-3">
                <div
                  className="w-9 h-9 rounded-xl flex items-center justify-center"
                  style={{ backgroundColor: `${accentColor}25`, color: accentColor }}
                >
                  <Sliders size={20} />
                </div>
                <div>
                  <h3 className="text-base font-bold text-white">
                    {t.tenBandEqualizer}
                  </h3>
                  <p className="text-xs text-neutral-400">
                    {t.equalizerSubtitle}
                  </p>
                </div>
              </div>

              <motion.button
                type="button"
                onClick={onClose}
                whileTap={{ scale: 0.88 }}
                className="w-8 h-8 rounded-full bg-white/5 hover:bg-white/10 flex items-center justify-center text-neutral-400 hover:text-white transition-colors cursor-pointer"
              >
                <X size={18} />
              </motion.button>
            </div>

            {/* Presets Grid */}
            <div className="space-y-2">
              <label className="text-xs font-semibold text-neutral-400 flex items-center space-x-1.5 uppercase tracking-wider">
                <Sparkles size={14} style={{ color: accentColor }} />
                <span>{t.presets}</span>
              </label>
              <div className="grid grid-cols-2 gap-2">
                {presets.map((preset) => {
                  const isActive = activePreset === preset.id;
                  return (
                    <motion.button
                      type="button"
                      key={preset.id}
                      onClick={() => onSelectPreset(preset.id)}
                      whileTap={{ scale: 0.94 }}
                      className={`py-2 px-3 rounded-xl text-xs font-semibold transition-all cursor-pointer ${
                        isActive
                          ? 'text-neutral-900 shadow-md font-bold'
                          : 'bg-white/5 text-neutral-300 hover:bg-white/10'
                      }`}
                      style={{
                        backgroundColor: isActive ? '#FFFFFF' : undefined,
                      }}
                    >
                      {preset.label}
                    </motion.button>
                  );
                })}
              </div>
            </div>

            {/* Bass Boost Knob / Slider */}
            <div className="space-y-2 bg-white/5 p-4 rounded-2xl border border-white/5">
              <div className="flex items-center justify-between">
                <label className="text-xs font-medium text-neutral-200 flex items-center space-x-2">
                  <Volume2 size={16} style={{ color: accentColor }} />
                  <span>{t.bassBoost}</span>
                </label>
                <span className="text-xs font-mono text-neutral-400">
                  {bassBoost > 0 ? `+${bassBoost.toFixed(1)}` : bassBoost.toFixed(1)} dB
                </span>
              </div>
              <input
                type="range"
                min="0"
                max="25"
                step="0.5"
                value={bassBoost}
                onChange={(e) => onBassBoostChange(Number(e.target.value))}
                className="w-full h-1.5 bg-neutral-800 rounded-lg appearance-none cursor-pointer"
                style={{ accentColor: accentColor }}
              />
            </div>

            {/* 10-Band Graphic Equalizer Faders */}
            <div className="space-y-3 bg-white/5 p-4 rounded-2xl border border-white/5">
              <div className="flex items-center justify-between text-xs text-neutral-400 px-1 font-mono">
                <span>-12 dB</span>
                <span className="font-semibold text-neutral-300">0 dB</span>
                <span>+12 dB</span>
              </div>

              <div className="grid grid-cols-10 gap-1 pt-2 items-end h-40">
                {equalizerBands.map((gain, i) => (
                  <VerticalFader
                    key={i}
                    gain={gain}
                    label={FREQUENCY_LABELS[i]}
                    accentColor={accentColor}
                    onChange={(val) => onBandChange(i, val)}
                  />
                ))}
              </div>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};
