import { defineElement } from '../../core/schema/registry.js';
import { sections } from './schema.js';
import { renderImage } from './render.js';
import { detectKeyColor } from './pipeline.js';
import { resolveSource } from './render.js';

export default defineElement({
  type: 'image', label: 'Image', icon: 'image', kind: 'visual', sections,
  render: renderImage,
  /** Property actions (buttons). Return a props patch. */
  actions: {
    generatedAlbumArtHintForceGen: (el) => ({ generatedAlbumArtHintForceGen: el.props.generatedAlbumArtHintForceGen + 1 }),
    detectColorKeyNow: (el, { images, meta, cache }) => {
      const src = resolveSource({ images, meta, cache, diag() {} }, el);
      if (!src || src === 'keep') return { _error: 'Image not ready yet' };
      const hex = detectKeyColor(src.drawable, src.w, src.h);
      return hex ? { colorKey: hex, colorKeyEnabled: true } : { _error: 'Could not detect a background colour' };
    },
  },
});
