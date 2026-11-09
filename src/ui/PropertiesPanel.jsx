import { useEffect, useState } from 'react';
import { useApp, useStore } from '../app/hooks.js';
import { actions, audio, diagStore, imageCache, toast, visualizer } from '../app/services.js';
import { getDefinition } from '../core/schema/registry.js';
import FieldRenderer from './fields/FieldRenderer.jsx';
import Icon from './Icon.jsx';
import BarCustomizer from './BarCustomizer.jsx';
function Section({section,open,onToggle,children}) {
  return <section className={`section ${open?'open':''}`}><button className="section-head" onClick={onToggle} aria-expanded={open}><Icon name="chevron" size={14}/>{section.name}</button>{open&&<div className="section-body">{children}</div>}</section>;
}
export default function PropertiesPanel() {
  const elements=useApp(s=>s.elements), selectedId=useApp(s=>s.selectedId), diags=useStore(diagStore), el=elements.find(e=>e.id===selectedId);
  const [openKey,setOpenKey]=useState('');
  useEffect(()=>{if(el)setOpenKey(`${el.type}:0`);},[el?.id,el?.type]);
  if(!el)return <div className="empty">Select an element from Elements to edit its properties.</div>;
  const def=getDefinition(el.type), problems=diags[el.id]||[];
  const onChange=(key,value,coalesce)=>{const errs=actions.updateProps(el.id,{[key]:value},coalesce);if(errs.length&&!coalesce)toast(errs[0],'warning');};
  const onAction=key=>{const patch=def.actions?.[key]?.(el,{images:imageCache,meta:audio.meta,cache:visualizer.rc.cache});if(!patch)return;if(patch._error)return toast(patch._error,'warning');actions.updateProps(el.id,patch);};
  return <div className="props modern-props">
    <header className="props-head"><span className="type-badge"><Icon name={def.icon} size={16}/>{def.label}</span></header>
    {problems.length>0&&<ul className="problems" aria-label="Problems">{problems.map((p,i)=><li key={i} className={p.level}><Icon name={p.level==='error'?'error':p.level==='warning'?'warn':'info'} size={15}/>{p.message}</li>)}</ul>}
    {def.sections.map((section,i)=>{const k=`${el.type}:${i}`;return <Section key={section.name} section={section} open={openKey===k} onToggle={()=>setOpenKey(v=>v===k?'':k)}>{section.props.map(p=><FieldRenderer key={p.key} def={p} el={el} elements={elements} onChange={onChange} onReset={k=>actions.resetProps(el.id,[k])} onAction={onAction}/>)}</Section>;})}
    {el.type==='barsSegments'&&<BarCustomizer element={el}/>}
  </div>;
}
