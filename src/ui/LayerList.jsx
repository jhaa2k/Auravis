import { useState } from 'react';
import { useApp, useStore } from '../app/hooks.js';
import { actions, diagStore, toast } from '../app/services.js';
import { getDefinition, listDefinitions } from '../core/schema/registry.js';
import Icon from './Icon.jsx';
import InAppSelect from './InAppSelect.jsx';

const KIND = { provider: 'Audio analysis', visual: 'Visual element', effect: 'Effect' };
const ADD_ITEMS = [
  { value: 'audioProvider', label: 'Audio Provider · Frequency analysis' },
  { value: 'bars', label: 'Bars · Vertical spectrum' },
  { value: 'barsh', label: 'Bars H · Horizontal spectrum' },
  { value: 'circle', label: 'Circle · Radial spectrum' },
  { value: 'multiring', label: 'MultiRing · Layered radial' },
  { value: 'concentric', label: 'Concentric · Nested rings' },
  { value: 'ring', label: 'Ring · Radial bars' },
  { value: 'pulse', label: 'Pulse · Bass-reactive ring' },
  { value: 'wave', label: 'Wave · Mirrored waveform' },
  { value: 'wavec', label: 'Wave C · Filled waveform' },
  { value: 'scope', label: 'Scope · Single-line waveform' },
  { value: 'dots', label: 'Dots · Particle field' },
  { value: 'lines', label: 'Lines · Particle trails' },
  { value: 'blocks', label: 'Blocks · Particle blocks' },
  { value: 'grid', label: 'Grid · Particle grid field' },
  { value: 'particles', label: 'Particles · Custom particle system' },
  { value: 'shape', label: 'Shape · Customisable particle shape' },
  { value: 'text', label: 'Text · Typography layer' },
  { value: 'image', label: 'Image · Artwork layer' },
  { value: 'bg', label: 'BG · Background image layer' },
  { value: 'blurEffect', label: 'Blur Effect · Composition blur' },
  { value: 'rgbSplit', label: 'RGB Split Effect · Chromatic split' },
  { value: 'motionBlur', label: 'Motion Blur Effect · Motion trails' },
];
function addPreset(key) {
  const map = {
    audioProvider: ['audioProvider', {}],
    bars: ['barsSegments', { tag: 'Bars', shapePath: 'rectangle' }],
    barsh: ['barsSegments', { tag: 'Bars Horizontal', rotation: 90, shapePath: 'rectangle' }],
    circle: ['radialSpectrum', { tag: 'Circle', radius: 260, barLength: 160, barCount: 90 }],
    multiring: ['radialSpectrum', { tag: 'MultiRing', radius: 180, barLength: 120, mirror: true, barCount: 90 }],
    concentric: ['radialSpectrum', { tag: 'Concentric', radius: 300, barLength: 80, barCount: 90, gap: 0.1 }],
    ring: ['radialSpectrum', { tag: 'Ring', radius: 240, barLength: 180, barCount: 90 }],
    pulse: ['radialSpectrum', { tag: 'Pulse', radius: 260, barLength: 100, sensitivity: 3.2, barCount: 64 }],
    wave: ['waveform', { tag: 'Wave', waveformMode: 'mirror' }],
    wavec: ['waveform', { tag: 'Wave C', waveformMode: 'filled', fillArea: true }],
    scope: ['waveform', { tag: 'Scope', waveformMode: 'line', fillArea: false }],
    dots: ['particles', { tag: 'Dots', spawnArea: 'circle', particleScale: 1.4, countLimit: 1800, speed: 35 }],
    lines: ['particles', { tag: 'Lines', trailLength: 0.45, particleScale: 0.65, speed: 120 }],
    blocks: ['particles', { tag: 'Blocks', particleScale: 2.8, sizeAspectRatio: 1.8, speed: 80 }],
    grid: ['particles', { tag: 'Grid', spawnArea: 'rectangle', spawnAreaSize: [900, 500], particleScale: 1.1, speed: 25 }],
    particles: ['particles', { tag: 'Particles' }],
    shape: ['particles', { tag: 'Shape', particleScale: 3, orientToVelocity: false }],
    text: ['text', { tag: 'Text' }],
    image: ['image', { tag: 'Image' }],
    bg: ['image', { tag: 'Background', scale: [1.8, 1.8], shape: 'rectangle' }],
    blurEffect: ['blurEffect', {}],
    rgbSplit: ['rgbSplit', {}],
    motionBlur: ['motionBlur', {}],
  };
  return map[key] || [key, {}];
}


