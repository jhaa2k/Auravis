import { useEffect, useRef, useState } from 'react';
import { NumberInput } from '../ui/fields/primitives.jsx';
import InAppSelect from '../ui/InAppSelect.jsx';
import { useApp, useStore } from './hooks.js';
import { actions, audio, store, toast } from './services.js';
import LayerList from '../ui/LayerList.jsx';
import PropertiesPanel from '../ui/PropertiesPanel.jsx';
import PreviewPanel from '../ui/PreviewPanel.jsx';
import TransportBar from '../ui/TransportBar.jsx';
import SettingsPanel from '../ui/SettingsPanel.jsx';
import ExportPanel from '../ui/ExportPanel.jsx';
import PresetPanel from '../ui/PresetPanel.jsx';
import ProjectDialog from '../ui/ProjectDialog.jsx';
import Toasts from '../ui/Toasts.jsx';
import Icon from '../ui/Icon.jsx';
import { importProjectFile } from '../core/project/persistence.js';

const NAV = [['music','Music','music'],['elements','Elements','bars'],['properties','Properties','settings'],['scene','Filters','layers'],['settings','Settings','settings']];
const TITLES = { music:'Music Library', elements:'Elements & Tools', properties:'Properties', scene:'Cinematic Filters', settings:'App Settings', export:'Export Video' };

function MusicLibrary() {
  const state = useStore({ subscribe: audio.subscribe, getState: audio.getSnapshot });
  const picker = useRef(null);
  const importFiles = (files) => { const n = audio.addFiles(files); toast(n ? n + (n === 1 ? ' track imported' : ' tracks imported') : 'No supported audio files found', n ? 'info' : 'warning'); };
  return <div className="music-library">
    <div className="music-import">
      <div className="music-import-icon"><Icon name="music" size={23}/></div>
      <div className="music-import-copy"><b>Your music library</b><small>Import audio from your device. MP3, WAV, OGG, FLAC, M4A and AAC supported.</small></div>
      <button className="btn primary" onClick={() => picker.current?.click()}><Icon name="plus" size={15}/>Import</button>
      <input ref={picker} type="file" accept="audio/*,.mp3,.wav,.ogg,.flac,.m4a,.aac,.opus" multiple hidden onChange={(e)=>{importFiles([...e.target.files]);e.target.value='';}}/>
    </div>
    <div className="music-list-head"><b>Tracks</b><span>{state.tracks.length} {state.tracks.length===1?'track':'tracks'}</span></div>
    {state.tracks.length ? <ul className="music-track-list">{state.tracks.map((t,i)=><li key={t.name+':'+i} className={i===state.index?'current':''}>
      <button className="track-select" onClick={()=>audio.load(i,false)}><span className="track-art"><Icon name={i===state.index&&state.playing?'volume':'music'} size={17}/></span><span className="track-info"><b>{t.title||t.name}</b><small>{t.artist||t.name}</small></span>{i===state.index&&<span className="track-playing">{state.playing?'PLAYING':'SELECTED'}</span>}</button>
      <button className="icon-btn danger" title="Remove track" aria-label={'Remove '+t.name} onClick={()=>audio.removeTrack(i)}><Icon name="trash" size={17}/></button>
    </li>)}</ul> : <div className="music-empty"><Icon name="wave" size={28}/><b>No tracks imported</b><span>Import music to start creating audio-reactive visuals.</span></div>}
    <div className="music-library-note">Removing a track removes it from this session's library. The original file on your device is not deleted.</div>
  </div>;
}

