import { clamp, lerp, expAlpha } from '../utils/math.js';
import { FFT_SIZES } from './fft.js';
import { aWeightDb } from './aWeighting.js';

export const DB_MIN = -80;
export const DB_MAX = -20;
const toNorm = (mag, extraDb = 0) => clamp((20 * Math.log10(mag + 1e-9) + extraDb - DB_MIN) / (DB_MAX - DB_MIN), 0, 1);

/**
 * One Audio Provider instance. Pipeline (matches the spec order):
 *   raw FFT magnitudes → Pre Smooth → Hz remap (Lower/Higher Hz, Hz Linear Factor, Freq Shift)
 *   → dB + AWeight → Filter (Radius/Strength) → Output Multiplier
 *   → arrangement (Mirror / Repeat / Start-End Gap) → temporal Smooth → Beat measurement
 * Elements never touch audio themselves; they read `samples`, `bass`, `mid`, `treble`, `beat`.
 */
export class SpectrumProvider {
  constructor() {
    this.samples = new Float32Array(0);
    this.target = new Float32Array(0);
    this.bass = 0; this.mid = 0; this.treble = 0; this.beat = 0;
    this.beatBase = 0;
    this.issues = [];
    this.pre = new Float32Array(0);
    this.binHz = 1;
    this.sampleRate = 48000;
  }

