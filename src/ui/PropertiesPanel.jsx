import { useState } from 'react';
import { useApp, useStore } from '../app/hooks.js';
import { actions, audio, diagStore, imageCache, toast, visualizer } from '../app/services.js';
import { getDefinition } from '../core/schema/registry.js';
import FieldRenderer from './fields/FieldRenderer.jsx';
import Icon from './Icon.jsx';

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
  const [closed, setClosed] = useState({});
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
      {problems.length > 0 && (
        <ul className="problems" aria-label="Problems">
          {problems.map((p, i) => <li key={i} className={p.level}><Icon name={p.level === 'error' ? 'error' : p.level === 'warning' ? 'warn' : 'info'} size={15} />{p.message}</li>)}
        </ul>
      )}
      {def.sections.map((section, i) => (
        <Section key={section.name} section={section} open={!closed[key(i)] && (closed[key(i)] === false || i < 2)} onToggle={() => setClosed((c) => ({ ...c, [key(i)]: c[key(i)] === undefined ? (i < 2) : !c[key(i)] }))}>
          {section.props.map((p) => (
            <FieldRenderer key={p.key} def={p} el={el} elements={elements} onChange={onChange} onReset={(k) => actions.resetProps(el.id, [k])} onAction={onAction} />
          ))}
        </Section>
      ))}
    </div>
  );
}
