# Architecture

```
AudioEngine ──analyze()──► frame {timeDomain, rms/peak/L/R}
      │                         │
 FftService (worker) ◄──────────┘   one FFT per size per frame
      │ magnitudes
SpectrumProvider × N  (one per Audio Provider element)
      │ samples[], bass/mid/treble, beat, valueAtHz()
      ▼
Visualizer.renderFrame ── RenderContext ── element.render(rc, el) bottom → top
                                │
              rc.measure(el,key) → measurement engine (mapValue + smoothing, cached per frame)
              computeTransform   → shared Position/Anchor/Alignment/Scale/Rotation system
              rc.resolveSource   → effect targets (composition below / element rendered alone)
```

## Rules the code follows
- **State is data.** Elements are plain `{id,type,locked,props}` objects in an external store. Nothing mutates them; every change goes through `actions.js` (validation, unique tags, undo/redo with coalescing). The renderer only reads the store.
- **Schema drives everything.** A property is defined once (`src/core/schema/dsl.js`): default, range, options, label. The UI, validation, defaults, reset, save/load and tests all derive from it. Unknown / invalid values are sanitised, never trusted.
- **One shared General section** (`elements/shared/general.js`) and one transform function serve every visual element, so transform behaviour can't drift between elements.
- **Audio is analysed once.** Elements never touch audio; they read provider output through measurements.
- **Failures are visible.** Renderers report problems via `rc.diag(...)` (missing image, bad provider index, circular reference…); they show as badges and in the Properties panel instead of failing silently.
- **Performance.** Pooled offscreen buffers, cached image pipelines/sprites/text textures, struct-of-arrays particle pool with swap-remove, reduced-resolution effects, quality tiers + adaptive downgrade.

## Coordinate system
Logical canvas (default 1920×1080). `Position` is in logical px relative to the **Alignment Position** point; `Anchor X/Y` (0–1) is the element's own pivot. The preview canvas is drawn at `scale × logical size`, so output is resolution independent (export can render at a different scale).

## Effects
RGB Split / Blur / Motion Blur resolve a **source** (the composition below, or any element rendered alone, hidden or not), process it, then `finishEffect` builds the effect layer (original under/over + processed with *Blend Mode Content*) and composites it with the element *Blend Mode*. Composition-below sources replace the composition. Cycles are detected statically and at render time.
