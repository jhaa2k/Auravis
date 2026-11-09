import { useState } from 'react';
import { useApp } from '../app/hooks.js';
import { audio, toast, visualizer } from '../app/services.js';
import { startRecording, supportedExportFormats } from '../core/export/recorder.js';
import { download } from './ProjectDialog.jsx';
import Icon from './Icon.jsx';
import InAppSelect from './InAppSelect.jsx';

export default function ExportPanel() {
  const s=useApp(x=>x.project.settings);
  const [rec,setRec]=useState(null);
  const [scale,setScale]=useState(1);
  const formats=supportedExportFormats();
  const [format,setFormat]=useState(()=>formats[0]?.value||'');
  const start=()=>{
    try{
      if(!format)throw new Error('No supported video format is available on this device.');
      visualizer.scaleOverride=scale;
      audio.ensureContext();audio.seek(0);
      const controller=startRecording({canvas:visualizer.canvas,audioStream:audio.captureStream,fps:s.fps,mimeType:format});
      audio.play();setRec(controller);toast('Export recording started');
    }catch(e){visualizer.scaleOverride=null;toast(e.message||'Could not start export','error');}
  };
  const stop=async()=>{
    try{
      const blob=await rec.stop();visualizer.scaleOverride=null;setRec(null);
      download(blob,`auravis-${Date.now()}.${rec.mimeType.includes('mp4')?'mp4':'webm'}`);
      toast('Video saved');
    }catch(e){visualizer.scaleOverride=null;setRec(null);toast(e.message||'Export failed','error');}
  };
  return <div className="props settings export-panel">
    <section className="section open"><div className="section-head static">Video Export</div><div className="section-body">
      <div className="field"><label>Output resolution</label><InAppSelect value={scale} disabled={!!rec} ariaLabel="Output resolution" options={[{value:.5,label:'50% · '+Math.round(s.width/2)+'×'+Math.round(s.height/2)},{value:.75,label:'75% · '+Math.round(s.width*.75)+'×'+Math.round(s.height*.75)},{value:1,label:'100% · '+s.width+'×'+s.height}]} onChange={setScale}/></div>
      <div className="field"><label>Video format</label><InAppSelect value={format} disabled={!!rec||!formats.length} ariaLabel="Video format" options={formats.map(f=>({value:f.value,label:f.label}))} onChange={setFormat}/></div>
      {rec?<button className="btn danger wide" onClick={stop}><Icon name="stop" size={15}/>Stop &amp; Save Video</button>:<button className="btn primary wide" disabled={!audio.snapshot.hasAudio||!format} onClick={start}><Icon name="download" size={15}/>Start Video Export</button>}
      <p className="hint">{audio.snapshot.hasAudio?'Exports the live canvas with the current audio track. Keep the app open until saving finishes.':'Import and select a music track before exporting.'}</p>
    </div></section>
  </div>;
}
