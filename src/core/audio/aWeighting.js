/**
 * IEC 61672 A-weighting in dB at frequency f (Hz). Calibrated so A(1 kHz) = 0 dB.
 * Real frequency-dependent curve — not an arbitrary visual multiplier.
 */
export function aWeightDb(f) {
  if (!(f > 0)) return -120;
  const f2 = f * f;
  const ra = (12194 ** 2 * f2 * f2) / ((f2 + 20.6 ** 2) * Math.sqrt((f2 + 107.7 ** 2) * (f2 + 737.9 ** 2)) * (f2 + 12194 ** 2));
  return 20 * Math.log10(ra) + 2.0;
}
