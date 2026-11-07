import { defineElement } from '../../core/schema/registry.js';
import { sections } from './schema.js';
import { renderBlurEffect } from './render.js';

export default defineElement({
  type: 'blurEffect', label: 'Blur Effect', icon: 'blur', kind: 'effect', sections,
  render: renderBlurEffect,
  dependency: (el, renderables) => (el.props.sourceCompositionIndex > 0 ? renderables[el.props.sourceCompositionIndex - 1]?.id : 'composition'),
});
