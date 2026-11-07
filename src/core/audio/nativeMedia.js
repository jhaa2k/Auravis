import { Capacitor, registerPlugin } from '@capacitor/core';

const NativeMedia = registerPlugin('NativeMedia');
const isAndroid = Capacitor.isNativePlatform() && Capacitor.getPlatform() === 'android';
let audio;
let permissionRequested = false;

export function attachNativeMedia(engine) {
  if (!isAndroid || audio) return;
  audio = engine;
  NativeMedia.addListener('mediaAction', ({ action, position, focusLoss }) => {
    if (action === 'play') audio.play();
    else if (action === 'pause') audio.pause({ focusLoss: Boolean(focusLoss) });
    else if (action === 'stop') audio.pause();
    else if (action === 'next') audio.next();
    else if (action === 'previous') audio.prev();
    else if (action === 'seek') audio.seek(position);
    else if (action === 'shuffle') audio.toggleShuffle();
    else if (action === 'repeat') audio.toggleRepeat();
  }).catch((error) => console.error('Could not attach Android media controls:', error));
}

export function syncNativeMedia(state) {
  if (!isAndroid) return;
  NativeMedia.updateMedia(state).catch((error) => console.error('Could not update Android media session:', error));
}

export async function requestNativeNotificationPermission() {
  if (!isAndroid || permissionRequested) return true;
  permissionRequested = true;
  try {
    const result = await NativeMedia.requestNotificationPermission();
    const granted = result.granted === true;
    if (!granted) window.dispatchEvent(new CustomEvent('auravis:notification-permission-denied'));
    return granted;
  } catch (error) {
    permissionRequested = false;
    console.error('Could not request Android notification permission:', error);
    return false;
  }
}
