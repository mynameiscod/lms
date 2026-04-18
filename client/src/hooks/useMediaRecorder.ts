import { useState, useRef, useCallback, useEffect } from 'react';

export type RecordingMode = 'video' | 'audio';

export interface UseMediaRecorderReturn {
  /** Whether the browser has camera/mic permission */
  hasPermission: boolean | null;
  /** Is currently recording */
  isRecording: boolean;
  /** Current recording duration in seconds */
  duration: number;
  /** Error message, if any */
  error: string;
  /** Live video stream for preview (attach to <video> srcObject) */
  stream: MediaStream | null;
  /** The recorded blob after stop */
  recordedBlob: Blob | null;
  /** Object URL of the recorded blob for playback */
  previewUrl: string;
  /** Request camera/mic permission and start the stream preview */
  requestPermission: () => Promise<void>;
  /** Start recording */
  startRecording: () => void;
  /** Stop recording */
  stopRecording: () => void;
  /** Reset everything (clear blob, preview, errors) */
  reset: () => void;
  /** Completely tear down streams and recorder */
  cleanup: () => void;
}

/**
 * A reusable React hook for per-question audio/video recording using
 * the browser MediaRecorder API (WebRTC getUserMedia).
 *
 * @param mode - 'video' (camera + mic) or 'audio' (mic only)
 * @param autoRequestPermission - automatically request permission on mount
 */
export function useMediaRecorder(
  mode: RecordingMode = 'video',
  autoRequestPermission = false
): UseMediaRecorderReturn {
  const [hasPermission, setHasPermission] = useState<boolean | null>(null);
  const [isRecording, setIsRecording] = useState(false);
  const [duration, setDuration] = useState(0);
  const [error, setError] = useState('');
  const [stream, setStream] = useState<MediaStream | null>(null);
  const [recordedBlob, setRecordedBlob] = useState<Blob | null>(null);
  const [previewUrl, setPreviewUrl] = useState('');

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const streamRef = useRef<MediaStream | null>(null);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Stop all tracks on a stream
  const stopTracks = useCallback((s: MediaStream | null) => {
    if (s) s.getTracks().forEach(t => t.stop());
  }, []);

  const cleanup = useCallback(() => {
    if (timerRef.current) clearInterval(timerRef.current);
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
      try { mediaRecorderRef.current.stop(); } catch (_) {}
    }
    stopTracks(streamRef.current);
    streamRef.current = null;
    setStream(null);
    setIsRecording(false);
    setDuration(0);
  }, [stopTracks]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      cleanup();
      // revoke object URL
      if (previewUrl) URL.revokeObjectURL(previewUrl);
    };
  }, []);

  // Auto-request permission
  useEffect(() => {
    if (autoRequestPermission && hasPermission === null) {
      requestPermission();
    }
  }, [autoRequestPermission]);

  const requestPermission = useCallback(async () => {
    try {
      setError('');
      const constraints: MediaStreamConstraints =
        mode === 'video'
          ? {
              video: { width: { ideal: 640 }, height: { ideal: 480 }, facingMode: 'user' },
              audio: true,
            }
          : { audio: true };

      const s = await navigator.mediaDevices.getUserMedia(constraints);
      stopTracks(streamRef.current); // stop old if any
      streamRef.current = s;
      setStream(s);
      setHasPermission(true);
    } catch (err: any) {
      setHasPermission(false);
      setError(
        err.name === 'NotAllowedError'
          ? `${mode === 'video' ? 'Camera & microphone' : 'Microphone'} permission denied. Please allow access.`
          : `Could not access ${mode === 'video' ? 'camera' : 'microphone'}. Check device settings.`
      );
    }
  }, [mode, stopTracks]);

  const startRecording = useCallback(() => {
    const s = streamRef.current;
    if (!s) {
      setError('Stream not ready. Grant permission first.');
      return;
    }

    setRecordedBlob(null);
    if (previewUrl) URL.revokeObjectURL(previewUrl);
    setPreviewUrl('');
    chunksRef.current = [];
    setDuration(0);

    const mimeType =
      mode === 'video'
        ? (MediaRecorder.isTypeSupported('video/webm;codecs=vp9,opus')
          ? 'video/webm;codecs=vp9,opus'
          : 'video/webm')
        : (MediaRecorder.isTypeSupported('audio/webm;codecs=opus')
          ? 'audio/webm;codecs=opus'
          : 'audio/webm');

    let recorder: MediaRecorder;
    try {
      recorder = new MediaRecorder(s, { mimeType });
    } catch {
      try {
        recorder = new MediaRecorder(s);
      } catch (e2) {
        setError('Recording not supported in this browser.');
        return;
      }
    }

    recorder.ondataavailable = (e) => {
      if (e.data.size > 0) chunksRef.current.push(e.data);
    };

    recorder.onstop = () => {
      const blob = new Blob(chunksRef.current, { type: mimeType });
      setRecordedBlob(blob);
      const url = URL.createObjectURL(blob);
      setPreviewUrl(url);
    };

    mediaRecorderRef.current = recorder;
    recorder.start(500);
    setIsRecording(true);

    // Duration timer
    timerRef.current = setInterval(() => {
      setDuration(prev => prev + 1);
    }, 1000);
  }, [mode, previewUrl]);

  const stopRecording = useCallback(() => {
    if (timerRef.current) clearInterval(timerRef.current);
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
      mediaRecorderRef.current.stop();
    }
    setIsRecording(false);
  }, []);

  const reset = useCallback(() => {
    if (previewUrl) URL.revokeObjectURL(previewUrl);
    setRecordedBlob(null);
    setPreviewUrl('');
    setDuration(0);
    setError('');
    chunksRef.current = [];
  }, [previewUrl]);

  return {
    hasPermission,
    isRecording,
    duration,
    error,
    stream,
    recordedBlob,
    previewUrl,
    requestPermission,
    startRecording,
    stopRecording,
    reset,
    cleanup,
  };
}
