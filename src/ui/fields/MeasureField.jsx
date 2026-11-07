import { useState } from 'react';
import { MEASURE_SOURCES, MEASURE_CURVES, MEASURE_AXES } from '../../core/measure/sources.js';
import { NumberInput, Slider, Toggle } from './primitives.jsx';
import Icon from '../Icon.jsx';

const Row = ({ label, children }) => (<div className="mrow"><span>{label}</span>{children}</div>);

/** Full measurement-mapping editor: source → input range → curve → output range → multiplier/offset → smoothing. */
export default function MeasureField({ def, value, onChange, providers }) {
  const [open, setOpen] = useState(false);
  const set = (patch) => onChange({ ...value, ...patch });
  const src = MEASURE_SOURCES.find((s) => s.value === value.source)?.label;
  const needsProvider = ['spectrum', 'band', 'bass', 'mid', 'treble', 'beat', 'totalTimeAndBeat', 'beatRandomShake', 'beatCamShakeRotMore', 'beatCamShakeRotLess', 'beatTriggerAnim'].includes(value.source);
  return (
    <div className={`measure ${value.enabled ? 'on' : ''}`}>
      <div className="measure-head">
        <Toggle checked={value.enabled} onChange={(enabled) => set({ enabled })} label={`${def.label} enabled`} />
        <button className="linkish" onClick={() => setOpen(!open)} aria-expanded={open}>
          {value.enabled ? src : 'Off'}<Icon name="chevron" size={14} style={{ transform: open ? 'rotate(90deg)' : 'none' }} />
        </button>
      </div>
      {open && (
        <div className="measure-body">
          <Row label="Measure What">
            <select value={value.source} onChange={(e) => set({ source: e.target.value })}>{MEASURE_SOURCES.map((s) => <option key={s.value} value={s.value}>{s.label}</option>)}</select>
          </Row>
          {value.source === 'spectrum' && <Row label="Sample Index"><NumberInput value={value.band} min={0} max={1023} step={1} onChange={(v) => set({ band: Math.round(v) })} /></Row>}
          {value.source === 'band' && <Row label="Frequency (Hz)"><NumberInput value={value.hz} min={20} max={22050} step={1} onChange={(v) => set({ hz: v })} /></Row>}
          {needsProvider && (
            <Row label="Audio Provider">
              {providers.length ? (
                <select value={value.providerIndex} onChange={(e) => set({ providerIndex: +e.target.value })}>
                  {providers.map((p, i) => <option key={p.id} value={i + 1}>{i + 1} · {p.props.tag}</option>)}
                  {value.providerIndex > providers.length && <option value={value.providerIndex}>{value.providerIndex} · missing</option>}
                </select>
              ) : <span className="warn-text">No Audio Provider</span>}
            </Row>
          )}
          <Row label="Input Min"><NumberInput value={value.inMin} step={0.01} onChange={(v) => set({ inMin: v })} /></Row>
          <Row label="Input Max"><NumberInput value={value.inMax} step={0.01} onChange={(v) => set({ inMax: v })} /></Row>
          <Row label="Output Min"><NumberInput value={value.outMin} step={0.01} onChange={(v) => set({ outMin: v })} /></Row>
          <Row label="Output Max"><NumberInput value={value.outMax} step={0.01} onChange={(v) => set({ outMax: v })} /></Row>
          <Row label="Multiplier"><NumberInput value={value.multiplier} step={0.1} onChange={(v) => set({ multiplier: v })} /></Row>
          <Row label="Offset"><NumberInput value={value.offset} step={0.1} onChange={(v) => set({ offset: v })} /></Row>
          <Row label="Smoothing"><Slider value={value.smoothing} min={0} max={0.99} step={0.01} onChange={(v) => set({ smoothing: v })} /></Row>
          <Row label="Response Curve">
            <select value={value.curve} onChange={(e) => set({ curve: e.target.value })}>{MEASURE_CURVES.map((s) => <option key={s.value} value={s.value}>{s.label}</option>)}</select>
          </Row>
          <Row label="Invert"><Toggle checked={value.invert} onChange={(invert) => set({ invert })} label="Invert" /></Row>
          {def.axis && (
            <Row label="Axis"><select value={value.axis} onChange={(e) => set({ axis: e.target.value })}>{MEASURE_AXES.map((s) => <option key={s.value} value={s.value}>{s.label}</option>)}</select></Row>
          )}
          {def.labels && <>
            <Row label={def.labels.a}><NumberInput value={value.a} step={0.1} onChange={(v) => set({ a: v })} /></Row>
            <Row label={def.labels.b}><NumberInput value={value.b} step={0.1} onChange={(v) => set({ b: v })} /></Row>
          </>}
        </div>
      )}
    </div>
  );
}
