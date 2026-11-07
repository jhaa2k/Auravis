import { RenderContext, findCycles } from './renderContext.js';
import { Diagnostics } from '../diagnostics.js';
import { SpectrumProvider } from '../audio/spectrumProvider.js';
import { FFT_SIZES } from '../audio/fft.js';
import { getDefinition } from '../schema/registry.js';
import { QUALITY, QUALITY_ORDER } from './quality.js';
import { imageCache } from '../assets/imageCache.js';
import { get2d } from '../platform.js';

/**
 * The compositor loop. Reads the store (non-destructive: elements are data, never mutated),
 * runs audio analysis once, updates every Audio Provider, then renders elements bottom → top.
 */
export class Visualizer {
  constructor({ canvas, store, audio, fft, onDiagnostics, onAdapt }) {
    this.canvas = canvas; this.store = store; this.audio = audio; this.fft = fft;
    this.onDiagnostics = onDiagnostics; this.onAdapt = onAdapt;
    this.diagnostics = new Diagnostics();
    this.rc = new RenderContext(this.diagnostics);
    this.providers = new Map();
    this.fps = 0; this.last = 0; this.slow = 0; this.running = false;
    this.scaleOverride = null;
    this.fpsOverride = null;
    this.hudListeners = new Set();
  }

  start() {
    if (this.running) return;
    this.running = true;
    const loop = (now) => {
      if (!this.running) return;
      this.raf = requestAnimationFrame(loop);
      const s = this.store.getState().project.settings;
      if (this.last && now - this.last < 1000 / (this.fpsOverride || s.fps) - 2) return;
      const dt = this.last ? Math.min(0.1, (now - this.last) / 1000) : 1 / 60;
      this.last = now;
      const t0 = performance.now();
      this.renderFrame(dt, now / 1000);
      this.adapt(performance.now() - t0, s);
      this.fps += (1 / dt - this.fps) * 0.1;
    };
    this.raf = requestAnimationFrame(loop);
  }
  stop() { this.running = false; cancelAnimationFrame(this.raf); }

  /** Adaptive quality: step the tier down when frames keep exceeding the budget. */
  adapt(ms, s) {
    if (!s.adaptive || this.scaleOverride) return;
    const budget = 1000 / s.fps;
    this.slow = ms > budget * 0.9 ? this.slow + 1 : Math.max(0, this.slow - 2);
    if (this.slow > 90) {
      this.slow = 0;
      const i = QUALITY_ORDER.indexOf(s.quality);
      if (i > 0) this.onAdapt?.(QUALITY_ORDER[i - 1]);
    }
  }

  updateProviders(elements, frame, dt) {
    const alive = new Set();
    const list = [];
    for (const el of elements) {
      if (el.type !== 'audioProvider') continue;
      alive.add(el.id);
      let inst = this.providers.get(el.id);
      if (!inst) this.providers.set(el.id, (inst = new SpectrumProvider()));
      const size = FFT_SIZES.includes(el.props.fftSize) ? el.props.fftSize : 2048;
      const mags = this.fft.request(size, frame.td);
      inst.update(el.props, mags, frame.sampleRate, dt, frame.td);
      for (const [lvl, msg] of inst.issues) this.diagnostics.add(el.id, lvl, msg);
      list.push({ id: el.id, el, out: inst });
    }
    for (const id of this.providers.keys()) if (!alive.has(id)) this.providers.delete(id);
    return list;
  }

  /** One complete frame. Exposed so tests / export can drive it deterministically. */
  renderFrame(dt, time) {
    const state = this.store.getState();
    const { elements, project } = state;
    const { width: lw, height: lh, background, quality } = project.settings;
    const scale = this.scaleOverride || (QUALITY[quality] || QUALITY.medium).scale;
    const pw = Math.round(lw * scale), ph = Math.round(lh * scale);
    if (this.canvas.width !== pw || this.canvas.height !== ph) { this.canvas.width = pw; this.canvas.height = ph; }
    const ctx = get2d(this.canvas);
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.globalAlpha = 1; ctx.globalCompositeOperation = 'source-over';
    ctx.clearRect(0, 0, pw, ph);
    ctx.setTransform(scale, 0, 0, scale, 0, 0);
    ctx.fillStyle = background;
    ctx.fillRect(0, 0, lw, lh);

    this.diagnostics.begin();
    const base = this.audio.analyze();
    const providers = this.updateProviders(elements, base, dt);
    const audio = { ...base, providers };
    const cycles = findCycles(elements);
    const rc = this.rc;
    rc.beginFrame({ canvas: this.canvas, ctx, lw, lh, scale, dt, time, audio, elements, meta: this.audio.meta, quality, images: imageCache, cycles });

    for (const el of elements) {
      const def = getDefinition(el.type);
      if (!def?.render || !el.props.visible) continue;
      if (cycles.has(el.id)) { this.diagnostics.add(el.id, 'error', 'Circular composition reference: effect disabled'); continue; }
      try { def.render(rc, el); }
      catch (e) { this.diagnostics.add(el.id, 'error', `Render failed: ${e.message}`); }
    }
    rc.endFrame();
    const d = this.diagnostics.flush();
    if (d) this.onDiagnostics?.(d);
    this.hudListeners.forEach((l) => l());
  }

  boxOf(id) { return this.rc.prevT.get(id) || this.rc.curT.get(id) || null; }
}
