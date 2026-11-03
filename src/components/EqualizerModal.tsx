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

  const clampedGain = Math.max(-12, Math.min(12, gain));
  const percent = ((clampedGain + 12) / 24) * 100;

  const updateFromPointer = (clientY: number) => {
    if (!containerRef.current) return;
    const rect = containerRef.current.getBoundingClientRect();
    const height = rect.height;
    if (height <= 0) return;

    const clampedY = Math.max(0, Math.min(height, clientY - rect.top));
    const ratio = 1 - clampedY / height;
    const rawGain = ratio * 24 - 12;
    const rounded = Math.round(rawGain * 2) / 2;
    onChange(rounded);
  };

  const handlePointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    isDragging.current = true;
    try {
      e.currentTarget.setPointerCapture(e.pointerId);
    } catch {
      // Ignored if pointer capture is not supported by device
    }
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
        e.currentTarget.releasePointerCapture(e.pointerId);
      } catch {
        // Ignored
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
          className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-black/75 touch-none"
        >
          <motion.div
            initial={{ y: '100%', opacity: 0.7 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: '100%', opacity: 0.2 }}
            transition={{ type: 'spring', stiffness: 380, damping: 32 }}
            drag="y"
            dragConstraints={{ top: 0, bottom: 0 }}
            dragElastic={{ top: 0, bottom: 0.5 }}
            dragSnapToOrigin
            onDragEnd={(_, info) => {
              if (info.offset.y > 60 || info.velocity.y > 180) {
                onClose();
              }
            }}
            onClick={(e) => e.stopPropagation()}
            className="bg-[#181616] border-t sm:border border-white/10 rounded-t-3xl sm:rounded-3xl w-full max-w-md p-5 pb-7 max-h-[85vh] overflow-y-auto space-y-5 shadow-2xl flex flex-col will-change-transform"
          >
            {/* Pull down handle */}
            <div className="w-10 h-1 bg-white/25 rounded-full mx-auto -mt-1 mb-2 shrink-0 cursor-grab active:cursor-grabbing" />

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

              <button
                type="button"
                onClick={onClose}
                className="w-8 h-8 rounded-full bg-white/5 hover:bg-white/10 flex items-center justify-center text-neutral-400 hover:text-white transition-colors cursor-pointer"
              >
                <X size={18} />
              </button>
            </div>

            {/* Presets Grid */}
            <div className="space-y-2">
              <span className="text-[11px] font-semibold text-neutral-400 uppercase tracking-wider flex items-center space-x-1.5">
                <Sparkles size={12} style={{ color: accentColor }} />
                <span>{t.presets}</span>
              </span>
              <div className="grid grid-cols-2 gap-2">
                {presets.map((preset) => {
                  const isActive = activePreset === preset.id;
                  return (
                    <button
                      key={preset.id}
                      type="button"
                      onClick={() => onSelectPreset(preset.id)}
                      className={`px-3 py-2.5 rounded-2xl text-xs font-semibold transition-all cursor-pointer border text-left truncate ${
                        isActive
                          ? 'border-transparent text-white shadow-lg'
                          : 'bg-white/5 hover:bg-white/10 text-neutral-300 border-white/5'
                      }`}
                      style={{
                        backgroundColor: isActive ? accentColor : undefined,
                      }}
                    >
                      {preset.label}
                    </button>
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
