import { useCallback, useRef, useState } from 'react';

/**
 * Records a whole mock-interview sitting to a single webm the member can watch back.
 *
 * Recording is OPTIONAL and must stay that way. A denied camera permission, a machine with
 * no webcam, or a browser without MediaRecorder all have to leave the interview completely
 * usable — the sitting is the product, the video is an extra on top of it. So every failure
 * here resolves to "no recording" with a reason to show, never to a thrown error that would
 * take the interview down with it.
 */

const pickMime = (): string => {
  const candidates = [
    'video/webm;codecs=vp9,opus',
    'video/webm;codecs=vp8,opus',
    'video/webm',
    'video/mp4',
  ];
  for (const m of candidates) {
    if ((window as any).MediaRecorder?.isTypeSupported?.(m)) return m;
  }
  return '';
};

export interface SessionRecorder {
  /** Live camera stream for the preview element, or null when not recording. */
  stream: MediaStream | null;
  recording: boolean;
  /** Why there is no recording, in words that can be shown to the member. */
  error: string;
  seconds: number;
  supported: boolean;
  start: () => Promise<boolean>;
  /** Stops the camera and resolves with the finished file, or null if there is nothing. */
  stop: () => Promise<{ blob: Blob; seconds: number } | null>;
}

export function useSessionRecorder(): SessionRecorder {
  const [stream, setStream] = useState<MediaStream | null>(null);
  const [recording, setRecording] = useState(false);
  const [error, setError] = useState('');
  const [seconds, setSeconds] = useState(0);

  const recRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const streamRef = useRef<MediaStream | null>(null);
  const tickRef = useRef<any>(null);
  const startedAtRef = useRef(0);

  const supported = typeof window !== 'undefined'
    && !!navigator.mediaDevices?.getUserMedia
    && !!(window as any).MediaRecorder;

  const releaseCamera = useCallback(() => {
    streamRef.current?.getTracks().forEach(t => t.stop());
    streamRef.current = null;
    setStream(null);
    if (tickRef.current) { clearInterval(tickRef.current); tickRef.current = null; }
  }, []);

  const start = useCallback(async (): Promise<boolean> => {
    if (!supported) {
      setError('This browser cannot record video, so this session will not be saved.');
      return false;
    }
    try {
      const s = await navigator.mediaDevices.getUserMedia({
        video: { width: { ideal: 640 }, height: { ideal: 480 }, frameRate: { ideal: 24 } },
        audio: true,
      });
      streamRef.current = s;
      setStream(s);

      const mime = pickMime();
      const rec = new MediaRecorder(s, mime ? { mimeType: mime } : undefined);
      chunksRef.current = [];
      rec.ondataavailable = e => { if (e.data?.size) chunksRef.current.push(e.data); };
      // One second per chunk. If the tab dies mid-interview everything up to the last
      // second is still in memory, rather than a single chunk that only materialises at stop.
      rec.start(1000);
      recRef.current = rec;

      startedAtRef.current = Date.now();
      setSeconds(0);
      tickRef.current = setInterval(
        () => setSeconds(Math.round((Date.now() - startedAtRef.current) / 1000)),
        1000,
      );
      setRecording(true);
      setError('');
      return true;
    } catch (e: any) {
      // Named specifically: "denied" and "no camera attached" need different actions from
      // the member, and one generic message would leave them guessing which they hit.
      const name = e?.name || '';
      setError(
        name === 'NotAllowedError' || name === 'SecurityError'
          ? 'Camera access was blocked, so this session will not be recorded. You can still do the interview.'
          : name === 'NotFoundError' || name === 'OverconstrainedError'
            ? 'No camera was found, so this session will not be recorded. You can still do the interview.'
            : 'The camera could not be started, so this session will not be recorded.',
      );
      releaseCamera();
      setRecording(false);
      return false;
    }
  }, [supported, releaseCamera]);

  const stop = useCallback(async (): Promise<{ blob: Blob; seconds: number } | null> => {
    const rec = recRef.current;
    if (!rec || rec.state === 'inactive') { releaseCamera(); setRecording(false); return null; }

    const elapsed = Math.round((Date.now() - startedAtRef.current) / 1000);
    const blob = await new Promise<Blob | null>(resolve => {
      rec.onstop = () => {
        const parts = chunksRef.current;
        resolve(parts.length ? new Blob(parts, { type: rec.mimeType || 'video/webm' }) : null);
      };
      try { rec.stop(); } catch { resolve(null); }
    });

    recRef.current = null;
    chunksRef.current = [];
    releaseCamera();
    setRecording(false);
    return blob ? { blob, seconds: elapsed } : null;
  }, [releaseCamera]);

  return { stream, recording, error, seconds, supported, start, stop };
}
