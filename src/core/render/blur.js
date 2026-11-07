import { createCanvas, get2d } from '../platform.js';

let filterOk = null;
function supportsFilter() {
  if (filterOk !== null) return filterOk;
  try {
    const x = get2d(createCanvas(2, 2));
    x.filter = 'blur(1px)';
    filterOk = x.filter === 'blur(1px)';
  } catch { filterOk = false; }
  return filterOk;
}
export const _forceCpuBlur = (v) => { filterOk = v ? false : null; };

/** Separable running-sum box blur on RGBA data (one pass). */
function boxPass(src, dst, w, h, r, horizontal) {
  const len = horizontal ? w : h, lines = horizontal ? h : w;
  const stride = horizontal ? 4 : w * 4, lineStride = horizontal ? w * 4 : 4;
  const div = 2 * r + 1;
  for (let l = 0; l < lines; l++) {
    const base = l * lineStride;
    for (let c = 0; c < 4; c++) {
      let sum = 0;
      for (let k = -r; k <= r; k++) sum += src[base + Math.min(len - 1, Math.max(0, k)) * stride + c];
      for (let i = 0; i < len; i++) {
        dst[base + i * stride + c] = sum / div;
        const add = Math.min(len - 1, i + r + 1), sub = Math.max(0, i - r);
        sum += src[base + add * stride + c] - src[base + sub * stride + c];
      }
    }
  }
}
/** Three box passes in both axes ≈ Gaussian blur (sigma ≈ r/2). CPU fallback when ctx.filter is unavailable. */
function cpuBlur(ctx, w, h, radius) {
  const r = Math.max(1, Math.round(radius / 2));
  const img = ctx.getImageData(0, 0, w, h);
  let a = img.data, b = new Uint8ClampedArray(a.length);
  for (let i = 0; i < 3; i++) { boxPass(a, b, w, h, r, true); boxPass(b, a, w, h, r, false); }
  ctx.putImageData(img, 0, 0);
}

/**
 * Gaussian-style blur of `src` into `dst` (same pixel size). `divider` renders the blur at
 * 1/divider resolution (cheaper); the result is upscaled so edges stay smooth.
 * Radius is in destination pixels.
 */
export function blurCanvas(src, dst, radius, divider = 1) {
  const w = dst.width, h = dst.height, dctx = get2d(dst);
  const r = radius / Math.max(1, divider);
  if (radius < 0.5) { dctx.drawImage(src, 0, 0, w, h); return dst; }
  const ww = Math.max(2, Math.round(w / divider)), wh = Math.max(2, Math.round(h / divider));
  const work = createCanvas(ww, wh), wctx = get2d(work, true);
  wctx.drawImage(src, 0, 0, ww, wh);
  if (supportsFilter()) {
    const out = createCanvas(ww, wh), octx = get2d(out);
    octx.filter = `blur(${r}px)`;
    octx.drawImage(work, 0, 0);
    octx.filter = 'none';
    dctx.imageSmoothingEnabled = true;
    dctx.drawImage(out, 0, 0, w, h);
  } else {
    cpuBlur(wctx, ww, wh, r);
    dctx.imageSmoothingEnabled = true;
    dctx.drawImage(work, 0, 0, w, h);
  }
  return dst;
}
