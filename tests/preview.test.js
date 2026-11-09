import { describe, it, expect } from 'vitest';
import '../src/elements/index.js';
import { listDefinitions, createElementData } from '../src/core/schema/registry.js';
import { isPreviewHittable } from '../src/ui/PreviewPanel.jsx';
import { makeHarness } from './helpers.js';

describe('preview layer hit testing', () => {
  it('allows every registered visual and effect element to be selected on the preview', () => {
    const definitions = listDefinitions().filter((def) => def.kind !== 'provider');
    expect(definitions.length).toBeGreaterThan(0);
    for (const def of definitions) {
      const element = createElementData(def.type, [], { visible: true });
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

describe('new effect layers render into the preview', () => {
  it.each(['rgbSplit', 'blurEffect'])('%s is visible and has a selectable preview transform by default', (type) => {
    const h = makeHarness('low');
    const provider = h.store.getState().elements.find((e) => e.type === 'audioProvider');
    const source = createElementData('image', [provider], { tag: 'Preview source' });
    const effect = createElementData(type, [provider, source], { tag: 'New effect' });
    h.store.setState((s) => ({ ...s, elements: [provider, source, effect] }));
    expect(effect.props.visible).toBe(true);
    h.frames(3);
    expect(h.vis.boxOf(effect.id)).toBeTruthy();
    expect(h.coverage()).toBeGreaterThan(0.002);
  });
});
