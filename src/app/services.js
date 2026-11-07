// Application singletons. UI code imports from here; core code never does.
import '../elements/index.js';
import { createStore } from '../core/store/store.js';
import { createActions } from '../core/store/actions.js';
import { defaultProjectState } from '../core/store/defaultProject.js';
import { AudioEngine } from '../core/audio/audioEngine.js';
import { FftService } from '../core/audio/fftService.js';
import { Visualizer } from '../core/render/visualizer.js';
import { session } from '../core/project/persistence.js';
import { fontStore } from '../core/assets/fontStore.js';
import { imageCache } from '../core/assets/imageCache.js';

function initialState() {
  const s = defaultProjectState();
  const saved = session.load();
  if (saved && saved.elements.length) {
    s.project = { id: saved.id, name: saved.name, version: 1, settings: saved.settings };
    s.elements = saved.elements;
  }
  s.selectedId = s.elements.find((e) => e.type !== 'audioProvider')?.id ?? s.elements[0]?.id ?? null;
  return s;
}

export const store = createStore(initialState());
export const actions = createActions(store);
export const diagStore = createStore({});
export const toastStore = createStore([]);
export const audio = new AudioEngine();
export const fft = new FftService();
export const visualizer = new Visualizer({
  canvas: null, store, audio, fft,
  onDiagnostics: (d) => diagStore.setState(d),
  onAdapt: (q) => { actions.setSettings({ quality: q }); toast(`Preview quality lowered to ${q} to keep the frame rate up`, 'info'); },
});

let toastId = 0;
export function toast(message, level = 'info') {
  const id = ++toastId;
  toastStore.setState((l) => [...l.slice(-3), { id, message, level }]);
  setTimeout(() => toastStore.setState((l) => l.filter((t) => t.id !== id)), level === 'error' ? 6000 : 3500);
}

// autosave the working session (debounced)
let timer = null;
store.subscribe(() => {
  clearTimeout(timer);
  timer = setTimeout(() => session.save(store.getState()), 700);
});
fontStore.restore();
export { imageCache, fontStore };
