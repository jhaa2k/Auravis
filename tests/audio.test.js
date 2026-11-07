import { describe, it, expect } from 'vitest';
import { magnitudeSpectrum } from '../src/core/audio/fft.js';
import { aWeightDb } from '../src/core/audio/aWeighting.js';
import { SpectrumProvider } from '../src/core/audio/spectrumProvider.js';
import { defaultProps } from '../src/core/schema/validate.js';
import { getDefinition } from '../src/core/schema/registry.js';
import '../src/elements/index.js';

const sine = (f, n = 8192, sr = 48000, a = 1) => Float32Array.from({ length: n }, (_, i) => a * Math.sin((2 * Math.PI * f * i) / sr));
const provProps = (o = {}) => ({ ...defaultProps(getDefinition('audioProvider')), ...o });
const run = (props, td = sine(1000), dt = 1 / 60, frames = 30) => {
  const p = new SpectrumProvider(), n = props.fftSize, out = new Float32Array(n / 2);
  const mags = magnitudeSpectrum(td, n, out);
  for (let i = 0; i < frames; i++) p.update(props, mags, 48000, dt);
  return p;
};

describe('FFT', () => {
  it('finds the right bin and calibrates amplitude (Hann window)', () => {
    const n = 2048, out = magnitudeSpectrum(sine(1000, n), n, new Float32Array(n / 2));
    let k = 0; for (let i = 1; i < out.length; i++) if (out[i] > out[k]) k = i;
    expect(Math.abs(k - 1000 / (48000 / n))).toBeLessThan(1.5);
    expect(out[k]).toBeGreaterThan(0.75);
    expect(out[k]).toBeLessThan(1.05);
  });
  it('is near silent for silence', () => {
    const out = magnitudeSpectrum(new Float32Array(2048), 2048, new Float32Array(1024));
    expect(Math.max(...out)).toBe(0);
  });
});

describe('A-weighting', () => {
  it('matches the IEC curve', () => {
    expect(aWeightDb(1000)).toBeCloseTo(0, 1);
    expect(aWeightDb(100)).toBeCloseTo(-19.1, 0);
    expect(aWeightDb(50)).toBeCloseTo(-30.2, 0);
    expect(aWeightDb(10000)).toBeCloseTo(-2.5, 0);
  });
});

describe('SpectrumProvider', () => {
  it('outputs exactly Sample Out Count samples in 0..8', () => {
    const p = run(provProps({ sampleOutCount: 48 }));
    expect(p.samples.length).toBe(48);
    expect(Math.max(...p.samples)).toBeGreaterThan(0.3);
    expect(Math.min(...p.samples)).toBeGreaterThanOrEqual(0);
  });
  it('puts the energy of a 1 kHz tone near the matching output sample (log map)', () => {
    const p = run(provProps({ sampleOutCount: 64, lowerHz: 100, higherHz: 10000, hzLinearFactor: 0, smooth: 0, filterStrength: 0, preSmooth: 0 }));
    let k = 0; p.samples.forEach((v, i) => { if (v > p.samples[k]) k = i; });
    expect(Math.abs(k - 32)).toBeLessThanOrEqual(2); // 1 kHz is the geometric middle of 100…10k
  });
  it('mirrors positions without summing energy', () => {
    const p = run(provProps({ sampleOutCount: 32, mirrorSamples: true, smooth: 0 }));
    for (let i = 0; i < 16; i++) expect(p.samples[i]).toBeCloseTo(p.samples[31 - i], 5);
  });
  it('repeat tiles the pattern', () => {
    const p = run(provProps({ sampleOutCount: 32, repeatSamples: 2, smooth: 0 }));
    for (let i = 0; i < 16; i++) expect(p.samples[i]).toBeCloseTo(p.samples[i + 16], 5);
  });
  it('start/end gap zeroes the edges', () => {
    const p = run(provProps({ sampleOutCount: 40, startEndGap: [10, 25], smooth: 0 }));
    for (let i = 0; i < 4; i++) expect(p.samples[i]).toBe(0);
    for (let i = 30; i < 40; i++) expect(p.samples[i]).toBe(0);
    expect(p.samples[15]).toBeGreaterThan(0);
  });
  it('AWeight really changes low-frequency output', () => {
    const td = sine(80, 8192, 48000, 0.5);
    const a = run(provProps({ aWeight: false, smooth: 0 }), td), b = run(provProps({ aWeight: true, smooth: 0 }), td);
    expect(Math.max(...b.samples)).toBeLessThan(Math.max(...a.samples) * 0.8);
  });
  it('Output Multiplier scales', () => {
    const a = run(provProps({ smooth: 0, outputMultiplier: 0.5 })), b = run(provProps({ smooth: 0, outputMultiplier: 1 }));
    expect(Math.max(...a.samples)).toBeLessThan(Math.max(...b.samples));
  });
  it('reports invalid frequency range and invalid fft size instead of failing', () => {
    const p = run(provProps({ lowerHz: 5000, higherHz: 100 }));
    expect(p.issues.some(([l, m]) => l === 'error' && /frequency range/.test(m))).toBe(true);
    expect(p.samples.length).toBe(64);
    const q = new SpectrumProvider(); q.update(provProps({ fftSize: 1234 }), null, 48000, 1 / 60);
    expect(q.issues.some(([, m]) => /FFT size/.test(m))).toBe(true);
  });
  it('detects a beat on an energy jump but not on steady energy', () => {
    const props = provProps({ smooth: 0, beatRangeBarFirst: 30, beatRangeBarLast: 34, beatSmooth: 0.5, lowerHz: 100, higherHz: 10000, hzLinearFactor: 0 });
    const quiet = sine(1000, 8192, 48000, 0.02), loud = sine(1000, 8192, 48000, 0.8);
    const p = new SpectrumProvider(), n = props.fftSize;
    const mq = magnitudeSpectrum(quiet, n, new Float32Array(n / 2)), ml = magnitudeSpectrum(loud, n, new Float32Array(n / 2));
    for (let i = 0; i < 120; i++) p.update(props, mq, 48000, 1 / 60);
    const steady = p.beat;
    p.update(props, ml, 48000, 1 / 60);
    expect(steady).toBeLessThan(0.05);
    expect(p.beat).toBeGreaterThan(0.4);
    for (let i = 0; i < 400; i++) p.update(props, ml, 48000, 1 / 60);
    expect(p.beat).toBeLessThan(0.1); // sustained loudness is not a beat
  });
  it('Freq Shift keeps a valid output', () => {
    for (const s of [-1, -0.5, 0.5, 1]) expect(run(provProps({ freqShift: s })).samples.every(Number.isFinite)).toBe(true);
  });
});
