import { txt, bool, sel, num, vec2, meas, section } from '../../core/schema/dsl.js';

export const BLEND_MODES = [
  { value: 'alpha', label: 'Alpha' }, { value: 'preMulAlpha', label: 'PreMulAlpha' },
  { value: 'normal', label: 'Normal' }, { value: 'add', label: 'Add' }, { value: 'multiply', label: 'Multiply' },
  { value: 'screen', label: 'Screen' }, { value: 'overlay', label: 'Overlay' }, { value: 'softLight', label: 'Soft Light' },
  { value: 'hardLight', label: 'Hard Light' }, { value: 'difference', label: 'Difference' }, { value: 'alphaBlend', label: 'Alpha Blend' },
];
// Alpha Blend = source-over weighted by the element colour alpha (see renderers); Normal ignores colour alpha for blending.
export const BLEND_OP = {
  alpha: 'source-over', preMulAlpha: 'source-over', normal: 'source-over', add: 'lighter', multiply: 'multiply', screen: 'screen', overlay: 'overlay',
  softLight: 'soft-light', hardLight: 'hard-light', difference: 'difference', alphaBlend: 'source-over',
};
export const ALIGNMENTS = [
  { value: 'topLeft', label: 'Top Left' }, { value: 'topCenter', label: 'Top Center' }, { value: 'topRight', label: 'Top Right' },
  { value: 'middleLeft', label: 'Middle Left' }, { value: 'center', label: 'Center' }, { value: 'middleRight', label: 'Middle Right' },
  { value: 'bottomLeft', label: 'Bottom Left' }, { value: 'bottomCenter', label: 'Bottom Center' }, { value: 'bottomRight', label: 'Bottom Right' },
];

/**
 * The shared General section. Every visual element calls this one factory
 * (options only switch off the properties the spec omits for that element).
 */
export function general({
  rotation = true, measureRot = true, posLabels, scale = [1, 1], position = [0, 0],
  measurePos = {}, measureScale = {}, blendMode = 'normal', scaleIsUniform = false, tag = '', visible = true,
} = {}) {
  return section('General', [
    txt('tag', 'Tag', tag),
    bool('visible', 'Visible', visible),
    sel('blendMode', 'Blend Mode', blendMode, BLEND_MODES),
    vec2('position', 'Position', position, -4000, 4000, 1, { unit: 'px' }),
    num('anchorX', 'Anchor X', 0.5, 0, 1, 0.01),
    num('anchorY', 'Anchor Y', 0.5, 0, 1, 0.01),
    meas('measurePos', 'Measure Pos', { axis: true, outMin: 0, outMax: 80, labels: posLabels, ...measurePos }),
    sel('alignmentPosition', 'Alignment Position', 'center', ALIGNMENTS),
    bool('scaleIsUniform', 'Scale Is Uniform', scaleIsUniform),
    vec2('scale', 'Scale', scale, 0.01, 12, 0.01, { uniformKey: 'scaleIsUniform' }),
    meas('measureScale', 'Measure Scale', { outMin: 1, outMax: 1.25, ...measureScale }),
    ...(rotation ? [num('rotation', 'Rotation', 0, -720, 720, 0.1, { unit: '°' })] : []),
    ...(rotation && measureRot ? [meas('measureRot', 'Measure Rot', { outMin: 0, outMax: 30 })] : []),
  ]);
}
