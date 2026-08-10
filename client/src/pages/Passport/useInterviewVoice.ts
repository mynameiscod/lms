import { useCallback, useEffect, useRef, useState } from 'react';

/**
 * Voice for the mock interview, using the BROWSER's speech engines.
 *
 * Both directions are free and need no API key:
 *   - speechSynthesis  — reads the interviewer's line aloud (near-universal support)
 *   - SpeechRecognition — turns the candidate's speech into text (Chrome/Edge)
 *
 * Whisper would transcribe more accurately, but at roughly ₹8 per interview it was over
 * half the total cost — more than the conversation and the grading combined. The browser
 * does it for nothing, and typing stays available for anyone whose browser cannot, so the
 * feature degrades instead of breaking.
 */

// Vendor-prefixed on Chrome; the unprefixed name is the standard one.
const SpeechRec: any =
  typeof window !== 'undefined'
    ? (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition
    : null;

export const speechInSupported = !!SpeechRec;
export const speechOutSupported = typeof window !== 'undefined' && 'speechSynthesis' in window;

export function useInterviewVoice(opts: { onFinalTranscript: (text: string) => void }) {
  const [speaking, setSpeaking] = useState(false);
  const [listening, setListening] = useState(false);
  const [interim, setInterim] = useState('');
  const recRef = useRef<any>(null);
  // Held in a ref so the recogniser's long-lived handlers always call the CURRENT
  // callback — recreating the recogniser on every render would cut the candidate off
  // mid-sentence.
  const onFinal = useRef(opts.onFinalTranscript);
  useEffect(() => { onFinal.current = opts.onFinalTranscript; }, [opts.onFinalTranscript]);

  /** Read a line aloud. Resolves when it finishes, so the caller can then start listening. */
  const speak = useCallback((text: string): Promise<void> => {
    if (!speechOutSupported || !text) return Promise.resolve();
    return new Promise(resolve => {
      try {
        window.speechSynthesis.cancel();          // never let two lines overlap
        const u = new SpeechSynthesisUtterance(text);
        u.rate = 1.0; u.pitch = 1.0; u.lang = 'en-IN';
        // Prefer an Indian English voice when the device has one — the interviewer is
        // called Priya, and a US voice undercuts that before she says anything.
        const voices = window.speechSynthesis.getVoices();
        const preferred =
          voices.find(v => /en[-_]IN/i.test(v.lang)) ||
          voices.find(v => /en[-_]GB/i.test(v.lang));
        if (preferred) u.voice = preferred;
        u.onend = () => { setSpeaking(false); resolve(); };
        u.onerror = () => { setSpeaking(false); resolve(); };
        setSpeaking(true);
        window.speechSynthesis.speak(u);
      } catch { setSpeaking(false); resolve(); }
    });
  }, []);

  const stopSpeaking = useCallback(() => {
    try { window.speechSynthesis.cancel(); } catch { /* ignore */ }
    setSpeaking(false);
  }, []);

  const startListening = useCallback(() => {
    if (!SpeechRec) return;
    try {
      // Speaking while the mic is open makes the interviewer transcribe herself.
      window.speechSynthesis?.cancel();
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
  }, []);

  const stopListening = useCallback(() => {
    try { recRef.current?.stop(); } catch { /* ignore */ }
    setListening(false); setInterim('');
  }, []);

  // Leaving the page mid-interview must not leave a voice talking to an empty room or a
  // mic still open.
  useEffect(() => () => {
    try { window.speechSynthesis?.cancel(); } catch { /* ignore */ }
    try { recRef.current?.stop(); } catch { /* ignore */ }
  }, []);

  return { speak, stopSpeaking, speaking, startListening, stopListening, listening, interim };
}
