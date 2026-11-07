import { clamp, expAlpha } from '../utils/math.js';

const CURVES = {
  linear: (n) => n,
  easeIn: (n) => n * n,
  easeOut: (n) => 1 - (1 - n) * (1 - n),
  smooth: (n) => n * n * (3 - 2 * n),
  exp: (n) => n * n * n,
  log: (n) => Math.log1p(9 * n) / Math.log(10),
  sine: (n) => Math.sin((n * Math.PI) / 2),
  step: (n) => (n >= 0.5 ? 1 : 0),
};
export const applyCurve = (name, n) => (CURVES[name] || CURVES.linear)(n);

/**
 * Pure mapping (no temporal smoothing), exactly as specified:
 *   normalized = clamp((input - inMin) / (inMax - inMin), 0, 1)
 *   output     = outMin + normalized * (outMax - outMin)
 * Order: normalize → invert → response curve → output range → multiplier → offset.
 * Invalid ranges (inMax <= inMin) degrade to a hard threshold instead of dividing by zero.
 */
export function mapValue(cfg, input) {
  const x = Number.isFinite(input) ? input : 0;
  const { inMin, inMax } = cfg;
  let n = inMax > inMin ? clamp((x - inMin) / (inMax - inMin), 0, 1) : x >= inMax ? 1 : 0;
  if (cfg.invert) n = 1 - n;
  n = applyCurve(cfg.curve, n);
  return (cfg.outMin + n * (cfg.outMax - cfg.outMin)) * cfg.multiplier + cfg.offset;
}

/** Reads the configured source out of the analysis frame. Returns NaN when the provider is missing. */
export function sourceValue(cfg, audio) {
  switch (cfg.source) {
    case 'rms': return audio.rms01;
    case 'peak': return audio.peak01;
    case 'left': return audio.left01;
    case 'right': return audio.right01;
    case 'level': return audio.level01;
  }
  const prov = audio.providers[cfg.providerIndex - 1];
  if (!prov) return NaN;
  const o = prov.out;
  switch (cfg.source) {
    case 'spectrum': return o.samples.length ? o.samples[clamp(cfg.band | 0, 0, o.samples.length - 1)] : 0;
    case 'band': return o.valueAtHz(cfg.hz);
    case 'bass': return o.bass;
    case 'mid': return o.mid;
    case 'treble': return o.treble;
    case 'beat': return o.beat;
    default: return 0;
  }
}

/** Stateful (smoothed) evaluation used by the renderer. */
export function evaluateMeasure(rc, elId, key, cfg) {
  if (!cfg || !cfg.enabled) return null;
  const input = sourceValue(cfg, rc.audio);
  if (Number.isNaN(input)) {
    rc.diag(elId, 'warning', `${key}: Audio Provider ${cfg.providerIndex} does not exist`);
    return cfg.outMin * cfg.multiplier + cfg.offset;
  }
  const mapped = mapValue(cfg, input);
  const k = `${elId}:${key}`;
  const prev = rc.mstate.get(k);
  const v = prev === undefined ? mapped : prev + (mapped - prev) * expAlpha(cfg.smoothing, rc.dt);
  rc.mstate.set(k, v);
  return v;
}
