# Auravis

Element-based audio visualization studio that runs entirely in the browser (React + Vite, no backend).
Build a scene from **Audio Provider, Image, RGB Split, Blur Effect, Bars/Segments, Particles, Text and Motion Blur**
elements, drive any property from the audio with the measurement system, save projects, export video.

## Run
```bash
npm install
npm run dev      # http://localhost:5173
npm test         # 63 tests: DSP, schema, store, every element through the real compositor, React UI
npm run build    # production build in dist/
```

## Build an Android APK
Install JDK 21 and the Android SDK, set `JAVA_HOME` and `ANDROID_HOME` (or
`ANDROID_SDK_ROOT`), then run:
```bash
npm run android:build
```
The installable debug APK is written to `android/app/build/outputs/apk/debug/app-debug.apk`.
GitHub Actions also builds it on pushes to `main`; download `auravis-debug-apk` from the workflow run's artifacts.

## Publish on GitHub Pages
1. Push this folder to a GitHub repo (branch `main`).
2. **Settings → Pages → Build and deployment → Source: GitHub Actions**.
3. `.github/workflows/deploy.yml` runs the tests, builds and deploys to `https://<user>.github.io/<repo>/`.
(`vite.config.js` uses `base: './'`, so any repo name works.)

## Using it
- **Demo** button plays a built-in generated track; **Open** loads your own audio files.
- Add elements with **Add**, select one, edit its properties (every property has a reset button).
- Every `Measure …` property is a full mapping editor: source → input range → curve → output range → multiplier/offset → smoothing.
- Drag on the canvas to move, drag the orange handle to scale. `Space` play/pause, `Ctrl+Z` undo, `Ctrl+D` duplicate.
- **Projects**: save/load/duplicate/rename/delete in the browser, import/export `.auravis.json` (images and fonts embedded). The working session autosaves.
- **Export**: Project tab → Record (real-time canvas + audio via MediaRecorder).

## Code map
| Folder | Purpose |
|---|---|
| `src/core/audio` | AudioEngine, FFT (Hann, Web Worker), A-weighting, **SpectrumProvider** pipeline, demo track |
| `src/core/measure` | measurement sources + mapping/smoothing engine |
| `src/core/schema` | property DSL, validation/sanitising, element registry |
| `src/core/render` | compositor loop, render context, transform system, blur, masks, shapes, effect helpers |
| `src/core/store` | external store, actions (undo/redo), default project |
| `src/core/project` | project model (versioned), persistence, import/export |
| `src/core/assets` | IndexedDB asset store, image cache, font store |
| `src/elements/<name>` | **one folder per element**: `schema.js` (properties) + `render.js` (drawing) + `index.js` |
| `src/ui`, `src/app` | React UI (fields are generated from the schemas) |
| `tests`, `docs` | tests and documentation |

See `docs/ARCHITECTURE.md`, `docs/ADDING_AN_ELEMENT.md` and `docs/SPEC_COVERAGE.md`.
