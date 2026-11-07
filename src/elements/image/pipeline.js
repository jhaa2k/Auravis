import { createCanvas, get2d } from '../../core/platform.js';
import { getShapePath } from '../../core/render/shapes.js';
import { blurCanvas } from '../../core/render/blur.js';
import { buildMaskCanvas } from '../../core/render/mask.js';
import { parseColor } from '../../core/utils/color.js';
import { smoothstep } from '../../core/utils/math.js';

export const TEX = 1024;

/** Fraction of the texture square occupied by each shape's bounding box [x, y, w, h]. */
export function shapeBox(shape) {
  return shape === 'rectangle' || shape === 'ellipse' ? [0, 0.125, 1, 0.75] : [0, 0, 1, 1];
}
const SHAPE_PATH = { rectangle: 'rectangle', square: 'rectangle', ellipse: 'circle' };

/** Picks the fit mode from the two aspect-ratio switches (crop wins). */
export const fitMode = (p) => (p.keepAspectRatioAndCropToFit ? 'cover' : p.keepAspectRatio ? 'contain' : 'stretch');

function drawFit(x, img, iw, ih, bx, by, bw, bh, mode) {
  if (mode === 'stretch') return x.drawImage(img, bx, by, bw, bh);
  const s = mode === 'cover' ? Math.max(bw / iw, bh / ih) : Math.min(bw / iw, bh / ih);
  x.drawImage(img, bx + (bw - iw * s) / 2, by + (bh - ih * s) / 2, iw * s, ih * s);
}

/**
 * Builds the static part of the Image pipeline (cached until its inputs change):
 * fit/crop → blurred border → shape clip → mask → colour key + saturation → blur.
 * Per-frame work (tint, transform, blend) happens in render.js.
 */
export function buildTexture(src, p, mask) {
  const c = createCanvas(TEX, TEX), x = get2d(c, true);
  const [fx, fy, fw, fh] = shapeBox(p.shape);
  const bx = fx * TEX, by = fy * TEX, bw = fw * TEX, bh = fh * TEX;
  const mode = fitMode(p);

  x.save();
  x.translate(bx, by); x.scale(bw / 100, bh / 100);
  x.clip(getShapePath(SHAPE_PATH[p.shape] || p.shape));
  x.setTransform(1, 0, 0, 1, 0, 0);
  if (mode === 'contain' && p.blurredBorder) {
    const bg = createCanvas(TEX, TEX), bgx = get2d(bg), out = createCanvas(TEX, TEX);
    drawFit(bgx, src.drawable, src.w, src.h, bx, by, bw, bh, 'cover');
    blurCanvas(bg, out, p.blurredBorderRadius, 4);
    x.drawImage(out, 0, 0);
  }
  drawFit(x, src.drawable, src.w, src.h, bx, by, bw, bh, mode);
  x.restore();

  if (mask) {
    const m = buildMaskCanvas(mask.drawable, p.maskMode, Math.round(bw), Math.round(bh));
    x.globalCompositeOperation = 'destination-in';
    x.drawImage(m, bx, by);
    x.globalCompositeOperation = 'source-over';
  }

  const needKey = p.colorKeyEnabled && p.transparencyStrength > 0;
  if (needKey || Math.abs(p.saturation - 1) > 0.001) {
    const img = x.getImageData(0, 0, TEX, TEX), d = img.data;
    const k = parseColor(p.colorKey), tol = p.transparencyStrength, sat = p.saturation;
    for (let i = 0; i < d.length; i += 4) {
      if (d[i + 3] === 0) continue;
      if (sat !== 1) {
        const l = 0.2126 * d[i] + 0.7152 * d[i + 1] + 0.0722 * d[i + 2];
        d[i] = l + (d[i] - l) * sat; d[i + 1] = l + (d[i + 1] - l) * sat; d[i + 2] = l + (d[i + 2] - l) * sat;
      }
      if (needKey) {
        const dist = Math.hypot(d[i] - k.r, d[i + 1] - k.g, d[i + 2] - k.b) / 441.67;
        d[i + 3] *= smoothstep(tol * 0.5, tol, dist);   // soft edge between 50%…100% of the tolerance
      }
    }
    x.putImageData(img, 0, 0);
  }

  if (p.blurEnabled && p.blurRadius > 0) {
    const out = createCanvas(TEX, TEX);
    blurCanvas(c, out, p.blurRadius * (TEX / 1080), Math.min(p.blurDivider, 16));
    return out;
  }
  return c;
}

/** Estimates the dominant background colour from the image border (quantised histogram). */
export function detectKeyColor(drawable, w, h) {
  const S = 64, c = createCanvas(S, S), x = get2d(c, true);
  x.drawImage(drawable, 0, 0, S, S);
  const d = x.getImageData(0, 0, S, S).data, hist = new Map();
  const add = (px, py) => {
    const i = (py * S + px) * 4;
    if (d[i + 3] < 128) return;
    const key = ((d[i] >> 4) << 8) | ((d[i + 1] >> 4) << 4) | (d[i + 2] >> 4);
    const e = hist.get(key) || { n: 0, r: 0, g: 0, b: 0 };
    e.n++; e.r += d[i]; e.g += d[i + 1]; e.b += d[i + 2];
    hist.set(key, e);
  };
  for (let i = 0; i < S; i++) { add(i, 0); add(i, S - 1); add(0, i); add(S - 1, i); }
  let best = null;
  for (const e of hist.values()) if (!best || e.n > best.n) best = e;
  if (!best) return null;
  const h2 = (v) => Math.round(v / best.n).toString(16).padStart(2, '0');
  return `#${h2(best.r)}${h2(best.g)}${h2(best.b)}ff`;
}
