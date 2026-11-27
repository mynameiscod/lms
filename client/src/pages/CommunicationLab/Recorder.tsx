import React, { useEffect, useRef, useState } from 'react';
import { communicationApi, CommJob } from '../../api/communicationApi';

/**
 * One recorded answer, for the daily challenge and the coach alike.
 *
 * Camera and microphone are both required: the student records a take, watches it back with sound,
 * and records again if it was not good. Two takes at most (an LMS daily question gets ONE: record, watch,
 * send); they pick the better one and send it. A take too short to send can always be redone, since it was
 * never sent. Takes stay in the browser until sent, and once sent the answer is final.
 *
 * With `onSent` (the daily question), sending only uploads: the server replies with a job and the page
 * follows the scoring. The upload itself shows a real percentage here.
 *
 * The camera and microphone stay on between takes and are switched off only when the window closes
 * or an answer is sent. (Switching them off when a take ended is what broke Re-record before.)
 */

export const MAX_TAKES = 2;
const SILENT_PEAK = 0.012; // not a whisper, not a murmur: the microphone heard nothing

interface Take { url: string; blob: Blob; sec: number }

const pickMime = () => {
  for (const m of ['video/webm;codecs=vp9,opus', 'video/webm;codecs=vp8,opus', 'video/webm', 'video/mp4'])
    if ((window as any).MediaRecorder?.isTypeSupported?.(m)) return m;
  return '';
};
const clock = (s: number) => `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;

type Phase = 'setup' | 'ready' | 'count' | 'rec' | 'review' | 'submitting';

const Recorder: React.FC<{
  today: any;
  onDone: (a: any) => void;
  onClose: () => void;
  submitter?: (blob: Blob, mode: 'video') => Promise<any>;
  maxTakes?: number;
  onSent?: (job: CommJob) => void;
}> = ({ today, onDone, onClose, submitter, maxTakes, onSent }) => {
  const MAX = Math.max(1, maxTakes || MAX_TAKES);
  const [upload, setUpload] = useState<number | null>(null);
  const ch = today.challenge;
  const minSec: number = ch?.minSeconds || 0;
  const [phase, setPhase] = useState<Phase>('setup');
  const [err, setErr] = useState('');
  const [elapsed, setElapsed] = useState(0);
  const [count, setCount] = useState(3);
  const [takes, setTakes] = useState<Take[]>([]);
  const [pick, setPick] = useState(0);
  const [silentNote, setSilentNote] = useState(false);

  const streamRef = useRef<MediaStream | null>(null);
  const recRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const liveRef = useRef<HTMLVideoElement>(null);
  const timerRef = useRef<any>(null);
  const countRef = useRef<any>(null);
  const elapsedRef = useRef(0);
  const takesRef = useRef<Take[]>([]);
  takesRef.current = takes;

  // A live level bar, and the loudest moment of each take, so a muted microphone is caught before sending.
  const [level, setLevel] = useState(0);
  const peakRef = useRef(0);
  const phaseRef = useRef(phase);
  phaseRef.current = phase;
  const audioCtxRef = useRef<AudioContext | null>(null);
  const rafRef = useRef(0);

  const stopMeter = () => { cancelAnimationFrame(rafRef.current); audioCtxRef.current?.close().catch(() => {}); audioCtxRef.current = null; };
  const startMeter = (stream: MediaStream) => {
    try {
      const AC = window.AudioContext || (window as any).webkitAudioContext;
      const ctx: AudioContext = new AC();
      const an = ctx.createAnalyser(); an.fftSize = 1024;
      ctx.createMediaStreamSource(stream).connect(an);
      audioCtxRef.current = ctx;
      const buf = new Uint8Array(an.fftSize); let last = 0;
      const tick = (t: number) => {
        an.getByteTimeDomainData(buf);
        let sum = 0; for (let i = 0; i < buf.length; i++) { const v = (buf[i] - 128) / 128; sum += v * v; }
        const rms = Math.sqrt(sum / buf.length);
        if (phaseRef.current === 'rec') peakRef.current = Math.max(peakRef.current, rms);
        if (t - last > 90) { last = t; setLevel(Math.min(1, rms * 5)); }
        rafRef.current = requestAnimationFrame(tick);
      };
      rafRef.current = requestAnimationFrame(tick);
    } catch { /* no meter: the server still refuses a silent recording */ }
  };
  const stopStream = () => { stopMeter(); streamRef.current?.getTracks().forEach(t => t.stop()); streamRef.current = null; };

  // Only on close: stop the timers, the camera and microphone, and free every take.
  useEffect(() => () => {
    clearInterval(timerRef.current); clearInterval(countRef.current);
    try { if (recRef.current?.state === 'recording') { recRef.current.onstop = null; recRef.current.stop(); } } catch { /* already stopped */ }
    stopStream();
    takesRef.current.forEach(t => URL.revokeObjectURL(t.url));
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // The live camera view, whenever the student is about to record or recording.
  useEffect(() => {
    const v = liveRef.current;
    if (v && streamRef.current && (phase === 'ready' || phase === 'count' || phase === 'rec')) {
      v.srcObject = streamRef.current;
      v.play?.().catch(() => {});
    }
  }, [phase]);

  const openDevices = async (): Promise<boolean> => {
    setErr('');
    if (streamRef.current?.getTracks().every(t => t.readyState === 'live')) return true;
    stopStream();
    try {
      const s = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
      if (!s.getVideoTracks().length || !s.getAudioTracks().length) { s.getTracks().forEach(t => t.stop()); throw new Error('missing track'); }
      streamRef.current = s; startMeter(s);
      return true;
    } catch {
      setErr('Your camera and microphone are both needed. Allow access to both in the browser (the camera icon in the address bar), make sure no other app is using the camera, then try again.');
      return false;
    }
  };

  const toReady = async () => { setSilentNote(false); if (await openDevices()) setPhase('ready'); };

  const start = () => {
    if (!streamRef.current || takes.length >= MAX) return;
    setSilentNote(false); setErr('');
    setPhase('count'); setCount(3);
    let n = 3;
    countRef.current = setInterval(() => {
      n -= 1; setCount(n);
      if (n > 0) return;
      clearInterval(countRef.current);
      const mime = pickMime();
      chunksRef.current = [];
      const rec = new MediaRecorder(streamRef.current!, mime ? { mimeType: mime } : undefined);
      rec.ondataavailable = e => { if (e.data.size) chunksRef.current.push(e.data); };
      peakRef.current = 0;
      rec.onstop = () => {
        clearInterval(timerRef.current);
        if (peakRef.current < SILENT_PEAK) {
          // A take nobody can hear does not use up one of the two.
          setSilentNote(true); setPhase(takesRef.current.length ? 'review' : 'ready');
          return;
        }
        const blob = new Blob(chunksRef.current, { type: mime || 'video/webm' });
        const next = [...takesRef.current, { url: URL.createObjectURL(blob), blob, sec: elapsedRef.current }];
        setTakes(next); setPick(next.length - 1); setPhase('review');
      };
      rec.start(1000); recRef.current = rec;
      elapsedRef.current = 0; setElapsed(0); setPhase('rec');
      timerRef.current = setInterval(() => {
        elapsedRef.current += 1; setElapsed(elapsedRef.current);
        if (ch?.maxSeconds && elapsedRef.current >= ch.maxSeconds) try { rec.stop(); } catch { /* already stopped */ }
      }, 1000);
    }, 1000);
  };

  const chosen = takes[pick];
  const tooShort = !!chosen && chosen.sec < minSec;
  const left = MAX - takes.length;
  // A take too short to send was never sent, so it can be redone even when it was the only take.
  const canRetake = left > 0 || tooShort;
  const retake = () => {
    if (left <= 0 && tooShort) { takes.forEach(t => URL.revokeObjectURL(t.url)); setTakes([]); setPick(0); }
    toReady();
  };

  const submit = async () => {
    if (!chosen || tooShort) return;
    setPhase('submitting'); setErr('');
    stopStream();
    try {
      if (submitter) onDone(await submitter(chosen.blob, 'video'));
      else {
        setUpload(0);
        const job = await communicationApi.send(ch._id, today.date, chosen.blob, setUpload);
        if (onSent) onSent(job); else onDone(job);
      }
    }
    catch (e: any) { setUpload(null); setErr(e?.response?.data?.message || 'Sending failed. Check your internet and press Send again: your take is still here.'); setPhase('review'); }
  };

  const close = () => { if (phase !== 'submitting') onClose(); };

  return (
    <div className="clx-modal">
      <div className="clx-modal-card">
        <div className="clx-modal-head">
          <div><h3>{ch?.title}</h3></div>
          <button className="clx-close" onClick={close} disabled={phase === 'submitting'} aria-label="Close"><i className="bi bi-x-lg" /></button>
        </div>
        {err && <div className="pm-msg err" style={{ marginBottom: 12 }}>{err}</div>}

        {phase === 'setup' ? (
          <>
            <p>{ch?.description}</p>
            <ol className="clx-steps">
              <li><i className="bi bi-camera-video" /> Record your answer on camera, with sound.</li>
              <li><i className="bi bi-play-circle" /> Watch it back: your voice, your pace, how you look.</li>
              {MAX > 1 ? <>
                <li><i className="bi bi-arrow-repeat" /> Not happy? Record once more. You get {MAX} takes.</li>
                <li><i className="bi bi-send-check" /> Send the better take. Once sent, it is final.</li>
              </> : <>
                <li><i className="bi bi-1-circle" /> <span>You get <b>one take</b>, like a real interview. Take a breath and think before you start.</span></li>
                <li><i className="bi bi-send-check" /> Send it for AI feedback. Once sent, it is final.</li>
              </>}
            </ol>
            <button className="clx-btn primary" style={{ width: "100%", marginTop: 16 }} onClick={toReady}><i className="bi bi-camera-video" /> Turn on camera &amp; microphone</button>
          </>
        ) : (
          <>
            <div className="clx-preview">
              {phase === 'review' || phase === 'submitting'
                ? (chosen ? <video key={chosen.url} src={chosen.url} controls playsInline /> : null)
                : <video ref={liveRef} className="clx-live" autoPlay muted playsInline />}
              {phase === 'count' && <div className="clx-count">{count}</div>}
              {phase === 'rec' && <span className="clx-rec-status"><i className="bi bi-record-circle" /> REC {clock(elapsed)}{ch?.maxSeconds ? ` / ${clock(ch.maxSeconds)}` : ''}</span>}
              {phase === 'ready' && <span className="clx-take-tag">{MAX > 1 ? `Take ${takes.length + 1} of ${MAX}` : 'One take'}</span>}
            </div>

            {(phase === 'ready' || phase === 'rec') && (
              <div style={{ margin: '8px 0 12px' }}>
                <div className="clx-meter"><i style={{ width: `${Math.round(level * 100)}%`, background: level > 0.08 ? '#16a34a' : '#f59e0b' }} /></div>
                <small style={{ color: '#2F3F56' }}>{phase === 'ready' ? 'Say a few words: this bar should move. If it does not, your microphone is muted or the wrong one is selected.' : `Speak for at least ${minSec} seconds.`}</small>
              </div>
            )}

            {silentNote && <div className="pm-msg err" style={{ margin: '10px 0' }}>We could not hear your voice in that take, so it was not kept and does not count. Check that your microphone is not muted, watch the level bar move, then record again.</div>}

            {(phase === 'review' || phase === 'submitting') && (
              <div className="clx-review">
                <p className="clx-review-hint"><i className="bi bi-headphones" /> Play your take with sound. Is your voice clear, your pace steady, and are you looking at the camera? {left > 0 ? 'If it is not good, record it again.' : MAX > 1 ? 'Pick the better take and send it.' : 'When you are ready, send it for AI feedback.'}</p>
                {takes.length > 1 && (
                  <div className="clx-takes" role="radiogroup" aria-label="Choose the take to send">
                    {takes.map((t, i) => (
                      <button key={t.url} type="button" role="radio" aria-checked={i === pick} disabled={phase === 'submitting'}
                        className={`clx-take ${i === pick ? 'on' : ''}`} onClick={() => setPick(i)}>
                        <i className={`bi ${i === pick ? 'bi-check-circle-fill' : 'bi-circle'}`} /> Take {i + 1} · {clock(t.sec)}
                      </button>
                    ))}
                  </div>
                )}
                {tooShort && <div className="pm-msg err" style={{ margin: '10px 0 0' }}>This take is {chosen.sec}s. Please speak for at least {minSec} seconds{canRetake ? ': record again (a take this short is not counted)' : takes.length > 1 ? ': choose the other take' : ''}.</div>}
              </div>
            )}

            <div className="clx-actions" style={{ justifyContent: 'center' }}>
              {phase === 'ready' && <button className="clx-btn primary" onClick={start}><i className="bi bi-record-circle" /> Start take {takes.length + 1}</button>}
              {phase === 'ready' && takes.length > 0 && <button className="clx-btn" onClick={() => setPhase('review')}><i className="bi bi-arrow-left" /> Back to my takes</button>}
              {phase === 'rec' && <button className="clx-btn primary" onClick={() => recRef.current?.stop()}><i className="bi bi-stop-fill" /> Stop</button>}
              {phase === 'review' && (
                <>
                  {canRetake && <button className="clx-btn" onClick={retake}><i className="bi bi-arrow-counterclockwise" /> Record again{left > 0 ? ` (${left} left)` : ''}</button>}
                  <button className="clx-btn primary" onClick={submit} disabled={!chosen || tooShort}><i className="bi bi-stars" /> Send {takes.length > 1 ? `take ${pick + 1}` : 'this take'} for AI feedback</button>
                </>
              )}
              {phase === 'submitting' && upload == null && <span style={{ color: '#2F3F56', fontSize: 'max(13px, var(--fs-floor, 0px))' }}><i className="bi bi-hourglass-split" /> Transcribing and evaluating… this can take a minute.</span>}
              {phase === 'submitting' && upload != null && <div className="clx-upload" role="progressbar" aria-valuemin={0} aria-valuemax={100} aria-valuenow={Math.round(upload * 100)}>
                <div className="clx-upload-row"><span><i className="bi bi-cloud-arrow-up" /> Sending your answer…</span><b>{Math.round(upload * 100)}%</b></div>
                <div className="clx-upload-bar"><i style={{ width: `${Math.max(3, Math.round(upload * 100))}%` }} /></div>
                <small>Please keep this window open until it reaches 100%.</small>
              </div>}
            </div>
            {phase === 'review' && <p className="clx-final-note">Once sent, this answer is final and cannot be redone.</p>}
          </>
        )}
      </div>
    </div>
  );
};

export default Recorder;
