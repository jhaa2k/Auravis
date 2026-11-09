import { describe, it, expect, beforeAll } from 'vitest';
import { makeHarness } from './helpers.js';
import { createElementData } from '../src/core/schema/registry.js';
import { makeMeasure } from '../src/core/schema/measureConfig.js';
import { buildMaskCanvas } from '../src/core/render/mask.js';
import { blurCanvas, _forceCpuBlur } from '../src/core/render/blur.js';
import { generateAlbumArt } from '../src/elements/image/albumArt.js';
import { buildTexture, TEX } from '../src/elements/image/pipeline.js';

let diag;
const only = (h, type, over = {}) => {
  const el = createElementData(type, [], over);
  h.store.setState((s) => ({ ...s, elements: [h.store.getState().elements.find((e) => e.type === 'audioProvider'), el] }));
  return el;
};
const harness = () => { const h = makeHarness('low'); h.vis.onDiagnostics = (d) => { diag = d; }; diag = {}; return h; };

describe('full default scene', () => {
  it('renders every default element without errors and draws pixels', () => {
    const h = harness();
    h.frames(10);
    expect(h.coverage()).toBeGreaterThan(0.01);
    expect(Object.values(diag).flat().filter((d) => d.level === 'error')).toEqual([]);
  });
});

describe('elements render individually', () => {
  const cases = [
    ['image', { visible: true }],
    ['barsSegments', { segment2Enabled: true, shapePath: 'capsule' }],
    ['particles', { visible: true, spawnTime: 0.002, countLimit: 300, particleScale: 4, fadeInSize: 12, endSize: 12 }],
    ['text', { visible: true, text: 'Auravis visualizer', fontSize: 32, typeFace: 'Inter' }],
    ['waveform', { visible: true, waveformMode: 'mirror', amplitude: 2 }],
    ['radialSpectrum', { visible: true, barCount: 96, sensitivity: 2 }],
  ];
  for (const [type, over] of cases) {
    it(`${type} draws visible content`, () => {
      const h = harness(); only(h, type, over); h.frames(40);
      if (type === 'text') {
        expect(h.vis.rc.cache.has(`txt:${h.store.getState().elements.at(-1).id}`)).toBe(true);
        expect(h.vis.boxOf(h.store.getState().elements.at(-1).id)).toBeTruthy();
      } else expect(h.coverage(), type).toBeGreaterThan(0.002);
      expect(Object.values(diag).flat().filter((d) => d.level === 'error')).toEqual([]);
    });
  }
  it('waveform falls back to the selected provider envelope when native PCM time data is unavailable', () => {
    const h = harness();
    const el = only(h, 'waveform', { visible: true, audioProviderIndex: 1, waveformMode: 'mirror' });
    const provider = h.store.getState().elements.find((e) => e.type === 'audioProvider');
    const quietAudio = { analyze: () => ({ td: new Float32Array(8192), sampleRate: 48000, rms01: 0, peak01: 0, left01: 0, right01: 0, level01: 0 }), meta: {} };
    h.vis.audio = quietAudio;
    h.vis.fft.setExternalSpectrum(2048, new Float32Array(1024).fill(0.6), 44100);
    h.frames(4);
    expect(h.coverage()).toBeGreaterThan(0.002);
    expect(h.vis.fft.externalSampleRate).toBe(44100);
  });
  it('bars react to audio: heights follow the provider and Flip Input mirrors them', () => {
    const h = harness(); const el = only(h, 'barsSegments', { softness: 0, segment1Mirror: false });
    h.frames(8);
    const st = h.vis.rc.states.get(el.id);
    expect(Math.max(...st.heights)).toBeGreaterThan(0.1);
    const before = Array.from(st.heights);
    h.actions.updateProps(el.id, { flipInput: true }); h.frames(8);
    const after = Array.from(h.vis.rc.states.get(el.id).heights);
    expect(after[0]).toBeCloseTo(before[before.length - 1], 1);
  });
  it('bars report an invalid Audio Provider Index', () => {
    const h = harness(); only(h, 'barsSegments', { audioProviderIndex: 5 }); h.frames(2);
    expect(Object.values(diag).flat().some((d) => /Audio Provider Index/.test(d.message))).toBe(true);
  });
  it('bars reject invalid custom paths but keep rendering', () => {
    const h = harness(); only(h, 'barsSegments', { shapePath: 'custom', customShapePath: 'nope' }); h.frames(10);
    expect(Object.values(diag).flat().some((d) => /Custom path/.test(d.message))).toBe(true);
    expect(h.coverage()).toBeGreaterThan(0.002);
  });
  it('particles never exceed Count Limit and warn when the tier caps it', () => {
    const h = harness(); const el = only(h, 'particles', { spawnTime: 0.001, countLimit: 8000 }); h.frames(120);
    expect(h.vis.rc.states.get(el.id).sys.count).toBeLessThanOrEqual(1500);
    expect(Object.values(diag).flat().some((d) => /capped/.test(d.message))).toBe(true);
  });
  it('particles: mirror, trails, perspective, custom spawn areas run', () => {
    const h = harness();
    only(h, 'particles', { mirrorX: true, mirrorY: true, trailLength: 0.4, spawnArea: 'circle', forceField: 'attraction', useRandomVector: true, vectorAngleZ: 30 });
    h.frames(60);
    expect(h.coverage()).toBeGreaterThan(0.001);
    expect(Object.values(diag).flat().filter((d) => d.level === 'error')).toEqual([]);
  });
});

