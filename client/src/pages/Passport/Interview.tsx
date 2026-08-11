import React, { useCallback, useEffect, useRef, useState } from 'react';
import passportApi, { InterviewSession } from '../../api/passportApi';
import PassportShell, { LockedPanel } from './PassportShell';
import { useSearchParams } from 'react-router-dom';
import { useInterviewVoice, speechInSupported, speechOutSupported } from './useInterviewVoice';
import { INTERVIEWER_FACE_ENABLED } from './interviewFace';

// Lazy so three.js and the avatar land in their own chunk. While the face is switched off
// that chunk is never requested, so the code costs nothing to keep.
const InterviewAvatar = React.lazy(() => import('./InterviewAvatar'));

const READINESS_LABEL: Record<string, string> = {
  not_ready: 'Not ready yet',
  needs_improvement: 'Needs improvement',
  almost_ready: 'Almost interview-ready',
  interview_ready: 'Interview ready',
};

const VERDICT_LABEL: Record<string, string> = { strong: 'Strong', okay: 'Okay', weak: 'Needs work' };

/**
 * AI Mock Interview room — the `mock_interview` entitlement.
 * Shares the LMS interview brain (nextInterviewerTurn / evaluateTranscript) but runs
 * on Passport's own session record: no template, no batch, no scheduled slot.
 */
