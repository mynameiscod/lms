import React, { useCallback, useEffect, useRef, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import passportApi, { InterviewSession, MemberEntitlement, MemberRoundView } from '../../api/passportApi';
import PassportShell, { LockedPanel } from './PassportShell';
import { useSessionRecorder } from './useSessionRecorder';
import { useInterviewVoice, speechInSupported, speechOutSupported } from './useInterviewVoice';
import { INTERVIEWER_FACE_ENABLED } from './interviewFace';
import './interviewRedesign.css';

const InterviewAvatar = React.lazy(() => import('./InterviewAvatar'));

const READINESS_LABEL: Record<string, string> = {
  not_ready: 'Not ready yet',
  needs_improvement: 'Needs improvement',
  almost_ready: 'Almost interview-ready',
  interview_ready: 'Interview ready',
};

const VERDICT_LABEL: Record<string, string> = { strong: 'Strong', okay: 'Okay', weak: 'Needs work' };

const ROUND_ICON: Record<string, string> = {
  technical: 'bi-code-slash', hr: 'bi-person-check', communication: 'bi-chat-dots',
};

/**
 * What each round is, said to the student.
 *
 * Written here rather than reusing the interviewer's `focus` line, which is an instruction
 * to a model in the third person ("what they have actually built") and reads like a
 * description of somebody else when shown to the person about to sit it.
 */
const ROUND_BLURB: Record<string, string> = {
  technical:     'What you have built, what you understand about it, and how you work through a problem.',
  hr:            'Motivation, ownership, and how you work with other people.',
  communication: 'How clearly you explain yourself — structure, fluency and confidence.',
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
  const [paying, setPaying] = useState(false);
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

  useEffect(() => {
    if (!voiceOn || !session || session.status !== 'in_progress') return;
    const last = session.transcript?.[session.transcript.length - 1];
    if (!last || last.role !== 'interviewer' || last.text === spokenRef.current) return;
    spokenRef.current = last.text;
    voice.stopListening();
    voice.speak(last.text);
  }, [session?.transcript?.length, voiceOn]); // eslint-disable-line react-hooks/exhaustive-deps

  const load = useCallback(async () => {
    try { setData(await passportApi.listInterviews()); } catch { /* ignore */ }
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);
  useEffect(() => { chatEnd.current?.scrollIntoView({ behavior: 'smooth' }); }, [session?.transcript?.length]);

  const unlock = async () => {
    setPaying(true);
    const res = await passportApi.membershipCheckout();
    setPaying(false);
    if (res.ok) load();
  };

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

  const openPast = async (s: InterviewSession) => {
    setSession(s);
    setPlayUrl(u => { if (u) URL.revokeObjectURL(u); return ''; });
    if (s.hasRecording) {
      try { setPlayUrl(await passportApi.interviewRecordingUrl(s.id)); }
      catch { /* the session is still readable without its video */ }
    }
  };

  // Blob URLs hold the whole video in memory until revoked.
  useEffect(() => () => { if (playUrl) URL.revokeObjectURL(playUrl); }, [playUrl]);

  if (loading) return <PassportShell><div className="pm-loading">Loading mock interviews…</div></PassportShell>;

  if (data?.locked) {
    return (
      <PassportShell>
        <LockedPanel
          title="AI Mock Interviews are part of your membership"
          blurb="A real interviewer that reacts to your answers, asks follow-ups, and then grades you area by area with specific, actionable feedback."
          priceInr={data.priceInr}
          busy={paying}
          onUnlock={unlock}
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
  const canStartRound = entitlement ? entitlement.canStart : true;
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
            <div className="iv-compose">
              <textarea value={answer + (voice.interim ? ` ${voice.interim}` : '')} onChange={e => setAnswer(e.target.value)} placeholder={voice.listening ? 'Listening — just talk…' : 'Type your answer, or tap the mic…'} onKeyDown={e => { if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) send(); }} disabled={busy} />
              {speechInSupported && <button className={`iv-mic${voice.listening ? ' on' : ''}`} onClick={() => (voice.listening ? voice.stopListening() : voice.startListening())} disabled={busy || voice.speaking} title={voice.speaking ? 'Wait for the interviewer to finish' : voice.listening ? 'Stop recording' : 'Answer out loud'}>{voice.listening ? '⏹' : '🎤'}</button>}
              <button className="pm-btn primary" onClick={send} disabled={busy || !answer.trim()}>Send</button>
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
  const recentCompleted = completed.slice(0, 5);
  const latest = recentCompleted[0];
  const latestScore = latest?.evaluation?.overallScore ?? null;
  const latestAreas = latest?.evaluation?.areaScores?.slice(0, 5) || [];
  const readiness = latestScore === null ? 'Start your first mock' : READINESS_LABEL[latest?.evaluation?.readinessLevel || ''] || 'Keep practicing';
  const totalAnswers = completed.reduce((n, s) => n + s.transcript.filter(t => t.role === 'candidate').length, 0);
  const strongest = latestAreas.length ? [...latestAreas].sort((a, b) => b.percentage - a.percentage)[0] : null;

  return (
    <PassportShell meta={latestScore !== null ? <span className="pm-pill"><i className="bi bi-mic" /> Interview <b>{latestScore}%</b></span> : undefined}>
      <div className="cp-iv-page cp-iv-dashboard">
        <div className="cp-iv-title-row">
          <div><span className="cp-iv-kicker">Interview practice</span><h1>Mock Interview</h1><p>Practice. Improve. Perform. Get interview ready with AI.</p></div>
          <button
            className="pm-btn primary cp-iv-start-top"
            onClick={() => start(nextRound?.key)}
            disabled={busy || !canStartRound}
          >
            <i className="bi bi-play-fill" />
            {busy ? 'Setting up…' : nextRound ? `Start ${nextRound.title}` : 'Start AI Mock Interview'}
          </button>
        </div>

        {!aiAvailable && <div className="pm-msg info">AI isn't configured on this tenant yet, so interviews will run on scripted questions and won't be scored.</div>}

        {/*
          THE INTERVIEWS THIS MEMBER HAS ACTUALLY BEEN GIVEN.
          One card per round of their plan, named for what it is, so a student can see what
          is expected of them before starting rather than pressing one generic button and
          finding out. The allowance is shared across the cards — the plan grants a number of
          interviews, not a number per type — which is why it is stated once, up here.
        */}
        <section className="cp-iv-assigned">
          <div className="cp-iv-assigned-head">
            <div>
              <h2>Your mock interviews</h2>
              <p>
                {entitlement?.planName
                  ? <>Assigned to you on the <b>{entitlement.planName}</b> plan.</>
                  : <>The standard practice set for your course and year.</>}
              </p>
            </div>
            <div className={`cp-iv-allowance${entitlement?.remaining === 0 ? ' out' : ''}`}>
              {entitlement && entitlement.perThirtyDays > 0 ? (
                <>
                  <b>{entitlement.remaining}</b>
                  <span>of {entitlement.perThirtyDays} left</span>
                  <small>rolling 30 days</small>
                </>
              ) : (
                <><b><i className="bi bi-infinity" /></b><span>no limit</span><small>practise as often as you like</small></>
              )}
            </div>
          </div>

          {!canStartRound && (
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

          <div className="cp-iv-round-cards">
            {rounds.map(r => (
              <article className={`cp-iv-round-card ${r.type}${!canStartRound ? ' locked' : ''}`} key={r.key}>
                <div className="cp-iv-round-icon"><i className={`bi ${ROUND_ICON[r.type] || 'bi-mic'}`} /></div>
                <h3>{r.title}</h3>
                {/* Only when the admin actually named it — otherwise this repeats the title. */}
                {!!r.label && <span className="cp-iv-round-sub">{r.label}</span>}
                <p className="cp-iv-round-blurb">{ROUND_BLURB[r.type] || ''}</p>
                <div className="cp-iv-round-meta">
                  <span><i className="bi bi-patch-question" /> {r.questions} question{r.questions === 1 ? '' : 's'}</span>
                  <span><i className="bi bi-clock" /> {r.minutes} min</span>
                </div>
                <div className="cp-iv-round-foot">
                  <span className="cp-iv-round-used">
                    {r.used ? `Practised ${r.used}×` : 'Not practised yet'}
                  </span>
                  <button
                    className="cp-iv-round-go"
                    onClick={() => start(r.key)}
                    disabled={busy || !canStartRound}
                  >
                    {r.used ? 'Practise again' : 'Start'} <i className="bi bi-arrow-right" />
                  </button>
                </div>
              </article>
            ))}
          </div>
        </section>

        <div className="cp-iv-main-grid">
          <div className="cp-iv-main-column">
            <section className="cp-iv-hero">
              <div className="cp-iv-hero-art"><img src="/assets/careerpilot/careerpilot-hero-student.png" alt="CareerPilot student preparing for an interview" /></div>
              <div className="cp-iv-hero-copy">
                <span className="cp-iv-kicker">AI interview coach</span>
                <h2>{latestScore === null ? 'Ready for your first round?' : 'Interview Ready?'}</h2>
                <p>{latestScore === null ? 'Run a realistic mock interview and get specific feedback on every answer.' : 'Consistent practice is the fastest way to turn feedback into confident interview performance.'}</p>
                <div className="cp-iv-role"><span>Target role</span><b>{latest?.role || 'Your CareerPilot role'}</b></div>
                <div className="cp-iv-tags">{latestAreas.slice(0, 4).map(a => <span key={a.title}>{a.title}</span>)}{!latestAreas.length && <><span>Role based</span><span>Follow-ups</span><span>Voice enabled</span></>}</div>
              </div>
              <div className="cp-iv-practice-card"><i className="bi bi-calendar2-check" /><div><b>Practice regularly</b><p>Each round adapts to your pathway and ends with actionable feedback.</p><button onClick={() => start(nextRound?.key)} disabled={busy || !canStartRound}>Start a round <i className="bi bi-arrow-right" /></button></div></div>
            </section>

            <div className="cp-iv-metric-row">
              {(latestAreas.length ? latestAreas : [
                { title: 'Mock rounds', percentage: Math.min(100, completed.length * 20) },
                { title: 'Answers practiced', percentage: Math.min(100, totalAnswers * 4) },
              ]).map((a: any, i: number) => (
                <div className="cp-iv-metric" key={`${a.title}-${i}`}><div className={`cp-iv-metric-icon m${i % 5}`}><i className={`bi ${['bi-code-slash','bi-diagram-3','bi-chat-dots','bi-person-check','bi-cpu'][i % 5]}`} /></div><div><span>{a.title}</span><b>{a.percentage}{latestAreas.length ? '/100' : '%'}</b><div className="cp-iv-progress"><i style={{ width: `${Math.min(100, a.percentage)}%` }} /></div></div></div>
              ))}
            </div>

            <div className="cp-iv-insights-grid">
              <section className="cp-iv-panel">
                <div className="cp-iv-panel-head"><h3>Performance trend</h3><span>{completed.length} completed rounds</span></div>
                {recentCompleted.length ? <div className="cp-iv-trend">{[...recentCompleted].reverse().map((s, i) => <div className="cp-iv-trend-point" key={s.id}><span style={{ height: `${Math.max(18, s.evaluation?.overallScore || 0)}%` }}><b>{s.evaluation?.overallScore ?? 0}</b></span><small>{i + 1}</small></div>)}</div> : <div className="cp-iv-empty">Your interview score trend will appear after your first completed round.</div>}
              </section>

              <div className="cp-iv-stack">
                <section className="cp-iv-panel"><h3 className="good-title"><i className="bi bi-check-circle" /> Top strengths</h3>{latest?.evaluation?.strengths?.length ? <ul>{latest.evaluation.strengths.slice(0, 4).map((x, i) => <li key={i}>{x}</li>)}</ul> : <p className="cp-iv-muted">Complete a mock interview to discover what you already do well.</p>}</section>
                <section className="cp-iv-panel cp-iv-improve"><h3 className="warn-title"><i className="bi bi-exclamation-circle" /> Areas to improve</h3>{latest?.evaluation?.improvements?.length ? <ul>{latest.evaluation.improvements.slice(0, 4).map((x, i) => <li key={i}>{x}</li>)}</ul> : <p className="cp-iv-muted">Your priority improvement areas will appear here after grading.</p>}</section>
              </div>
            </div>

            <section className="cp-iv-practice-strip">
              <div><i className="bi bi-robot" /><span><b>AI Mock Interview</b><small>Real conversation with adaptive follow-up questions.</small></span></div>
              <div><i className="bi bi-mic" /><span><b>Voice Practice</b><small>Speak naturally in supported browsers, or type anywhere.</small></span></div>
              <div><i className="bi bi-clipboard2-check" /><span><b>Detailed Feedback</b><small>Area scores, strengths, improvements and better answers.</small></span></div>
              <button className="pm-btn primary" onClick={() => start(nextRound?.key)} disabled={busy || !canStartRound}>Start now <i className="bi bi-arrow-right" /></button>
            </section>
          </div>

          <aside className="cp-iv-side-column">
            <section className="cp-iv-panel cp-iv-readiness">
              <h3>Interview Readiness Score</h3>
              <div className="cp-iv-readiness-body">
                <div className="cp-iv-score-ring" style={{ '--score': `${latestScore ?? 0}%` } as React.CSSProperties}><strong>{latestScore ?? '—'}</strong><span>/100</span></div>
                <div><b>{readiness}</b><p>{latestScore === null ? 'Complete a mock interview to establish your baseline.' : 'Use each round to turn your weakest area into your next strength.'}</p>{strongest && <span className="cp-iv-status">Strongest: {strongest.title}</span>}</div>
              </div>
              {latest && <button className="cp-iv-link-btn" onClick={() => openPast(latest)}>View detailed report <i className="bi bi-arrow-right" /></button>}
            </section>

            <section className="cp-iv-panel">
              <div className="cp-iv-panel-head"><h3>Recent Mock Interviews</h3><span>{sessions.length} total</span></div>
              <div className="cp-iv-history-list">
                {/* Titled by the round it WAS, read off the row — so a member's history keeps
                    saying "HR Interview" after an admin renames that round. */}
                {sessions.slice(0, 5).map(s => <button key={s.id} onClick={() => openPast(s)}><span className={`cp-iv-mini-score ${s.status}`}>{s.status === 'completed' ? s.evaluation?.overallScore ?? 0 : '•'}</span><span><b>{s.planRoundLabel || s.role}</b><small>{new Date(s.startedAt).toLocaleDateString()} · {s.status === 'completed' ? READINESS_LABEL[s.evaluation?.readinessLevel || ''] || 'Completed' : s.status === 'in_progress' ? 'In progress — resume' : 'Not completed'}</small></span><i className="bi bi-chevron-right" /></button>)}
                {!sessions.length && <div className="cp-iv-empty compact">No mock interviews yet.</div>}
              </div>
            </section>

            <section className="cp-iv-panel cp-iv-tips"><h3>Interview Tips for You</h3><div><i className="bi bi-chat-square-text" /><span><b>Use specific examples</b><small>Structure experience answers with context, action and result.</small></span></div><div><i className="bi bi-clock-history" /><span><b>Think before answering</b><small>A short pause is better than an unfocused response.</small></span></div><div><i className="bi bi-volume-up" /><span><b>Practice out loud</b><small>Voice practice makes real interviews feel more familiar.</small></span></div></section>

            <section className="cp-iv-panel cp-iv-placement-card"><i className="bi bi-bullseye" /><div><h3>Placement Ready?</h3><p>Connect interview performance with your overall CareerPilot readiness.</p><button className="pm-btn primary cp-iv-full" onClick={() => navigate('/careerpilot/placement')}>Go to Placement Readiness <i className="bi bi-arrow-right" /></button></div></section>
          </aside>
        </div>

        <div className="cp-iv-bottom-cta"><i className="bi bi-stars" /><div><b>Consistent practice builds interview confidence.</b><span>Your feedback becomes more useful as you complete more rounds.</span></div><button className="pm-btn" onClick={() => start(nextRound?.key)} disabled={busy || !canStartRound}>Practice again <i className="bi bi-arrow-right" /></button></div>
        {err && <div className="pm-msg err">{err}</div>}
      </div>
    </PassportShell>
  );
};

export default Interview;
