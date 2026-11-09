import { useEffect, useRef, useState } from 'react';
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
import { nativeVisualizer, isNativeVisualizerAvailable } from '../core/audio/nativeVisualizer.js';

const NAV = [['music','Music','music'],['elements','Elements','bars'],['properties','Properties','settings'],['scene','Scene','layers'],['settings','Settings','settings']];
const TITLES = { music:'Music Library', elements:'Elements & Tools', properties:'Properties', scene:'Visual Scenes & Presets', settings:'App Settings', export:'Export Video' };

function MusicLibrary() {
  const state = useStore({ subscribe: audio.subscribe, getState: audio.getSnapshot });
  const picker = useRef(null);
  const [nativeTrack, setNativeTrack] = useState('');
  const [nativePlaying, setNativePlaying] = useState(false);
  useEffect(() => {
    if (!isNativeVisualizerAvailable) return;
    let subscription;
    nativeVisualizer.addListener('nativePlaybackState', (event) => setNativePlaying(!!event.playing))
      .then((handle) => { subscription = handle; })
      .catch((error) => console.error('Native playback listener failed:', error));
    return () => subscription?.remove();
  }, []);
  const importNativeAudio = async () => {
    try {
      const selected = await nativeVisualizer.pickAudio();
      await nativeVisualizer.load(selected.uri, true);
      setNativeTrack(selected.name || 'Selected audio');
      toast('Native audio loaded. Spectrum is connected to the visualizer.', 'info');
    } catch (error) {
      if (!/cancel|no audio file/i.test(error?.message || '')) toast(error?.message || 'Could not load native audio', 'error');
    }
  };
  const importFiles = (files) => { const n = audio.addFiles(files); toast(n ? n + (n === 1 ? ' track imported' : ' tracks imported') : 'No supported audio files found', n ? 'info' : 'warning'); };
  return <div className="music-library">
    <div className="music-import">
      <div className="music-import-icon"><Icon name="music" size={23}/></div>
      <div className="music-import-copy"><b>Your music library</b><small>Import audio from your device. MP3, WAV, OGG, FLAC, M4A and AAC supported.</small></div>
      <button className="btn primary" onClick={() => picker.current?.click()}><Icon name="plus" size={15}/>Import</button>
      {isNativeVisualizerAvailable && <button className="btn" onClick={importNativeAudio}><Icon name="audio-waveform" size={15}/>Native audio</button>}
      <input ref={picker} type="file" accept="audio/*,.mp3,.wav,.ogg,.flac,.m4a,.aac,.opus" multiple hidden onChange={(e)=>{importFiles([...e.target.files]);e.target.value='';}}/>
    </div>
    {nativeTrack && isNativeVisualizerAvailable && <div className="music-library-note">
      <b>Native player:</b> {nativeTrack}
      <button className="btn small" onClick={() => nativePlaying ? nativeVisualizer.pause() : nativeVisualizer.play()}>{nativePlaying ? 'Pause' : 'Play'}</button>
      <button className="btn small" onClick={async () => { await nativeVisualizer.release(); setNativeTrack(''); setNativePlaying(false); }}>Stop</button>
    </div>}
    <div className="music-list-head"><b>Tracks</b><span>{state.tracks.length} {state.tracks.length===1?'track':'tracks'}</span></div>
    {state.tracks.length ? <ul className="music-track-list">{state.tracks.map((t,i)=><li key={t.name+':'+i} className={i===state.index?'current':''}>
      <button className="track-select" onClick={()=>audio.load(i,false)}><span className="track-art"><Icon name={i===state.index&&state.playing?'volume':'music'} size={17}/></span><span className="track-info"><b>{t.title||t.name}</b><small>{t.artist||t.name}</small></span>{i===state.index&&<span className="track-playing">{state.playing?'PLAYING':'SELECTED'}</span>}</button>
      <button className="icon-btn danger" title="Remove track" aria-label={'Remove '+t.name} onClick={()=>audio.removeTrack(i)}><Icon name="trash" size={17}/></button>
    </li>)}</ul> : <div className="music-empty"><Icon name="wave" size={28}/><b>No tracks imported</b><span>Import music to start creating audio-reactive visuals.</span></div>}
    <div className="music-library-note">Removing a track removes it from this session's library. The original file on your device is not deleted.</div>
  </div>;
}

