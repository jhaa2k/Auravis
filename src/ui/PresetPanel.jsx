import { useEffect, useMemo, useRef, useState } from 'react';
import { actions, audio, toast, visualizer } from '../app/services.js';
import { defaultElements, DEFAULT_SETTINGS } from '../core/store/defaultProject.js';
import { createElementData } from '../core/schema/registry.js';
import { makeMeasure } from '../core/schema/measureConfig.js';
import Icon from './Icon.jsx';

const PRESETS = [
 ['Circle Wave','#05070c','#f4f7ff','#59d9ff','Radial','circle','circle'],
 ['Electric Waves','#070812','#a5f3ff','#8b5cf6','Wave','circle','line'],
 ['Neon Orbit','#080611','#c4b5fd','#22d3ee','Radial','circle','diamond'],
 ['Dual Waveform','#071014','#67e8f9','#34d399','Wave','circle','capsule'],
 ['Pulse Rings','#09070e','#f0abfc','#fb7185','Radial','circle','circle'],
 ['Lightning Arc','#080b13','#fde68a','#38bdf8','Electric','star','chevron'],
 ['Spiral Burst','#0b0715','#c4b5fd','#f472b6','Electric','star','triangle'],
 ['Bass Reactor','#05090d','#5eead4','#bef264','Electric','hexagon','hexagon'],
 ['Aurora Flow','#061016','#99f6e4','#818cf8','Wave','circle','rounded'],
 ['Spectrum Halo','#090b14','#f9a8d4','#93c5fd','Radial','circle','capsule'],
 ['Vortex Pulse','#0a0710','#fda4af','#c4b5fd','Electric','star','diamond'],
 ['Monochrome Oscillator','#080808','#ffffff','#a3a3a3','Wave','circle','line'],
 ['Solar Corona','#120a05','#fcd34d','#fb923c','Radial','circle','triangle'],
 ['Prism Electric','#080613','#a78bfa','#67e8f9','Electric','hexagon','chevron'],
 ['Deep Sea Wave','#041019','#67e8f9','#2563eb','Wave','circle','capsule'],
];

function makePreset(preset, index) {
 const [name,background,primary,secondary,category,imageShape,barShape]=preset;
 const elements=defaultElements();
 const find=type=>elements.find(e=>e.type===type);
 const provider=find('audioProvider'),bars=find('barsSegments'),particles=find('particles'),image=find('image'),text=find('text');
 if(provider) Object.assign(provider.props,{sampleProvider:'spectrum',fftSize:4096,sampleOutCount:96,lowerHz:24,higherHz:18000,preSmooth:.35,smooth:.28,filterRadius:1,filterStrength:.25,outputMultiplier:1.35,beatSmooth:.25,beatRangeBarFirst:0,beatRangeBarLast:.24,beatRangeValueLower:.2,beatRangeValueHigher:18});
 if(bars) Object.assign(bars.props,{
  tag:'Beat Spectrum · '+name,visible:true,shapePath:barShape,
  segment1ColorFrom:primary,segment1ColorTo:secondary,segment1Enabled:true,
  segment1Mirror:category==='Beat'||index%3===1,segment1BarHeightMultiplier:1.25,
  segment2Enabled:category==='Beat'||index%4===0,segment2Type:'line',
  segment2ColorFrom:secondary,segment2ColorTo:primary,segment2BarHeightMultiplier:.32,segment2Mirror:true,
  heightScale:10+index%4*2,minHeightScale:.015,maxHeightScale:1.45,
  softness:category==='Beat'?.28:.48,
  measureScale:makeMeasure({enabled:true,source:category==='Beat'?'beat':'bass',outMin:1,outMax:category==='Beat'?1.22:1.08,smoothing:.22,curve:'easeOut'})
 });
 if(particles) Object.assign(particles.props,{
  tag:'Particles · '+name,visible:index%5!==3,color:primary,colorFrom:primary,colorTo:secondary,
  countLimit:category==='Beat'?900:500,particleScale:category==='Beat'?1.5:1,
  speed:category==='Beat'?95:55,speedRandom:.35,vectorAngle:250
 });
 if(image) Object.assign(image.props,{tag:'Artwork · '+name,visible:true,shape:imageShape,position:[0,0],anchorX:.5,anchorY:.5,scale:[.34+(index%3)*.04,.34+(index%3)*.04],color:primary,colorTo:secondary,measureScale:makeMeasure({enabled:true,source:'beat',outMin:1,outMax:1.12,smoothing:.18})});
 if(text) Object.assign(text.props,{tag:'Track Title',visible:true,text:'{title}',color:primary,fontSize:34+(index%4)*4,position:[0,0],anchorX:.5,anchorY:.5,textAlign:'center'});
 if(index%5===0)elements.push(createElementData('rgbSplit',elements,{tag:'RGB Accent',visible:true,splitMultiplier:.12,color:secondary}));
 return {project:{id:null,name,version:1,settings:{...DEFAULT_SETTINGS,background}},elements};
}

