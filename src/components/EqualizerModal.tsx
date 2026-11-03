import React from 'react';
import { X, Sliders, Zap, Lock } from 'lucide-react';
import { EqualizerPreset } from '../types';
import { EQUALIZER_FREQUENCIES, DEFAULT_PRESETS } from '../services/audio';

interface EqualizerModalProps {
  isOpen: boolean;
  onClose: () => void;
  isPro: boolean;
  currentBands: number[];
  bassBoost: number;
  onBandChange: (index: number, gain: number) => void;
  onBassBoostChange: (level: number) => void;
  onSelectPreset: (preset: EqualizerPreset) => void;
  onOpenLiePay: () => void;
  accentColor: string;
}

export const EqualizerModal: React.FC<EqualizerModalProps> = ({
  isOpen,
  onClose,
  isPro,
  currentBands,
  bassBoost,
  onBandChange,
  onBassBoostChange,
  onSelectPreset,
  onOpenLiePay,
  accentColor,
}) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/80 backdrop-blur-md p-0 sm:p-4 animate-in fade-in duration-200">
      <div className="w-full max-w-lg bg-[#1D1B1B] border border-white/10 rounded-t-3xl sm:rounded-3xl p-5 shadow-2xl max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between pb-4 border-b border-white/5">
          <div className="flex items-center space-x-2.5">
            <div
              className="w-9 h-9 rounded-xl flex items-center justify-center"
              style={{ backgroundColor: `${accentColor}25`, color: accentColor }}
            >
              <Sliders size={20} />
            </div>
            <div>
              <h3 className="text-base font-bold text-white flex items-center space-x-2">
                <span>10-полосный эквалайзер</span>
                {!isPro && (
                  <span className="text-[10px] uppercase font-extrabold px-1.5 py-0.5 rounded bg-amber-500/20 text-amber-400 border border-amber-500/30">
                    Pro
                  </span>
                )}
              </h3>
              <p className="text-xs text-neutral-400">Настройка частот и глубокого баса</p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-white/5 hover:bg-white/10 flex items-center justify-center text-neutral-400 hover:text-white transition-colors"
          >
            <X size={18} />
          </button>
        </div>

        {/* Pro Banner if locked */}
        {!isPro && (
          <div className="mt-4 p-3.5 rounded-2xl bg-gradient-to-r from-amber-500/10 via-rose-500/10 to-amber-500/10 border border-amber-500/30 flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <Lock size={18} className="text-amber-400 shrink-0" />
              <div>
                <p className="text-xs font-semibold text-white">Эквалайзер доступен в Pro</p>
                <p className="text-[11px] text-neutral-300">249 ₽ один раз навсегда</p>
              </div>
            </div>
            <button
              onClick={onOpenLiePay}
              className="text-xs font-bold px-3 py-1.5 rounded-xl bg-amber-400 text-black hover:bg-amber-300 active:scale-95 transition-all shadow-md shrink-0 cursor-pointer"
            >
              Открыть
            </button>
          </div>
        )}

        {/* Presets */}
        <div className="mt-4">
          <label className="text-xs font-medium text-neutral-400 block mb-2">Пресеты звучания</label>
          <div className="flex flex-wrap gap-2">
            {DEFAULT_PRESETS.map((preset) => (
              <button
                key={preset.id}
                disabled={!isPro}
                onClick={() => onSelectPreset(preset)}
                className={`text-xs px-3 py-1.5 rounded-xl border transition-all ${
                  isPro
                    ? 'border-white/10 hover:border-white/30 bg-white/5 active:scale-95 cursor-pointer text-white'
                    : 'border-white/5 bg-white/5 text-neutral-500 opacity-60 cursor-not-allowed'
                }`}
              >
                {preset.name}
              </button>
            ))}
          </div>
        </div>

        {/* Bass Boost */}
        <div className="mt-5 p-3.5 rounded-2xl bg-[#211F1F] border border-white/5">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-semibold text-white flex items-center space-x-1.5">
              <Zap size={14} className="text-amber-400" />
              <span>Bass Boost (Усиление низких частот)</span>
            </span>
            <span className="text-xs font-mono font-bold" style={{ color: accentColor }}>
              {bassBoost}%
            </span>
          </div>
          <input
            type="range"
            min="0"
            max="100"
            disabled={!isPro}
            value={bassBoost}
            onChange={(e) => onBassBoostChange(Number(e.target.value))}
            className="w-full h-1.5 bg-neutral-700 rounded-lg appearance-none cursor-pointer accent-amber-400 disabled:opacity-40"
          />
        </div>

        {/* 10 Frequencies Sliders */}
        <div className="mt-5">
          <div className="grid grid-cols-10 gap-1 sm:gap-2 items-end h-44 px-1 py-2 bg-[#211F1F] rounded-2xl border border-white/5">
            {EQUALIZER_FREQUENCIES.map((freq, index) => {
              const gain = currentBands[index] || 0;
              const label = freq >= 1000 ? `${freq / 1000}k` : `${freq}`;

              return (
                <div key={freq} className="flex flex-col items-center h-full justify-between">
                  <span className="text-[9px] font-mono text-neutral-400">{gain > 0 ? `+${gain}` : gain}</span>
                  <div className="relative flex items-center justify-center h-28">
                    <input
                      type="range"
                      min="-12"
                      max="12"
                      step="1"
                      disabled={!isPro}
                      value={gain}
                      onChange={(e) => onBandChange(index, Number(e.target.value))}
                      className="slider-vertical w-1.5 h-24 bg-neutral-700 rounded appearance-none cursor-pointer disabled:opacity-40"
                      style={{
                        writingMode: 'vertical-lr',
                        direction: 'rtl',
                        accentColor: accentColor,
                      }}
                    />
                  </div>
                  <span className="text-[9px] font-medium text-neutral-400">{label}</span>
                </div>
              );
            })}
          </div>
        </div>

        <div className="mt-5 flex justify-end">
          <button
            onClick={onClose}
            className="w-full py-2.5 rounded-xl font-semibold text-sm transition-all active:scale-98 cursor-pointer"
            style={{ backgroundColor: accentColor, color: '#151313' }}
          >
            Готово
          </button>
        </div>
      </div>
    </div>
  );
};
