export const TAU = Math.PI * 2;
export const DEG = Math.PI / 180;
export const clamp = (v, a, b) => (v < a ? a : v > b ? b : v);
export const lerp = (a, b, t) => a + (b - a) * t;
export const isNum = (v) => typeof v === 'number' && Number.isFinite(v);
export const smoothstep = (a, b, x) => {
  const t = clamp((x - a) / (b - a || 1e-9), 0, 1);
  return t * t * (3 - 2 * t);
};
/** Triangle wave: 0→1→0 over [0,2]. Equals x on [0,1]. */
export const pingpong = (x) => 1 - Math.abs((((x % 2) + 2) % 2) - 1);
/** Frame-rate independent exponential smoothing factor. `s` is the 0..1 "stickiness". */
export const expAlpha = (s, dt) => 1 - Math.pow(clamp(s, 0, 0.999), Math.max(0, dt) * 60);
export const fmtTime = (s) =>
  Number.isFinite(s) ? `${Math.floor(s / 60)}:${String(Math.floor(s % 60)).padStart(2, '0')}` : '∞';