export default function PresetPanel(){
 const [category,setCategory]=useState('All');
 const [query,setQuery]=useState('');
 const [active,setActive]=useState(-1);
 const [live,setLive]=useState({beat:0,bass:0,mid:0,treble:0,level:0,samples:[]});
 const [track,setTrack]=useState(audio.getSnapshot());
 const fileRef=useRef(null),lastTick=useRef(0);
 const categories=['All','Wave','Radial','Electric'];
 const visible=useMemo(()=>PRESETS.map((p,i)=>({p,i})).filter(({p})=>(category==='All'||p[4]===category)&&p[0].toLowerCase().includes(query.trim().toLowerCase())),[category,query]);
 useEffect(()=>{
  const unsub=audio.subscribe(()=>setTrack(audio.getSnapshot()));
  const read=()=>{
   const now=performance.now();if(now-lastTick.current<90)return;lastTick.current=now;
   const providers=[...visualizer.providers.values()],out=providers[0];
   setLive({beat:out?.beat||0,bass:out?.bass||0,mid:out?.mid||0,treble:out?.treble||0,level:audio.frame?.level01||0,samples:out?.samples?Array.from(out.samples.slice(0,48)):[]});
  };
  visualizer.hudListeners.add(read);read();
  return()=>{unsub();visualizer.hudListeners.delete(read);};
 },[]);
 const apply=(preset,index)=>{
  try{const result=makePreset(preset,index);actions.loadProject(result.project,result.elements);setActive(index);toast('Loaded live-reactive scene · '+preset[0]);}
  catch(error){toast(error.message||'Could not apply preset','error');}
 };
 const meter=(value)=>Math.round(Math.max(0,Math.min(1,value))*100);
 return <div className="scene-library">
  <header className="scene-library-head">
   <div><span className="scene-eyebrow">AURAVIS / SCENE LIBRARY</span><h2>Visual Scenes & Presets</h2><p>Live-reactive looks. Choose a scene, then fine-tune every layer.</p></div>
   <button className="btn small scene-import" onClick={()=>fileRef.current?.click()}><Icon name="upload" size={14}/>Import</button>
   <input ref={fileRef} type="file" accept=".json,.viz,application/json,application/octet-stream" hidden onChange={e=>{const f=e.target.files?.[0];if(f)window.dispatchEvent(new CustomEvent('auravis:import-project-file',{detail:{file:f}}));e.target.value='';}}/>
  </header>
  <section className="scene-live-panel">
   <div className="scene-live-top"><div><span className="scene-eyebrow">AUDIO ENGINE</span><b>{track.hasAudio?track.title||'Audio loaded':'Waiting for audio'}</b><small>{track.hasAudio?'Play a track to see live frequency response':'Open Music and import a song to activate the live analyser'}</small></div><span className={track.playing?'scene-live-status is-live':'scene-live-status'}><i/>{track.playing?'LIVE':'IDLE'}</span></div>
   <div className="scene-live-meter" aria-label="Live spectrum response">{Array.from({length:48},(_,i)=>{const v=live.samples[i]||0;return <i key={i} style={{height:`${Math.max(3,Math.min(100,v*100))}%`}}/>})}</div>
   <div className="scene-live-stats"><span>LEVEL <b>{meter(live.level)}%</b></span><span>BASS <b>{meter(live.bass)}%</b></span><span>MID <b>{meter(live.mid)}%</b></span><span>TREBLE <b>{meter(live.treble)}%</b></span><span>BEAT <b>{meter(live.beat)}%</b></span></div>
  </section>
  <div className="scene-library-tools"><div className="scene-filters" role="group" aria-label="Scene category">{categories.map(c=><button key={c} className={category===c?'active':''} onClick={()=>setCategory(c)}>{c}</button>)}</div><label className="scene-search"><Icon name="search" size={14}/><input value={query} onChange={e=>setQuery(e.target.value)} placeholder="Find a scene…"/></label></div>
  <div className="scene-count">{visible.length} SCENES <span>·</span> {PRESETS.filter(p=>p[4]==='Beat').length} BEAT-REACTIVE</div>
  <div className="scene-grid">
   {visible.map(({p,i})=><button key={p[0]} className={`scene-card ${active===i?'is-selected':''}`} onClick={()=>apply(p,i)}>
    <span className="scene-card-art" style={{'--scene-bg':p[1],'--scene-a':p[2],'--scene-b':p[3]}}>
     <span className="scene-art-orbit"/><span className="scene-art-core"/><span className="scene-art-bars">{Array.from({length:17},(_,n)=><i key={n} style={{'--bar-h':`${18+((n*17+i*13)%72)}%`}}/>)}</span>
    </span>
    <span className="scene-card-info"><b>{p[0]}</b><small>{p[4]} · {p[5]} · {p[6]}</small></span><span className="scene-card-check"><Icon name="check" size={13}/></span>
   </button>)}
  </div>
  <p className="scene-library-foot">Every preset loads editable layers and an audio provider. Beat presets use bass/spectrum transients for stronger movement. Import supports Auravis project JSON; genuine Avee .viz conversion requires verified sample files.</p>
 </div>;
}
