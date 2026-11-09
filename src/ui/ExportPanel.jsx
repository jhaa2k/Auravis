import { useState } from 'react';
import { useApp } from '../app/hooks.js';
import { actions, audio, store, toast, visualizer } from '../app/services.js';
import { QUALITY } from '../core/render/quality.js';
import { startRecording } from '../core/export/recorder.js';
import { ColorInput, Toggle } from './fields/primitives.jsx';
import { download } from './ProjectDialog.jsx';
import Icon from './Icon.jsx';
import InAppSelect from './InAppSelect.jsx';

const PRESETS = [
  { label: '16:9 · 1920×1080', w: 1920, h: 1080 }, { label: '9:16 · 1080×1920', w: 1080, h: 1920 }, { label: '1:1 · 1080×1080', w: 1080, h: 1080 },
  { label: '4:5 · 1080×1350', w: 1080, h: 1350 }, { label: '21:9 · 2560×1080', w: 2560, h: 1080 },
];

export default function SettingsPanel() {
  const s = useApp((x) => x.project.settings);
  const [rec, setRec] = useState(null);
  const [scale, setScale] = useState(1);
  const preset = PRESETS.findIndex((p) => p.w === s.width && p.h === s.height);

  const start = () => {
    try {
      visualizer.scaleOverride = scale;
      audio.ensureContext(); audio.seek(0);
      const c = startRecording({ canvas: visualizer.canvas, audioStream: audio.captureStream, fps: s.fps });
      audio.play();
      setRec(c);
      toast('Recording… playback runs in real time');
    } catch (e) { visualizer.scaleOverride = null; toast(e.message, 'error'); }
  };
  const stop = async () => {
    const blob = await rec.stop();
    visualizer.scaleOverride = null;
    setRec(null);
    download(blob, `auravis-${Date.now()}.${rec.mimeType.includes('mp4') ? 'mp4' : 'webm'}`);
    toast('Video saved');
  };

  return (
    <div className="props settings">
      <section className="section open"><div className="section-head static">Canvas</div>
        <div className="section-body">
          <div className="field"><label>Aspect / Size</label>
            <InAppSelect value={preset<0?'custom':preset} ariaLabel="Canvas size" options={[...(preset<0?[{value:'custom',label:s.width+'×'+s.height+' · Custom'}]:[]),...PRESETS.map((p,i)=>({value:i,label:p.label}))]} onChange={v=>{const p=PRESETS[+v];if(p)actions.setSettings({width:p.w,height:p.h});}}/></div>
          <div className="field"><label>Background</label><ColorInput value={s.background} onChange={(background) => actions.setSettings({ background: background.slice(0, 7) })} /></div>
        </div>
      </section>
      <section className="section open"><div className="section-head static">Performance</div>
        <div className="section-body">
          <div className="field"><label>Preview Quality</label>
            <InAppSelect value={s.quality} ariaLabel="Preview quality" options={Object.entries(QUALITY).map(([value,q])=>({value,label:q.label+' ('+Math.round(q.scale*100)+'%)'}))} onChange={quality=>actions.setSettings({quality})}/></div>
          <div className="field"><label>Frame Rate</label>
            <InAppSelect value={s.fps} ariaLabel="Frame rate" options={[{value:60,label:'60 fps'},{value:30,label:'30 fps'}]} onChange={fps=>actions.setSettings({fps})}/></div>
          <div className="field"><label>Adaptive quality</label><Toggle checked={s.adaptive} onChange={(adaptive) => actions.setSettings({ adaptive })} label="Adaptive quality" /></div>
          <div className="hint">When frames run long the preview steps down one quality tier automatically.</div>
        </div>
      </section>
      <section className="section open"><div className="section-head static">Export video</div>
        <div className="section-body">
          <div className="field"><label>Render resolution</label>
            <InAppSelect value={scale} disabled={!!rec} ariaLabel="Export resolution" options={[{value:0.5,label:'50% · '+Math.round(s.width/2)+'×'+Math.round(s.height/2)},{value:0.75,label:'75% · '+Math.round(s.width*.75)+'×'+Math.round(s.height*.75)},{value:1,label:'100% · '+s.width+'×'+s.height}]} onChange={setScale}/></div>
          {rec ? <button className="btn danger wide" onClick={stop}><Icon name="stop" size={15} fill />Stop and save</button>
            : <button className="btn primary wide" onClick={start} disabled={!audio.snapshot.hasAudio}><Icon name="record" size={15} fill />Record from the start</button>}
          <div className="hint">{audio.snapshot.hasAudio ? 'Records the canvas and audio in real time (WebM/MP4 depending on your browser).' : 'Load a track or start the demo first.'}</div>
        </div>
      </section>
      <section className="section open"><div className="section-head static">Shortcuts</div>
        <div className="section-body shortcuts">
          <span><kbd>Space</kbd> Play / pause</span><span><kbd>Ctrl</kbd>+<kbd>Z</kbd> Undo</span>
          <span><kbd>Ctrl</kbd>+<kbd>Shift</kbd>+<kbd>Z</kbd> Redo</span><span><kbd>Ctrl</kbd>+<kbd>D</kbd> Duplicate</span>
          <span><kbd>Del</kbd> Delete element</span><span>Drag on the canvas to move</span>
        </div>
      </section>
    </div>
  );
}
