import { defineElement } from '../../core/schema/registry.js';
import { sections } from './schema.js';
import { renderBars } from './render.js';

export default defineElement({ type: 'barsSegments', label: 'Bars/Segments', icon: 'bars', kind: 'visual', sections, render: renderBars });
