import { useEffect, useState } from 'react';
import { useApp } from './hooks.js';
import { actions, audio, store, toast } from './services.js';
import LayerList from '../ui/LayerList.jsx';
import MusicPanel from '../ui/MusicPanel.jsx';
import PropertiesPanel, { PositionControls } from '../ui/PropertiesPanel.jsx';
import PreviewPanel from '../ui/PreviewPanel.jsx';
import SettingsPanel from '../ui/SettingsPanel.jsx';
import PresetPanel from '../ui/PresetPanel.jsx';
import { importProjectFile } from '../core/project/persistence.js';
import ProjectDialog from '../ui/ProjectDialog.jsx';
import Toasts from '../ui/Toasts.jsx';
import Icon from '../ui/Icon.jsx';

const TOOLS = [['music', 'Music', 'music'], ['layers', 'Elements', 'layers'], ['props', 'Properties', 'sliders'], ['presets', 'Presets', 'grid'], ['project', 'Settings', 'settings']];
const DEFAULT_PREFERENCES = { theme: 'dark', guides: true, safeArea: false, snap: false };
function readPreferences() {
  try {
    const saved = JSON.parse(localStorage.getItem('auravis.preferences') || 'null');
    return {
      theme: saved?.theme === 'light' ? 'light' : 'dark',
      guides: typeof saved?.guides === 'boolean' ? saved.guides : DEFAULT_PREFERENCES.guides,
      safeArea: typeof saved?.safeArea === 'boolean' ? saved.safeArea : DEFAULT_PREFERENCES.safeArea,
      snap: typeof saved?.snap === 'boolean' ? saved.snap : DEFAULT_PREFERENCES.snap,
    };
  } catch {
    return { ...DEFAULT_PREFERENCES };
  }
}

export default function App() {
  const name = useApp((s) => s.project.name);
  const dirty = useApp((s) => s.dirty);
  const selectedElement = useApp((s) => s.elements.find((e) => e.id === s.selectedId) || null);
  const canUndo = useApp((s) => s.past.length > 0), canRedo = useApp((s) => s.future.length > 0);
  const [tool, setTool] = useState('music');
  const [dialog, setDialog] = useState(false);
  const [preferences, setPreferences] = useState(readPreferences);
  const updatePreferences = (patch) => setPreferences((current) => {
    const next = { ...current, ...patch };
    try { localStorage.setItem('auravis.preferences', JSON.stringify(next)); }
    catch (error) { console.error('Could not save app preferences:', error); }
    return next;
  });

  useEffect(() => {
    const onNotificationPermissionDenied = () => toast('Media notification permission is off. Enable it in Android Settings → Apps → Auravis → Notifications.', 'warning');
    const onPlaybackError = (event) => toast(event.detail?.message || 'Could not play this audio file.', 'error');
    const onImportProject = async (event) => {
      try {
        const file = event.detail?.file;
        if (!file) return;
        if (file.name.toLowerCase().endsWith('.viz')) throw new Error('Avee .viz files use a proprietary scene package. Please share one sample .viz file so its scene structure can be mapped safely; this importer will not discard layers or settings.');
        const p = await importProjectFile(file);
        actions.loadProject({ id: null, name: p.name, version: 1, settings: p.settings }, p.elements);
        toast(p.warnings.length ? `Imported with ${p.warnings.length} repaired value(s)` : `Imported “${p.name}”`, p.warnings.length ? 'warning' : 'info');
        setTool('music');
      } catch (error) { toast(error.message || 'Could not import this project.', 'error'); }
    };
    window.addEventListener('auravis:import-project-file', onImportProject);
    window.addEventListener('auravis:notification-permission-denied', onNotificationPermissionDenied);
    window.addEventListener('auravis:playback-error', onPlaybackError);
    const onKey = (e) => {
      const typing = /INPUT|TEXTAREA|SELECT/.test(document.activeElement?.tagName || '') && document.activeElement.type !== 'range' && document.activeElement.type !== 'checkbox';
      const mod = e.ctrlKey || e.metaKey;
      if (e.key === 'Escape' && tool !== 'music') { setTool('music'); }
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
      window.removeEventListener('auravis:import-project-file', onImportProject);
      window.removeEventListener('auravis:playback-error', onPlaybackError);
    };
  }, [tool]);

  return (
    <div className="app android-app" data-theme={preferences.theme} onContextMenu={(event) => event.preventDefault()}>
      <header className="topbar">
        <div className="brand"><svg viewBox="0 0 64 64" width="26" height="26" aria-hidden="true"><rect width="64" height="64" rx="14" fill="#2a2926" /><path d="M14 40V24M24 50V14M34 38V26M44 46V18M52 38V26" stroke="#f5f5f5" strokeWidth="5" strokeLinecap="round" /></svg><span>Auravis</span></div>
        <button className="project-name" onClick={() => setDialog(true)} title="Open project manager">{name}{dirty ? ' •' : ''}</button>
        <div className="row-gap">
          <button className="icon-btn" title="Undo (Ctrl+Z)" disabled={!canUndo} onClick={() => actions.undo()}><Icon name="undo" /></button>
          <button className="icon-btn" title="Redo (Ctrl+Shift+Z)" disabled={!canRedo} onClick={() => actions.redo()}><Icon name="redo" /></button>
          <button className="btn small export-btn" onClick={() => setTool('export')}><Icon name="download" size={15} />Export</button>
        </div>
      </header>
      <main className={`workspace android-workspace ${!tool && !selectedElement ? "compact" : "expanded"}`}>
        <section className="col-preview" aria-label="Fixed preview">
          <PreviewPanel preferences={preferences} />
        </section>
        <section className={`tool-dock ${tool ? 'open' : selectedElement ? 'quick' : 'closed'}`} aria-label="Editor tools">
          <div id="active-tool-panel" className={`tool-panel ${tool ? 'open' : 'closed'}`} aria-hidden={!tool}>
            {<PositionControls element={selectedElement} />}
            {tool && (
              <>
                <header className="tool-panel-head">
                  <strong><Icon name={TOOLS.find(([key]) => key === tool)?.[2] || 'download'} size={16} />{TOOLS.find(([key]) => key === tool)?.[1] || 'Export'}</strong>
                </header>
                <div className={`tool-panel-content ${tool === 'music' ? 'music-tool-content' : ''}`}>
                  {tool === 'music' && <MusicPanel />}
                  {tool === 'layers' && <LayerList />}
                  {tool === 'props' && <PropertiesPanel />}
                  {tool === 'presets' && <PresetPanel />}
                  {tool === 'project' && <SettingsPanel mode="settings" preferences={preferences} onPreferencesChange={updatePreferences} />}
                  {tool === 'export' && <SettingsPanel mode="export" />}
                </div>
              </>
            )}
          </div>
          <nav className="tool-bar" aria-label="Editor tools">
            {TOOLS.map(([key, label, icon]) => (
              <button key={key} className={`tool-button ${tool === key ? 'active' : ''}`}
                aria-expanded={tool === key} aria-controls="active-tool-panel"
                onClick={() => setTool(key)}>
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
