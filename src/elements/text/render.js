import { createCanvas, get2d } from '../../core/platform.js';
import { computeTransform, applyTransform } from '../../core/render/transform.js';
import { setBlend } from '../../core/render/effectUtils.js';
import { cssOf } from '../../core/utils/color.js';
import { fontStore, FONT_FALLBACK } from '../../core/assets/fontStore.js';
import { fmtTime } from '../../core/utils/math.js';

/** Replaces dynamic placeholders with live track / clock data. Unknown placeholders are kept verbatim. */
export function resolveText(template, meta = {}, now = new Date()) {
  const d = Number.isFinite(meta.duration) ? meta.duration : 0, t = meta.time || 0;
  const map = {
    title: meta.title || '', artist: meta.artist || '', time: fmtTime(t), duration: d ? fmtTime(d) : '∞',
    remaining: d ? fmtTime(Math.max(0, d - t)) : '∞', progress: d ? `${Math.round((t / d) * 100)}%` : '',
    date: now.toLocaleDateString(), clock: now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    ArtistOrTitle: meta.artist && meta.title ? `${meta.artist} - ${meta.title}` : meta.title || meta.artist || '',
  };
  return template.replace(/\{(\w+)\}/g, (match, key) => (key in map ? map[key] : match));
}

export function renderText(rc, el) {
  const p = el.props;
  const str = resolveText(p.text, rc.meta);
  if (!str.trim()) return;
  if (!fontStore.isAvailable(p.typeFace)) rc.diag(el.id, 'warning', `Font "${p.typeFace}" is not available: using a fallback font`);
  const font = `${p.fontStyle} ${p.fontWeight} ${p.fontSize}px "${p.typeFace}", ${FONT_FALLBACK}`;
  const maxLineWidth = Math.max(32, rc.lw * 0.9);
  const sig = `${str}|${font}|${p.color}|${p.textAlign}|${fontStore.version}|${rc.scale}|${maxLineWidth}`;
  let e = rc.cache.get(`txt:${el.id}`);
  if (!e || e.sig !== sig) {
    const k = Math.max(rc.scale, 0.5);
    const meas = get2d(createCanvas(8, 8));
    meas.font = font;
    const lh = p.fontSize * 1.25, pad = p.fontSize * 0.3;
    const availableWidth = Math.max(16, maxLineWidth - pad * 2);
    const lines = [];
    str.split('\n').forEach((paragraph) => {
      const words = paragraph.split(/\s+/).filter(Boolean);
      if (!words.length) { lines.push(''); return; }
      let line = '';
      words.forEach((word) => {
        const candidate = line ? `${line} ${word}` : word;
        if (line && meas.measureText(candidate).width > availableWidth) {
          lines.push(line);
          line = word;
        } else line = candidate;
      });
      lines.push(line);
    });
    const measuredWidth = Math.max(...lines.map((line) => meas.measureText(line).width));
    const w = Math.ceil(Math.min(maxLineWidth, measuredWidth) + pad * 2);
    const h = Math.ceil(lines.length * lh + pad * 2);
    const canvas = createCanvas(w * k, h * k), ctx = get2d(canvas);
    ctx.scale(k, k);
    ctx.font = font; ctx.fillStyle = cssOf(p.color); ctx.textBaseline = 'middle'; ctx.textAlign = p.textAlign;
    const ox = p.textAlign === 'left' ? pad : p.textAlign === 'right' ? w - pad : w / 2;
    lines.forEach((line, i) => ctx.fillText(line, ox, pad + lh * (i + 0.5), availableWidth));
    e = { sig, canvas, w, h };
    rc.cache.set(`txt:${el.id}`, e);
  }
  const T = computeTransform(rc, el, e.w, e.h);
  rc.record(el, T);
  const ctx = rc.ctx;
  ctx.save();
  setBlend(ctx, p, 1);
  applyTransform(ctx, T);
  ctx.drawImage(e.canvas, 0, 0, e.w, e.h);
  ctx.restore();
}
