import { magnitudeSpectrum } from './fft.js';

/**
 * Shared FFT service: one analysis per FFT size per frame, no matter how many
 * providers/elements consume it. Uses a Web Worker when available, else computes inline.
 */
export class FftService {
  constructor({ useWorker = true } = {}) {
    this.results = new Map();
    this.pending = new Set();
    this.worker = null;
    if (useWorker && typeof Worker !== 'undefined') {
      try {
        this.worker = new Worker(new URL('./fft.worker.js', import.meta.url), { type: 'module' });
        this.worker.onmessage = (e) => { this.results.set(e.data.size, e.data.mags); this.pending.delete(e.data.size); };
        this.worker.onerror = () => { this.worker = null; this.pending.clear(); };
      } catch { this.worker = null; }
    }
  }
  /** Returns the newest magnitudes available for `size` (worker results lag by ~1 frame). */
  request(size, td) {
    if (this.worker) {
      if (!this.pending.has(size)) {
        this.pending.add(size);
        const buf = td.slice(td.length - size);
        this.worker.postMessage({ size, buf }, [buf.buffer]);
      }
      return this.results.get(size) || null;
    }
    let out = this.results.get(size);
    if (!out) this.results.set(size, (out = new Float32Array(size / 2)));
    return magnitudeSpectrum(td, size, out);
  }
  dispose() { this.worker?.terminate(); }
}
