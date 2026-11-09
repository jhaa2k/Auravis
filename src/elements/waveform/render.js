import { computeTransform, applyTransform } from '../../core/render/transform.js';
import { setBlend } from '../../core/render/effectUtils.js';
import { parseColor, mixColor, toCss } from '../../core/utils/color.js';

const BOX_W = 1600, BOX_H = 500;

export function renderWaveform(rc, el) {
  const p = el.props, td = rc.audio?.td;
  if (!td?.length) { rc.record(el, computeTransform(rc, el, BOX_W, BOX_H)); return; }
  const T = computeTransform(rc, el, BOX_W, BOX_H);
  rc.record(el, T);
  const ctx = rc.ctx;
  const count = Math.min(p.sampleCount, td.length);
  const offset = td.length - count;
  const mid = BOX_H / 2;
  const amp = BOX_H * 0.42 * p.amplitude;
  const from = parseColor(p.colorFrom), to = parseColor(p.colorTo);
  ctx.save();
  setBlend(ctx, p, 1);
  applyTransform(ctx, T);
  ctx.lineWidth = p.lineWidth;
  ctx.lineJoin = 'round';
  ctx.lineCap = 'round';
  ctx.shadowBlur = p.glow;
  ctx.shadowColor = toCss(from);
  const points = [];
  for (let i = 0; i < count; i++) {
    const x = (i / Math.max(1, count - 1)) * BOX_W;
    const v = Math.max(-1, Math.min(1, td[offset + i] || 0));
    points.push([x, mid - v * amp]);
  }
  const draw = (mirror = false) => {
    ctx.beginPath();
    points.forEach(([x, y], i) => {
      const py = mirror ? mid + (mid - y) : y;
      if (i === 0) ctx.moveTo(x, py); else ctx.lineTo(x, py);
    });
    if (p.closedLoop && points.length > 2) ctx.closePath();
    const gradient = ctx.createLinearGradient(0, 0, BOX_W, 0);
    gradient.addColorStop(0, toCss(from));
    gradient.addColorStop(1, toCss(to));
    ctx.strokeStyle = gradient;
    ctx.stroke();
    if (p.fillArea || p.waveformMode === 'filled') {
      ctx.lineTo(BOX_W, mid); ctx.lineTo(0, mid); ctx.closePath();
      ctx.fillStyle = p.fillColor;
      ctx.fill();
    }
  };
  draw(false);
  if (p.waveformMode === 'mirror') draw(true);
  ctx.restore();
}
