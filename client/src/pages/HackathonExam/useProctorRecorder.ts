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
const VIDEO_BPS = 120_000;
const AUDIO_BPS = 32_000;

/*
 * ── WHY 60 SECONDS AND NOT 15 ──────────────────────────────────────────────────────────────
 *
 * 15-second chunks from 46 candidates is roughly three uploads per second arriving at the API
 * continuously, and they arrived faster than they uploaded. That queue is what started the
 * 22 September outage — recording uploads had to be blocked at nginx to get the platform back.
 *
 * A minute per chunk is a quarter of the requests for the same footage. Each one is larger,
 * which an HTTP upload handles far better than four times as many small ones: one TLS
 * negotiation, one set of headers, one write. The cost is that a laptop dying loses up to a
 * minute rather than up to fifteen seconds, which is an acceptable trade for evidence.
 */
const SLICE_MS = 60_000;

/*
 * ── AND WHY THE START IS JITTERED ──────────────────────────────────────────────────────────
 *
 * This is the part that actually caused the pile-up. Every candidate presses Start within a
 * minute or two of the same instant, so every MediaRecorder's timeslice fires in lockstep and
 * the whole cohort's chunks arrive in one synchronised burst, then nothing, then another burst.
 * The API sees a spike of 46 simultaneous multipart uploads rather than a steady trickle of
 * the same total bytes.
 *
 * Delaying each recorder's start by a random fraction of one slice spreads those bursts evenly
 * across the window. The footage is unaffected — it just begins a few seconds later.
 */
const START_JITTER_MS = SLICE_MS;

/*
 * ── AND WHY THE QUEUE IS BOUNDED ───────────────────────────────────────────────────────────
 *
 * Failed chunks were already dropped rather than retried. A SLOW upload was not: if a chunk
 * takes longer to send than the next takes to arrive, the queue grows without limit, holding
 * every blob in memory on a laptop that is already struggling. Four minutes of backlog is
 * plenty of margin; beyond that the oldest is dropped, because the newest footage is the
 * footage a reviewer wants and a browser tab that runs out of memory records nothing at all.
 */
const MAX_QUEUED_CHUNKS = 4;

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
  /*
   * The candidate's own camera, handed back so they can see it.
   *
   * Somebody being recorded should be able to check that the thing recording them is
   * pointed at them and working. Without a picture, "Recording" is a word they have to
   * take on trust — and the first they would learn that the lens was covered is when an
   * organiser reviewed an hour of black.
   */
  const [stream, setStream] = useState<MediaStream | null>(null);

  const streamRef = useRef<MediaStream | null>(null);
  const recRef = useRef<MediaRecorder | null>(null);
  const seqRef = useRef(0);
  const queue = useRef<Blob[]>([]);
  /* Counted, not silent: a reviewer looking at a gap needs to know it was dropped on purpose. */
  const droppedRef = useRef(0);
  const sending = useRef(false);
  const stopRef = useRef<() => void>(() => {});
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
        /*
         * 410 means the organisers switched recording off while this paper was running.
         * Stop immediately and drop anything queued — during an incident the whole point
         * of that switch is that it reaches tabs already recording, and a client that
         * keeps uploading regardless makes the switch useless.
         */
        if (r.status === 410) { queue.current.length = 0; stopRef.current(); break; }
      } catch { /* the paper carries on; the gap shows in the count a reviewer sees */ }
    }
    sending.current = false;
  }, [token]);

  const stop = useCallback(() => {
    try { recRef.current?.state !== 'inactive' && recRef.current?.stop(); } catch { /* already gone */ }
    streamRef.current?.getTracks().forEach((t) => { try { t.stop(); } catch { /* ignore */ } });
    streamRef.current = null;
    recRef.current = null;
    setStream(null);
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
      if (!ev.data || ev.data.size === 0) return;
      queue.current.push(ev.data);
      /* Bounded: drop the OLDEST when the backlog is too deep. See MAX_QUEUED_CHUNKS. */
      while (queue.current.length > MAX_QUEUED_CHUNKS) {
        queue.current.shift();
        droppedRef.current += 1;
      }
      void drain();
    };
    /* Somebody can revoke the camera from the browser's own UI mid-exam. That is worth
       recording as a fact; it is not worth ending their paper over. */
    stream.getTracks().forEach((t) => {
      t.onended = () => { setState('done'); stateRef.current('done', 'A track ended before the exam did.'); };
    });

    streamRef.current = stream;
    recRef.current = rec;
    setStream(stream);

    /*
     * Show the candidate their camera immediately, but stagger when the chunks start flowing.
     * The self-view is what tells them recording is working, and making them wait up to a
     * minute for it would read as broken.
     */
    setState('recording');
    stateRef.current('recording');

    const delay = Math.floor(Math.random() * START_JITTER_MS);
    window.setTimeout(() => {
      /* The paper may have been submitted, or the camera revoked, during the wait. */
      if (recRef.current !== rec || rec.state !== 'inactive') return;
      try { rec.start(SLICE_MS); } catch { /* the exam carries on regardless */ }
    }, delay);
  }, [enabled, drain]);

  /* Tracks are a device in use. Leaving one running because a component unmounted leaves a
     camera light on somebody's laptop after their exam, which is its own kind of wrong. */
  stopRef.current = stop;

  useEffect(() => () => { stop(); }, [stop]);

  return { state, chunks, dropped: droppedRef.current, stream, start, stop };
}
