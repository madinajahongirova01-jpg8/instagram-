import sharp from 'sharp';

const PALETTES: [string, string, string][] = [
  ['#ff9a5a', '#ff5e8a', '#5b3cc4'],
  ['#7dd3fc', '#38bdf8', '#1e3a8a'],
  ['#fde68a', '#f59e0b', '#9a3412'],
  ['#a7f3d0', '#10b981', '#064e3b'],
  ['#fbcfe8', '#ec4899', '#581c87'],
  ['#c7d2fe', '#6366f1', '#1e1b4b'],
];

function landscapeSvg(index: number, width: number, height: number): string {
  const [sky, glow, ground] = PALETTES[index % PALETTES.length];
  const sunX = 0.25 + ((index * 37) % 50) / 100;
  const peak = 0.35 + ((index * 13) % 20) / 100;
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 100 ${(100 * height) / width}">
  <defs>
    <linearGradient id="sky" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0" stop-color="${sky}"/>
      <stop offset="1" stop-color="${glow}"/>
    </linearGradient>
  </defs>
  <rect width="100" height="${(100 * height) / width}" fill="url(#sky)"/>
  <circle cx="${sunX * 100}" cy="${(peak * 100 * height) / width}" r="9" fill="#fff7d6" opacity="0.85"/>
  <polygon points="0,${(0.75 * 100 * height) / width} 30,${(peak * 100 * height) / width + 12} 55,${(0.7 * 100 * height) / width} 78,${(peak * 100 * height) / width + 6} 100,${(0.72 * 100 * height) / width} 100,${(100 * height) / width} 0,${(100 * height) / width}" fill="${ground}" opacity="0.85"/>
  <polygon points="0,${(0.88 * 100 * height) / width} 40,${(0.78 * 100 * height) / width} 70,${(0.86 * 100 * height) / width} 100,${(0.8 * 100 * height) / width} 100,${(100 * height) / width} 0,${(100 * height) / width}" fill="${ground}"/>
</svg>`;
}

export function placeholderLandscape(index: number, width = 1080, height = 1350): Promise<Buffer> {
  return sharp(Buffer.from(landscapeSvg(index, width, height))).jpeg({ quality: 85 }).toBuffer();
}

export function placeholderAvatar(colors: [string, string]): Promise<Buffer> {
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="320" height="320" viewBox="0 0 100 100">
  <defs>
    <linearGradient id="g" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0" stop-color="${colors[0]}"/>
      <stop offset="1" stop-color="${colors[1]}"/>
    </linearGradient>
  </defs>
  <rect width="100" height="100" fill="url(#g)"/>
  <circle cx="50" cy="40" r="17" fill="#ffffff" opacity="0.9"/>
  <ellipse cx="50" cy="88" rx="30" ry="22" fill="#ffffff" opacity="0.9"/>
</svg>`;
  return sharp(Buffer.from(svg)).png().toBuffer();
}
