import { TAU, DEG, clamp, lerp } from '../../core/utils/math.js';

const FIELDS = ['x', 'y', 'z', 'vx', 'vy', 'vz', 'age', 'life', 'endSize', 'phase', 'freq', 'mag', 'ux', 'uy', 'sx', 'sy', 'sc'];
const TRAIL_RATE = 40;       // trail samples per second
const REF_H = 1080;          // reference height for the perspective focal length

/**
 * Struct-of-arrays particle pool: no per-particle objects, dead particles are removed by
 * swap-with-last (O(1)), capacity is fixed by Count Limit. Pure logic — rendering lives in render.js.
 */
export class ParticleSystem {
  constructor(rng = Math.random) {
    this.rng = rng; this.count = 0; this.capAlloc = 0; this.acc = 0; this.tacc = 0;
    this.steps = 0; this.head = 0; this.trail = null; this.fill = null;
  }
  alloc(cap, steps) {
    if (cap > this.capAlloc) {
      const old = this.capAlloc;
      for (const f of FIELDS) {
        const a = new Float32Array(cap);
        if (old) a.set(this[f].subarray(0, old));
        this[f] = a;
      }
      this.capAlloc = cap; this.trail = null;
    }
    if (steps !== this.steps || !this.trail) {
      this.steps = steps;
      this.trail = steps ? new Float32Array(this.capAlloc * steps * 2) : null;
      this.fill = new Uint8Array(this.capAlloc);
      this.head = 0;
    }
  }
  remove(i) {
    const last = --this.count;
    if (i === last) return;
    for (const f of FIELDS) this[f][i] = this[f][last];
    if (this.trail) {
      const S2 = this.steps * 2;
      this.trail.copyWithin(i * S2, last * S2, last * S2 + S2);
      this.fill[i] = this.fill[last];
    }
  }
  spawn(p) {
    const i = this.count++, r = this.rng;
    this.age[i] = 0; this.life[i] = p.lifetime;
    const [aw, ah] = p.spawnAreaSize;
    let x = 0, y = 0;
    if (p.spawnArea === 'rectangle') { x = (r() - 0.5) * aw; y = (r() - 0.5) * ah; }
    else if (p.spawnArea === 'circle') { const a = r() * TAU, d = Math.sqrt(r()) * aw / 2; x = Math.cos(a) * d; y = Math.sin(a) * d; }
    this.x[i] = x; this.y[i] = y; this.z[i] = r() * p.perspectiveDepth;
    const speed = p.speed * (1 + (r() * 2 - 1) * p.speedRandom);
    let dx, dy, el;
    if (p.useRandomVector) { const a = r() * TAU; dx = Math.cos(a); dy = Math.sin(a); el = Math.asin(r() * 2 - 1); }
    else if (p.vectorRelativeToCenter !== 'off') {
      let a = Math.hypot(x, y) < 1e-3 ? r() * TAU : Math.atan2(y, x);
      if (p.vectorRelativeToCenter === 'inward') a += Math.PI;
      else if (p.vectorRelativeToCenter === 'swirl') a += Math.PI / 2;
      dx = Math.cos(a); dy = Math.sin(a); el = p.vectorAngleZ * DEG;
    } else { const a = p.vectorAngle * DEG; dx = Math.cos(a); dy = -Math.sin(a); el = p.vectorAngleZ * DEG; }
    const ce = Math.cos(el);
    this.vx[i] = dx * ce * speed; this.vy[i] = dy * ce * speed; this.vz[i] = Math.sin(el) * speed;
    const len = Math.hypot(dx, dy) || 1;
    this.ux[i] = -dy / len; this.uy[i] = dx / len;    // wave oscillates perpendicular to the initial direction
    this.freq[i] = p.sideSineWaveFreq * (1 + (r() * 2 - 1) * p.sideSineWaveFreqRandom);
    this.mag[i] = p.sideSineWaveMag * (1 + (r() * 2 - 1) * p.sideSineWaveMagRandom);
    this.phase[i] = r() * TAU;
    this.endSize[i] = Math.max(0, p.endSize + (r() * 2 - 1) * p.endSizeRandom) * (1 + (this.z[i] / Math.max(1, p.perspectiveDepth)) * p.endSizeZFactor);
    if (this.fill) this.fill[i] = 0;
  }

