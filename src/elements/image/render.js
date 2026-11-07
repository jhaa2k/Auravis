import { computeTransform, applyTransform } from '../../core/render/transform.js';
import { tintBuffer, setBlend } from '../../core/render/effectUtils.js';
import { parseColor, mixColor, toHex } from '../../core/utils/color.js';
import { clamp } from '../../core/utils/math.js';
import { buildTexture, TEX } from './pipeline.js';
import { generateAlbumArt } from './albumArt.js';

export const BOX = 1080;

/** Resolves the drawable source: Custom Image → (fallback) Generated Album Art. */
export function resolveSource(rc, el) {
  const p = el.props;
  if (p.customImage) {
    const e = rc.images.get(p.customImage);
    if (e.status === 'ready') return { drawable: e.img, w: e.w, h: e.h, key: `img:${p.customImage}` };
    if (e.status === 'loading') { rc.diag(el.id, 'info', 'Loading image…'); return rc.cache.get(`tex:${el.id}`)?.sig ? 'keep' : null; }
    rc.diag(el.id, 'error', e.status === 'missing' ? 'Missing image asset: re-import the Custom Image (using generated art meanwhile)' : 'Unsupported or corrupt image: using generated art');
  }
  const title = rc.meta?.title || 'Auravis', artist = rc.meta?.artist || '';
  const nonce = p.generatedAlbumArtHintForceGen;
  const key = `art:${title}|${artist}|${nonce}|${p.generatedAlbumArtHintShiftHue}|${p.generatedAlbumArtHintNoText}|${p.generatedAlbumArtColor}`;
  let art = rc.cache.get(key);
  if (!art) {
    for (const k of rc.cache.keys()) if (k.startsWith('art:')) rc.cache.delete(k); // keep only the newest artwork
    art = generateAlbumArt({ seed: `${title}|${artist}`, color: p.generatedAlbumArtColor, shiftHue: p.generatedAlbumArtHintShiftHue, noText: p.generatedAlbumArtHintNoText, title, artist, nonce });
    rc.cache.set(key, art);
  }
  return { drawable: art, w: art.width, h: art.height, key };
}

function resolveMask(rc, el) {
  const p = el.props;
  if (!p.maskImage) return null;
  const e = rc.images.get(p.maskImage);
  if (e.status === 'ready') return { drawable: e.img, key: `mask:${p.maskImage}` };
  if (e.status !== 'loading') rc.diag(el.id, 'error', 'Invalid mask: the mask image is missing or unreadable, mask processing disabled');
  return null;
}

function getTexture(rc, el) {
  const p = el.props, src = resolveSource(rc, el);
  if (src === 'keep') return rc.cache.get(`tex:${el.id}`)?.canvas || null;
  if (!src) return null;
  const mask = resolveMask(rc, el);
  const sig = JSON.stringify([src.key, mask?.key, p.keepAspectRatioAndCropToFit, p.keepAspectRatio, p.blurredBorder, p.blurredBorderRadius, p.shape, p.maskMode,
    p.colorKeyEnabled, p.colorKey, p.transparencyStrength, p.saturation, p.blurEnabled, p.blurDivider, p.blurRadius]);
  let entry = rc.cache.get(`tex:${el.id}`);
  if (!entry || entry.sig !== sig) {
    entry = { sig, canvas: buildTexture(src, p, mask) };
    rc.cache.set(`tex:${el.id}`, entry);
  }
  return entry.canvas;
}

export function renderImage(rc, el) {
  const p = el.props;
  const tex = getTexture(rc, el);
  if (!tex) return;

  // Measure Animation Speed: speed (deg/s) = A + B × measured value → continuous rotation drift
  const st = rc.state(el.id, () => ({ phase: 0, frame: -1 }));
  const m = rc.measure(el, 'measureAnimationSpeed');
  if (st.frame !== rc.frameNo) { st.frame = rc.frameNo; if (m != null) st.phase += (p.measureAnimationSpeed.a + p.measureAnimationSpeed.b * m) * rc.dt; }

  const T = computeTransform(rc, el, BOX, BOX, { extraRotation: st.phase % 360 });
  rc.record(el, T);

  // Measure Color Blend: Color → Color To
  const blend = rc.measure(el, 'measureColorBlend');
  const col = toHex(mixColor(parseColor(p.color), parseColor(p.colorTo), clamp(blend ?? 0, 0, 1)));
  const src = tintBuffer(rc, tex, col);

  const ctx = rc.ctx;
  ctx.save();
  setBlend(ctx, p, p.colorKeyEnabled || p.opacityStrength < 1 ? p.opacityStrength : 1, p.color);
  applyTransform(ctx, T);
  ctx.imageSmoothingEnabled = true;
  ctx.drawImage(src, 0, 0, BOX, BOX);
  ctx.restore();
}
