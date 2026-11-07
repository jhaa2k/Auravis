import { clamp, lerp } from './math.js';

const cache = new Map();
const HEX = /^#([0-9a-f]{3}|[0-9a-f]{6}|[0-9a-f]{8})$/i;
export const isValidColor = (s) => typeof s === 'string' && HEX.test(s);

/** '#rgb' | '#rrggbb' | '#rrggbbaa' → {r,g,b,a} (0-255, a 0-1). Invalid → opaque white. */
export function parseColor(s) {
  let c = cache.get(s);
  if (c) return c;
  if (!isValidColor(s)) return { r: 255, g: 255, b: 255, a: 1 };
  let h = s.slice(1);
  if (h.length === 3) h = h.split('').map((x) => x + x).join('');
  c = {
    r: parseInt(h.slice(0, 2), 16),
    g: parseInt(h.slice(2, 4), 16),
    b: parseInt(h.slice(4, 6), 16),
    a: h.length === 8 ? parseInt(h.slice(6, 8), 16) / 255 : 1,
  };
  if (cache.size > 500) cache.clear();
  cache.set(s, c);
  return c;
}
const hh = (n) => Math.round(clamp(n, 0, 255)).toString(16).padStart(2, '0');
export const toHex = ({ r, g, b, a = 1 }) => `#${hh(r)}${hh(g)}${hh(b)}${hh(a * 255)}`;
export const normalizeColor = (s) => toHex(parseColor(s));
export const toCss = ({ r, g, b, a = 1 }) => `rgba(${Math.round(r)},${Math.round(g)},${Math.round(b)},${+a.toFixed(3)})`;
export const cssOf = (s) => toCss(parseColor(s));
export const hex6 = (s) => toHex(parseColor(s)).slice(0, 7);
export const mixColor = (a, b, t) => ({ r: lerp(a.r, b.r, t), g: lerp(a.g, b.g, t), b: lerp(a.b, b.b, t), a: lerp(a.a, b.a, t) });
export const isWhiteOpaque = (c) => c.r >= 254.5 && c.g >= 254.5 && c.b >= 254.5;

export function rgbToHsl({ r, g, b }) {
  r /= 255; g /= 255; b /= 255;
  const mx = Math.max(r, g, b), mn = Math.min(r, g, b), l = (mx + mn) / 2;
  let h = 0, s = 0;
  if (mx !== mn) {
    const d = mx - mn;
    s = l > 0.5 ? d / (2 - mx - mn) : d / (mx + mn);
    h = mx === r ? (g - b) / d + (g < b ? 6 : 0) : mx === g ? (b - r) / d + 2 : (r - g) / d + 4;
    h *= 60;
  }
  return { h, s, l };
}
export function hslToRgb({ h, s, l }, a = 1) {
  h = (((h % 360) + 360) % 360) / 360;
  const f = (p, q, t) => {
    t = (t + 1) % 1;
    return t < 1 / 6 ? p + (q - p) * 6 * t : t < 1 / 2 ? q : t < 2 / 3 ? p + (q - p) * (2 / 3 - t) * 6 : p;
  };
  if (s === 0) return { r: l * 255, g: l * 255, b: l * 255, a };
  const q = l < 0.5 ? l * (1 + s) : l + s - l * s, p = 2 * l - q;
  return { r: f(p, q, h + 1 / 3) * 255, g: f(p, q, h) * 255, b: f(p, q, h - 1 / 3) * 255, a };
}