function MoveAdjust() {
  const id = useApp(s=>s.selectedId), elements = useApp(s=>s.elements), settings = useApp(s=>s.project.settings);
  const el = elements.find(x=>x.id===id);
  const [snap,setSnap]=useState(false);
  if (!el || !Array.isArray(el.props.position)) return null;
  const x = Math.max(0,Math.min(1,0.5+el.props.position[0]/Math.max(1,settings.width)));
  const y = Math.max(0,Math.min(1,0.5+el.props.position[1]/Math.max(1,settings.height)));
  const update = (nx,ny)=>{const q=v=>snap?Math.round(v/.05)*.05:v;actions.updateProps(el.id,{position:[(q(nx)-.5)*settings.width,(q(ny)-.5)*settings.height]},'position');};
  const scale=Array.isArray(el.props.scale)?Math.max(...el.props.scale):null;
  const rotation=typeof el.props.rotation==='number'?el.props.rotation:null;
  return <section className="move-adjust">
    <div className="move-adjust-title"><span><Icon name="motion" size={15}/>Move & Adjust</span><div className="move-adjust-actions"><button className={snap?'active':''} aria-pressed={snap} onClick={()=>setSnap(v=>!v)}>Snap {snap?'ON':'OFF'}</button><button onClick={()=>actions.updateProps(el.id,{position:[0,0]})}><Icon name="reset" size={14}/>Center</button></div></div>
    <div className="move-adjust-grid">
      <label><span>HORIZONTAL</span><input type="range" min="0" max="1" step=".001" value={x} onChange={e=>update(+e.target.value,y)}/><output>{x.toFixed(3)}</output></label>
      <label><span>VERTICAL</span><input type="range" min="0" max="1" step=".001" value={y} onChange={e=>update(x,+e.target.value)}/><output>{y.toFixed(3)}</output></label>
    </div>
    {(scale!==null||rotation!==null)&&<div className="move-adjust-extra">
      {scale!==null&&<label><span>SIZE</span><input type="range" min=".05" max="4" step=".001" value={Math.min(4,Math.max(.05,scale))} onChange={e=>{const v=+e.target.value;actions.updateProps(el.id,{scale:el.props.scaleIsUniform?[v,v]:[v,el.props.scale[1]]},'scale');}}/><output>{scale.toFixed(3)}</output></label>}
      {rotation!==null&&<label><span>ROTATION</span><input type="range" min="-180" max="180" step=".1" value={rotation} onChange={e=>actions.updateProps(el.id,{rotation:+e.target.value},'rotation')}/><output>{rotation.toFixed(1)}°</output></label>}
    </div>}
  </section>;
}

export default function App() {
  const name=useApp(s=>s.project.name), dirty=useApp(s=>s.dirty);
  const theme=useApp(s=>s.project.settings.theme);
  useEffect(()=>{document.documentElement.dataset.auravisTheme=theme||'dark';},[theme]);
  const canUndo=useApp(s=>s.past.length>0), canRedo=useApp(s=>s.future.length>0);
  const [overlay,setOverlay]=useState(''), [dialog,setDialog]=useState(false);
  useEffect(()=>{
    const onKey=e=>{
      const typing=/INPUT|TEXTAREA|SELECT/.test(document.activeElement?.tagName||'')&&document.activeElement.type!=='range'&&document.activeElement.type!=='checkbox';
      const mod=e.ctrlKey||e.metaKey;
      if(mod&&e.key.toLowerCase()==='z'&&!typing){e.preventDefault();e.shiftKey?actions.redo():actions.undo();}
      else if(mod&&e.key.toLowerCase()==='y'&&!typing){e.preventDefault();actions.redo();}
      else if(mod&&e.key.toLowerCase()==='d'&&!typing){e.preventDefault();const id=store.getState().selectedId;id&&actions.duplicateElement(id);}
      else if(e.code==='Space'&&!typing&&document.activeElement?.tagName!=='BUTTON'){e.preventDefault();if(audio.snapshot.hasAudio)audio.toggle();}
      else if((e.key==='Delete'||e.key==='Backspace')&&!typing&&overlay!=='music'){const id=store.getState().selectedId;id&&actions.deleteElement(id);}
      else if(e.key==='Escape')setOverlay('');
    };
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
    window.addEventListener('keydown',onKey);window.addEventListener('beforeunload',warn);
    return()=>{window.removeEventListener('keydown',onKey);window.removeEventListener('beforeunload',warn);window.removeEventListener('auravis:open-panel',openPanel);window.removeEventListener('auravis:import-project-file',importFile);};
  },[overlay]);
  const openPanel=key=>{if(key==='properties'&&!store.getState().selectedId)setOverlay('elements');else setOverlay(v=>v===key?'':key);};
  return <div className="app modern-app">
    <header className="topbar modern-topbar">
      <div className="brand"><svg viewBox="0 0 64 64" width="27" height="27" aria-hidden="true"><rect width="64" height="64" rx="14" fill="#282b32"/><path d="M14 40V24M24 50V14M34 38V26M44 46V18M52 38V26" stroke="#ff9a6b" strokeWidth="5" strokeLinecap="round"/></svg><span>Auravis</span></div>
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
