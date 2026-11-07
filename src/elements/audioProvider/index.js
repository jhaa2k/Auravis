import { defineElement } from '../../core/schema/registry.js';
import { sections } from './schema.js';

// Audio Provider has no drawing code: the Visualizer runs it (core/audio/spectrumProvider.js)
// and every other element reads its processed output through the measurement engine.
export default defineElement({ type: 'audioProvider', label: 'Audio Provider', icon: 'wave', kind: 'provider', sections });
