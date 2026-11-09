import { useEffect, useRef, useState } from 'react';
import { useStore } from '../app/hooks.js';
import { audio, toast } from '../app/services.js';
import { fmtTime } from '../core/utils/math.js';
import Icon from './Icon.jsx';

export default function TransportBar() {
  const a = useStore({ subscribe: audio.subscribe, getState: audio.getSnapshot });
  const [t, setT] = useState({ time: 0, dur: 0 });
  const file = useRef(null);
  useEffect(() => {
    const iv = setInterval(() => setT({ time: audio.currentTime, dur: audio.duration }), 250);
    return () => clearInterval(iv);
  }, []);
  const onFiles = (files) => {
    const n = audio.addFiles(files);
    toast(n ? `${n} track${n > 1 ? 's' : ''} added` : 'No supported audio files selected', n ? 'info' : 'warning');
  };
  const finite = Number.isFinite(t.dur) && t.dur > 0;
  return (
    <div className="transport">
      <div className="now">
        <Icon name="music" size={18} />
        <div><b>{a.title || 'No audio loaded'}</b><small>{a.artist || (a.hasAudio ? '' : 'Open files or try the demo track')}</small></div>
      </div>
      <div className="controls">
        <button className="icon-btn" title="Previous" onClick={() => audio.prev()} disabled={a.tracks.length < 1}><Icon name="prev" fill /></button>
        <button className="play" title={a.playing ? 'Pause (Space)' : 'Play (Space)'} onClick={() => (a.hasAudio ? audio.toggle() : audio.startDemo())} aria-label={a.playing ? 'Pause' : 'Play'}><Icon name={a.playing ? 'pause' : 'play'} size={22} fill /></button>
        <button className="icon-btn" title="Next" onClick={() => audio.next()} disabled={a.tracks.length < 1}><Icon name="next" fill /></button>
      </div>
      <div className="seek">
        <span>{fmtTime(t.time)}</span>
        <input className="range" type="range" min={0} max={finite ? t.dur : 1} step={0.1} value={finite ? Math.min(t.time, t.dur) : 0} disabled={!finite}
          style={{ '--pct': finite ? `${(t.time / t.dur) * 100}%` : '0%' }} onChange={(e) => { audio.seek(+e.target.value); setT({ ...t, time: +e.target.value }); }} aria-label="Seek" />
        <span>{finite ? fmtTime(t.dur) : '∞'}</span>
      </div>
      <div className="extras">
        <button className={`icon-btn ${a.shuffle ? 'active' : ''}`} title="Shuffle" onClick={() => audio.toggleShuffle()}><Icon name="shuffle" /></button>
        <button className={`icon-btn ${a.repeat ? 'active' : ''}`} title="Repeat" onClick={() => audio.toggleRepeat()}><Icon name="repeat" /></button>
        <Icon name="volume" size={16} />
        <input className="range vol" type="range" min={0} max={1} step={0.01} value={a.volume} style={{ '--pct': `${a.volume * 100}%` }} onChange={(e) => audio.setVolume(+e.target.value)} aria-label="Volume" />
        <button className="btn small" onClick={() => file.current.click()}><Icon name="upload" size={14} />Open</button>
        <button className="btn small ghost" onClick={() => audio.startDemo()}><Icon name="demo" size={13} fill />Demo</button>
        <input ref={file} type="file" accept="audio/*" multiple hidden onChange={(e) => { onFiles([...e.target.files]); e.target.value = ''; }} />
      </div>
    </div>
  );
}
