import { useRef, useState } from 'react';
import { actions, toast } from '../app/services.js';
import { defaultElements, DEFAULT_SETTINGS } from '../core/store/defaultProject.js';
import Icon from './Icon.jsx';

const PRESETS = [
  ['Obsidian Pulse','#08090d','#f4f5f7','#7b8cff','circle','rounded'],
  ['Neon Circuit','#050a12','#38e8ff','#a45cff','hexagon','chevron'],
  ['Crimson Voltage','#12070b','#ff4d68','#ffb45c','circle','triangle'],
  ['Arctic Bloom','#06111a','#a7f1ff','#548dff','circle','capsule'],
  ['Violet Haze','#10091a','#c8a0ff','#ff72d2','star','diamond'],
  ['Solar Flare','#160d05','#ffd166','#ff6b35','circle','triangle'],
  ['Emerald Flow','#04140f','#55e6a5','#b7ff76','hexagon','rounded'],
  ['Mono Wave','#090909','#ffffff','#858585','circle','line'],
  ['Cyber Pink','#160815','#ff63c3','#8b5cff','heart','chevron'],
  ['Deep Ocean','#04101c','#4cc9f0','#4361ee','circle','capsule'],
  ['Toxic Green','#0b1305','#c7ff45','#5be37d','hexagon','triangle'],
  ['Amber Dust','#171006','#ffc36b','#ff8748','circle','rounded'],
  ['Blue Hour','#070b1d','#7aa2ff','#a9c8ff','circle','diamond'],
  ['Rose Quartz','#190b13','#ffc1d6','#e879a9','heart','capsule'],
  ['Glacier','#071419','#d5fbff','#71c7d5','circle','hexagon'],
  ['Infrared','#160707','#ff6b6b','#ffb4a2','triangle','chevron'],
  ['Ultraviolet','#0c0619','#a78bfa','#5eead4','star','diamond'],
  ['Phantom Gold','#151109','#f2d18b','#b58a45','circle','rounded'],
  ['Acid Rain','#08130d','#a3ff6f','#39d98a','hexagon','line'],
  ['Electric Blue','#050d1a','#3b82f6','#22d3ee','circle','chevron'],
  ['Dreamwave','#10091a','#f0abfc','#93c5fd','heart','capsule'],
  ['Blood Moon','#150608','#ff5d73','#ff9f68','circle','triangle'],
  ['Silver Static','#111315','#e6edf3','#8b98a7','circle','line'],
  ['Prism Night','#0b0714','#d0a2ff','#7dd3fc','star','diamond'],
];

function makePreset(preset, index) {
  const [name, background, primary, secondary, imageShape, barShape] = preset;
  const elements = defaultElements();
  const find = (type) => elements.find((e) => e.type === type);
  const bars = find('barsSegments');
  const particles = find('particles');
  const image = find('image');
  const text = find('text');
  if (bars) Object.assign(bars.props, {
    tag: 'Spectrum · ' + name, visible: true, shapePath: barShape,
    segment1ColorFrom: primary, segment1ColorTo: secondary,
    segment1Enabled: true, segment1Mirror: index % 3 === 1,
    heightScale: 8 + (index % 5) * 2, maxHeightScale: 1 + (index % 3) * 0.25,
    softness: 0.45 + (index % 5) * 0.1,
  });
  if (particles) Object.assign(particles.props, {
    tag: 'Particles · ' + name, visible: index % 4 !== 3,
    color: primary, colorFrom: primary, colorTo: secondary,
    countLimit: 500 + (index % 6) * 250, particleScale: 1 + (index % 4) * 0.5,
    speed: 45 + (index % 5) * 20, speedRandom: 0.25 + (index % 4) * 0.15,
    vectorAngle: 250 + (index % 5) * 10,
  });
  if (image) Object.assign(image.props, {
    tag: 'Artwork · ' + name, visible: true, shape: imageShape,
    position: [0, 0], anchorX: 0.5, anchorY: 0.5,
    scale: [0.34 + (index % 3) * 0.04, 0.34 + (index % 3) * 0.04],
    color: primary, colorTo: secondary,
  });
  if (text) Object.assign(text.props, {
    tag: 'Track Title', visible: true, text: '{ArtistOrTitle}',
    color: primary, fontSize: 32 + (index % 4) * 4,
    position: [0, 390], anchorX: 0.5, anchorY: 0.5, textAlign: 'center',
  });
  if (index % 5 === 0) {
    const fx = createElementData('rgbSplit', elements, { tag: 'RGB Accent', visible: true, splitMultiplier: 0.12, color: secondary });
    elements.push(fx);
  }
  return {
    project: { id: null, name, version: 1, settings: { ...DEFAULT_SETTINGS, background } },
    elements,
  };
}

export default function PresetPanel() {
  const [category, setCategory] = useState('All');
  const [active, setActive] = useState(-1);
  const fileRef = useRef(null);
  const categories = ['All', 'Minimal', 'Neon', 'Color'];
  const visible = PRESETS.map((p, i) => ({ p, i })).filter(({ i }) => category === 'All' || (category === 'Minimal' ? i % 4 === 3 || i === 0 : category === 'Neon' ? i % 4 === 1 || i % 4 === 2 : i % 4 === 0));
  const apply = (preset, index) => {
    try {
      const result = makePreset(preset, index);
      actions.loadProject(result.project, result.elements);
      setActive(index);
      toast('Applied preset · ' + preset[0]);
    } catch (error) {
      toast(error.message || 'Could not apply preset', 'error');
    }
  };
  return (
    <div className="presets">
      <div className="presets-toolbar">
        <div><b>Visual Presets</b><small>24 editable starting styles</small></div>
        <button className="btn small" onClick={() => fileRef.current?.click()}><Icon name="upload" size={14} />Import project</button>
        <input ref={fileRef} type="file" accept=".json,.viz,application/json,application/octet-stream" hidden
          onChange={(e) => { const file = e.target.files?.[0]; if (file) window.dispatchEvent(new CustomEvent('auravis:import-project-file', { detail: { file } })); e.target.value = ''; }} />
      </div>
      <div className="preset-categories" role="group" aria-label="Preset category">
        {categories.map((c) => <button key={c} className={category === c ? 'active' : ''} onClick={() => setCategory(c)}>{c}</button>)}
      </div>
      <div className="preset-grid">
        {visible.map(({ p, i }) => (
          <button key={p[0]} className={`preset-card ${active === i ? 'selected' : ''}`} onClick={() => apply(p, i)}>
            <span className="preset-art" style={{ '--preset-bg': p[1], '--preset-a': p[2], '--preset-b': p[3] }}>
              <i /><i /><i /><i /><b />
            </span>
            <span className="preset-card-meta"><b>{p[0]}</b><small>{p[4]} · {p[5]}</small></span>
          </button>
        ))}
      </div>
      <p className="preset-note">Presets remain fully editable in Elements and Properties. Import supports Auravis project files. Avee .viz scene conversion is being added separately; unsupported files are not silently converted.</p>
    </div>
  );
}
