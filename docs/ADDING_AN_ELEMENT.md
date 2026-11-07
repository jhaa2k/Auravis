# Adding an element / feature without touching the rest

1. Create `src/elements/myThing/`.
2. `schema.js` – export `sections` using the DSL (`num, int, bool, sel, col, txt, area, vec2, meas, img, act`). Reuse `general({...})` for the shared transform/blend properties.
3. `render.js` – export `renderMyThing(rc, el)`:
   ```js
   const T = computeTransform(rc, el, boxW, boxH);   // shared transform + Measure Pos/Scale/Rot
   rc.record(el, T);                                   // enables selection overlay + motion data
   const v = rc.measure(el, 'measureSomething');       // null when disabled
   rc.diag(el.id, 'warning', 'message');               // surface problems to the user
   ```
   Keep per-element runtime state in `rc.state(el.id, init)` and caches in `rc.cache`.
4. `index.js`:
   ```js
   export default defineElement({ type: 'myThing', label: 'My Thing', icon: 'wave', kind: 'visual', sections, render });
   ```
   Optional: `actions` (buttons), `dependency(el, renderables)` (for effects that read another element).
5. Add one line to `src/elements/index.js`.

The Add menu, property panel, validation, defaults, reset, undo/redo, save/load and diagnostics work automatically. Add a render test in `tests/`.

Adding a **property** to an existing element = add one DSL line in its `schema.js` and read it in `render.js`. Old saved projects load fine because missing keys get defaults. If a change is breaking, bump `VERSION` in `core/project/projectModel.js` and migrate in `deserializeProject`.
