import { bool, sel, num, int, col, area, section } from '../../core/schema/dsl.js';
import { general } from '../shared/general.js';
import { BAR_SHAPES } from '../../core/render/shapes.js';

const segment = (n, def) => section(`Segment ${n}`, [
  bool(`segment${n}Enabled`, 'Enabled', def.enabled),
  col(`segment${n}ColorFrom`, 'Color From', def.from),
  col(`segment${n}ColorTo`, 'Color To', def.to),
  num(`segment${n}FixedHeight`, 'Fixed Height', def.fixedHeight, 0, 1, 0.001, { hint: '0 = follow the audio sample; a positive value fixes the segment height' }),
  num(`segment${n}BarHeightMultiplier`, 'Bar Height Multiplier', def.mult, 0, 4, 0.01),
  bool(`segment${n}Mirror`, 'Mirror', def.mirror, { hint: 'Grow symmetrically around the centre line' }),
  bool(`segment${n}FlipEveryOther`, 'Flip Every Other', false),
]);

export const sections = [
  general({ position: [-96, 54], blendMode: 'alpha', scaleIsUniform: true, tag: 'Viz File .Com' }),
  section('Bars', [
    bool('flipInput', 'Flip Input', false),
    num('heightScale', 'Height Scale', 10, 0, 20, 0.01),
    num('minHeightScale', 'Min Height Scale', 0, 0, 1, 0.005),
    num('maxHeightScale', 'Max Height Scale', 1, 0, 2, 0.01),
    sel('shapePath', 'Shape Path', 'horizontalLine', BAR_SHAPES),
    area('customShapePath', 'Custom Shape Path', 'M0 100L50 0L100 100Z', { hint: 'SVG path data in a 100×100 box (used when Shape Path = Custom)' }),
    num('colorBlendOffset', 'Color Blend Offset', 0, -2, 2, 0.01),
  ]),
  segment(1, { enabled: true, from: '#ffffffff', to: '#ffffffff', fixedHeight: 0, mult: 1, mirror: false }),
  segment(2, { enabled: false, from: '#ffffff33', to: '#ffffff11', fixedHeight: 0, mult: 0.12, mirror: true }),
  section('Behaviour', [
    num('softness', 'Softness', 8, 0, 9.8, 0.1, { hint: 'Avee scale 0–10; higher values smooth the bar response more' }),
    num('reactionDelay', 'Reaction Delay', 0, 0, 1000, 1, { unit: 'ms' }),
    num('reactionAccumulatedDelay', 'Reaction Accumulated Delay', 0, 0, 60, 0.1, { unit: 'ms/bar' }),
    int('audioProviderIndex', 'Audio Provider Index', 1, 1, 16, 1, { dynamic: 'providers' }),
  ]),
];
