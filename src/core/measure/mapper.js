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

/** Reads the configured source from the analysis frame or track metadata. */
export function sourceValue(cfg, audio, meta = {}) {
  const providers = audio.providers || [];
  const time = Number.isFinite(meta.time) ? meta.time : 0;
  const duration = Number.isFinite(meta.duration) ? meta.duration : 0;
  switch (cfg.source) {
    case 'nothing': return 0;
    case 'totalTime': return time;
    case 'totalTimeBackward': return Math.max(0, duration - time);
    case 'totalTimeWhenPlaying': return meta.playing ? time : 0;
    case 'trackPosition': return duration > 0 ? clamp(time / duration, 0, 1) : 0;
    case 'constantShakeRotMore': return (Math.sin(time * Math.PI * 2) + 1) / 2;
    case 'constantShakeRotLess': return (1 - Math.sin(time * Math.PI * 2)) / 2;
    case 'rms': return audio.rms01;
    case 'peak': return audio.peak01;
    case 'left': return audio.left01;
    case 'right': return audio.right01;
    case 'level': return audio.level01;
  }
  const prov = providers[cfg.providerIndex - 1];
  if (!prov) return NaN;
  const o = prov.out;
  const beat = o.beat;
  switch (cfg.source) {
    case 'totalTimeAndBeat': return time + beat;
    case 'beatRandomShake': return beat * (Math.sin(time * 97.31 + Math.floor(time * 13) * 17.17) + 1) / 2;
    case 'beatCamShakeRotMore': return beat;
    case 'beatCamShakeRotLess': return 1 - beat;
    case 'beatTriggerAnim': return beat;
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
  const input = sourceValue(cfg, rc.audio, rc.meta);
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