const Interview: React.FC = () => {
  const [params] = useSearchParams();
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [session, setSession] = useState<InterviewSession | null>(null);
  const [answer, setAnswer] = useState('');
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState('');
  const [paying, setPaying] = useState(false);
  const chatEnd = useRef<HTMLDivElement>(null);

  // Voice is opt-in but ON by default when the browser can do it — an interview you hear
  // is the point, and a member who wants to type can turn it off in one click.
  const [voiceOn, setVoiceOn] = useState(speechOutSupported);
  const [elapsed, setElapsed] = useState(0);
  const spokenRef = useRef<string>('');

  // Speech arrives in fragments; append rather than replace so a pause mid-sentence does
  // not wipe what they already said.
  const onFinalTranscript = useCallback((text: string) => {
    setAnswer(a => (a ? `${a} ${text}` : text));
  }, []);
  const voice = useInterviewVoice({ onFinalTranscript });

  // Interview clock. Real interviews are timed, and seeing it run is most of why a mock
  // one feels like practice rather than a chat window.
  useEffect(() => {
    if (!session || session.status !== 'in_progress') return;
    const t = setInterval(() => setElapsed(e => e + 1), 1000);
    return () => clearInterval(t);
  }, [session?.id, session?.status]);

  // Read each NEW interviewer line aloud, exactly once. Keyed on the text itself: a
  // re-render or a poll must not make her repeat the question.
  useEffect(() => {
    if (!voiceOn || !session || session.status !== 'in_progress') return;
    const last = session.transcript?.[session.transcript.length - 1];
    if (!last || last.role !== 'interviewer' || last.text === spokenRef.current) return;
    spokenRef.current = last.text;
    voice.stopListening();
    voice.speak(last.text);
  }, [session?.transcript?.length, voiceOn]);   // eslint-disable-line react-hooks/exhaustive-deps

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

  const start = async () => {
    setBusy(true); setErr('');
    try {
      // ?company=<slug> arrives when the member started from a company page, and primes
      // the interviewer for that employer.
      const r = await passportApi.startInterview(params.get('company') || undefined);
      setSession(r.session);
    } catch (e: any) { setErr(e?.response?.data?.message || 'Could not start the interview.'); }
    setBusy(false);
  };

  const send = async () => {
    if (!session || !answer.trim()) return;
    const text = answer.trim();
    setAnswer(''); setBusy(true); setErr('');
    voice.stopListening();
    // Optimistic — the candidate's turn shows instantly while the interviewer thinks.
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
    setBusy(true); setErr('');
    try {
      const r = await passportApi.finishInterview(sid);
      setSession(r.session);
      load();
    } catch (e: any) { setErr(e?.response?.data?.message || 'Could not finish the interview.'); }
    setBusy(false);
  };

  const openPast = async (s: InterviewSession) => setSession(s);

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

  // ── Completed session → feedback report ──
  if (session && session.status === 'completed') {
    const ev = session.evaluation;
    return (
      <PassportShell>
        <button className="pm-btn ghost" onClick={() => setSession(null)} style={{ marginBottom: 10 }}>← Back to mock interviews</button>
        <div className="pm-head">
          <h1>Your interview feedback</h1>
          <p>{session.role} · {session.transcript.filter(t => t.role === 'candidate').length} answers given</p>
        </div>

        <div className="iv-room">
          <div>
            <div className="pm-card">
              <h3 style={{ fontSize: 15, fontWeight: 900, color: '#0f172a', margin: '0 0 12px' }}>How you did</h3>
              <p style={{ fontSize: 14, color: '#334155', lineHeight: 1.7, margin: 0 }}>{ev?.summary || 'No feedback available.'}</p>
            </div>

            {!!ev?.areaScores?.length && (
              <div className="pm-card">
                <h3 style={{ fontSize: 15, fontWeight: 900, color: '#0f172a', margin: '0 0 6px' }}>Area by area</h3>
                {ev.areaScores.map((a, i) => (
                  <div key={i}>
                    <div className="iv-area-row">
                      <span className="t">{a.title}</span>
                      <span className="b"><i style={{ width: `${a.percentage}%` }} /></span>
                      <span className="p">{a.percentage}%</span>
                    </div>
                    {a.feedback && <div style={{ fontSize: 12.5, color: '#64748b', lineHeight: 1.6, padding: '0 0 8px' }}>{a.feedback}</div>}
                  </div>
                ))}
              </div>
            )}

            {!!ev?.questionFeedback?.length && (
              <div className="pm-card">
                <h3 style={{ fontSize: 15, fontWeight: 900, color: '#0f172a', margin: '0 0 4px' }}>Question by question</h3>
                <p style={{ fontSize: 12.5, color: '#64748b', margin: '0 0 14px' }}>
                  What to say instead, next time you're asked this.
                </p>
                {ev.questionFeedback.map((q, i) => (
                  <div className="iv-qf" key={i}>
                    <div className="iv-qf-head">
                      <span className={`iv-verdict ${q.verdict}`}>{VERDICT_LABEL[q.verdict] || q.verdict}</span>
                      <span className="iv-qf-q">{q.question}</span>
                    </div>
                    {q.whatWorked && <p className="iv-qf-line good"><b>Worked:</b> {q.whatWorked}</p>}
                    {q.whatToFix && <p className="iv-qf-line fix"><b>Fix:</b> {q.whatToFix}</p>}
                    {q.betterAnswer && (
                      <div className="iv-qf-better">
                        <span className="lbl">A stronger answer</span>
                        <p>"{q.betterAnswer}"</p>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}

            <div className="pm-card">
              <h3 style={{ fontSize: 15, fontWeight: 900, color: '#0f172a', margin: '0 0 10px' }}>Full transcript</h3>
              {session.transcript.map((t, i) => (
                <div className={`iv-turn ${t.role}`} key={i} style={{ marginBottom: 10 }}>
                  <span className="av">{t.role === 'interviewer' ? '🎙️' : '🙋'}</span>
                  <div className="bub">{t.text}</div>
                </div>
              ))}
            </div>
          </div>

          <div className="iv-side">
            <div className="pm-card">
              <div className="iv-score">
                <div className="num">{ev?.overallScore ?? 0}<span style={{ fontSize: 20, color: '#94a3b8' }}>%</span></div>
                <div className="lbl">Overall score</div>
                <span className="iv-badge">{READINESS_LABEL[ev?.readinessLevel || ''] || ev?.readinessLevel}</span>
              </div>
              {session.xpAwarded > 0 && (
                <div className="pm-msg ok" style={{ textAlign: 'center' }}>+{session.xpAwarded} XP added to your journey</div>
              )}
            </div>

            {!!ev?.strengths?.length && (
              <div className="pm-card">
                <h3 style={{ fontSize: 14, fontWeight: 900, color: '#0f766e', margin: 0 }}>✓ Strengths</h3>
                <ul className="iv-list">{ev.strengths.map((s, i) => <li key={i}>{s}</li>)}</ul>
              </div>
            )}
            {!!ev?.improvements?.length && (
              <div className="pm-card">
                <h3 style={{ fontSize: 14, fontWeight: 900, color: '#b45309', margin: 0 }}>△ Work on this</h3>
                <ul className="iv-list">{ev.improvements.map((s, i) => <li key={i}>{s}</li>)}</ul>
              </div>
            )}
            <button className="pm-btn primary" style={{ width: '100%', marginTop: 12 }} onClick={() => { setSession(null); start(); }}>
              Start another interview
            </button>
          </div>
        </div>
      </PassportShell>
    );
  }

  // ── Live session ──
  if (session && session.status === 'in_progress') {
    return (
      <PassportShell hideNav meta={<span className="pm-pill"><i>🎙️</i>Question <b>{session.askedCount}</b> / {session.maxQuestions}</span>}>
        <div className="pm-head">
          <h1>{session.companyName ? `${session.companyName} mock interview` : 'Mock interview in progress'}</h1>
          <p>{session.role} · with {session.interviewerName}. Answer as if this were the real thing — full sentences, specific examples.</p>
        </div>

        <div className="iv-room">
          <div className="iv-chat">
            {/* The face sits above the transcript rather than beside it: on a phone the
                room is one column, and a talking head pushed below the fold is the same
                as no head at all. Currently off — see interviewFace.ts. */}
            {INTERVIEWER_FACE_ENABLED && (
              <React.Suspense fallback={null}>
                <InterviewAvatar speaking={voice.speaking} name={session.interviewerName} />
              </React.Suspense>
            )}

            {session.transcript.map((t, i) => (
              <div className={`iv-turn ${t.role}`} key={i}>
                <span className="av">{t.role === 'interviewer' ? '🎙️' : '🙋'}</span>
                <div className="bub">{t.text}</div>
              </div>
            ))}
            {busy && <div className="iv-turn interviewer"><span className="av">🎙️</span><div className="bub" style={{ color: '#94a3b8' }}>typing…</div></div>}
            <div ref={chatEnd} />

            {voice.speaking && (
              <div className="iv-speaking">
                <span className="dot" /> {session.interviewerName} is speaking…
                <button onClick={voice.stopSpeaking}>Skip</button>
              </div>
            )}

            <div className="iv-compose">
              <textarea
                value={answer + (voice.interim ? ` ${voice.interim}` : '')}
                onChange={e => setAnswer(e.target.value)}
                placeholder={voice.listening ? 'Listening — just talk…' : 'Type your answer, or tap the mic…'}
                onKeyDown={e => { if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) send(); }}
                disabled={busy}
              />
              {speechInSupported && (
                <button
                  className={`iv-mic${voice.listening ? ' on' : ''}`}
                  onClick={() => (voice.listening ? voice.stopListening() : voice.startListening())}
                  disabled={busy || voice.speaking}
                  title={voice.speaking ? 'Wait for the interviewer to finish' : voice.listening ? 'Stop recording' : 'Answer out loud'}
                >
                  {voice.listening ? '⏹' : '🎤'}
                </button>
              )}
              <button className="pm-btn primary" onClick={send} disabled={busy || !answer.trim()}>Send</button>
            </div>
            {err && <div className="pm-msg err">{err}</div>}
          </div>

          <div className="iv-side">
            <div className="pm-card">
              <h3 style={{ fontSize: 14, fontWeight: 900, color: '#0f172a', margin: 0 }}>Areas covered</h3>
              <div className="iv-areas">
                {session.areas.map((a, i) => <div key={i}><span>•</span>{a}</div>)}
              </div>
            </div>
            <div className="pm-card">
              <div className="iv-clock">
                <span>⏱</span>
                <b>{String(Math.floor(elapsed / 60)).padStart(2, '0')}:{String(elapsed % 60).padStart(2, '0')}</b>
                <span className="lbl">elapsed</span>
              </div>
              {speechOutSupported && (
                <label className="iv-voice-toggle">
                  <input type="checkbox" checked={voiceOn} onChange={e => { setVoiceOn(e.target.checked); if (!e.target.checked) voice.stopSpeaking(); }} />
                  Hear the interviewer
                </label>
              )}
              {!speechInSupported && (
                <div className="iv-note">Speaking your answer needs Chrome or Edge. Typing works everywhere.</div>
              )}
            </div>
            <div className="pm-card">
              <div style={{ fontSize: 12.5, color: '#64748b', lineHeight: 1.6 }}>
                Ctrl+Enter sends your answer. End early any time — you'll still get feedback on what you answered.
              </div>
              <button className="pm-btn" style={{ width: '100%', marginTop: 12 }} onClick={() => finish()} disabled={busy}>
                End & get my feedback
              </button>
            </div>
          </div>
        </div>
      </PassportShell>
    );
  }

  // ── Landing: start + history ──
  return (
    <PassportShell>
      <div className="pm-head">
        <h1>AI Mock Interview</h1>
        <p>A real conversation, not a quiz. The interviewer reads your answers, asks follow-ups, and grades you area by area at the end. Each completed round adds 60 XP.</p>
      </div>

      {!aiAvailable && (
        <div className="pm-msg info" style={{ marginBottom: 14 }}>
          AI isn't configured on this tenant yet, so interviews will run on scripted questions and won't be scored. Ask your admin to add an Anthropic key in Platform Settings.
        </div>
      )}

      <div className="pm-card" style={{ textAlign: 'center', padding: '34px 24px' }}>
        <div style={{ fontSize: 40, marginBottom: 10 }}>🎙️</div>
        <div style={{ fontSize: 17, fontWeight: 900, color: '#0f172a', marginBottom: 6 }}>Ready for a round?</div>
        <div style={{ fontSize: 13.5, color: '#64748b', marginBottom: 18, lineHeight: 1.6 }}>
          About 6 questions, 10–15 minutes. Tailored to your pathway from the assessment.
        </div>
        <button className="pm-btn primary" onClick={start} disabled={busy}>{busy ? 'Setting up…' : 'Start mock interview →'}</button>
        {err && <div className="pm-msg err" style={{ maxWidth: 420, margin: '12px auto 0' }}>{err}</div>}
      </div>

      {!!sessions.length && (
        <>
          <h2 style={{ fontSize: 17, fontWeight: 900, color: '#0f172a', margin: '26px 0 12px' }}>Past rounds</h2>
          <div className="iv-history">
            {sessions.map(s => (
              <button className="iv-hist-row" key={s.id} onClick={() => openPast(s)}>
                <span className="sc">{s.status === 'completed' ? `${s.evaluation?.overallScore ?? 0}%` : '—'}</span>
                <span className="info">
                  <b>{s.role}</b>
                  <span>
                    {new Date(s.startedAt).toLocaleDateString()} ·{' '}
                    {s.status === 'completed' ? READINESS_LABEL[s.evaluation?.readinessLevel || ''] || 'Completed'
                      : s.status === 'in_progress' ? 'In progress — resume' : 'Not completed'}
                  </span>
                </span>
                <span style={{ color: '#cbd5e1' }}>›</span>
              </button>
            ))}
          </div>
        </>
      )}
    </PassportShell>
  );
};

export default Interview;