  /** Advances the simulation. `cap` = effective particle limit, spX/spY = Measure Overall Speed multipliers. */
  update(dt, p, cap, spX = 1, spY = 1) {
    dt = Math.min(dt, 0.05);
    const steps = p.trailLength > 0 ? Math.min(40, Math.max(2, Math.ceil(p.trailLength * TRAIL_RATE))) : 0;
    this.alloc(cap, steps);
    while (this.count > cap) this.remove(this.count - 1);

    this.acc += dt / Math.max(0.001, p.spawnTime);
    let n = Math.floor(this.acc);
    this.acc -= n;
    for (n = Math.min(n, cap); n > 0 && this.count < cap; n--) this.spawn(p);

    const focal = REF_H / 2 / Math.tan((clamp(p.perspectiveFov, 10, 140) * DEG) / 2);
    const [fx, fy] = p.forceFieldPosition, fs = p.forceFieldStrength, ft = p.forceField;
    const flen = Math.hypot(fx, fy);
    let tick = false;
    if (steps) { this.tacc += dt; if (this.tacc >= 1 / TRAIL_RATE) { this.tacc = 0; tick = true; this.head = (this.head + 1) % steps; } }

    for (let i = this.count - 1; i >= 0; i--) {
      this.age[i] += dt;
      if (this.age[i] >= this.life[i]) { this.remove(i); continue; }
      this.vy[i] += p.gravity * dt;
      if (ft !== 'none') {
        let ax = 0, ay = 0;
        if (ft === 'directional') { const l = flen || 1; ax = flen ? fx / l : 1; ay = flen ? fy / l : 0; }
        else {
          const dx = fx - this.x[i], dy = fy - this.y[i], d = Math.hypot(dx, dy) || 1, fall = 1 / (1 + d / 200);
          if (ft === 'attraction') { ax = (dx / d) * fall; ay = (dy / d) * fall; }
          else if (ft === 'repulsion') { ax = -(dx / d) * fall; ay = -(dy / d) * fall; }
          else { ax = (-dy / d) * fall; ay = (dx / d) * fall; }
        }
        this.vx[i] += ax * fs * dt; this.vy[i] += ay * fs * dt;
      }
      this.x[i] += this.vx[i] * spX * dt; this.y[i] += this.vy[i] * spY * dt; this.z[i] += this.vz[i] * dt;
      const w = Math.sin(TAU * this.freq[i] * this.age[i] + this.phase[i]) * this.mag[i];
      const camD = focal + this.z[i];
      const s = camD > 1 ? focal / camD : 0;
      this.sc[i] = s; this.sx[i] = (this.x[i] + this.ux[i] * w) * s; this.sy[i] = (this.y[i] + this.uy[i] * w) * s;
      if (tick) {
        const o = (i * steps + this.head) * 2;
        this.trail[o] = this.sx[i]; this.trail[o + 1] = this.sy[i];
        if (this.fill[i] < steps) this.fill[i]++;
      }
    }
    this.focal = focal;
  }

  /** Size at the current age: Start → Fade In Size (during fade-in) → End Size (rest of life). */
  sizeAt(i, p) {
    const life = this.life[i], age = this.age[i], tf = Math.max(1e-3, Math.min(p.fadeInAndOutTime, life / 2));
    if (age < tf) return lerp(p.startSize, p.fadeInSize, age / tf);
    return lerp(p.fadeInSize, this.endSize[i], (age - tf) / Math.max(1e-3, life - tf));
  }
  /** Fade in/out × near-camera fade. */
  alphaAt(i, p) {
    const life = this.life[i], age = this.age[i], tf = Math.max(1e-3, Math.min(p.fadeInAndOutTime, life / 2));
    const fade = Math.min(1, age / tf, (life - age) / tf);
    const near = p.nearCameraFadeOutDistance > 0 ? clamp((this.focal + this.z[i]) / p.nearCameraFadeOutDistance, 0, 1) : 1;
    return clamp(fade, 0, 1) * near;
  }
  /** Fills `out` with the trail polyline (newest first) and returns the point count. */
  trailPoints(i, out) {
    if (!this.trail) return 0;
    const n = this.fill[i];
    for (let k = 0; k < n; k++) {
      const slot = (this.head - k + this.steps) % this.steps, o = (i * this.steps + slot) * 2;
      out[k * 2] = this.trail[o]; out[k * 2 + 1] = this.trail[o + 1];
    }
    return n;
  }
}
