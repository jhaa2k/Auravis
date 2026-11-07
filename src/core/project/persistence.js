import { serializeProject, deserializeProject } from './projectModel.js';
import { assets } from '../assets/assetStore.js';
import { uid } from '../utils/id.js';

const INDEX = 'auravis.projects';
const SESSION = 'auravis.session';
const ls = () => (typeof localStorage === 'undefined' ? null : localStorage);
const read = (k, def) => { try { return JSON.parse(ls()?.getItem(k) ?? 'null') ?? def; } catch { return def; } };
const write = (k, v) => { try { ls()?.setItem(k, JSON.stringify(v)); return true; } catch { return false; } };

export const projectsApi = {
  list: () => read(INDEX, []).sort((a, b) => b.updatedAt.localeCompare(a.updatedAt)),
  save(state) {
    const id = state.project.id || uid('proj');
    const data = serializeProject(state);
    if (!write(`auravis.project.${id}`, data)) throw new Error('Could not save: browser storage is full.');
    const list = read(INDEX, []).filter((p) => p.id !== id);
    list.push({ id, name: data.name, updatedAt: data.savedAt });
    write(INDEX, list);
    return id;
  },
  load(id) {
    const data = read(`auravis.project.${id}`, null);
    if (!data) throw new Error('Project not found.');
    return { id, ...deserializeProject(data) };
  },
  duplicate(id) {
    const data = read(`auravis.project.${id}`, null);
    if (!data) throw new Error('Project not found.');
    const nid = uid('proj');
    data.name = `${data.name} copy`; data.savedAt = new Date().toISOString();
    write(`auravis.project.${nid}`, data);
    write(INDEX, [...read(INDEX, []), { id: nid, name: data.name, updatedAt: data.savedAt }]);
    return nid;
  },
  rename(id, name) {
    const data = read(`auravis.project.${id}`, null);
    if (!data) return;
    data.name = name; write(`auravis.project.${id}`, data);
    write(INDEX, read(INDEX, []).map((p) => (p.id === id ? { ...p, name } : p)));
  },
  remove(id) {
    ls()?.removeItem(`auravis.project.${id}`);
    write(INDEX, read(INDEX, []).filter((p) => p.id !== id));
  },
};

export const session = {
  save: (state) => write(SESSION, { ...serializeProject(state), projectId: state.project.id }),
  load() {
    const d = read(SESSION, null);
    if (!d) return null;
    try { return { id: d.projectId || null, ...deserializeProject(d) }; } catch { return null; }
  },
};

/** Export a standalone .json file; image/mask assets and imported fonts are embedded so it is portable. */
export async function exportProjectFile(state) {
  const data = serializeProject(state);
  const ids = new Set();
  for (const e of state.elements) {
    for (const k of ['customImage', 'maskImage']) if (e.props[k]) ids.add(e.props[k]);
    if (e.type === 'text') ids.add(`font:${e.props.typeFace}`);
  }
  data.assets = (await Promise.all([...ids].map((id) => assets.toDataUrl(id)))).filter(Boolean);
  return new Blob([JSON.stringify(data)], { type: 'application/json' });
}
export async function importProjectFile(file) {
  let data;
  try { data = JSON.parse(await file.text()); } catch { throw new Error('This file is not valid JSON.'); }
  const parsed = deserializeProject(data);
  for (const a of Array.isArray(data.assets) ? data.assets : []) {
    if (a && typeof a.data === 'string' && a.data.startsWith('data:') && typeof a.id === 'string') await assets.fromDataUrl(a).catch(() => parsed.warnings.push(`Could not restore asset ${a.name}`));
  }
  return parsed;
}
