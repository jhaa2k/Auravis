import { useState } from 'react';
import { useApp, useStore } from '../app/hooks.js';
import { actions, diagStore } from '../app/services.js';
import { getDefinition, listDefinitions } from '../core/schema/registry.js';
import Icon from './Icon.jsx';

const KIND = { provider: 'Audio analysis', visual: 'Visual element', effect: 'Effect' };

function AddMenu({ onClose }) {
  return (
    <div className="menu" role="menu">
      {listDefinitions().map((d) => (
        <button key={d.type} role="menuitem" onClick={() => { actions.addElement(d.type); onClose(); }}>
          <Icon name={d.icon} size={18} /><span><b>{d.label}</b><small>{KIND[d.kind]}</small></span>
        </button>
      ))}
    </div>
  );
}

export default function LayerList() {
  const elements = useApp((s) => s.elements);
  const selectedId = useApp((s) => s.selectedId);
  const diags = useStore(diagStore);
  const [menu, setMenu] = useState(false);
  const [dragFrom, setDragFrom] = useState(null);
  const sel = elements.find((e) => e.id === selectedId);
  const rows = elements.map((e, i) => ({ e, i })).reverse(); // top of the stack first

  return (
    <div className="layers">
      <div className="panel-title">
        <span>Elements</span>
        <div className="row-gap">
          <button className="icon-btn" title="Duplicate" disabled={!sel} onClick={() => actions.duplicateElement(sel.id)}><Icon name="copy" /></button>
          <button className="icon-btn" title="Move up" disabled={!sel} onClick={() => actions.moveElement(sel.id, 1)}><Icon name="up" /></button>
          <button className="icon-btn" title="Move down" disabled={!sel} onClick={() => actions.moveElement(sel.id, -1)}><Icon name="down" /></button>
          <button className="icon-btn danger" title="Delete" disabled={!sel} onClick={() => actions.deleteElement(sel.id)}><Icon name="trash" /></button>
          <div className="menu-wrap">
            <button className="btn small primary" onClick={() => setMenu(!menu)} aria-haspopup="menu" aria-expanded={menu}><Icon name="plus" size={15} />Add</button>
            {menu && <><div className="scrim" onClick={() => setMenu(false)} /><AddMenu onClose={() => setMenu(false)} /></>}
          </div>
        </div>
      </div>
      <ul className="layer-list">
        {rows.map(({ e, i }) => {
          const def = getDefinition(e.type), probs = diags[e.id] || [];
          const worst = probs.some((p) => p.level === 'error') ? 'error' : probs.some((p) => p.level === 'warning') ? 'warn' : null;
          return (
            <li key={e.id} className={`layer ${e.id === selectedId ? 'selected' : ''} ${e.props.visible === false ? 'off' : ''}`} draggable
              onDragStart={() => setDragFrom(i)} onDragOver={(ev) => ev.preventDefault()}
              onDrop={() => { if (dragFrom !== null) actions.reorderElement(dragFrom, i); setDragFrom(null); }}
              onClick={() => actions.select(e.id)}>
              <span className="grip"><Icon name="drag" size={14} /></span>
              <span className="layer-icon"><Icon name={def.icon} size={17} /></span>
              <span className="layer-name"><b>{e.props.tag}</b><small>{def.label}</small></span>
              {worst && <span className={`badge ${worst}`} title={probs.map((p) => p.message).join('\n')}><Icon name={worst === 'error' ? 'error' : 'warn'} size={14} /></span>}
              <button className="icon-btn" title={e.locked ? 'Unlock' : 'Lock (protect from canvas dragging)'} onClick={(ev) => { ev.stopPropagation(); actions.setLocked(e.id, !e.locked); }}><Icon name={e.locked ? 'lock' : 'unlock'} size={16} /></button>
              {def.kind !== 'provider' && (
                <button className="icon-btn" title={e.props.visible ? 'Hide' : 'Show'} onClick={(ev) => { ev.stopPropagation(); actions.setVisible(e.id, !e.props.visible); }}><Icon name={e.props.visible ? 'eye' : 'eyeOff'} size={16} /></button>
              )}
            </li>
          );
        })}
      </ul>
      <p className="stack-note">Top of the list draws on top. Drag to reorder.</p>
    </div>
  );
}
