export interface ExtractedPalette {
  dominant: string;       // rgb(r, g, b)
  dominantHex: string;    // #rrggbb
  glow: string;           // rgba(r, g, b, 0.45)
  accent: string;         // brightened accent
  surfaceTint: string;    // tinted dark surface
  contrastText: string;   // text color (white or dark)
}

const defaultPalette: ExtractedPalette = {
  dominant: 'rgb(245, 220, 223)',
  dominantHex: '#F5DCDF',
  glow: 'rgba(245, 220, 223, 0.25)',
  accent: '#F5DCDF',
  surfaceTint: 'rgba(245, 220, 223, 0.08)',
  contrastText: '#151313',
};

const MAX_CACHE_SIZE = 100;
const cache = new Map<string, ExtractedPalette>();

export function extractPaletteFromImage(imageUrl: string): Promise<ExtractedPalette> {
  if (!imageUrl) return Promise.resolve(defaultPalette);

  if (cache.has(imageUrl)) {
    const cached = cache.get(imageUrl)!;
    // Refresh position for LRU
    cache.delete(imageUrl);
    cache.set(imageUrl, cached);
    return Promise.resolve(cached);
  }

  return new Promise((resolve) => {
    const img = new Image();
    img.crossOrigin = 'Anonymous';
    img.src = imageUrl;

    img.onload = () => {
      try {
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');
        if (!ctx) {
          resolve(defaultPalette);
          return;
        }

        const size = 48;
        canvas.width = size;
        canvas.height = size;
        ctx.drawImage(img, 0, 0, size, size);

        const data = ctx.getImageData(0, 0, size, size).data;
        let rSum = 0;
        let gSum = 0;
        let bSum = 0;
        let count = 0;

        for (let i = 0; i < data.length; i += 16) {
          const r = data[i];
          const g = data[i + 1];
          const b = data[i + 2];
          const brightness = (r * 299 + g * 587 + b * 114) / 1000;

          if (brightness > 30 && brightness < 235) {
            rSum += r;
            gSum += g;
            bSum += b;
            count++;
          }
        }

        if (count === 0) {
          resolve(defaultPalette);
          return;
        }

        const avgR = Math.round(rSum / count);
        const avgG = Math.round(gSum / count);
        const avgB = Math.round(bSum / count);

        const hex = `#${((1 << 24) + (avgR << 16) + (avgG << 8) + avgB).toString(16).slice(1)}`;
        const palette: ExtractedPalette = {
          dominant: `rgb(${avgR}, ${avgG}, ${avgB})`,
          dominantHex: hex,
          glow: `rgba(${avgR}, ${avgG}, ${avgB}, 0.35)`,
          accent: `rgb(${Math.min(255, avgR + 40)}, ${Math.min(255, avgG + 40)}, ${Math.min(255, avgB + 40)})`,
          surfaceTint: `rgba(${avgR}, ${avgG}, ${avgB}, 0.12)`,
          contrastText: (avgR * 299 + avgG * 587 + avgB * 114) / 1000 > 160 ? '#151313' : '#FFFFFF',
        };

        if (cache.size >= MAX_CACHE_SIZE) {
          const oldestKey = cache.keys().next().value;
          if (oldestKey) cache.delete(oldestKey);
        }
        cache.set(imageUrl, palette);
        resolve(palette);
      } catch {
        resolve(defaultPalette);
      }
    };

    img.onerror = () => {
      resolve(defaultPalette);
    };
  });
}
