import { DEG } from '../utils/math.js';

export const ALIGN_POINTS = {
  topLeft: [0, 0], topCenter: [0.5, 0], topRight: [1, 0],
  middleLeft: [0, 0.5], center: [0.5, 0.5], middleRight: [1, 0.5],
  bottomLeft: [0, 1], bottomCenter: [0.5, 1], bottomRight: [1, 1],
};

/**
 * The ONE transform system used by every element (shared property architecture).
 * Coordinates are logical canvas pixels. Position is relative to the Alignment Position point;
 * Anchor X/Y (0..1) is the element's own origin for rotation/scaling.
 * Measure Pos / Scale / Rot add audio-driven values (see measure/mapper.js).
 */
export function computeTransform(rc, el, bw, bh, opts = {}) {
  const p = el.props;
  const al = ALIGN_POINTS[p.alignmentPosition] || ALIGN_POINTS.center;
  let x = al[0] * rc.lw + p.position[0], y = al[1] * rc.lh + p.position[1];
  let mox = 0, moy = 0;
  if (!opts.skipMeasurePos && p.measurePos) {
    const m = rc.measure(el, 'measurePos');
    if (m != null) {
      if (p.measurePos.axis !== 'y') mox = m;
      if (p.measurePos.axis !== 'x') moy = m;
    }
  }
  x += mox; y += moy;
  let sx = p.scale[0], sy = p.scaleIsUniform ? p.scale[0] : p.scale[1];
  const ms = p.measureScale ? rc.measure(el, 'measureScale') : null;
  if (ms != null) { sx *= ms; sy *= ms; }
  let rot = p.rotation || 0;
  const mr = p.measureRot ? rc.measure(el, 'measureRot') : null;
  if (mr != null) rot += mr;
  rot += opts.extraRotation || 0;
  return { x, y, rot: rot * DEG, sx, sy, ax: p.anchorX, ay: p.anchorY, bw, bh, mox, moy };
}

export function applyTransform(ctx, T) {
  ctx.translate(T.x, T.y);
  ctx.rotate(T.rot);
  ctx.scale(T.sx, T.sy);
  ctx.translate(-T.ax * T.bw, -T.ay * T.bh);
}
