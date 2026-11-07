import { bool, sel, num, int, col, vec2, img, meas, section } from '../../core/schema/dsl.js';
import { general } from '../shared/general.js';

export const sections = [
  general({ rotation: false, measureRot: false }),
  section('Overall', [
    col('color', 'Color', '#ffffffff', { hint: 'Multiplied with the particle colours' }),
    int('countLimit', 'Count Limit', 600, 1, 8000, 1, { hint: 'Capped further by the active quality tier' }),
    bool('mirrorX', 'Mirror X', false),
    bool('mirrorY', 'Mirror Y', false),
    num('perspectiveDepth', 'Perspective Depth', 600, 0, 5000, 1),
    num('perspectiveFov', 'Perspective Fov', 60, 10, 140, 1, { unit: '°' }),
    sel('spawnArea', 'Spawn Area', 'rectangle', [{ value: 'point', label: 'Point' }, { value: 'rectangle', label: 'Rectangle' }, { value: 'circle', label: 'Circle' }]),
    vec2('spawnAreaSize', 'Spawn Area Size', [800, 300], 0, 4000, 1, { unit: 'px' }),
    sel('vectorRelativeToCenter', 'Vector Relative To Center', 'off', [
      { value: 'off', label: 'Off (use Vector Angle)' }, { value: 'outward', label: 'Outward' }, { value: 'inward', label: 'Inward' }, { value: 'swirl', label: 'Swirl' }]),
    bool('useRandomVector', 'Use Random Vector', false),
    num('vectorAngle', 'Vector Angle', 90, -360, 360, 1, { unit: '°' }),
    num('vectorAngleZ', 'Vector Angle Z', 0, -90, 90, 1, { unit: '°' }),
    sel('forceField', 'Force Field', 'none', [
      { value: 'none', label: 'None' }, { value: 'attraction', label: 'Attraction' }, { value: 'repulsion', label: 'Repulsion' },
      { value: 'directional', label: 'Directional' }, { value: 'swirl', label: 'Swirl' }]),
    num('forceFieldStrength', 'Force Field Strength', 300, -5000, 5000, 1),
    vec2('forceFieldPosition', 'Force Field Position', [0, 0], -3000, 3000, 1, { unit: 'px' }),
  ]),
  section('Appearance', [
    img('customImage', 'Custom Image'),
    num('particleScale', 'Particle Scale', 1, 0.05, 10, 0.01),
    num('trailLength', 'Trail Length', 0, 0, 2, 0.01, { unit: 's' }),
    col('colorFrom', 'Color From', '#ffd9b0ff'),
    col('colorTo', 'Color To', '#ff6b9a00'),
    num('fadeInAndOutTime', 'Fade In And Out Time', 0.5, 0, 5, 0.01, { unit: 's' }),
    bool('orientToVelocity', 'Orient To Velocity', false),
    num('velocityAngle', 'Velocity Angle', 0, -360, 360, 1, { unit: '°', hint: 'Sprite rotation (relative to movement when Orient To Velocity is on)' }),
    num('sizeAspectRatio', 'Size Aspect Ratio', 1, 0.1, 10, 0.01),
    num('startSize', 'Start Size', 4, 0, 400, 0.5),
    num('fadeInSize', 'Fade In Size', 12, 0, 400, 0.5),
    num('endSize', 'End Size', 3, 0, 400, 0.5),
    num('endSizeRandom', 'End Size Random', 0, 0, 400, 0.5),
    num('endSizeZFactor', 'End Size Z Factor', 0, -5, 5, 0.01),
    num('nearCameraFadeOutDistance', 'Near Camera Fade Out Distance', 150, 0, 3000, 1),
  ]),
  section('Behaviour', [
    num('spawnTime', 'Spawn Time', 0.02, 0.001, 5, 0.001, { unit: 's', hint: 'Seconds between spawns' }),
    meas('measureOverallSpeed', 'Measure Overall Speed', { enabled: true, source: 'beat', a: 1.5, b: 1.5, labels: { a: 'A (X Amount)', b: 'B (Y Amount)' } }),
    num('speed', 'Speed', 120, 0, 3000, 1, { unit: 'px/s' }),
    num('speedRandom', 'Speed Random', 0.3, 0, 1, 0.01),
    num('lifetime', 'Lifetime', 4, 0.1, 30, 0.1, { unit: 's' }),
    num('gravity', 'Gravity', 0, -3000, 3000, 1, { unit: 'px/s²' }),
  ]),
  section('Side Wave', [
    num('sideSineWaveFreq', 'Side Sine Wave Freq', 0.5, 0, 10, 0.01, { unit: 'Hz' }),
    num('sideSineWaveFreqRandom', 'Side Sine Wave Freq Random', 0.3, 0, 1, 0.01),
    num('sideSineWaveMag', 'Side Sine Wave Mag', 20, 0, 500, 0.5, { unit: 'px' }),
    num('sideSineWaveMagRandom', 'Side Sine Wave Mag Random', 0.3, 0, 1, 0.01),
  ]),
];
