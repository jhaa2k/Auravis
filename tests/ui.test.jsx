import { describe, it, expect } from 'vitest';
import React from 'react';
import { renderToString } from 'react-dom/server';
import * as nc from '@napi-rs/canvas';
import { setCanvasFactory } from '../src/core/platform.js';
import { store, actions } from '../src/app/services.js';
import { listDefinitions } from '../src/core/schema/registry.js';
import App from '../src/app/App.jsx';
import PropertiesPanel from '../src/ui/PropertiesPanel.jsx';
import SettingsPanel from '../src/ui/SettingsPanel.jsx';
import LayerList from '../src/ui/LayerList.jsx';
import TransportBar from '../src/ui/TransportBar.jsx';

setCanvasFactory((w, h) => nc.createCanvas(w, h));

describe('React UI renders without runtime errors', () => {
  it('App shell', () => {
    const html = renderToString(<App />);
    expect(html).toContain('Auravis');
    expect(html).toContain('Elements');
    expect(html).toContain('Export');
    expect(html).toContain('1920');
    expect(html).toContain('1080');
    expect(html).toContain('FPS');
  });
  it('property panel renders every property of every element type', () => {
    for (const def of listDefinitions()) {
      const el = actions.addElement(def.type);
      actions.select(el.id);
      const html = renderToString(<PropertiesPanel />);
      expect(html, def.type).toContain(def.label);
      for (const section of def.sections) expect(html, `${def.type}: ${section.name}`).toContain(section.name);
    }
  });
  it('property panel shows every section label of an Image (sections open)', () => {
    const el = store.getState().elements.find((e) => e.type === 'image');
    actions.select(el.id);
    const html = renderToString(<PropertiesPanel />);
    for (const s of ['General', 'Image', 'Color', 'Color Key', 'Blur', 'Generated Album Art']) expect(html).toContain(s);
  });
  it('layers, transport and settings', () => {
    expect(renderToString(<LayerList />)).toContain('Add');
    expect(renderToString(<TransportBar />)).toContain('Open');
    expect(renderToString(<TransportBar />)).not.toContain('Demo');
    expect(renderToString(<SettingsPanel />)).toContain('Export video');
  });
});
