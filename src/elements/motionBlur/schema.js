import { bool, sel, num, int, col, section } from '../../core/schema/dsl.js';
import { general, BLEND_MODES } from '../shared/general.js';

export const sections = [
  general({ measureRot: false, posLabels: { a: 'A (Amount)', b: 'B (Speed)' }, blendMode: 'preMulAlpha', measurePos: { enabled: true, source: 'nothing', a: 0.5, b: 0.5, outMin: 0, outMax: 1, axis: 'x' } }),
  section('Appearance', [
    sel('blendModeContent', 'Blend Mode Content', 'add', BLEND_MODES),
    col('color', 'Color', '#ffffffff', { hint: 'Tint of the blurred content; alpha = opacity' }),
    sel('targetImage', 'Target Image', 'composition', [{ value: 'composition', label: 'Composition Below' }], { dynamic: 'targets' }),
    bool('showUnblurredContent', 'Show Unblurred Content', false),
    bool('showUnblurredContentUnder', 'Show Unblurred Content Under', false),
  ]),
  section('Motion Blur', [
    num('blurAmountMultiplier', 'Blur Amount Multiplier', 1, 0, 10, 0.01),
    sel('motionSource', 'Motion Source', 'transform', [
      { value: 'transform', label: 'EffectTransform' }, { value: 'measured', label: 'Measured Movement' },
      { value: 'target', label: 'Target Motion' }, { value: 'composition', label: 'Composition Motion' }]),
    sel('relativeMotionMode', 'Relative Motion Mode', 'relativeToComposition', [
      { value: 'absolute', label: 'Absolute' }, { value: 'relativeToComposition', label: 'Relative To Composition' }, { value: 'relativeToTarget', label: 'Relative To Target' }]),
    int('sampleCount', 'Sample Count', 12, 2, 48, 1),
  ]),
];
