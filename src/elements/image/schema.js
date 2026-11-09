import { bool, sel, num, int, col, img, act, meas, section } from '../../core/schema/dsl.js';
import { general } from '../shared/general.js';
import { MASK_MODES } from '../../core/render/mask.js';

export const IMAGE_SHAPES = [
  { value: 'none', label: 'None' },
  { value: 'rectangle', label: 'Rectangle' }, { value: 'square', label: 'Square' }, { value: 'circle', label: 'Circle' },
  { value: 'ellipse', label: 'Ellipse' }, { value: 'rounded', label: 'Rounded Rectangle' }, { value: 'hexagon', label: 'Hexagon' },
  { value: 'star', label: 'Star' }, { value: 'heart', label: 'Heart' }, { value: 'triangle', label: 'Triangle' }, { value: 'diamond', label: 'Diamond' },
];

export const sections = [
  general({ scale: [1, 1], tag: 'Your image 1', visible: true, blendMode: 'alpha' }),
  section('Image', [
    img('customImage', 'Custom Image'),
    meas('measureAnimationSpeed', 'Measure Animation Speed', { source: 'nothing', a: 0.5, b: 0.5, labels: { a: 'A (Speed)', b: 'B (Beat Amount)' } }),
    bool('keepAspectRatioAndCropToFit', 'Keep Aspect Ratio And Crop To Fit', false),
    bool('keepAspectRatio', 'Keep Aspect Ratio', true),
    bool('blurredBorder', 'Blurred Border', false),
    num('blurredBorderRadius', 'Blurred Border Radius', 40, 0, 200, 1, { hint: 'Blur intensity of the border fill' }),
    sel('shape', 'Shape', 'none', IMAGE_SHAPES),
    img('maskImage', 'Mask Image'),
    sel('maskMode', 'Mask Mode', 'alpha', MASK_MODES),
  ]),
  section('Color', [
    col('color', 'Color', '#ffffffff', { hint: 'Tint colour; alpha = tint strength' }),
    col('colorTo', 'Color To', '#ffffffff'),
    meas('measureColorBlend', 'Measure Color Blend', { source: 'nothing' }),
    num('saturation', 'Saturation', 1, 0, 3, 0.01),
  ]),
  section('Color Key', [
    bool('colorKeyEnabled', 'Color Key Enabled', false),
    bool('autoDetectColorKey', 'Auto Detect Color Key', true),
    act('detectColorKeyNow', 'Detect Color Key Now'),
    col('colorKey', 'Color Key', '#00ff00ff'),
    num('transparencyStrength', 'Transparency Strength', 1, 0, 1, 0.01),
    num('opacityStrength', 'Opacity Strength', 1, 0, 1, 0.01),
  ]),
  section('Blur', [
    bool('blurEnabled', 'Blur Enabled', false),
    int('blurDivider', 'Blur Divider', 10, 1, 16, 1),
    num('blurRadius', 'Blur Radius', 9, 0, 200, 1),
  ]),
  section('Generated Album Art', [
    bool('generatedAlbumArtHintShiftHue', 'Generated Album Art Hint Shift Hue', false),
    num('generatedAlbumArtHueShift', 'Hue Shift Amount', 0, 0, 360, 1, { unit: '°' }),
    bool('generatedAlbumArtHintNoText', 'Generated Album Art Hint No Text', false),
    act('generatedAlbumArtHintForceGen', 'Generated Album Art Hint Force Gen'),
    col('generatedAlbumArtColor', 'Generated Album Art Color', '#ffffffff', { hint: 'Colour guidance. Fully transparent = derive from the track' }),
  ]),
];
