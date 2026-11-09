import { computeTransform, applyTransform } from '../../core/render/transform.js';
import { setBlend } from '../../core/render/effectUtils.js';
import { parseColor, mixColor, toCss } from '../../core/utils/color.js';

const BOX = 1200;

export function renderRadialSpectrum(rc, el) {
  const p = el.props, provider = rc.providers[p.audioProviderIndex - 1];
  if (!provider) { rc.diag(el.id, 'error', `Invalid Audio Provider Index ${p.audioProviderIndex}: add or select an existing Audio Provider`); return; }
  const source = provider.out.samples;
  if (!source?.length) return;
  const count = Math.max(2, Math.min(90, Math.round(p.barCount || 90)));
  const T = computeTransform(rc, el, BOX, BOX);
  rc.record(el, T);
  const ctx = rc.ctx;
  const from = parseColor(p.colorFrom), to = parseColor(p.colorTo);
  const cx = BOX / 2, cy = BOX / 2;
  ctx.save();
  setBlend(ctx, p, 1);
  applyTransform(ctx, T);
  ctx.translate(cx, cy);
  ctx.rotate(p.rotationOffset * Math.PI / 180);
  ctx.shadowBlur = p.glow;
  ctx.shadowColor = toCss(from);
  for (let i = 0; i < count; i++) {
    const at = (i / Math.max(1, count - 1)) * (source.length - 1);
    const lo = Math.floor(at), hi = Math.min(source.length - 1, lo + 1), t = at - lo;
    const sample = source[lo] + (source[hi] - source[lo]) * t;
    const value = Math.max(0, sample * p.sensitivity);
    const length = Math.min(p.barLength, value * p.barLength);
    if (length < 0.5) continue;
    const angle = (i / count) * Math.PI * 2;
    const color = mixColor(from, to, i / Math.max(1, count - 1));
    ctx.save();
    ctx.rotate(angle);
    ctx.fillStyle = toCss(color);
    ctx.fillRect(p.radius, -p.barWidth * (1 - p.gap) / 2, length, p.barWidth * (1 - p.gap));
    if (p.mirror) ctx.fillRect(-p.radius - length, -p.barWidth * (1 - p.gap) / 2, length, p.barWidth * (1 - p.gap));
    ctx.restore();
  }
  ctx.restore();
}
