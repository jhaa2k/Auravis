import { useRef, useState } from 'react';
import { Capacitor } from '@capacitor/core';
import { useApp } from '../app/hooks.js';
import { actions, audio, toast, visualizer } from '../app/services.js';
import { QUALITY } from '../core/render/quality.js';
import { startRecording, supportedExportFormats } from '../core/export/recorder.js';
import { openExport, saveExport, shareExport } from '../core/export/download.js';
import { requestNativeNotificationPermission } from '../core/audio/nativeMedia.js';
import { Toggle } from './fields/primitives.jsx';
import Icon from './Icon.jsx';

const RESOLUTIONS = [480, 720, 1080, 1440, 2160];
const FPS_OPTIONS = [24, 25, 30, 50, 60];
const ASPECTS = [
  { value: '16:9', label: '16:9 · Landscape', ratio: 16 / 9 },
  { value: '9:16', label: '9:16 · Portrait', ratio: 9 / 16 },
  { value: '1:1', label: '1:1 · Square', ratio: 1 },
  { value: '4:5', label: '4:5 · Portrait', ratio: 4 / 5 },
  { value: 'custom', label: 'Custom', ratio: null },
];
const QUALITY_BITRATES = { low: 2_000_000, medium: 5_000_000, high: 8_000_000, ultra: 14_000_000 };
const fmt = (seconds) => `${Math.floor(seconds / 60)}:${String(Math.floor(seconds % 60)).padStart(2, '0')}`;
const DEFAULT_PREFERENCES = { theme: 'dark', guides: true, safeArea: false, snap: false };

function initialAspect(width, height) {
  const ratio = width / height;
  return ASPECTS.find((a) => a.ratio && Math.abs(a.ratio - ratio) < 0.015)?.value || 'custom';
}

