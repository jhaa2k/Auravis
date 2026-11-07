import { useRef, useState } from 'react';
import { assets } from '../../core/assets/assetStore.js';
import { imageCache } from '../../core/assets/imageCache.js';
import { useAssetUrl } from '../../app/hooks.js';
import Icon from '../Icon.jsx';

/** Import / replace / remove an image asset (PNG, JPG, WebP) with validation and an inline error. */
export default function ImageField({ def, value, onChange }) {
  const input = useRef(null);
  const [err, setErr] = useState('');
  const url = useAssetUrl(value);
  const pick = async (file) => {
    if (!file) return;
    try { setErr(''); const id = await assets.putImage(file); imageCache.invalidate(id); onChange(id); }
    catch (e) { setErr(e.message); }
  };
  return (
    <div className="image-field">
      <div className="thumb">{url ? <img src={url} alt="" /> : <span>{value ? 'Missing' : 'None'}</span>}</div>
      <div className="image-actions">
        <button className="btn small" onClick={() => input.current.click()}><Icon name="upload" size={14} />{value ? 'Replace' : 'Import'}</button>
        {value && <button className="btn small ghost" onClick={() => { setErr(''); onChange(null); }}><Icon name="trash" size={14} />Remove</button>}
        <input ref={input} type="file" accept="image/png,image/jpeg,image/webp" hidden onChange={(e) => { pick(e.target.files[0]); e.target.value = ''; }} />
      </div>
      {err && <div className="field-error" role="alert">{err}</div>}
    </div>
  );
}
