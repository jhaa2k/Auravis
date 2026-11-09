import { createElementData } from '../schema/registry.js';
import { makeMeasure } from '../schema/measureConfig.js';

export const DEFAULT_SETTINGS = {
  width: 1920, height: 1080, background: '#0d0d12', quality: 'medium', fps: 60, adaptive: true, theme: 'dark', effects: { background: 0, cameraZoom: 0, vignette: 0, scanlines: 0, filmGrain: 0, beatFlash: 0, beatShake: 0, hueJump: 0 },
};

/** The starter audio-reactive scene a new user sees. */
export function defaultElements() {
  const list = [];
  const add = (type, over = {}) => { const e = createElementData(type, list, over); list.push(e); return e; };
  add('audioProvider', { tag: 'Audio Provider' });
  add('particles', { tag: 'Particles' });
  add('barsSegments', {
    tag: 'Bars',
    measureScale: makeMeasure({ enabled: true, source: 'bass', outMin: 1, outMax: 1.06, smoothing: 0.7 }),
  });
  add('image', {
    tag: 'Album Art', shape: 'circle', position: [0, 0], scale: [0.4, 0.4],
    measureScale: makeMeasure({ enabled: true, source: 'bass', outMin: 1, outMax: 1.12, smoothing: 0.6 }),
  });
  add('text', { tag: 'Title', text: '{title}', position: [0, 0], fontSize: 54 });
  return list;
}

export function defaultProjectState() {
  return {
    project: { id: null, name: 'Untitled Project', version: 1, settings: { ...DEFAULT_SETTINGS } },
    elements: defaultElements(),
    selectedId: null,
    past: [], future: [], lastKey: null, lastTime: 0, dirty: false,
  };
}
