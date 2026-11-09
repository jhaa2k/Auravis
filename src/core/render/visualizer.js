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
    this.effectState = { low: 0, previousLevel: 0, flash: 0, beatCount: 0, lastBeat: -1 };
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
      inst.update(el.props, mags, this.fft.externalSampleRate || frame.sampleRate, dt, frame.td);
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
    this.applyProjectEffects(project.settings.effects || {}, audio, dt, time);
    const d = this.diagnostics.flush();
    if (d) this.onDiagnostics?.(d);
    this.hudListeners.forEach((l) => l());
  }


  /** Project-wide post compositor. Runs on the same canvas captured by MediaRecorder. */
  applyProjectEffects(effects, audio, dt, time) {
    const keys = ['background','cameraZoom','vignette','scanlines','filmGrain','beatFlash','beatShake','hueJump','contrast','saturation','warmth','fade'];
    if (!keys.some((key) => (effects[key] || 0) > 0)) return;
    const canvas = this.canvas;
    if (!canvas || typeof document === 'undefined') return;
    const w = canvas.width, h = canvas.height;
    if (!w || !h) return;
    const e = Object.fromEntries(keys.map((key) => [key, Math.max(0, Math.min(100, Number(effects[key]) || 0))]));
    const state = this.effectState;
    const td = audio?.td;
    let low = 0;
    if (td?.length) {
      let lp = state.low;
      const start = Math.max(0, td.length - 2048);
      for (let i = start; i < td.length; i++) { lp += 0.035 * (td[i] - lp); low += Math.abs(lp); }
      low = Math.min(1, (low / Math.max(1, td.length - start)) * 5.5);
      state.low = lp;
    }
    const level = Math.max(audio?.level01 || 0, low * 0.8);
    const onset = level > Math.max(0.2, state.previousLevel * 1.28) && time - state.lastBeat > 0.16;
    if (onset) { state.flash = 1; state.beatCount++; state.lastBeat = time; }
    else state.flash = Math.max(0, state.flash - dt * 4.5);
    state.previousLevel += (level - state.previousLevel) * Math.min(1, dt * 8);

    const zoom = 1 + (e.cameraZoom / 100) * low * 0.2;
    const shake = (e.beatShake / 100) * state.flash * 10;
    const hue = (state.beatCount * e.hueJump * 0.8) % 360;
    const needsTransform = zoom > 1.001 || shake > 0.1 || hue > 0.1 || e.contrast > 0 || e.saturation !== 0 || e.warmth > 0;
    if (needsTransform) {
      if (!this.postCanvas) this.postCanvas = document.createElement('canvas');
      const copy = this.postCanvas;
      if (copy.width !== w || copy.height !== h) { copy.width = w; copy.height = h; }
      const copyCtx = copy.getContext('2d');
      if (copyCtx) {
        copyCtx.clearRect(0, 0, w, h);
        copyCtx.drawImage(canvas, 0, 0);
        const ctx = canvas.getContext('2d');
        ctx.save(); ctx.setTransform(1,0,0,1,0,0); ctx.clearRect(0,0,w,h);
        ctx.translate(w/2 + (Math.sin(time*73)*shake), h/2 + (Math.cos(time*61)*shake));
        ctx.scale(zoom, zoom);
        if ('filter' in ctx) ctx.filter = `hue-rotate(${hue}deg) saturate(${Math.max(0,1+e.saturation/100)}) contrast(${Math.max(0.1,1+e.contrast/100)}) sepia(${e.warmth/100})`;
        ctx.drawImage(copy, -w/2, -h/2, w, h);
        ctx.restore();
        if ('filter' in ctx) ctx.filter = 'none';
      }
    }
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    ctx.save(); ctx.setTransform(1,0,0,1,0,0);
    if (e.background) { ctx.globalAlpha = e.background / 100 * 0.28; ctx.fillStyle = '#000'; ctx.fillRect(0,0,w,h); }
    if (e.fade) { ctx.globalAlpha=e.fade/100*0.32;ctx.fillStyle='#fff';ctx.fillRect(0,0,w,h); }
    if (e.vignette) {
      const g = ctx.createRadialGradient(w/2,h/2,Math.min(w,h)*0.18,w/2,h/2,Math.max(w,h)*0.72);
      g.addColorStop(0,'rgba(0,0,0,0)'); g.addColorStop(1,`rgba(0,0,0,${e.vignette/100*0.82})`);
      ctx.globalAlpha=1;ctx.fillStyle=g;ctx.fillRect(0,0,w,h);
    }
    if (e.scanlines) {
      ctx.globalAlpha=e.scanlines/100*0.28;
      ctx.fillStyle='rgba(0,0,0,0.8)';
      const step=Math.max(3,Math.round(h/360));
      for(let y=0;y<h;y+=step)ctx.fillRect(0,y,w,1);
    }
    if (e.filmGrain) {
      let seed=(Math.floor(time*24)*1103515245+12345)>>>0;
      const rand=()=>{seed=(seed*1664525+1013904223)>>>0;return seed/4294967296;};
      ctx.globalAlpha=e.filmGrain/100*0.13;
      for(let i=0;i<Math.min(1800,Math.round(w*h/1400));i++){
        const v=rand()>.5?255:0;ctx.fillStyle=`rgb(${v},${v},${v})`;
        ctx.fillRect(rand()*w,rand()*h,Math.max(1,w/1200),Math.max(1,h/700));
      }
    }
    if (e.beatFlash && state.flash>0) {
      ctx.globalAlpha=state.flash*e.beatFlash/100*0.42;ctx.fillStyle='#fff';ctx.fillRect(0,0,w,h);
    }
    ctx.restore();
  }

  boxOf(id) { return this.rc.prevT.get(id) || this.rc.curT.get(id) || null; }
}
