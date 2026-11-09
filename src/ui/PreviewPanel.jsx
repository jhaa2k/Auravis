import { useEffect, useRef, useState } from 'react';
import { useApp } from '../app/hooks.js';
import { store, visualizer } from '../app/services.js';
import { getDefinition } from '../core/schema/registry.js';

/** Screen-space corners of the selected element box. */
function corners(T) {
  const rot = T.rot, c = Math.cos(rot), s = Math.sin(rot);
  return [[0, 0], [T.bw, 0], [T.bw, T.bh], [0, T.bh]].map(([u, v]) => {
    const x = (u - T.ax * T.bw) * T.sx, y = (v - T.ay * T.bh) * T.sy;
    return [T.x + x * c - y * s, T.y + x * s + y * c];
  });
}

export default function PreviewPanel({ preferences }) {
  const canvasRef = useRef(null);
  const settings = useApp((s) => s.project.settings);
  const [box, setBox] = useState(null);

  useEffect(() => {
    visualizer.canvas = canvasRef.current;
    visualizer.start();
    return () => visualizer.stop();
  }, []);

  useEffect(() => {
    let last = '';
    const fn = () => {
      const state = store.getState();
      const el = state.elements.find((item) => item.id === state.selectedId);
      const T = el && getDefinition(el.type).kind !== 'provider' ? visualizer.boxOf(el.id) : null;
      const points = T ? corners(T).map((point) => point.map((value) => +value.toFixed(1))) : null;
      const key = JSON.stringify(points);
      if (key !== last) { last = key; setBox(points); }
    };
    visualizer.hudListeners.add(fn);
    return () => visualizer.hudListeners.delete(fn);
  }, []);

  const { width, height } = settings;
  const points = box ? box.map((point) => `${(point[0] / width) * 100},${(point[1] / height) * 100}`).join(' ') : null;
  return (
    <div className="preview">
      <div className="preview-meta">
        <span className="preview-live">PREVIEW</span><span className="preview-size">{width}×{height}</span>
      </div>
      <div className="stage" style={{ aspectRatio: `${width} / ${height}`, '--ar': width / height }}>
        <canvas ref={canvasRef} aria-label="Visualization preview" />
        {points && (
          <svg className="sel" viewBox="0 0 100 100" preserveAspectRatio="none" aria-hidden="true">
            <polygon points={points} vectorEffect="non-scaling-stroke" />
          </svg>
        )}
        {(preferences?.guides || preferences?.safeArea) && (
          <svg className="preview-guides" viewBox="0 0 100 100" preserveAspectRatio="none" aria-hidden="true">
            {preferences.guides && <g className="guide-lines"><path d="M33.333 0v100M66.667 0v100M0 33.333h100M0 66.667h100" /></g>}
            {preferences.safeArea && <rect className="safe-area-line" x="10" y="10" width="80" height="80" />}
          </svg>
        )}
      </div>
    </div>
  );
}
