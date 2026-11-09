import Field from './Field.jsx';
import { NumberInput, Slider, Toggle, ColorInput } from './primitives.jsx';
import MeasureField from './MeasureField.jsx';
import ImageField from './ImageField.jsx';
import FontField from './FontField.jsx';
import { fontStore } from '../../core/assets/fontStore.js';

/** Options for selects whose choices depend on the project (effect targets, fonts). */
function optionsFor(def, el, elements) {
  if (def.dynamic === 'targets') {
    const list = [{ value: 'composition', label: 'Composition Below' }, ...elements.filter((e) => e.id !== el.id && e.type !== 'audioProvider').map((e) => ({ value: e.id, label: e.props.tag }))];
    if (!list.some((o) => o.value === el.props[def.key])) list.push({ value: el.props[def.key], label: 'Missing target' });
    return list;
  }
  if (def.dynamic === 'fonts') return fontStore.families().map((f) => ({ value: f, label: f }));
  return def.options;
}

export default function FieldRenderer({ def, el, elements, onChange, onReset, onAction }) {
  const value = el.props[def.key];
  const providers = elements.filter((e) => e.type === 'audioProvider');
  const set = (v, co = true) => onChange(def.key, v, co ? def.key : undefined);
  const row = (children, wide, resetOnSlider = false) => <Field def={def} value={value} onReset={() => onReset(def.key)} wide={wide} resetOnSlider={resetOnSlider}>{children}</Field>;

  switch (def.type) {
    case 'number':
    case 'int':
      if (def.dynamic === 'providers') {
        return row(providers.length ? (
          <select value={value} onChange={(e) => set(+e.target.value, false)}>
            {providers.map((p, i) => <option key={p.id} value={i + 1}>{i + 1} · {p.props.tag}</option>)}
            {value > providers.length && <option value={value}>{value} · missing</option>}
          </select>
        ) : <span className="warn-text">No Audio Provider in the project</span>);
      }
      if (def.displayMultiplier) {
        const m = def.displayMultiplier;
        return row(<div className="num-row"><Slider value={value * m} min={def.min * m} max={def.max * m} step={def.step * m} resetValue={def.default * m} onReset={() => onReset(def.key)} onChange={(v) => set(v / m)} /><NumberInput value={value * m} min={def.min * m} max={def.max * m} step={def.step * m} onChange={(v) => set(v / m)} /></div>, false, true);
      }
      return row(<div className="num-row"><Slider value={value} min={def.min} max={def.max} step={def.step} resetValue={def.default} onReset={() => onReset(def.key)} onChange={set} /><NumberInput value={value} min={def.min} max={def.max} step={def.step} onChange={set} /></div>, false, true);
    case 'bool': return row(<Toggle checked={value} onChange={(v) => set(v, false)} label={def.label} />);
    case 'select':
      if (def.dynamic === 'fonts') return row(<FontField value={value} onChange={(v) => set(v, false)} sample={el.props.text?.split('\n')[0]?.slice(0, 24)} />, true);
      return row(
        <select value={String(value)} onChange={(e) => { const o = optionsFor(def, el, elements).find((x) => String(x.value) === e.target.value); set(o ? o.value : e.target.value, false); }}>
          {optionsFor(def, el, elements).map((o) => <option key={String(o.value)} value={String(o.value)}>{o.label}</option>)}
        </select>);
    case 'color': return row(<ColorInput value={value} resetValue={def.default} onChange={set} />, false, true);
    case 'text': return row(<input type="text" value={value} maxLength={def.maxLength} onChange={(e) => set(e.target.value)} placeholder={def.key === 'tag' ? 'Unique name' : ''} />);
    case 'textarea': return row(<textarea rows={def.key === 'text' ? 2 : 3} value={value} maxLength={def.maxLength} spellCheck={false} onChange={(e) => set(e.target.value)} />, true);
    case 'vec2': {
      const uniform = def.uniformKey && el.props[def.uniformKey];
      return row(uniform ? (
        <div className="num-row"><Slider value={value[0]} min={def.min} max={Math.min(def.max, 6)} step={def.step} resetValue={def.default[0]} onReset={() => onReset(def.key)} onChange={(v) => set([v, v])} /><NumberInput value={value[0]} min={def.min} max={def.max} step={def.step} onChange={(v) => set([v, v])} /></div>
      ) : (
        <div className="vec2"><span>X</span><NumberInput value={value[0]} min={def.min} max={def.max} step={def.step} onChange={(v) => set([v, value[1]])} /><span>Y</span><NumberInput value={value[1]} min={def.min} max={def.max} step={def.step} onChange={(v) => set([value[0], v])} /></div>
      ), false, Boolean(uniform));
    }
    case 'measure': return row(<MeasureField def={def} value={value} providers={providers} onChange={(v) => onChange(def.key, v, def.key)} />, true);
    case 'image': return row(<ImageField def={def} value={value} onChange={(v) => onChange(def.key, v)} />, true);
    case 'action': return (<Field def={def} value={value}><button className="btn small" onClick={() => onAction(def.key)}>{def.label}</button></Field>);
    default: return null;
  }
}
export { FontField };
