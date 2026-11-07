import { createCanvas, get2d } from '../platform.js';

export const MASK_MODES = [
  { value: 'alpha', label: 'Alpha Mask' },
  { value: 'luminance', label: 'Luminance Mask' },
  { value: 'inverted', label: 'Inverted Mask' },
  { value: 'normal', label: 'Normal Mask' },
];

/**
 * Converts a mask image into a canvas whose ALPHA channel is the mask value (real channel data):
 *  alpha      → mask alpha
 *  luminance  → Rec.709 luminance of RGB (alpha ignored)
 *  normal     → luminance × alpha (white & opaque shows, black or transparent hides)
 *  inverted   → 1 − (luminance × alpha)
 * Use with globalCompositeOperation = 'destination-in'.
 */
export function buildMaskCanvas(source, mode, w, h) {
  const c = createCanvas(w, h), ctx = get2d(c, true);
  ctx.drawImage(source, 0, 0, w, h);
  const img = ctx.getImageData(0, 0, w, h), d = img.data;
  for (let i = 0; i < d.length; i += 4) {
    const a = d[i + 3] / 255, lum = (0.2126 * d[i] + 0.7152 * d[i + 1] + 0.0722 * d[i + 2]) / 255;
    const m = mode === 'alpha' ? a : mode === 'luminance' ? lum : mode === 'inverted' ? 1 - lum * a : lum * a;
    d[i] = d[i + 1] = d[i + 2] = 255;
    d[i + 3] = Math.round(m * 255);
  }
  ctx.putImageData(img, 0, 0);
  return c;
}
