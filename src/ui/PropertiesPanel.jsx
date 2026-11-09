import { useState } from 'react';
import { useApp, useStore } from '../app/hooks.js';
import { actions, audio, diagStore, imageCache, toast, visualizer } from '../app/services.js';
import { getDefinition } from '../core/schema/registry.js';
import FieldRenderer from './fields/FieldRenderer.jsx';
import Icon from './Icon.jsx';

function PositionControls({ element }) {
  const position = Array.isArray(element.props.position) ? element.props.position : null;
  if (!position) return null;
  const update = (x, y) => actions.updateProps(element.id, { position: [x, y] });
  const nudge = (dx, dy) => update(position[0] + dx, position[1] + dy);
  return (
    <section className="quick-position" aria-label="Move selected element">
      <div className="quick-position-head"><span><Icon name="move" size={14} />Position</span><small>Precise canvas placement</small></div>
      <div className="position-fields">
        <label><span>X</span><input type="number" step="1" value={position[0]} onChange={(e) => update(Number(e.target.value) || 0, position[1])} /></label>
        <label><span>Y</span><input type="number" step="1" value={position[1]} onChange={(e) => update(position[0], Number(e.target.value) || 0)} /></label>
      </div>
      <div className="position-pad" aria-label="Nudge position">
        <button type="button" title="Move up 1 px" onClick={() => nudge(0, -1)}><Icon name="chevron-up" size={15} /></button>
        <button type="button" title="Move left 1 px" onClick={() => nudge(-1, 0)}><Icon name="chevron-left" size={15} /></button>
        <button type="button" title="Move right 1 px" onClick={() => nudge(1, 0)}><Icon name="chevron-right" size={15} /></button>
        <button type="button" title="Move down 1 px" onClick={() => nudge(0, 1)}><Icon name="chevron-down" size={15} /></button>
      </div>
      <div className="position-step"><button type="button" onClick={() => nudge(0, -10)}>↑ 10</button><button type="button" onClick={() => nudge(-10, 0)}>← 10</button><button type="button" onClick={() => nudge(10, 0)}>10 →</button><button type="button" onClick={() => nudge(0, 10)}>10 ↓</button></div>
    </section>
  );
}

function Section({ section, open, onToggle, children }) {
  return (
    <section className={`section ${open ? 'open' : ''}`}>
      <button className="section-head" onClick={onToggle} aria-expanded={open}><Icon name="chevron" size={14} />{section.name}</button>
      {open && <div className="section-body">{children}</div>}
    </section>
  );
}

export default function PropertiesPanel() {
  const elements = useApp((s) => s.elements);
  const selectedId = useApp((s) => s.selectedId);
  const diags = useStore(diagStore);
  const [openSections, setOpenSections] = useState({});
  const el = elements.find((e) => e.id === selectedId);
  if (!el) return <div className="empty">Select an element to edit its properties.</div>;
  const def = getDefinition(el.type);
  const problems = diags[el.id] || [];

  const onChange = (key, value, coalesce) => {
    const errs = actions.updateProps(el.id, { [key]: value }, coalesce);
    if (errs.length && !coalesce) toast(errs[0], 'warning');
  };
  const onAction = (key) => {
    const patch = def.actions?.[key]?.(el, { images: imageCache, meta: audio.meta, cache: visualizer.rc.cache });
    if (!patch) return;
    if (patch._error) return toast(patch._error, 'warning');
    actions.updateProps(el.id, patch);
  };
  const key = (i) => `${el.type}:${i}`;
  return (
    <div className="props">
      <header className="props-head">
        <span className="type-badge"><Icon name={def.icon} size={16} />{def.label}</span>
        <button className="btn small ghost" onClick={() => { actions.resetProps(el.id); toast(`${el.props.tag} reset to defaults`); }}><Icon name="reset" size={14} />Reset all</button>
      </header>
      <PositionControls element={el} />
      {problems.length > 0 && (
        <ul className="problems" aria-label="Problems">
          {problems.map((p, i) => <li key={i} className={p.level}><Icon name={p.level === 'error' ? 'error' : p.level === 'warning' ? 'warn' : 'info'} size={15} />{p.message}</li>)}
        </ul>
      )}
      {def.sections.map((section, i) => (
        <Section key={section.name} section={section} open={Boolean(openSections[key(i)])} onToggle={() => setOpenSections((current) => ({ ...current, [key(i)]: !current[key(i)] }))}>
          {section.props.map((p) => (
            <FieldRenderer key={p.key} def={p} el={el} elements={elements} onChange={onChange} onReset={(k) => actions.resetProps(el.id, [k])} onAction={onAction} />
          ))}
        </Section>
      ))}
    </div>
  );
}
