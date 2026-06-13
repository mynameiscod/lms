import React, { useCallback, useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import * as tus from 'tus-js-client';
import { learningContentLibraryApi } from '../../api/learningContentLibraryApi';

/**
 * Record Class — in-app scene-switching recorder.
 *
 * One continuous recording where the trainer switches SCENES live:
 *   📷 Camera (whiteboard)  ·  🖥️ Screen  ·  🖥️+📷 Screen + Camera (PiP)
 * Everything is composited onto a single <canvas> (mic always on; screen/tab
 * audio mixed in when sharing), recorded via MediaRecorder, and uploaded
 * directly to Bunny Stream. Switching scenes never splits the file.
 *
 * Crash-safety (vs the earlier canvas crash): canvas capped at 720p, draw loop
 * throttled to ~15fps. Trainers should share a Window/Tab (not Entire Screen)
 * to avoid mirror feedback with the on-page preview.
 */

type Scene = 'camera' | 'screen' | 'both';
type Status = 'idle' | 'recording' | 'recorded' | 'saving' | 'saved';

const SCENES: { key: Scene; label: string; icon: string }[] = [
  { key: 'camera', label: 'Camera / Whiteboard', icon: '📷' },
  { key: 'screen', label: 'Screen', icon: '🖥️' },
  { key: 'both',   label: 'Screen + Camera',     icon: '🖥️📷' },
];

const pickMime = (): string => {
  for (const c of ['video/webm;codecs=vp9,opus', 'video/webm;codecs=vp8,opus', 'video/webm', 'video/mp4']) {
    try { if ((window as any).MediaRecorder?.isTypeSupported?.(c)) return c; } catch { /* noop */ }
  }
  return '';
};
const fmtTime = (s: number) => `${Math.floor(s / 60).toString().padStart(2, '0')}:${(s % 60).toString().padStart(2, '0')}`;
const fmtSize = (b: number) => (b > 1048576 ? `${(b / 1048576).toFixed(1)} MB` : `${(b / 1024).toFixed(0)} KB`);
const splitTags = (s: string) => s.split(',').map(t => t.trim()).filter(Boolean);

const CW = 1280, CH = 720;

export default function RecordClass() {
  const navigate = useNavigate();

  const canvasRef   = useRef<HTMLCanvasElement>(null);
  const camVidRef   = useRef<HTMLVideoElement | null>(null);
  const scrVidRef   = useRef<HTMLVideoElement | null>(null);
  const camStreamRef = useRef<MediaStream | null>(null);
  const scrStreamRef = useRef<MediaStream | null>(null);
  const audioCtxRef = useRef<AudioContext | null>(null);
  const destRef     = useRef<MediaStreamAudioDestinationNode | null>(null);
  const recRef      = useRef<MediaRecorder | null>(null);
  const chunksRef   = useRef<Blob[]>([]);
  const rafRef      = useRef<number>(0);
  const lastDraw    = useRef<number>(0);
  const sceneRef    = useRef<Scene>('camera');
  const streamRef   = useRef<MediaStream | null>(null);
  const secondsRef  = useRef(0);

  const [status, setStatus]   = useState<Status>('idle');
  const [scene, setScene]     = useState<Scene>('camera');
  const [paused, setPaused]   = useState(false);
  const [seconds, setSeconds] = useState(0);
  const [error, setError]     = useState('');
  const [blob, setBlob]       = useState<Blob | null>(null);
  const [previewUrl, setPreviewUrl] = useState('');
  const [title, setTitle]     = useState('');
  const [desc, setDesc]       = useState('');
  const [topics, setTopics]   = useState('');
  const [courses, setCourses] = useState('');
  const [uploadPct, setUploadPct] = useState(0);
  const [savedId, setSavedId] = useState('');

  useEffect(() => { secondsRef.current = seconds; }, [seconds]);
  useEffect(() => {
    if (status !== 'recording' || paused) return;
    const iv = setInterval(() => setSeconds(p => p + 1), 1000);
    return () => clearInterval(iv);
  }, [status, paused]);

  const cleanup = useCallback(() => {
    if (rafRef.current) { cancelAnimationFrame(rafRef.current); rafRef.current = 0; }
    [camStreamRef, scrStreamRef, streamRef].forEach(r => { r.current?.getTracks().forEach(t => t.stop()); r.current = null; });
    [camVidRef, scrVidRef].forEach(r => { if (r.current) { r.current.srcObject = null; r.current = null; } });
    if (audioCtxRef.current) { audioCtxRef.current.close().catch(() => {}); audioCtxRef.current = null; }
    destRef.current = null;
  }, []);
  useEffect(() => () => { cleanup(); if (previewUrl) URL.revokeObjectURL(previewUrl); }, [cleanup, previewUrl]);

  const drawFit = (ctx: CanvasRenderingContext2D, v: HTMLVideoElement, dx: number, dy: number, dw: number, dh: number, cover: boolean) => {
    const vw = v.videoWidth || 16, vh = v.videoHeight || 9;
    const s = cover ? Math.max(dw / vw, dh / vh) : Math.min(dw / vw, dh / vh);
    const w = vw * s, h = vh * s;
    try { ctx.drawImage(v, dx + (dw - w) / 2, dy + (dh - h) / 2, w, h); } catch { /* not ready */ }
  };

  const startDraw = () => {
    const canvas = canvasRef.current; if (!canvas) return;
    const ctx = canvas.getContext('2d')!;
    const loop = (ts: number) => {
      rafRef.current = requestAnimationFrame(loop);
      if (ts - lastDraw.current < 66) return;   // ~15fps
      lastDraw.current = ts;
      const cam = camVidRef.current, scr = scrVidRef.current, sc = sceneRef.current;
      ctx.fillStyle = '#0b1020'; ctx.fillRect(0, 0, CW, CH);
      if (sc === 'camera') {
        if (cam && cam.readyState >= 2) drawFit(ctx, cam, 0, 0, CW, CH, true);
      } else if (sc === 'screen') {
        if (scr && scr.readyState >= 2) drawFit(ctx, scr, 0, 0, CW, CH, false);
        else if (cam && cam.readyState >= 2) drawFit(ctx, cam, 0, 0, CW, CH, true);
      } else { // both
        if (scr && scr.readyState >= 2) drawFit(ctx, scr, 0, 0, CW, CH, false);
        if (cam && cam.readyState >= 2) {
          const pw = Math.round(CW * 0.24), ph = Math.round(pw * 9 / 16);
          const x = CW - pw - 18, y = CH - ph - 18;
          ctx.fillStyle = '#000'; ctx.fillRect(x - 3, y - 3, pw + 6, ph + 6);
          drawFit(ctx, cam, x, y, pw, ph, true);
        }
      }
    };
    rafRef.current = requestAnimationFrame(loop);
  };

  const ensureScreen = async (): Promise<boolean> => {
    if (scrStreamRef.current) return true;
    try {
      const disp = await (navigator.mediaDevices as any).getDisplayMedia({ video: { frameRate: { ideal: 15 } }, audio: true });
      scrStreamRef.current = disp;
      const sv = document.createElement('video'); sv.srcObject = disp; sv.muted = true; (sv as any).playsInline = true;
      await sv.play().catch(() => {}); scrVidRef.current = sv;
      if (disp.getAudioTracks().length && audioCtxRef.current && destRef.current) {
        audioCtxRef.current.createMediaStreamSource(new MediaStream(disp.getAudioTracks())).connect(destRef.current);
      }
      disp.getVideoTracks()[0].addEventListener('ended', () => {
        scrStreamRef.current?.getTracks().forEach(t => t.stop());
        scrStreamRef.current = null; scrVidRef.current = null;
        sceneRef.current = 'camera'; setScene('camera');   // screen-share stopped → back to camera
      });
      return true;
    } catch { return false; }
  };

  const switchScene = async (s: Scene) => {
    if (s === 'screen' || s === 'both') { const ok = await ensureScreen(); if (!ok) return; }
    sceneRef.current = s; setScene(s);
  };

  const onRecStop = () => {
    const b = new Blob(chunksRef.current, { type: chunksRef.current[0]?.type || 'video/webm' });
    setBlob(b);
    setPreviewUrl(URL.createObjectURL(b));
    setTitle(`Class Recording — ${new Date().toLocaleDateString()} ${new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`);
    setStatus('recorded');
    cleanup();
  };

  const start = async () => {
    setError('');
    try {
      const cam = await navigator.mediaDevices.getUserMedia({ video: { width: { ideal: 1280 } }, audio: true });
      camStreamRef.current = cam;
      const cv = document.createElement('video'); cv.srcObject = cam; cv.muted = true; (cv as any).playsInline = true;
      await cv.play().catch(() => {}); camVidRef.current = cv;

      const canvas = canvasRef.current!; canvas.width = CW; canvas.height = CH;
      const ctx = canvas.getContext('2d')!; ctx.fillStyle = '#0b1020'; ctx.fillRect(0, 0, CW, CH);

      const ACtx = (window as any).AudioContext || (window as any).webkitAudioContext;
      const actx: AudioContext = new ACtx(); audioCtxRef.current = actx;
      const dest = actx.createMediaStreamDestination(); destRef.current = dest;
      if (cam.getAudioTracks().length) actx.createMediaStreamSource(new MediaStream(cam.getAudioTracks())).connect(dest);

      sceneRef.current = 'camera'; setScene('camera');
      startDraw();

      const canvasStream = (canvas as any).captureStream(15) as MediaStream;
      const combined = new MediaStream([canvasStream.getVideoTracks()[0], ...dest.stream.getAudioTracks()]);
      streamRef.current = combined;

      const mime = pickMime();
      const rec = new MediaRecorder(combined, mime ? { mimeType: mime, videoBitsPerSecond: 1_200_000, audioBitsPerSecond: 128_000 } : undefined);
      chunksRef.current = [];
      rec.ondataavailable = e => { if (e.data.size > 0) chunksRef.current.push(e.data); };
      rec.onstop = onRecStop;
      recRef.current = rec; rec.start(2000);
      setStatus('recording'); setSeconds(0); setPaused(false);
    } catch (e: any) {
      cleanup();
      setError(e?.name === 'NotAllowedError' ? 'Camera/mic permission denied — allow them and try again.' : (e?.message || 'Could not start. Use Chrome or Edge.'));
    }
  };

  const pause = () => { if (recRef.current?.state === 'recording') { recRef.current.pause(); setPaused(true); } };
  const resume = () => { if (recRef.current?.state === 'paused') { recRef.current.resume(); setPaused(false); } };
  const stop = () => { if (recRef.current && recRef.current.state !== 'inactive') recRef.current.stop(); };

  const discard = () => { if (previewUrl) URL.revokeObjectURL(previewUrl); setBlob(null); setPreviewUrl(''); setSeconds(0); setUploadPct(0); setStatus('idle'); };

  const save = async () => {
    if (!blob) return;
    if (!title.trim()) { setError('Please enter a title.'); return; }
    setError(''); setStatus('saving'); setUploadPct(0);
    try {
      const meta = await learningContentLibraryApi.createBunnyVideo(title.trim());
      await new Promise<void>((resolve, reject) => {
        const upload = new tus.Upload(blob, {
          endpoint: meta.tus.endpoint,
          retryDelays: [0, 2000, 5000, 10000, 20000],
          headers: {
            AuthorizationSignature: meta.tus.signature,
            AuthorizationExpire: String(meta.tus.expiration),
            VideoId: meta.videoId,
            LibraryId: String(meta.libraryId),
          },
          metadata: { filetype: blob.type || 'video/webm', title: title.trim() },
          onError: (err) => reject(err),
          onProgress: (sent, total) => { if (total) setUploadPct(Math.round((sent / total) * 100)); },
          onSuccess: () => resolve(),
        });
        upload.start();
      });
      const token = localStorage.getItem('token');
      const tenantId = localStorage.getItem('tenantId');
      const { data } = await axios.post('/api/v1/learning-library/bunny/content', {
        type: 'video',
        videoSource: 'bunny',
        bunnyVideoId: meta.videoId,
        bunnyLibraryId: meta.libraryId,
        videoThumbnail: meta.cdnHostname ? `https://${meta.cdnHostname}/${meta.videoId}/thumbnail.jpg` : undefined,
        title: title.trim(),
        description: desc.trim() || undefined,
        topicTags: splitTags(topics),
        courseTags: splitTags(courses),
        estimatedDuration: Math.max(1, Math.round(secondsRef.current / 60)),
        videoDuration: secondsRef.current,
        isPublished: true,
      }, { headers: { ...(token ? { Authorization: `Bearer ${token}` } : {}), ...(tenantId ? { 'X-Tenant-Id': tenantId } : {}) } });
      setSavedId(data?._id || '');
      setStatus('saved');
    } catch (e: any) {
      setError(e?.response?.data?.message || e?.message || 'Upload failed. Please try again.');
      setStatus('recorded');
    }
  };

  const btn = (bg: string): React.CSSProperties => ({ background: bg, color: '#fff', border: 'none', borderRadius: 10, padding: '12px 22px', fontWeight: 700, fontSize: 14, cursor: 'pointer' });
  const ghost: React.CSSProperties = { background: '#fff', color: '#0f172a', border: '1.5px solid #cbd5e1', borderRadius: 10, padding: '12px 22px', fontWeight: 700, fontSize: 14, cursor: 'pointer' };
  const input: React.CSSProperties = { width: '100%', border: '1px solid #cbd5e1', borderRadius: 8, padding: '10px 12px', fontSize: 14, marginTop: 6 };
  const label: React.CSSProperties = { fontSize: 13, fontWeight: 600, color: '#334155' };
  const recording = status === 'recording';

  return (
    <div style={{ maxWidth: recording || status === 'recorded' || status === 'saving' ? 1100 : 820, margin: '0 auto', padding: 24 }}>
      <style>{`@keyframes recpulse{0%{opacity:1}50%{opacity:.35}100%{opacity:1}}`}</style>

      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8, flexWrap: 'wrap', gap: 8 }}>
        <div>
          <h2 style={{ margin: 0, fontSize: 24, fontWeight: 700, color: '#0f172a' }}>🔴 Record Class</h2>
          <p style={{ margin: '4px 0 0', color: '#64748b', fontSize: 14 }}>Start on the whiteboard, share your screen mid-class, switch back — one recording, saved to your Library.</p>
        </div>
        <button style={ghost} onClick={() => navigate('/learning-library')}>← Back to Library</button>
      </div>

      {error && <div style={{ background: '#fdecec', border: '1px solid #f3c9c9', color: '#b3261e', padding: '10px 14px', borderRadius: 10, margin: '12px 0', fontSize: 14 }}>{error}</div>}

      {/* IDLE */}
      {status === 'idle' && (
        <div style={{ marginTop: 14 }}>
          <div style={{ background: '#eff6ff', border: '1px solid #bfdbfe', borderRadius: 12, padding: 16, marginBottom: 16, fontSize: 14, color: '#1e3a5f' }}>
            You'll be asked for <b>camera + mic</b> first. During the class, switch scenes with the buttons:
            <b> 📷 Camera</b> (whiteboard), <b>🖥️ Screen</b> (you'll pick what to share), <b>🖥️📷 Screen + Camera</b>.
            <div style={{ marginTop: 6, color: '#475569' }}>💡 When sharing, choose a <b>Window or Tab</b> (not "Entire Screen") to avoid a mirror flicker.</div>
          </div>
          <button style={btn('#dc2626')} onClick={start}>⏺ Start Recording</button>
        </div>
      )}

      {/* RECORDING — live composite preview + scene switcher */}
      <div style={{ display: recording ? 'block' : 'none', marginTop: 14 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 10, flexWrap: 'wrap' }}>
          <span style={{ display: 'inline-flex', alignItems: 'center', gap: 8, background: '#fef2f2', color: '#dc2626', fontWeight: 700, padding: '6px 12px', borderRadius: 999 }}>
            <span style={{ width: 10, height: 10, borderRadius: '50%', background: '#dc2626', animation: paused ? 'none' : 'recpulse 1.2s infinite' }} />
            {paused ? 'PAUSED' : 'REC'} · {fmtTime(seconds)}
          </span>
        </div>
        <canvas ref={canvasRef} style={{ width: '100%', borderRadius: 12, background: '#0b1020', display: 'block' }} />
        <div style={{ display: 'flex', gap: 8, marginTop: 12, flexWrap: 'wrap' }}>
          {SCENES.map(s => (
            <button key={s.key} onClick={() => switchScene(s.key)}
              style={{ ...(scene === s.key ? btn('#4f46e5') : ghost), padding: '10px 16px' }}>
              {s.icon} {s.label}{scene === s.key ? ' ●' : ''}
            </button>
          ))}
        </div>
        <div style={{ display: 'flex', gap: 10, marginTop: 14, flexWrap: 'wrap' }}>
          {!paused ? <button style={ghost} onClick={pause}>⏸ Pause</button> : <button style={ghost} onClick={resume}>▶ Resume</button>}
          <button style={btn('#0f172a')} onClick={stop}>⏹ Stop &amp; Review</button>
        </div>
      </div>

      {/* RECORDED / SAVING */}
      {(status === 'recorded' || status === 'saving') && (
        <div style={{ marginTop: 14 }}>
          <video src={previewUrl} controls style={{ width: '100%', borderRadius: 12, background: '#000', display: 'block' }} />
          <div style={{ fontSize: 13, color: '#64748b', margin: '8px 0 16px' }}>Length {fmtTime(seconds)} · Size {blob ? fmtSize(blob.size) : '—'} · uploads privately to Bunny Stream</div>
          <div style={{ display: 'grid', gap: 14, maxWidth: 640 }}>
            <div><span style={label}>Title *</span><input style={input} value={title} onChange={e => setTitle(e.target.value)} placeholder="e.g. Java — Day 12: Spring Boot Controllers" /></div>
            <div><span style={label}>Description</span><input style={input} value={desc} onChange={e => setDesc(e.target.value)} placeholder="Optional — what was covered" /></div>
            <div><span style={label}>Topic tags (comma-separated)</span><input style={input} value={topics} onChange={e => setTopics(e.target.value)} placeholder="Spring Boot, REST" /></div>
            <div><span style={label}>Course tags (comma-separated)</span><input style={input} value={courses} onChange={e => setCourses(e.target.value)} placeholder="Java Full Stack" /></div>
          </div>
          {status === 'saving' && (
            <div style={{ margin: '16px 0', maxWidth: 640 }}>
              <div style={{ height: 10, background: '#e5e7eb', borderRadius: 6, overflow: 'hidden' }}><div style={{ width: `${uploadPct}%`, height: '100%', background: '#0a66c2', transition: 'width .2s' }} /></div>
              <div style={{ fontSize: 13, color: '#64748b', marginTop: 6 }}>Uploading… {uploadPct}% — keep this tab open.</div>
            </div>
          )}
          <div style={{ display: 'flex', gap: 10, marginTop: 18, flexWrap: 'wrap' }}>
            <button style={{ ...btn('#16a34a'), opacity: status === 'saving' ? 0.6 : 1 }} disabled={status === 'saving'} onClick={save}>💾 Save to Library</button>
            <button style={{ ...ghost, opacity: status === 'saving' ? 0.6 : 1 }} disabled={status === 'saving'} onClick={discard}>🗑 Discard &amp; Re-record</button>
          </div>
        </div>
      )}

      {/* SAVED */}
      {status === 'saved' && (
        <div style={{ marginTop: 24, background: '#f0fdf4', border: '1px solid #bbf7d0', borderRadius: 14, padding: 24, textAlign: 'center' }}>
          <div style={{ fontSize: 40 }}>✅</div>
          <h3 style={{ margin: '8px 0 4px', color: '#166534' }}>Recording saved to the Library</h3>
          <p style={{ color: '#15803d', margin: '0 0 16px', fontSize: 14 }}>Add it to a day plan, or record another class.</p>
          <div style={{ display: 'flex', gap: 10, justifyContent: 'center', flexWrap: 'wrap' }}>
            <button style={btn('#0f172a')} onClick={() => navigate('/learning-library')}>Go to Library</button>
            {savedId && <button style={ghost} onClick={() => navigate(`/learning-library/edit/${savedId}`)}>Edit details</button>}
            <button style={ghost} onClick={() => { setSavedId(''); setBlob(null); if (previewUrl) URL.revokeObjectURL(previewUrl); setPreviewUrl(''); setTitle(''); setDesc(''); setTopics(''); setCourses(''); setSeconds(0); setUploadPct(0); setStatus('idle'); }}>Record another</button>
          </div>
        </div>
      )}
    </div>
  );
}
