import { computeTransform, applyTransform } from '../../core/render/transform.js';
import { setBlend } from '../../core/render/effectUtils.js';
import { getShapePath, validateCustomPath } from '../../core/render/shapes.js';
import { parseColor, mixColor, toCss } from '../../core/utils/color.js';
import { clamp, expAlpha, pingpong } from '../../core/utils/math.js';

export const BOX_W = 1600, BOX_H = 500, GAP = 0.25;

function ensureHistory(st, N, frames) {
  if (st.N !== N || st.frames !== frames) {
    st.N = N; st.frames = frames;
    st.hist = new Float32Array(N * frames); st.heights = new Float32Array(N);
    st.head = 0; st.filled = 0;
  }
}

/** Advances the ring buffer + smoothed heights once per frame (isolated re-renders reuse them). */
export function updateBars(rc, el, samples, st) {
  const p = el.props, N = samples.length;
  const maxDelay = Math.min(4, (p.reactionDelay + p.reactionAccumulatedDelay * N) / 1000);
  ensureHistory(st, N, Math.min(600, Math.ceil(maxDelay / Math.max(0.004, st.avgDt)) + 2));
  if (st.frame === rc.frameNo) return;
  st.frame = rc.frameNo;
  st.avgDt += (rc.dt - st.avgDt) * 0.05;
  st.head = (st.head + 1) % st.frames;
  st.hist.set(samples, st.head * N);
  st.filled = Math.min(st.frames, st.filled + 1);
  const a = expAlpha(p.softness, rc.dt);
  for (let i = 0; i < N; i++) {
    const delay = (p.reactionDelay + i * p.reactionAccumulatedDelay) / 1000;
    const back = Math.min(st.filled - 1, Math.round(delay / st.avgDt));
    const f = (st.head - back + st.frames) % st.frames;
    const v = st.hist[f * N + (p.flipInput ? N - 1 - i : i)];
    const target = clamp(v * p.heightScale, p.minHeightScale, Math.max(p.minHeightScale, p.maxHeightScale));
    st.heights[i] += (target - st.heights[i]) * a;
  }
}

export function renderBars(rc, el) {
  const p = el.props;
  const prov = rc.providers[p.audioProviderIndex - 1];
  if (!prov) { rc.diag(el.id, 'error', `Invalid Audio Provider Index ${p.audioProviderIndex}: add or select an existing Audio Provider`); return; }
  const samples = prov.out.samples, N = samples.length;
  if (!N) return;
  let shape = p.shapePath;
  if (shape === 'custom') {
    const v = validateCustomPath(p.customShapePath);
    if (!v.ok) { rc.diag(el.id, 'error', `${v.error}: using Rectangle`); shape = 'rectangle'; }
  }
  const st = rc.state(el.id, () => ({ avgDt: 1 / 60, frame: -1 }));
  updateBars(rc, el, samples, st);

  const T = computeTransform(rc, el, BOX_W, BOX_H);
  rc.record(el, T);
  const ctx = rc.ctx;
  ctx.save();
  setBlend(ctx, p, 1);
  applyTransform(ctx, T);

  const path = getShapePath(shape, p.customShapePath);
  const barW = BOX_W / N, w = barW * (1 - GAP);
  for (const k of [1, 2]) {
    if (!p[`segment${k}Enabled`]) continue;
    const cf = parseColor(p[`segment${k}ColorFrom`]), ct = parseColor(p[`segment${k}ColorTo`]);
    const fixed = p[`segment${k}FixedHeight`], mult = p[`segment${k}BarHeightMultiplier`];
    const mirror = p[`segment${k}Mirror`], flip = p[`segment${k}FlipEveryOther`];
    const baseline = mirror || flip ? BOX_H / 2 : BOX_H;
    for (let i = 0; i < N; i++) {
      const h01 = fixed ? mult * p.maxHeightScale : st.heights[i] * mult;
      const hpx = h01 * BOX_H;
      if (hpx < 0.5) continue;
      const odd = flip && i % 2 === 1;
      const top = mirror ? baseline - hpx / 2 : odd ? baseline : baseline - hpx;
      ctx.fillStyle = toCss(mixColor(cf, ct, pingpong(i / Math.max(1, N - 1) + p.colorBlendOffset)));
      ctx.save();
      ctx.translate(i * barW + (barW - w) / 2, top);
      ctx.scale(w / 100, hpx / 100);
      if (odd) { ctx.translate(0, 100); ctx.scale(1, -1); }
      ctx.fill(path);
      ctx.restore();
    }
  }
  ctx.restore();
}
