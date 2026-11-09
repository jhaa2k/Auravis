import { useEffect, useRef, useState } from 'react';
import { useApp } from '../app/hooks.js';
import { actions, store, visualizer } from '../app/services.js';
import { QUALITY } from '../core/render/quality.js';
import { getDefinition } from '../core/schema/registry.js';

export function isPreviewHittable(el) {
  if (!el || !el.props?.visible) return false;
  const def = getDefinition(el.type);
  return !!def?.render && def.kind !== 'provider' && def.kind !== 'effect';
}

/** Screen-space (logical px) corners of an element box. */
function corners(T) {
  const rot = T.rot, c = Math.cos(rot), s = Math.sin(rot);
  return [[0, 0], [T.bw, 0], [T.bw, T.bh], [0, T.bh]].map(([u, v]) => {
    const x = (u - T.ax * T.bw) * T.sx, y = (v - T.ay * T.bh) * T.sy;
    return [T.x + x * c - y * s, T.y + x * s + y * c];
  });
}
function inside(T, lx, ly) {
  const dx = lx - T.x, dy = ly - T.y, c = Math.cos(-T.rot), s = Math.sin(-T.rot);
  const u = (dx * c - dy * s) / T.sx + T.ax * T.bw, v = (dx * s + dy * c) / T.sy + T.ay * T.bh;
  return u >= 0 && u <= T.bw && v >= 0 && v <= T.bh;
}

export default function PreviewPanel() {
  const canvasRef = useRef(null), wrapRef = useRef(null);
  const settings = useApp((s) => s.project.settings);
  const selectedId = useApp((s) => s.selectedId);
  const [box, setBox] = useState(null);
  const [fps, setFps] = useState(0);
  const drag = useRef(null);

  useEffect(() => {
    visualizer.canvas = canvasRef.current;
    visualizer.start();
    const iv = setInterval(() => setFps(Math.round(visualizer.fps)), 500);
    return () => { visualizer.stop(); clearInterval(iv); };
  }, []);

  // selection overlay follows the rendered transform
  useEffect(() => {
    let last = '';
    const fn = () => {
      const state = store.getState();
      const el = state.elements.find((e) => e.id === state.selectedId);
      const def = el && getDefinition(el.type);
      const T = def?.kind !== 'provider' && def?.kind !== 'effect' && def?.render ? visualizer.boxOf(el.id) : null;
      const pts = T ? corners(T).map((p) => p.map((v) => +v.toFixed(1))) : null;
      const key = JSON.stringify(pts);
      if (key !== last) { last = key; setBox(pts); }
    };
    visualizer.hudListeners.add(fn);
    return () => visualizer.hudListeners.delete(fn);
  }, []);

  const toLogical = (ev) => {
    const r = canvasRef.current.getBoundingClientRect(), { width, height } = store.getState().project.settings;
    // canvas is object-fit: contain inside its box → compute the drawn rect
    const k = Math.min(r.width / width, r.height / height), w = width * k, h = height * k;
    return { x: ((ev.clientX - (r.left + (r.width - w) / 2)) / w) * width, y: ((ev.clientY - (r.top + (r.height - h) / 2)) / h) * height };
  };

  const onDown = (ev) => {
    const p = toLogical(ev), st = store.getState();
    const cur = st.elements.find((e) => e.id === st.selectedId);
    let hit = cur && !cur.locked && visualizer.boxOf(cur.id) && inside(visualizer.boxOf(cur.id), p.x, p.y) ? cur : null;
    if (!hit) for (let i = st.elements.length - 1; i >= 0; i--) {
      const e = st.elements[i], T = isPreviewHittable(e) && visualizer.boxOf(e.id);
      if (T && inside(T, p.x, p.y)) { hit = e; break; }
    }
    if (!hit) return actions.select(null);
    actions.select(hit.id);
    if (hit.locked) return;
    drag.current = { id: hit.id, p0: p, pos: [...hit.props.position], mode: 'move' };
    ev.currentTarget.setPointerCapture(ev.pointerId);
  };
  const onHandleDown = (ev) => {
    ev.stopPropagation();
    const st = store.getState(), el = st.elements.find((e) => e.id === st.selectedId);
    if (!el || el.locked) return;
    const T = visualizer.boxOf(el.id);
    if (!T) return;
    const p = toLogical(ev);
    drag.current = { id: el.id, mode: 'scale', origin: [T.x, T.y], d0: Math.hypot(p.x - T.x, p.y - T.y) || 1, scale: [...el.props.scale] };
    ev.currentTarget.setPointerCapture(ev.pointerId);
  };
  const onMove = (ev) => {
    const d = drag.current;
    if (!d) return;
    const p = toLogical(ev);
    if (d.mode === 'move') actions.updateProps(d.id, { position: [Math.round(d.pos[0] + p.x - d.p0.x), Math.round(d.pos[1] + p.y - d.p0.y)] }, 'drag');
    else { const r = Math.hypot(p.x - d.origin[0], p.y - d.origin[1]) / d.d0; actions.updateProps(d.id, { scale: [d.scale[0] * r, d.scale[1] * r] }, 'drag'); }
  };
  const onUp = () => { drag.current = null; };

  const { width, height, quality } = settings;
  const selectedEl = store.getState().elements.find((e) => e.id === selectedId);
  const selectedDef = selectedEl && getDefinition(selectedEl.type);
  const pts = box ? box.map((p) => `${(p[0] / width) * 100},${(p[1] / height) * 100}`).join(' ') : null;
  return (
    <div className="preview" ref={wrapRef}>
      <div className="stage" style={{ aspectRatio: `${width} / ${height}`, '--ar': width / height }}>
        <canvas ref={canvasRef} aria-label="Visualization preview" />
        <div className="hit" onPointerDown={onDown} onPointerMove={onMove} onPointerUp={onUp} onPointerCancel={onUp} />
        {pts && (
          <svg className="sel" viewBox="0 0 100 100" preserveAspectRatio="none" aria-hidden="true">
            <polygon points={pts} vectorEffect="non-scaling-stroke" />
          </svg>
        )}
        {box && !selectedEl?.locked && selectedDef?.kind !== 'provider' && selectedDef?.kind !== 'effect' && selectedDef?.render && (
          <div className="handle" style={{ left: `${(box[2][0] / width) * 100}%`, top: `${(box[2][1] / height) * 100}%` }}
            onPointerDown={onHandleDown} onPointerMove={onMove} onPointerUp={onUp} title="Drag to scale" />
        )}
        <div className="hud">{fps} fps · {Math.round(width * (visualizer.scaleOverride || QUALITY[quality].scale))}×{Math.round(height * (visualizer.scaleOverride || QUALITY[quality].scale))}</div>
      </div>
    </div>
  );
}
