import { useRef, useState } from 'react';
import { useApp } from '../app/hooks.js';
import { actions, store, toast } from '../app/services.js';
import { projectsApi, exportProjectFile, importProjectFile } from '../core/project/persistence.js';
import { imageCache } from '../core/assets/imageCache.js';
import Icon from './Icon.jsx';

export function download(blob, name) {
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob); a.download = name; a.click();
  setTimeout(() => URL.revokeObjectURL(a.href), 2000);
}
const safe = (n) => n.replace(/[^\w\- ]+/g, '').trim() || 'project';

export default function ProjectDialog({ onClose }) {
  const project = useApp((s) => s.project);
  const dirty = useApp((s) => s.dirty);
  const [list, setList] = useState(projectsApi.list());
  const file = useRef(null);
  const refresh = () => setList(projectsApi.list());
  const guard = (fn) => async (...a) => { try { await fn(...a); } catch (e) { toast(e.message, 'error'); } };

  const save = guard(() => { const id = projectsApi.save(store.getState()); actions.markSaved(id); refresh(); toast('Project saved'); });
  const saveAs = guard(() => {
    const st = store.getState();
    const id = projectsApi.save({ ...st, project: { ...st.project, id: null } });
    actions.markSaved(id); refresh(); toast('Saved as a new project');
  });
  const load = guard((id) => {
    if (dirty && !confirm('You have unsaved changes. Load another project anyway?')) return;
    const p = projectsApi.load(id);
    actions.loadProject({ id, name: p.name, version: 1, settings: p.settings }, p.elements);
    p.elements.forEach((e) => { ['customImage', 'maskImage'].forEach((k) => e.props[k] && imageCache.invalidate(e.props[k])); });
    if (p.warnings.length) toast(`Loaded with ${p.warnings.length} repaired value(s)`, 'warning'); else toast(`Loaded “${p.name}”`);
    onClose();
  });
  const exportFile = guard(async () => download(await exportProjectFile(store.getState()), `${safe(project.name)}.auravis.json`));
  const importFile = guard(async (f) => {
    const p = await importProjectFile(f);
    actions.loadProject({ id: null, name: p.name, version: 1, settings: p.settings }, p.elements);
    toast(p.warnings.length ? `Imported with ${p.warnings.length} repaired value(s)` : `Imported “${p.name}”`, p.warnings.length ? 'warning' : 'info');
    onClose();
  });

  return (
    <div className="modal-wrap" role="dialog" aria-modal="true" aria-label="Projects">
      <div className="scrim dark" onClick={onClose} />
      <div className="modal">
        <header><h2>Projects</h2><button className="icon-btn" onClick={onClose} aria-label="Close"><Icon name="close" /></button></header>
        <div className="modal-actions">
          <input className="name-input" value={project.name} onChange={(e) => actions.rename(e.target.value)} aria-label="Project name" />
          <button className="btn primary" onClick={save}><Icon name="save" size={15} />Save</button>
          <button className="btn" onClick={saveAs}>Save as new</button>
        </div>
        <ul className="proj-list">
          {list.length === 0 && <li className="empty">No saved projects yet.</li>}
          {list.map((p) => (
            <li key={p.id} className={p.id === project.id ? 'current' : ''}>
              <div><b>{p.name}</b><small>{new Date(p.updatedAt).toLocaleString()}</small></div>
              <div className="row-gap">
                <button className="btn small" onClick={() => load(p.id)}>Load</button>
                <button className="icon-btn" title="Duplicate" onClick={() => { projectsApi.duplicate(p.id); refresh(); }}><Icon name="copy" /></button>
                <button className="icon-btn" title="Rename" onClick={() => { const n = prompt('Rename project', p.name); if (n) { projectsApi.rename(p.id, n.slice(0, 80)); refresh(); } }}><Icon name="text" /></button>
                <button className="icon-btn danger" title="Delete" onClick={() => { if (confirm(`Delete “${p.name}”?`)) { projectsApi.remove(p.id); refresh(); } }}><Icon name="trash" /></button>
              </div>
            </li>
          ))}
        </ul>
        <footer>
          <button className="btn" onClick={exportFile}><Icon name="download" size={15} />Export file</button>
          <button className="btn" onClick={() => file.current.click()}><Icon name="upload" size={15} />Import file</button>
          <input ref={file} type="file" accept=".json,application/json" hidden onChange={(e) => { if (e.target.files[0]) importFile(e.target.files[0]); e.target.value = ''; }} />
          <button className="btn ghost danger" onClick={() => { if (confirm('Reset to the default project? Unsaved work is lost.')) { actions.resetProject(); onClose(); } }}>New / reset</button>
        </footer>
      </div>
    </div>
  );
}
