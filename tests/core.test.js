import { describe, it, expect } from 'vitest';
import '../src/elements/index.js';
import { mapValue, applyCurve } from '../src/core/measure/mapper.js';
import { makeMeasure } from '../src/core/schema/measureConfig.js';
import { listDefinitions, getDefinition, createElementData } from '../src/core/schema/registry.js';
import { allProps, sanitizeValue, sanitizeProps, defaultProps } from '../src/core/schema/validate.js';
import { createStore } from '../src/core/store/store.js';
import { createActions } from '../src/core/store/actions.js';
import { defaultProjectState } from '../src/core/store/defaultProject.js';
import { serializeProject, deserializeProject } from '../src/core/project/projectModel.js';
import { findCycles } from '../src/core/render/renderContext.js';
import { validateCustomPath } from '../src/core/render/shapes.js';
import { resolveText } from '../src/elements/text/render.js';
import { ParticleSystem } from '../src/elements/particles/system.js';

describe('measurement mapping', () => {
  const m = (o) => makeMeasure({ enabled: true, ...o });
  it('normalizes and maps to the output range', () => {
    expect(mapValue(m({ inMin: 0, inMax: 1, outMin: 10, outMax: 20 }), 0.5)).toBeCloseTo(15);
    expect(mapValue(m({ inMin: 0.2, inMax: 0.6, outMin: 0, outMax: 100 }), 0.4)).toBeCloseTo(50);
    expect(mapValue(m({ outMin: 0, outMax: 1 }), 5)).toBeCloseTo(1);   // clamped
  });
  it('applies invert, curve, multiplier, offset in order', () => {
    expect(mapValue(m({ invert: true }), 0.25)).toBeCloseTo(0.75);
    expect(mapValue(m({ curve: 'easeIn' }), 0.5)).toBeCloseTo(0.25);
    expect(mapValue(m({ multiplier: 2, offset: 1 }), 0.5)).toBeCloseTo(2);
  });
  it('does not divide by zero on invalid ranges', () => {
    expect(Number.isFinite(mapValue(m({ inMin: 0.5, inMax: 0.5 }), 0.7))).toBe(true);
    expect(Number.isFinite(mapValue(m({ inMin: 1, inMax: 0 }), 0.7))).toBe(true);
    expect(Number.isFinite(mapValue(m({}), NaN))).toBe(true);
  });
  it('every curve maps 0→0 and 1→1', () => {
    for (const c of ['linear', 'easeIn', 'easeOut', 'smooth', 'exp', 'log', 'sine', 'step']) {
      expect(applyCurve(c, 1)).toBeCloseTo(1); if (c !== 'step') expect(applyCurve(c, 0)).toBeCloseTo(0);
    }
  });
});

describe('schema', () => {
  it('registers all 8 element types with unique, valid property definitions', () => {
    expect(listDefinitions().map((d) => d.type).sort()).toEqual(['audioProvider', 'barsSegments', 'blurEffect', 'image', 'motionBlur', 'particles', 'rgbSplit', 'text']);
    for (const def of listDefinitions()) {
      for (const p of allProps(def)) {
        expect(p.label, `${def.type}.${p.key} label`).toBeTruthy();
        const r = sanitizeValue(p, structuredClone(p.default));
        expect(r.error, `${def.type}.${p.key} default must validate`).toBeUndefined();
        expect(r.value).toEqual(p.default);
      }
    }
  });
  it('visual elements share the General property set', () => {
    for (const t of ['image', 'barsSegments', 'particles', 'text', 'rgbSplit', 'blurEffect', 'motionBlur']) {
      const keys = allProps(getDefinition(t)).map((p) => p.key);
      for (const k of ['tag', 'visible', 'blendMode', 'position', 'anchorX', 'anchorY', 'measurePos', 'alignmentPosition', 'scaleIsUniform', 'scale', 'measureScale']) expect(keys, `${t} has ${k}`).toContain(k);
    }
    expect(allProps(getDefinition('particles')).some((p) => p.key === 'rotation')).toBe(false);
    expect(allProps(getDefinition('motionBlur')).some((p) => p.key === 'measureRot')).toBe(false);
  });
  it('rejects bad values safely', () => {
    const num = allProps(getDefinition('image')).find((p) => p.key === 'saturation');
    expect(sanitizeValue(num, 99).value).toBe(3);
    expect(sanitizeValue(num, 'x').error).toBeTruthy();
    const color = allProps(getDefinition('image')).find((p) => p.key === 'color');
    expect(sanitizeValue(color, 'red').value).toBe(color.default);
    expect(sanitizeValue(color, '#fff').value).toBe('#ffffffff');
  });
  it('drops unknown keys and fills missing ones', () => {
    const { props } = sanitizeProps(getDefinition('text'), { fontSize: 9999, bogus: 1 });
    expect(props.fontSize).toBe(600); expect(props.bogus).toBeUndefined(); expect(props.text).toBe('{title}');
  });
});

