// Element registry entry point. To add a new element: create src/elements/<name>/ (schema + render + index)
// and add ONE import line here. Nothing else in the app needs to change.
import audioProvider from './audioProvider/index.js';
import image from './image/index.js';
import barsSegments from './barsSegments/index.js';
import particles from './particles/index.js';
import text from './text/index.js';
import rgbSplit from './rgbSplit/index.js';
import blurEffect from './blurEffect/index.js';
import motionBlur from './motionBlur/index.js';

export const ELEMENTS = [audioProvider, image, barsSegments, particles, text, rgbSplit, blurEffect, motionBlur];
