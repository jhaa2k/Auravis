import { Capacitor, registerPlugin } from '@capacitor/core';

const NativeVisualizer = registerPlugin('NativeVisualizer');
export const isNativeVisualizerAvailable =
  Capacitor.isNativePlatform() && Capacitor.getPlatform() === 'android';

export const nativeVisualizer = {
  async pickAudio() {
    if (!isNativeVisualizerAvailable) throw new Error('Native audio picker is available only on Android.');
    return NativeVisualizer.pickAudio();
  },
  async load(uri, autoplay = false) {
    return NativeVisualizer.load({ uri, autoplay });
  },
  async play() { return NativeVisualizer.play(); },
  async pause() { return NativeVisualizer.pause(); },
  async seek(position) { return NativeVisualizer.seek({ position }); },
  async setVolume(volume) { return NativeVisualizer.setVolume({ volume }); },
  async getState() { return NativeVisualizer.getState(); },
  async release() { return NativeVisualizer.release(); },
  addListener(eventName, listener) { return NativeVisualizer.addListener(eventName, listener); },
};
