import { useState } from 'react';
import { useApp, useStore } from '../app/hooks.js';
import { actions, audio, diagStore, imageCache, toast, visualizer } from '../app/services.js';
import { getDefinition } from '../core/schema/registry.js';
import FieldRenderer from './fields/FieldRenderer.jsx';
import Icon from './Icon.jsx';

export function PositionControls({ element }) {
  const position = Array.isArray(element.props.position) ? element.props.position : [0, 0];
  const scale = Array.isArray(element.props.scale) ? element.props.scale : [1, 1];
  const rotation = Number(element.props.rotation) || 0;
  const anchorX = Number.isFinite(element.props.anchorX) ? element.props.anchorX : 0.5;
  const anchorY = Number.isFinite(element.props.anchorY) ? element.props.anchorY : 0.5;
  const [step, setStep] = useState(1);
  if (!Array.isArray(element.props.position)) return null;
  const locked = Boolean(element.locked);
  const update = (patch) => actions.updateProps(element.id, patch);
  const nudge = (dx, dy) => update({ position: [position[0] + dx * step, position[1] + dy * step] });
  const number = (value, patch, label, min, max, stepValue = 1) => (
    <label className="quick-number"><span>{label}</span><input type="number" value={value} min={min} max={max} step={stepValue} disabled={locked}
      onChange={(event) => { const next = Number(event.target.value); if (event.target.value !== '' && Number.isFinite(next)) update(patch(next)); }} /></label>
  );
  return (
    <section className="quick-position" aria-label="Move and adjust selected element">
      <div className="quick-position-head">
        <span><Icon name="move" size={16} />Move & Adjust</span>
        <small>{element.props.tag || element.type || 'Selected element'}{locked ? ' · Locked' : ' · Live controls'}</small>
      </div>
      <div className="quick-position-layout">
        <div className="quick-position-values">
          <div className="position-fields">
            {number(position[0], (v) => ({ position: [v, position[1]] }), 'X · Center 0', -4000, 4000)}
            {number(position[1], (v) => ({ position: [position[0], v] }), 'Y · Center 0', -4000, 4000)}
            {Object.prototype.hasOwnProperty.call(element.props, 'rotation') && number(rotation, (v) => ({ rotation: v }), 'Rotation', -720, 720, 0.1)}
          </div>
          <div className="position-adjustments">
            {number(scale[0], (v) => ({ scale: [Math.max(0.01, v), scale[1]] }), 'Width', 0.01, 12, 0.01)}
            {number(scale[1], (v) => ({ scale: [scale[0], Math.max(0.01, v)] }), 'Height', 0.01, 12, 0.01)}
          </div>
          <div className="position-step" aria-label="Movement step">
            <button type="button" className={step === 1 ? 'active' : ''} aria-pressed={step === 1} disabled={locked} onClick={() => setStep(1)}>1 px</button>
            <button type="button" className={step === 10 ? 'active' : ''} aria-pressed={step === 10} disabled={locked} onClick={() => setStep(10)}>10 px</button>
          </div>
          <div className="center-point-control">
            <span>Center Point</span>
            <div className="center-point-grid" role="group" aria-label="Set element anchor point">
              {[0, 0.5, 1].map((y) => [0, 0.5, 1].map((x) => (
                <button key={`${x}-${y}`} type="button" disabled={locked}
                  className={Math.abs(anchorX - x) < 0.001 && Math.abs(anchorY - y) < 0.001 ? 'active' : ''}
                  aria-label={`Anchor ${x * 100}% horizontal, ${y * 100}% vertical`}
                  aria-pressed={Math.abs(anchorX - x) < 0.001 && Math.abs(anchorY - y) < 0.001}
                  onClick={() => update({ anchorX: x, anchorY: y })}>
                  <i />
                </button>
              )))}
            </div>
            <small>{anchorX.toFixed(2)} · {anchorY.toFixed(2)}</small>
          </div>
        </div>
        <div className="position-direction">
          <div className="position-pad" aria-label="Nudge position">
            <button type="button" title={"Move up " + step + " px"} disabled={locked} onClick={() => nudge(0, -1)}><Icon name="chevron-up" size={18} /></button>
            <button type="button" title={"Move left " + step + " px"} disabled={locked} onClick={() => nudge(-1, 0)}><Icon name="chevron-left" size={18} /></button>
            <span aria-hidden="true"><Icon name="move" size={14} /></span>
            <button type="button" title={"Move right " + step + " px"} disabled={locked} onClick={() => nudge(1, 0)}><Icon name="chevron-right" size={18} /></button>
            <button type="button" title={"Move down " + step + " px"} disabled={locked} onClick={() => nudge(0, 1)}><Icon name="chevron-down" size={18} /></button>
          </div>
        </div>
      </div>
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
  const [openSection, setOpenSection] = useState(null);
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
      {def.sections.map((section) => {
        const sectionKey = `${el.type}:${section.name}`;
        return (
        <Section key={section.name} section={section} open={openSection === sectionKey} onToggle={() => setOpenSection((current) => current === sectionKey ? null : sectionKey)}>
          {section.props.map((p) => (
            <FieldRenderer key={p.key} def={p} el={el} elements={elements} onChange={onChange} onReset={(k) => actions.resetProps(el.id, [k])} onAction={onAction} />
          ))}
        </Section>
        );
      })}
    </div>
  );
}
