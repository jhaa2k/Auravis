import { DemoTrack } from './demoTrack.js';
import { clamp } from '../utils/math.js';

const TD = 8192;
const dbNorm = (lin) => clamp((20 * Math.log10(lin + 1e-9) + 60) / 60, 0, 1);

function parseTitle(name) {
  const base = name.replace(/\.[^.]+$/, '').replace(/[_]+/g, ' ').trim();
  const m = base.match(/^(.+?)\s+-\s+(.+)$/);
  return m ? { artist: m[1], title: m[2] } : { artist: '', title: base };
}

/**
 * Owns the single AudioContext + <audio> element. Audio is decoded once by the browser and
 * analysed once per frame (shared by all providers). Rendering reads `analyze()` output only.
 */
export class AudioEngine {
  constructor() {
    this.ctx = null;
    this.el = typeof Audio !== 'undefined' ? new Audio() : null;
    if (this.el) { this.el.crossOrigin = 'anonymous'; this.el.preload = 'auto'; }
    this.tracks = [];
    this.index = -1;
    this.mode = 'none'; // none | file | demo
    this.playing = false;
    this.volume = 0.9;
    this.shuffle = false;
    this.repeat = false;
    this.listeners = new Set();
    this.snapshot = this.makeSnapshot();
    this.td = new Float32Array(TD);
    this.tl = new Float32Array(2048);
    this.frame = this.silent();
    if (this.el) this.el.addEventListener('ended', () => this.onEnded());
  }

  silent() {
    return { td: new Float32Array(TD), sampleRate: 48000, rms01: 0, peak01: 0, left01: 0, right01: 0, level01: 0, providers: [] };
  }

  // ---- state / subscription (React uses useSyncExternalStore) ----
  makeSnapshot() {
    const t = this.tracks[this.index];
    const demo = this.mode === 'demo';
    return {
      playing: this.playing, mode: this.mode, volume: this.volume, shuffle: this.shuffle, repeat: this.repeat,
      title: demo ? 'Auravis Demo Track' : t?.title || '', artist: demo ? 'Built-in generator' : t?.artist || '',
      tracks: this.tracks.map((x) => ({ title: x.title, artist: x.artist })), index: this.index,
      hasAudio: this.mode !== 'none',
    };
  }
  emit() { this.snapshot = this.makeSnapshot(); this.listeners.forEach((l) => l()); }
  subscribe = (fn) => { this.listeners.add(fn); return () => this.listeners.delete(fn); };
  getSnapshot = () => this.snapshot;

  // ---- graph ----
  ensureContext() {
    if (this.ctx) return this.ctx;
    const C = window.AudioContext || window.webkitAudioContext;
    if (!C) throw new Error('Web Audio is not supported in this browser');
    const ctx = (this.ctx = new C());
    this.mix = ctx.createGain();
    this.monoAn = ctx.createAnalyser();
    this.monoAn.fftSize = TD; this.monoAn.smoothingTimeConstant = 0;
    const split = ctx.createChannelSplitter(2);
    this.lAn = ctx.createAnalyser(); this.rAn = ctx.createAnalyser();
    this.lAn.fftSize = this.rAn.fftSize = 2048;
    this.lAn.smoothingTimeConstant = this.rAn.smoothingTimeConstant = 0;
    this.vol = ctx.createGain(); this.vol.gain.value = this.volume;
    this.recordDest = ctx.createMediaStreamDestination();
    this.mix.connect(this.monoAn); this.mix.connect(split);
    split.connect(this.lAn, 0); split.connect(this.rAn, 1);
    this.mix.connect(this.vol); this.vol.connect(ctx.destination); this.vol.connect(this.recordDest);
    this.mediaSource = ctx.createMediaElementSource(this.el);
    this.mediaSource.connect(this.mix);
    this.demo = new DemoTrack(ctx, this.mix);
    return ctx;
  }