export default function LayerList() {
  const elements = useApp((s) => s.elements);
  const selectedId = useApp((s) => s.selectedId);
  const diags = useStore(diagStore);
  const [addChoice, setAddChoice] = useState('__placeholder__');
  const [dragFrom, setDragFrom] = useState(null);
  const sel = elements.find((e) => e.id === selectedId);
  const rows = elements.map((e, i) => ({ e, i })).reverse(); // top of the stack first

  return (
    <div className="layers">
      <div className="panel-title">
        <span>Elements</span>
        <div className="row-gap">
          <button className="icon-btn" title="Duplicate" disabled={!sel} onClick={() => actions.duplicateElement(sel.id)}><Icon name="copy" /></button>
          <button className="icon-btn" title="Move up" disabled={!sel} onClick={() => actions.moveElement(sel.id, 1)}><Icon name="up" /></button>
          <button className="icon-btn" title="Move down" disabled={!sel} onClick={() => actions.moveElement(sel.id, -1)}><Icon name="down" /></button>
          <button className="icon-btn danger" title="Delete" disabled={!sel} onClick={() => actions.deleteElement(sel.id)}><Icon name="trash" /></button>
          <div className="layer-add-select">
            <InAppSelect value={addChoice} ariaLabel="Add an element" options={[{value:'__placeholder__',label:'＋ Add element…'},...ADD_ITEMS]} onChange={key=>{if(key==='__placeholder__')return;const [type,props]=addPreset(key);const created=actions.addElement(type);if(Object.keys(props).length)actions.updateProps(created.id,props);setAddChoice('__placeholder__');const def=getDefinition(type);toast(def?.kind==='provider'?def.label+' added. It supplies audio data to visual elements.':(props.tag||def.label)+' added. Open Properties for full manual controls.','info');}}/>
          </div>
        </div>
      </div>
      <ul className="layer-list">
        {rows.map(({ e, i }) => {
          const def = getDefinition(e.type), probs = diags[e.id] || [];
          const worst = probs.some((p) => p.level === 'error') ? 'error' : probs.some((p) => p.level === 'warning') ? 'warn' : null;
          return (
            <li key={e.id} className={`layer ${e.id === selectedId ? 'selected' : ''} ${e.props.visible === false ? 'off' : ''}`} draggable
              onDragStart={() => setDragFrom(i)} onDragOver={(ev) => ev.preventDefault()}
              onDrop={() => { if (dragFrom !== null) actions.reorderElement(dragFrom, i); setDragFrom(null); }}
              onClick={() => actions.select(e.id)}>
              <span className="grip"><Icon name="drag" size={14} /></span>
              <span className="layer-icon"><Icon name={def.icon} size={17} /></span>
              <span className="layer-name"><b>{e.props.tag}</b><small>{def.label}</small></span>
              {worst && <span className={`badge ${worst}`} title={probs.map((p) => p.message).join('\n')}><Icon name={worst === 'error' ? 'error' : 'warn'} size={14} /></span>}
              <button className="icon-btn" title={e.locked ? 'Unlock' : 'Lock (protect from canvas dragging)'} onClick={(ev) => { ev.stopPropagation(); actions.setLocked(e.id, !e.locked); }}><Icon name={e.locked ? 'lock' : 'unlock'} size={16} /></button>
              {def.kind !== 'provider' && (
                <button className="icon-btn" title={e.props.visible ? 'Hide' : 'Show'} onClick={(ev) => { ev.stopPropagation(); actions.setVisible(e.id, !e.props.visible); }}><Icon name={e.props.visible ? 'eye' : 'eyeOff'} size={16} /></button>
              )}
            </li>
          );
        })}
      </ul>
      <p className="stack-note">Top of the list draws on top. Drag to reorder.</p>
    </div>
  );
}
