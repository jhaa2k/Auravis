import { get2d } from '../../core/platform.js';
import { computeTransform } from '../../core/render/transform.js';
import { tintBuffer, finishEffect } from '../../core/render/effectUtils.js';
import { getDefinition } from '../../core/schema/registry.js';

const vecOf = (rc, id) => rc.vecs.get(id) || rc.prevVecs.get(id) || { dx: 0, dy: 0 };

/**
 * Directional motion blur from REAL motion data (never faked):
 *  transform   – frame-to-frame movement of this element's own Position
 *  measured    – movement of the audio-driven offset (Measure Pos: A = amount px, B = response speed)
 *  target      – movement of the selected target element
 *  composition – average movement of all visible visuals below
 * Samples are averaged with running 1/(i+1) alpha, which gives an exact mean without clipping.
 */
export function renderMotionBlur(rc, el) {
  const p = el.props, cfg = p.measurePos;
  const src = rc.resolveSource(el, p.targetImage);
  if (!src) return;

  const st = rc.state(el.id, () => ({ off: 0, dOff: 0, frame: -1, vx: 0, vy: 0 }));
  const m = rc.measure(el, 'measurePos');
  if (st.frame !== rc.frameNo) {
    st.frame = rc.frameNo;
    const goal = m == null ? 0 : cfg.a * m, prev = st.off;
    st.off += (goal - st.off) * (1 - Math.exp(-Math.max(0.1, cfg.b) * rc.dt)); // B = how fast the offset follows
    st.dOff = st.off - prev;
  }
  const offX = cfg.axis !== 'y' ? st.off : 0, offY = cfg.axis !== 'x' ? st.off : 0;
  const T = computeTransform(rc, el, rc.lw, rc.lh, { skipMeasurePos: true });
  T.bx = T.x; T.by = T.y;               // transform position WITHOUT the measured offset
  T.x += offX; T.y += offY;
  rc.record(el, T);
  const own = rc.prevT.get(el.id);

  // ---- motion vectors (logical px per frame) ----
  const dOffX = cfg.axis !== 'y' ? st.dOff : 0, dOffY = cfg.axis !== 'x' ? st.dOff : 0;
  const self = { dx: own?.bx !== undefined ? T.bx - own.bx : 0, dy: own?.by !== undefined ? T.by - own.by : 0 };
  const target = src.target ? vecOf(rc, src.target.id) : { dx: 0, dy: 0 };
  let cx = 0, cy = 0, n = 0;
  for (const e of rc.renderables) {
    if (e.id === el.id) break;
    if (getDefinition(e.type).kind !== 'visual' || !e.props.visible) continue;
    const v = vecOf(rc, e.id); cx += v.dx; cy += v.dy; n++;
  }
  const comp = n ? { dx: cx / n, dy: cy / n } : { dx: 0, dy: 0 };
  let v = p.motionSource === 'transform' ? self : p.motionSource === 'target' ? target : p.motionSource === 'composition' ? comp : { dx: dOffX, dy: dOffY };
  if (p.relativeMotionMode === 'relativeToComposition') v = { dx: v.dx - comp.dx, dy: v.dy - comp.dy };
  else if (p.relativeMotionMode === 'relativeToTarget') v = { dx: v.dx - target.dx, dy: v.dy - target.dy };

  const norm = 1 / 60 / Math.max(rc.dt, 1 / 240);     // frame-rate independent: express as px per 60 fps frame
  st.vx += (v.dx * norm - st.vx) * 0.5; st.vy += (v.dy * norm - st.vy) * 0.5;
  const Lx = st.vx * p.blurAmountMultiplier, Ly = st.vy * p.blurAmountMultiplier;

  let processed = src.canvas;
  if (Math.hypot(Lx, Ly) >= 0.5) {
    const W = rc.main.canvas.width, H = rc.main.canvas.height;
    const proc = rc.pool.take(W, H), pctx = get2d(proc);
    const samples = Math.min(p.sampleCount, rc.q.motionSamples * 2);
    for (let i = 0; i < samples; i++) {
      const t = samples === 1 ? 0 : i / (samples - 1) - 0.5;
      pctx.globalAlpha = 1 / (i + 1);
      pctx.drawImage(src.canvas, Lx * t * rc.scale, Ly * t * rc.scale);
    }
    processed = proc;
  }
  finishEffect(rc, el, src, tintBuffer(rc, processed, p.color, false), T);
}
