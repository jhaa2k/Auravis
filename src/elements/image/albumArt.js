import { createCanvas, get2d } from '../../core/platform.js';
import { mulberry32, hashString } from '../../core/utils/id.js';
import { parseColor, rgbToHsl } from '../../core/utils/color.js';

/**
 * Local generative album-art engine (no network, no placeholder images). The artwork is derived from the
 * track seed + hints: colour guidance, hue shift, text on/off and a "force" nonce that re-rolls the design.
 */
export function generateAlbumArt({ seed, color, shiftHue = 0, noText = false, title = '', artist = '', nonce = 0, size = 1024 }) {
  const rng = mulberry32(hashString(`${seed}#${nonce}`));
  const c = createCanvas(size, size), x = get2d(c);
  const cc = parseColor(color);
  const base = ((cc.a > 0.01 ? rgbToHsl(cc).h : rng() * 360) + shiftHue + 360) % 360;
  const hsl = (h, s, l, a = 1) => `hsla(${((h % 360) + 360) % 360},${Math.round(s * 100)}%,${Math.round(l * 100)}%,${a})`;

  const ang = rng() * Math.PI * 2, r = size * 0.75;
  const g = x.createLinearGradient(size / 2 - Math.cos(ang) * r, size / 2 - Math.sin(ang) * r, size / 2 + Math.cos(ang) * r, size / 2 + Math.sin(ang) * r);
  g.addColorStop(0, hsl(base, 0.65, 0.1));
  g.addColorStop(1, hsl(base + 40 + rng() * 40, 0.7, 0.34));
  x.fillStyle = g; x.fillRect(0, 0, size, size);

  const style = Math.floor(rng() * 3);
  if (style === 0) {                                   // glowing orbs
    for (let i = 0; i < 9; i++) {
      const px = rng() * size, py = rng() * size, pr = size * (0.12 + rng() * 0.3);
      const rg = x.createRadialGradient(px, py, 0, px, py, pr);
      rg.addColorStop(0, hsl(base + rng() * 90, 0.85, 0.6, 0.55)); rg.addColorStop(1, hsl(base, 0.8, 0.5, 0));
      x.fillStyle = rg; x.fillRect(0, 0, size, size);
    }
  } else if (style === 1) {                            // concentric rings
    const cx = size * (0.3 + rng() * 0.4), cy = size * (0.3 + rng() * 0.4);
    for (let i = 1; i < 16; i++) {
      x.strokeStyle = hsl(base + i * 9, 0.8, 0.35 + i * 0.025, 0.55 - i * 0.025);
      x.lineWidth = 3 + rng() * 14;
      x.beginPath(); x.arc(cx, cy, i * size * 0.055, 0, Math.PI * 2); x.stroke();
    }
  } else {                                             // diagonal bands
    x.save(); x.translate(size / 2, size / 2); x.rotate(rng() * Math.PI);
    for (let i = -10; i < 10; i++) {
      x.fillStyle = hsl(base + i * 12, 0.75, 0.3 + rng() * 0.3, 0.4);
      x.fillRect(-size, i * size * 0.09, size * 2, size * (0.03 + rng() * 0.06));
    }
    x.restore();
  }
  for (let i = 0; i < 7000; i++) {                     // film grain
    x.fillStyle = `rgba(255,255,255,${rng() * 0.05})`;
    x.fillRect(rng() * size, rng() * size, 2, 2);
  }
  const v = x.createRadialGradient(size / 2, size / 2, size * 0.35, size / 2, size / 2, size * 0.75);
  v.addColorStop(0, 'rgba(0,0,0,0)'); v.addColorStop(1, 'rgba(0,0,0,0.55)');
  x.fillStyle = v; x.fillRect(0, 0, size, size);

  if (!noText && (title || artist)) {
    x.fillStyle = 'rgba(255,255,255,0.95)'; x.textBaseline = 'alphabetic';
    x.shadowColor = 'rgba(0,0,0,0.5)'; x.shadowBlur = 18;
    x.font = `700 ${Math.round(size * 0.075)}px Inter, system-ui, sans-serif`;
    x.fillText(title.slice(0, 22), size * 0.07, size * 0.86, size * 0.86);
    x.font = `400 ${Math.round(size * 0.042)}px Inter, system-ui, sans-serif`;
    x.fillStyle = 'rgba(255,255,255,0.75)';
    x.fillText(artist.slice(0, 30), size * 0.07, size * 0.92, size * 0.86);
  }
  return c;
}
