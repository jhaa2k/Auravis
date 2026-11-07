import * as nc from '@napi-rs/canvas';
import { setCanvasFactory } from '../src/core/platform.js';
import '../src/elements/index.js';
import { createStore } from '../src/core/store/store.js';
import { createActions } from '../src/core/store/actions.js';
import { defaultProjectState } from '../src/core/store/defaultProject.js';
import { FftService } from '../src/core/audio/fftService.js';
import { Visualizer } from '../src/core/render/visualizer.js';

export function setupCanvas() {
  globalThis.Path2D = nc.Path2D;
  setCanvasFactory((w, h) => nc.createCanvas(w, h));
}

/** Synthetic signal: kick-ish 60 Hz + 440 Hz + 5 kHz, so every frequency band has energy. */
export function fakeAudio() {
  const sr = 48000, td = new Float32Array(8192);
  for (let i = 0; i < td.length; i++) td[i] = 0.35 * Math.sin((2 * Math.PI * 60 * i) / sr) + 0.2 * Math.sin((2 * Math.PI * 440 * i) / sr) + 0.1 * Math.sin((2 * Math.PI * 5000 * i) / sr);
  const frame = { td, sampleRate: sr, rms01: 0.6, peak01: 0.8, left01: 0.6, right01: 0.55, level01: 0.65, providers: [] };
  return { analyze: () => frame, meta: { title: 'Test Song', artist: 'Tester', time: 5, duration: 100 } };
}

export function makeHarness(quality = 'low') {
  setupCanvas();
  const store = createStore(defaultProjectState());
  store.setState((s) => ({ ...s, project: { ...s.project, settings: { ...s.project.settings, quality, adaptive: false } } }));
  const actions = createActions(store);
  const canvas = nc.createCanvas(10, 10);
  const vis = new Visualizer({ canvas, store, audio: fakeAudio(), fft: new FftService({ useWorker: false }) });
  const frames = (n = 6) => { for (let i = 0; i < n; i++) vis.renderFrame(1 / 60, i / 60); };
  const coverage = () => {
    const d = canvas.getContext('2d').getImageData(0, 0, canvas.width, canvas.height).data;
    let lit = 0;
    for (let i = 0; i < d.length; i += 4) if (d[i] + d[i + 1] + d[i + 2] > 60) lit++;
    return lit / (d.length / 4);
  };
  return { store, actions, vis, canvas, frames, coverage, nc };
}
