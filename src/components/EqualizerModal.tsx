import React, { useRef } from 'react';
import { Sliders, X, Sparkles, Volume2 } from 'lucide-react';
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
  const trackRef = useRef<HTMLDivElement>(null);

  const calculateGain = (clientY: number) => {
    if (!trackRef.current) return;
    const rect = trackRef.current.getBoundingClientRect();
    const clampedY = Math.max(0, Math.min(rect.height, clientY - rect.top));
    const ratio = 1 - clampedY / rect.height; // 1 at top (+12), 0 at bottom (-12)
    const newGain = Math.round((ratio * 24 - 12) * 2) / 2; // step of 0.5 dB
    onChange(Math.max(-12, Math.min(12, newGain)));
  };

  const handlePointerDown = (e: React.PointerEvent) => {
    e.currentTarget.setPointerCapture(e.pointerId);
    calculateGain(e.clientY);
  };

  const handlePointerMove = (e: React.PointerEvent) => {
    if (e.buttons === 1) {
      calculateGain(e.clientY);
    }
  };

  const percent = ((gain + 12) / 24) * 100; // 0% at -12dB, 50% at 0dB, 100% at +12dB

  return (
    <div className="flex flex-col items-center h-full justify-between select-none">
      <span className="text-[9px] font-mono font-medium text-neutral-400">
        {gain > 0 ? `+${gain.toFixed(0)}` : gain.toFixed(0)}
      </span>

      <div
        ref={trackRef}
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        className="relative flex items-center justify-center h-28 w-6 cursor-pointer touch-none py-1 group"
      >
        {/* Track groove */}
        <div className="w-1.5 h-full bg-white/10 rounded-full relative overflow-hidden">
          {/* Active fill from center 0dB */}
          <div
            className="absolute w-full rounded-full transition-all duration-75"
            style={{
              backgroundColor: accentColor,
              bottom: gain >= 0 ? '50%' : `${percent}%`,
              top: gain >= 0 ? `${100 - percent}%` : '50%',
            }}
          />
        </div>

        {/* Center 0dB tick indicator */}
        <div className="absolute top-1/2 left-0.5 right-0.5 h-[1px] bg-white/20 pointer-events-none" />

        {/* Fader Knob / Thumb */}
        <div
          className="absolute w-4 h-4 rounded-full bg-white shadow-lg border border-black/20 pointer-events-none transition-transform duration-75 group-active:scale-125"
          style={{
            bottom: `calc(${percent}% - 8px)`,
          }}
        />
      </div>

      <span className="text-[9px] text-neutral-400 font-mono scale-90 truncate max-w-full">
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

  if (!isOpen) return null;

  const presets = [
    { id: 'flat', label: t.presetFlat },
    { id: 'bass_boost', label: t.presetBassBoost },
    { id: 'vocal', label: t.presetVocal },
    { id: 'rock', label: t.presetRock },
    { id: 'electronic', label: t.presetElectronic },
    { id: 'pop', label: t.presetPop },
  ];

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-black/80 backdrop-blur-md animate-fade-in">
      <div className="bg-[#181616] border-t sm:border border-white/10 rounded-t-3xl sm:rounded-3xl w-full max-w-md p-6 max-h-[85vh] overflow-y-auto space-y-6 shadow-2xl">
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
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-white/5 hover:bg-white/10 flex items-center justify-center text-neutral-400 hover:text-white transition-colors cursor-pointer"
          >
            <X size={18} />
          </button>
        </div>

        {/* Presets Grid */}
        <div className="space-y-2">
          <label className="text-xs font-semibold text-neutral-400 flex items-center space-x-1.5 uppercase tracking-wider">
            <Sparkles size={14} style={{ color: accentColor }} />
            <span>{t.presets}</span>
          </label>
          <div className="grid grid-cols-2 gap-2">
            {presets.map((preset) => (
              <button
                key={preset.id}
                onClick={() => onSelectPreset(preset.id)}
                className={`text-left text-xs px-3.5 py-2.5 rounded-xl border transition-all cursor-pointer font-medium ${
                  activePreset === preset.id
                    ? 'border-transparent text-white shadow-md'
                    : 'border-white/5 bg-white/5 text-neutral-300 hover:bg-white/10 hover:text-white'
                }`}
                style={{
                  backgroundColor: activePreset === preset.id ? accentColor : undefined,
                }}
              >
                {preset.label}
              </button>
            ))}
          </div>
        </div>

        {/* Bass Boost Slider */}
        <div className="space-y-2 bg-white/5 p-4 rounded-2xl border border-white/5">
          <div className="flex items-center justify-between text-xs">
            <span className="font-semibold text-neutral-300 flex items-center space-x-1.5">
              <Volume2 size={16} style={{ color: accentColor }} />
              <span>{t.bassBoost}</span>
            </span>
            <span className="font-mono text-neutral-400">+{bassBoost.toFixed(1)} dB</span>
          </div>
          <input
            type="range"
            min={0}
            max={15}
            step={0.5}
            value={bassBoost}
            onChange={(e) => onBassBoostChange(parseFloat(e.target.value))}
            className="w-full accent-white h-1.5 bg-white/10 rounded-lg appearance-none cursor-pointer"
            style={{ accentColor }}
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
      </div>
    </div>
  );
};
