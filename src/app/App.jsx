import { useEffect, useState } from 'react';
import { useApp } from './hooks.js';
import { actions, audio, store, toast } from './services.js';
import LayerList from '../ui/LayerList.jsx';
import PropertiesPanel from '../ui/PropertiesPanel.jsx';
import PreviewPanel from '../ui/PreviewPanel.jsx';
import TransportBar from '../ui/TransportBar.jsx';
import SettingsPanel from '../ui/SettingsPanel.jsx';
import ProjectDialog from '../ui/ProjectDialog.jsx';
import Toasts from '../ui/Toasts.jsx';
import Icon from '../ui/Icon.jsx';

const TABS = [['layers', 'Elements', 'bars'], ['props', 'Properties', 'settings'], ['project', 'Project', 'folder']];

export default function App() {
  const name = useApp((s) => s.project.name);
  const dirty = useApp((s) => s.dirty);
  const canUndo = useApp((s) => s.past.length > 0), canRedo = useApp((s) => s.future.length > 0);
  const [tab, setTab] = useState('layers');
  const [dialog, setDialog] = useState(false);

  useEffect(() => {
    const onKey = (e) => {
      const typing = /INPUT|TEXTAREA|SELECT/.test(document.activeElement?.tagName || '') && document.activeElement.type !== 'range' && document.activeElement.type !== 'checkbox';
      const mod = e.ctrlKey || e.metaKey;
      if (mod && e.key.toLowerCase() === 'z' && !typing) { e.preventDefault(); e.shiftKey ? actions.redo() : actions.undo(); }
      else if (mod && e.key.toLowerCase() === 'y' && !typing) { e.preventDefault(); actions.redo(); }
      else if (mod && e.key.toLowerCase() === 'd' && !typing) { e.preventDefault(); const id = store.getState().selectedId; id && actions.duplicateElement(id); }
      else if (e.code === 'Space' && !typing && document.activeElement?.tagName !== 'BUTTON') { e.preventDefault(); audio.snapshot.hasAudio ? audio.toggle() : audio.startDemo(); }
      else if ((e.key === 'Delete' || e.key === 'Backspace') && !typing) { const id = store.getState().selectedId; id && actions.deleteElement(id); }
    };
    window.addEventListener('keydown', onKey);
    const warn = (e) => { if (store.getState().dirty) { e.preventDefault(); e.returnValue = ''; } };
    window.addEventListener('beforeunload', warn);
    return () => { window.removeEventListener('keydown', onKey); window.removeEventListener('beforeunload', warn); };
  }, []);

  return (
    <div className="app">
      <header className="topbar">
        <div className="brand"><svg viewBox="0 0 64 64" width="26" height="26" aria-hidden="true"><rect width="64" height="64" rx="14" fill="#2a2926" /><path d="M14 40V24M24 50V14M34 38V26M44 46V18M52 38V26" stroke="#ff9a6b" strokeWidth="5" strokeLinecap="round" /></svg><span>Auravis</span></div>
        <button className="project-name" onClick={() => setDialog(true)} title="Open project manager">{name}{dirty ? ' •' : ''}</button>
        <div className="row-gap">
          <button className="icon-btn" title="Undo (Ctrl+Z)" disabled={!canUndo} onClick={() => actions.undo()}><Icon name="undo" /></button>
          <button className="icon-btn" title="Redo (Ctrl+Shift+Z)" disabled={!canRedo} onClick={() => actions.redo()}><Icon name="redo" /></button>
          <button className="btn small" onClick={() => setDialog(true)}><Icon name="folder" size={15} />Projects</button>
        </div>
      </header>
      <main className="workspace" data-tab={tab}>
        <section className="col-preview"><PreviewPanel /><TransportBar /></section>
        <nav className="tabs" role="tablist">{TABS.map(([k, label, icon]) => <button key={k} role="tab" aria-selected={tab === k} className={tab === k ? 'active' : ''} onClick={() => setTab(k)}><Icon name={icon} size={16} />{label}</button>)}</nav>
        <aside className="col-layers"><LayerList /></aside>
        <aside className="col-props"><PropertiesPanel /></aside>
        <aside className="col-project"><SettingsPanel /></aside>
      </main>
      {dialog && <ProjectDialog onClose={() => setDialog(false)} />}
      <Toasts />
    </div>
  );
}