function MoveAdjust() {
  const id=useApp(s=>s.selectedId), elements=useApp(s=>s.elements), settings=useApp(s=>s.project.settings);
  const el=elements.find(x=>x.id===id);
  const [unit,setUnit]=useState('px');
  if(!el||!Array.isArray(el.props.position))return null;
  const [px,py]=el.props.position,w=settings.width||1080,h=settings.height||1920;
  const convert=(v,d)=>unit==='px'?v:(v/d)*100;
  const toPx=(v,d)=>unit==='px'?v:(v/100)*d;
  const left=w/2+px,top=h/2+py,right=w-left,bottom=h-top;
  const setEdge=(edge,value)=>{
    const dim=(edge==='left'||edge==='right')?w:h,v=toPx(Number(value),dim);
    const nx=edge==='left'?v-w/2:edge==='right'?w/2-v:px;
    const ny=edge==='top'?v-h/2:edge==='bottom'?h/2-v:py;
    actions.updateProps(el.id,{position:[nx,ny]},'move-adjust');
  };
  const nudge=(dx,dy)=>actions.updateProps(el.id,{position:[px+dx*(unit==='px'?1:w/100),py+dy*(unit==='px'?1:h/100)]},'move-adjust');
  const scale=Array.isArray(el.props.scale)?el.props.scale:[1,1],uniform=!!el.props.scaleIsUniform,rotation=Number(el.props.rotation)||0;
  const updateScale=v=>actions.updateProps(el.id,{scale:uniform?[v,v]:[v,scale[1]]},'move-adjust');
  return <section className="move-adjust">
    <div className="move-adjust-title"><span><Icon name="move" size={15}/>Move &amp; Adjust</span><small>{el.props.tag}</small></div>
    <div className="move-direction-pad" aria-label="Nudge selected element">
      <span/>
      <button type="button" aria-label="Move up" onClick={()=>nudge(0,-1)}><Icon name="up" size={15}/></button>
      <span/>
      <button type="button" aria-label="Move left" onClick={()=>nudge(-1,0)}><Icon name="left" size={15}/></button>
      <button type="button" aria-label="Center element" onClick={()=>actions.updateProps(el.id,{position:[0,0]},'move-adjust')}><Icon name="crosshair" size={15}/></button>
      <button type="button" aria-label="Move right" onClick={()=>nudge(1,0)}><Icon name="right" size={15}/></button>
      <span/>
      <button type="button" aria-label="Move down" onClick={()=>nudge(0,1)}><Icon name="down" size={15}/></button>
      <span/>
    </div>
    <div className="move-edge-row">
      <label className="move-edge"><span>LEFT</span><NumberInput value={convert(left,w)} min={unit==='px'?-w:-100} max={unit==='px'?w:200} step={unit==='px'?1:.1} onChange={v=>setEdge('left',v)}/></label>
      <label className="move-edge"><span>TOP</span><NumberInput value={convert(top,h)} min={unit==='px'?-h:-100} max={unit==='px'?h:200} step={unit==='px'?1:.1} onChange={v=>setEdge('top',v)}/></label>
      <label className="move-edge"><span>RIGHT</span><NumberInput value={convert(right,w)} min={unit==='px'?-w:-100} max={unit==='px'?w:200} step={unit==='px'?1:.1} onChange={v=>setEdge('right',v)}/></label>
      <label className="move-edge"><span>BOTTOM</span><NumberInput value={convert(bottom,h)} min={unit==='px'?-h:-100} max={unit==='px'?h:200} step={unit==='px'?1:.1} onChange={v=>setEdge('bottom',v)}/></label>
    </div>
    <div className="move-wide-select"><span>POSITION UNIT</span><InAppSelect value={unit} options={[{value:'px',label:'Pixels (px)'},{value:'percent',label:'Percentage (%)'}]} onChange={setUnit}/></div>
    <div className="move-subhead"><b>TRANSFORM</b></div>
    <div className="move-transform-row"><span>Scale</span><NumberInput value={scale[0]} min={.01} max={12} step={.01} onChange={updateScale}/><InAppSelect value={uniform?'uniform':'independent'} options={[{value:'uniform',label:'Uniform'},{value:'independent',label:'Independent'}]} onChange={v=>actions.updateProps(el.id,{scaleIsUniform:v==='uniform',scale:v==='uniform'?[scale[0],scale[0]]:scale},'move-adjust')}/></div>
    <div className="move-transform-row"><span>Rotation</span><NumberInput value={rotation} min={-720} max={720} step={.1} onChange={v=>actions.updateProps(el.id,{rotation:v},'move-adjust')}/><InAppSelect value="degrees" options={[{value:'degrees',label:'Degrees (°)'}]} onChange={()=>{}}/></div>
    <div className="move-wide-select"><span>BLEND MODE</span><InAppSelect value={el.props.blendMode||'normal'} options={['normal','alpha','add','multiply','screen','overlay','softLight','hardLight','difference'].map(v=>({value:v,label:v}))} onChange={v=>actions.updateProps(el.id,{blendMode:v},'move-adjust')}/></div>
  </section>;
}
export default function App() {
  const name=useApp(s=>s.project.name), dirty=useApp(s=>s.dirty);
  const theme=useApp(s=>s.project.settings.theme);
  useEffect(()=>{document.documentElement.dataset.auravisTheme=theme||'dark';},[theme]);
  const canUndo=useApp(s=>s.past.length>0), canRedo=useApp(s=>s.future.length>0);
  const [overlay,setOverlay]=useState(''), [dialog,setDialog]=useState(false);
  useEffect(()=>{
    const warn=e=>{if(store.getState().dirty){e.preventDefault();e.returnValue='';}};
    const openPanel=e=>setOverlay(e.detail||'music');
    const importFile=async e=>{
      const file=e.detail?.file;if(!file)return;
      if(file.name?.toLowerCase().endsWith('.viz')){toast('Avee .viz import needs a real sample file to implement and validate its format. This file was not modified or imported.','warning');return;}
      try{const p=await importProjectFile(file);actions.loadProject({id:null,name:p.name,version:1,settings:p.settings},p.elements);toast(p.warnings.length?'Imported with '+p.warnings.length+' repaired value(s)':'Imported '+p.name,p.warnings.length?'warning':'info');setOverlay('');}
      catch(error){toast(error.message||'Could not import this project file','error');}
    };
    window.addEventListener('auravis:open-panel',openPanel);
    window.addEventListener('auravis:import-project-file',importFile);
    window.addEventListener('beforeunload',warn);
    return()=>{window.removeEventListener('beforeunload',warn);window.removeEventListener('auravis:open-panel',openPanel);window.removeEventListener('auravis:import-project-file',importFile);};
  },[overlay]);
  const openPanel=key=>{if(key==='properties'&&!store.getState().selectedId)setOverlay('elements');else setOverlay(v=>v===key?'':key);};
  return <div className="app modern-app">
    <header className="topbar modern-topbar">
      <div className="brand"><svg viewBox="0 0 64 64" width="27" height="27" aria-hidden="true"><rect width="64" height="64" rx="12" fill="#101114"/><path d="M32 10 12 54h9l11-25 11 25h9L32 10Z" fill="#f1f2f4"/><path d="M23 42h5v8h-5zm8-7h5v15h-5zm8 5h5v10h-5z" fill="#ff9675"/></svg><span>Auravis</span></div>
      <button className="project-name" onClick={()=>setDialog(true)}>{name}{dirty?' •':''}</button>
      <div className="row-gap"><button className="icon-btn" title="Undo" disabled={!canUndo} onClick={()=>actions.undo()}><Icon name="undo"/></button><button className="icon-btn" title="Redo" disabled={!canRedo} onClick={()=>actions.redo()}><Icon name="redo"/></button><button className="btn small primary top-export" title="Export video" onClick={()=>setOverlay('export')}><Icon name="download" size={14}/>Export</button></div>
    </header>
    <main className="modern-workspace">
      <section className="modern-preview" aria-label="Video preview"><PreviewPanel/></section>
      <section className="modern-controls" aria-label="Editor control dock">
        <div className="dock-section-label"><span>PLAYBACK & TIMELINE</span><span className="dock-live"><i/> LIVE PREVIEW</span></div>
        <div className="dock-playback"><TransportBar/></div>
        <div className="dock-inspector">
          <div className="dock-section-label"><span>QUICK INSPECTOR</span><span>SELECTED LAYER</span></div>
          <MoveAdjust/>
        </div>
        <div className="dock-footer"><span>TOOLS & PROPERTIES</span><span>Use the dock below to open editor panels</span></div>
      </section>
    </main>
    <nav className="bottom-nav" aria-label="Main tools">{NAV.map(([k,label,icon])=><button key={k} className={overlay===k?'active':''} aria-pressed={overlay===k} onClick={()=>openPanel(k)}><Icon name={icon} size={19}/><span>{label}</span></button>)}</nav>
    {overlay&&<div className="panel-overlay-root" onMouseDown={e=>{if(e.target===e.currentTarget)setOverlay('');}}>
      <section className="panel-overlay" role="dialog" aria-modal="true" aria-label={TITLES[overlay]}><div className="overlay-grabber"/>
        <header className="overlay-header"><div><b>{TITLES[overlay]}</b><small>{overlay==='properties'?'Edit the selected layer':overlay==='music'?'Import, select and manage tracks':'Editor controls'}</small></div><button className="icon-btn" onClick={()=>setOverlay('')} aria-label="Close panel"><Icon name="close"/></button></header>
        <div className="overlay-content">
          {overlay==='music'&&<MusicLibrary/>}{overlay==='elements'&&<LayerList/>}{overlay==='properties'&&<PropertiesPanel/>}{overlay==='scene'&&<PresetPanel/>}{overlay==='settings'&&<SettingsPanel/>}{overlay==='export'&&<ExportPanel/>}
        </div>
      </section>
    </div>}
    {dialog&&<ProjectDialog onClose={()=>setDialog(false)}/>}<Toasts/>
  </div>;
}
