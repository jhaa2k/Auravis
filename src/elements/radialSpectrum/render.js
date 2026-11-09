import { computeTransform, applyTransform } from '../../core/render/transform.js';
import { setBlend } from '../../core/render/effectUtils.js';
import { parseColor, mixColor, toCss } from '../../core/utils/color.js';

const BOX = 1200;

export function renderRadialSpectrum(rc, el) {
  const p = el.props, provider = rc.providers[p.audioProviderIndex - 1];
  if (!provider) { rc.diag(el.id, 'error', `Invalid Audio Provider Index ${p.audioProviderIndex}: add or select an existing Audio Provider`); return; }
  const samples = provider.out.samples;
  if (!samples?.length) return;
  const T = computeTransform(rc, el, BOX, BOX);
  rc.record(el, T);
  const ctx = rc.ctx, count = Math.min(p.barCount, samples.length);
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
    const sampleIndex = Math.min(samples.length - 1, Math.floor(i * samples.length / count));
    const value = Math.max(0, samples[sampleIndex] * p.sensitivity);
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
