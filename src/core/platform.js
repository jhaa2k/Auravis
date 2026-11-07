// Canvas factory abstraction: the browser uses <canvas>, tests inject @napi-rs/canvas.
let factory = (w, h) => {
  const c = document.createElement('canvas');
  c.width = w; c.height = h;
  return c;
};
export const setCanvasFactory = (f) => { factory = f; };
export const createCanvas = (w, h) => factory(Math.max(1, Math.round(w)), Math.max(1, Math.round(h)));
export const get2d = (canvas, readback = false) => canvas.getContext('2d', readback ? { willReadFrequently: true } : undefined);
