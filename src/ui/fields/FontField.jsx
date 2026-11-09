import { useRef, useState, useSyncExternalStore } from 'react';
import { fontStore } from '../../core/assets/fontStore.js';
import Icon from '../Icon.jsx';

export default function FontField({ value, onChange, sample }) {
  const input = useRef(null);
  const [err, setErr] = useState('');
  useSyncExternalStore(fontStore.subscribe, () => fontStore.version, () => fontStore.version);
  const families = fontStore.families();
  const missing = Boolean(value) && !families.includes(value);
  return (
    <div>
      <div className="font-row">
        <select value={value} onChange={(e) => onChange(e.target.value)}>
          {!value && <option value="">Default Font</option>}
          {missing && <option value={value}>{value} (missing)</option>}
          {families.map((f) => <option key={f} value={f}>{f}</option>)}
        </select>
        <button className="btn small" onClick={() => input.current.click()} title="Import a TTF / OTF / WOFF font"><Icon name="upload" size={14} />Font</button>
        <input ref={input} type="file" accept=".ttf,.otf,.woff,.woff2" hidden onChange={async (e) => {
          const f = e.target.files[0]; e.target.value = '';
          if (!f) return;
          try { setErr(''); onChange(await fontStore.importFile(f)); } catch (x) { setErr(x.message); }
        }} />
      </div>
      <div className="font-sample" style={{ fontFamily: `"${value}", system-ui, sans-serif` }}>{sample || 'Aa Bb Cc 123'}</div>
      {missing && <div className="field-error">This font is not available here: a fallback is used. Import it again to restore it.</div>}
      {err && <div className="field-error" role="alert">{err}</div>}
    </div>
  );
}
