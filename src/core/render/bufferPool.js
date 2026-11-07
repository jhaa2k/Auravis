import { createCanvas, get2d } from '../platform.js';

/** Reuses offscreen canvases between frames so rendering allocates (almost) nothing. */
export class BufferPool {
  constructor() { this.free = new Map(); this.used = []; }
  take(w, h) {
    w = Math.max(1, Math.round(w)); h = Math.max(1, Math.round(h));
    const key = `${w}x${h}`;
    let c = this.free.get(key)?.pop();
    if (!c) c = createCanvas(w, h);
    else {
      const x = get2d(c);
      x.setTransform(1, 0, 0, 1, 0, 0); x.globalAlpha = 1; x.globalCompositeOperation = 'source-over';
      if ('filter' in x) x.filter = 'none';
      x.clearRect(0, 0, w, h);
    }
    this.used.push(c);
    return c;
  }
  releaseAll() {
    for (const c of this.used) {
      const key = `${c.width}x${c.height}`;
      let list = this.free.get(key);
      if (!list) this.free.set(key, (list = []));
      if (list.length < 6) list.push(c);
    }
    this.used = [];
  }
}
