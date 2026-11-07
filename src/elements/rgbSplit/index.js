import { defineElement } from '../../core/schema/registry.js';
import { sections } from './schema.js';
import { renderRgbSplit } from './render.js';

export default defineElement({
  type: 'rgbSplit', label: 'RGB Split', icon: 'split', kind: 'effect', sections,
  render: renderRgbSplit,
  dependency: (el) => el.props.targetImage,
});
