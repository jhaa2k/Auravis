import { assets } from './assetStore.js';

let decoder = async (blob) => {
  if (typeof createImageBitmap === 'function') return createImageBitmap(blob);
  return new Promise((res, rej) => {
    const url = URL.createObjectURL(blob), im = new Image();
    im.onload = () => { URL.revokeObjectURL(url); res(im); };
    im.onerror = () => { URL.revokeObjectURL(url); rej(new Error('decode failed')); };
    im.src = url;
  });
};
export const setImageDecoder = (fn) => { decoder = fn; };

/**
 * Texture cache. `get(id)` is synchronous and returns {status, img}:
 *  loading | ready | missing (asset not in storage) | error (cannot decode).
 * `version` increments whenever any entry changes so cached pipelines can invalidate.
 */
class ImageCache {
  constructor() { this.map = new Map(); this.version = 0; this.listeners = new Set(); }
  get(id) {
    if (!id) return null;
    let e = this.map.get(id);
    if (e) return e;
    e = { status: 'loading', img: null, w: 0, h: 0 };
    this.map.set(id, e);
    assets.get(id).then(async (rec) => {
      if (!rec) { e.status = 'missing'; return; }
      try { e.img = await decoder(rec.blob); e.w = e.img.width; e.h = e.img.height; e.status = 'ready'; }
      catch { e.status = 'error'; }
    }).finally(() => { this.version++; this.listeners.forEach((l) => l()); });
    return e;
  }
  invalidate(id) { this.map.delete(id); this.version++; }
  subscribe(fn) { this.listeners.add(fn); return () => this.listeners.delete(fn); }
}
export const imageCache = new ImageCache();
