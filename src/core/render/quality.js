// Adaptive quality tiers. `scale` is canvas pixels per logical pixel (logical canvas is e.g. 1920×1080).
export const QUALITY = {
  low:    { label: 'Low',    scale: 0.33, particles: 1500, blurDivider: 4, rgbWidth: 480,  motionSamples: 8 },
  medium: { label: 'Medium', scale: 0.5,  particles: 3000, blurDivider: 3, rgbWidth: 720,  motionSamples: 12 },
  high:   { label: 'High',   scale: 0.75, particles: 5000, blurDivider: 2, rgbWidth: 960,  motionSamples: 16 },
  ultra:  { label: 'Ultra',  scale: 1,    particles: 8000, blurDivider: 2, rgbWidth: 1280, motionSamples: 24 },
};
export const QUALITY_ORDER = ['low', 'medium', 'high', 'ultra'];
