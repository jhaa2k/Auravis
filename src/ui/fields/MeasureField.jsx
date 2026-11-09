import { useState } from 'react';
import { MEASURE_SOURCES, MEASURE_CURVES, MEASURE_AXES } from '../../core/measure/sources.js';
import { NumberInput, Slider, Toggle } from './primitives.jsx';
import Icon from '../Icon.jsx';
import InAppSelect from '../InAppSelect.jsx';

const Row = ({ label, children }) => (<div className="mrow"><span>{label}</span>{children}</div>);

/** Full measurement-mapping editor: source → input range → curve → output range → multiplier/offset → smoothing. */
export default function MeasureField({ def, value, onChange, providers }) {
  const [open, setOpen] = useState(false);
  const set = (patch) => onChange({ ...value, ...patch });
  const src = MEASURE_SOURCES.find((s) => s.value === value.source)?.label;
  const needsProvider = !['rms', 'peak', 'left', 'right', 'level'].includes(value.source);
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
            <InAppSelect value={value.source} ariaLabel="Measure what" options={MEASURE_SOURCES} onChange={source=>set({source})}/>
          </Row>
          {value.source === 'spectrum' && <Row label="Sample Index"><NumberInput value={value.band} min={0} max={1023} step={1} onChange={(v) => set({ band: Math.round(v) })} /></Row>}
          {value.source === 'band' && <Row label="Frequency (Hz)"><NumberInput value={value.hz} min={20} max={22050} step={1} onChange={(v) => set({ hz: v })} /></Row>}
          {needsProvider && (
            <Row label="Audio Provider">
              {providers.length ? (
                <InAppSelect value={value.providerIndex} ariaLabel="Audio provider" options={[...providers.map((p,i)=>({value:i+1,label:(i+1)+' · '+p.props.tag})),...(value.providerIndex>providers.length?[{value:value.providerIndex,label:value.providerIndex+' · missing'}]:[])]} onChange={providerIndex=>set({providerIndex:+providerIndex})}/>
              ) : <span className="warn-text">No Audio Provider</span>}
            </Row>
          )}
          <Row label="Input Min"><NumberInput value={value.inMin} step={0.01} onChange={(v) => set({ inMin: v })} /></Row>
          <Row label="Input Max"><NumberInput value={value.inMax} step={0.01} onChange={(v) => set({ inMax: v })} /></Row>
          <Row label="Output Min"><NumberInput value={value.outMin} step={0.01} onChange={(v) => set({ outMin: v })} /></Row>
          <Row label="Output Max"><NumberInput value={value.outMax} step={0.01} onChange={(v) => set({ outMax: v })} /></Row>
          <Row label="Multiplier"><NumberInput value={value.multiplier} step={0.1} onChange={(v) => set({ multiplier: v })} /></Row>
          <Row label="Offset"><NumberInput value={value.offset} step={0.1} onChange={(v) => set({ offset: v })} /></Row>
          <Row label="Smoothing"><Slider value={value.smoothing} min={0} max={0.99} step={0.01} resetValue={def.default.smoothing} onChange={(v) => set({ smoothing: v })} /></Row>
          <Row label="Response Curve">
            <InAppSelect value={value.curve} ariaLabel="Response curve" options={MEASURE_CURVES} onChange={curve=>set({curve})}/>
          </Row>
          <Row label="Invert"><Toggle checked={value.invert} onChange={(invert) => set({ invert })} label="Invert" /></Row>
          {def.axis && (
            <Row label="Axis"><InAppSelect value={value.axis} ariaLabel="Axis" options={MEASURE_AXES} onChange={axis=>set({axis})}/></Row>
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
