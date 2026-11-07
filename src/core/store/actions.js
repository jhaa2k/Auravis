import { createElementData, getDefinition, uniqueTag } from '../schema/registry.js';
import { propMap, sanitizeValue, sanitizeProps } from '../schema/validate.js';
import { uid } from '../utils/id.js';
import { defaultElements, defaultProjectState, DEFAULT_SETTINGS } from './defaultProject.js';

const LIMIT = 100;
const snap = (s) => ({ elements: s.elements, selectedId: s.selectedId, settings: s.project.settings });

/**
 * All state changes go through here (undo/redo, validation, unique tags). The UI and the renderer only
 * read the store; nothing mutates elements in place, so history is cheap (structural sharing).
 */
export function createActions(store) {
  const commit = (fn, key) => store.setState((s) => {
    const next = fn(s);
    if (!next || next === s) return s;
    const now = Date.now();
    const merge = key && s.lastKey === key && now - s.lastTime < 700;
    return { ...next, past: merge ? s.past : [...s.past.slice(-(LIMIT - 1)), snap(s)], future: [], lastKey: key || null, lastTime: now, dirty: true };
  });
  const setEls = (s, elements, extra = {}) => ({ ...s, elements, ...extra });
  const mapEl = (s, id, fn) => setEls(s, s.elements.map((e) => (e.id === id ? fn(e) : e)));

  const api = {
    select: (id) => store.setState((s) => (s.selectedId === id ? s : { ...s, selectedId: id })),

    addElement(type) {
      let created;
      commit((s) => { created = createElementData(type, s.elements); return setEls(s, [...s.elements, created], { selectedId: created.id }); });
      return created;
    },
    duplicateElement(id) {
      commit((s) => {
        const src = s.elements.find((e) => e.id === id);
        if (!src) return s;
        const copy = { ...structuredClone(src), id: uid(src.type) };
        copy.props.tag = uniqueTag(src.props.tag, s.elements);
        const i = s.elements.indexOf(src);
        const els = [...s.elements]; els.splice(i + 1, 0, copy);
        return setEls(s, els, { selectedId: copy.id });
      });
    },
    deleteElement: (id) => commit((s) => {
      const i = s.elements.findIndex((e) => e.id === id);
      if (i < 0) return s;
      const els = s.elements.filter((e) => e.id !== id);
      return setEls(s, els, { selectedId: s.selectedId === id ? els[Math.min(i, els.length - 1)]?.id ?? null : s.selectedId });
    }),
    moveElement: (id, dir) => commit((s) => {
      const i = s.elements.findIndex((e) => e.id === id), j = i + dir;
      if (i < 0 || j < 0 || j >= s.elements.length) return s;
      const els = [...s.elements]; [els[i], els[j]] = [els[j], els[i]];
      return setEls(s, els);
    }),
    reorderElement: (from, to) => commit((s) => {
      if (from === to || from < 0 || to < 0 || from >= s.elements.length || to >= s.elements.length) return s;
      const els = [...s.elements]; els.splice(to, 0, els.splice(from, 1)[0]);
      return setEls(s, els);
    }),
    setLocked: (id, locked) => commit((s) => mapEl(s, id, (e) => ({ ...e, locked }))),
    setVisible: (id, visible) => api.updateProps(id, { visible }),

    /** Validated property update. `coalesce` merges rapid edits (slider drags) into one undo step. */
    updateProps(id, patch, coalesce) {
      const errors = [];
      commit((s) => {
        const el = s.elements.find((e) => e.id === id);
        if (!el) return s;
        const map = propMap(getDefinition(el.type));
        const props = { ...el.props };
        for (const [k, v] of Object.entries(patch)) {
          const def = map[k];
          if (!def) continue;
          const r = sanitizeValue(def, v);
          props[k] = r.value;
          if (r.error) errors.push(r.error);
        }
        props.tag = uniqueTag(props.tag?.trim() || getDefinition(el.type).label, s.elements, id);
        return mapEl(s, id, (e) => ({ ...e, props }));
      }, coalesce ? `${id}:${coalesce}` : null);
      return errors;
    },
    resetProps(id, keys) {
      commit((s) => {
        const el = s.elements.find((e) => e.id === id);
        if (!el) return s;
        const map = propMap(getDefinition(el.type)), props = { ...el.props };
        for (const k of keys || Object.keys(map)) if (k !== 'tag' && map[k]) props[k] = structuredClone(map[k].default);
        return mapEl(s, id, (e) => ({ ...e, props }));
      });
    },

    setSettings: (patch) => commit((s) => ({ ...s, project: { ...s.project, settings: { ...s.project.settings, ...patch } } }), 'settings'),
    rename: (name) => store.setState((s) => ({ ...s, project: { ...s.project, name: name.slice(0, 80) || 'Untitled Project' }, dirty: true })),

    undo: () => store.setState((s) => {
      const prev = s.past[s.past.length - 1];
      if (!prev) return s;
      return { ...s, elements: prev.elements, selectedId: prev.selectedId, project: { ...s.project, settings: prev.settings }, past: s.past.slice(0, -1), future: [snap(s), ...s.future], lastKey: null };
    }),
    redo: () => store.setState((s) => {
      const nxt = s.future[0];
      if (!nxt) return s;
      return { ...s, elements: nxt.elements, selectedId: nxt.selectedId, project: { ...s.project, settings: nxt.settings }, past: [...s.past, snap(s)], future: s.future.slice(1), lastKey: null };
    }),

    /** Replaces the whole project (load / import / reset). Clears undo history. */
    loadProject: (project, elements) => store.setState((s) => ({
      ...s, project, elements, selectedId: elements[0]?.id ?? null, past: [], future: [], lastKey: null, dirty: false,
    })),
    resetProject: () => store.setState(() => defaultProjectState()),
    markSaved: (id) => store.setState((s) => ({ ...s, project: { ...s.project, id: id ?? s.project.id }, dirty: false })),
    sanitizeAll(elements) {
      return elements.map((e) => {
        const def = getDefinition(e.type);
        if (!def) return null;
        return { id: e.id || uid(e.type), type: e.type, locked: !!e.locked, props: sanitizeProps(def, e.props).props };
      }).filter(Boolean);
    },
  };
  return api;
}
export { defaultElements, DEFAULT_SETTINGS };
