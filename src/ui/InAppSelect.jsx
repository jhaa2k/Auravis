import { useEffect, useRef, useState } from 'react';
import Icon from './Icon.jsx';

/** Theme-aware in-app selector. Never opens a native OS select popup. */
export default function InAppSelect({ value, onChange, options = [], ariaLabel = 'Choose an option', disabled = false }) {
  const [open,setOpen]=useState(false);
  const root=useRef(null);
  const current=options.find(o=>String(o.value)===String(value));
  useEffect(()=>{
    const outside=e=>{if(!root.current?.contains(e.target))setOpen(false);};
    const keys=e=>{if(e.key==='Escape')setOpen(false);};
    document.addEventListener('pointerdown',outside);document.addEventListener('keydown',keys);
    return()=>{document.removeEventListener('pointerdown',outside);document.removeEventListener('keydown',keys);};
  },[]);
  return <div className={`inapp-select ${open?'is-open':''}`} ref={root}>
    <button type="button" className="inapp-select-trigger" disabled={disabled} aria-label={ariaLabel} aria-haspopup="listbox" aria-expanded={open} onClick={()=>setOpen(v=>!v)}>
      <span>{current?.label ?? String(value ?? 'Select')}</span><Icon name="chevron" size={14}/>
    </button>
    {open&&<div className="inapp-select-menu" role="listbox" aria-label={ariaLabel}>
      {options.map((o,i)=><button type="button" role="option" aria-selected={String(o.value)===String(value)} key={String(o.value)+':'+i} className={String(o.value)===String(value)?'selected':''} onClick={()=>{onChange(o.value);setOpen(false);}}>
        <span>{o.label}</span>{String(o.value)===String(value)&&<Icon name="check" size={14}/>}
      </button>)}
    </div>}
  </div>;
}
