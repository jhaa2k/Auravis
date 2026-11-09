import { get2d } from '../../core/platform.js';
import { computeTransform } from '../../core/render/transform.js';
import { tintBuffer, finishEffect } from '../../core/render/effectUtils.js';
import { parseColor } from '../../core/utils/color.js';

/**
 * Splits the source into its R, G and B channels, recolours each with its Split Color,
 * offsets them horizontally and recombines additively. With the default colours and zero
 * offset the recombined image equals the source.
 */
export function renderRgbSplit(rc, el) {
  const p = el.props;
  const src = rc.resolveSource(el, p.targetImage);
  if (!src) return;
  const T = computeTransform(rc, el, rc.lw, rc.lh);
  rc.record(el, T);

  const W = rc.main.canvas.width, H = rc.main.canvas.height;
  const ws = Math.min(1, rc.q.rgbWidth / W), w = Math.round(W * ws), h = Math.round(H * ws);
  const work = rc.pool.take(w, h), wctx = get2d(work, true);
  wctx.drawImage(src.canvas, 0, 0, w, h);
  const s = wctx.getImageData(0, 0, w, h).data;

  const cols = [p.splitColor0, p.splitColor1, p.splitColor2].map(parseColor);
  const splitAmount = Array.isArray(p.splitAmount) ? p.splitAmount : [p.splitAmount, 0];
  const amount = (splitAmount[0] + (rc.measure(el, 'measureSplitAmount') || 0)) * p.splitMultiplier;
  const amountY = splitAmount[1] * p.splitMultiplier;
  const dx = amount * rc.scale * ws, dy = amountY * rc.scale * ws;

  const proc = rc.pool.take(w, h), pctx = get2d(proc);
  pctx.globalCompositeOperation = 'lighter';
  const tmp = rc.pool.take(w, h), tctx = get2d(tmp, true);
  const st = rc.state(`${el.id}:buf`, () => ({}));
  if (!st.img || st.img.width !== w || st.img.height !== h) st.img = tctx.createImageData(w, h);
  const o = st.img.data;
  for (let ch = 0; ch < 3; ch++) {
    const c = cols[ch], r = c.r / 255, g = c.g / 255, b = c.b / 255;
    for (let i = 0; i < s.length; i += 4) {
      const v = s[i + ch];
      o[i] = ch === 0 ? v * r : 0;
      o[i + 1] = ch === 1 ? v * g : 0;
      o[i + 2] = ch === 2 ? v * b : 0;
      o[i + 3] = s[i + 3] * c.a;
    }
    tctx.putImageData(st.img, 0, 0);
    pctx.drawImage(tmp, (ch - 1) * dx, (ch - 1) * dy);
  }
  finishEffect(rc, el, src, tintBuffer(rc, proc, p.color, false), T);
}
