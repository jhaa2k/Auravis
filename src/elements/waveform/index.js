import { defineElement } from '../../core/schema/registry.js';
import { sections } from './schema.js';
import { renderWaveform } from './render.js';

export default defineElement({ type: 'waveform', label: 'Audio Waveform', icon: 'audio-waveform', kind: 'visual', sections, render: renderWaveform });
