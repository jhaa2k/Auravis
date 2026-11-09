import { describe, it, expect } from 'vitest';
import '../src/elements/index.js';
import { listDefinitions, createElementData } from '../src/core/schema/registry.js';
import { isPreviewHittable } from '../src/ui/PreviewPanel.jsx';

describe('preview layer hit testing', () => {
  it('allows every registered visual and effect element to be selected on the preview', () => {
    const definitions = listDefinitions().filter((def) => def.kind !== 'provider');
    expect(definitions.length).toBeGreaterThan(0);
    for (const def of definitions) {
      const element = createElementData(def.type, []);
      expect(isPreviewHittable(element), def.type).toBe(true);
    }
  });

  it('does not treat audio providers or hidden layers as preview hit targets', () => {
    const provider = createElementData('audioProvider', []);
    const image = createElementData('image', []);
    expect(isPreviewHittable(provider)).toBe(false);
    expect(isPreviewHittable({ ...image, props: { ...image.props, visible: false } })).toBe(false);
  });
});
