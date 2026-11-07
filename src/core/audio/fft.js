// Radix-2 FFT with a Hann window. Pure functions, usable on the main thread and in the worker.
export const FFT_SIZES = [256, 512, 1024, 2048, 4096, 8192];
const plans = new Map();

function plan(n) {
  let p = plans.get(n);
  if (p) return p;
  const cos = new Float32Array(n / 2), sin = new Float32Array(n / 2);
  for (let k = 0; k < n / 2; k++) { cos[k] = Math.cos((2 * Math.PI * k) / n); sin[k] = -Math.sin((2 * Math.PI * k) / n); }
  const bits = Math.log2(n), rev = new Uint32Array(n);
  for (let i = 0; i < n; i++) { let r = 0; for (let b = 0; b < bits; b++) r |= ((i >> b) & 1) << (bits - 1 - b); rev[i] = r; }
  const hann = new Float32Array(n);
  let sum = 0;
  for (let i = 0; i < n; i++) { hann[i] = 0.5 - 0.5 * Math.cos((2 * Math.PI * i) / n); sum += hann[i]; }
  p = { cos, sin, rev, hann, sum, re: new Float32Array(n), im: new Float32Array(n) };
  plans.set(n, p);
  return p;
}

/**
 * Hann-windowed magnitude spectrum of the LAST `n` samples of `td`.
 * Scaled so a full-scale sine reads ≈ 1.0 in its bin. Writes n/2 bins into `out`.
 */
export function magnitudeSpectrum(td, n, out) {
  const p = plan(n), { re, im, rev, hann, cos, sin } = p;
  const off = td.length - n;
  for (let i = 0; i < n; i++) { re[rev[i]] = (td[off + i] || 0) * hann[i]; im[rev[i]] = 0; }
  for (let size = 2; size <= n; size <<= 1) {
    const half = size >> 1, step = n / size;
    for (let i = 0; i < n; i += size) {
      for (let j = 0, k = 0; j < half; j++, k += step) {
        const a = i + j, b = a + half;
        const tr = re[b] * cos[k] - im[b] * sin[k];
        const ti = re[b] * sin[k] + im[b] * cos[k];
        re[b] = re[a] - tr; im[b] = im[a] - ti;
        re[a] += tr; im[a] += ti;
      }
    }
  }
  const scale = 2 / p.sum;
  for (let i = 0; i < n / 2; i++) out[i] = Math.hypot(re[i], im[i]) * scale;
  return out;
}
