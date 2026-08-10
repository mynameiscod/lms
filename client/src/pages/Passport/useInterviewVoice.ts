import { useCallback, useEffect, useRef, useState } from 'react';
import passportApi from '../../api/passportApi';
import { lipSync } from './lipsync';
import { INTERVIEWER_FACE_ENABLED } from './interviewFace';

/**
 * Voice for the mock interview.
 *
 * OUT (interviewer speaking) — real neural TTS from the server, because a robotic voice
 * undoes the one thing a mock interview is for. The browser's speechSynthesis stays as the
 * fallback: if the key is missing, the quota is out, or the network hiccups, the interview
 * carries on in a synthetic voice rather than falling silent.
 *
 * IN (candidate answering) — the browser's SpeechRecognition (Chrome/Edge), which is free.
 * Whisper would transcribe more accurately, but at roughly ₹8 per interview it was over
 * half the total cost — more than the conversation and the grading combined. Typing stays
 * available for anyone whose browser cannot, so the feature degrades instead of breaking.
 */

// Vendor-prefixed on Chrome; the unprefixed name is the standard one.
const SpeechRec: any =
  typeof window !== 'undefined'
    ? (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition
    : null;

export const speechInSupported = !!SpeechRec;
// Voice output works everywhere: server audio needs only an <audio> element, and every
// browser that cannot do speechSynthesis can still play an mp3.
export const speechOutSupported = typeof window !== 'undefined';

export function useInterviewVoice(opts: { onFinalTranscript: (text: string) => void }) {
  const [speaking, setSpeaking] = useState(false);
  const [listening, setListening] = useState(false);
  const [interim, setInterim] = useState('');
  const recRef = useRef<any>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  // Once the server voice has failed we stop paying the round-trip to fail again — a
  // missing key does not fix itself mid-interview.
  const serverVoiceDead = useRef(false);
  // Held in a ref so the recogniser's long-lived handlers always call the CURRENT
  // callback — recreating the recogniser on every render would cut the candidate off
  // mid-sentence.
  const onFinal = useRef(opts.onFinalTranscript);
  useEffect(() => { onFinal.current = opts.onFinalTranscript; }, [opts.onFinalTranscript]);

  /** Stop whatever is currently being spoken, by either engine. */
  const silence = useCallback(() => {
    try { window.speechSynthesis?.cancel(); } catch { /* ignore */ }
    const a = audioRef.current;
    if (a) {
      a.onended = null; a.onerror = null;   // detach before pause, or pausing resolves the promise
      try { a.pause(); } catch { /* ignore */ }
      lipSync.reset();          // stop the mouth mid-word rather than freezing it open
      if (a.src) URL.revokeObjectURL(a.src);
      audioRef.current = null;
    }
  }, []);

  /** The browser's synthetic voice — the fallback path. */
  const speakLocal = useCallback((text: string): Promise<void> => {
    if (typeof window === 'undefined' || !('speechSynthesis' in window)) return Promise.resolve();
    return new Promise(resolve => {
      try {
        window.speechSynthesis.cancel();          // never let two lines overlap
        const u = new SpeechSynthesisUtterance(text);
        u.rate = 1.0; u.pitch = 1.0; u.lang = 'en-IN';
        // Prefer an Indian English voice when the device has one. This is only the
        // fallback path, but a US voice undercuts the interviewer before he says anything.
        const voices = window.speechSynthesis.getVoices();
        const preferred =
          voices.find(v => /en[-_]IN/i.test(v.lang)) ||
          voices.find(v => /en[-_]GB/i.test(v.lang));
        if (preferred) u.voice = preferred;
        u.onend = () => resolve();
        u.onerror = () => resolve();
        window.speechSynthesis.speak(u);
      } catch { resolve(); }
    });
  }, []);

  /**
   * Read a line aloud. Resolves when it finishes, so the caller can then start listening.
   *
   * Real voice first, browser voice if that fails for any reason at all.
   */
  const speak = useCallback(async (text: string): Promise<void> => {
    if (!text) return;
    silence();                       // never let two lines overlap
    setSpeaking(true);
    try {
      if (!serverVoiceDead.current) {
        try {
          const url = await passportApi.speakInterviewLine(text);
          await new Promise<void>(resolve => {
            // A blob: URL is same-origin, so the analyser can read its samples — audio
            // fetched cross-origin without CORS would be silent in the graph.
            const a = new Audio(url);
            audioRef.current = a;
            // Route through the analyser so the avatar's mouth follows this line. Must
            // happen before play(): attaching mid-playback drops the first syllables.
            // Skipped when there is no face to drive — putting the audio through a Web
            // Audio graph for nobody's benefit is a failure surface with no upside.
            if (INTERVIEWER_FACE_ENABLED) lipSync.attach(a);
            const done = () => { URL.revokeObjectURL(url); resolve(); };
            a.onended = done;
            a.onerror = done;
            a.play().catch(done);    // autoplay blocked → fall through, don't hang
          });
          return;
        } catch {
          // One failure is enough to know: no key, no quota, or no network.
          serverVoiceDead.current = true;
        }
      }
      await speakLocal(text);
    } finally {
      setSpeaking(false);
    }
  }, [silence, speakLocal]);

  const stopSpeaking = useCallback(() => {
    silence();
    setSpeaking(false);
  }, [silence]);

  const startListening = useCallback(() => {
    if (!SpeechRec) return;
    try {
      // Speaking while the mic is open makes the interviewer transcribe themselves.
      silence();
      const rec = new SpeechRec();
      rec.lang = 'en-IN';
      rec.continuous = true;          // a real answer has pauses in it
      rec.interimResults = true;      // show words as they land, so it feels live

      rec.onresult = (e: any) => {
        let finalText = '';
        let partial = '';
        for (let i = e.resultIndex; i < e.results.length; i++) {
          const r = e.results[i];
          if (r.isFinal) finalText += r[0].transcript;
          else partial += r[0].transcript;
        }
        setInterim(partial);
        if (finalText.trim()) onFinal.current(finalText.trim());
      };
      // `no-speech` and `aborted` are normal — someone paused, or we stopped it
      // ourselves. Only surface the ones that mean the mic is genuinely unavailable.
      rec.onerror = (e: any) => {
        if (e?.error && !['no-speech', 'aborted'].includes(e.error)) setListening(false);
      };
      rec.onend = () => { setListening(false); setInterim(''); };

      recRef.current = rec;
      rec.start();
      setListening(true);
    } catch { setListening(false); }
  }, [silence]);

  const stopListening = useCallback(() => {
    try { recRef.current?.stop(); } catch { /* ignore */ }
    setListening(false); setInterim('');
  }, []);

  // Leaving the page mid-interview must not leave a voice talking to an empty room or a
  // mic still open.
  useEffect(() => () => {
    silence();
    try { recRef.current?.stop(); } catch { /* ignore */ }
  }, [silence]);

  return { speak, stopSpeaking, speaking, startListening, stopListening, listening, interim };
}
