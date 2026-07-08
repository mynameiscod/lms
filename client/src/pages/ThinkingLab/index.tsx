import React, { useCallback, useEffect, useRef, useState } from 'react';
import Editor from '@monaco-editor/react';
import { thinkingLabApi, TLChallenge, TLStats, TLRunResult, TLSubmitResult, TLBadge, TLLeaderRow, TLVoiceEval, TLProfile, TLAnalytics, TLExplanation, TL_LANGS, DIFF_COLORS } from '../../api/thinkingLabApi';

const BLUE = '#2563eb', INK = '#0f172a', SUB = '#64748b';
const fmtTime = (s: number) => `${String(Math.floor(s / 60)).padStart(2, '0')}:${String(s % 60).padStart(2, '0')}`;

const ThinkingLab: React.FC = () => {
  const [challenge, setChallenge] = useState<TLChallenge | null>(null);
  const [stats, setStats] = useState<TLStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [empty, setEmpty] = useState<string>('');
  const [err, setErr] = useState('');

  const [approach, setApproach] = useState('');
  const [unlocked, setUnlocked] = useState(false);
  const [savingApproach, setSavingApproach] = useState(false);
  const [code, setCode] = useState('');
  const [language, setLanguage] = useState('javascript');
  const [running, setRunning] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [runResult, setRunResult] = useState<TLRunResult | null>(null);
  const [submitResult, setSubmitResult] = useState<TLSubmitResult | null>(null);
  const [hints, setHints] = useState<string[]>([]);
  const [seconds, setSeconds] = useState(0);

  const [tab, setTab] = useState<'challenge' | 'progress' | 'leaderboard' | 'analytics'>('challenge');
  const [celebration, setCelebration] = useState<TLSubmitResult | null>(null);
  const [badges, setBadges] = useState<TLBadge[] | null>(null);
  const [lbScope, setLbScope] = useState('overall');
  const [lb, setLb] = useState<{ leaderboard: TLLeaderRow[]; myRank: number | null } | null>(null);

  // Voice "Explain to AI"
  const [recording, setRecording] = useState(false);
  const [voiceBusy, setVoiceBusy] = useState(false);
  const [voiceEval, setVoiceEval] = useState<TLVoiceEval | null>(null);
  const mediaRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  // Thinking Journal
  const [journal, setJournal] = useState({ firstThought: '', gotStuck: '', learned: '' });
  const [journalSaved, setJournalSaved] = useState(false);
  const [journalBusy, setJournalBusy] = useState(false);
  // Thinking Profile
  const [profile, setProfile] = useState<{ profile: TLProfile | null; journalCount: number; needMore?: number } | null>(null);
  const [profileBusy, setProfileBusy] = useState(false);
  // Analytics + step-by-step explainer
  const [analytics, setAnalytics] = useState<TLAnalytics | null>(null);
  const [explanation, setExplanation] = useState<TLExplanation | null>(null);
  const [explainBusy, setExplainBusy] = useState(false);

  const timerRef = useRef<any>(null);
  const wc = approach.trim().split(/\s+/).filter(Boolean).length;
  const minWords = challenge?.minApproachWords ?? 30;
  const done = challenge?.status === 'solved' || challenge?.status === 'submitted';

  const hydrate = useCallback((ch: TLChallenge | null) => {
    if (!ch) { setChallenge(null); return; }
    setChallenge(ch);
    setApproach(ch.approach || '');
    setUnlocked(ch.editorUnlocked);
    setCode(ch.code || ch.problem?.starterCode || '');
    setLanguage(ch.language || 'javascript');
    setHints(ch.problem?.hints || []);
    setSeconds(ch.timeSpentSec || 0);
    setVoiceEval(null); setJournal({ firstThought: '', gotStuck: '', learned: '' }); setJournalSaved(false); setRecording(false);
    setExplanation(null); setAnalytics(null);
    setRunResult(null);
    setSubmitResult(ch.aiFeedback ? { feedback: ch.aiFeedback, allPassed: ch.passed, xpEarned: ch.xpEarned, coinsEarned: 0, newBadges: [], status: ch.status, results: [], passedCount: 0, total: 0 } : null);
  }, []);

  const load = useCallback(async () => {
    setLoading(true); setErr(''); setEmpty('');
    try {
      const [r, s] = await Promise.all([thinkingLabApi.getToday(), thinkingLabApi.stats().catch(() => null)]);
      if (s) setStats(s);
      if (r.empty || !r.challenge) { setEmpty(r.message || 'No challenge available yet.'); setChallenge(null); }
      else hydrate(r.challenge);
    } catch (e: any) { setErr(e?.response?.data?.message || 'Failed to load your challenge.'); }
    finally { setLoading(false); }
  }, [hydrate]);

  useEffect(() => { load(); }, [load]);

  // Timer runs while an unsolved challenge is open.
  useEffect(() => {
    if (challenge && !done) {
      timerRef.current = setInterval(() => setSeconds(s => s + 1), 1000);
      return () => clearInterval(timerRef.current);
    }
  }, [challenge, done]);

  // Lazy-load Progress + Leaderboard when their tab opens.
  useEffect(() => { if (tab === 'progress' && !badges) thinkingLabApi.badges().then(setBadges).catch(() => setBadges([])); }, [tab, badges]);
  useEffect(() => { if (tab === 'progress' && !profile) loadProfile(); /* eslint-disable-next-line */ }, [tab]);
  useEffect(() => { if (tab === 'analytics' && !analytics) thinkingLabApi.analytics().then(setAnalytics).catch(() => {}); }, [tab, analytics]);

  const runExplain = async () => {
    if (!challenge) return;
    setExplainBusy(true);
    try { setExplanation(await thinkingLabApi.explain(challenge.challengeId)); }
    catch (e: any) { setErr(e?.response?.data?.message || 'Could not generate explanation.'); }
    finally { setExplainBusy(false); }
  };
  useEffect(() => { if (tab === 'leaderboard') { setLb(null); thinkingLabApi.leaderboard(lbScope).then(setLb).catch(() => setLb({ leaderboard: [], myRank: null })); } }, [tab, lbScope]);

  const checkApproach = async () => {
    if (!challenge) return;
    setSavingApproach(true); setErr('');
    try {
      const r = await thinkingLabApi.saveApproach(challenge.challengeId, approach);
      setUnlocked(r.unlocked);
      if (!r.unlocked) setErr(`Explain a little more — ${r.wordCount}/${r.minApproachWords} words. Describe your steps: what you read, what you compute, what you output.`);
    } catch (e: any) { setErr(e?.response?.data?.message || 'Could not save your approach.'); }
    finally { setSavingApproach(false); }
  };

  const revealHint = async () => {
    if (!challenge) return;
    try { const r = await thinkingLabApi.revealHint(challenge.challengeId); setHints(h => [...h, r.hint]); }
    catch (e: any) { setErr(e?.response?.data?.message || 'No more hints.'); }
  };

  // Voice "Explain to AI" — record via mic, upload for transcription + coaching.
  const startRec = async () => {
    setErr('');
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mr = new MediaRecorder(stream);
      chunksRef.current = [];
      mr.ondataavailable = e => { if (e.data.size) chunksRef.current.push(e.data); };
      mr.onstop = async () => {
        stream.getTracks().forEach(t => t.stop());
        const blob = new Blob(chunksRef.current, { type: 'audio/webm' });
        if (!challenge || blob.size < 1000) { setErr('Recording too short — hold and speak for a few seconds.'); return; }
        setVoiceBusy(true);
        try { const r = await thinkingLabApi.voiceExplain(challenge.challengeId, blob); setVoiceEval(r.voiceEval); if (r.xpEarned) thinkingLabApi.stats().then(setStats).catch(() => {}); }
        catch (e: any) { setErr(e?.response?.data?.message || 'Voice evaluation failed.'); }
        finally { setVoiceBusy(false); }
      };
      mediaRef.current = mr; mr.start(); setRecording(true);
    } catch { setErr('Microphone access denied or unavailable.'); }
  };
  const stopRec = () => { if (mediaRef.current && recording) { mediaRef.current.stop(); setRecording(false); } };

  const saveJournal = async () => {
    if (!challenge) return;
    setJournalBusy(true); setErr('');
    try { await thinkingLabApi.saveJournal(challenge.challengeId, journal); setJournalSaved(true); thinkingLabApi.stats().then(setStats).catch(() => {}); }
    catch (e: any) { setErr(e?.response?.data?.message || 'Could not save your journal.'); }
    finally { setJournalBusy(false); }
  };

  const loadProfile = async (refresh = false) => {
    setProfileBusy(true);
    try { setProfile(await thinkingLabApi.profile(refresh)); }
    catch { /* ignore */ } finally { setProfileBusy(false); }
  };

  const runCode = async () => {
    if (!challenge) return;
    setRunning(true); setErr(''); setRunResult(null);
    try { setRunResult(await thinkingLabApi.run(challenge.challengeId, code, language)); }
    catch (e: any) { setErr(e?.response?.data?.message || 'Run failed.'); }
    finally { setRunning(false); }
  };

  const submit = async () => {
    if (!challenge) return;
    setSubmitting(true); setErr('');
    try {
      const r = await thinkingLabApi.submit(challenge.challengeId, code, language, seconds);
      setSubmitResult(r);
      if (r.allPassed) setCelebration(r); // confetti + XP/coins/badges
      setChallenge(c => c ? { ...c, status: r.status, passed: r.allPassed, xpEarned: r.xpEarned } : c);
      thinkingLabApi.stats().then(setStats).catch(() => {});
      setBadges(null); // force refresh next time Progress opens
    } catch (e: any) { setErr(e?.response?.data?.message || 'Submit failed.'); }
    finally { setSubmitting(false); }
  };

  const nextChallenge = async () => {
    setLoading(true);
    try { const r = await thinkingLabApi.next(); if (r.empty || !r.challenge) setEmpty('No more challenges right now — come back tomorrow!'); else { hydrate(r.challenge); setSubmitResult(null); } }
    catch (e: any) { setErr(e?.response?.data?.message || 'Failed.'); }
    finally { setLoading(false); }
  };

  if (loading) return <div style={{ padding: 40, color: SUB }}>Loading your challenge…</div>;

  const p = challenge?.problem;
  const diffColor = p ? (DIFF_COLORS[p.difficulty] || BLUE) : BLUE;

  return (
    <div style={{ maxWidth: 1200, margin: '0 auto', padding: 22 }}>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 12 }}>
        <div>
          <h1 style={{ margin: 0, fontSize: 26, color: INK, fontWeight: 800 }}>Logical Thinking Lab</h1>
          <p style={{ margin: '4px 0 0', color: SUB, fontSize: 13.5 }}>Your daily brain gym — think first, then code. One challenge a day builds real problem-solving.</p>
        </div>
        {stats && (
          <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
            <Stat label="XP" value={stats.xpTotal} accent={BLUE} />
            <Stat label="Level" value={stats.level} accent="#7c3aed" />
            <Stat label="🪙 Coins" value={stats.coins} accent="#d97706" />
            <Stat label="🔥 Streak" value={`${stats.streak}d`} accent="#ea580c" />
            <Stat label="🏅 Badges" value={stats.badgeCount} accent="#16a34a" />
          </div>
        )}
      </div>

      {/* Tabs */}
      <div style={{ display: 'flex', gap: 6, marginTop: 16, borderBottom: '1px solid #e6e8f0' }}>
        {([['challenge', "Today's Challenge"], ['progress', 'My Progress'], ['analytics', 'Analytics'], ['leaderboard', 'Leaderboard']] as [any, string][]).map(([k, l]) => (
          <button key={k} onClick={() => setTab(k)} style={{ background: 'none', border: 'none', borderBottom: `2.5px solid ${tab === k ? BLUE : 'transparent'}`, color: tab === k ? BLUE : SUB, fontWeight: 700, fontSize: 14, padding: '10px 14px', cursor: 'pointer' }}>{l}</button>
        ))}
      </div>

      {tab === 'challenge' && empty && (
        <div style={{ marginTop: 20, background: '#fff', border: '1px dashed #cbd5e1', borderRadius: 16, padding: 40, textAlign: 'center' }}>
          <div style={{ fontSize: 34 }}>🧠</div>
          <div style={{ fontSize: 16, fontWeight: 700, color: INK, marginTop: 8 }}>{empty}</div>
        </div>
      )}

      {tab === 'challenge' && p && challenge && (
        <>
          {/* Challenge top bar */}
          <div style={{ marginTop: 18, background: '#fff', border: '1px solid #e6e8f0', borderRadius: 16, padding: '16px 18px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 12 }}>
            <div>
              <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
                <span style={{ fontSize: 11, fontWeight: 800, color: '#fff', background: diffColor, borderRadius: 999, padding: '3px 10px', textTransform: 'capitalize' }}>{p.difficulty}</span>
                <span style={{ fontSize: 11.5, fontWeight: 700, color: BLUE, background: '#eff6ff', borderRadius: 999, padding: '3px 10px' }}>{p.category}</span>
                <span style={{ fontSize: 12, color: SUB }}>⚡ {p.xp} XP</span>
                {p.estimatedMinutes && <span style={{ fontSize: 12, color: SUB }}>· ~{p.estimatedMinutes} min</span>}
              </div>
              <h2 style={{ margin: '8px 0 0', fontSize: 19, color: INK, fontWeight: 700 }}>{p.title}</h2>
            </div>
            <div style={{ textAlign: 'right' }}>
              <div style={{ fontFamily: 'ui-monospace,monospace', fontSize: 22, fontWeight: 800, color: INK }}>{fmtTime(seconds)}</div>
              <div style={{ fontSize: 11.5, color: SUB }}>Attempt {challenge.attempts + (done ? 0 : 1)} · {challenge.hintsUsed} hints used</div>
            </div>
          </div>

          {/* Problem + Thinking */}
          <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0,1.1fr) minmax(0,1fr)', gap: 16, marginTop: 16 }}>
            {/* Left: problem */}
            <div style={{ background: '#fff', border: '1px solid #e6e8f0', borderRadius: 16, padding: 20 }}>
              <SectionH>Problem</SectionH>
              <div style={{ fontSize: 14.5, color: INK, lineHeight: 1.6, whiteSpace: 'pre-wrap' }}>{p.statement}</div>
              {p.imageUrl && <img src={p.imageUrl} alt="problem" style={{ maxWidth: '100%', borderRadius: 10, marginTop: 12, border: '1px solid #eef1f6' }} />}
              {p.examples?.length > 0 && (
                <div style={{ marginTop: 14 }}>
                  <SectionH>Examples</SectionH>
                  {p.examples.map((ex, i) => (
                    <div key={i} style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, background: '#f8fafc', border: '1px solid #eef1f6', borderRadius: 10, padding: 10, marginBottom: 8 }}>
                      <div><div style={miniH}>Input</div><pre style={pre}>{ex.input || '(none)'}</pre></div>
                      <div><div style={miniH}>Output</div><pre style={pre}>{ex.expectedOutput}</pre></div>
                      {ex.explanation && <div style={{ gridColumn: '1 / -1', fontSize: 12.5, color: SUB }}>{ex.explanation}</div>}
                    </div>
                  ))}
                </div>
              )}
              {p.constraints && <div style={{ marginTop: 12 }}><SectionH>Constraints</SectionH><pre style={{ ...pre, color: '#475569' }}>{p.constraints}</pre></div>}
              {p.notes && <div style={{ marginTop: 12, fontSize: 13, color: SUB }}>{p.notes}</div>}
            </div>

            {/* Right: thinking notes (the gate) */}
            <div style={{ background: '#fff', border: '1px solid #e6e8f0', borderRadius: 16, padding: 20 }}>
              <SectionH>🧠 Think first — how will you solve this?</SectionH>
              <p style={{ fontSize: 12.5, color: SUB, margin: '2px 0 10px' }}>Explain your approach in plain English (min {minWords} words). The code editor unlocks only after you've thought it through — this is how real problem-solving is built.</p>
              <textarea value={approach} onChange={e => setApproach(e.target.value)} disabled={done}
                placeholder={'e.g. First I will read the input... then I will loop through... to check... and finally I will print...'}
                style={{ width: '100%', minHeight: 150, border: `1px solid ${unlocked ? '#bbf7d0' : '#cbd5e1'}`, borderRadius: 12, padding: 12, fontSize: 13.5, fontFamily: 'inherit', boxSizing: 'border-box', lineHeight: 1.5 }} />
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 8 }}>
                <span style={{ fontSize: 12.5, fontWeight: 700, color: wc >= minWords ? '#16a34a' : SUB }}>{wc}/{minWords} words {wc >= minWords ? '✓' : ''}</span>
                {!unlocked && !done && (
                  <button onClick={checkApproach} disabled={savingApproach || wc < minWords} style={{ ...btn(wc >= minWords ? BLUE : '#cbd5e1'), cursor: wc >= minWords ? 'pointer' : 'not-allowed' }}>
                    {savingApproach ? 'Checking…' : '🔓 Unlock code editor'}
                  </button>
                )}
                {unlocked && !done && <span style={{ fontSize: 12.5, color: '#16a34a', fontWeight: 700 }}>✓ Editor unlocked</span>}
              </div>

              {/* Hints */}
              {unlocked && !done && (
                <div style={{ marginTop: 14 }}>
                  {hints.map((h, i) => (
                    <div key={i} style={{ background: '#fffbeb', border: '1px solid #fde68a', color: '#92400e', borderRadius: 8, padding: '8px 11px', fontSize: 12.5, marginBottom: 6 }}>💡 Hint {i + 1}: {h}</div>
                  ))}
                  {hints.length < (p.totalHints || 0) && (
                    <button onClick={revealHint} style={{ background: 'none', border: '1px dashed #f59e0b', color: '#b45309', borderRadius: 8, padding: '6px 12px', fontSize: 12.5, fontWeight: 600, cursor: 'pointer' }}>
                      Need a hint? ({hints.length}/{p.totalHints}) — costs some XP
                    </button>
                  )}
                </div>
              )}

              {/* Voice — Explain to AI (optional, +30 XP) */}
              <div style={{ marginTop: 16, borderTop: '1px dashed #e6e8f0', paddingTop: 14 }}>
                <div style={{ fontSize: 12.5, fontWeight: 800, color: '#7c3aed' }}>🎤 Explain your logic out loud <span style={{ color: SUB, fontWeight: 500 }}>(optional · +30 XP)</span></div>
                <p style={{ fontSize: 12, color: SUB, margin: '2px 0 8px' }}>Speak your approach — the AI coaches your confidence, clarity and communication. Great interview practice.</p>
                {!voiceEval && (
                  <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
                    {!recording
                      ? <button onClick={startRec} disabled={voiceBusy} style={{ ...btn('#7c3aed'), padding: '8px 14px' }}>{voiceBusy ? 'Evaluating…' : '● Record explanation'}</button>
                      : <button onClick={stopRec} style={{ ...btn('#dc2626'), padding: '8px 14px' }}>■ Stop &amp; evaluate</button>}
                    {recording && <span style={{ fontSize: 12.5, color: '#dc2626', fontWeight: 700 }}>● Recording… speak now</span>}
                  </div>
                )}
                {voiceEval && (
                  <div style={{ background: '#f5f3ff', border: '1px solid #ddd6fe', borderRadius: 10, padding: 12 }}>
                    <div style={{ fontSize: 13, fontWeight: 800, color: '#6d28d9' }}>Voice score: {voiceEval.overall}/100</div>
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, margin: '8px 0' }}>
                      {([['Confidence', voiceEval.confidence], ['Communication', voiceEval.communication], ['Logic', voiceEval.logic], ['Flow', voiceEval.flow], ['Grammar', voiceEval.grammar], ['Professionalism', voiceEval.professionalism], ['Tech vocab', voiceEval.technicalVocabulary]] as [string, number][]).map(([l, v]) => (
                        <span key={l} style={{ fontSize: 11, fontWeight: 700, background: '#fff', border: '1px solid #ede9fe', borderRadius: 6, padding: '2px 8px', color: '#4c1d95' }}>{l} {v}</span>
                      ))}
                    </div>
                    <div style={{ fontSize: 12.5, color: '#475569' }}>{voiceEval.summary}</div>
                    {voiceEval.tips?.length > 0 && <ul style={{ margin: '6px 0 0', paddingLeft: 18 }}>{voiceEval.tips.map((t, i) => <li key={i} style={{ fontSize: 12, color: SUB }}>{t}</li>)}</ul>}
                    {!done && <button onClick={() => setVoiceEval(null)} style={{ marginTop: 8, background: 'none', border: 'none', color: '#7c3aed', fontSize: 12, cursor: 'pointer' }}>↻ Try again</button>}
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Editor */}
          {unlocked && (
            <div style={{ marginTop: 16, background: '#fff', border: '1px solid #e6e8f0', borderRadius: 16, padding: 16, opacity: done ? 0.85 : 1 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
                <SectionH>Code your solution</SectionH>
                <select value={language} onChange={e => setLanguage(e.target.value)} disabled={done} style={{ border: '1px solid #cbd5e1', borderRadius: 8, padding: '7px 10px', fontSize: 13 }}>
                  {TL_LANGS.map(l => <option key={l.v} value={l.v}>{l.l}</option>)}
                </select>
              </div>
              <div style={{ border: '1px solid #e6ebf3', borderRadius: 10, overflow: 'hidden' }}>
                <Editor height="320px" theme="light" language={language === 'cpp' ? 'cpp' : language} value={code} onChange={v => setCode(v ?? '')} options={{ minimap: { enabled: false }, fontSize: 14, scrollBeyondLastLine: false, tabSize: 2, readOnly: done }} />
              </div>
              {!done && (
                <div style={{ display: 'flex', gap: 10, marginTop: 12, alignItems: 'center' }}>
                  <button onClick={runCode} disabled={running} style={btn('#0ea5e9')}>{running ? '⏳ Running…' : '▶ Run'}</button>
                  <button onClick={() => setCode(p.starterCode || '')} style={{ ...btn('#f1f5f9'), color: '#475569' }}>↺ Reset</button>
                  <button onClick={submit} disabled={submitting} style={{ ...btn('#16a34a'), marginLeft: 'auto' }}>{submitting ? 'Evaluating…' : '✓ Submit for evaluation'}</button>
                </div>
              )}
              {runResult && !done && (
                <div style={{ marginTop: 12 }}>
                  {runResult.compileError && <pre style={{ background: '#fef2f2', color: '#b91c1c', borderRadius: 8, padding: 10, fontSize: 12, whiteSpace: 'pre-wrap' }}>{runResult.compileError.slice(0, 400)}</pre>}
                  <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                    {runResult.results.map(r => <span key={r.index} style={{ fontSize: 11.5, fontWeight: 700, borderRadius: 6, padding: '3px 9px', background: r.passed ? '#dcfce7' : '#fee2e2', color: r.passed ? '#15803d' : '#b91c1c' }}>{r.passed ? '✓' : '✕'} {r.hidden ? 'Hidden' : 'Test'} {r.index + 1}</span>)}
                  </div>
                  <div style={{ fontSize: 12.5, color: SUB, marginTop: 6 }}>{runResult.passedCount}/{runResult.total} passing — Submit when ready for full AI feedback.</div>
                </div>
              )}
            </div>
          )}

          {err && <div style={{ background: '#fef2f2', color: '#b91c1c', borderRadius: 8, padding: '10px 12px', fontSize: 13, marginTop: 12 }}>{err}</div>}

          {/* AI feedback */}
          {submitResult && <Feedback result={submitResult} onNext={nextChallenge} />}

          {/* Thinking Journal — mandatory reflection after solving */}
          {done && (
            <div style={{ marginTop: 16, background: '#fff', border: '1px solid #e6e8f0', borderRadius: 16, padding: 20 }}>
              <SectionH>📓 Thinking Journal <span style={{ color: SUB, fontWeight: 500, fontSize: 12 }}>(+15 XP · builds your Thinking Profile)</span></SectionH>
              {journalSaved ? (
                <div style={{ background: '#f0fdf4', border: '1px solid #bbf7d0', color: '#15803d', borderRadius: 10, padding: 12, fontSize: 13 }}>✓ Journal saved. Your Thinking Profile updates as you reflect on more problems — see the <b>My Progress</b> tab.</div>
              ) : (
                <div style={{ display: 'grid', gap: 10 }}>
                  {([['firstThought', 'What was your first thought when you read the problem?'], ['gotStuck', 'Where did you get stuck (if anywhere)?'], ['learned', 'What did you learn from this one?']] as [keyof typeof journal, string][]).map(([k, q]) => (
                    <label key={k}><span style={{ fontSize: 12.5, fontWeight: 600, color: '#475569', display: 'block', marginBottom: 4 }}>{q}</span>
                      <textarea value={journal[k]} onChange={e => setJournal(j => ({ ...j, [k]: e.target.value }))} style={{ width: '100%', minHeight: 52, border: '1px solid #cbd5e1', borderRadius: 8, padding: 10, fontSize: 13, fontFamily: 'inherit', boxSizing: 'border-box' }} />
                    </label>
                  ))}
                  <div><button onClick={saveJournal} disabled={journalBusy || !(journal.firstThought || journal.learned)} style={{ ...btn(BLUE), opacity: (journal.firstThought || journal.learned) ? 1 : 0.5 }}>{journalBusy ? 'Saving…' : 'Save reflection'}</button></div>
                </div>
              )}
            </div>
          )}

          {/* Step-by-step explainer (post-solve learning) */}
          {done && (
            <div style={{ marginTop: 16, background: '#fff', border: '1px solid #e6e8f0', borderRadius: 16, padding: 20 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 8 }}>
                <SectionH>🔍 Understand it step by step</SectionH>
                {!explanation && <button onClick={runExplain} disabled={explainBusy} style={btn('#0ea5e9')}>{explainBusy ? 'Generating…' : 'Show dry run & complexity'}</button>}
              </div>
              {explanation && (
                <div>
                  {explanation.sampleInput && <div style={{ fontSize: 12.5, color: SUB, marginBottom: 8 }}>Traced on input: <code style={{ background: '#f1f5f9', padding: '1px 6px', borderRadius: 4 }}>{explanation.sampleInput}</code> → output <code style={{ background: '#f1f5f9', padding: '1px 6px', borderRadius: 4 }}>{explanation.finalOutput}</code></div>}
                  {!!explanation.dryRun?.length && (
                    <div style={{ overflowX: 'auto' }}>
                      <table style={{ borderCollapse: 'collapse', width: '100%', fontSize: 12.5, minWidth: 460 }}>
                        <thead><tr style={{ background: '#f8fafc', textAlign: 'left' }}>{['#', 'Action', 'State after'].map(h => <th key={h} style={{ padding: '7px 10px', fontSize: 10.5, textTransform: 'uppercase', color: SUB }}>{h}</th>)}</tr></thead>
                        <tbody>{explanation.dryRun.map((s, i) => (
                          <tr key={i} style={{ borderTop: '1px solid #eef1f6' }}>
                            <td style={{ padding: '7px 10px', fontWeight: 700, color: SUB }}>{s.step}</td>
                            <td style={{ padding: '7px 10px', color: INK }}>{s.action}</td>
                            <td style={{ padding: '7px 10px', fontFamily: 'ui-monospace,monospace', color: '#475569' }}>{s.state}</td>
                          </tr>
                        ))}</tbody>
                      </table>
                    </div>
                  )}
                  <div style={{ display: 'flex', gap: 10, marginTop: 10, flexWrap: 'wrap' }}>
                    {explanation.timeComplexity && <span style={cxChip}>⏱ {explanation.timeComplexity}</span>}
                    {explanation.spaceComplexity && <span style={cxChip}>💾 {explanation.spaceComplexity}</span>}
                  </div>
                  {explanation.bestPractice && <div style={{ marginTop: 10, fontSize: 13, color: '#475569' }}><b>Best practice:</b> {explanation.bestPractice}</div>}
                  {explanation.altLogic && <div style={{ marginTop: 4, fontSize: 13, color: SUB }}><b>Another way:</b> {explanation.altLogic}</div>}
                </div>
              )}
              {p.referenceVideo && <div style={{ marginTop: 12 }}><a href={p.referenceVideo} target="_blank" rel="noreferrer" style={{ color: BLUE, fontWeight: 700, fontSize: 13 }}>▶ Watch reference video</a></div>}
            </div>
          )}
        </>
      )}

      {/* Progress tab — thinking profile + badges */}
      {tab === 'progress' && (
        <div style={{ marginTop: 18 }}>
          {/* Thinking Profile */}
          <div style={{ background: 'linear-gradient(120deg,#f8fafc,#eff6ff)', border: '1px solid #e6e8f0', borderRadius: 16, padding: 20, marginBottom: 16 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <SectionH>🧭 Your Thinking Profile</SectionH>
              {profile?.profile && <button onClick={() => loadProfile(true)} disabled={profileBusy} style={{ background: 'none', border: '1px solid #cbd5e1', borderRadius: 8, padding: '4px 10px', fontSize: 12, color: SUB, cursor: 'pointer' }}>{profileBusy ? 'Refreshing…' : '↻ Refresh'}</button>}
            </div>
            {profileBusy && !profile ? <div style={{ color: SUB, fontSize: 13 }}>Analysing your thinking…</div> :
              !profile?.profile ? (
                <div style={{ fontSize: 13, color: SUB }}>Solve a few challenges and answer the Thinking Journal after each — your AI profile appears once you've reflected on {profile?.needMore ? `${profile.needMore} more` : 'a couple of'} problems.</div>
              ) : (
                <div>
                  {profile.profile.summary && <p style={{ fontSize: 14, color: INK, lineHeight: 1.6, margin: '2px 0 12px' }}>{profile.profile.summary}</p>}
                  {!!profile.profile.traits?.length && (
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginBottom: 12 }}>
                      {profile.profile.traits.map((t, i) => (
                        <span key={i} title={t.note} style={{ fontSize: 12, fontWeight: 700, background: '#fff', border: '1px solid #ddd6fe', color: '#5b21b6', borderRadius: 999, padding: '4px 12px' }}>{t.label}</span>
                      ))}
                    </div>
                  )}
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(220px,1fr))', gap: 12 }}>
                    {!!profile.profile.strengths?.length && <ListCard title="✅ Strengths" items={profile.profile.strengths} color="#16a34a" />}
                    {!!profile.profile.weaknesses?.length && <ListCard title="⚠️ Growth areas" items={profile.profile.weaknesses} color="#d97706" />}
                    {!!profile.profile.recommendations?.length && <ListCard title="🎯 Do next" items={profile.profile.recommendations} color="#2563eb" />}
                  </div>
                  <div style={{ fontSize: 11, color: '#94a3b8', marginTop: 8 }}>Based on {profile.profile.basedOnCount} reflections.</div>
                </div>
              )}
          </div>

          <div style={{ background: '#fff', border: '1px solid #e6e8f0', borderRadius: 16, padding: 20 }}>
            <SectionH>🏅 Badges {stats && `(${stats.badgeCount}/${badges?.length ?? 11})`}</SectionH>
            {!badges ? <div style={{ color: SUB, fontSize: 13 }}>Loading…</div> : (
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill,minmax(150px,1fr))', gap: 12 }}>
                {badges.map(b => (
                  <div key={b.key} style={{ border: `1px solid ${b.earned ? '#bfdbfe' : '#eef1f6'}`, background: b.earned ? '#eff6ff' : '#f8fafc', borderRadius: 12, padding: 14, textAlign: 'center', opacity: b.earned ? 1 : 0.55 }}>
                    <div style={{ fontSize: 30, filter: b.earned ? 'none' : 'grayscale(1)' }}>{b.icon}</div>
                    <div style={{ fontSize: 12.5, fontWeight: 800, color: INK, marginTop: 4 }}>{b.name}</div>
                    <div style={{ fontSize: 11, color: SUB, marginTop: 2 }}>{b.desc}</div>
                    {b.earned && <div style={{ fontSize: 10, color: BLUE, fontWeight: 700, marginTop: 4 }}>✓ Earned</div>}
                  </div>
                ))}
              </div>
            )}
          </div>
          {stats && (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(130px,1fr))', gap: 12, marginTop: 12 }}>
              <Stat label="Total XP" value={stats.xpTotal} accent={BLUE} />
              <Stat label="Level" value={stats.level} accent="#7c3aed" />
              <Stat label="🪙 Coins" value={stats.coins} accent="#d97706" />
              <Stat label="Solved" value={stats.solvedTotal} accent="#16a34a" />
              <Stat label="🔥 Best streak" value={`${stats.longestStreak}d`} accent="#ea580c" />
            </div>
          )}
        </div>
      )}

      {/* Leaderboard tab */}
      {tab === 'leaderboard' && (
        <div style={{ marginTop: 18 }}>
          <div style={{ display: 'flex', gap: 6, marginBottom: 12, flexWrap: 'wrap' }}>
            {[['overall', 'Overall'], ['weekly', 'This Week'], ['monthly', 'This Month'], ['batch', 'My Batch']].map(([k, l]) => (
              <button key={k} onClick={() => setLbScope(k)} style={{ border: `1.5px solid ${lbScope === k ? BLUE : '#e2e8f0'}`, background: lbScope === k ? '#eff6ff' : '#fff', color: lbScope === k ? BLUE : SUB, borderRadius: 999, padding: '6px 14px', fontSize: 13, fontWeight: 700, cursor: 'pointer' }}>{l}</button>
            ))}
          </div>
          <div style={{ background: '#fff', border: '1px solid #e6e8f0', borderRadius: 16, overflow: 'hidden' }}>
            {!lb ? <div style={{ color: SUB, fontSize: 13, padding: 20 }}>Loading…</div> :
              lb.leaderboard.length === 0 ? <div style={{ color: SUB, fontSize: 13, padding: 20, textAlign: 'center' }}>No rankings yet — be the first to solve a challenge!</div> :
                lb.leaderboard.map(r => (
                  <div key={r.studentId + r.rank} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '11px 16px', borderTop: '1px solid #f1f5f9', background: r.isMe ? '#eff6ff' : '#fff' }}>
                    <div style={{ width: 30, textAlign: 'center', fontWeight: 800, fontSize: 15, color: r.rank <= 3 ? ['#eab308', '#94a3b8', '#b45309'][r.rank - 1] : SUB }}>{r.rank <= 3 ? ['🥇', '🥈', '🥉'][r.rank - 1] : r.rank}</div>
                    <div style={{ flex: 1, fontWeight: r.isMe ? 800 : 600, color: INK, fontSize: 14 }}>{r.name}{r.isMe && <span style={{ color: BLUE, fontSize: 12 }}> (you)</span>}</div>
                    {typeof r.streak === 'number' && r.streak > 0 && <span style={{ fontSize: 12, color: '#ea580c', fontWeight: 700 }}>🔥{r.streak}</span>}
                    {typeof r.solved === 'number' && <span style={{ fontSize: 12, color: SUB }}>{r.solved} solved</span>}
                    <div style={{ fontWeight: 800, color: BLUE, fontSize: 14, minWidth: 70, textAlign: 'right' }}>{r.xp} XP</div>
                  </div>
                ))}
            {lb && lb.myRank && lb.myRank > lb.leaderboard.length && (
              <div style={{ padding: '11px 16px', borderTop: '1px solid #f1f5f9', background: '#eff6ff', fontSize: 13, color: SUB }}>Your rank: <b style={{ color: BLUE }}>#{lb.myRank}</b></div>
            )}
          </div>
        </div>
      )}

      {/* Analytics tab */}
      {tab === 'analytics' && (
        <div style={{ marginTop: 18 }}>
          {!analytics ? <div style={{ color: SUB, fontSize: 13 }}>Loading analytics…</div> : (
            <>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(120px,1fr))', gap: 12 }}>
                <Stat label="Accuracy" value={`${analytics.accuracy}%`} accent="#16a34a" />
                <Stat label="Solved" value={analytics.solvedTotal} accent={BLUE} />
                <Stat label="Thinking" value={analytics.avgThinking} accent="#7c3aed" />
                <Stat label="Coding" value={analytics.avgCoding} accent="#0ea5e9" />
                <Stat label="Communication" value={analytics.avgCommunication} accent="#d97706" />
                <Stat label="Avg time" value={`${Math.round(analytics.avgTimeSec / 60)}m`} accent="#ea580c" />
              </div>

              <div style={{ background: '#fff', border: '1px solid #e6e8f0', borderRadius: 16, padding: 20, marginTop: 16 }}>
                <SectionH>Activity heatmap (last 16 weeks)</SectionH>
                <Heatmap data={analytics.heatmap} />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0,1.4fr) minmax(0,1fr)', gap: 16, marginTop: 16 }}>
                <div style={{ background: '#fff', border: '1px solid #e6e8f0', borderRadius: 16, padding: 20 }}>
                  <SectionH>Performance by topic</SectionH>
                  {analytics.byCategory.length === 0 ? <div style={{ color: SUB, fontSize: 13 }}>No data yet.</div> : analytics.byCategory.map(c => (
                    <div key={c.category} style={{ marginBottom: 10 }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12.5, marginBottom: 3 }}><span style={{ color: '#475569', fontWeight: 600 }}>{c.category}</span><b style={{ color: c.rate >= 60 ? '#16a34a' : '#d97706' }}>{c.rate}% · {c.solved}/{c.total}</b></div>
                      <div style={{ height: 6, background: '#eef1f6', borderRadius: 6, overflow: 'hidden' }}><div style={{ width: `${c.rate}%`, height: '100%', background: c.rate >= 60 ? '#16a34a' : '#d97706' }} /></div>
                    </div>
                  ))}
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                  {analytics.strongTopics.length > 0 && <ListCard title="💪 Strong topics" items={analytics.strongTopics} color="#16a34a" />}
                  {analytics.weakTopics.length > 0 && <ListCard title="🎯 Focus areas" items={analytics.weakTopics} color="#d97706" />}
                </div>
              </div>
            </>
          )}
        </div>
      )}

      {celebration && <CelebrationModal result={celebration} onClose={() => setCelebration(null)} />}
    </div>
  );
};

