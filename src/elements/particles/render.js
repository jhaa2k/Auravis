import { createCanvas, get2d } from '../../core/platform.js';
import { computeTransform, applyTransform } from '../../core/render/transform.js';
import { setBlend } from '../../core/render/effectUtils.js';
import { parseColor, mixColor, toCss } from '../../core/utils/color.js';
import { DEG, clamp } from '../../core/utils/math.js';
import { ParticleSystem } from './system.js';

const LEVELS = 16, SPR = 64;
const trailBuf = new Float32Array(100);

function softDot() {
  const c = createCanvas(SPR, SPR), x = get2d(c);
  const g = x.createRadialGradient(SPR / 2, SPR / 2, 0, SPR / 2, SPR / 2, SPR / 2);
  g.addColorStop(0, 'rgba(255,255,255,1)'); g.addColorStop(0.45, 'rgba(255,255,255,0.7)'); g.addColorStop(1, 'rgba(255,255,255,0)');
  x.fillStyle = g; x.fillRect(0, 0, SPR, SPR);
  return c;
}
function fitSprite(drawable, w, h) {
  const s = Math.min(1, 128 / Math.max(w, h)), c = createCanvas(w * s, h * s);
  get2d(c).drawImage(drawable, 0, 0, c.width, c.height);
  return c;
}
function tintSprite(base, c) {
  const out = createCanvas(base.width, base.height), x = get2d(out);
  x.drawImage(base, 0, 0);
  x.globalCompositeOperation = 'multiply';
  x.fillStyle = `rgb(${c.r | 0},${c.g | 0},${c.b | 0})`;
  x.fillRect(0, 0, out.width, out.height);
  x.globalCompositeOperation = 'destination-in';
  x.drawImage(base, 0, 0);
  return out;
}

/** 16 pre-tinted sprites along Color From → Color To (cached until image/colours change). */
function getSprites(rc, el) {
  const p = el.props;
  let base = null, key = 'dot';
  if (p.customImage) {
    const e = rc.images.get(p.customImage);
    if (e.status === 'ready') { key = `img:${p.customImage}`; base = rc.cache.get(`pbase:${key}`) || fitSprite(e.img, e.w, e.h); rc.cache.set(`pbase:${key}`, base); }
    else if (e.status !== 'loading') rc.diag(el.id, 'error', 'Missing or unreadable particle image: using the default soft dot');
  }
  if (!base) {
    base = rc.cache.get('pbase:dot');
    if (!base) rc.cache.set('pbase:dot', (base = softDot()));
  }
  const sig = `${key}|${p.colorFrom}|${p.colorTo}|${p.color}`;
  let entry = rc.cache.get(`spr:${el.id}`);
  if (!entry || entry.sig !== sig) {
    const cf = parseColor(p.colorFrom), ct = parseColor(p.colorTo), co = parseColor(p.color);
    const list = [];
    for (let k = 0; k < LEVELS; k++) {
      const c = mixColor(cf, ct, k / (LEVELS - 1));
      list.push({ canvas: tintSprite(base, { r: (c.r * co.r) / 255, g: (c.g * co.g) / 255, b: (c.b * co.b) / 255 }), a: c.a * co.a });
    }
    entry = { sig, list };
    rc.cache.set(`spr:${el.id}`, entry);
  }
  return entry.list;
}

export function renderParticles(rc, el) {
  const p = el.props;
  const cap = Math.min(p.countLimit, rc.q.particles);
  if (p.countLimit > rc.q.particles) rc.diag(el.id, 'warning', `Count Limit capped to ${rc.q.particles} by the ${rc.q.label} quality tier`);
  const st = rc.state(el.id, () => ({ sys: new ParticleSystem(), frame: -1 }));
  const sys = st.sys;
  const m = rc.measure(el, 'measureOverallSpeed');
  const spX = m == null ? 1 : 1 + p.measureOverallSpeed.a * m, spY = m == null ? 1 : 1 + p.measureOverallSpeed.b * m;
  if (st.frame !== rc.frameNo) { st.frame = rc.frameNo; sys.update(rc.dt, p, cap, spX, spY); }
  if (!sys.count) { rc.record(el, computeTransform(rc, el, rc.lw, rc.lh)); return; }

  const T = computeTransform(rc, el, rc.lw, rc.lh);
  rc.record(el, T);
  const sprites = getSprites(rc, el);
  const ctx = rc.ctx;
  ctx.save();
  setBlend(ctx, p, 1);
  applyTransform(ctx, T);
  ctx.translate(rc.lw / 2, rc.lh / 2);

  const mirrors = [[1, 1]];
  if (p.mirrorX) mirrors.push([-1, 1]);
  if (p.mirrorY) mirrors.push([1, -1]);
  if (p.mirrorX && p.mirrorY) mirrors.push([-1, -1]);
  const co = parseColor(p.color);
  ctx.lineCap = 'round'; ctx.lineJoin = 'round';

  for (let i = 0; i < sys.count; i++) {
    const s = sys.sc[i];
    if (s <= 0) continue;
    const t = sys.age[i] / sys.life[i];
    const lvl = Math.min(LEVELS - 1, (t * LEVELS) | 0), spr = sprites[lvl];
    const alpha = sys.alphaAt(i, p) * spr.a;
    if (alpha < 0.004) continue;
    const size = sys.sizeAt(i, p) * p.particleScale * s;
    if (size < 0.3) continue;
    const w = size * p.sizeAspectRatio, h = size;
    const rot = (p.orientToVelocity ? Math.atan2(sys.vy[i], sys.vx[i]) : 0) + p.velocityAngle * DEG;
    for (const [mx, my] of mirrors) {
      const x = sys.sx[i] * mx, y = sys.sy[i] * my;
      if (p.trailLength > 0) {
        const n = sys.trailPoints(i, trailBuf);
        if (n > 1) {
          ctx.strokeStyle = toCss({ ...mixColor(parseColor(p.colorFrom), parseColor(p.colorTo), t), a: 1 });
          ctx.lineWidth = Math.max(0.5, h * 0.5);
          const chunk = Math.max(2, Math.ceil(n / 4));
          for (let c = 0; c * chunk < n - 1; c++) {
            ctx.globalAlpha = alpha * (0.5 - c * 0.12);
            ctx.beginPath();
            ctx.moveTo(c === 0 ? x : trailBuf[(c * chunk) * 2] * mx, c === 0 ? y : trailBuf[(c * chunk) * 2 + 1] * my);
            for (let k = c * chunk; k < Math.min(n, (c + 1) * chunk + 1); k++) ctx.lineTo(trailBuf[k * 2] * mx, trailBuf[k * 2 + 1] * my);
            ctx.stroke();
          }
        }
      }
      ctx.globalAlpha = clamp(alpha, 0, 1);
      if (rot === 0) ctx.drawImage(spr.canvas, x - w / 2, y - h / 2, w, h);
      else { ctx.save(); ctx.translate(x, y); ctx.rotate(rot * mx * my); ctx.drawImage(spr.canvas, -w / 2, -h / 2, w, h); ctx.restore(); }
    }
  }
  ctx.restore();
}
