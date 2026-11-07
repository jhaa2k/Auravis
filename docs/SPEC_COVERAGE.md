# Spec coverage and interpretation notes

All eight element types, their sections and property names follow the build prompt. Where the prompt was open to
interpretation, this is what the code does (so behaviour is documented, not hidden).

## Shared
- **General**: Tag, Visible, Blend Mode, Position, Anchor X/Y, Measure Pos, Alignment Position (9 points), Scale Is Uniform, Scale, Measure Scale, Rotation, Measure Rot. Particles has no Rotation/Measure Rot; Motion Blur has no Measure Rot (as specified).
- **Measure …** properties: source (spectrum sample / frequency band / bass / mid / treble / beat / RMS / peak / level / left / right), provider index, input range, output range, multiplier, offset, smoothing, response curve, invert, axis (position), A/B where specified.
- Measure Pos adds the mapped value to Position along the chosen axis; Measure Scale multiplies Scale; Measure Rot adds degrees.
- Blend modes map to canvas compositing. *Alpha Blend* = normal blend weighted by the colour alpha.
- Stored colours are `#rrggbbaa`; alpha is meaningful (tint strength for Image, opacity elsewhere).

## Audio Provider
Pipeline order: Pre Smooth (spatial) → Hz remap (Lower/Higher Hz, Hz Linear Factor log↔linear blend, Freq Shift) → dB + real IEC A-weighting → Filter → Output Multiplier → Mirror / Repeat / Start-End Gap → Smooth. FFT: Hann window, own radix-2 implementation, Web Worker (≈1 frame latency). Mirror places low frequencies at the centre and copies values (energy is never summed). Beat = positive spectral flux of the selected bar range vs. a slow baseline, mapped by the lower/higher thresholds, with attack/decay smoothing.

## Image
Pipeline: fit/crop (cover / contain / stretch) → blurred border → shape clip → mask (alpha / luminance / inverted / normal = luminance×alpha) → colour key + saturation → blur. Per frame: tint (Color → Color To via Measure Color Blend), transform, blend. *Measure Animation Speed*: rotation drift = A + B × measured value (deg/s). Source priority: Custom Image → Generated Album Art. Generated art is a **local procedural generator** (seeded by track title/artist; hue shift, no-text, colour guidance, Force Gen re-roll) — no network, no stock placeholder. Auto Detect Color Key samples the border colours.
Shapes: Rectangle (4:3), Square, Circle, Ellipse, Rounded Rectangle, Hexagon, Star, Heart, Triangle, Diamond.

## Effects
- **RGB Split**: channels extracted per pixel, recoloured with Split Color 0/1/2, offset horizontally (−/0/+), recombined additively. Runs at reduced working resolution (quality tier).
- **Blur Effect**: three layers (radius ×1/×2/×4, own scale/colour/opacity), optional mask (luminance×alpha), Source Composition Index (0 = composition below, N = N-th element).
- **Motion Blur**: real motion vectors (Transform / Measured / Target / Composition) with absolute or relative modes; Measure Pos A = amount (px), B = response speed. Averaged samples along the vector.
- Shared: Blend Mode Content, Color, Target Image, Show Unblurred Content (+ Under).

## Bars/Segments
Per-bar heights from provider samples with Flip Input, Height/Min/Max scale, Softness, Reaction Delay and per-bar Accumulated Delay (history ring buffer), Color Blend Offset, shape library + validated custom SVG path, two segments (colour gradient across bars, fixed or dynamic height, mirror, flip every other).

## Particles
Pooled struct-of-arrays system; spawn areas, radial/random/angled vectors with Z angle, perspective (depth, FOV, near-camera fade), force fields (attraction/repulsion/directional/swirl), gravity, side sine wave, size over life (start → fade-in → end, Z factor), trails, mirror X/Y, custom image sprites. Count Limit is capped by the quality tier and reported.

## Text
Dynamic placeholders (`{title} {artist} {time} {duration} {remaining} {progress} {date} {clock}`), built-in web fonts, imported TTF/OTF/WOFF fonts (persisted), weight/style, missing-font warning.

## Extensions (not in the prompt, added where something was needed to make a property usable)
Segment *Enabled*, Image *Blurred Border Radius*, RGB Split / Blur *Measure …* amount properties, Motion Blur *Sample Count*, Particles *Spawn Area Size* and *Orient To Velocity*, Text *Text Align*.

## Known limits
- Rendering uses Canvas 2D (browser GPU-accelerated), not raw WebGL; effects use canvas compositing plus typed-array passes.
- Tested with headless canvas + React server rendering (63 tests). It has **not** been exercised in a real browser session by the author: check audio playback, recording and file import after the first deploy.
- Video export is real-time (MediaRecorder), format depends on the browser.
- Microphone input is not included.
