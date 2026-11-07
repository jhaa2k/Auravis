import { defineElement } from '../../core/schema/registry.js';
import { sections } from './schema.js';
import { renderMotionBlur } from './render.js';

export default defineElement({
  type: 'motionBlur', label: 'Motion Blur', icon: 'motion', kind: 'effect', sections,
  render: renderMotionBlur,
  dependency: (el) => el.props.targetImage,
});
