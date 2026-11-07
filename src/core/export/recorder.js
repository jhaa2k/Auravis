export const EXPORT_FORMATS = [
  { value: 'video/mp4;codecs=avc1.42E01E,mp4a.40.2', label: 'MP4 · H.264 / AAC', extension: 'mp4' },
  { value: 'video/mp4;codecs=hvc1,mp4a.40.2', label: 'MP4 · H.265 / AAC', extension: 'mp4' },
  { value: 'video/webm;codecs=vp9,opus', label: 'WebM · VP9 / Opus', extension: 'webm' },
  { value: 'video/webm;codecs=vp8,opus', label: 'WebM · VP8 / Opus', extension: 'webm' },
];

export function supportedExportFormats() {
  if (typeof MediaRecorder === 'undefined') return [];
  return EXPORT_FORMATS.filter((format) => MediaRecorder.isTypeSupported(format.value));
}

export function startRecording({ canvas, audioStream, fps = 60, mimeType, videoBitrate = 8_000_000, audioBitrate = 192_000, timeslice = 1000 }) {
  if (typeof MediaRecorder === 'undefined') throw new Error('Recording is not supported in this browser.');
  if (!mimeType || !MediaRecorder.isTypeSupported(mimeType)) throw new Error('The selected video format is not supported by this device.');
  const stream = canvas.captureStream(fps);
  const ownedTracks = [];
  const stopTracks = () => {
    new Set([...stream.getTracks(), ...ownedTracks]).forEach((track) => track.stop());
  };
  const chunks = [];
  let recordingError;
  let rec;
  try {
    audioStream?.getAudioTracks().forEach((track) => {
      const clone = track.clone();
      ownedTracks.push(clone);
      stream.addTrack(clone);
    });
    rec = new MediaRecorder(stream, { mimeType, videoBitsPerSecond: videoBitrate, audioBitsPerSecond: audioBitrate });
    rec.ondataavailable = (e) => e.data.size && chunks.push(e.data);
    rec.onerror = (event) => { recordingError = event.error || new Error('The video encoder failed.'); };
    rec.start(timeslice);
  } catch (error) {
    stopTracks();
    throw error;
  }
  let stopPromise;
  const finish = (discard) => {
    if (stopPromise) return stopPromise;
    stopPromise = new Promise((resolve, reject) => {
      rec.onstop = () => recordingError
        ? reject(recordingError)
        : resolve(discard ? null : new Blob(chunks, { type: rec.mimeType || mimeType }));
      if (rec.state === 'inactive') {
        if (recordingError) reject(recordingError);
        else resolve(discard ? null : new Blob(chunks, { type: rec.mimeType || mimeType }));
      } else {
        try { rec.stop(); } catch (error) { reject(error); }
      }
    }).finally(() => {
      stopTracks();
    });
    return stopPromise;
  };
  return {
    mimeType: rec.mimeType,
    stop: () => finish(false),
    cancel: () => finish(true),
  };
}
