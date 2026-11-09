import { afterEach, describe, expect, it, vi } from 'vitest';
import { EXPORT_FORMATS, startRecording, supportedExportFormats } from '../src/core/export/recorder.js';

class FakeMediaRecorder {
  static supported = new Set([EXPORT_FORMATS[0].value, EXPORT_FORMATS[2].value]);
  static isTypeSupported(type) { return FakeMediaRecorder.supported.has(type); }

  constructor(stream, options) {
    this.stream = stream;
    this.options = options;
    this.mimeType = options.mimeType;
    this.state = 'inactive';
  }

  start(timeslice) {
    this.timeslice = timeslice;
    this.state = 'recording';
  }

  stop() {
    this.state = 'inactive';
    this.ondataavailable?.({ data: new Blob(['video']) });
    this.onstop?.();
  }
}

afterEach(() => vi.unstubAllGlobals());

function createCapture() {
  const videoTrack = { stop: vi.fn() };
  const clonedAudioTrack = { stop: vi.fn() };
  const stream = {
    tracks: [videoTrack],
    addTrack(track) { this.tracks.push(track); },
    getTracks() { return this.tracks; },
    getVideoTracks() { return this.tracks.filter((track) => track === videoTrack); },
  };
  const canvas = { captureStream: vi.fn(() => stream) };
  const audioStream = { getAudioTracks: () => [{ clone: () => clonedAudioTrack }] };
  return { canvas, audioStream, stream, videoTrack, clonedAudioTrack };
}

describe('video export recorder', () => {
  it('only offers formats supported by the current MediaRecorder', () => {
    vi.stubGlobal('MediaRecorder', FakeMediaRecorder);
    expect(supportedExportFormats().map((format) => format.value)).toEqual([
      EXPORT_FORMATS[0].value,
      EXPORT_FORMATS[2].value,
    ]);
  });

  it('records cloned audio with canvas video and releases tracks after stop', async () => {
    vi.stubGlobal('MediaRecorder', FakeMediaRecorder);
    const capture = createCapture();
    const recording = startRecording({
      ...capture,
      fps: 24,
      mimeType: EXPORT_FORMATS[0].value,
      videoBitrate: 5_000_000,
      audioBitrate: 128_000,
    });

    expect(capture.canvas.captureStream).toHaveBeenCalledWith(24);
    expect(capture.stream.tracks).toContain(capture.clonedAudioTrack);
    const video = await recording.stop();
    expect(await video.text()).toBe('video');
    expect(capture.videoTrack.stop).toHaveBeenCalledOnce();
    expect(capture.clonedAudioTrack.stop).toHaveBeenCalledOnce();
  });

  it('discards canceled recordings and rejects unsupported formats', async () => {
    vi.stubGlobal('MediaRecorder', FakeMediaRecorder);
    const capture = createCapture();
    const recording = startRecording({ ...capture, mimeType: EXPORT_FORMATS[0].value });
    await expect(recording.cancel()).resolves.toBeNull();

    expect(() => startRecording({ ...capture, mimeType: 'video/unsupported' }))
      .toThrow('The selected video format is not supported by this device.');
  });

  it('reports when MediaRecorder is unavailable', () => {
    vi.stubGlobal('MediaRecorder', undefined);
    expect(supportedExportFormats()).toEqual([]);
    expect(() => startRecording({ canvas: {}, mimeType: EXPORT_FORMATS[0].value }))
      .toThrow('Recording is not supported in this browser.');
  });
});
