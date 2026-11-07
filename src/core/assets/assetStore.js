import { uid } from '../utils/id.js';

// Persistent asset storage (images, masks, fonts) in IndexedDB, with an in-memory fallback.
const DB = 'auravis-assets', STORE = 'assets';
const MAX_BYTES = 25 * 1024 * 1024;
const mem = new Map();
let dbp = null;

function openDb() {
  if (dbp) return dbp;
  dbp = new Promise((resolve) => {
    if (typeof indexedDB === 'undefined') return resolve(null);
    const req = indexedDB.open(DB, 1);
    req.onupgradeneeded = () => req.result.createObjectStore(STORE, { keyPath: 'id' });
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => resolve(null);
  });
  return dbp;
}
const tx = async (mode, fn) => {
  const db = await openDb();
  if (!db) return undefined;
  return new Promise((resolve, reject) => {
    const t = db.transaction(STORE, mode);
    const r = fn(t.objectStore(STORE));
    t.oncomplete = () => resolve(r && 'result' in r ? r.result : undefined);
    t.onerror = () => reject(t.error);
  });
};

async function sniff(blob) {
  const b = new Uint8Array(await blob.slice(0, 12).arrayBuffer());
  const s = (i, str) => [...str].every((c, k) => b[i + k] === c.charCodeAt(0));
  if (b[0] === 0x89 && s(1, 'PNG')) return 'image/png';
  if (b[0] === 0xff && b[1] === 0xd8 && b[2] === 0xff) return 'image/jpeg';
  if (s(0, 'RIFF') && s(8, 'WEBP')) return 'image/webp';
  return null;
}

export const assets = {
  /** Validates and stores an image. Throws a user-readable Error for unsupported files. */
  async putImage(file) {
    if (file.size > MAX_BYTES) throw new Error(`Image is too large (${(file.size / 1048576).toFixed(1)} MB, max 25 MB)`);
    const mime = await sniff(file);
    if (!mime) throw new Error('Unsupported image format. Use PNG, JPG/JPEG or WebP.');
    return this.put({ kind: 'image', name: file.name, mime, blob: file.slice(0, file.size, mime) });
  },
  async put(rec) {
    const record = { id: rec.id || uid('asset'), kind: rec.kind, name: rec.name, mime: rec.mime, blob: rec.blob };
    mem.set(record.id, record);
    await tx('readwrite', (s) => s.put(record)).catch(() => {});
    return record.id;
  },
  async get(id) {
    if (mem.has(id)) return mem.get(id);
    const rec = await tx('readonly', (s) => s.get(id)).catch(() => null);
    if (rec) mem.set(id, rec);
    return rec || null;
  },
  async remove(id) { mem.delete(id); await tx('readwrite', (s) => s.delete(id)).catch(() => {}); },
  async all(kind) {
    const list = (await tx('readonly', (s) => s.getAll()).catch(() => null)) || [...mem.values()];
    return kind ? list.filter((r) => r.kind === kind) : list;
  },
  async toDataUrl(id) {
    const r = await this.get(id);
    if (!r) return null;
    const buf = new Uint8Array(await r.blob.arrayBuffer());
    let bin = '';
    for (let i = 0; i < buf.length; i += 0x8000) bin += String.fromCharCode(...buf.subarray(i, i + 0x8000));
    return { id: r.id, kind: r.kind, name: r.name, mime: r.mime, data: `data:${r.mime};base64,${btoa(bin)}` };
  },
  async fromDataUrl(o) {
    const bin = atob(o.data.split(',')[1]);
    const u = new Uint8Array(bin.length);
    for (let i = 0; i < bin.length; i++) u[i] = bin.charCodeAt(i);
    return this.put({ id: o.id, kind: o.kind, name: o.name, mime: o.mime, blob: new Blob([u], { type: o.mime }) });
  },
};
