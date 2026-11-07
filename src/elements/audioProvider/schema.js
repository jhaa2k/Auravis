import { txt, sel, num, int, bool, vec2, section } from '../../core/schema/dsl.js';
import { FFT_SIZES } from '../../core/audio/fft.js';

export const sections = [
  section('General', [
    txt('tag', 'Tag', ''),
    sel('sampleProvider', 'Sample Provider', 'spectrum', [{ value: 'spectrum', label: 'Spectrum' }]),
  ]),
  section('Spectrum', [
    int('sampleOutCount', 'Sample Out Count', 64, 4, 1024, 1),
    bool('mirrorSamples', 'Mirror Samples', false),
    int('repeatSamples', 'Repeat Samples', 1, 1, 16, 1),
    vec2('startEndGap', 'Star And End Gap', [0, 0], 0, 45, 1, { unit: '%', hint: 'Start and End Gap (percent of the output unused at each end)' }),
    num('smooth', 'Smooth', 0.6, 0, 0.98, 0.01),
    num('preSmooth', 'Pre Smooth', 0.3, 0, 1, 0.01),
    int('filterRadius', 'Filter Radius', 2, 0, 16, 1),
    num('filterStrength', 'Filter Strength', 0.5, 0, 1, 0.01),
    bool('aWeight', 'AWeight', false),
    num('outputMultiplier', 'Output Multiplier', 1, 0, 8, 0.01),
  ]),
  section('Spectrum Hz', [
    num('lowerHz', 'Lower Hz', 40, 20, 20000, 1, { unit: 'Hz' }),
    num('higherHz', 'Higher Hz', 12000, 20, 22050, 1, { unit: 'Hz' }),
    num('hzLinearFactor', 'Hz Linear Factor', 0.2, 0, 1, 0.01),
    num('freqShift', 'Freq Shift', 0, -1, 1, 0.01),
  ]),
  section('Beat', [
    num('beatSmooth', 'Beat Smooth', 0.85, 0, 0.99, 0.01),
    int('beatRangeBarFirst', 'Beat Range Bar First', 0, 0, 1023, 1),
    int('beatRangeBarLast', 'Beat Range Bar Last', 8, 0, 1023, 1),
    num('beatRangeValueLower', 'Beat Range Value Lower', 0.02, 0, 1, 0.005),
    num('beatRangeValueHigher', 'Beat Range Value Higher', 0.2, 0, 2, 0.005),
  ]),
  section('Performance', [
    sel('fftSize', 'Fft Size', 2048, FFT_SIZES.map((n) => ({ value: n, label: String(n) }))),
  ]),
];
