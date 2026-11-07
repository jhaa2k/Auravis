import { bool, sel, num, int, col, area, section } from '../../core/schema/dsl.js';
import { general } from '../shared/general.js';
import { BAR_SHAPES } from '../../core/render/shapes.js';

const segment = (n, def) => section(`Segment ${n}`, [
  bool(`segment${n}Enabled`, 'Enabled', def.enabled),
  col(`segment${n}ColorFrom`, 'Color From', def.from),
  col(`segment${n}ColorTo`, 'Color To', def.to),
  bool(`segment${n}FixedHeight`, 'Fixed Height', def.fixed, { hint: 'Constant height instead of following the audio sample' }),
  num(`segment${n}BarHeightMultiplier`, 'Bar Height Multiplier', def.mult, 0, 4, 0.01),
  bool(`segment${n}Mirror`, 'Mirror', def.mirror, { hint: 'Grow symmetrically around the centre line' }),
  bool(`segment${n}FlipEveryOther`, 'Flip Every Other', false),
]);

export const sections = [
  general({ position: [0, 260] }),
  section('Bars', [
    bool('flipInput', 'Flip Input', false),
    num('heightScale', 'Height Scale', 1, 0, 8, 0.01),
    num('minHeightScale', 'Min Height Scale', 0.02, 0, 1, 0.005),
    num('maxHeightScale', 'Max Height Scale', 1, 0, 2, 0.01),
    sel('shapePath', 'Shape Path', 'rounded', BAR_SHAPES),
    area('customShapePath', 'Custom Shape Path', 'M0 100L50 0L100 100Z', { hint: 'SVG path data in a 100×100 box (used when Shape Path = Custom)' }),
    num('colorBlendOffset', 'Color Blend Offset', 0, -2, 2, 0.01),
  ]),
  segment(1, { enabled: true, from: '#ff9a6bff', to: '#c4306cff', fixed: false, mult: 1, mirror: true }),
  segment(2, { enabled: false, from: '#ffffff33', to: '#ffffff11', fixed: true, mult: 0.12, mirror: true }),
  section('Behaviour', [
    num('softness', 'Softness', 0.5, 0, 0.98, 0.01),
    num('reactionDelay', 'Reaction Delay', 0, 0, 1000, 1, { unit: 'ms' }),
    num('reactionAccumulatedDelay', 'Reaction Accumulated Delay', 0, 0, 60, 0.1, { unit: 'ms/bar' }),
    int('audioProviderIndex', 'Audio Provider Index', 1, 1, 16, 1, { dynamic: 'providers' }),
  ]),
];
