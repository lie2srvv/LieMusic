import React, { useState, useEffect, useRef } from 'react';

interface SquigglySliderProps {
  currentTime: number;
  duration: number;
  isPlaying: boolean;
  onSeek: (seconds: number) => void;
  className?: string;
}

export const SquigglySlider: React.FC<SquigglySliderProps> = ({
  currentTime,
  duration,
  isPlaying,
  onSeek,
  className = '',
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const [containerWidth, setContainerWidth] = useState(300);
  const [isScrubbing, setIsScrubbing] = useState(false);
  const [scrubTime, setScrubTime] = useState(0);

  // Animation values: phase and amplitude for Android 13+ MD3 squiggly wave
  const [phase, setPhase] = useState(0);
  const [amplitude, setAmplitude] = useState(isPlaying ? 3.5 : 0);

  // Measure container width responsively
  useEffect(() => {
    if (!containerRef.current) return;
    const updateWidth = () => {
      if (containerRef.current) {
        const w = containerRef.current.getBoundingClientRect().width;
        if (w > 0) setContainerWidth(w);
      }
    };
    updateWidth();
    const ro = new ResizeObserver(updateWidth);
    ro.observe(containerRef.current);
    return () => ro.disconnect();
  }, []);

  // Animate wave phase and smooth amplitude lerp with idle battery-saving shutdown
  useEffect(() => {
    let rafId: number;
    let lastTime = performance.now();
    let currentAmp = isPlaying ? 3.5 : 0;

    const loop = (now: number) => {
      const dt = Math.min((now - lastTime) / 1000, 0.1);
      lastTime = now;

      // Smooth amplitude transition: 3.5 when playing, 0 when paused (exact MD3 behavior)
      const targetAmp = isPlaying ? 3.5 : 0;
      const diff = targetAmp - currentAmp;
      if (Math.abs(diff) < 0.05) {
        currentAmp = targetAmp;
      } else {
        currentAmp += diff * Math.min(1, dt * 10);
      }
      setAmplitude(currentAmp);

      // Phase ripple translation when playing
      if (isPlaying) {
        setPhase((prev) => (prev + dt * 4.0) % (Math.PI * 2));
      }

      // Stop rAF loop when paused and amplitude settled to zero to prevent CPU & battery drain
      if (isPlaying || currentAmp !== targetAmp) {
        rafId = requestAnimationFrame(loop);
      }
    };

    rafId = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(rafId);
  }, [isPlaying]);

  // Pointer interactions with pointer capture for zero-stutter scrubbing
  const calcTimeFromClientX = (clientX: number) => {
    if (!containerRef.current || duration <= 0) return 0;
    const rect = containerRef.current.getBoundingClientRect();
    if (rect.width <= 0) return 0;
    const ratio = Math.max(0, Math.min(1, (clientX - rect.left) / rect.width));
    return ratio * duration;
  };

  const handlePointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    e.preventDefault();
    try {
      e.currentTarget.setPointerCapture(e.pointerId);
    } catch {}
    const newTime = calcTimeFromClientX(e.clientX);
    setIsScrubbing(true);
    setScrubTime(newTime);
  };

  const handlePointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!isScrubbing) return;
    const newTime = calcTimeFromClientX(e.clientX);
    setScrubTime(newTime);
  };

  const handlePointerUp = (e: React.PointerEvent<HTMLDivElement>) => {
    if (isScrubbing) {
      try {
        e.currentTarget.releasePointerCapture(e.pointerId);
      } catch {}
      const finalTime = calcTimeFromClientX(e.clientX);
      setIsScrubbing(false);
      onSeek(finalTime);
    }
  };

  const handlePointerCancel = (e: React.PointerEvent<HTMLDivElement>) => {
    if (isScrubbing) {
      try {
        e.currentTarget.releasePointerCapture(e.pointerId);
      } catch {}
      setIsScrubbing(false);
    }
  };

  const displayTime = isScrubbing ? scrubTime : currentTime;
  const progressRatio = duration > 0 ? Math.min(1, Math.max(0, displayTime / duration)) : 0;
  const L = progressRatio * containerWidth;

  const y0 = 12;
  const wavelength = 24;

  // Generate left squiggly path
  let waveD = '';
  if (L > 0) {
    const points: string[] = [`M 0 ${y0}`];
    const step = 2.0;
    for (let x = step; x < L; x += step) {
      const damp = Math.min(1.0, x / 8.0) * Math.min(1.0, (L - x) / 10.0);
      const y = y0 + amplitude * Math.sin((x / wavelength) * 2 * Math.PI + phase) * damp;
      points.push(`L ${x.toFixed(1)} ${y.toFixed(1)}`);
    }
    points.push(`L ${L.toFixed(1)} ${y0.toFixed(1)}`);
    waveD = points.join(' ');
  }

  // Generate right straight path
  let rightD = '';
  if (L < containerWidth) {
    rightD = `M ${Math.max(0, L).toFixed(1)} ${y0} L ${containerWidth.toFixed(1)} ${y0}`;
  }

  const thumbX = Math.max(2, Math.min(containerWidth - 2, L));

  return (
    <div
      ref={containerRef}
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerUp}
      onPointerCancel={handlePointerCancel}
      className={`relative py-3 cursor-pointer select-none touch-none group flex items-center w-full ${className}`}
    >
      <svg
        width="100%"
        height="24"
        viewBox={`0 0 ${containerWidth} 24`}
        className="overflow-visible w-full pointer-events-none"
      >
        {/* Remaining straight line (translucent white) */}
        {rightD && (
          <path
            d={rightD}
            fill="none"
            stroke="rgba(255, 255, 255, 0.28)"
            strokeWidth="3.2"
            strokeLinecap="round"
          />
        )}

        {/* Elapsed squiggly wave (pure white) */}
        {waveD && (
          <path
            d={waveD}
            fill="none"
            stroke="#FFFFFF"
            strokeWidth="3.2"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        )}

        {/* Vertical capsule / pill thumb */}
        <rect
          x={thumbX - 2}
          y={isScrubbing ? 2 : 3}
          width={4}
          height={isScrubbing ? 20 : 18}
          rx={2}
          fill="#FFFFFF"
          className="transition-[height,y] duration-100"
          style={{
            filter: 'drop-shadow(0 2px 6px rgba(0,0,0,0.75))',
          }}
        />
      </svg>
    </div>
  );
};