export default function SettingsPanel({ mode = 'settings', preferences = DEFAULT_PREFERENCES, onPreferencesChange = () => {} }) {
  const s = useApp((x) => x.project.settings);
  const [aspect, setAspect] = useState(() => initialAspect(s.width, s.height));
  const [resolution, setResolution] = useState(1080);
  const [fps, setFps] = useState(30);
  const [quality, setQuality] = useState('high');
  const [videoBitrate, setVideoBitrate] = useState(QUALITY_BITRATES.high);
  const [audioBitrate, setAudioBitrate] = useState(192_000);
  const [duration, setDuration] = useState(30);
  const [destination, setDestination] = useState('movies');
  const formats = supportedExportFormats();
  const [format, setFormat] = useState(() => formats[0]?.value || '');
  const [exportState, setExportState] = useState({ status: 'idle', progress: 0, message: '' });
  const rec = useRef(null);
  const startToken = useRef(0);
  const timer = useRef(null);
  const startedAt = useRef(0);
  const finishing = useRef(false);
  const blob = useRef(null);
  const saveController = useRef(null);
  const saved = useRef(null);
  const fileName = useRef('');
  const isRecording = exportState.status === 'recording';
  const isSaving = exportState.status === 'saving' || exportState.status === 'finalizing';

  const setAspectRatio = (value) => {
    setAspect(value);
    if (value === 'custom') return;
    const { ratio } = ASPECTS.find((a) => a.value === value);
    const height = 1080;
    const width = Math.round((height * ratio) / 2) * 2;
    actions.setSettings({ width, height });
  };

  const cleanupRecording = () => {
    clearInterval(timer.current);
    timer.current = null;
    visualizer.scaleOverride = null;
    visualizer.fpsOverride = null;
    rec.current = null;
    finishing.current = false;
  };

  const saveBlob = async (video) => {
    if (!video || video.size <= 0) throw new Error('The video encoder produced an empty file.');
    setExportState({ status: 'saving', progress: 85, message: 'Finalizing the audio/video stream…' });
    const extension = video.type.includes('mp4') ? 'mp4' : 'webm';
    const name = `auravis-${new Date().toISOString().replace(/[:.]/g, '-')}.${extension}`;
    fileName.current = name;
    const controller = new AbortController();
    saveController.current = controller;
    try {
      const result = await saveExport(video, name, (progress) => {
        setExportState({ status: 'saving', progress: 85 + Math.min(14, progress * 0.14), message: 'Saving to device…' });
      }, { useSaf: destination === 'custom', signal: controller.signal });
      saved.current = { ...result, mimeType: video.type.split(';')[0] };
      setExportState({ status: 'completed', progress: 100, message: `Export completed · ${result.location}` });
    } finally {
      if (saveController.current === controller) saveController.current = null;
    }
  };

  const start = async () => {
    if (!audio.snapshot.hasAudio || !format) return;
    const token = ++startToken.current;
    try {
      await requestNativeNotificationPermission();
      if (token !== startToken.current) return;
      visualizer.scaleOverride = resolution / Math.min(s.width, s.height);
      visualizer.fpsOverride = fps;
      audio.ensureContext();
      audio.seek(0);
      rec.current = startRecording({
        canvas: visualizer.canvas,
        audioStream: audio.captureStream,
        fps,
        mimeType: format,
        videoBitrate,
        audioBitrate,
      });
      blob.current = null;
      saved.current = null;
      finishing.current = false;
      const captureDuration = Math.min(duration, audio.duration || duration);
      setExportState({ status: 'recording', progress: 0, message: 'Preparing project…' });
      if (!await audio.play()) throw new Error('Could not start audio playback for the video export.');
      if (token !== startToken.current || !rec.current) return;
      startedAt.current = performance.now();
      setExportState({ status: 'recording', progress: 0, message: 'Rendering frames and encoding audio/video…' });
      timer.current = setInterval(() => {
        const elapsed = Math.min(captureDuration, (performance.now() - startedAt.current) / 1000);
        const progress = Math.min(80, (elapsed / captureDuration) * 80);
        const remaining = Math.max(0, captureDuration - elapsed);
        setExportState({
          status: 'recording',
          progress,
          message: `Rendering frames · ${fmt(elapsed)} / ${fmt(captureDuration)}${remaining > 0 ? ` · about ${fmt(remaining)} remaining` : ''}`,
        });
        if (elapsed >= captureDuration) finish();
      }, 250);
    } catch (error) {
      if (rec.current) {
        try { await rec.current.cancel(); } catch (cancelError) { console.error('Could not cancel failed recording:', cancelError); }
      }
      cleanupRecording();
      audio.pause();
      setExportState({ status: 'error', progress: 0, message: error.message || 'Could not start recording.' });
    }
  };

  const finish = async () => {
    if (!rec.current || finishing.current) return;
    finishing.current = true;
    clearInterval(timer.current);
    setExportState({ status: 'finalizing', progress: 82, message: 'Finalizing video and audio…' });
    try {
      blob.current = await rec.current.stop();
      cleanupRecording();
      audio.pause();
      await saveBlob(blob.current);
      toast(`Video saved · ${saved.current.location}`);
    } catch (error) {
      cleanupRecording();
      setExportState({
        status: 'error',
        progress: 0,
        message: error.name === 'AbortError'
          ? 'Saving canceled. Retry to save the recorded video.'
          : error.message || 'Video export failed.',
      });
    }
  };

  const cancel = async () => {
    if (isSaving) {
      saveController.current?.abort();
      return;
    }
    if (!rec.current) return;
    startToken.current++;
    clearInterval(timer.current);
    const active = rec.current;
    try {
      await active.cancel();
      audio.pause();
      cleanupRecording();
      blob.current = null;
      setExportState({ status: 'idle', progress: 0, message: 'Export canceled.' });
    } catch (error) {
      cleanupRecording();
      setExportState({ status: 'error', progress: 0, message: error.message || 'Could not cancel export.' });
    }
  };

  const retry = async () => {
    if (blob.current) {
      try { await saveBlob(blob.current); } catch (error) {
        setExportState({
          status: 'error',
          progress: 0,
          message: error.name === 'AbortError'
            ? 'Saving canceled. Retry to save the recorded video.'
            : error.message || 'Could not save the export.',
        });
      }
    } else {
      await start();
    }
  };

  const handleOpen = async () => {
    try { await openExport(saved.current); } catch (error) { toast(error.message, 'error'); }
  };
  const handleShare = async () => {
    try { await shareExport(saved.current, fileName.current); } catch (error) { toast(error.message, 'error'); }
  };

  if (mode === 'settings') {
    return (
      <div className="props settings app-settings">
        <section className="section open"><div className="section-head static">Appearance</div>
          <div className="section-body">
            <div className="field"><label htmlFor="app-theme">Theme</label>
              <select id="app-theme" value={preferences.theme} onChange={(event) => onPreferencesChange({ theme: event.target.value })}>
                <option value="dark">Dark</option><option value="light">Light</option>
              </select></div>
          </div>
        </section>
        <section className="section open"><div className="section-head static">Preview</div>
          <div className="section-body">
            <div className="field"><label>Preview quality</label>
              <select value={s.quality} onChange={(event) => actions.setSettings({ quality: event.target.value })}>
                {Object.entries(QUALITY).map(([key, item]) => <option key={key} value={key}>{item.label} ({Math.round(item.scale * 100)}%)</option>)}
              </select></div>
            <div className="field"><label>Preview frame rate</label>
              <select value={s.fps} onChange={(event) => actions.setSettings({ fps: +event.target.value })}>
                <option value={60}>60 fps</option><option value={30}>30 fps</option>
              </select></div>
            <div className="field"><label>Adaptive quality</label><Toggle checked={s.adaptive} onChange={(adaptive) => actions.setSettings({ adaptive })} label="Adaptive quality" /></div>
          </div>
        </section>
        <section className="section open"><div className="section-head static">Canvas helpers</div>
          <div className="section-body">
            <div className="field"><label>Composition guides</label><Toggle checked={preferences.guides} onChange={(guides) => onPreferencesChange({ guides })} label="Composition guides" /></div>
            <div className="field"><label>Safe area</label><Toggle checked={preferences.safeArea} onChange={(safeArea) => onPreferencesChange({ safeArea })} label="Safe area overlay" /></div>
            <div className="field"><label>Snap while moving</label><Toggle checked={preferences.snap} onChange={(snap) => onPreferencesChange({ snap })} label="Snap elements to grid while moving" /></div>
            <div className="hint">Guides and safe area appear only in the preview and are never included in exports.</div>
          </div>
        </section>
      </div>
    );
  }

  return (
    <div className="props settings export-panel">
      <section className="section open"><div className="section-head static">Export video</div>
        <div className="section-body">
          <div className="field"><label>Aspect ratio</label>
            <select value={aspect} disabled={isRecording || isSaving} onChange={(e) => setAspectRatio(e.target.value)}>
              {ASPECTS.map((a) => <option key={a.value} value={a.value}>{a.label}</option>)}
            </select></div>
          <div className="field"><label>Resolution</label>
            <select value={resolution} disabled={isRecording || isSaving} onChange={(e) => setResolution(+e.target.value)}>
              {RESOLUTIONS.map((r) => {
                const scale = r / Math.min(s.width, s.height);
                return <option key={r} value={r}>{r === 2160 ? '2160p · 4K' : `${r}p`} ({Math.round(s.width * scale)}×{Math.round(s.height * scale)})</option>;
              })}
            </select></div>
          <div className="field"><label>Frame rate</label>
            <select value={fps} disabled={isRecording || isSaving} onChange={(e) => setFps(+e.target.value)}>{FPS_OPTIONS.map((v) => <option key={v} value={v}>{v} fps</option>)}</select></div>
          <div className="field"><label>Format</label>
            <select value={format} disabled={isRecording || isSaving || formats.length === 0} onChange={(e) => setFormat(e.target.value)}>
              {formats.map((item) => <option key={item.value} value={item.value}>{item.label}</option>)}
              {!formats.length && <option value="">No supported MediaRecorder format</option>}
            </select></div>
          <div className="field"><label>Quality</label>
            <select value={quality} disabled={isRecording || isSaving} onChange={(e) => { setQuality(e.target.value); setVideoBitrate(QUALITY_BITRATES[e.target.value]); }}>
              {Object.keys(QUALITY_BITRATES).map((q) => <option key={q} value={q}>{q[0].toUpperCase() + q.slice(1)}</option>)}
            </select></div>
          <div className="field"><label>Video bitrate (bit/s)</label>
            <input type="number" min="250000" max="50000000" step="250000" value={videoBitrate} disabled={isRecording || isSaving} onChange={(e) => setVideoBitrate(Math.max(250000, +e.target.value || 250000))} /></div>
          <div className="field"><label>Audio bitrate (bit/s)</label>
            <input type="number" min="64000" max="320000" step="16000" value={audioBitrate} disabled={isRecording || isSaving} onChange={(e) => setAudioBitrate(Math.min(320000, Math.max(64000, +e.target.value || 64000)))} /></div>
          <div className="field"><label>Duration (seconds)</label>
            <input type="number" min="1" max="10800" step="1" value={duration} disabled={isRecording || isSaving} onChange={(e) => setDuration(Math.min(10800, Math.max(1, +e.target.value || 1)))} /></div>
          {Capacitor.isNativePlatform() && Capacitor.getPlatform() === 'android' && <div className="field"><label>Save location</label>
            <select value={destination} disabled={isRecording || isSaving} onChange={(e) => setDestination(e.target.value)}>
              <option value="movies">Movies/Auravis (Android 10+)</option><option value="custom">Choose location (Android Files)</option>
            </select></div>}
          {isRecording || isSaving ? <>
            <div className="export-progress" role="status" aria-live="polite">
              <div className="export-progress-head"><strong>{exportState.message}</strong><span>{Math.floor(exportState.progress)}%</span></div>
              <progress max="100" value={exportState.progress} aria-label="Video export progress" />
            </div>
            {(isRecording || exportState.status === 'saving') && <button className="btn danger wide" onClick={cancel}><Icon name="close" size={15} />Cancel export</button>}
          </> : exportState.status === 'completed' ? <>
            <div className="hint" role="status">{exportState.message}</div>
            <div className="row-gap">
              <button className="btn primary" onClick={handleOpen}><Icon name="play" size={15} />Open video</button>
              <button className="btn" onClick={handleShare}><Icon name="share" size={15} />Share video</button>
            </div>
          </> : exportState.status === 'error' ? <>
            <div className="hint warn-text" role="alert">{exportState.message}</div>
            <button className="btn primary wide" onClick={retry}><Icon name="record" size={15} />Retry</button>
          </> : <>
            <button className="btn primary wide" onClick={start} disabled={!audio.snapshot.hasAudio || !format}><Icon name="record" size={15} fill />Export from start</button>
            {exportState.message && <div className="hint">{exportState.message}</div>}
          </>}
          <div className="hint">{formats.length
            ? 'Records the visualizer canvas and the original audio together at the selected frame rate. Android 10+ exports are finalized in Movies/Auravis.'
            : 'No video encoder is available in this browser/WebView. Android format support depends on the device encoder.'}</div>
        </div>
      </section>
    </div>
  );
}
