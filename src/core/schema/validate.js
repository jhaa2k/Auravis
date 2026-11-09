import { clamp, isNum } from '../utils/math.js';
import { isValidColor, normalizeColor } from '../utils/color.js';
import { MEASURE_SOURCES, MEASURE_CURVES, MEASURE_AXES } from '../measure/sources.js';
import { makeMeasure } from './measureConfig.js';

const range = (v, lo, hi, def) => (isNum(v) ? clamp(v, lo, hi) : def);
const has = (list, v) => list.some((o) => o.value === v);

export function sanitizeMeasure(v, def) {
  const base = makeMeasure(def);
  const o = v && typeof v === 'object' ? v : {};
  return {
    enabled: !!(o.enabled ?? base.enabled),
    source: has(MEASURE_SOURCES, o.source) ? o.source : base.source,
    band: Math.round(range(o.band, 0, 1023, base.band)),
    hz: range(o.hz, 20, 22050, base.hz),
    providerIndex: Math.round(range(o.providerIndex, 1, 16, base.providerIndex)),
    inMin: range(o.inMin, -1e6, 1e6, base.inMin),
    inMax: range(o.inMax, -1e6, 1e6, base.inMax),
    outMin: range(o.outMin, -1e5, 1e5, base.outMin),
    outMax: range(o.outMax, -1e5, 1e5, base.outMax),
    multiplier: range(o.multiplier, -100, 100, base.multiplier),
    offset: range(o.offset, -1e5, 1e5, base.offset),
    smoothing: range(o.smoothing, 0, 0.99, base.smoothing),
    curve: has(MEASURE_CURVES, o.curve) ? o.curve : base.curve,
    invert: !!(o.invert ?? base.invert),
    axis: has(MEASURE_AXES, o.axis) ? o.axis : base.axis,
    a: range(o.a, -1e4, 1e4, base.a),
    b: range(o.b, -1e4, 1e4, base.b),
  };
}

/** Validates one value against its property definition. Returns {value, error?}. */
export function sanitizeValue(p, v) {
  switch (p.type) {
    case 'number': {
      if (/^segment[12]FixedHeight$/.test(p.key) && typeof v === 'boolean') v = v ? 1 : 0;
      if (p.key === 'aWeight' && typeof v === 'boolean') v = Number(v);
      if ((p.key === 'beatRangeBarFirst' || p.key === 'beatRangeBarLast') && isNum(v) && v > 1) v /= 64;
      if (!isNum(v)) return { value: p.default, error: `${p.label}: not a number` };
      const c = clamp(v, p.min ?? -Infinity, p.max ?? Infinity);
      return c !== v ? { value: c, error: `${p.label}: clamped to ${c}` } : { value: v };
    }
    case 'int': {
      if (!isNum(v)) return { value: p.default, error: `${p.label}: not a number` };
      const c = clamp(Math.round(v), p.min ?? -Infinity, p.max ?? Infinity);
      return { value: c };
    }
    case 'bool': {
      if (p.key === 'relativeMotionMode' && typeof v === 'string') return { value: v !== 'absolute' };
      if (p.key === 'vectorRelativeToCenter' && typeof v === 'string') return { value: v !== 'off' };
      return { value: !!v };
    }
    case 'select': {
      const hit = p.options.find((o) => String(o.value) === String(v));
      if (hit) return { value: hit.value };
      // dynamic option sets (targets / fonts) are validated by the renderer, keep the value
      if (p.dynamic && typeof v === 'string') return { value: v };
      return { value: p.default, error: `${p.label}: unsupported value, reset to default` };
    }
    case 'color': return isValidColor(v) ? { value: normalizeColor(v) } : { value: p.default, error: `${p.label}: invalid color` };
    case 'text': return { value: typeof v === 'string' ? v.slice(0, p.maxLength) : p.default };
    case 'textarea': return { value: typeof v === 'string' ? v.slice(0, p.maxLength) : p.default };
    case 'vec2': {
      if (p.key === 'splitAmount' && isNum(v)) v = [v, 0];
      if (p.key === 'layer1Scale' || p.key === 'layer2Scale' || p.key === 'layer3Scale') {
        if (isNum(v)) v = [v, v];
      }
      if (p.key === 'gravity' && isNum(v)) v = [0, v];
      if (!Array.isArray(v) || v.length < 2 || !isNum(v[0]) || !isNum(v[1])) return { value: [...p.default], error: `${p.label}: invalid vector` };
      return { value: [clamp(v[0], p.min, p.max), clamp(v[1], p.min, p.max)] };
    }
    case 'measure': return { value: sanitizeMeasure(v, p.default) };
    case 'image': return { value: typeof v === 'string' && v ? v : null };
    case 'action': return { value: isNum(v) ? Math.max(0, Math.round(v)) : 0 };
    default: return { value: v };
  }
}

export const allProps = (def) => def.sections.flatMap((s) => s.props);
export const propMap = (def) => (def._map ||= Object.fromEntries(allProps(def).map((p) => [p.key, p])));

export function defaultProps(def) {
  const out = {};
  for (const p of allProps(def)) out[p.key] = structuredClone(p.default);
  return out;
}

/** Sanitizes a full props object (used on load/import). Unknown keys are dropped, missing keys get defaults. */
export function sanitizeProps(def, input = {}) {
  const errors = [];
  const props = {};
  for (const p of allProps(def)) {
    if (input[p.key] === undefined) { props[p.key] = structuredClone(p.default); continue; }
    const r = sanitizeValue(p, input[p.key]);
    props[p.key] = r.value;
    if (r.error) errors.push(r.error);
  }
  return { props, errors };
}
