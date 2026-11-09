import { useState, useEffect, useRef } from 'react';
import { hex6, parseColor, toHex } from '../../core/utils/color.js';

const decimals = step => (String(step).split('.')[1] || '').length;
export function NumberInput({value,onChange,min,max,step=0.01,className=''}) {
 const [text,setText]=useState(String(+value.toFixed(4)));
 useEffect(()=>setText(String(+value.toFixed(4))),[value]);
 return <input className={`num ${className}`} type="number" value={text} min={min} max={max} step={step} onChange={e=>{setText(e.target.value);const v=parseFloat(e.target.value);if(Number.isFinite(v))onChange(v);}} onBlur={()=>setText(String(+value.toFixed(4)))}/>;
}
export function Slider({value,onChange,min,max,step,resetValue}) {
 const lastTap=useRef(0),normalized=Math.min(max,Math.max(min,value));
 const change=e=>onChange(parseFloat(parseFloat(e.target.value).toFixed(decimals(step)+1)));
 const handlePointerUp=()=>{if(resetValue===undefined)return;const now=Date.now();if(now-lastTap.current<340){onChange(resetValue);lastTap.current=0;}else lastTap.current=now;};
 return <input className="range" type="range" value={normalized} min={min} max={max} step={step} style={{'--pct':`${((normalized-min)/(max-min||1))*100}%`}} onChange={change} onPointerUp={handlePointerUp} onDoubleClick={()=>{if(resetValue!==undefined)onChange(resetValue);}} title={resetValue===undefined?'':'Double-tap to reset'}/>;
}
export function Toggle({checked,onChange,label}) {
 return <button type="button" role="switch" aria-checked={checked} aria-label={label} className={`switch ${checked?'on':''}`} onClick={()=>onChange(!checked)}><span/></button>;
}
const PALETTE=['#ffffff','#d9e2f2','#a5b4fc','#67e8f9','#34d399','#a3e635','#facc15','#fb923c','#fb7185','#f472b6','#c084fc','#818cf8','#64748b','#475569','#27272a','#000000'];
export function ColorInput({value,onChange,resetValue}) {
 const [open,setOpen]=useState(false),c=parseColor(value),rgb=hex6(value);
 const [hex,setHex]=useState(rgb);
 useEffect(()=>setHex(hex6(value)),[value]);
 const updateChannel=(key,v)=>onChange(toHex({...c,[key]:Number(v)}));
 const commitHex=()=>{try{const next=parseColor(hex);onChange(toHex({...next,a:c.a}));setHex(hex6(hex));}catch{}};
 return <div className="color-control">
  <div className="color-row">
   <button type="button" className="color-swatch-trigger" style={{'--swatch':rgb}} onClick={()=>setOpen(true)} aria-label="Open color picker"><i/>{rgb.toUpperCase()} <span>EDIT</span></button>
   <Slider value={c.a} min={0} max={1} step={0.01} resetValue={resetValue===undefined?undefined:parseColor(resetValue).a} onChange={a=>onChange(toHex({...c,a}))}/>
   <span className="alpha">{Math.round(c.a*100)}%</span>
  </div>
  {open&&<div className="color-picker-backdrop" onPointerDown={e=>{if(e.target===e.currentTarget)setOpen(false);}}>
   <section className="color-picker-sheet" role="dialog" aria-modal="true" aria-label="Color customization">
    <div className="color-picker-grabber"/>
    <header><div><b>Color</b><small>Customize fill and opacity</small></div><button type="button" onClick={()=>setOpen(false)} aria-label="Close color picker">×</button></header>
    <div className="color-picker-current"><span style={{background:rgb}}/><input aria-label="Hex color" value={hex} maxLength={7} onChange={e=>setHex(e.target.value)} onBlur={commitHex} onKeyDown={e=>{if(e.key==='Enter'){commitHex();e.currentTarget.blur();}}}/><button type="button" onClick={()=>resetValue!==undefined&&onChange(resetValue)}>Reset</button></div>
    <div className="color-palette">{PALETTE.map(color=><button type="button" key={color} aria-label={color} style={{background:color}} className={hex.toLowerCase()===color?'selected':''} onClick={()=>{setHex(color);onChange(toHex({...parseColor(color),a:c.a}));}}/>)}</div>
    <div className="color-channel-list">{[['Red','r'],['Green','g'],['Blue','b']].map(([label,key])=><label key={key}><span>{label}</span><input type="range" min="0" max="255" value={Math.round(c[key])} onChange={e=>updateChannel(key,e.target.value)}/><output>{Math.round(c[key])}</output></label>)}
    <label><span>Opacity</span><input type="range" min="0" max="100" value={Math.round(c.a*100)} onChange={e=>onChange(toHex({...c,a:Number(e.target.value)/100}))}/><output>{Math.round(c.a*100)}%</output></label></div>
    <button type="button" className="color-picker-done" onClick={()=>{commitHex();setOpen(false);}}>Apply color</button>
   </section>
  </div>}
 </div>;
}
