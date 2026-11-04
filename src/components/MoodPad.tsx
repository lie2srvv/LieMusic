import React, { useRef, useState, useCallback } from 'react';
import { motion } from 'motion/react';

export interface MoodCoordinates {
  /** Valence: -1 (Sad / Dark) to +1 (Cheerful / Positive) */
  valence: number;
  /** Energy: -1 (Calm / Slow) to +1 (Energetic / Fast) */
  energy: number;
}

interface MoodPadProps {
  initialMood?: MoodCoordinates;
  onChange?: (mood: MoodCoordinates) => void;
  onCommit?: (mood: MoodCoordinates) => void;
  labels?: {
    energetic: string;
    cheerful: string;
    calm: string;
    sad: string;
  };
}

// 4 Corner Colors:
// Top-Left (Energetic): Vivid Rose / Pink
// Top-Right (Cheerful): Warm Amber / Orange
// Bottom-Left (Sad): Melancholic Indigo / Purple
// Bottom-Right (Calm): Soft Aqua / Cyan
function interpolateAura(normX: number, normY: number): { solid: string; glow: string } {
  const x = Math.max(0, Math.min(1, normX));
  const y = Math.max(0, Math.min(1, normY));

  // Top-Left (0, 0): Rose/Magenta (225, 29, 72)
  // Top-Right (1, 0): Amber/Gold (245, 158, 11)
  // Bottom-Left (0, 1): Indigo/Purple (99, 102, 241)
  // Bottom-Right (1, 1): Cyan/Sky (6, 182, 212)
  const r = Math.round(
    (1 - x) * (1 - y) * 225 + x * (1 - y) * 245 + (1 - x) * y * 99 + x * y * 6
  );
  const g = Math.round(
    (1 - x) * (1 - y) * 29 + x * (1 - y) * 158 + (1 - x) * y * 102 + x * y * 182
  );
  const b = Math.round(
    (1 - x) * (1 - y) * 72 + x * (1 - y) * 11 + (1 - x) * y * 241 + x * y * 212
  );

  return {
    solid: 'rgb(' + r + ', ' + g + ', ' + b + ')',
    glow: 'rgba(' + r + ', ' + g + ', ' + b + ', 0.65)',
  };
}

