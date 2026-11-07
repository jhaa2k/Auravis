import Icon from '../Icon.jsx';

const same = (a, b) => JSON.stringify(a) === JSON.stringify(b);

/** Shared row chrome: label, hint tooltip, per-property reset-to-default. */
export default function Field({ def, value, onReset, children, wide, resetOnSlider = false }) {
  const changed = def.type !== 'action' && !same(value, def.default);
  return (
    <div className={`field ${wide ? 'wide' : ''}`}>
      <div className="field-head">
        <label title={def.hint || def.label}>{def.label}{def.unit ? <span className="unit"> ({def.unit})</span> : null}</label>
        {changed && !resetOnSlider && <button className="icon-btn tiny" onClick={onReset} title="Reset to default" aria-label={`Reset ${def.label}`}><Icon name="reset" size={13} /></button>}
      </div>
      <div className="field-body">{children}</div>
      {def.hint && <div className="hint">{def.hint}</div>}
    </div>
  );
}
