// FFT runs off the UI thread. The main thread posts a time-domain window, we reply with magnitudes.
import { magnitudeSpectrum } from './fft.js';

self.onmessage = (e) => {
  const { size, buf } = e.data;
  const out = new Float32Array(size / 2);
  magnitudeSpectrum(buf, size, out);
  self.postMessage({ size, mags: out }, [out.buffer]);
};
