import { bool, sel, num, int, col, img, act, meas, section } from '../../core/schema/dsl.js';
import { general } from '../shared/general.js';
import { MASK_MODES } from '../../core/render/mask.js';

export const IMAGE_SHAPES = [
  { value: 'rectangle', label: 'Rectangle' }, { value: 'square', label: 'Square' }, { value: 'circle', label: 'Circle' },
  { value: 'ellipse', label: 'Ellipse' }, { value: 'rounded', label: 'Rounded Rectangle' }, { value: 'hexagon', label: 'Hexagon' },
  { value: 'star', label: 'Star' }, { value: 'heart', label: 'Heart' }, { value: 'triangle', label: 'Triangle' }, { value: 'diamond', label: 'Diamond' },
];

export const sections = [
  general({ scale: [0.45, 0.45] }),
  section('Image', [
    img('customImage', 'Custom Image'),
    meas('measureAnimationSpeed', 'Measure Animation Speed', { source: 'beat', a: 20, b: 120, labels: { a: 'A (Speed)', b: 'B (Beat Amount)' } }),
    bool('keepAspectRatioAndCropToFit', 'Keep Aspect Ratio And Crop To Fit', true),
    bool('keepAspectRatio', 'Keep Aspect Ratio', true),
    bool('blurredBorder', 'Blurred Border', false),
    num('blurredBorderRadius', 'Blurred Border Radius', 40, 0, 200, 1, { hint: 'Blur intensity of the border fill' }),
    sel('shape', 'Shape', 'rectangle', IMAGE_SHAPES),
    img('maskImage', 'Mask Image'),
    sel('maskMode', 'Mask Mode', 'alpha', MASK_MODES),
  ]),
  section('Color', [
    col('color', 'Color', '#ffffffff', { hint: 'Tint colour; alpha = tint strength' }),
    col('colorTo', 'Color To', '#ffffffff'),
    meas('measureColorBlend', 'Measure Color Blend', { source: 'bass' }),
    num('saturation', 'Saturation', 1, 0, 3, 0.01),
  ]),
  section('Color Key', [
    bool('colorKeyEnabled', 'Color Key Enabled', false),
    act('autoDetectColorKey', 'Auto Detect Color Key'),
    col('colorKey', 'Color Key', '#000000ff'),
    num('transparencyStrength', 'Transparency Strength', 0.3, 0, 1, 0.01),
    num('opacityStrength', 'Opacity Strength', 1, 0, 1, 0.01),
  ]),
  section('Blur', [
    bool('blurEnabled', 'Blur Enabled', false),
    int('blurDivider', 'Blur Divider', 2, 1, 16, 1),
    num('blurRadius', 'Blur Radius', 20, 0, 200, 1),
  ]),
  section('Generated Album Art', [
    num('generatedAlbumArtHintShiftHue', 'Generated Album Art Hint Shift Hue', 0, 0, 360, 1, { unit: '°' }),
    bool('generatedAlbumArtHintNoText', 'Generated Album Art Hint No Text', false),
    act('generatedAlbumArtHintForceGen', 'Generated Album Art Hint Force Gen'),
    col('generatedAlbumArtColor', 'Generated Album Art Color', '#00000000', { hint: 'Colour guidance. Fully transparent = derive from the track' }),
  ]),
];
