import { useState, useEffect, useRef } from 'react';
import { hex6, parseColor, toHex } from '../../core/utils/color.js';

const decimals = (step) => (String(step).split('.')[1] || '').length;

export function NumberInput({ value, onChange, min, max, step = 0.01, className = '' }) {
  const [text, setText] = useState(String(+value.toFixed(4)));
  useEffect(() => setText(String(+value.toFixed(4))), [value]);
  return (
    <input className={`num ${className}`} type="number" value={text} min={min} max={max} step={step}
      onChange={(e) => { setText(e.target.value); const v = parseFloat(e.target.value); if (Number.isFinite(v)) onChange(v); }}
      onBlur={() => setText(String(+value.toFixed(4)))} />
  );
}

export function Slider({ value, onChange, min, max, step, resetValue, onReset }) {
  const lastTap = useRef(null);
  const pointerStart = useRef(null);
  const handlePointerDown = (event) => {
    pointerStart.current = { x: event.clientX, y: event.clientY };
  };
  const handlePointerUp = (event) => {
    if (!onReset || !pointerStart.current) return;
    const start = pointerStart.current;
    pointerStart.current = null;
    if (Math.hypot(event.clientX - start.x, event.clientY - start.y) > 10) {
      lastTap.current = null;
      return;
    }
    const now = performance.now();
    const previous = lastTap.current;
    if (previous && now - previous.time < 400 && Math.hypot(event.clientX - previous.x, event.clientY - previous.y) < 28) {
      lastTap.current = null;
      event.preventDefault();
      onReset(resetValue);
    } else {
      lastTap.current = { time: now, x: event.clientX, y: event.clientY };
    }
  };
  return <input className="range" type="range" value={Math.min(max, Math.max(min, value))} min={min} max={max} step={step}
    style={{ '--pct': `${((Math.min(max, Math.max(min, value)) - min) / (max - min || 1)) * 100}%` }}
    onPointerDown={handlePointerDown} onPointerUp={handlePointerUp}
    onChange={(e) => onChange(parseFloat(parseFloat(e.target.value).toFixed(decimals(step) + 1)))}
    title={onReset ? 'Double-tap to reset to default' : undefined}
    aria-description={onReset ? 'Double-tap to reset to default' : undefined} />;
}

export function Toggle({ checked, onChange, label }) {
  return (
    <button type="button" role="switch" aria-checked={checked} aria-label={label} className={`switch ${checked ? 'on' : ''}`} onClick={() => onChange(!checked)}><span /></button>
  );
}

export function ColorInput({ value, onChange, resetValue }) {
  const c = parseColor(value);
  const resetColor = parseColor(resetValue ?? value);
  const rgb = hex6(value);
  const setRgb = (h) => { const n = parseColor(h); onChange(toHex({ r: n.r, g: n.g, b: n.b, a: c.a })); };
  return (
    <div className="color-row">
      <input type="color" value={rgb} onChange={(e) => setRgb(e.target.value)} aria-label="Color" />
      <Slider value={c.a} min={0} max={1} step={0.01} resetValue={resetColor.a}
        onChange={(a) => onChange(toHex({ r: c.r, g: c.g, b: c.b, a }))}
        onReset={(a) => onChange(toHex({ r: c.r, g: c.g, b: c.b, a }))} />
      <span className="alpha">{Math.round(c.a * 100)}%</span>
    </div>
  );
}
