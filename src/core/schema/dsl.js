// Tiny DSL used by every element schema. Each helper returns one property definition:
// { key, label, type, default, min?, max?, step?, options?, ... }
import { makeMeasure } from './measureConfig.js';

export const num = (key, label, def, min, max, step = 0.01, x = {}) => ({ key, label, type: 'number', default: def, min, max, step, ...x });
export const int = (key, label, def, min, max, step = 1, x = {}) => ({ key, label, type: 'int', default: def, min, max, step, ...x });
export const bool = (key, label, def, x = {}) => ({ key, label, type: 'bool', default: def, ...x });
export const sel = (key, label, def, options, x = {}) => ({
  key, label, type: 'select', default: def,
  options: options.map((o) => (typeof o === 'object' ? o : { value: o, label: String(o) })), ...x,
});
export const col = (key, label, def, x = {}) => ({ key, label, type: 'color', default: def, ...x });
export const txt = (key, label, def, x = {}) => ({ key, label, type: 'text', default: def, maxLength: 120, ...x });
export const area = (key, label, def, x = {}) => ({ key, label, type: 'textarea', default: def, maxLength: 2000, ...x });
export const vec2 = (key, label, def, min, max, step = 1, x = {}) => ({ key, label, type: 'vec2', default: def, min, max, step, ...x });
export const meas = (key, label, x = {}) => {
  const { labels, axis, ...cfg } = x;
  return { key, label, type: 'measure', default: makeMeasure(cfg), labels: labels || null, axis: !!axis };
};
export const img = (key, label, x = {}) => ({ key, label, type: 'image', default: null, ...x });
export const act = (key, label, x = {}) => ({ key, label, type: 'action', default: 0, ...x });
export const section = (name, props) => ({ name, props });
