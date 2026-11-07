// Built-in procedural track (kick, clap, hats, bass, arp) so the editor works without any audio file.
const BPM = 124;
const SCALE = [220, 261.63, 293.66, 329.63, 392, 440, 523.25, 587.33];

export class DemoTrack {
  constructor(ctx, output) {
    this.ctx = ctx;
    this.out = ctx.createGain();
    this.out.gain.value = 0.9;
    this.out.connect(output);
    this.timer = null;
    this.step = 0;
    this.next = 0;
    this.elapsed = 0;
    this.startedAt = 0;
    const len = ctx.sampleRate;
    this.noise = ctx.createBuffer(1, len, ctx.sampleRate);
    const d = this.noise.getChannelData(0);
    for (let i = 0; i < len; i++) d[i] = Math.random() * 2 - 1;
  }
  get time() { return this.timer ? this.elapsed + (this.ctx.currentTime - this.startedAt) : this.elapsed; }
  start() {
    if (this.timer) return;
    this.startedAt = this.ctx.currentTime;
    this.next = this.ctx.currentTime + 0.05;
    this.timer = setInterval(() => this.schedule(), 25);
  }
  stop(reset = false) {
    if (this.timer) { this.elapsed += this.ctx.currentTime - this.startedAt; clearInterval(this.timer); this.timer = null; }
    if (reset) { this.elapsed = 0; this.step = 0; }
  }
  schedule() {
    const stepDur = 60 / BPM / 4;
    while (this.next < this.ctx.currentTime + 0.15) { this.play(this.step % 32, this.next); this.next += stepDur; this.step++; }
  }
  env(g, t, a, d, peak) { g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(peak, t + a); g.gain.exponentialRampToValueAtTime(0.0001, t + a + d); }
  tone(type, f0, f1, t, dur, peak, filterHz) {
    const o = this.ctx.createOscillator(), g = this.ctx.createGain();
    o.type = type; o.frequency.setValueAtTime(f0, t);
    if (f1 !== f0) o.frequency.exponentialRampToValueAtTime(f1, t + dur * 0.6);
    this.env(g, t, 0.005, dur, peak);
    let node = o;
    if (filterHz) { const f = this.ctx.createBiquadFilter(); f.type = 'lowpass'; f.frequency.value = filterHz; o.connect(f); node = f; }
    node.connect(g); g.connect(this.out);
    o.start(t); o.stop(t + dur + 0.05);
  }
  burst(t, dur, peak, type, freq) {
    const s = this.ctx.createBufferSource(), f = this.ctx.createBiquadFilter(), g = this.ctx.createGain();
    s.buffer = this.noise; f.type = type; f.frequency.value = freq;
    this.env(g, t, 0.002, dur, peak);
    s.connect(f); f.connect(g); g.connect(this.out);
    s.start(t, Math.random() * 0.5); s.stop(t + dur + 0.05);
  }
  play(s, t) {
    if (s % 4 === 0) this.tone('sine', 160, 42, t, 0.28, 1.0);
    if (s % 8 === 4) this.burst(t, 0.16, 0.5, 'bandpass', 1800);
    if (s % 2 === 1) this.burst(t, 0.05, 0.22, 'highpass', 7500);
    const bassNotes = [55, 55, 65.41, 49];
    if (s % 4 === 2) this.tone('sawtooth', bassNotes[(s >> 3) % 4], bassNotes[(s >> 3) % 4], t, 0.22, 0.45, 280);
    if (s % 2 === 0) this.tone('square', SCALE[(s * 3 + (s >> 4)) % SCALE.length], SCALE[(s * 3 + (s >> 4)) % SCALE.length], t, 0.12, 0.08, 3200);
  }
}