  update(props, mags, sampleRate, dt) {
    const issues = (this.issues = []);
    this.sampleRate = sampleRate;
    let n = props.fftSize;
    if (!FFT_SIZES.includes(n)) { issues.push(['error', `Invalid FFT size ${n}: using 2048`]); n = 2048; }
    const nyq = sampleRate / 2;
    let lo = clamp(props.lowerHz, 20, nyq - 1), hi = clamp(props.higherHz, 20, nyq);
    if (!(hi > lo * 1.05)) {
      issues.push(['error', `Invalid frequency range ${Math.round(lo)}–${Math.round(hi)} Hz: using ${Math.round(lo)}–${Math.round(Math.min(nyq, lo * 2))} Hz`]);
      hi = Math.min(nyq, lo * 2);
      if (!(hi > lo)) lo = hi / 2;
    }
    const bins = n / 2;
    this.binHz = sampleRate / n;
    if (this.pre.length !== bins) this.pre = new Float32Array(bins);
    const src = mags && mags.length === bins ? mags : null;

    // 1) Pre Smooth: spatial smoothing of raw magnitudes, independent from the final Smooth
    const pre = this.pre, ps = props.preSmooth;
    for (let i = 0; i < bins; i++) {
      const m = src ? src[i] : 0;
      if (ps <= 0 || !src) { pre[i] = m; continue; }
      const g = (k) => src[clamp(i + k, 0, bins - 1)];
      const avg = (g(-2) + 2 * g(-1) + 3 * m + 2 * g(1) + g(2)) / 9;
      pre[i] = lerp(m, avg, ps);
    }

    // 2) Output layout: gaps → mirror → repeat decide how many base samples we compute
    const N = clamp(Math.round(props.sampleOutCount), 4, 1024);
    const sg = Math.round((props.startEndGap[0] / 100) * N), eg = Math.round((props.startEndGap[1] / 100) * N);
    const U = Math.max(1, N - sg - eg);
    const rep = Math.max(1, Math.round(props.repeatSamples));
    const mf = props.mirrorSamples ? 2 : 1;
    const M = Math.max(1, Math.ceil(U / (mf * rep)));

    // 3) Frequency mapping: log↔linear blend (Hz Linear Factor) and Freq Shift
    const sh = clamp(props.freqShift, -1, 1), lin = props.hzLinearFactor;
    const mapU = (u) => (sh > 0 ? sh : 0) + (1 + (sh < 0 ? sh : 0) - (sh > 0 ? sh : 0)) * u;
    const freqAt = (u) => {
      const uu = mapU(u);
      const lf = lo * Math.pow(hi / lo, uu), nf = lo + (hi - lo) * uu;
      return lf + (nf - lf) * lin;
    };
    const base = new Float32Array(M);
    for (let j = 0; j < M; j++) {
      const f0 = freqAt(j / M), f1 = freqAt((j + 1) / M), fc = freqAt((j + 0.5) / M);
      const b0 = f0 / this.binHz, b1 = f1 / this.binHz;
      let mag;
      if (b1 - b0 < 1) {
        const idx = fc / this.binHz, i0 = Math.min(bins - 2, Math.floor(idx));
        mag = lerp(pre[i0], pre[i0 + 1], clamp(idx - i0, 0, 1));
      } else {
        mag = 0;
        for (let b = Math.max(0, Math.ceil(b0)); b <= Math.min(bins - 1, Math.floor(b1)); b++) mag = Math.max(mag, pre[b]);
      }
      base[j] = toNorm(mag, props.aWeight ? aWeightDb(fc) : 0); // real A-weighting at the band centre frequency
    }

    // 4) Neighbourhood filter
    const R = Math.round(props.filterRadius), fs = props.filterStrength;
    if (R > 0 && fs > 0) {
      const f = new Float32Array(M);
      for (let j = 0; j < M; j++) {
        let acc = 0, wsum = 0;
        for (let k = -R; k <= R; k++) {
          const w = R + 1 - Math.abs(k), idx = j + k;
          if (idx < 0 || idx >= M) continue;
          acc += base[idx] * w; wsum += w;
        }
        f[j] = lerp(base[j], acc / wsum, fs);
      }
      base.set(f);
    }

    // 5) Output Multiplier
    const om = props.outputMultiplier;
    for (let j = 0; j < M; j++) base[j] = clamp(base[j] * om, 0, 8);

    // 6) Mirror (positions only — values are copied, energy is never summed), Repeat, gaps
    let seq = base;
    if (props.mirrorSamples) { seq = new Float32Array(M * 2); for (let j = 0; j < M; j++) { seq[M - 1 - j] = base[j]; seq[M + j] = base[j]; } }
    const L = seq.length * rep;
    if (this.target.length !== N) { this.target = new Float32Array(N); this.samples = new Float32Array(N); }
    const tg = this.target;
    tg.fill(0);
    for (let k = 0; k < U; k++) tg[sg + k] = seq[Math.floor((k * L) / U) % seq.length];

    // 7) Temporal Smooth (exponential)
    const a = expAlpha(props.smooth, dt);
    for (let i = 0; i < N; i++) this.samples[i] += (tg[i] - this.samples[i]) * a;

    // 8) Band energies from the raw spectrum (independent of Lower/Higher Hz and gaps)
    const band = (f0, f1) => {
      const b0 = Math.max(0, Math.floor(f0 / this.binHz)), b1 = Math.min(bins - 1, Math.max(b0, Math.floor(f1 / this.binHz)));
      let e = 0;
      for (let b = b0; b <= b1; b++) e += pre[b] * pre[b];
      return clamp(toNorm(Math.sqrt(e / (b1 - b0 + 1))) * om, 0, 8);
    };
    this.bass = band(20, 250);
    this.mid = band(250, 4000);
    this.treble = band(4000, Math.min(16000, nyq));

    // 9) Beat: signal-derived onset (positive flux of the selected bar range vs. its slow baseline)
    let first = clamp(Math.round(props.beatRangeBarFirst), 0, N - 1), last = clamp(Math.round(props.beatRangeBarLast), 0, N - 1);
    if (first > last) { [first, last] = [last, first]; issues.push(['warning', 'Beat Range Bar First was greater than Last: swapped']); }
    let avg = 0;
    for (let i = first; i <= last; i++) avg += tg[i];
    avg /= last - first + 1;
    const flux = Math.max(0, avg - this.beatBase);
    this.beatBase += (avg - this.beatBase) * (1 - Math.pow(0.97, dt * 60));
    const vl = props.beatRangeValueLower, vh = Math.max(props.beatRangeValueHigher, vl + 1e-4);
    const raw = clamp((flux - vl) / (vh - vl), 0, 1);
    const bs = props.beatSmooth;
    this.beat = raw > this.beat ? this.beat + (raw - this.beat) * (1 - bs * 0.5) : Math.max(raw, this.beat * Math.pow(bs, dt * 60));
    return this;
  }

  valueAtHz(hz) {
    const bins = this.pre.length;
    if (!bins) return 0;
    const idx = clamp(hz / this.binHz, 0, bins - 2), i0 = Math.floor(idx);
    return toNorm(lerp(this.pre[i0], this.pre[i0 + 1], idx - i0));
  }
}
