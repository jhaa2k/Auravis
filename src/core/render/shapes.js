// Vector shape library. All paths live in a 100×100 box, y pointing DOWN (SVG convention),
// so they scale to any bar/segment/image rectangle.
export const SHAPE_PATHS = {
  rectangle: 'M0 0H100V100H0Z',
  rounded: 'M14 0H86A14 14 0 0 1 100 14V86A14 14 0 0 1 86 100H14A14 14 0 0 1 0 86V14A14 14 0 0 1 14 0Z',
  capsule: 'M0 25Q0 0 50 0Q100 0 100 25V75Q100 100 50 100Q0 100 0 75Z',
  triangle: 'M50 0L100 100H0Z',
  diamond: 'M50 0L100 50L50 100L0 50Z',
  circle: 'M0 50A50 50 0 1 0 100 50A50 50 0 1 0 0 50Z',
  chevron: 'M0 0L50 40L100 0V50L50 100L0 50Z',
  hexagon: 'M25 0H75L100 50L75 100H25L0 50Z',
  star: 'M50 0L61 35L98 35L68 57L79 91L50 70L21 91L32 57L2 35L39 35Z',
  heart: 'M50 92C8 62 0 38 0 24C0 9 12 0 26 0C38 0 46 7 50 16C54 7 62 0 74 0C88 0 100 9 100 24C100 38 92 62 50 92Z',
  line: 'M42 0H58V100H42Z',
};
export const BAR_SHAPES = [
  { value: 'rectangle', label: 'Rectangle' }, { value: 'rounded', label: 'Rounded Rectangle' }, { value: 'capsule', label: 'Capsule' },
  { value: 'triangle', label: 'Triangle' }, { value: 'diamond', label: 'Diamond' }, { value: 'circle', label: 'Circle' },
  { value: 'chevron', label: 'Chevron' }, { value: 'hexagon', label: 'Hexagon' }, { value: 'line', label: 'Line' },
  { value: 'custom', label: 'Custom Vector Path' },
];

const cache = new Map();
const SAFE = /^[MmLlHhVvCcSsQqTtAaZz0-9eE+\-.,\s]+$/;

/** Validates a user supplied SVG path (100×100 box). */
export function validateCustomPath(d) {
  if (typeof d !== 'string' || !d.trim()) return { ok: false, error: 'Custom path is empty' };
  if (d.length > 2000) return { ok: false, error: 'Custom path is too long (max 2000 characters)' };
  if (!SAFE.test(d) || !/^\s*[Mm]/.test(d)) return { ok: false, error: 'Custom path must be valid SVG path data starting with M' };
  return { ok: true };
}

/** Returns a cached Path2D for a named shape or a validated custom path. */
export function getShapePath(name, custom) {
  const d = name === 'custom' ? custom : SHAPE_PATHS[name] || SHAPE_PATHS.rectangle;
  let p = cache.get(d);
  if (!p) {
    p = new Path2D(d);
    if (cache.size > 200) cache.clear();
    cache.set(d, p);
  }
  return p;
}
