import { bool, sel, num, int, col, img, meas, section } from '../../core/schema/dsl.js';
import { general, BLEND_MODES } from '../shared/general.js';

export const sections = [
  general(),
  section('Appearance', [
    sel('blendModeContent', 'Blend Mode Content', 'normal', BLEND_MODES),
    col('color', 'Color', '#ffffffff', { hint: 'Tint of the blurred content; alpha = opacity' }),
    int('sourceCompositionIndex', 'Source Composition Index', 0, 0, 64, 1, { hint: '0 = everything below this layer · N = the N-th element in the stack, rendered alone' }),
    img('maskImage', 'Mask Image'),
    bool('showUnblurredContent', 'Show Unblurred Content', false),
    bool('showUnblurredContentUnder', 'Show Unblurred Content Under', true),
  ]),
  section('Blur', [
    num('blurRadius', 'Blur Radius', 14, 0, 200, 0.5, { unit: 'px' }),
    num('blurMultiplier', 'Blur Multiplier', 1, 0, 10, 0.01),
    meas('measureBlurRadius', 'Measure Blur Radius', { source: 'bass', outMin: 0, outMax: 30 }),
    num('layer1Scale', '1layer Scale', 1, 0.5, 3, 0.01),
    num('layer2Scale', '2layer Scale', 1.05, 0.5, 3, 0.01),
    num('layer3Scale', '3layer Scale', 1.12, 0.5, 3, 0.01),
    col('layer1Color', '1layer Color', '#ffffffff', { hint: 'RGB tints the layer, alpha = layer opacity' }),
    col('layer2Color', '2layer Color', '#ffffff99'),
    col('layer3Color', '3layer Color', '#ffffff55'),
  ]),
];
