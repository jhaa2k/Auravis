import { defineElement } from '../../core/schema/registry.js';
import { sections } from './schema.js';
import { renderParticles } from './render.js';

export default defineElement({ type: 'particles', label: 'Particles', icon: 'particles', kind: 'visual', sections, render: renderParticles });