// ── Simple GitHub-style contribution heatmap (last ~16 weeks) ────────────────
const Heatmap: React.FC<{ data: { date: string; count: number }[] }> = ({ data }) => {
  const map = new Map(data.map(d => [d.date, d.count]));
  const weeks = 16, days: { date: string; count: number }[] = [];
  const today = new Date();
  const start = new Date(today); start.setDate(start.getDate() - (weeks * 7 - 1));
  for (let i = 0; i < weeks * 7; i++) {
    const d = new Date(start); d.setDate(start.getDate() + i);
    const ds = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
    days.push({ date: ds, count: map.get(ds) || 0 });
  }
  const color = (c: number) => c === 0 ? '#eef1f6' : c === 1 ? '#bfdbfe' : c === 2 ? '#60a5fa' : c <= 4 ? '#2563eb' : '#1e40af';
  const cols: { date: string; count: number }[][] = [];
  for (let w = 0; w < weeks; w++) cols.push(days.slice(w * 7, w * 7 + 7));
  return (
    <div style={{ display: 'flex', gap: 3, overflowX: 'auto', paddingBottom: 4 }}>
      {cols.map((col, ci) => (
        <div key={ci} style={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
          {col.map(d => <span key={d.date} title={`${d.date}: ${d.count} solved`} style={{ width: 13, height: 13, borderRadius: 3, background: color(d.count) }} />)}
        </div>
      ))}
    </div>
  );
};

// ── Celebration modal with confetti ──────────────────────────────────────────
const CelebrationModal: React.FC<{ result: TLSubmitResult; onClose: () => void }> = ({ result, onClose }) => {
  const colors = ['#2563eb', '#7c3aed', '#16a34a', '#f59e0b', '#ef4444', '#0ea5e9'];
  const pieces = Array.from({ length: 44 });
  return (
    <div onClick={onClose} style={{ position: 'fixed', inset: 0, background: 'rgba(15,23,42,.55)', display: 'grid', placeItems: 'center', zIndex: 3000, overflow: 'hidden' }}>
      <style>{`@keyframes tl-fall{0%{transform:translateY(-60px) rotate(0);opacity:1}100%{transform:translateY(105vh) rotate(720deg);opacity:.9}}@keyframes tl-pop{0%{transform:scale(.7);opacity:0}60%{transform:scale(1.05)}100%{transform:scale(1);opacity:1}}`}</style>
      {pieces.map((_, i) => (
        <span key={i} style={{ position: 'fixed', top: -20, left: `${(i * 2.27) % 100}%`, width: 9, height: 14, background: colors[i % colors.length], borderRadius: 2, animation: `tl-fall ${2 + (i % 5) * 0.4}s linear ${(i % 7) * 0.12}s infinite` }} />
      ))}
      <div onClick={e => e.stopPropagation()} style={{ position: 'relative', background: '#fff', borderRadius: 20, padding: 28, width: 380, maxWidth: '90vw', textAlign: 'center', animation: 'tl-pop .35s ease-out', boxShadow: '0 20px 60px rgba(0,0,0,.3)' }}>
        <div style={{ fontSize: 46 }}>🎉</div>
        <div style={{ fontSize: 22, fontWeight: 900, color: INK }}>Challenge solved!</div>
        <div style={{ display: 'flex', justifyContent: 'center', gap: 12, marginTop: 14 }}>
          <div style={{ background: '#eff6ff', borderRadius: 12, padding: '10px 18px' }}><div style={{ fontSize: 22, fontWeight: 900, color: BLUE }}>+{result.xpEarned}</div><div style={{ fontSize: 11, color: SUB, fontWeight: 700 }}>XP</div></div>
          <div style={{ background: '#fffbeb', borderRadius: 12, padding: '10px 18px' }}><div style={{ fontSize: 22, fontWeight: 900, color: '#d97706' }}>+{result.coinsEarned}</div><div style={{ fontSize: 11, color: SUB, fontWeight: 700 }}>🪙 Coins</div></div>
        </div>
        {result.newBadges?.length > 0 && (
          <div style={{ marginTop: 16 }}>
            <div style={{ fontSize: 12.5, fontWeight: 800, color: '#7c3aed' }}>NEW BADGE{result.newBadges.length > 1 ? 'S' : ''} UNLOCKED!</div>
            <div style={{ display: 'flex', justifyContent: 'center', gap: 10, marginTop: 8, flexWrap: 'wrap' }}>
              {result.newBadges.map(b => (
                <div key={b.key} style={{ background: '#f5f3ff', border: '1px solid #ddd6fe', borderRadius: 12, padding: '8px 12px' }}>
                  <div style={{ fontSize: 26 }}>{b.icon}</div>
                  <div style={{ fontSize: 11, fontWeight: 800, color: INK }}>{b.name}</div>
                </div>
              ))}
            </div>
          </div>
        )}
        <button onClick={onClose} style={{ marginTop: 20, background: BLUE, color: '#fff', border: 'none', borderRadius: 10, padding: '11px 26px', fontWeight: 800, fontSize: 14, cursor: 'pointer' }}>Awesome!</button>
      </div>
    </div>
  );
};

// ── AI feedback panel ─────────────────────────────────────────────────────────
const Feedback: React.FC<{ result: TLSubmitResult; onNext: () => void }> = ({ result, onNext }) => {
  const f = result.feedback || {};
  const bars: [string, number | undefined][] = [
    ['Logical thinking', f.logicalThinking], ['Problem understanding', f.problemUnderstanding], ['Approach', f.approach],
    ['Optimization', f.optimization], ['Edge cases', f.edgeCases], ['Coding style', f.codingStyle],
    ['Communication', f.communication], ['Overall', f.overall],
  ];
  const barColor = (n: number) => (n >= 75 ? '#16a34a' : n >= 50 ? '#d97706' : '#dc2626');
  return (
    <div style={{ marginTop: 16 }}>
      {/* Result banner */}
      <div style={{ background: result.allPassed ? 'linear-gradient(120deg,#2563eb,#7c3aed)' : '#fff7ed', color: result.allPassed ? '#fff' : '#9a3412', border: result.allPassed ? 'none' : '1px solid #fed7aa', borderRadius: 16, padding: 20, textAlign: 'center' }}>
        <div style={{ fontSize: 30 }}>{result.allPassed ? '🎉' : '💪'}</div>
        <div style={{ fontSize: 19, fontWeight: 800 }}>{result.allPassed ? `Solved! +${result.xpEarned} XP` : 'Submitted — keep going'}</div>
        {f.summary && <div style={{ fontSize: 13.5, opacity: .95, marginTop: 4, maxWidth: 620, marginLeft: 'auto', marginRight: 'auto' }}>{f.summary}</div>}
        <button onClick={onNext} style={{ marginTop: 14, background: '#fff', color: BLUE, border: 'none', borderRadius: 10, padding: '10px 22px', fontWeight: 800, cursor: 'pointer' }}>Next challenge →</button>
      </div>

      {/* Rubric */}
      <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0,1fr) minmax(0,1fr)', gap: 16, marginTop: 16 }}>
        <div style={{ background: '#fff', border: '1px solid #e6e8f0', borderRadius: 16, padding: 18 }}>
          <SectionH>AI evaluation</SectionH>
          {bars.filter(([, v]) => typeof v === 'number').map(([label, v]) => (
            <div key={label} style={{ marginBottom: 9 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12.5, marginBottom: 3 }}><span style={{ color: '#475569', fontWeight: 600 }}>{label}</span><b style={{ color: barColor(v!) }}>{v}</b></div>
              <div style={{ height: 7, background: '#eef1f6', borderRadius: 6, overflow: 'hidden' }}><div style={{ width: `${v}%`, height: '100%', background: barColor(v!) }} /></div>
            </div>
          ))}
          {(f.timeComplexity || f.spaceComplexity) && (
            <div style={{ display: 'flex', gap: 10, marginTop: 10 }}>
              {f.timeComplexity && <span style={cxChip}>⏱ Time: {f.timeComplexity}</span>}
              {f.spaceComplexity && <span style={cxChip}>💾 Space: {f.spaceComplexity}</span>}
            </div>
          )}
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          {!!(f.strengths?.length) && <ListCard title="✅ Strengths" items={f.strengths!} color="#16a34a" />}
          {!!(f.weaknesses?.length) && <ListCard title="⚠️ To improve" items={f.weaknesses!} color="#d97706" />}
          {!!(f.commonMistakes?.length) && <ListCard title="🚫 Common mistakes" items={f.commonMistakes!} color="#dc2626" />}
        </div>
      </div>

      {(f.improvedSolution || f.alternativeSolution) && (
        <div style={{ background: '#fff', border: '1px solid #e6e8f0', borderRadius: 16, padding: 18, marginTop: 16 }}>
          {f.improvedSolution && <><SectionH>A better solution</SectionH><pre style={{ ...pre, color: '#334155', background: '#f8fafc', padding: 12, borderRadius: 8 }}>{f.improvedSolution}</pre></>}
          {f.alternativeSolution && <div style={{ marginTop: 10, fontSize: 13, color: SUB }}><b>Alternative approach:</b> {f.alternativeSolution}</div>}
          {!!(f.relatedQuestions?.length) && <div style={{ marginTop: 10, fontSize: 13, color: SUB }}><b>Practice next:</b> {f.relatedQuestions!.join(' · ')}</div>}
        </div>
      )}
    </div>
  );
};

