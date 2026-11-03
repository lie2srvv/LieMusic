import React from 'react';
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

          <div className="grid grid-cols-10 gap-1.5 pt-2 items-end h-40">
            {equalizerBands.map((gain, i) => (
              <div key={i} className="flex flex-col items-center h-full justify-between group">
                <span className="text-[9px] font-mono text-neutral-400">
                  {gain > 0 ? `+${Math.round(gain)}` : Math.round(gain)}
                </span>
                <div className="relative flex items-center justify-center h-28 w-4">
                  <input
                    type="range"
                    min={-12}
                    max={12}
                    step={1}
                    value={gain}
                    onChange={(e) => onBandChange(i, parseFloat(e.target.value))}
                    className="h-28 w-2 appearance-none bg-white/10 rounded-full cursor-pointer -rotate-90 origin-center"
                    style={{ accentColor }}
                  />
                </div>
                <span className="text-[9px] text-neutral-400 font-mono scale-90 truncate max-w-full">
                  {FREQUENCY_LABELS[i]}
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};
