/** Real-time canvas + audio recording (MediaRecorder). Returns a controller; stop() resolves to a Blob. */
export function pickMime() {
  const list = ['video/mp4;codecs=avc1', 'video/webm;codecs=vp9,opus', 'video/webm;codecs=vp8,opus', 'video/webm'];
  return list.find((m) => typeof MediaRecorder !== 'undefined' && MediaRecorder.isTypeSupported(m)) || '';
}
export function startRecording({ canvas, audioStream, fps = 60, bitrate = 8_000_000 }) {
  if (typeof MediaRecorder === 'undefined') throw new Error('Recording is not supported in this browser.');
  const stream = canvas.captureStream(fps);
  audioStream?.getAudioTracks().forEach((t) => stream.addTrack(t));
  const mimeType = pickMime();
  const rec = new MediaRecorder(stream, { mimeType: mimeType || undefined, videoBitsPerSecond: bitrate });
  const chunks = [];
  rec.ondataavailable = (e) => e.data.size && chunks.push(e.data);
  rec.start(500);
  return {
    mimeType: rec.mimeType,
    stop: () => new Promise((resolve) => {
      rec.onstop = () => resolve(new Blob(chunks, { type: rec.mimeType || 'video/webm' }));
      rec.stop();
    }),
  };
}
