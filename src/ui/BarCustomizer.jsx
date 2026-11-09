import { useMemo, useState } from 'react';
import { useApp } from '../app/hooks.js';
import { actions, visualizer } from '../app/services.js';
import { BAR_SHAPES } from '../core/render/shapes.js';
import { ColorInput, NumberInput, Slider, Toggle } from './fields/primitives.jsx';
import InAppSelect from './InAppSelect.jsx';

export default function BarCustomizer({ element }) {
  const elements=useApp(s=>s.elements);
  const [index,setIndex]=useState(0);
  const provider=elements.filter(e=>e.type==='audioProvider')[element.props.audioProviderIndex-1];
  const providerIndex=provider?elements.filter(e=>e.type==='audioProvider').indexOf(provider):0;
  const count=visualizer.rc.audio?.providers?.[providerIndex]?.out?.samples?.length||provider?.props.sampleOutCount||96;
  const barIndex=Math.max(0,Math.min(count-1,index));
  const overrides=element.props.barOverrides||{};
  const current=overrides[barIndex]||{};
  const update=patch=>{
    const next={...overrides,[barIndex]:{...current,...patch}};
    actions.updateProps(element.id,{barOverrides:next},'bar-customizer');
  };
  const shapeOptions=useMemo(()=>BAR_SHAPES.filter(x=>x.value!=='custom'),[]);
  return <section className="section open bar-customizer">
    <div className="section-head static">Individual Bar Editor</div>
    <div className="section-body">
      <div className="bar-editor-intro">Select any bar and edit it independently. Changes are saved with this visualizer layer.</div>
      <div className="field"><label>Bar index · {count} total</label><InAppSelect value={barIndex} options={Array.from({length:count},(_,i)=>({value:i,label:`Bar ${String(i+1).padStart(2,'0')} / ${count}`}))} onChange={v=>setIndex(Number(v))}/></div>
      <div className="bar-editor-toggle"><span>Enable this bar</span><Toggle checked={current.enabled!==false} onChange={v=>update({enabled:v})} label="Enable selected bar"/></div>
      <div className="field"><label>Bar color</label><ColorInput value={current.color||'#ffffffff'} onChange={v=>update({color:v})}/></div>
      <div className="bar-editor-pair">
        <label><span>Height multiplier</span><NumberInput value={current.height??1} min={0} max={8} step={.01} onChange={v=>update({height:v})}/></label>
        <label><span>Width multiplier</span><NumberInput value={current.width??1} min={.05} max={2} step={.01} onChange={v=>update({width:v})}/></label>
        <label><span>Horizontal offset</span><NumberInput value={current.offsetX??0} min={-800} max={800} step={1} onChange={v=>update({offsetX:v})}/></label>
        <label><span>Vertical offset</span><NumberInput value={current.offsetY??0} min={-800} max={800} step={1} onChange={v=>update({offsetY:v})}/></label>
        <label><span>Rotation</span><NumberInput value={current.rotation??0} min={-180} max={180} step={.1} onChange={v=>update({rotation:v})}/></label>
        <label><span>Opacity</span><Slider value={current.opacity??1} min={0} max={1} step={.01} resetValue={1} onChange={v=>update({opacity:v})}/></label>
      </div>
      <div className="field"><label>Individual shape</label><InAppSelect value={current.shape||'global'} options={[{value:'global',label:'Use global bar shape'},...shapeOptions.map(x=>({value:x.value,label:x.label}))]} onChange={v=>update({shape:v==='global'?null:v})}/></div>
      <div className="bar-editor-actions"><button className="btn small" onClick={()=>{const next={...overrides};delete next[barIndex];actions.updateProps(element.id,{barOverrides:next},'bar-customizer');}}>Clear this bar</button><button className="btn small" onClick={()=>setIndex(v=>(v+1)%count)}>Next bar</button></div>
    </div>
  </section>;
}