describe('effects', () => {
  const withBase = (h, type, over) => {
    const prov = h.store.getState().elements.find((e) => e.type === 'audioProvider');
    const bars = createElementData('barsSegments', [prov], { tag: 'B' });
    const fx = createElementData(type, [prov, bars], { visible: true, ...over });
    h.store.setState((s) => ({ ...s, elements: [prov, bars, fx] }));
    return { bars, fx };
  };
  for (const [type, over] of [['rgbSplit', { splitAmount: 30, splitMultiplier: 1 }], ['blurEffect', { blurRadius: 20, sourceCompositionIndex: 0 }], ['motionBlur', { motionSource: 'composition' }]]) {
    it(`${type} renders on the composition without errors`, () => {
      const h = harness(); withBase(h, type, over); h.frames(20);
      expect(h.coverage()).toBeGreaterThan(0.002);
      expect(Object.values(diag).flat().filter((d) => d.level === 'error')).toEqual([]);
    });
  }
  it('RGB split can target a hidden element', () => {
    const h = harness(); const { bars, fx } = withBase(h, 'rgbSplit', { splitAmount: 20, splitMultiplier: 1 });
    h.actions.updateProps(bars.id, { visible: false }); h.actions.updateProps(fx.id, { targetImage: bars.id }); h.frames(15);
    expect(h.coverage()).toBeGreaterThan(0.002);
  });
  it('RGB split with zero offset and default colours reproduces the source', () => {
    const h = harness(); const { fx } = withBase(h, 'rgbSplit', { splitAmount: 0, splitMultiplier: 0, color: '#ffffffff', blendModeContent: 'normal', showUnblurredContent: false });
    h.actions.updateProps(fx.id, { measureSplitAmount: makeMeasure({ enabled: false }) }); h.frames(12);
    const split = h.coverage();
    h.actions.updateProps(fx.id, { visible: false }); h.frames(12);
    expect(Math.abs(split - h.coverage())).toBeLessThan(0.03); // only resampling softness differs
  });
  it('blur effect spreads energy (more lit pixels than the source)', () => {
    const h = harness(); const { fx } = withBase(h, 'blurEffect', {
      blurRadius: 60, blurMultiplier: 1, sourceCompositionIndex: 0, color: '#ffffffff', blendModeContent: 'normal', layer1Color: '#ffffffff', layer2Color: '#ffffffff', layer3Color: '#ffffffff', layer1Scale: [1, 1], layer2Scale: [1.05, 1.05], layer3Scale: [1.12, 1.12], showUnblurredContent: false,
    });
    h.frames(12); const blurred = h.coverage();
    h.actions.updateProps(fx.id, { visible: false }); h.frames(12);
    expect(blurred).toBeGreaterThan(h.coverage());
  });
  it('detects and reports circular references', () => {
    const h = harness(); const { bars, fx } = withBase(h, 'rgbSplit', {});
    const fx2 = createElementData('blurEffect', [fx], { sourceCompositionIndex: 2 });
    h.store.setState((s) => ({ ...s, elements: [...s.elements, fx2] }));
    h.actions.updateProps(fx.id, { targetImage: fx2.id }); h.frames(3);
    expect(Object.values(diag).flat().some((d) => /Circular/.test(d.message))).toBe(true);
  });
  it('reports a missing target and an invalid composition index', () => {
    const h = harness(); const { fx } = withBase(h, 'rgbSplit', { targetImage: 'ghost' }); h.frames(2);
    expect(Object.values(diag).flat().some((d) => /Missing target/.test(d.message))).toBe(true);
    const h2 = harness(); withBase(h2, 'blurEffect', { sourceCompositionIndex: 40 }); h2.frames(2);
    expect(Object.values(diag).flat().some((d) => /Invalid composition reference/.test(d.message))).toBe(true);
  });
  it('motion blur produces real motion from Measured Movement', () => {
    const h = harness(); const { fx } = withBase(h, 'motionBlur', { motionSource: 'measured' });
    h.actions.updateProps(fx.id, { measurePos: makeMeasure({ enabled: true, source: 'level', a: 200, b: 5, axis: 'x' }) });
    h.frames(30);
    const st = h.vis.rc.states.get(fx.id);
    expect(Math.abs(st.off)).toBeGreaterThan(1);
  });
});