  // ---- library ----
  addFiles(files) {
    const added = [];
    for (const f of files) {
      if (!f.type.startsWith('audio/') && !/\.(mp3|wav|ogg|flac|m4a|aac|opus|webm)$/i.test(f.name)) continue;
      added.push({ ...parseTitle(f.name), url: URL.createObjectURL(f), name: f.name });
    }
    if (!added.length) return 0;
    const first = this.tracks.length;
    this.tracks.push(...added);
    if (this.mode !== 'file' || this.index < 0) this.load(first, true);
    else this.emit();
    return added.length;
  }
  load(i, autoplay = false) {
    if (!this.tracks.length) return;
    this.demo?.stop(true);
    this.index = ((i % this.tracks.length) + this.tracks.length) % this.tracks.length;
    this.mode = 'file';
    this.el.src = this.tracks[this.index].url;
    this.el.load();
    this.playing = false;
    this.emit();
    if (autoplay) this.play();
  }
  startDemo() {
    this.ensureContext();
    this.el.pause();
    this.mode = 'demo';
    this.demo.stop(true);
    this.playing = false;
    this.play();
  }
  removeTrack(i) {
    const t = this.tracks[i];
    if (!t) return;
    URL.revokeObjectURL(t.url);
    this.tracks.splice(i, 1);
    if (i === this.index) { this.el.pause(); this.el.removeAttribute('src'); this.index = -1; this.mode = 'none'; this.playing = false; if (this.tracks.length) return this.load(Math.min(i, this.tracks.length - 1)); }
    else if (i < this.index) this.index--;
    this.emit();
  }

  // ---- transport ----
  async play() {
    if (this.mode === 'none') return;
    const ctx = this.ensureContext();
    if (ctx.state === 'suspended') await ctx.resume();
    if (this.mode === 'demo') this.demo.start(); else await this.el.play().catch(() => {});
    this.playing = true; this.emit();
  }
  pause() {
    if (this.mode === 'demo') this.demo?.stop(); else this.el.pause();
    this.playing = false; this.emit();
  }
  toggle() { return this.playing ? this.pause() : this.play(); }
  seek(t) { if (this.mode === 'file' && Number.isFinite(this.el.duration)) this.el.currentTime = clamp(t, 0, this.el.duration); }
  next() { if (this.tracks.length) this.load(this.shuffle ? Math.floor(Math.random() * this.tracks.length) : this.index + 1, true); }
  prev() { if (this.currentTime > 3) this.seek(0); else if (this.tracks.length) this.load(this.index - 1, true); }
  setVolume(v) { this.volume = clamp(v, 0, 1); if (this.vol) this.vol.gain.value = this.volume; this.emit(); }
  toggleShuffle() { this.shuffle = !this.shuffle; this.emit(); }
  toggleRepeat() { this.repeat = !this.repeat; this.emit(); }
  onEnded() {
    if (this.repeat) { this.el.currentTime = 0; this.play(); }
    else if (this.tracks.length > 1) this.next();
    else { this.playing = false; this.emit(); }
  }
  get currentTime() { return this.mode === 'demo' ? this.demo?.time || 0 : this.el?.currentTime || 0; }
  get duration() { return this.mode === 'demo' ? Infinity : Number.isFinite(this.el?.duration) ? this.el.duration : 0; }
  get meta() {
    const s = this.snapshot;
    return { title: s.title, artist: s.artist, time: this.currentTime, duration: this.duration };
  }

  // ---- analysis: called once per rendered frame ----
  analyze() {
    const f = this.frame;
    if (!this.ctx || !this.playing) {
      // keep decaying towards silence when paused
      f.td.fill(0); f.rms01 = f.peak01 = f.left01 = f.right01 = f.level01 = 0;
      f.sampleRate = this.ctx?.sampleRate || 48000;
      return f;
    }
    this.monoAn.getFloatTimeDomainData(this.td);
    f.td = this.td;
    f.sampleRate = this.ctx.sampleRate;
    let sum = 0, pk = 0;
    for (let i = TD - 2048; i < TD; i++) { const v = this.td[i]; sum += v * v; const a = Math.abs(v); if (a > pk) pk = a; }
    const rms = Math.sqrt(sum / 2048);
    const chan = (an) => { an.getFloatTimeDomainData(this.tl); let s = 0; for (let i = 0; i < 2048; i++) s += this.tl[i] * this.tl[i]; return Math.sqrt(s / 2048); };
    f.rms01 = dbNorm(rms); f.peak01 = dbNorm(pk);
    f.left01 = dbNorm(chan(this.lAn)); f.right01 = dbNorm(chan(this.rAn));
    f.level01 = clamp(f.rms01 * 0.7 + f.peak01 * 0.3, 0, 1);
    return f;
  }
  get captureStream() { this.ensureContext(); return this.recordDest.stream; }
}
