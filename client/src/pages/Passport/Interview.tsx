import React, { useCallback, useEffect, useRef, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import passportApi, { InterviewSession, MemberEntitlement, MemberRoundView } from '../../api/passportApi';
import PassportShell from './PassportShell';
import SectionLock from './SectionLock';
import { useSessionRecorder } from './useSessionRecorder';
import { useInterviewVoice, speechInSupported, speechOutSupported } from './useInterviewVoice';
import { INTERVIEWER_FACE_ENABLED } from './interviewFace';
import './interviewRedesign.css';
import './interviewDashboard.css';
import './interviewHub.css';

const InterviewAvatar = React.lazy(() => import('./InterviewAvatar'));

const READINESS_LABEL: Record<string, string> = {
  not_ready: 'Not ready yet',
  needs_improvement: 'Needs improvement',
  almost_ready: 'Almost interview-ready',
  interview_ready: 'Interview ready',
};

const VERDICT_LABEL: Record<string, string> = { strong: 'Strong', okay: 'Okay', weak: 'Needs work' };

const ROUND_ICON: Record<string, string> = {
  technical: 'bi-code-slash', hr: 'bi-people', communication: 'bi-chat-dots',
};

/**
 * What each round is, said to the student.
 *
 * Written here rather than reusing the interviewer's `focus` line, which is an instruction
 * to a model in the third person ("what they have actually built") and reads like a
 * description of somebody else when shown to the person about to sit it.
 */
const ROUND_BLURB: Record<string, string> = {
  technical:     'System design, coding and problem-solving.',
  hr:            'Behavioural, cultural fit and career discussions.',
  communication: 'Clarity, structure and overall communication.',
};

/** What each round's feedback is, on the card's footer. */
const ROUND_FEEDBACK: Record<string, string> = {
  technical: 'Full evaluation', hr: 'Structured feedback', communication: 'AI feedback',
};

/** A round's name in the history, by what kind of round it was. */
const ROUND_NAME: Record<string, string> = {
  technical: 'Technical Interview', hr: 'HR Interview', communication: 'Communication Round',
};

/** "in 3 hours" / "on 12 Mar" — whichever is the more useful way to say when. */
const whenFree = (iso: string | null): string => {
  if (!iso) return '';
  const ms = new Date(iso).getTime() - Date.now();
  if (ms <= 0) return 'now';
  const hours = Math.ceil(ms / 3600_000);
  if (hours <= 1) return 'in under an hour';
  if (hours < 24) return `in ${hours} hours`;
  return `on ${new Date(iso).toLocaleDateString(undefined, { day: 'numeric', month: 'short' })}`;
};

const Interview: React.FC = () => {
  const [params] = useSearchParams();
  const navigate = useNavigate();
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [session, setSession] = useState<InterviewSession | null>(null);
  const [answer, setAnswer] = useState('');
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState('');
  const [notice, setNotice] = useState('');
  const recorder = useSessionRecorder();
  // Pulled out because it is a stable useCallback; the recorder object itself is a new
  // literal every render and would make `start` change identity on each one.
  const { start: startRecording } = recorder;
  const previewRef = useRef<HTMLVideoElement>(null);
  const [savingRec, setSavingRec] = useState(false);
  const [recWarning, setRecWarning] = useState('');
  const [playUrl, setPlayUrl] = useState('');
  /** The landing page's feedback panel: which past sitting it shows, and which tab. */
  const [pickedId, setPickedId] = useState<string | null>(null);
  const [fbTab, setFbTab] = useState<'feedback' | 'questions' | 'recording' | 'transcript'>('feedback');
  const [allHistory, setAllHistory] = useState(false);
  const chatEnd = useRef<HTMLDivElement>(null);
  const [voiceOn, setVoiceOn] = useState(speechOutSupported);
  const [elapsed, setElapsed] = useState(0);
  const spokenRef = useRef<string>('');

  const onFinalTranscript = useCallback((text: string) => {
    setAnswer(a => (a ? `${a} ${text}` : text));
  }, []);
  const voice = useInterviewVoice({ onFinalTranscript });

  /**
   * Counted from the session's OWN startedAt, not from a counter that begins at zero here.
   * A refresh, a resumed sitting or a slow first paint would otherwise hand the member back
   * a full two minutes on a round that is nearly over.
   */
  useEffect(() => {
    if (!session || session.status !== 'in_progress') return;
    const startedAt = new Date(session.startedAt || Date.now()).getTime();
    const tick = () => setElapsed(Math.max(0, Math.round((Date.now() - startedAt) / 1000)));
    tick();
    const t = setInterval(tick, 1000);
    return () => clearInterval(t);
  }, [session?.id, session?.status, session?.startedAt]);

  /**
   * A capped round ends itself.
   *
   * The intro mission promises two minutes, so two minutes has to be what actually happens —
   * leaving it to the member to stop makes the promise decorative. The ref guard matters:
   * this fires from a 1s tick, and finish() is not instant, so without it the timer would
   * call finish repeatedly while the first call is still grading.
   */
  const autoEnded = useRef(false);
  useEffect(() => { autoEnded.current = false; }, [session?.id]);
  useEffect(() => {
    if (!session || session.status !== 'in_progress' || !session.timeLimitSec) return;
    if (autoEnded.current || elapsed < session.timeLimitSec) return;
    autoEnded.current = true;
    finish(session.id);
    // finish is redefined each render; depending on it here would restart this effect every
    // second. The ref guard is what makes calling it once safe.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [elapsed, session?.id, session?.status, session?.timeLimitSec]);

  /**
   * A new sitting starts with a clean voice.
   *
   * `spokenRef` outlived the session, so a second interview whose opening line matched the last
   * one spoken — the same round asks the same opener — had its first question silently skipped.
   * And `serverVoiceDead` latched for the life of the page, so one failed request left every
   * later interview on a synthetic voice that often says nothing at all.
   *
   * DECLARED BEFORE THE EFFECT THAT SPEAKS, because React runs effects in declaration
   * order. With it second, a new session spoke its first question and then had the line
   * it had just said wiped — so Play again did nothing until the second question, the
   * only one this reset no longer ran after.
   */
  useEffect(() => {
    spokenRef.current = '';
    voice.resetVoice();
  }, [session?.id]); // eslint-disable-line react-hooks/exhaustive-deps

  /**
   * A LINE IS ONLY 'SPOKEN' ONCE IT HAS BEEN HEARD.
   *
   * The guard was set BEFORE speaking and every failure inside speak() was swallowed — autoplay
   * blocked, the TTS endpoint down, a browser with no usable voice. So a line that made no sound
   * at all was marked as said and could never be attempted again. speak() now reports whether it
   * played, and only a line that did is remembered.
   */
  useEffect(() => {
    if (!voiceOn || !session || session.status !== 'in_progress') return;
    const last = session.transcript?.[session.transcript.length - 1];
    if (!last || last.role !== 'interviewer' || last.text === spokenRef.current) return;
    let live = true;
    voice.stopListening();
    voice.speak(last.text).then(heard => { if (live && heard) spokenRef.current = last.text; });
    return () => { live = false; };
  }, [session?.transcript?.length, voiceOn]); // eslint-disable-line react-hooks/exhaustive-deps


  const load = useCallback(async () => {
    try { setData(await passportApi.listInterviews()); } catch { /* ignore */ }
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);
  useEffect(() => { chatEnd.current?.scrollIntoView({ behavior: 'smooth' }); }, [session?.transcript?.length]);

  const mode = params.get('mode');
  const company = params.get('company');

  /**
   * `round` is the key of one of the member's own plan rounds — what the cards start.
   *
   * Optional so every existing caller (the mission deep-link, "practice again", a company
   * page) keeps working unchanged and gets the untyped mock it always got.
   */
  const start = useCallback(async (round?: string) => {
    setBusy(true); setErr('');
    try {
      const r = await passportApi.startInterview(
        company || undefined,
        mode === 'role' || mode === 'intro' ? mode : undefined,
        round,
      );
      setSession(r.session);
      setElapsed(0);
      // Camera starts with the sitting, not before it — asking for permission on a screen
      // the member has not committed to yet is how permission prompts get denied for good.
      // A refusal is not fatal: recorder.start() reports it and the interview carries on.
      if (!r.session?.status || r.session.status === 'in_progress') await startRecording();
      // The member has an interview already open that is NOT the round they asked for, and
      // it had answers in it so it was kept rather than discarded. Say so — running a
      // different interview without a word is how this looked broken in the first place.
      setNotice(r.mismatched
        ? 'You already had an interview in progress, so we have brought you back to it. Finish or end it, then open the mission again to get the round you asked for.'
        : '');
    } catch (e: any) { setErr(e?.response?.data?.message || 'Could not start the interview.'); }
    setBusy(false);
  }, [company, mode, startRecording]);

  /**
   * A URL that already says WHICH sitting it wants starts it — no landing page in between.
   *
   * A daily mission linking here ("Record a self-introduction") used to drop the member on
   * the marketing panel, where the only button ran a generic six-question role interview.
   * They asked for one thing and had to go find another. Only fires when the URL carries
   * intent, so the plain /careerpilot/interview landing is untouched.
   *
   * Guarded by a ref rather than the session: after a member finishes and the session is
   * cleared, this must not silently start a second interview.
   */
  const autoStarted = useRef(false);
  useEffect(() => {
    if (loading || autoStarted.current) return;
    if (!mode && !company) return;
    if (data?.locked || session) return;
    autoStarted.current = true;
    start();
  }, [loading, mode, company, data?.locked, session, start]);

  const send = async () => {
    if (!session || !answer.trim()) return;
    const text = answer.trim();
    setAnswer(''); setBusy(true); setErr('');
    voice.stopListening();
    setSession(s => s && ({ ...s, transcript: [...s.transcript, { role: 'candidate', text }] }));
    try {
      const r = await passportApi.interviewTurn(session.id, text);
      setSession(r.session);
      if (r.endInterview) await finish(session.id);
    } catch (e: any) {
      setErr(e?.response?.data?.message || 'Could not send your answer.');
      setAnswer(text);
    }
    setBusy(false);
  };

  const finish = async (id?: string) => {
    const sid = id || session?.id;
    if (!sid) return;
    setBusy(true); setErr(''); setRecWarning('');

    /**
     * Stop the camera and keep the file BEFORE grading starts.
     *
     * Grading is a slow AI call that can take many seconds. Leaving the camera live through
     * it would keep recording a member who has already finished talking, and leave the light
     * on while they read their score.
     */
    let take: { blob: Blob; seconds: number } | null = null;
    try { take = await recorder.stop(); } catch { /* no recording is not a failure */ }

    try {
      let graded = false;
      for (let attempt = 0; attempt < 12 && !graded; attempt += 1) {
        const r = await passportApi.finishInterview(sid);
        if (!r.finalizing) { setSession(r.session); load(); graded = true; break; }
        await new Promise(res => setTimeout(res, 2000));
      }
      if (!graded) setErr('This interview is taking longer than usual to grade. Your answers are saved — reopen it in a minute.');
    } catch (e: any) { setErr(e?.response?.data?.message || 'Could not finish the interview.'); }

    /**
     * Upload AFTER grading, and never let it fail the finish. By this point the transcript,
     * the score, the XP and the streak are all saved; the video is the one part that can be
     * lost without costing the member the sitting. So a failure here is a warning about the
     * recording, not an error about the interview.
     */
    if (take?.blob?.size) {
      setSavingRec(true);
      try {
        await passportApi.uploadInterviewRecording(sid, take.blob, take.seconds);
        load();
      } catch (e: any) {
        setRecWarning(e?.response?.data?.message || 'Your interview is saved, but the video recording could not be uploaded.');
      }
      setSavingRec(false);
    }
    setBusy(false);
  };

  /**
   * Attach the live stream to the preview when BOTH exist.
   *
   * Assigning at getUserMedia time does not work: the element is not mounted until the
   * session renders, so srcObject would be set on nothing. This runs whenever either side
   * appears, which covers both orders.
   */
  useEffect(() => {
    if (previewRef.current && recorder.stream) previewRef.current.srcObject = recorder.stream;
  }, [recorder.stream, session?.id]);

  /**
   * ── THE CAMERA MUST GO OFF WHEN THE PAGE GOES AWAY ───────────────────────────────────
   *
   * recorder.stop() lived only inside finish(). Anybody who navigated away mid-round — a
   * tab close, the back button, a click on another part of CareerPilot — left the camera
   * and microphone live, with the recording light on, and nothing on screen to explain it.
   *
   * A member ending a sitting by leaving is not an error case; it is how people actually
   * leave things. The hardware has to be released whatever route they took out.
   */
  const recorderRef = useRef(recorder);
  useEffect(() => { recorderRef.current = recorder; }, [recorder]);
  useEffect(() => () => { void recorderRef.current?.stop?.().catch(() => {}); }, []);

  /**
   * Leaving mid-round loses the round, so say so before it happens.
   *
   * A session left in_progress is not graded and does not close itself. It then reappears
   * in the list as "In progress — resume", with a timer counted from the original start,
   * so a round abandoned an hour ago looks like the current one. Warning at the moment of
   * leaving is the only point where the member can still choose otherwise.
   */
  useEffect(() => {
    if (!session || session.status !== 'in_progress') return;
    const warn = (e: BeforeUnloadEvent) => { e.preventDefault(); e.returnValue = ''; };
    window.addEventListener('beforeunload', warn);
    return () => window.removeEventListener('beforeunload', warn);
  }, [session?.id, session?.status]);

  const openPast = async (s: InterviewSession) => {
    setSession(s);
    setPlayUrl(u => { if (u) URL.revokeObjectURL(u); return ''; });
    if (s.hasRecording) {
      try { setPlayUrl(await passportApi.interviewRecordingUrl(s.id)); }
      catch { /* the session is still readable without its video */ }
    }
  };

  useEffect(() => {
    if (fbTab !== 'recording' || session) return undefined;
    const list: InterviewSession[] = data?.sessions || [];
    const s = list.find(x => x.id === pickedId) || list.find(x => x.status === 'completed' && x.evaluation);
    if (!s?.hasRecording) return undefined;
    let live = true;
    setPlayUrl(u => { if (u) URL.revokeObjectURL(u); return ''; });
    passportApi.interviewRecordingUrl(s.id).then(u => { if (live) setPlayUrl(u); else URL.revokeObjectURL(u); }).catch(() => { /* the feedback still reads without the video */ });
    return () => { live = false; };
  }, [fbTab, pickedId, data, session]);

  // Blob URLs hold the whole video in memory until revoked.
  useEffect(() => () => { if (playUrl) URL.revokeObjectURL(playUrl); }, [playUrl]);

  if (loading) return <PassportShell><div className="pm-loading">Loading mock interviews…</div></PassportShell>;

  if (data?.locked) {
    return (
      <PassportShell>
        <SectionLock
          section="interview"
          blurb="An interviewer that reacts to your answers, asks follow-ups, and then grades you area by area with specific, actionable feedback."
        />
      </PassportShell>
    );
  }

  const sessions: InterviewSession[] = data?.sessions || [];
  const aiAvailable = data?.aiAvailable !== false;

  /**
   * What this member's plan gives them. Always present for an entitled member — a member no
   * admin plan matches still resolves to the built-in set, so the cards are never empty.
   */
  const entitlement: MemberEntitlement | undefined = data?.entitlement;
  const rounds: MemberRoundView[] = entitlement?.rounds || [];
  /** On a trial: its own count of interviews, which stops the start buttons when used up. */
  const trialIv: { limit: number; used: number } | null = data?.trial || null;
  const trialFull = !!trialIv && trialIv.used >= trialIv.limit;
  const canStartRound = (entitlement ? entitlement.canStart : true) && !trialFull;
  /**
   * What to practise next: whichever round they have sat least, ties broken by the order the
   * admin put them in. Gives every general "start" button on this page one unambiguous
   * meaning instead of quietly running a different, untyped interview to the cards.
   */
  const nextRound = rounds.length
    ? [...rounds].sort((a, b) => a.used - b.used || rounds.indexOf(a) - rounds.indexOf(b))[0]
    : null;


  if (session && session.status === 'completed') {
    const ev = session.evaluation;
    return (
      <PassportShell>
        <div className="cp-iv-page">
          <button className="pm-btn ghost" onClick={() => setSession(null)}>← Back to mock interviews</button>
          <div className="cp-iv-feedback-head">
            <div>
              <span className="cp-iv-kicker">Interview report</span>
              <h1>Your interview feedback</h1>
              <p>{session.planRoundLabel || session.role} · {session.transcript.filter(t => t.role === 'candidate').length} answers given</p>
            </div>
            <div className="cp-iv-score-ring" style={{ '--score': `${ev?.overallScore ?? 0}%` } as React.CSSProperties}>
              <strong>{ev?.overallScore ?? 0}</strong><span>/100</span>
            </div>
          </div>

          <div className="iv-room cp-iv-report-grid">
            <div>
              <div className="pm-card cp-iv-card">
                <h3>How you did</h3>
                <p>{ev?.summary || 'No feedback available.'}</p>
              </div>

              {!!ev?.areaScores?.length && (
                <div className="pm-card cp-iv-card">
                  <h3>Area by area</h3>
                  {ev.areaScores.map((a, i) => (
                    <div key={i} className="cp-iv-area-wrap">
                      <div className="iv-area-row">
                        <span className="t">{a.title}</span>
                        <span className="b"><i style={{ width: `${a.percentage}%` }} /></span>
                        <span className="p">{a.percentage}%</span>
                      </div>
                      {a.feedback && <div className="cp-iv-area-feedback">{a.feedback}</div>}
                    </div>
                  ))}
                </div>
              )}

              {!!ev?.questionFeedback?.length && (
                <div className="pm-card cp-iv-card">
                  <h3>Question by question</h3>
                  <p className="cp-iv-muted">What to say instead, next time you're asked this.</p>
                  {ev.questionFeedback.map((q, i) => (
                    <div className="iv-qf" key={i}>
                      <div className="iv-qf-head">
                        <span className={`iv-verdict ${q.verdict}`}>{VERDICT_LABEL[q.verdict] || q.verdict}</span>
                        <span className="iv-qf-q">{q.question}</span>
                      </div>
                      {q.whatWorked && <p className="iv-qf-line good"><b>Worked:</b> {q.whatWorked}</p>}
                      {q.whatToFix && <p className="iv-qf-line fix"><b>Fix:</b> {q.whatToFix}</p>}
                      {q.betterAnswer && <div className="iv-qf-better"><span className="lbl">A stronger answer</span><p>“{q.betterAnswer}”</p></div>}
                    </div>
                  ))}
                </div>
              )}

              <div className="pm-card cp-iv-card">
                <h3>Full transcript</h3>
                {session.transcript.map((t, i) => (
                  <div className={`iv-turn ${t.role}`} key={i} style={{ marginBottom: 10 }}>
                    <span className="av">{t.role === 'interviewer' ? '🎙️' : '🙋'}</span>
                    <div className="bub">{t.text}</div>
                  </div>
                ))}
              </div>
            </div>

            <div className="iv-side">
              <div className="pm-card cp-iv-card cp-iv-center">
                <div className="iv-score">
                  <div className="num">{ev?.overallScore ?? 0}<span>%</span></div>
                  <div className="lbl">Overall score</div>
                  <span className="iv-badge">{READINESS_LABEL[ev?.readinessLevel || ''] || ev?.readinessLevel}</span>
                </div>
                {session.xpAwarded > 0 && <div className="pm-msg ok">+{session.xpAwarded} XP added to your journey</div>}
                {savingRec && <div className="pm-msg info">Saving your recording…</div>}
                {recWarning && <div className="pm-msg err">{recWarning}</div>}
              </div>
              {/* Watch yourself back — the reason for recording at all. A transcript cannot
                  show pace, eye contact or how an answer actually landed. */}
              {playUrl && (
                <div className="pm-card cp-iv-card">
                  <h3>Your recording</h3>
                  <video src={playUrl} controls playsInline className="cp-iv-playback" />
                </div>
              )}
              {!!ev?.strengths?.length && <div className="pm-card cp-iv-card"><h3 className="good-title">✓ Strengths</h3><ul className="iv-list">{ev.strengths.map((s, i) => <li key={i}>{s}</li>)}</ul></div>}
              {!!ev?.improvements?.length && <div className="pm-card cp-iv-card"><h3 className="warn-title">△ Work on this</h3><ul className="iv-list">{ev.improvements.map((s, i) => <li key={i}>{s}</li>)}</ul></div>}
              <button
                className="pm-btn primary cp-iv-full"
                onClick={() => { setSession(null); start(nextRound?.key); }}
                disabled={!canStartRound}
              >
                {nextRound ? `Next: ${nextRound.title}` : 'Start another interview'}
              </button>
              {!canStartRound && <div className="cp-iv-muted">{entitlement?.blockedReason}</div>}
              <button className="pm-btn cp-iv-full" onClick={() => navigate('/careerpilot/placement')}>Go to placement readiness</button>
            </div>
          </div>
        </div>
      </PassportShell>
    );
  }

  if (session && session.status === 'in_progress') {
    return (
      <PassportShell hideNav meta={<span className="pm-pill"><i>🎙️</i>Question <b>{session.askedCount}</b> / {session.maxQuestions}</span>}>
        <div className="cp-iv-live-head">
          {/* Named for the round the member picked, so the screen agrees with the card they
              tapped. Falls back to the old wording for an untyped mock. */}
          <div><span className="cp-iv-kicker">Live practice</span><h1>{session.companyName ? `${session.companyName} mock interview` : session.planRoundLabel || 'Mock interview in progress'}</h1><p>{session.role} · with {session.interviewerName}. Answer as if this were the real thing — full sentences, specific examples.</p></div>
          {(() => {
            // A capped round counts DOWN. "1:12 elapsed" does not tell somebody with a
            // deadline what they need to know, which is how long they have left.
            const cap = session.timeLimitSec || 0;
            const shown = cap ? Math.max(0, cap - elapsed) : elapsed;
            return (
              <div className={`cp-iv-live-timer${cap && shown <= 20 ? ' low' : ''}`}>
                <i className="bi bi-stopwatch" />
                <b>{String(Math.floor(shown / 60)).padStart(2, '0')}:{String(shown % 60).padStart(2, '0')}</b>
                <span>{cap ? 'left' : 'elapsed'}</span>
              </div>
            );
          })()}
        </div>

        <div className="iv-room">
          <div className="iv-chat cp-iv-chat">
            {INTERVIEWER_FACE_ENABLED && <React.Suspense fallback={null}><InterviewAvatar speaking={voice.speaking} name={session.interviewerName} /></React.Suspense>}
            {session.transcript.map((t, i) => <div className={`iv-turn ${t.role}`} key={i}><span className="av">{t.role === 'interviewer' ? '🎙️' : '🙋'}</span><div className="bub">{t.text}</div></div>)}
            {busy && <div className="iv-turn interviewer"><span className="av">🎙️</span><div className="bub cp-iv-muted">thinking…</div></div>}
            <div ref={chatEnd} />
            {voice.speaking && <div className="iv-speaking"><span className="dot" /> {session.interviewerName} is speaking… <button onClick={voice.stopSpeaking}>Skip</button></div>}
            {/*
              * Hear the question again. There was no way to — the only controls were Skip and a
              * mute toggle, and the "already spoken" guard blocked any second attempt, so a
              * candidate who missed a word had to guess at what was asked.
              */}
            {voiceOn && !voice.speaking && !busy && session.transcript.some(t => t.role === 'interviewer') && (
              <div className="iv-speaking">
                <button onClick={() => voice.replay()}>🔊 Play the question again</button>
              </div>
            )}
            {/* Why the mic stopped, in words. Every one of these used to happen in silence. */}
            {voice.micError && <div className="iv-speaking cp-iv-micerr">⚠️ {voice.micError}</div>}
            <div className="iv-compose">
              <textarea value={answer + (voice.interim ? ` ${voice.interim}` : '')} onChange={e => setAnswer(e.target.value)} placeholder={voice.listening ? 'Listening — just talk…' : 'Type your answer, or tap the mic…'} onKeyDown={e => { if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) send(); }} disabled={busy} />
              {speechInSupported && <button className={`iv-mic${voice.listening ? ' on' : ''}`} onClick={() => (voice.listening ? voice.stopListening() : voice.startListening())} disabled={busy || voice.speaking} title={voice.speaking ? 'Wait for the interviewer to finish' : voice.listening ? 'Stop recording' : 'Answer out loud'}>{voice.listening ? '⏹' : '🎤'}</button>}
              <button className="pm-btn primary" onClick={send} disabled={busy || !answer.trim()}>Send</button>
            </div>
            {/* The only way out used to be the last card in the right-hand rail, below the
                areas list and the voice toggle — off-screen on a laptop once the transcript
                grew, so members reported having no way to end at all. It belongs under the
                box they are typing into. Kept visually quiet so it is never mistaken for
                Send, and it says what it does rather than just "End". */}
            <div className="cp-iv-underbar">
              <span className="cp-iv-count">Question {Math.min(session.askedCount, session.maxQuestions)} of {session.maxQuestions}</span>
              <button className="cp-iv-endlink" onClick={() => finish()} disabled={busy}>
                End & get my feedback
              </button>
            </div>
            {err && <div className="pm-msg err">{err}</div>}
            {notice && <div className="pm-msg info">{notice}</div>}
          </div>

          <div className="iv-side">
            {/* The camera must be visibly on. A recording the member only discovers afterwards
                is a nasty surprise, so the preview and the dot are the consent signal. */}
            {(recorder.recording || recorder.error) && (
              <div className="pm-card cp-iv-card cp-iv-rec">
                {recorder.recording ? (
                  <>
                    <div className="cp-iv-rec-head"><span className="cp-iv-rec-dot" /> Recording · {String(Math.floor(recorder.seconds / 60)).padStart(2, '0')}:{String(recorder.seconds % 60).padStart(2, '0')}</div>
                    <video ref={previewRef} autoPlay muted playsInline className="cp-iv-rec-preview" />
                    <div className="cp-iv-muted">Saved when you finish, so you can watch it back later.</div>
                  </>
                ) : <div className="iv-note">{recorder.error}</div>}
              </div>
            )}
            <div className="pm-card cp-iv-card"><h3>Areas covered</h3><div className="iv-areas">{session.areas.map((a, i) => <div key={i}><span>•</span>{a}</div>)}</div></div>
            <div className="pm-card cp-iv-card">
              {speechOutSupported && <label className="iv-voice-toggle"><input type="checkbox" checked={voiceOn} onChange={e => { setVoiceOn(e.target.checked); if (!e.target.checked) voice.stopSpeaking(); }} /> Hear the interviewer</label>}
              {!speechInSupported && <div className="iv-note">Speaking your answer needs Chrome or Edge. Typing works everywhere.</div>}
            </div>
            <div className="pm-card cp-iv-card"><div className="cp-iv-muted">Ctrl+Enter sends your answer. End early any time — you'll still get feedback on what you answered.</div><button className="pm-btn cp-iv-full cp-iv-end" onClick={() => finish()} disabled={busy}>End & get my feedback</button></div>
          </div>
        </div>
      </PassportShell>
    );
  }

  const completed = sessions.filter(s => s.status === 'completed' && s.evaluation);
  const latest = completed[0];
  const latestScore = latest?.evaluation?.overallScore ?? null;
  /** Average of every graded round, and how far the latest moved from the first one (sessions are newest first). */
  const avgScore = completed.length ? Math.round(completed.reduce((t, s) => t + (s.evaluation?.overallScore ?? 0), 0) / completed.length) : null;
  const firstScore = completed.length > 1 ? completed[completed.length - 1].evaluation?.overallScore ?? null : null;
  const improvement = latestScore !== null && firstScore !== null ? latestScore - firstScore : null;

  /** The round a past sitting was, so it carries that round's icon and colour. */
  const typeOf = (s: InterviewSession): string => {
    const r = rounds.find(x => x.key === s.planRoundKey);
    if (r) return r.type;
    const l = `${s.planRoundLabel || s.role}`.toLowerCase();
    return /\bhr\b|behaviou?r/.test(l) ? 'hr' : /communic/.test(l) ? 'communication' : 'technical';
  };
  const minutesOf = (s: InterviewSession) => (s.completedAt
    ? Math.max(1, Math.round((new Date(s.completedAt).getTime() - new Date(s.startedAt).getTime()) / 60000)) : null);
  const dayOf = (iso: string) => new Date(iso).toLocaleDateString(undefined, { day: '2-digit', month: 'short', year: 'numeric' });
  const scoreTone = (n: number) => (n >= 75 ? 'good' : n >= 60 ? 'ok' : 'low');

  /** The sitting whose feedback the panel shows: the one picked, else the latest graded. */
  const shown = sessions.find(s => s.id === pickedId && s.status === 'completed') || latest || null;
  const ev = shown?.evaluation || null;
  const history = allHistory ? sessions : sessions.slice(0, 5);
  const pick = (s: InterviewSession) => {
    if (s.status !== 'completed') { openPast(s); return; }
    setPickedId(s.id); setFbTab('feedback');
  };
  const r = 44; const c = 2 * Math.PI * r;

  return (
    <PassportShell>
      <div className="cp-iv-page ivh">
        <section className="ivh-top">
          <div className="ivh-copy">
            <span className="ivh-eyebrow">Interview practice</span>
            <h1>Mock <span>Interview</span></h1>
            <p>Take individual mock interviews, get detailed feedback, and track your improvement over time.</p>
            <div className="ivh-actions">
              <button type="button" className="ivh-btn primary" onClick={() => start(nextRound?.key)} disabled={busy || !canStartRound}>
                <i className="bi bi-play-fill" aria-hidden /> {busy ? 'Setting up…' : nextRound ? `Start ${nextRound.title}` : 'Start a mock interview'}
              </button>
              <button type="button" className="ivh-btn" onClick={() => { setAllHistory(true); document.getElementById('ivh-history')?.scrollIntoView({ behavior: 'smooth', block: 'start' }); }} disabled={!sessions.length}>
                <i className="bi bi-calendar3" aria-hidden /> View All Interviews
              </button>
            </div>
          </div>
          <div className="ivh-stats">
            <div className="ivh-stat"><i className="bi bi-calendar-check ic blue" aria-hidden /><b>{sessions.length}</b><span>Interviews Taken</span></div>
            <div className="ivh-stat"><i className="bi bi-check-circle ic green" aria-hidden /><b>{completed.length}</b><span>Completed</span></div>
            <div className="ivh-stat"><i className="bi bi-bar-chart-fill ic violet" aria-hidden /><b>{avgScore !== null ? `${avgScore}%` : '—'}</b><span>Avg. Score</span></div>
            <div className="ivh-stat"><i className="bi bi-graph-up-arrow ic green" aria-hidden /><b className={improvement !== null && improvement < 0 ? 'down' : 'up'}>{improvement === null ? '—' : `${improvement > 0 ? '+' : ''}${improvement}%`}</b><span>Improvement</span></div>
          </div>
        </section>

        {!aiAvailable && <div className="pm-msg info">AI isn't configured on this tenant yet, so interviews will run on scripted questions and won't be scored.</div>}

        {/*
          THE INTERVIEWS THIS MEMBER HAS ACTUALLY BEEN GIVEN — one card per round of their plan. The
          allowance is shared across the cards (the plan grants a number of interviews, not a number
          per type), which is why it is stated once, beside the heading.
        */}
        <section className="ivh-card ivh-rounds">
          <div className="ivh-card-head">
            <div>
              <h2>Interview Rounds</h2>
              <p>{entitlement?.planName
                ? <>Choose a round, start an interview and get detailed feedback. Assigned to you on the <b>{entitlement.planName}</b> plan.</>
                : <>Choose a round, start an interview and get detailed feedback.</>}</p>
            </div>
            <span className={`ivh-allow${entitlement?.remaining === 0 || trialFull ? ' out' : ''}`}>
              {trialIv ? <><b>{Math.max(0, trialIv.limit - trialIv.used)}</b> of {trialIv.limit} left in your trial</>
                : entitlement && entitlement.perThirtyDays > 0 ? <><b>{entitlement.remaining}</b> of {entitlement.perThirtyDays} left · rolling 30 days</>
                  : <><i className="bi bi-infinity" aria-hidden /> No limit</>}
            </span>
          </div>

          {trialIv && (
            <div className={`cp-iv-blocked trial${trialFull ? '' : ' ok'}`}>
              <i className="bi bi-hourglass-split" />
              <span>{trialFull
                ? <>Your trial included {trialIv.limit} mock {trialIv.limit === 1 ? 'interview' : 'interviews'}, and you have done {trialIv.limit === 1 ? 'it' : 'them all'}. Take membership to keep practising.</>
                : <>Your trial includes <b>{trialIv.limit}</b> mock {trialIv.limit === 1 ? 'interview' : 'interviews'}: {trialIv.used} started, {trialIv.limit - trialIv.used} left. Each one you start counts.</>}</span>
            </div>
          )}
          {!canStartRound && !trialFull && (
            <div className="cp-iv-blocked">
              <i className="bi bi-hourglass-split" />
              <span>
                {entitlement?.blockedReason}
                {/* Never a dead end: always say when it comes back. */}
                {entitlement?.nextAvailableAt && <> You can start again {whenFree(entitlement.nextAvailableAt)}.</>}
                {entitlement?.windowResetsAt && <> Your next attempt frees up {whenFree(entitlement.windowResetsAt)}.</>}
              </span>
            </div>
          )}

          <div className="ivh-round-grid">
            {rounds.map(rd => (
              <article key={rd.key} className={`ivh-round t-${rd.type}${!canStartRound ? ' locked' : ''}`}>
                <div className="ivh-round-top">
                  <span className="ivh-round-ic" aria-hidden><i className={`bi ${ROUND_ICON[rd.type] || 'bi-mic'}`} /></span>
                  <div>
                    <h3>{rd.title}{rd.used > 0 && <em className="ivh-round-used" title={`Practised ${rd.used} times`}>{rd.used}×</em>}</h3>
                    {/* Only when the admin gave it a name of its own — "Technical" under "Technical Interview" says nothing. */}
                    {!!rd.label && !rd.title.toLowerCase().includes(rd.label.toLowerCase()) && <span className="ivh-round-sub">{rd.label}</span>}
                    <p>{ROUND_BLURB[rd.type] || ''}</p>
                  </div>
                </div>
                <div className="ivh-round-foot">
                  <span title={`${rd.questions} question${rd.questions === 1 ? '' : 's'}`}><i className="bi bi-clock" aria-hidden /> {rd.minutes} min</span>
                  <span className="ivh-sep" aria-hidden />
                  <span><i className="bi bi-layers" aria-hidden /> {ROUND_FEEDBACK[rd.type] || 'Detailed feedback'}</span>
                  <button type="button" onClick={() => start(rd.key)} disabled={busy || !canStartRound}>
                    Start <i className="bi bi-arrow-right" aria-hidden />
                  </button>
                </div>
              </article>
            ))}
          </div>
        </section>

        <div className="ivh-lower">
          <section className="ivh-card ivh-history" id="ivh-history">
            <div className="ivh-card-head">
              <h2>Interview History</h2>
              {sessions.length > 5 && (
                <button type="button" className="ivh-link" onClick={() => setAllHistory(v => !v)}>
                  {allHistory ? 'Show recent' : `View All (${sessions.length})`} <i className={`bi ${allHistory ? 'bi-arrow-up' : 'bi-arrow-right'}`} aria-hidden />
                </button>
              )}
            </div>
            {!sessions.length && <div className="ivh-empty"><i className="bi bi-mic" aria-hidden /><b>No mock interviews yet</b><span>Start a round above — your history and scores appear here.</span></div>}
            <ul className="ivh-hist">
              {/* Titled by the round it WAS, read off the row — so a member's history keeps saying
                  "HR Interview" after an admin renames that round. */}
              {history.map(s => {
                const t = typeOf(s); const score = s.evaluation?.overallScore; const m = minutesOf(s);
                return (
                  <li key={s.id}>
                    <button type="button" className={`ivh-hrow${shown?.id === s.id ? ' on' : ''}`} onClick={() => pick(s)}>
                      <span className={`ivh-round-ic sm t-${t}`} aria-hidden><i className={`bi ${ROUND_ICON[t] || 'bi-mic'}`} /></span>
                      <span className="ivh-hrow-tx">
                        <b>{ROUND_NAME[t] || s.planRoundLabel || s.role}</b>
                        <small><i className="bi bi-calendar3" aria-hidden /> {dayOf(s.startedAt)}{m ? ` · ${m} min` : ''}</small>
                      </span>
                      <span className="ivh-hrow-res">
                        {s.status === 'completed' && score != null
                          ? <><em className={`ivh-pill ${scoreTone(score)}`}>{score}%</em><small>Completed</small></>
                          : <><em className="ivh-pill wait">{s.status === 'in_progress' ? 'Resume' : '—'}</em><small>{s.status === 'in_progress' ? 'In progress' : 'Not completed'}</small></>}
                      </span>
                      <i className="bi bi-chevron-right ivh-chev" aria-hidden />
                    </button>
                  </li>
                );
              })}
            </ul>
          </section>

          <section className="ivh-card ivh-feedback" aria-live="polite">
            <div className="ivh-card-head">
              <h2>{shown && shown.id !== latest?.id ? 'Feedback' : 'Latest Feedback'}</h2>
              {shown && <span className="ivh-tagline">{ROUND_NAME[typeOf(shown)] || shown.planRoundLabel || shown.role} · {dayOf(shown.startedAt)}</span>}
            </div>
            {!shown || !ev ? (
              <div className="ivh-empty"><i className="bi bi-clipboard2-check" aria-hidden /><b>Your feedback appears here</b><span>Finish a round and you get an overall score, area by area scores, what you did well and what to work on.</span></div>
            ) : (
              <>
                <div className="ivh-tabs" role="tablist">
                  {([['feedback', 'Feedback'], ['questions', 'Questions'], ...(shown.hasRecording ? [['recording', 'Recording']] : []), ['transcript', 'Transcript']] as [typeof fbTab, string][]).map(([k, l]) => (
                    <button key={k} type="button" role="tab" aria-selected={fbTab === k} className={fbTab === k ? 'on' : ''} onClick={() => setFbTab(k)}>{l}</button>
                  ))}
                </div>

                {fbTab === 'feedback' && (
                  <>
                    <div className="ivh-fb-grid">
                      <div className="ivh-ring">
                        <svg viewBox="0 0 104 104" width="132" height="132" aria-hidden>
                          <circle cx="52" cy="52" r={r} className="bg" />
                          <circle cx="52" cy="52" r={r} className={`fg ${scoreTone(ev.overallScore)}`} strokeDasharray={c} strokeDashoffset={c * (1 - ev.overallScore / 100)} transform="rotate(-90 52 52)" />
                        </svg>
                        <b>{ev.overallScore}%</b>
                        <span>Overall Score</span>
                      </div>
                      {!!ev.areaScores?.length && (
                        <ul className="ivh-areas">
                          {ev.areaScores.slice(0, 5).map((a, i) => (
                            <li key={i}><i className={`bi ${['bi-code-slash', 'bi-layers', 'bi-diagram-3', 'bi-chat-dots', 'bi-cpu'][i % 5]}`} aria-hidden /><span>{a.title}</span><b>{a.percentage}%</b></li>
                          ))}
                        </ul>
                      )}
                      <div className="ivh-wells">
                        {!!ev.strengths?.length && (
                          <div className="ivh-well good"><b><i className="bi bi-hand-thumbs-up" aria-hidden /> What You Did Well</b><ul>{ev.strengths.slice(0, 3).map((x, i) => <li key={i}>{x}</li>)}</ul></div>
                        )}
                        {!!ev.improvements?.length && (
                          <div className="ivh-well fix"><b><i className="bi bi-bullseye" aria-hidden /> Areas to Improve</b><ul>{ev.improvements.slice(0, 3).map((x, i) => <li key={i}>{x}</li>)}</ul></div>
                        )}
                      </div>
                    </div>
                    {ev.summary && (
                      <div className="ivh-note"><i className="bi bi-file-earmark-text" aria-hidden /><div><b>Interviewer’s Note</b><p>{ev.summary}</p></div></div>
                    )}
                  </>
                )}

                {fbTab === 'questions' && (
                  ev.questionFeedback?.length ? (
                    <div className="ivh-qs">
                      {ev.questionFeedback.map((q, i) => (
                        <div className="iv-qf" key={i}>
                          <div className="iv-qf-head"><span className={`iv-verdict ${q.verdict}`}>{VERDICT_LABEL[q.verdict] || q.verdict}</span><span className="iv-qf-q">{q.question}</span></div>
                          {q.whatWorked && <p className="iv-qf-line good"><b>Worked:</b> {q.whatWorked}</p>}
                          {q.whatToFix && <p className="iv-qf-line fix"><b>Fix:</b> {q.whatToFix}</p>}
                          {q.betterAnswer && <div className="iv-qf-better"><span className="lbl">A stronger answer</span><p>“{q.betterAnswer}”</p></div>}
                        </div>
                      ))}
                    </div>
                  ) : <p className="ivh-muted">No question-by-question feedback for this round.</p>
                )}

                {fbTab === 'recording' && (
                  playUrl ? <video src={playUrl} controls playsInline className="ivh-video" /> : <p className="ivh-muted">Loading your recording…</p>
                )}

                {fbTab === 'transcript' && (
                  <div className="ivh-transcript">
                    {shown.transcript.map((t, i) => (
                      <div className={`iv-turn ${t.role}`} key={i}><span className="av">{t.role === 'interviewer' ? '🎙️' : '🙋'}</span><div className="bub">{t.text}</div></div>
                    ))}
                  </div>
                )}

                <div className="ivh-fb-foot">
                  <button type="button" className="ivh-link" onClick={() => openPast(shown)}>Open the full report <i className="bi bi-arrow-right" aria-hidden /></button>
                </div>
              </>
            )}
          </section>
        </div>

        {err && <div className="pm-msg err">{err}</div>}
      </div>
    </PassportShell>
  );
};

export default Interview;
