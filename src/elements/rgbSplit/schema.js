import { bool, sel, num, col, meas, section } from '../../core/schema/dsl.js';
import { general, BLEND_MODES } from '../shared/general.js';

export const sections = [
  general({ rotation: true, measureRot: true }),
  section('Appearance', [
    sel('blendModeContent', 'Blend Mode Content', 'add', BLEND_MODES),
    col('color', 'Color', '#ffffffff', { hint: 'RGB tint of the processed content; alpha = opacity' }),
    sel('targetImage', 'Target Image', 'composition', [{ value: 'composition', label: 'Composition Below' }], { dynamic: 'targets' }),
    bool('showUnblurredContent', 'Show Unblurred Content', false),
    bool('showUnblurredContentUnder', 'Show Unblurred Content Under', true),
  ]),
  section('Split Effect', [
    num('splitMultiplier', 'Split Multiplier', 1, 0, 10, 0.01),
    num('splitAmount', 'Split Amount', 8, 0, 200, 0.1, { unit: 'px' }),
    meas('measureSplitAmount', 'Measure Split Amount', { source: 'beat', outMin: 0, outMax: 30 }),
    col('splitColor0', 'Split Color 0', '#ff0000ff'),
    col('splitColor1', 'Split Color 1', '#00ff00ff'),
    col('splitColor2', 'Split Color 2', '#0000ffff'),
  ]),
];
