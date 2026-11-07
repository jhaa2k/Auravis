import { useRef } from 'react';
import { useStore } from '../app/hooks.js';
import { audio, toast } from '../app/services.js';
import Icon from './Icon.jsx';
import TransportBar from './TransportBar.jsx';

export default function MusicPanel() {
  const state = useStore({ subscribe: audio.subscribe, getState: audio.getSnapshot });
  const fileInput = useRef(null);

  const importFiles = (files) => {
    const count = audio.addFiles(files);
    toast(count ? `${count} track${count === 1 ? '' : 's'} added` : 'No supported audio files selected', count ? 'info' : 'warning');
  };

  return (
    <div className="music-panel">
      <section className="music-library" aria-label="Music library">
        <header className="music-library-head">
          <div><strong>Music library</strong><span>{state.tracks.length} {state.tracks.length === 1 ? 'track' : 'tracks'}</span></div>
          <button className="btn small primary" onClick={() => fileInput.current?.click()}><Icon name="upload" size={15} />Import</button>
          <input ref={fileInput} type="file" accept="audio/*,.mp3,.wav,.ogg,.flac,.m4a,.aac,.opus" multiple hidden
            onChange={(event) => {
              importFiles([...event.target.files]);
              event.target.value = '';
            }} />
        </header>
        {state.tracks.length ? (
          <ul className="music-track-list">
            {state.tracks.map((track, index) => (
              <li key={`${track.title}-${index}`} className={index === state.index ? 'active' : ''}>
                <button className="music-track" onClick={() => audio.load(index, true)} aria-current={index === state.index ? 'true' : undefined}>
                  <Icon name={index === state.index && state.playing ? 'wave' : 'music'} size={18} />
                  <span><strong>{track.title || 'Untitled track'}</strong><small>{track.artist || track.name}</small></span>
                </button>
                <button className="icon-btn danger" title={`Remove ${track.title || 'track'}`} aria-label={`Remove ${track.title || 'track'}`}
                  onClick={() => audio.removeTrack(index)}><Icon name="trash" size={16} /></button>
              </li>
            ))}
          </ul>
        ) : (
          <div className="music-empty"><Icon name="music" size={28} /><strong>Your library is empty</strong><span>Import audio files to start listening and visualizing.</span></div>
        )}
      </section>
      <TransportBar />
    </div>
  );
}
