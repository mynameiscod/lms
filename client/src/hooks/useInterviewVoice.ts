import { useState, useRef, useCallback, useEffect } from 'react';

/**
 * Browser-native voice layer for the AI interview:
 *   - TTS via SpeechSynthesis  → the interviewer "speaks" the question
 *   - STT via SpeechRecognition → the student speaks their answer
 *
 * No canvas / GPU compositing (avoids the STATUS_BREAKPOINT crash seen with
 * canvas.captureStream on this machine). Everything degrades gracefully: if a
 * capability is unsupported or the mic is denied, the caller falls back to typing.
 */
export interface InterviewVoice {
  ttsSupported: boolean;
  sttSupported: boolean;
  speaking: boolean;
  listening: boolean;
  transcript: string;
  error: string;
  speak: (text: string, onEnd?: () => void) => void;
  stopSpeaking: () => void;
  startListening: () => void;
  stopListening: () => void;
  resetTranscript: () => void;
}

export function useInterviewVoice(): InterviewVoice {
  const synth = typeof window !== 'undefined' ? window.speechSynthesis : undefined;
  const SR = typeof window !== 'undefined'
    ? ((window as any).SpeechRecognition || (window as any).webkitSpeechRecognition)
    : undefined;

  const ttsSupported = !!synth;
  const sttSupported = !!SR;

  const [speaking, setSpeaking] = useState(false);
  const [listening, setListening] = useState(false);
  const [transcript, setTranscript] = useState('');
  const [error, setError] = useState('');
  const recogRef = useRef<any>(null);
  const finalRef = useRef('');

  const stopSpeaking = useCallback(() => {
    try { synth?.cancel(); } catch { /* ignore */ }
    setSpeaking(false);
  }, [synth]);

  const speak = useCallback((text: string, onEnd?: () => void) => {
    if (!synth || !text) { onEnd?.(); return; }
    try {
      synth.cancel();
      const u = new SpeechSynthesisUtterance(text);
      u.rate = 1; u.pitch = 1; u.lang = 'en-US';
      // Prefer a natural-sounding English voice when available.
      const voices = synth.getVoices?.() || [];
      const preferred = voices.find(v => /Google US English|Samantha|Microsoft (Aria|Jenny|Zira)/i.test(v.name) && /en/i.test(v.lang))
        || voices.find(v => /en-US/i.test(v.lang));
      if (preferred) u.voice = preferred;
      u.onstart = () => setSpeaking(true);
      u.onend = () => { setSpeaking(false); onEnd?.(); };
      u.onerror = () => { setSpeaking(false); onEnd?.(); };
      synth.speak(u);
    } catch { setSpeaking(false); onEnd?.(); }
  }, [synth]);

  const startListening = useCallback(() => {
    if (!SR) {
      setError("Voice input isn't supported in this browser — please type your answer.");
      return;
    }
    try {
      stopSpeaking(); // don't capture our own TTS
      const recog = new SR();
      recog.lang = 'en-US';
      recog.continuous = true;
      recog.interimResults = true;
      finalRef.current = '';
      recog.onresult = (e: any) => {
        let interim = '';
        for (let i = e.resultIndex; i < e.results.length; i++) {
          const r = e.results[i];
          if (r.isFinal) finalRef.current += r[0].transcript + ' ';
          else interim += r[0].transcript;
        }
        setTranscript((finalRef.current + interim).trim());
      };
      recog.onerror = (e: any) => {
        if (e.error === 'not-allowed' || e.error === 'service-not-allowed') {
          setError('Microphone access was denied. Please type your answer or enable the mic.');
        } else if (e.error === 'no-speech') {
          setError('No speech detected — try again or type your answer.');
        } else if (e.error !== 'aborted') {
          setError('Voice capture error — you can type your answer.');
        }
        setListening(false);
      };
      recog.onend = () => setListening(false);
      recogRef.current = recog;
      setError('');
      recog.start();
      setListening(true);
    } catch {
      setError('Could not start the microphone. Please type your answer.');
      setListening(false);
    }
  }, [SR, stopSpeaking]);

  const stopListening = useCallback(() => {
    try { recogRef.current?.stop(); } catch { /* ignore */ }
    setListening(false);
  }, []);

  const resetTranscript = useCallback(() => {
    finalRef.current = '';
    setTranscript('');
  }, []);

  // Cleanup on unmount
  useEffect(() => () => {
    try { synth?.cancel(); recogRef.current?.stop(); } catch { /* ignore */ }
  }, [synth]);

  return {
    ttsSupported, sttSupported, speaking, listening, transcript, error,
    speak, stopSpeaking, startListening, stopListening, resetTranscript,
  };
}
