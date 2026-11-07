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
import MusicPanel from '../src/ui/MusicPanel.jsx';
import FieldRenderer from '../src/ui/fields/FieldRenderer.jsx';

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
  it('property panel keeps property sections collapsed until opened', () => {
    const el = store.getState().elements.find((e) => e.type === 'image');
    actions.select(el.id);
    const html = renderToString(<PropertiesPanel />);
    for (const s of ['General', 'Image', 'Color', 'Color Key', 'Blur', 'Generated Album Art']) expect(html).toContain(s);
    expect(html).not.toContain('class="section-body"');
  });
  it('uses double-tap slider reset instead of showing the slider reset button', () => {
    const definition = listDefinitions().find((item) => item.sections.some((section) => section.props.some((property) => ['number', 'int'].includes(property.type) && !property.dynamic)));
    const property = definition.sections.flatMap((section) => section.props).find((item) => ['number', 'int'].includes(item.type) && !item.dynamic);
    const changedValue = property.default === property.min ? property.default + property.step : property.default - property.step;
    const html = renderToString(<FieldRenderer def={property} el={{ props: { [property.key]: changedValue } }} elements={[]} onChange={() => {}} onReset={() => {}} onAction={() => {}} />);
    expect(html).toContain('Double-tap to reset to default');
    expect(html).not.toContain(`aria-label="Reset ${property.label}"`);
  });
  it('layers, music, transport and settings', () => {
    expect(renderToString(<LayerList />)).toContain('Add');
    expect(renderToString(<MusicPanel />)).toContain('Import');
    const transport = renderToString(<TransportBar />);
    expect(transport).toContain('Playback controls');
    expect(transport).toContain('No track selected');
    expect(transport).toContain('class="now"');
    expect(renderToString(<SettingsPanel />)).toContain('Canvas helpers');
    expect(renderToString(<SettingsPanel mode="export" />)).toContain('Export video');
  });
});
