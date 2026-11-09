import { useEffect, useMemo, useRef, useState } from 'react';
import { actions, audio, toast, visualizer } from '../app/services.js';
import { defaultElements, DEFAULT_SETTINGS } from '../core/store/defaultProject.js';
import { createElementData } from '../core/schema/registry.js';
import { makeMeasure } from '../core/schema/measureConfig.js';
import Icon from './Icon.jsx';

const PRESETS = [
 ['Obsidian Pulse','#08090d','#f4f5f7','#7b8cff','Minimal','circle','rounded'],
 ['Neon Circuit','#050a12','#38e8ff','#a45cff','Neon','hexagon','chevron'],
 ['Crimson Voltage','#12070b','#ff4d68','#ffb45c','Beat','circle','triangle'],
 ['Arctic Bloom','#06111a','#a7f1ff','#548dff','Minimal','circle','capsule'],
 ['Violet Haze','#10091a','#c8a0ff','#ff72d2','Neon','star','diamond'],
 ['Solar Flare','#160d05','#ffd166','#ff6b35','Beat','circle','triangle'],
 ['Emerald Flow','#04140f','#55e6a5','#b7ff76','Color','hexagon','rounded'],
 ['Mono Wave','#090909','#ffffff','#858585','Minimal','circle','line'],
 ['Cyber Pink','#160815','#ff63c3','#8b5cff','Beat','heart','chevron'],
 ['Deep Ocean','#04101c','#4cc9f0','#4361ee','Color','circle','capsule'],
 ['Toxic Green','#0b1305','#c7ff45','#5be37d','Beat','hexagon','triangle'],
 ['Amber Dust','#171006','#ffc36b','#ff8748','Color','circle','rounded'],
 ['Blue Hour','#070b1d','#7aa2ff','#a9c8ff','Minimal','circle','diamond'],
 ['Rose Quartz','#190b13','#ffc1d6','#e879a9','Color','heart','capsule'],
 ['Glacier','#071419','#d5fbff','#71c7d5','Minimal','circle','hexagon'],
 ['Infrared','#160707','#ff6b6b','#ffb4a2','Beat','triangle','chevron'],
 ['Ultraviolet','#0c0619','#a78bfa','#5eead4','Neon','star','diamond'],
 ['Phantom Gold','#151109','#f2d18b','#b58a45','Color','circle','rounded'],
 ['Acid Rain','#08130d','#a3ff6f','#39d98a','Beat','hexagon','line'],
 ['Electric Blue','#050d1a','#3b82f6','#22d3ee','Neon','circle','chevron'],
 ['Dreamwave','#10091a','#f0abfc','#93c5fd','Color','heart','capsule'],
 ['Blood Moon','#150608','#ff5d73','#ff9f68','Beat','circle','triangle'],
 ['Silver Static','#111315','#e6edf3','#8b98a7','Minimal','circle','line'],
 ['Prism Night','#0b0714','#d0a2ff','#7dd3fc','Neon','star','diamond'],
 ['Bass Reactor','#05080d','#58f5d0','#b5ff4b','Beat','hexagon','line'],
 ['Subwoofer X','#09040d','#ff4c9b','#7d5cff','Beat','circle','triangle'],
 ['Pulse Matrix','#040b12','#4de1ff','#b4f1ff','Beat','square','chevron'],
 ['Rhythm Storm','#130707','#ff6b4a','#ffd166','Beat','triangle','diamond'],
 ['Deep Frequency','#050d18','#42a5ff','#a78bfa','Beat','circle','capsule'],
 ['Heartbeat','#100610','#ff78b7','#ffe0ee','Beat','heart','rounded'],
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
 const categories=['All','Beat','Minimal','Neon','Color'];
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
