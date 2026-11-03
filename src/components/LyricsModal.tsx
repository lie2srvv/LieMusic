import React, { useEffect, useRef } from 'react';
import { X, Mic2, Lock } from 'lucide-react';
import { LyricsLine } from '../types';

interface LyricsModalProps {
  isOpen: boolean;
  onClose: () => void;
  trackTitle: string;
  trackArtist: string;
  syncedLyrics: LyricsLine[];
  plainLyrics: string;
  currentTimeMs: number;
  onSeekToMs: (ms: number) => void;
  accentColor: string;
  isPro: boolean;
  onOpenLiePay: () => void;
}

export const LyricsModal: React.FC<LyricsModalProps> = ({
  isOpen,
  onClose,
  trackTitle,
  trackArtist,
  syncedLyrics,
  plainLyrics,
  currentTimeMs,
  onSeekToMs,
  accentColor,
  isPro,
  onOpenLiePay,
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const activeLineRef = useRef<HTMLParagraphElement>(null);

  // Find active line index
  let activeIndex = -1;
  for (let i = 0; i < syncedLyrics.length; i++) {
    if (currentTimeMs >= syncedLyrics[i].timeMs) {
      activeIndex = i;
    } else {
      break;
    }
  }

  // Smooth scroll to active line
  useEffect(() => {
    if (activeLineRef.current && containerRef.current) {
      activeLineRef.current.scrollIntoView({
        behavior: 'smooth',
        block: 'center',
      });
    }
  }, [activeIndex]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/85 backdrop-blur-xl p-0 sm:p-4 animate-in fade-in duration-200">
      <div className="w-full max-w-lg bg-[#181616] border border-white/10 rounded-t-3xl sm:rounded-3xl p-5 shadow-2xl h-[85vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between pb-4 border-b border-white/5 shrink-0">
          <div className="flex items-center space-x-2.5 overflow-hidden">
            <div
              className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0"
              style={{ backgroundColor: `${accentColor}25`, color: accentColor }}
            >
              <Mic2 size={20} />
            </div>
            <div className="overflow-hidden">
              <h3 className="text-sm font-bold text-white truncate flex items-center space-x-2">
                <span>{trackTitle}</span>
                {!isPro && (
                  <span className="text-[10px] uppercase font-extrabold px-1.5 py-0.5 rounded bg-amber-500/20 text-amber-400 border border-amber-500/30">
                    Pro
                  </span>
                )}
              </h3>
              <p className="text-xs text-neutral-400 truncate">{trackArtist}</p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-white/5 hover:bg-white/10 flex items-center justify-center text-neutral-400 hover:text-white transition-colors shrink-0"
          >
            <X size={18} />
          </button>
        </div>

        {/* Pro Banner if locked */}
        {!isPro && (
          <div className="mt-3 p-3 rounded-2xl bg-gradient-to-r from-amber-500/10 via-rose-500/10 to-amber-500/10 border border-amber-500/30 flex items-center justify-between shrink-0">
            <div className="flex items-center space-x-2.5">
              <Lock size={16} className="text-amber-400 shrink-0" />
              <div>
                <p className="text-xs font-semibold text-white">Караоке-тексты в Pro</p>
                <p className="text-[11px] text-neutral-300">249 ₽ навсегда</p>
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

        {/* Lyrics Content */}
        <div
          ref={containerRef}
          className="flex-1 overflow-y-auto py-6 px-2 space-y-5 text-center font-medium select-none no-scrollbar"
        >
          {syncedLyrics.length > 0 ? (
            syncedLyrics.map((line, idx) => {
              const isActive = idx === activeIndex;
              const isPast = idx < activeIndex;

              return (
                <p
                  key={`${line.timeMs}-${idx}`}
                  ref={isActive ? activeLineRef : null}
                  onClick={() => isPro && onSeekToMs(line.timeMs)}
                  className={`transition-all duration-300 text-base sm:text-lg cursor-pointer ${
                    isActive
                      ? 'scale-105 font-bold tracking-tight'
                      : isPast
                      ? 'text-neutral-500 opacity-60'
                      : 'text-neutral-400 opacity-40 hover:opacity-80'
                  }`}
                  style={{
                    color: isActive ? accentColor : undefined,
                  }}
                >
                  {line.text}
                </p>
              );
            })
          ) : plainLyrics ? (
            <div className="whitespace-pre-line text-sm text-neutral-300 leading-relaxed font-normal text-left px-4">
              {plainLyrics}
            </div>
          ) : (
            <div className="h-full flex flex-col items-center justify-center text-neutral-500 space-y-2">
              <Mic2 size={36} className="opacity-30" />
              <p className="text-sm">Текст для этого трека пока не найден</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