const Stat: React.FC<{ label: string; value: any; accent: string }> = ({ label, value, accent }) => (
  <div style={{ background: '#fff', border: '1px solid #e6e8f0', borderRadius: 12, padding: '8px 14px', minWidth: 78, textAlign: 'center' }}>
    <div style={{ fontSize: 18, fontWeight: 800, color: accent }}>{value}</div>
    <div style={{ fontSize: 10.5, color: SUB, fontWeight: 600 }}>{label}</div>
  </div>
);
const ListCard: React.FC<{ title: string; items: string[]; color: string }> = ({ title, items, color }) => (
  <div style={{ background: '#fff', border: '1px solid #e6e8f0', borderRadius: 14, padding: 14 }}>
    <div style={{ fontSize: 12.5, fontWeight: 800, color, marginBottom: 6 }}>{title}</div>
    <ul style={{ margin: 0, paddingLeft: 18 }}>{items.map((it, i) => <li key={i} style={{ fontSize: 12.5, color: '#475569', marginBottom: 3, lineHeight: 1.45 }}>{it}</li>)}</ul>
  </div>
);
const SectionH: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <div style={{ fontSize: 13, fontWeight: 800, color: INK, marginBottom: 8 }}>{children}</div>
);

const btn = (bg: string): React.CSSProperties => ({ background: bg, color: '#fff', border: 'none', borderRadius: 10, padding: '10px 16px', fontWeight: 700, fontSize: 13.5, cursor: 'pointer' });
const pre: React.CSSProperties = { margin: 0, fontFamily: 'ui-monospace,monospace', fontSize: 12.5, color: '#334155', whiteSpace: 'pre-wrap' };
const miniH: React.CSSProperties = { fontSize: 10.5, color: '#94a3b8', fontWeight: 700, marginBottom: 3 };
const cxChip: React.CSSProperties = { fontSize: 12, fontWeight: 700, color: '#334155', background: '#f1f5f9', borderRadius: 8, padding: '4px 10px' };

export default ThinkingLab;
