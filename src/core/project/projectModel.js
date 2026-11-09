import { getDefinition, uniqueTag } from '../schema/registry.js';
import { sanitizeProps } from '../schema/validate.js';
import { DEFAULT_SETTINGS } from '../store/defaultProject.js';
import { QUALITY } from '../render/quality.js';
import { clamp, isNum } from '../utils/math.js';
import { isValidColor } from '../utils/color.js';
import { uid } from '../utils/id.js';

export const FORMAT = 'auravis-project';
export const VERSION = 1;

export function serializeProject(state) {
  return {
    format: FORMAT, version: VERSION,
    name: state.project.name, savedAt: new Date().toISOString(),
    settings: state.project.settings,
    elements: state.elements.map((e) => ({ id: e.id, type: e.type, locked: e.locked, props: e.props })),
  };
}

export function sanitizeSettings(s = {}) {
  const d = DEFAULT_SETTINGS;
  return {
    width: isNum(s.width) ? clamp(Math.round(s.width), 240, 4096) : d.width,
    height: isNum(s.height) ? clamp(Math.round(s.height), 240, 4096) : d.height,
    background: isValidColor(s.background) ? s.background : d.background,
    quality: QUALITY[s.quality] ? s.quality : d.quality,
    fps: s.fps === 30 ? 30 : 60,
    adaptive: s.adaptive !== false,
    theme: ['dark','midnight','graphite','light'].includes(s.theme) ? s.theme : d.theme,
    effects: Object.fromEntries(Object.keys(d.effects).map((key) => [key, clamp(Math.round(Number(s.effects?.[key]) || 0), 0, 100)])),
  };
}

/**
 * Parses + validates a saved project. Unknown element types are skipped (reported), invalid property
 * values fall back to defaults, tags are made unique. Never throws on bad content, only on non-projects.
 */
export function deserializeProject(data) {
  if (!data || data.format !== FORMAT) throw new Error('This file is not an Auravis project.');
  if (!isNum(data.version) || data.version > VERSION) throw new Error('This project was saved by a newer version of Auravis.');
  const warnings = [];
  const elements = [];
  for (const raw of Array.isArray(data.elements) ? data.elements : []) {
    const def = getDefinition(raw?.type);
    if (!def) { warnings.push(`Skipped unknown element type "${raw?.type}"`); continue; }
    const { props, errors } = sanitizeProps(def, raw.props);
    props.tag = uniqueTag(props.tag || def.label, elements);
    warnings.push(...errors.map((m) => `${props.tag}: ${m}`));
    elements.push({ id: typeof raw.id === 'string' ? raw.id : uid(raw.type), type: raw.type, locked: !!raw.locked, props });
  }
  return { name: String(data.name || 'Imported Project').slice(0, 80), settings: sanitizeSettings(data.settings), elements, warnings };
}