export const MoodPad: React.FC<MoodPadProps> = ({
  initialMood = { valence: 0, energy: 0 },
  onChange,
  onCommit,
  labels = {
    energetic: 'ЭНЕРГИЧНОЕ',
    cheerful: 'ВЕСЕЛОЕ',
    calm: 'СПОКОЙНОЕ',
    sad: 'ГРУСТНОЕ',
  },
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const [isDragging, setIsDragging] = useState(false);

  // normX in [0, 1] (0 = Sad, 1 = Cheerful)
  // normY in [0, 1] (0 = Energetic, 1 = Calm)
  const [normPos, setNormPos] = useState<{ x: number; y: number }>(() => ({
    x: (initialMood.valence + 1) / 2,
    y: (1 - initialMood.energy) / 2,
  }));

  const latestMoodRef = useRef<MoodCoordinates>({
    valence: initialMood.valence,
    energy: initialMood.energy,
  });

  const lastTapRef = useRef<number>(0);

  const updateFromPointer = useCallback(
    (clientX: number, clientY: number) => {
      const container = containerRef.current;
      if (!container) return;
      const rect = container.getBoundingClientRect();

      // Inset padding for the bounds so orb stays inside
      const padX = 24;
      const padY = 28;
      const width = rect.width - padX * 2;
      const height = rect.height - padY * 2;

      const rawX = clientX - (rect.left + padX);
      const rawY = clientY - (rect.top + padY);

      const clampedX = Math.max(0, Math.min(width, rawX));
      const clampedY = Math.max(0, Math.min(height, rawY));

      const newNormX = clampedX / width;
      const newNormY = clampedY / height;

      setNormPos({ x: newNormX, y: newNormY });

      // Convert to Valence [-1, 1] & Energy [-1, 1]
      const valence = Number(((newNormX - 0.5) * 2).toFixed(2));
      const energy = Number(((0.5 - newNormY) * 2).toFixed(2));

      latestMoodRef.current = { valence, energy };
      onChange?.({ valence, energy });
    },
    [onChange]
  );

  const handlePointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    e.currentTarget.setPointerCapture(e.pointerId);
    setIsDragging(true);

    // Double tap detector to reset to center
    const now = Date.now();
    if (now - lastTapRef.current < 280) {
      setNormPos({ x: 0.5, y: 0.5 });
      latestMoodRef.current = { valence: 0, energy: 0 };
      onChange?.({ valence: 0, energy: 0 });
      onCommit?.({ valence: 0, energy: 0 });
      lastTapRef.current = 0;
      return;
    }
    lastTapRef.current = now;

    updateFromPointer(e.clientX, e.clientY);
  };

  const handlePointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!isDragging) return;
    updateFromPointer(e.clientX, e.clientY);
  };

  const handlePointerUp = (e: React.PointerEvent<HTMLDivElement>) => {
    try {
      e.currentTarget.releasePointerCapture(e.pointerId);
    } catch {
      // Ignore
    }
    if (isDragging) {
      setIsDragging(false);
      onCommit?.(latestMoodRef.current);
    }
  };

  const aura = interpolateAura(normPos.x, normPos.y);

  return (
    <div
      ref={containerRef}
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerUp}
      onPointerCancel={handlePointerUp}
      className="relative w-full h-36 rounded-3xl bg-[#171515] border border-white/10 p-3.5 select-none touch-none overflow-hidden cursor-crosshair shadow-2xl transition-all"
      style={{
        boxShadow: '0 12px 36px -12px ' + aura.glow,
      }}
    >
      {/* Dynamic aura gradient tracking the orb */}
      <div
        className="absolute inset-0 pointer-events-none transition-opacity duration-300"
        style={{
          background: 'radial-gradient(circle at ' + (normPos.x * 100) + '% ' + (normPos.y * 100) + '%, ' + aura.glow + ' 0%, rgba(20,18,18,0.7) 65%, transparent 100%)',
          opacity: isDragging ? 0.95 : 0.65,
        }}
      />

      {/* Grid of micro dots */}
      <div
        className="absolute inset-0 pointer-events-none opacity-20"
        style={{
          backgroundImage: 'radial-gradient(circle, #ffffff 1px, transparent 1px)',
          backgroundSize: '16px 16px',
          backgroundPosition: '8px 8px',
        }}
      />

      {/* Subtle Crosshair Axis Lines */}
      <div className="absolute inset-x-4 top-1/2 -translate-y-1/2 h-[1px] bg-white/5 pointer-events-none" />
      <div className="absolute inset-y-4 left-1/2 -translate-x-1/2 w-[1px] bg-white/5 pointer-events-none" />

      {/* 4 Quadrant Mood Labels */}
      <div className="absolute top-3 left-4 text-[10px] font-black tracking-wider text-neutral-400 select-none uppercase pointer-events-none">
        {labels.energetic}
      </div>
      <div className="absolute top-3 right-4 text-[10px] font-black tracking-wider text-neutral-400 select-none uppercase pointer-events-none text-right">
        {labels.cheerful}
      </div>
      <div className="absolute bottom-3 right-4 text-[10px] font-black tracking-wider text-neutral-400 select-none uppercase pointer-events-none text-right">
        {labels.calm}
      </div>
      <div className="absolute bottom-3 left-4 text-[10px] font-black tracking-wider text-neutral-400 select-none uppercase pointer-events-none">
        {labels.sad}
      </div>

      {/* Draggable Glowing Orb */}
      <motion.div
        className="absolute pointer-events-none"
        style={{
          left: 'calc(24px + ' + normPos.x + ' * (100% - 48px))',
          top: 'calc(28px + ' + normPos.y + ' * (100% - 56px))',
          transform: 'translate(-50%, -50%)',
        }}
      >
        {/* Glow halo */}
        <div
          className="absolute -inset-4 rounded-full blur-md transition-transform duration-150"
          style={{
            backgroundColor: aura.solid,
            opacity: isDragging ? 0.9 : 0.6,
            transform: isDragging ? 'scale(1.3)' : 'scale(1)',
          }}
        />

        {/* Center puck */}
        <div className="relative w-7 h-7 rounded-full bg-white shadow-lg flex items-center justify-center">
          <div
            className="w-2.5 h-2.5 rounded-full transition-transform duration-150"
            style={{
              backgroundColor: aura.solid,
              transform: isDragging ? 'scale(1.2)' : 'scale(1)',
            }}
          />
        </div>
      </motion.div>
    </div>
  );
};
