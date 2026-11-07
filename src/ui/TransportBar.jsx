import { useEffect, useState } from 'react';
import { useStore } from '../app/hooks.js';
import { audio } from '../app/services.js';
import { fmtTime } from '../core/utils/math.js';
import Icon from './Icon.jsx';

export default function TransportBar() {
  const state = useStore({ subscribe: audio.subscribe, getState: audio.getSnapshot });
  const [time, setTime] = useState({ current: 0, duration: 0 });

  useEffect(() => {
    const timer = setInterval(() => {
      setTime({ current: audio.currentTime, duration: audio.duration });
    }, 250);
    return () => clearInterval(timer);
  }, []);

  const hasDuration = Number.isFinite(time.duration) && time.duration > 0;
  return (
    <div className="transport" aria-label="Playback controls">
      <div className="now" title={[state.title, state.artist].filter(Boolean).join(' — ')}>
        <Icon name="music" size={17} />
        <div><b>{state.title || 'No track selected'}</b><small>{state.artist || 'Now playing'}</small></div>
      </div>
      <div className="controls">
        <button className="icon-btn" title="Previous track" onClick={() => audio.prev()} disabled={!state.tracks.length} aria-label="Previous track"><Icon name="prev" fill /></button>
        <button className="play" title={state.playing ? 'Pause' : 'Play'} onClick={() => audio.toggle()} disabled={!state.hasAudio} aria-label={state.playing ? 'Pause' : 'Play'}><Icon name={state.playing ? 'pause' : 'play'} size={22} fill /></button>
        <button className="icon-btn" title="Next track" onClick={() => audio.next()} disabled={!state.tracks.length} aria-label="Next track"><Icon name="next" fill /></button>
      </div>
      <div className="seek">
        <span>{fmtTime(time.current)}</span>
        <input className="range" type="range" min={0} max={hasDuration ? time.duration : 1} step={0.1} value={hasDuration ? Math.min(time.current, time.duration) : 0} disabled={!hasDuration}
          style={{ '--pct': hasDuration ? `${(time.current / time.duration) * 100}%` : '0%' }}
          onChange={(event) => {
            audio.seek(+event.target.value);
            setTime((current) => ({ ...current, current: +event.target.value }));
          }} aria-label="Seek" />
        <span>{hasDuration ? fmtTime(time.duration) : '0:00'}</span>
      </div>
      <div className="extras">
        <button className={`icon-btn ${state.shuffle ? 'active' : ''}`} title="Shuffle" aria-label="Shuffle" aria-pressed={state.shuffle} onClick={() => audio.toggleShuffle()}><Icon name="shuffle" /></button>
        <button className={`icon-btn ${state.repeat ? 'active' : ''}`} title="Repeat" aria-label="Repeat" aria-pressed={state.repeat} onClick={() => audio.toggleRepeat()}><Icon name="repeat" /></button>
        <Icon name="volume" size={16} />
        <input className="range vol" type="range" min={0} max={1} step={0.01} value={state.volume} style={{ '--pct': `${state.volume * 100}%` }} onChange={(event) => audio.setVolume(+event.target.value)} aria-label="Volume" />
      </div>
    </div>
  );
}
