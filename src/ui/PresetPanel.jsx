import { useMemo, useRef, useState } from 'react';
import { useApp } from '../app/hooks.js';
import { actions, toast } from '../app/services.js';
import Icon from './Icon.jsx';

const FILTERS=[
 {name:'Cinematic Teal & Orange',group:'Cinematic',desc:'Modern blockbuster contrast',tone:['#0e3340','#f29b58'],effects:{contrast:24,saturation:12,warmth:10,vignette:34,filmGrain:12}},
 {name:'35mm Film',group:'Film',desc:'Soft grain and gentle fade',tone:['#574337','#d9b88b'],effects:{contrast:-8,saturation:-18,warmth:18,fade:20,vignette:18,filmGrain:34}},
 {name:'Noir',group:'Cinematic',desc:'Deep monochrome shadows',tone:['#101216','#bfc4ca'],effects:{saturation:-100,contrast:38,vignette:48,filmGrain:14}},
 {name:'Bleach Bypass',group:'Cinematic',desc:'Desaturated, hard-edged drama',tone:['#263238','#aab5b8'],effects:{saturation:-48,contrast:48,warmth:-4,vignette:26,filmGrain:10}},
 {name:'Golden Hour',group:'Warm',desc:'Warm highlights and lifted tone',tone:['#6c3f22','#ffc477'],effects:{saturation:18,contrast:8,warmth:38,fade:8,vignette:16}},
 {name:'Arctic Blue',group:'Cool',desc:'Cold steel-blue atmosphere',tone:['#142e4a','#9bc9e8'],effects:{saturation:-8,contrast:18,warmth:-24,hueJump:8,vignette:24}},
 {name:'Vintage Fade',group:'Film',desc:'Muted colors and faded blacks',tone:['#665342','#d5c5a4'],effects:{saturation:-28,contrast:-18,warmth:22,fade:34,filmGrain:20}},
 {name:'Cyberpunk',group:'Creative',desc:'Electric color and night contrast',tone:['#25104b','#26d9e8'],effects:{saturation:42,contrast:34,hueJump:12,vignette:30,scanlines:8}},
 {name:'Dream Haze',group:'Creative',desc:'Soft pastel glow impression',tone:['#6b6a91','#e5b5d1'],effects:{saturation:14,contrast:-16,warmth:12,fade:24,vignette:12}},
 {name:'Documentary',group:'Film',desc:'Natural, restrained color',tone:['#34413b','#b9b49a'],effects:{saturation:-22,contrast:12,warmth:4,vignette:12,filmGrain:8}},
 {name:'Emerald Cinema',group:'Creative',desc:'Deep greens with warm lift',tone:['#123b31','#d5b77c'],effects:{saturation:24,contrast:26,warmth:8,hueJump:4,vignette:32}},
 {name:'High Contrast',group:'Cinematic',desc:'Punchy blacks and bright detail',tone:['#17191f','#e7e9ef'],effects:{saturation:8,contrast:54,vignette:22}},
 {name:'Soft Matte',group:'Film',desc:'Low contrast editorial finish',tone:['#5d6670','#d4c6b8'],effects:{saturation:-12,contrast:-28,fade:28,warmth:5}},
 {name:'Neon Night',group:'Creative',desc:'Bold violet and cyan mood',tone:['#24104a','#26e6ff'],effects:{saturation:50,contrast:32,hueJump:18,vignette:42,scanlines:5}},
 {name:'Clean Neutral',group:'Natural',desc:'Balanced, subtle finishing',tone:['#303943','#d4dce4'],effects:{saturation:0,contrast:0,warmth:0,fade:0,vignette:8,filmGrain:0}}
];
const KEYS=['contrast','saturation','warmth','fade','vignette','filmGrain','scanlines','hueJump','background','cameraZoom','beatFlash','beatShake'];
export default function PresetPanel(){
 const fileRef=useRef(null);
 const [group,setGroup]=useState('All'),[active,setActive]=useState('');
 const groups=['All','Cinematic','Film','Warm','Cool','Creative','Natural'];
 const visible=useMemo(()=>FILTERS.filter(f=>group==='All'||f.group===group),[group]);
 const apply=filter=>{
  const effects=Object.fromEntries(KEYS.map(k=>[k,0]));
  actions.setSettings({effects:{...effects,...filter.effects}});
  setActive(filter.name);
  toast('Applied '+filter.name+' video filter');
 };
 const reset=()=>{actions.setSettings({effects:Object.fromEntries(KEYS.map(k=>[k,0]))});setActive('');toast('Video filters reset');};
 const current=active||'Original';
 return <div className="filter-library">
  <header className="filter-head"><div><span className="scene-eyebrow">AURAVIS / VIDEO LOOKS</span><h2>Cinematic Filters</h2><p>Apply a finished color mood to the entire composition and exported video.</p></div><div className="filter-head-actions"><button className="btn small" onClick={()=>fileRef.current?.click()}><Icon name="upload" size={13}/>Import</button><button className="btn small" onClick={reset}><Icon name="refresh" size={13}/>Reset</button><input ref={fileRef} type="file" accept=".json,.viz,application/json,application/octet-stream" hidden onChange={e=>{const f=e.target.files?.[0];if(f)window.dispatchEvent(new CustomEvent('auravis:import-project-file',{detail:{file:f}}));e.target.value='';}}/></div></header>
  <div className="filter-active"><span>ACTIVE LOOK</span><b>{current}</b><small>Filters remain editable in Settings → Live visual effects.</small></div>
  <div className="filter-categories">{groups.map(g=><button key={g} className={group===g?'active':''} onClick={()=>setGroup(g)}>{g}</button>)}</div>
  <div className="filter-grid">{visible.map(f=><button type="button" key={f.name} className={'filter-card '+(active===f.name?'active':'')} onClick={()=>apply(f)}>
   <span className="filter-preview" style={{'--filter-a':f.tone[0],'--filter-b':f.tone[1]}}><i/><i/><b/></span>
   <span className="filter-card-copy"><b>{f.name}</b><small>{f.desc}</small></span>
   {active===f.name&&<Icon name="check" size={15}/>}
  </button>)}</div>
  <p className="filter-foot">These are non-destructive project-wide looks. Select a filter to apply it; choose Reset to return to the original image.</p>
 </div>;
}
