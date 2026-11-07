import { get2d } from '../../core/platform.js';
import { computeTransform } from '../../core/render/transform.js';
import { tintBuffer, finishEffect } from '../../core/render/effectUtils.js';
import { blurCanvas } from '../../core/render/blur.js';
import { buildMaskCanvas } from '../../core/render/mask.js';
import { parseColor } from '../../core/utils/color.js';

const RADIUS_STEP = [1, 2, 4]; // layer k blurs with radius × 1 / 2 / 4 → soft core + wide halo

function getMask(rc, el, W, H) {
  const id = el.props.maskImage;
  if (!id) return null;
  const e = rc.images.get(id);
  if (e.status === 'loading') return null;
  if (e.status !== 'ready') { rc.diag(el.id, 'error', 'Invalid mask: the mask image is missing or unreadable, mask disabled'); return null; }
  const key = `bmask:${el.id}:${id}:${W}x${H}`;
  let m = rc.cache.get(key);
  if (!m) { m = buildMaskCanvas(e.img, 'normal', W, H); rc.cache.set(key, m); }
  return m;
}

/**
 * Three stacked blur layers (own scale, colour and radius step) combined bottom-up, optional mask,
 * then composited with Blend Mode Content. Blur is separable Gaussian-style at reduced resolution (Blur Divider
 * comes from the quality tier).
 */
export function renderBlurEffect(rc, el) {
  const p = el.props;
  const src = rc.resolveSource(el, p.sourceCompositionIndex);
  if (!src) return;
  const T = computeTransform(rc, el, rc.lw, rc.lh);
  rc.record(el, T);
  const W = rc.main.canvas.width, H = rc.main.canvas.height;
  const base = Math.max(0, (p.blurRadius + (rc.measure(el, 'measureBlurRadius') || 0)) * p.blurMultiplier) * rc.scale;

  const proc = rc.pool.take(W, H), pctx = get2d(proc);
  for (const k of [3, 2, 1]) {
    const c = parseColor(p[`layer${k}Color`]);
    if (c.a <= 0.003) continue;
    const blurred = rc.pool.take(W, H);
    blurCanvas(src.canvas, blurred, base * RADIUS_STEP[k - 1], rc.q.blurDivider);
    const layer = tintBuffer(rc, blurred, p[`layer${k}Color`], false);
    const s = p[`layer${k}Scale`];
    pctx.save();
    pctx.globalAlpha = c.a;
    pctx.translate(W / 2, H / 2); pctx.scale(s, s); pctx.translate(-W / 2, -H / 2);
    pctx.drawImage(layer, 0, 0);
    pctx.restore();
  }
  const mask = getMask(rc, el, W, H);
  if (mask) { pctx.globalCompositeOperation = 'destination-in'; pctx.drawImage(mask, 0, 0); pctx.globalCompositeOperation = 'source-over'; }
  finishEffect(rc, el, src, tintBuffer(rc, proc, p.color, false), T);
}
