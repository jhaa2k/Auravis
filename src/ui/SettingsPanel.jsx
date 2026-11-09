import { useEffect } from 'react';
import { useApp } from '../app/hooks.js';
import { actions } from '../app/services.js';
import { QUALITY } from '../core/render/quality.js';
import InAppSelect from './InAppSelect.jsx';
import { Toggle } from './fields/primitives.jsx';

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
  <section className="section open"><div className="section-head static">Canvas defaults</div><div className="section-body">
   <div className="field"><label>Aspect ratio / size</label><InAppSelect value={size} options={RESOLUTIONS} onChange={setSize} ariaLabel="Canvas size"/></div>
   <div className="field"><label>Background</label><input type="color" value={s.background?.slice(0,7)||'#0d0d12'} onChange={e=>actions.setSettings({background:e.target.value})}/></div>
  </div></section>
  <section className="section open"><div className="section-head static">Performance</div><div className="section-body">
   <div className="field"><label>Preview quality</label><InAppSelect value={s.quality} options={Object.entries(QUALITY).map(([value,q])=>({value,label:q.label+' ('+Math.round(q.scale*100)+'%)'}))} onChange={quality=>actions.setSettings({quality})}/></div>
   <div className="field"><label>Frame rate</label><InAppSelect value={s.fps} options={[{value:30,label:'30 fps'},{value:60,label:'60 fps'}]} onChange={fps=>actions.setSettings({fps})}/></div>
   <div className="field"><label>Adaptive quality</label><Toggle checked={s.adaptive!==false} onChange={adaptive=>actions.setSettings({adaptive})} label="Adaptive quality"/></div>
   <div className="hint">Adaptive quality lowers preview resolution when rendering cannot keep up. Export uses the selected output scale.</div>
  </div></section>
  <section className="section open"><div className="section-head static">Keyboard shortcuts</div><div className="section-body shortcuts">
   <span><kbd>Space</kbd> Play / pause</span><span><kbd>Ctrl</kbd>+<kbd>Z</kbd> Undo</span><span><kbd>Ctrl</kbd>+<kbd>Shift</kbd>+<kbd>Z</kbd> Redo</span><span><kbd>Ctrl</kbd>+<kbd>Y</kbd> Redo</span><span><kbd>Ctrl</kbd>+<kbd>D</kbd> Duplicate layer</span><span><kbd>Delete</kbd> Remove selected layer</span><span><kbd>Esc</kbd> Close active panel</span><span>Drag a layer on the preview to reposition it</span>
  </div></section>
 </div>;
}
