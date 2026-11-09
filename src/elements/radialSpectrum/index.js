import { defineElement } from '../../core/schema/registry.js';
import { sections } from './schema.js';
import { renderRadialSpectrum } from './render.js';

export default defineElement({ type: 'radialSpectrum', label: 'Radial Spectrum', icon: 'aperture', kind: 'visual', sections, render: renderRadialSpectrum });
