import { bool, sel, num, col, vec2, meas, section } from '../../core/schema/dsl.js';
import { general, BLEND_MODES } from '../shared/general.js';

export const sections = [
  general({ rotation: true, measureRot: true, tag: 'viz file .com', visible: false, blendMode: 'screen' }),
  section('Appearance', [
    sel('blendModeContent', 'Blend Mode Content', 'screen', BLEND_MODES),
    col('color', 'Color', '#ddddddff', { hint: 'RGB tint of the processed content; alpha = opacity' }),
    sel('targetImage', 'Target Image', 'composition', [{ value: 'composition', label: 'Composition Below' }], { dynamic: 'targets' }),
    bool('showUnblurredContent', 'Show Unblurred Content', false),
    bool('showUnblurredContentUnder', 'Show Unblurred Content Under', true),
  ]),
  section('Split Effect', [
    num('splitMultiplier', 'Split Multiplier', 0, 0, 10, 0.01),
    vec2('splitAmount', 'Split Amount', [0.5, 0.5], 0, 200, 0.1, { unit: 'px' }),
    meas('measureSplitAmount', 'Measure Split Amount', { source: 'nothing', outMin: 0, outMax: 30 }),
    col('splitColor0', 'Split Color 0', '#ffffffff'),
    col('splitColor1', 'Split Color 1', '#ffffffff'),
    col('splitColor2', 'Split Color 2', '#ffffffff'),
  ]),
];
