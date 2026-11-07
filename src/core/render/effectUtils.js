import { BLEND_OP } from '../../elements/shared/general.js';
import { applyTransform } from './transform.js';
import { parseColor, isWhiteOpaque } from '../utils/color.js';
import { get2d } from '../platform.js';

/** Draws a pixel-aligned buffer ignoring the current logical transform. */
export function blit(ctx, buf, alpha = 1) {
  ctx.save();
  ctx.setTransform(1, 0, 0, 1, 0, 0);
  ctx.globalAlpha = alpha;
  ctx.drawImage(buf, 0, 0);
  ctx.restore();
}

/**
 * Multiplies `src` by a colour into a pooled buffer. With `alphaAsStrength` the colour alpha is the tint
 * strength (0 = untouched, 1 = fully multiplied); otherwise only RGB is used (alpha is handled by the caller
 * as opacity). Returns `src` untouched when the tint is a no-op, so default settings cost nothing.
 */
export function tintBuffer(rc, src, colorStr, alphaAsStrength = true) {
  const c = parseColor(colorStr);
  const strength = alphaAsStrength ? c.a : 1;
  if (isWhiteOpaque(c) || strength <= 0.001) return src;
  const t = rc.pool.take(src.width, src.height), tx = get2d(t);
  tx.drawImage(src, 0, 0);
  tx.globalCompositeOperation = 'multiply';
  tx.fillStyle = `rgb(${c.r | 0},${c.g | 0},${c.b | 0})`;
  tx.fillRect(0, 0, src.width, src.height);
  tx.globalCompositeOperation = 'destination-in'; // restore the original alpha silhouette
  tx.drawImage(src, 0, 0);
  if (strength >= 0.999) return t;
  const out = rc.pool.take(src.width, src.height), x = get2d(out);
  x.drawImage(src, 0, 0);
  x.globalAlpha = strength;
  x.drawImage(t, 0, 0);
  return out;
}

/** Sets blend operation + alpha for a draw. Alpha Blend additionally weights by the element colour alpha. */
export function setBlend(ctx, p, alpha = 1, colorStr) {
  ctx.globalCompositeOperation = BLEND_OP[p.blendMode] || 'source-over';
  ctx.globalAlpha = p.blendMode === 'alphaBlend' && colorStr ? alpha * parseColor(colorStr).a : alpha;
}

/**
 * Shared compositing tail for RGB Split / Blur Effect / Motion Blur.
 * Builds the effect layer: [original if "Under"] + processed (Blend Mode Content, element transform)
 * + [original if shown and not "Under"], then composites it with the element Blend Mode.
 * Composition-below targets REPLACE the composition (otherwise the unprocessed original would
 * always remain visible underneath and "Show Unblurred Content" would do nothing).
 */
export function finishEffect(rc, el, source, processed, T) {
  const p = el.props;
  const E = rc.takeTarget(), ectx = E.ctx;
  const show = p.showUnblurredContent;
  if (show && p.showUnblurredContentUnder) blit(ectx, source.canvas);
  ectx.save();
  ectx.globalCompositeOperation = BLEND_OP[p.blendModeContent] || 'source-over';
  ectx.globalAlpha = parseColor(p.color).a;
  applyTransform(ectx, T);
  ectx.drawImage(processed, 0, 0, rc.lw, rc.lh);
  ectx.restore();
  if (show && !p.showUnblurredContentUnder) blit(ectx, source.canvas);

  const ctx = rc.ctx;
  ctx.save();
  ctx.setTransform(1, 0, 0, 1, 0, 0);
  if (source.isComposition && ctx === rc.main.ctx) {
    ctx.clearRect(0, 0, rc.main.canvas.width, rc.main.canvas.height);
    ctx.globalCompositeOperation = 'source-over';
  } else {
    ctx.globalCompositeOperation = BLEND_OP[p.blendMode] || 'source-over';
  }
  ctx.drawImage(E.canvas, 0, 0);
  ctx.restore();
}

/** Selected-target helper for effect schemas: 'composition' or an element id. */
export function targetOptions(elements, selfId) {
  return [{ value: 'composition', label: 'Composition Below' },
    ...elements.filter((e) => e.id !== selfId && e.type !== 'audioProvider').map((e) => ({ value: e.id, label: e.props.tag }))];
}
