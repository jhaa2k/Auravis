import { bool, sel, num, int, col, img, meas, vec2, section } from '../../core/schema/dsl.js';
import { general, BLEND_MODES } from '../shared/general.js';

export const sections = [
  general({ tag: 'Viz File', visible: false, blendMode: 'add' }),
  section('Appearance', [
    sel('blendModeContent', 'Blend Mode Content', 'preMulAlpha', BLEND_MODES),
    col('color', 'Color', '#ff0017ff', { hint: 'Tint of the blurred content; alpha = opacity' }),
    int('sourceCompositionIndex', 'Source Composition Index', 2, 0, 64, 1, { hint: '0 = everything below this layer · N = the N-th element in the stack, rendered alone' }),
    img('maskImage', 'Mask Image'),
    bool('showUnblurredContent', 'Show Unblurred Content', true),
    bool('showUnblurredContentUnder', 'Show Unblurred Content Under', true),
  ]),
  section('Blur', [
    num('blurRadius', 'Blur Radius', 2, 0, 200, 0.5, { unit: 'px' }),
    num('blurMultiplier', 'Blur Multiplier', 4.1, 0, 10, 0.01),
    meas('measureBlurRadius', 'Measure Blur Radius', { source: 'nothing', outMin: 0, outMax: 30 }),
    vec2('layer1Scale', '1layer Scale', [1, 1], 0, 3, 0.01),
    vec2('layer2Scale', '2layer Scale', [0, 0], 0, 3, 0.01),
    vec2('layer3Scale', '3layer Scale', [0, 0], 0, 3, 0.01),
    col('layer1Color', '1layer Color', '#ffffffff', { hint: 'RGB tints the layer, alpha = layer opacity' }),
    col('layer2Color', '2layer Color', '#ffffffff'),
    col('layer3Color', '3layer Color', '#ffffffff'),
  ]),
];
