import { describe, expect, it } from 'vitest';
import '../src/elements/index.js';
import { listDefinitions, getDefinition, createElementData } from '../src/core/schema/registry.js';
import { createStore } from '../src/core/store/store.js';
import { createActions } from '../src/core/store/actions.js';
import { defaultProjectState } from '../src/core/store/defaultProject.js';

describe('element registry and add workflow', () => {
  it('registers every visual/effect element with a renderer', () => {
    const renderables = listDefinitions().filter((d) => d.kind !== 'provider');
    expect(renderables.length).toBeGreaterThan(0);
    for (const def of renderables) {
      expect(typeof def.render, `${def.type} must provide a render function`).toBe('function');
      expect(def.sections.length).toBeGreaterThan(0);
    }
  });

  it('creates newly added image elements visible by default', () => {
    const image = createElementData('image', []);
    expect(image.props.visible).toBe(true);
  });

  it('adds, selects, updates and deletes an element through the public actions', () => {
    const store = createStore(defaultProjectState());
    const actions = createActions(store);
    const created = actions.addElement('barsSegments');
    expect(store.getState().elements.some((e) => e.id === created.id)).toBe(true);
    expect(store.getState().selectedId).toBe(created.id);

    actions.updateProps(created.id, { heightScale: 12 });
    expect(store.getState().elements.find((e) => e.id === created.id).props.heightScale).toBe(12);

    actions.deleteElement(created.id);
    expect(store.getState().elements.some((e) => e.id === created.id)).toBe(false);
  });

  it('resolves every default element type after registry initialization', () => {
    const state = defaultProjectState();
    for (const el of state.elements) expect(getDefinition(el.type)).toBeTruthy();
  });
});
