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

/**
 * What each recognition failure means to the person it happened to.
 *
 * The browser's codes are accurate and useless to a candidate mid-interview; these say what to
 * do about it. Every one of them also leaves typing available, which is always the way out.
 */
const MIC_ERRORS: Record<string, string> = {
  'not-allowed': 'Your browser is blocking the microphone. Allow it in the address bar, then press the mic again.',
  'service-not-allowed': 'Your browser is blocking the microphone. Allow it in the address bar, then press the mic again.',
  'audio-capture': 'No microphone was found. Check it is plugged in and not in use by another app.',
  network: 'Speech recognition could not reach the network. You can type your answer instead.',
};

export function useInterviewVoice(opts: { onFinalTranscript: (text: string) => void }) {
  const [speaking, setSpeaking] = useState(false);
  const [listening, setListening] = useState(false);
  const [interim, setInterim] = useState('');
  /** What the microphone refused with, in words, because every failure here was silent. */
  const [micError, setMicError] = useState('');
  /** The last line spoken, so it can be played again. */
  const lastLine = useRef('');
  const recRef = useRef<any>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  // Once the server voice has failed we stop paying the round-trip to fail again — a
  // missing key does not fix itself mid-interview.
  const serverVoiceDead = useRef(false);
  // B11 — the member's intent, which outlives any single recogniser. Browsers END
  // recognition on a pause, so `listening` alone cannot say whether they still want the
  // mic open; without this, the first breath between sentences ended the answer.
  const wantListening = useRef(false);
  // M7 — how many results of the CURRENT recogniser have already been committed. Chrome
  // re-reports earlier finals in later events, so appending everything from
  // `e.resultIndex` transcribes the same sentence two or three times.
  const consumed = useRef(0);
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
  /**
   * Says a line, and REPORTS WHETHER IT WAS HEARD.
   *
   * It used to return void and swallow every failure — autoplay blocked, TTS down, a browser
   * with no usable voice. The caller marked the line as spoken before calling this, so a line
   * that made no sound at all was recorded as said and could never be tried again. Returning
   * the outcome lets the caller only remember what the student actually heard.
   */
  const speak = useCallback(async (text: string): Promise<boolean> => {
    if (!text) return false;
    silence();                       // never let two lines overlap
    setSpeaking(true);
    lastLine.current = text;         // so it can be played again
    try {
      let played = false;
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
            /*
             * Autoplay blocked resolves immediately with nothing played, and that is not the
             * same as having been heard — so it is reported as a failure rather than hidden.
             */
            a.play().then(() => { played = true; }).catch(done);
          });
          if (played) return true;
        } catch {
          // One failure is enough to know: no key, no quota, or no network.
          serverVoiceDead.current = true;
        }
      }
      await speakLocal(text);
      return true;
    } finally {
      setSpeaking(false);
    }
  }, [silence, speakLocal]);

  /**
   * Say the last line again.
   *
   * There was no way to hear a question twice — the only voice controls were Skip and a mute
   * toggle, and the caller's "already spoken" guard blocked any second attempt. A candidate who
   * missed a word had to guess at the question.
   */
  const replay = useCallback(async (): Promise<boolean> => (
    lastLine.current ? speak(lastLine.current) : false
  ), [speak]);

  /**
   * Let the voice try the server again — called when a new sitting starts.
   *
   * `serverVoiceDead` latched for the life of the page, so one failed request during one
   * interview left every later interview on the browser's synthetic voice, which on Chrome
   * frequently says nothing at all.
   */
  const resetVoice = useCallback(() => {
    serverVoiceDead.current = false;
    lastLine.current = '';
    setMicError('');
  }, []);

  const stopSpeaking = useCallback(() => {
    silence();
    setSpeaking(false);
  }, [silence]);

  const startListening = useCallback(() => {
    if (!SpeechRec) return;
    /*
     * The browser gives no microphone to a page served over plain http on anything but
     * localhost, and SpeechRecognition reports that as a bare permission error. Said plainly
     * here, because no amount of clicking Allow will fix it.
     */
    if (typeof window !== 'undefined' && !window.isSecureContext) {
      setMicError('The microphone needs a secure (https) page. Open CareerPilot over https, or type your answer instead.');
      return;
    }
    setMicError('');
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
        // Walk the WHOLE list and commit only what has not been committed before.
        // `e.resultIndex` is where this event's changes start, not where new speech
        // starts — a result that was already final can appear again in a later event, and
        // trusting the index appends it a second time.
        for (let i = 0; i < e.results.length; i++) {
          const r = e.results[i];
          if (r.isFinal) {
            if (i >= consumed.current) {
              finalText += r[0].transcript;
              consumed.current = i + 1;
            }
          } else if (i >= consumed.current) {
            partial += r[0].transcript;
          }
        }
        setInterim(partial);
        if (finalText.trim()) onFinal.current(finalText.trim());
      };
      // `no-speech` and `aborted` are normal — someone paused, or we stopped it
      // ourselves. Only surface the ones that mean the mic is genuinely unavailable.
      // `no-speech` and `aborted` are normal — someone paused, or we stopped it
      // ourselves. Only a real fault should give up the mic.
      rec.onerror = (e: any) => {
        if (e?.error && !['no-speech', 'aborted'].includes(e.error)) {
          wantListening.current = false;
          setListening(false);
          /*
           * SAY WHY. Every one of these used to drop the mic without a word, which is the whole
           * of "the mic is not working": the button flicked off and nothing explained it. The
           * causes are ordinary and each has a different remedy, so they are named separately.
           */
          setMicError(MIC_ERRORS[String(e.error)] || 'The microphone stopped unexpectedly. You can type your answer instead.');
        }
      };

      // B11 — a browser ends recognition after a short silence, roughly a couple of
      // sentences in. Restarting while the member still wants the mic is what makes a
      // long answer possible without them pressing stop and start between thoughts.
      rec.onend = () => {
        setInterim('');
        /*
         * Only the CURRENT recogniser may restart itself. Stopping and starting quickly left the
         * old one's onend still firing, so it restarted alongside the new one — two recognisers
         * sharing one committed-results counter, which duplicates and drops words.
         */
        if (recRef.current !== rec) return;
        if (!wantListening.current) { setListening(false); return; }
        try {
          // A fresh recogniser restarts its result list, so the committed count resets
          // with it — otherwise the new session's first phrase is skipped.
          consumed.current = 0;
          rec.start();
        } catch {
          // start() throws if it is already running or the engine is busy; a short retry
          // covers the gap without spinning.
          window.setTimeout(() => {
            if (!wantListening.current) return;
            try { consumed.current = 0; rec.start(); } catch { setListening(false); }
          }, 250);
        }
      };

      recRef.current = rec;
      consumed.current = 0;
      wantListening.current = true;
      rec.start();
      setListening(true);
    } catch {
      wantListening.current = false;
      setListening(false);
      setMicError('The microphone could not be started. You can type your answer instead.');
    }
  }, [silence]);

  const stopListening = useCallback(() => {
    // Clear intent BEFORE stopping, or onend restarts the very recogniser being stopped.
    wantListening.current = false;
    const rec = recRef.current;
    recRef.current = null;            // the guard in onend compares against this
    try { rec?.stop(); } catch { /* ignore */ }
    setListening(false); setInterim('');
  }, []);

  // Leaving the page mid-interview must not leave a voice talking to an empty room or a
  // mic still open.
  useEffect(() => () => {
    wantListening.current = false;      // stop the restart loop before unmounting
    silence();
    try { recRef.current?.stop(); } catch { /* ignore */ }
  }, [silence]);

  return { speak, replay, resetVoice, stopSpeaking, speaking, startListening, stopListening, listening, interim, micError };
}
