import { useEffect } from 'react';
import { useApp } from '../app/hooks.js';
import { actions } from '../app/services.js';
import { QUALITY } from '../core/render/quality.js';
import InAppSelect from './InAppSelect.jsx';
import { Toggle, Slider, NumberInput, ColorInput } from './fields/primitives.jsx';

const THEMES=[
 {value:'dark',label:'Obsidian · Dark'},
 {value:'midnight',label:'Midnight Blue'},
 {value:'graphite',label:'Graphite'},
 {value:'light',label:'Light'}
];
const RESOLUTIONS=[
 {value:'1920x1080',label:'16:9 · 1920×1080'},
 {value:'1080x1920',label:'9:16 · 1080×1920'},
 {value:'1080x1080',label:'1:1 · 1080×1080'},
 {value:'1080x1350',label:'4:5 · 1080×1350'},
 {value:'2560x1080',label:'21:9 · 2560×1080'}
];
export default function SettingsPanel(){
 const s=useApp(x=>x.project.settings);
 useEffect(()=>{document.documentElement.dataset.auravisTheme=s.theme||'dark';},[s.theme]);
 const size=`${s.width}x${s.height}`;
 const setSize=v=>{const [width,height]=v.split('x').map(Number);actions.setSettings({width,height});};
 return <div className="props settings app-settings">
  <section className="section open"><div className="section-head static">Appearance</div><div className="section-body">
   <div className="field"><label>App theme</label><InAppSelect value={s.theme||'dark'} options={THEMES} onChange={theme=>actions.setSettings({theme})} ariaLabel="App theme"/></div>
   <div className="hint">Theme changes apply to editor panels, menus and in-app pickers.</div>
  </div></section>
  <section className="section open"><div className="section-head static">Live visual effects</div><div className="section-body effect-controls">
   <div className="hint">Project-wide effects are composited into the preview and final video.</div>
   {[
    ['background','Background',0,100],['cameraZoom','Camera Zoom · Bass Follow',0,100],['vignette','Vignette',0,100],['scanlines','Scanlines',0,100],['filmGrain','Film Grain',0,100],['beatFlash','Beat Flash',0,100],['beatShake','Beat Shake',0,100],['hueJump','Hue Jump per Beat',0,100],['contrast','Contrast',-50,100],['saturation','Saturation',-100,100],['warmth','Color Temperature',-100,100],['fade','Matte Fade',0,100]
   ].map(([key,label,min,max])=><div className="effect-slider" key={key}><div><label>{label}</label><NumberInput value={s.effects?.[key]??0} min={min} max={max} step={1} onChange={v=>actions.setSettings({effects:{...s.effects,[key]:v}})}/></div><Slider value={s.effects?.[key]??0} min={min} max={max} step={1} resetValue={0} onChange={v=>actions.setSettings({effects:{...s.effects,[key]:v}})}/></div>)}
  </div></section>
  <section className="section open"><div className="section-head static">Canvas defaults</div><div className="section-body">
   <div className="field"><label>Aspect ratio / size</label><InAppSelect value={size} options={RESOLUTIONS} onChange={setSize} ariaLabel="Canvas size"/></div>
   <div className="field"><label>Background</label><ColorInput value={s.background||'#0d0d12'} resetValue="#0d0d12" onChange={background=>actions.setSettings({background})}/></div>
  </div></section>
  <section className="section open"><div className="section-head static">Performance</div><div className="section-body">
   <div className="field"><label>Preview quality</label><InAppSelect value={s.quality} options={Object.entries(QUALITY).map(([value,q])=>({value,label:q.label+' ('+Math.round(q.scale*100)+'%)'}))} onChange={quality=>actions.setSettings({quality})}/></div>
   <div className="field"><label>Frame rate</label><InAppSelect value={s.fps} options={[{value:30,label:'30 fps'},{value:60,label:'60 fps'}]} onChange={fps=>actions.setSettings({fps})}/></div>
   <div className="field"><label>Adaptive quality</label><InAppSelect value={s.adaptive===false?'manual':'adaptive'} options={[{value:'adaptive',label:'Auto · Adaptive'},{value:'manual',label:'Manual · Fixed quality'}]} onChange={v=>actions.setSettings({adaptive:v==='adaptive'})} ariaLabel="Adaptive quality mode"/></div>
   <div className="hint">Adaptive quality lowers preview resolution when needed to keep rendering responsive.</div>
  </div></section>
 </div>;
}