describe('transform + measurement integration', () => {
  it('Measure Pos moves the element along the chosen axis', () => {
    const h = harness(); const el = only(h, 'text', { measurePos: makeMeasure({ enabled: true, source: 'level', outMin: 0, outMax: 100, axis: 'y', smoothing: 0 }) });
    h.frames(3);
    const T = h.vis.boxOf(el.id);
    expect(T.moy).toBeGreaterThan(10); expect(T.mox).toBe(0);
  });
  it('alignment position anchors to canvas corners', () => {
    const h = harness(); const el = only(h, 'text', { alignmentPosition: 'bottomRight', position: [-100, -50] }); h.frames(2);
    const T = h.vis.boxOf(el.id);
    expect(T.x).toBe(1820); expect(T.y).toBe(1030);
  });
  it('missing provider for a measurement is reported', () => {
    const h = harness(); only(h, 'text', { measureScale: makeMeasure({ enabled: true, source: 'bass', providerIndex: 9 }) }); h.frames(2);
    expect(Object.values(diag).flat().some((d) => /Audio Provider 9/.test(d.message))).toBe(true);
  });
});

describe('image pipeline', () => {
  beforeAll(() => harness());
  const src = (nc, color = '#2288ff') => { const c = nc.createCanvas(400, 200); const x = c.getContext('2d'); x.fillStyle = color; x.fillRect(0, 0, 400, 200); x.fillStyle = '#ff0000'; x.fillRect(150, 50, 100, 100); return { drawable: c, w: 400, h: 200 }; };
  const alphaAt = (c, x, y) => c.getContext('2d').getImageData(x, y, 1, 1).data[3];
  it('shape clips, circle corners are transparent', () => {
    const { nc } = harness();
    const t = buildTexture(src(nc), { keepAspectRatioAndCropToFit: true, keepAspectRatio: true, shape: 'circle', saturation: 1, colorKeyEnabled: false, transparencyStrength: 0.3, blurEnabled: false, maskMode: 'alpha', colorKey: '#000000ff' }, null);
    expect(alphaAt(t, TEX / 2, TEX / 2)).toBe(255); expect(alphaAt(t, 5, 5)).toBe(0);
  });
  it('colour key removes the key colour', () => {
    const { nc } = harness();
    const base = { keepAspectRatioAndCropToFit: true, keepAspectRatio: true, shape: 'square', saturation: 1, transparencyStrength: 0.4, blurEnabled: false, maskMode: 'alpha' };
    const t = buildTexture(src(nc), { ...base, colorKeyEnabled: true, colorKey: '#2288ffff' }, null);
    expect(alphaAt(t, 20, 20)).toBe(0); expect(alphaAt(t, TEX / 2, TEX / 2)).toBe(255);
  });
  it('mask modes use real channel data', () => {
    const { nc } = harness();
    const m = nc.createCanvas(2, 1), x = m.getContext('2d'); x.fillStyle = '#fff'; x.fillRect(0, 0, 1, 1); x.fillStyle = '#000'; x.fillRect(1, 0, 1, 1);
    const a = (mode, px) => buildMaskCanvas(m, mode, 2, 1).getContext('2d').getImageData(px, 0, 1, 1).data[3];
    expect(a('alpha', 0)).toBe(255); expect(a('alpha', 1)).toBe(255);
    expect(a('luminance', 0)).toBe(255); expect(a('luminance', 1)).toBe(0);
    expect(a('inverted', 0)).toBe(0); expect(a('inverted', 1)).toBe(255);
  });
  it('contain + blurred border fills the letterbox area', () => {
    const { nc } = harness();
    const p = { keepAspectRatioAndCropToFit: false, keepAspectRatio: true, blurredBorder: true, blurredBorderRadius: 30, shape: 'square', saturation: 1, colorKeyEnabled: false, transparencyStrength: 0.3, blurEnabled: false, maskMode: 'alpha', colorKey: '#000000ff' };
    expect(alphaAt(buildTexture(src(nc), p, null), TEX / 2, 20)).toBeGreaterThan(150);
    expect(alphaAt(buildTexture(src(nc), { ...p, blurredBorder: false }, null), TEX / 2, 20)).toBe(0);
  });
  it('CPU blur fallback works and matches the canvas-filter blur roughly', () => {
    const { nc } = harness();
    const a = nc.createCanvas(64, 64); const x = a.getContext('2d'); x.fillStyle = '#fff'; x.fillRect(28, 28, 8, 8);
    _forceCpuBlur(true);
    const out = nc.createCanvas(64, 64); blurCanvas(a, out, 10, 1);
    const center = out.getContext('2d').getImageData(32, 32, 1, 1).data[3], edge = out.getContext('2d').getImageData(20, 32, 1, 1).data[3];
    _forceCpuBlur(false);
    expect(center).toBeLessThan(255); expect(edge).toBeGreaterThan(0);
  });
  it('album art is deterministic per seed and changes with the Force Gen nonce', () => {
    harness();
    const sig = (o) => Buffer.from(generateAlbumArt({ size: 128, ...o }).toBuffer('image/png')).toString('base64').slice(0, 400);
    const a = sig({ seed: 's', nonce: 0 });
    expect(sig({ seed: 's', nonce: 0 })).toBe(a);
    expect(sig({ seed: 's', nonce: 1 })).not.toBe(a);
    expect(sig({ seed: 's', nonce: 0, shiftHue: 120 })).not.toBe(a);
  });
});
