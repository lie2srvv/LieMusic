import React from 'react';

interface HeartPlaylistCoverProps {
  className?: string;
  size?: number;
}

export const HeartPlaylistCover: React.FC<HeartPlaylistCoverProps> = ({
  className = '',
  size = 56,
}) => {
  return (
    <div
      className={`relative overflow-hidden rounded-2xl flex items-center justify-center shrink-0 shadow-lg ${className}`}
      style={{
        width: size,
        height: size,
        background: 'linear-gradient(135deg, #FF2E55 0%, #D90429 45%, #7A0018 100%)',
      }}
    >
      {/* Radial glow background */}
      <div
        className="absolute inset-0 opacity-40 mix-blend-screen pointer-events-none"
        style={{
          background: 'radial-gradient(circle at 40% 35%, rgba(255, 180, 195, 0.8) 0%, rgba(255, 40, 80, 0.2) 60%, transparent 100%)',
        }}
      />

      {/* 3D Heart SVG with realistic lighting and glossy bevel */}
      <svg
        viewBox="0 0 100 100"
        className="relative z-10 drop-shadow-[0_6px_12px_rgba(0,0,0,0.45)]"
        style={{ width: `${Math.round(size * 0.65)}px`, height: `${Math.round(size * 0.65)}px` }}
      >
        <defs>
          {/* Main 3D heart gradient */}
          <linearGradient id="heartGradient" x1="20%" y1="0%" x2="80%" y2="100%">
            <stop offset="0%" stopColor="#FFA6B8" />
            <stop offset="35%" stopColor="#FF4D6D" />
            <stop offset="70%" stopColor="#C9184A" />
            <stop offset="100%" stopColor="#590D22" />
          </linearGradient>

          {/* Top glossy shine highlight */}
          <linearGradient id="shineGradient" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#FFFFFF" stopOpacity="0.85" />
            <stop offset="40%" stopColor="#FFA6B8" stopOpacity="0.3" />
            <stop offset="100%" stopColor="#FF4D6D" stopOpacity="0" />
          </linearGradient>

          {/* Depth / shadow bevel */}
          <radialGradient id="depthGradient" cx="60%" cy="70%" r="50%">
            <stop offset="0%" stopColor="#2B050E" stopOpacity="0.6" />
            <stop offset="100%" stopColor="#C9184A" stopOpacity="0" />
          </radialGradient>
        </defs>

        {/* Base 3D Heart Shape */}
        <path
          d="M50 88 C20 65 5 45 5 28 C5 14 16 4 30 4 C38.5 4 46.2 8.5 50 15.5 C53.8 8.5 61.5 4 70 4 C84 4 95 14 95 28 C95 45 80 65 50 88 Z"
          fill="url(#heartGradient)"
        />

        {/* Bottom-right shadow layer for 3D extrusion */}
        <path
          d="M50 88 C68 70 95 48 95 28 C95 20 90 12 82 7 C75 22 62 45 50 88 Z"
          fill="url(#depthGradient)"
        />

        {/* Top-left specular highlight */}
        <path
          d="M50 15 C46.5 9 39 5 30 5 C18 5 8 14 8 26 C8 38 20 54 45 74 C35 55 24 40 24 28 C24 19 31 12 40 12 C44 12 47.5 13.5 50 15 Z"
          fill="url(#shineGradient)"
        />

        {/* Small sparkling rim */}
        <ellipse
          cx="28"
          cy="22"
          rx="10"
          ry="6"
          transform="rotate(-25 28 22)"
          fill="#FFFFFF"
          opacity="0.45"
        />
      </svg>
    </div>
  );
};
