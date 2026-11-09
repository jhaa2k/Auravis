import { uid } from '../utils/id.js';
import { allProps, defaultProps } from './validate.js';

const defs = new Map();

/**
 * Registers an element type. Definition shape:
 *  { type, label, icon, kind: 'provider'|'visual'|'effect', sections, render?, actions? }
 * Adding a feature = adding a folder under src/elements and one import in elements/index.js.
 */
export function defineElement(def) {
  const keys = new Set();
  for (const p of allProps(def)) {
    if (keys.has(p.key)) throw new Error(`[${def.type}] duplicate property key "${p.key}"`);
    keys.add(p.key);
  }
  defs.set(def.type, def);
  return def;
}
export const getDefinition = (type) => defs.get(type);
export const listDefinitions = () => [...defs.values()];

export function uniqueTag(base, elements, selfId) {
  const taken = new Set(elements.filter((e) => e.id !== selfId).map((e) => e.props.tag));
  if (base && !taken.has(base)) return base;
  const stem = (base || '').replace(/\s+\d+$/, '') || 'Element';
  let n = 1;
  while (taken.has(`${stem} ${n}`)) n++;
  return `${stem} ${n}`;
}

export function createElementData(type, elements = [], overrides = {}) {
  const def = getDefinition(type);
  if (!def) throw new Error(`Unknown element type "${type}"`);
  const props = { ...defaultProps(def), ...structuredClone(overrides) };
  const requestedTag = overrides.tag ?? props.tag;
  if (requestedTag) props.tag = uniqueTag(requestedTag, elements);
  return { id: uid(type), type, locked: false, props };
}
