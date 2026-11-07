import { defineElement } from '../../core/schema/registry.js';
import { sections } from './schema.js';
import { renderText } from './render.js';

export default defineElement({ type: 'text', label: 'Text', icon: 'text', kind: 'visual', sections, render: renderText });
