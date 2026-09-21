import { useCallback, useEffect, useRef, useState } from 'react';
import { API_BASE_URL } from '../../api';

/**
 * Recording a candidate while they sit the paper.
 *
 * ── IT MUST NEVER COST SOMEBODY THEIR EXAM ────────────────────────────────────────────────
 *
 * Every failure here is swallowed. A refused permission, a laptop with no webcam, a camera
 * another app already holds, storage being down, a chunk that will not upload — none of them
 * stop the paper. The exam is the thing that matters and the recording is evidence about it;
 * a design where the evidence can end the exam has them the wrong way round, and it fails in
 * a room with forty people waiting.
 *
 * What it does instead is tell the server which of those happened, because a reviewer has to
 * be able to separate "refused" from "broken". Those look identical in an empty folder and
 * mean completely different things about the candidate.
 *
 * ── UPLOADED AS IT IS MADE ────────────────────────────────────────────────────────────────
 *
 * MediaRecorder is given a timeslice so it emits a blob every few seconds, and each one goes
 * up as it arrives. Holding an hour of video to send at the end would lose all of it when a
 * laptop dies — and a laptop dying mid-exam is one of the cases the footage exists to explain.
 *
 * Chunks upload one at a time behind a queue. Firing them in parallel from forty laptops on
 * college wifi would compete with the thing that actually matters, which is answers saving.
 */

export type RecorderState = 'idle' | 'recording' | 'denied' | 'unavailable' | 'done';

/** Modest on purpose: this shares a candidate's uplink with their answers. */
const VIDEO_BPS = 150_000;
const AUDIO_BPS = 48_000;
const SLICE_MS = 15_000;

function pickMime(): string | undefined {
  if (typeof MediaRecorder === 'undefined') return undefined;
  const wanted = [
    'video/webm;codecs=vp8,opus',
    'video/webm;codecs=vp9,opus',
    'video/webm',
    'video/mp4',
  ];
  return wanted.find((t) => MediaRecorder.isTypeSupported?.(t));
}

export function useProctorRecorder(opts: {
  enabled: boolean;
  token: string;
  /** Called once with how it went, so the server can tell refusal from breakage. */
  onState: (state: Exclude<RecorderState, 'idle'>, note?: string) => void;
}) {
  const { enabled, token, onState } = opts;
  const [state, setState] = useState<RecorderState>('idle');
  const [chunks, setChunks] = useState(0);

  const streamRef = useRef<MediaStream | null>(null);
  const recRef = useRef<MediaRecorder | null>(null);
  const seqRef = useRef(0);
  const queue = useRef<Blob[]>([]);
  const sending = useRef(false);
  const stateRef = useRef(onState);
  stateRef.current = onState;

  /* One at a time, and a failed chunk is dropped rather than retried forever — a candidate
     on bad wifi must not accumulate an ever-growing backlog competing with their answers. */
  const drain = useCallback(async () => {
    if (sending.current) return;
    sending.current = true;
    while (queue.current.length) {
      const blob = queue.current.shift()!;
      seqRef.current += 1;
      const fd = new FormData();
      fd.append('seq', String(seqRef.current));
      fd.append('chunk', blob, `${seqRef.current}.webm`);
      try {
        const r = await fetch(`${API_BASE_URL}/public/hackathon-exams/attempt/${token}/recording/chunk`, {
          method: 'POST', body: fd,
        });
        if (r.ok) setChunks(seqRef.current);
      } catch { /* the paper carries on; the gap shows in the count a reviewer sees */ }
    }
    sending.current = false;
  }, [token]);

  const stop = useCallback(() => {
    try { recRef.current?.state !== 'inactive' && recRef.current?.stop(); } catch { /* already gone */ }
    streamRef.current?.getTracks().forEach((t) => { try { t.stop(); } catch { /* ignore */ } });
    streamRef.current = null;
    recRef.current = null;
    setState((s) => (s === 'recording' ? 'done' : s));
  }, []);

  const start = useCallback(async () => {
    if (!enabled || recRef.current) return;

    if (!navigator.mediaDevices?.getUserMedia || typeof MediaRecorder === 'undefined') {
      setState('unavailable');
      stateRef.current('unavailable', 'This browser cannot record.');
      return;
    }

    let stream: MediaStream;
    try {
      stream = await navigator.mediaDevices.getUserMedia({
        video: { width: { ideal: 640 }, height: { ideal: 480 }, frameRate: { ideal: 12 } },
        audio: true,
      });
    } catch (e: any) {
      /* NotAllowedError is a person saying no. NotFoundError is a laptop without a camera.
         Both let the exam proceed, and the difference is the whole value of recording it. */
      const denied = e?.name === 'NotAllowedError' || e?.name === 'SecurityError';
      const s = denied ? 'denied' : 'unavailable';
      setState(s);
      stateRef.current(s, e?.name || 'getUserMedia failed');
      return;
    }

    const mimeType = pickMime();
    let rec: MediaRecorder;
    try {
      rec = new MediaRecorder(stream, {
        ...(mimeType ? { mimeType } : {}),
        videoBitsPerSecond: VIDEO_BPS,
        audioBitsPerSecond: AUDIO_BPS,
      });
    } catch (e: any) {
      stream.getTracks().forEach((t) => t.stop());
      setState('unavailable');
      stateRef.current('unavailable', e?.message || 'MediaRecorder rejected the stream');
      return;
    }

    rec.ondataavailable = (ev) => {
      if (ev.data && ev.data.size > 0) { queue.current.push(ev.data); void drain(); }
    };
    /* Somebody can revoke the camera from the browser's own UI mid-exam. That is worth
       recording as a fact; it is not worth ending their paper over. */
    stream.getTracks().forEach((t) => {
      t.onended = () => { setState('done'); stateRef.current('done', 'A track ended before the exam did.'); };
    });

    streamRef.current = stream;
    recRef.current = rec;
    rec.start(SLICE_MS);
    setState('recording');
    stateRef.current('recording');
  }, [enabled, drain]);

  /* Tracks are a device in use. Leaving one running because a component unmounted leaves a
     camera light on somebody's laptop after their exam, which is its own kind of wrong. */
  useEffect(() => () => { stop(); }, [stop]);

  return { state, chunks, start, stop };
}
