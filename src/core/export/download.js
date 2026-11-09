import { Capacitor, registerPlugin } from '@capacitor/core';

const NativeDownloads = registerPlugin('Downloads');
const CHUNK_SIZE = 256 * 1024;

export function download(blob, fileName) {
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = fileName;
  anchor.style.display = 'none';
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
  setTimeout(() => URL.revokeObjectURL(url), 10 * 60 * 1000);
  return url;
}

function readBase64(blob) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result).split(',')[1] || '');
    reader.onerror = () => reject(reader.error || new Error('Could not read the exported video.'));
    reader.readAsDataURL(blob);
  });
}

function throwIfAborted(signal) {
  if (signal?.aborted) throw new DOMException('The video export was canceled.', 'AbortError');
}

export async function saveExport(blob, fileName, onProgress = () => {}, { useSaf = false, signal } = {}) {
  throwIfAborted(signal);
  if (!Capacitor.isNativePlatform() || Capacitor.getPlatform() !== 'android') {
    const uri = download(blob, fileName);
    return { location: 'browser downloads', uri, mimeType: blob.type.split(';')[0] };
  }

  let id;
  try {
    const mimeType = (blob.type || 'video/webm').split(';')[0];
    const created = await NativeDownloads.beginSave({ fileName, mimeType, useSaf });
    id = created.id;
    for (let offset = 0; offset < blob.size; offset += CHUNK_SIZE) {
      throwIfAborted(signal);
      const base64 = await readBase64(blob.slice(offset, Math.min(offset + CHUNK_SIZE, blob.size)));
      throwIfAborted(signal);
      await NativeDownloads.writeChunk({ id, data: base64 });
      throwIfAborted(signal);
      onProgress(Math.round((Math.min(offset + CHUNK_SIZE, blob.size) / blob.size) * 100));
    }
    throwIfAborted(signal);
    const result = await NativeDownloads.finishSave({ id });
    return { location: result.location, uri: result.uri, mimeType };
  } catch (error) {
    if (id) {
      try {
        await NativeDownloads.abortSave({ id });
      } catch (cleanupError) {
        throw new Error(`${error.message || error}; cleanup failed: ${cleanupError.message || cleanupError}`);
      }
    }
    throw error;
  }
}

export async function openExport(saved) {
  if (!saved?.uri) throw new Error('The saved video location is missing.');
  if (Capacitor.isNativePlatform() && Capacitor.getPlatform() === 'android') {
    await NativeDownloads.openExport({ uri: saved.uri, mimeType: saved.mimeType });
    return;
  }
  const link = document.createElement('a');
  link.href = saved.uri;
  link.target = '_blank';
  link.rel = 'noopener';
  link.click();
}

export async function shareExport(saved, fileName) {
  if (!saved?.uri) throw new Error('The saved video location is missing.');
  if (Capacitor.isNativePlatform() && Capacitor.getPlatform() === 'android') {
    await NativeDownloads.shareExport({ uri: saved.uri, mimeType: saved.mimeType });
    return;
  }
  if (!navigator.share) throw new Error('Sharing is not supported on this device.');
  const file = new File([await (await fetch(saved.uri)).blob()], fileName, { type: saved.mimeType });
  await navigator.share({ title: fileName, files: [file] });
}
