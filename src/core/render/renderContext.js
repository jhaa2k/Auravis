import { BufferPool } from './bufferPool.js';
import { get2d } from '../platform.js';
import { evaluateMeasure } from '../measure/mapper.js';
import { getDefinition } from '../schema/registry.js';
import { QUALITY } from './quality.js';

/**
 * Everything a renderer needs for one frame. Long-lived (pools, caches, smoothing state)
 * so rendering stays allocation-light; `beginFrame` resets only per-frame data.
 */
export class RenderContext {
  constructor(diagnostics) {
    this.pool = new BufferPool();
    this.diagnostics = diagnostics;
    this.mstate = new Map();   // smoothed measurement values
    this.cache = new Map();    // pipeline / texture caches (long lived)
    this.states = new Map();   // per-element runtime state (particles, bar history…)
    this.curT = new Map(); this.prevT = new Map();
    this.vecs = new Map(); this.prevVecs = new Map();
    this.boxes = new Map();
    this.frameNo = 0;
  }

  beginFrame({ canvas, ctx, lw, lh, scale, dt, time, audio, elements, meta, quality, images, cycles }) {
    this.main = { canvas, ctx };
    this.ctx = ctx;
    Object.assign(this, { lw, lh, scale, dt, time, audio, elements, meta, images, cycles });
    this.q = QUALITY[quality] || QUALITY.medium;
    this.byId = new Map(elements.map((e) => [e.id, e]));
    this.renderables = elements.filter((e) => getDefinition(e.type)?.kind !== 'provider');
    this.providers = audio.providers;
    this.mcache = new Map();
    this.iso = new Map();
    this.stack = new Set();
    this.frameNo++;
  }
  endFrame() {
    this.pool.releaseAll();
    this.prevT = this.curT; this.curT = new Map();
    this.prevVecs = this.vecs; this.vecs = new Map();
  }

  diag(id, level, msg) { this.diagnostics.add(id, level, msg); }
  state(id, init) { let s = this.states.get(id); if (!s) this.states.set(id, (s = init())); return s; }

  /** Smoothed measurement for property `key`, evaluated once per frame. Returns null when disabled. */
  measure(el, key) {
    const k = `${el.id}:${key}`;
    if (this.mcache.has(k)) return this.mcache.get(k);
    const v = evaluateMeasure(this, el.id, key, el.props[key]);
    this.mcache.set(k, v);
    return v;
  }

  /** Records an element's final transform: used for motion vectors and the editor selection overlay. */
  record(el, T) {
    const prev = this.prevT.get(el.id);
    this.curT.set(el.id, T);
    this.vecs.set(el.id, prev ? { dx: T.x - prev.x, dy: T.y - prev.y } : { dx: 0, dy: 0 });
    this.boxes.set(el.id, T);
  }

  takeTarget() {
    const canvas = this.pool.take(this.main.canvas.width, this.main.canvas.height);
    const ctx = get2d(canvas);
    ctx.setTransform(this.scale, 0, 0, this.scale, 0, 0);
    return { canvas, ctx };
  }

  snapshotMain() {
    const c = this.pool.take(this.main.canvas.width, this.main.canvas.height);
    get2d(c).drawImage(this.main.canvas, 0, 0);
    return c;
  }

  /** Renders one element alone (visibility ignored) into a pooled full-size canvas. */
  renderIsolated(el) {
    if (this.iso.has(el.id)) return this.iso.get(el.id);
    if (this.stack.has(el.id)) { this.diag(el.id, 'error', 'Circular composition reference'); return null; }
    const def = getDefinition(el.type);
    if (!def?.render) return null;
    this.stack.add(el.id);
    const t = this.takeTarget(), prev = this.ctx;
    this.ctx = t.ctx;
    try { def.render(this, el, { isolated: true }); }
    catch (e) { this.diag(el.id, 'error', `Render failed: ${e.message}`); }
    this.ctx = prev;
    this.stack.delete(el.id);
    this.iso.set(el.id, t.canvas);
    return t.canvas;
  }

  /**
   * Resolves an effect's source. ref: 'composition' | 0 → everything rendered below;
   * element id (Target Image) or 1-based index (Source Composition Index) → that element rendered alone.
   * Returns null (and reports why) for missing targets or circular references.
   */
  resolveSource(el, ref) {
    if (ref === 'composition' || ref === 0) return { canvas: this.snapshotMain(), isComposition: true };
    const target = typeof ref === 'number' ? this.renderables[ref - 1] : this.byId.get(ref);
    if (!target) { this.diag(el.id, 'error', typeof ref === 'number' ? `Invalid composition reference: index ${ref} does not exist` : 'Missing target image: effect disabled'); return null; }
    if (target.id === el.id || this.cycles.has(target.id) || this.cycles.has(el.id)) { this.diag(el.id, 'error', 'Circular composition reference: effect disabled'); return null; }
    const canvas = this.renderIsolated(target);
    return canvas ? { canvas, isComposition: false, target } : null;
  }
}

/** Static cycle detection across effect → source chains. Returns the ids that are part of a cycle. */
export function findCycles(elements) {
  const renderables = elements.filter((e) => getDefinition(e.type)?.kind !== 'provider');
  const byId = new Map(elements.map((e) => [e.id, e]));
  const dep = (e) => {
    const d = getDefinition(e.type)?.dependency?.(e, renderables);
    return d && d !== 'composition' ? byId.get(d) : null;
  };
  const bad = new Set();
  for (const start of elements) {
    const seen = new Set();
    for (let cur = start; cur; cur = dep(cur)) {
      if (seen.has(cur.id)) { seen.forEach((id) => bad.add(id)); break; }
      seen.add(cur.id);
    }
  }
  return bad;
}
