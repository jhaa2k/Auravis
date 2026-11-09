import { bool, sel, num, int, col, section } from '../../core/schema/dsl.js';
import { general } from '../shared/general.js';

export const sections = [
  general({ tag: 'Waveform', blendMode: 'add', scaleIsUniform: true }),
  section('Waveform', [
    int('audioProviderIndex', 'Audio Provider Index', 1, 1, 16, 1, { dynamic: 'providers' }),
    sel('waveformMode', 'Waveform Mode', 'mirror', [
      { value: 'line', label: 'Single Line' }, { value: 'mirror', label: 'Mirrored' }, { value: 'filled', label: 'Filled' },
    ]),
    int('sampleCount', 'Sample Count', 1024, 64, 4096, 64),
    num('amplitude', 'Amplitude', 1.6, 0.05, 8, 0.01),
    num('lineWidth', 'Line Width', 3, 0.5, 40, 0.5, { unit: 'px' }),
    bool('closedLoop', 'Closed Loop', false),
  ]),
  section('Appearance', [
    col('colorFrom', 'Color From', '#20e7ffff'),
    col('colorTo', 'Color To', '#a855f7ff'),
    num('glow', 'Glow', 12, 0, 80, 1, { unit: 'px' }),
    bool('fillArea', 'Fill Area', false),
    col('fillColor', 'Fill Color', '#20e7ff30'),
  ]),
];
