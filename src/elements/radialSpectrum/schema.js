import { bool, num, int, col, section } from '../../core/schema/dsl.js';
import { general } from '../shared/general.js';

export const sections = [
  general({ tag: 'Radial Spectrum', blendMode: 'add', scaleIsUniform: true }),
  section('Spectrum', [
    int('audioProviderIndex', 'Audio Provider Index', 1, 1, 16, 1, { dynamic: 'providers' }),
    num('radius', 'Inner Radius', 260, 20, 900, 1, { unit: 'px' }),
    num('barLength', 'Maximum Bar Length', 220, 1, 900, 1, { unit: 'px' }),
    num('barWidth', 'Bar Width', 5, 1, 40, 0.5, { unit: 'px' }),
    num('gap', 'Bar Gap', 0.25, 0, 0.9, 0.01),
    num('sensitivity', 'Sensitivity', 1.8, 0.01, 12, 0.01),
    int('barCount', 'Bar Count', 90, 2, 90, 1, { hint: 'Every value from 2 to 90 is supported' }),
    num('rotationOffset', 'Rotation Offset', -90, -360, 360, 0.1, { unit: '°' }),
    bool('mirror', 'Mirror Opposite Side', false),
  ]),
  section('Appearance', [
    col('colorFrom', 'Color From', '#20e7ffff'),
    col('colorTo', 'Color To', '#a855f7ff'),
    num('glow', 'Glow', 10, 0, 80, 1, { unit: 'px' }),
  ]),
];
