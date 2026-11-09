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

export function Slider({ value, onChange, min, max, step, resetValue }) {
  const lastTap=useRef(0);
  const normalized=Math.min(max,Math.max(min,value));
  const change=e=>onChange(parseFloat(parseFloat(e.target.value).toFixed(decimals(step)+1)));
  const handlePointerUp=()=>{
    if(resetValue===undefined)return;
    const now=Date.now();
    if(now-lastTap.current<340){onChange(resetValue);lastTap.current=0;}
    else lastTap.current=now;
  };
  return <input className="range" type="range" value={normalized} min={min} max={max} step={step}
    style={{ '--pct': `${((normalized-min)/(max-min||1))*100}%` }}
    onChange={change} onPointerUp={handlePointerUp}
    onDoubleClick={()=>{if(resetValue!==undefined)onChange(resetValue);}}
    title={resetValue===undefined?'':'Double-tap to reset'} />;
}

export function Toggle({ checked, onChange, label }) {
  return (
    <button type="button" role="switch" aria-checked={checked} aria-label={label} className={`switch ${checked ? 'on' : ''}`} onClick={() => onChange(!checked)}><span /></button>
  );
}

export function ColorInput({ value, onChange, resetValue }) {
  const c = parseColor(value);
  const rgb = hex6(value);
  const setRgb = (h) => { const n = parseColor(h); onChange(toHex({ r: n.r, g: n.g, b: n.b, a: c.a })); };
  return (
    <div className="color-row">
      <input type="color" value={rgb} onChange={(e) => setRgb(e.target.value)} aria-label="Color" />
      <Slider value={c.a} min={0} max={1} step={0.01} resetValue={resetValue===undefined?undefined:parseColor(resetValue).a} onChange={(a) => onChange(toHex({ r: c.r, g: c.g, b: c.b, a }))} />
      <span className="alpha">{Math.round(c.a * 100)}%</span>
    </div>
  );
}
