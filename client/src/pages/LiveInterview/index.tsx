import React, { useCallback, useEffect, useRef, useState } from 'react';
import { useParams, useNavigate, useSearchParams } from 'react-router-dom';
import { studentInterviewApi } from '../../api/interviewModuleApi';
import { useInterviewVoice } from '../../hooks/useInterviewVoice';
import './LiveInterview.css';

type Phase = 'lobby' | 'connecting' | 'live' | 'ending' | 'ended' | 'error';
const SILENCE_MS = 2500;   // auto-submit after this much quiet once the candidate has spoken

export default function LiveInterview() {
  const { templateId } = useParams<{ templateId: string }>();
  const [search] = useSearchParams();
  const assignmentId = search.get('assignmentId') || undefined;
  const navigate = useNavigate();
  const voice = useInterviewVoice();

  const [phase, setPhase] = useState<Phase>('lobby');
  const [error, setError] = useState('');
  const [line, setLine] = useState('');          // current interviewer caption
  const [captionsOn, setCaptionsOn] = useState(true);
  const [muted, setMuted] = useState(false);
  const [typed, setTyped] = useState('');
  const [aiSpeaking, setAiSpeaking] = useState(false);
  const [cfg, setCfg] = useState<{ voiceProvider: string; avatarProvider: string; interviewerName: string; avatarImageUrl: string }>(
    { voiceProvider: 'browser', avatarProvider: 'animated', interviewerName: 'AI Interviewer', avatarImageUrl: '' });

  const videoRef = useRef<HTMLVideoElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const attemptRef = useRef<string>('');
  const runningRef = useRef(false);
  const silenceTimer = useRef<any>(null);
  const lastTranscriptRef = useRef('');
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const cfgRef = useRef(cfg);
  cfgRef.current = cfg;

  // Browser-voice path
  const browserSpeak = useCallback((text: string, onEnd?: () => void) => {
    setAiSpeaking(true);
    voice.speak(text, () => { setAiSpeaking(false); onEnd?.(); });
  }, [voice]);

  // Unified "interviewer speaks": natural ElevenLabs voice when configured, else browser TTS.
  const say = useCallback((text: string, onEnd?: () => void) => {
    setLine(text);
    if (cfgRef.current.voiceProvider !== 'elevenlabs') { browserSpeak(text, onEnd); return; }
    studentInterviewApi.ttsAudio(text).then(blob => {
      if (!blob) { browserSpeak(text, onEnd); return; }
      const url = URL.createObjectURL(blob);
      const audio = new Audio(url);
      audioRef.current = audio;
      setAiSpeaking(true);
      const done = () => { setAiSpeaking(false); URL.revokeObjectURL(url); };
      audio.onended = () => { done(); onEnd?.(); };
      audio.onerror = () => { done(); browserSpeak(text, onEnd); };
      audio.play().catch(() => { done(); browserSpeak(text, onEnd); });
    }).catch(() => browserSpeak(text, onEnd));
  }, [browserSpeak]);

  const stopSpeaking = useCallback(() => {
    voice.stopSpeaking();
    if (audioRef.current) { try { audioRef.current.pause(); } catch { /* ignore */ } audioRef.current = null; }
    setAiSpeaking(false);
  }, [voice]);

  // ── camera self-view ──
  const startCamera = useCallback(async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: false });
      streamRef.current = stream;
      if (videoRef.current) videoRef.current.srcObject = stream;
    } catch { /* camera optional — interview still works */ }
  }, []);

  // ── core loop: ask the next interviewer turn ──
  const askNext = useCallback(async (lastAnswer?: string) => {
    if (!runningRef.current) return;
    try {
      const res: any = await studentInterviewApi.converse(attemptRef.current, lastAnswer);
      const data = res?.data || res;
      const say0: string = data.say || '';
      setLine(say0);
      if (data.endInterview) {
        // Let the closing line play, then finish.
        say(say0, () => finish());
        return;
      }
      // Speak the question, then auto-listen for the answer.
      say(say0, () => {
        if (!runningRef.current || muted) return;
        voice.resetTranscript();
        lastTranscriptRef.current = '';
        voice.startListening();
      });
    } catch (e: any) {
      setError(e?.message || 'Connection issue. Please try again.');
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [muted]);

  // ── silence detection → auto-submit the spoken answer ──
  useEffect(() => {
    if (phase !== 'live' || !voice.listening) return;
    if (voice.transcript && voice.transcript !== lastTranscriptRef.current) {
      lastTranscriptRef.current = voice.transcript;
      if (silenceTimer.current) clearTimeout(silenceTimer.current);
      silenceTimer.current = setTimeout(() => {
        const answer = voice.transcript.trim();
        if (!answer) return;
        voice.stopListening();
        askNext(answer);
      }, SILENCE_MS);
    }
    return () => { if (silenceTimer.current) clearTimeout(silenceTimer.current); };
  }, [voice.transcript, voice.listening, phase, voice, askNext]);

  const finish = useCallback(async () => {
    runningRef.current = false;
    setPhase('ending');
    stopSpeaking(); voice.stopListening();
    try { await studentInterviewApi.submitAttempt(attemptRef.current); } catch { /* ignore */ }
    streamRef.current?.getTracks().forEach(t => t.stop());
    setPhase('ended');
    setTimeout(() => navigate(`/student/interviews/report/${attemptRef.current}`), 1800);
  }, [navigate, voice, stopSpeaking]);

  const startCall = useCallback(async () => {
    setPhase('connecting'); setError('');
    try {
      await startCamera();
      try { const c: any = await studentInterviewApi.voiceConfig(); if (c?.data) { setCfg(c.data); cfgRef.current = c.data; } } catch { /* defaults */ }
      const res: any = await studentInterviewApi.startAttempt(templateId!, assignmentId, 'conversational');
      const attempt = res?.data || res;
      attemptRef.current = attempt._id || attempt.id;
      runningRef.current = true;
      setPhase('live');
      askNext(); // interviewer intro
    } catch (e: any) {
      setError(e?.message || 'Could not start the interview.');
      setPhase('error');
    }
  }, [templateId, assignmentId, startCamera, askNext]);

  // manual submit (typed fallback / "I'm done")
  const submitTyped = () => {
    const ans = typed.trim();
    if (!ans) return;
    setTyped('');
    voice.stopListening();
    askNext(ans);
  };

  useEffect(() => () => {
    runningRef.current = false;
    stopSpeaking(); voice.stopListening();
    streamRef.current?.getTracks().forEach(t => t.stop());
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ── render ──
  if (phase === 'lobby' || phase === 'connecting' || phase === 'error') {
    return (
      <div className="li-root">
        <div className="li-overlay">
          <div className="li-card">
            <div style={{ fontSize: 48, marginBottom: 8 }}>🎙️</div>
            <h1>AI Mock Interview</h1>
            <p>
              You'll have a live, spoken conversation with an AI interviewer. Your mic turns on automatically after each
              question — just answer naturally, like a real interview. Make sure you're in a quiet place.
            </p>
            {!voice.sttSupported && <p style={{ color: '#fbbf24' }}>Heads up: voice input isn't supported in this browser — you can type your answers instead. (Chrome works best.)</p>}
            {error && <p style={{ color: '#f87171' }}>{error}</p>}
            <button className="li-btn li-btn-primary" style={{ fontSize: 16, padding: '13px 28px' }}
              onClick={startCall} disabled={phase === 'connecting'}>
              {phase === 'connecting' ? 'Connecting…' : '▶ Start interview'}
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (phase === 'ending' || phase === 'ended') {
    return (
      <div className="li-root">
        <div className="li-overlay">
          <div className="li-card">
            <div style={{ fontSize: 48, marginBottom: 8 }}>✅</div>
            <h1>Interview complete</h1>
            <p>Thanks! We're scoring your answers and preparing your feedback report…</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="li-root">
      <div className="li-top">
        <span className="dot" />
        <span className="title">AI Mock Interview · Live</span>
        <span className="timer">{aiSpeaking ? 'Interviewer speaking…' : voice.listening ? '🎤 Listening…' : 'Thinking…'}</span>
      </div>

      <div className="li-stage">
        {/* Interviewer */}
        <div className="li-tile">
          <div className="li-avatar">
            <div className={`li-face ${aiSpeaking ? 'speaking' : voice.listening ? 'listening' : ''}`}>
              {cfg.avatarImageUrl ? <img src={cfg.avatarImageUrl} alt={cfg.interviewerName} /> : '🧑‍💼'}
            </div>
            {aiSpeaking ? (
              <div className="li-waves"><span /><span /><span /><span /><span /></div>
            ) : (
              <div className="li-state">{voice.listening ? 'Listening to your answer…' : 'Preparing the next question…'}</div>
            )}
          </div>
          <span className="label">{cfg.interviewerName || 'AI Interviewer'}</span>
        </div>
        {/* Candidate */}
        <div className="li-tile">
          <video ref={videoRef} autoPlay muted playsInline />
          <span className="label">You</span>
        </div>
      </div>

      {captionsOn && (
        <div className="li-caption">
          <div className="who">Interviewer</div>
          <div className="line">{line || '…'}</div>
          {voice.listening && voice.transcript && <div className="line interim">"{voice.transcript}"</div>}
        </div>
      )}

      {(muted || !voice.sttSupported) && (
        <div className="li-typebar">
          <input value={typed} onChange={e => setTyped(e.target.value)} placeholder="Type your answer…"
            onKeyDown={e => e.key === 'Enter' && submitTyped()} />
          <button className="li-btn li-btn-primary" onClick={submitTyped}>Send</button>
        </div>
      )}

      <div className="li-controls">
        <button className="li-btn li-btn-ghost" onClick={() => setCaptionsOn(c => !c)}>{captionsOn ? '💬 Captions on' : '💬 Captions off'}</button>
        <button className="li-btn li-btn-ghost" onClick={() => {
          setMuted(m => {
            const next = !m;
            if (next) voice.stopListening();
            else if (!aiSpeaking) { voice.resetTranscript(); lastTranscriptRef.current = ''; voice.startListening(); }
            return next;
          });
        }}>{muted ? '🔇 Mic off' : '🎤 Mic on'}</button>
        {voice.listening && (
          <button className="li-btn li-btn-primary" onClick={() => { const a = voice.transcript.trim(); voice.stopListening(); if (a) askNext(a); }}>
            ✓ Done answering
          </button>
        )}
        <button className="li-btn li-btn-end" onClick={finish}>■ End interview</button>
      </div>
    </div>
  );
}
