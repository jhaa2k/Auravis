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

const TOOLS = [['layers', 'Elements', 'bars'], ['props', 'Properties', 'settings'], ['project', 'Settings', 'settings']];

export default function App() {
  const name = useApp((s) => s.project.name);
  const dirty = useApp((s) => s.dirty);
  const canUndo = useApp((s) => s.past.length > 0), canRedo = useApp((s) => s.future.length > 0);
  const [tool, setTool] = useState(null);
  const [dialog, setDialog] = useState(false);

  useEffect(() => {
    const onNotificationPermissionDenied = () => toast('Media notification permission is off. Enable it in Android Settings → Apps → Auravis → Notifications.', 'warning');
    const onPlaybackError = (event) => toast(event.detail?.message || 'Could not play this audio file.', 'error');
    window.addEventListener('auravis:notification-permission-denied', onNotificationPermissionDenied);
    window.addEventListener('auravis:playback-error', onPlaybackError);
    const onKey = (e) => {
      const typing = /INPUT|TEXTAREA|SELECT/.test(document.activeElement?.tagName || '') && document.activeElement.type !== 'range' && document.activeElement.type !== 'checkbox';
      const mod = e.ctrlKey || e.metaKey;
      if (e.key === 'Escape' && tool) { setTool(null); }
      else if (mod && e.key.toLowerCase() === 'z' && !typing) { e.preventDefault(); e.shiftKey ? actions.redo() : actions.undo(); }
      else if (mod && e.key.toLowerCase() === 'y' && !typing) { e.preventDefault(); actions.redo(); }
      else if (mod && e.key.toLowerCase() === 'd' && !typing) { e.preventDefault(); const id = store.getState().selectedId; id && actions.duplicateElement(id); }
      else if (e.code === 'Space' && !typing && document.activeElement?.tagName !== 'BUTTON') { e.preventDefault(); audio.toggle(); }
      else if ((e.key === 'Delete' || e.key === 'Backspace') && !typing) { const id = store.getState().selectedId; id && actions.deleteElement(id); }
    };
    window.addEventListener('keydown', onKey);
    const warn = (e) => { if (store.getState().dirty) { e.preventDefault(); e.returnValue = ''; } };
    window.addEventListener('beforeunload', warn);
    return () => {
      window.removeEventListener('keydown', onKey);
      window.removeEventListener('beforeunload', warn);
      window.removeEventListener('auravis:notification-permission-denied', onNotificationPermissionDenied);
      window.removeEventListener('auravis:playback-error', onPlaybackError);
    };
  }, [tool]);

  return (
    <div className="app android-app" onContextMenu={(event) => event.preventDefault()}>
      <header className="topbar">
        <div className="brand"><svg viewBox="0 0 64 64" width="26" height="26" aria-hidden="true"><rect width="64" height="64" rx="14" fill="#2a2926" /><path d="M14 40V24M24 50V14M34 38V26M44 46V18M52 38V26" stroke="#ff9a6b" strokeWidth="5" strokeLinecap="round" /></svg><span>Auravis</span></div>
        <button className="project-name" onClick={() => setDialog(true)} title="Open project manager">{name}{dirty ? ' •' : ''}</button>
        <div className="row-gap">
          <button className="icon-btn" title="Undo (Ctrl+Z)" disabled={!canUndo} onClick={() => actions.undo()}><Icon name="undo" /></button>
          <button className="icon-btn" title="Redo (Ctrl+Shift+Z)" disabled={!canRedo} onClick={() => actions.redo()}><Icon name="redo" /></button>
          <button className="btn small export-btn" onClick={() => setTool('project')}><Icon name="download" size={15} />Export</button>
        </div>
      </header>
      <main className="workspace android-workspace">
        <section className="col-preview" aria-label="Fixed preview">
          <PreviewPanel onOpenSettings={() => setTool('project')} />
          <TransportBar />
        </section>
        <section className={`tool-dock ${tool ? 'open' : ''}`} aria-label="Editor tools">
          <div id="active-tool-panel" className={`tool-panel ${tool ? 'open' : ''}`} aria-hidden={!tool}>
            {tool && (
              <>
                <header className="tool-panel-head">
                  <strong><Icon name={TOOLS.find(([key]) => key === tool)?.[2]} size={16} />{TOOLS.find(([key]) => key === tool)?.[1]}</strong>
                  <button className="btn small ghost" onClick={() => setTool(null)}><Icon name="close" size={14} />Cancel</button>
                </header>
                <div className="tool-panel-content">
                  {tool === 'layers' && <LayerList />}
                  {tool === 'props' && <PropertiesPanel />}
                  <div hidden={tool !== 'project'}><SettingsPanel /></div>
                </div>
              </>
            )}
          </div>
          <nav className="tool-bar" aria-label="Editor tools">
            {TOOLS.map(([key, label, icon]) => (
              <button key={key} className={`tool-button ${tool === key ? 'active' : ''}`}
                aria-expanded={tool === key} aria-controls="active-tool-panel"
                onClick={() => setTool((current) => current === key ? null : key)}>
                <Icon name={icon} size={19} /><span>{label}</span>
              </button>
            ))}
          </nav>
        </section>
      </main>
      {dialog && <ProjectDialog onClose={() => setDialog(false)} />}
      <Toasts />
    </div>
  );
}