describe('store, history and project IO', () => {
  const make = () => { const s = createStore(defaultProjectState()); return [s, createActions(s)]; };
  it('adds elements with unique tags and supports undo/redo', () => {
    const [s, a] = make();
    const n = s.getState().elements.length;
    a.addElement('image'); a.addElement('image');
    const tags = s.getState().elements.map((e) => e.props.tag);
    expect(new Set(tags).size).toBe(tags.length);
    a.undo(); expect(s.getState().elements.length).toBe(n + 1);
    a.redo(); expect(s.getState().elements.length).toBe(n + 2);
  });
  it('coalesces slider drags into one undo step', () => {
    const [s, a] = make();
    const id = s.getState().elements.find((e) => e.type === 'text').id;
    for (let v = 10; v < 20; v++) a.updateProps(id, { fontSize: v }, 'fontSize');
    expect(s.getState().past.length).toBe(1);
    a.undo(); expect(s.getState().elements.find((e) => e.id === id).props.fontSize).toBe(54);
  });
  it('prevents duplicate tags when renaming', () => {
    const [s, a] = make();
    const [e1, e2] = s.getState().elements.filter((e) => e.type !== 'audioProvider');
    a.updateProps(e2.id, { tag: e1.props.tag });
    expect(s.getState().elements.find((e) => e.id === e2.id).props.tag).not.toBe(e1.props.tag);
  });
  it('duplicate, reorder, delete', () => {
    const [s, a] = make();
    const first = s.getState().elements[1];
    a.duplicateElement(first.id); expect(s.getState().elements[2].type).toBe(first.type);
    a.moveElement(first.id, 1); expect(s.getState().elements[2].id).toBe(first.id);
    a.deleteElement(first.id); expect(s.getState().elements.find((e) => e.id === first.id)).toBeUndefined();
  });
  it('round-trips a project and tolerates corrupt input', () => {
    const [s] = make();
    const data = JSON.parse(JSON.stringify(serializeProject(s.getState())));
    const back = deserializeProject(data);
    expect(back.elements.length).toBe(s.getState().elements.length);
    expect(back.elements[0].props).toEqual(s.getState().elements[0].props);
    data.elements.push({ type: 'nope', props: {} });
    data.elements[1].props.fontSize = 'abc'; data.settings.width = 'wide';
    const bad = deserializeProject(data);
    expect(bad.warnings.some((w) => /unknown element/i.test(w))).toBe(true);
    expect(bad.settings.width).toBe(1920);
    expect(() => deserializeProject({ format: 'x' })).toThrow();
  });
});

describe('misc engine rules', () => {
  it('detects circular effect references', () => {
    const a = createElementData('blurEffect', []), b = createElementData('rgbSplit', [a]);
    a.props.sourceCompositionIndex = 2; b.props.targetImage = a.id;
    const bad = findCycles([a, b]);
    expect(bad.has(a.id) && bad.has(b.id)).toBe(true);
    a.props.sourceCompositionIndex = 0;
    expect(findCycles([a, b]).size).toBe(0);
  });
  it('validates custom vector paths', () => {
    expect(validateCustomPath('M0 0L100 0L50 100Z').ok).toBe(true);
    expect(validateCustomPath('alert(1)').ok).toBe(false);
    expect(validateCustomPath('').ok).toBe(false);
  });
  it('resolves text placeholders and keeps unknown ones', () => {
    expect(resolveText('{artist} – {title} {time}/{duration} {x}', { artist: 'A', title: 'T', time: 65, duration: 130 })).toBe('A – T 1:05/2:10 {x}');
  });
  it('particle pool respects its limit, recycles and keeps arrays consistent', () => {
    const p = defaultProps(getDefinition('particles')), sys = new ParticleSystem(() => 0.5);
    p.spawnTime = 0.001; p.lifetime = 0.3; p.trailLength = 0.2;
    for (let i = 0; i < 200; i++) { sys.update(1 / 60, p, 50); expect(sys.count).toBeLessThanOrEqual(50); }
    expect(sys.count).toBeGreaterThan(0);
    for (let i = 0; i < 60; i++) { p.spawnTime = 99; sys.update(1 / 60, p, 50); }
    expect(sys.count).toBe(0);
  });
  it('particle velocity modes behave', () => {
    const p = defaultProps(getDefinition('particles')), sys = new ParticleSystem(() => 0.9);
    Object.assign(p, { spawnTime: 0.001, spawnArea: 'rectangle', vectorRelativeToCenter: 'outward', speedRandom: 0 });
    sys.update(1 / 60, p, 20);
    for (let i = 0; i < sys.count; i++) expect(sys.x[i] * sys.vx[i] + sys.y[i] * sys.vy[i]).toBeGreaterThanOrEqual(-1e-3);
  });
});
