// Collects validation / runtime problems per element so nothing fails silently.
export class Diagnostics {
  constructor() { this.map = new Map(); this.key = ''; }
  begin() { this.map = new Map(); }
  add(elId, level, message) {
    let list = this.map.get(elId);
    if (!list) this.map.set(elId, (list = []));
    if (!list.some((d) => d.message === message)) list.push({ level, message });
  }
  /** Returns a plain object only when the content changed (to avoid pointless UI renders). */
  flush() {
    const obj = {};
    for (const [k, v] of this.map) obj[k] = v;
    const key = JSON.stringify(obj);
    if (key === this.key) return null;
    this.key = key;
    return obj;
  }
}
