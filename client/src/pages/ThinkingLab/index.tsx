import React, { createContext, useCallback, useContext, useEffect, useRef, useState } from 'react';
import Editor from '@monaco-editor/react';
import { thinkingLabApi, TLChallenge, TLStats, TLRunResult, TLSubmitResult, TLBadge, TLLeaderRow, TLVoiceEval, TLProfile, TLAnalytics, TLExplanation, TL_LANGS, DIFF_COLORS, TL_TEMPLATES } from '../../api/thinkingLabApi';
import { toast } from '../../components/feedback/appFeedback';
import '../Passport/interviewDashboard.css';
import './thinkingLab.css';
import { barWidth } from '../../utils/barWidth';

/*
 * One page, two homes. The LMS mounts it inside its Layout with the colours it always had;
 * CareerPilot mounts it inside the member shell, where it must read as CodeBegun — navy and
 * teal, never purple — and where the shell renders at zoom .75, so every font size is scaled
 * up to stay legible (the `scale` below).
 */
type Variant = 'lms' | 'careerpilot';
interface Theme {
  primary: string; primarySoft: string; primaryBorder: string;
  accent: string; accentSoft: string; accentBorder: string; accentInk: string;
  run: string; ink: string; sub: string; faint: string; border: string; line: string; field: string; surface: string;
  success: string; successSoft: string; successBorder: string; warn: string; warnSoft: string; warnBorder: string; warnInk: string;
  danger: string; dangerSoft: string; banner: string; heat: string[]; diff: Record<string, string>; scale: number;
}
const THEMES: Record<Variant, Theme> = {
  lms: {
    primary: '#2563eb', primarySoft: '#eff6ff', primaryBorder: '#bfdbfe',
    accent: '#7c3aed', accentSoft: '#f5f3ff', accentBorder: '#ddd6fe', accentInk: '#4c1d95',
    run: '#0ea5e9', ink: '#0f172a', sub: '#64748b', faint: '#94a3b8', border: '#e6e8f0', line: '#eef1f6', field: '#cbd5e1', surface: '#f8fafc',
    success: '#16a34a', successSoft: '#f0fdf4', successBorder: '#bbf7d0', warn: '#d97706', warnSoft: '#fffbeb', warnBorder: '#fde68a', warnInk: '#92400e',
    danger: '#dc2626', dangerSoft: '#fef2f2', banner: 'linear-gradient(120deg,#2563eb,#7c3aed)',
    heat: ['#eef1f6', '#bfdbfe', '#60a5fa', '#2563eb', '#1e40af'], diff: DIFF_COLORS, scale: 1,
  },
  careerpilot: {
    primary: '#051D64', primarySoft: '#EEF3FB', primaryBorder: '#C9D8E5',
    accent: '#1F7A8C', accentSoft: '#EAF6F8', accentBorder: '#B9E3EA', accentInk: '#15596A',
    run: '#1F7A8C', ink: '#102A4F', sub: '#2F3F56', faint: '#3F4F66', border: '#E2EAF2', line: '#E2EAF2', field: '#C9D8E5', surface: '#F4F8FC',
    success: '#17885D', successSoft: '#EAF8F1', successBorder: '#BFE6D3', warn: '#B86B00', warnSoft: '#FFF7E8', warnBorder: '#F3D9A6', warnInk: '#8A5000',
    danger: '#C93737', dangerSoft: '#FFF0F0', banner: 'linear-gradient(120deg,#051D64,#0B2D72)',
    heat: ['#E2EAF2', '#BFE6EC', '#7FD3E0', '#359AAD', '#051D64'],
    diff: { easy: '#17885D', medium: '#B86B00', hard: '#C93737', expert: '#051D64', interview: '#1F7A8C' }, scale: 1.15,
  },
};
const ThemeCtx = createContext<Theme>(THEMES.lms);
const useT = () => useContext(ThemeCtx);
const fz = (t: Theme, n: number) => Math.round(n * t.scale * 10) / 10;

/**
 * One constraint per line. AI-generated problems answer with a list, and the server used to store it
 * through String(list), which joins with bare commas: "1 <= N <= 10^5,Array elements range…". Newer
 * rows keep one per line; this also splits those older rows — only at a comma with no space after it
 * that starts a new sentence or a new bound ("…10^5,Array", "…N,1 <= K"), so "1, 2" or "1,000" stay whole.
 */
const constraintLines = (c: unknown): string[] => {
  const parts = Array.isArray(c) ? c.map(x => String(x)) : String(c ?? '').split(/\r?\n/);
  return parts
    .flatMap(line => line.split(/,(?=[A-Z]|-?\d+(?:\^\d+)?\s*(?:<=?|\u2264))/))
    .map(x => x.trim())
    .filter(Boolean);
};
const fmtTime = (s: number) => `${String(Math.floor(s / 60)).padStart(2, '0')}:${String(s % 60).padStart(2, '0')}`;

const ThinkingLab: React.FC<{ variant?: Variant }> = ({ variant = 'lms' }) => {
  const t = THEMES[variant];
  const cp = variant === 'careerpilot';
  const [challenge, setChallenge] = useState<TLChallenge | null>(null);
  const [memberPos, setMemberPos] = useState<{ position: number; total: number } | null>(null);
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
  /**
   * CareerPilot opens on an overview of today's problem; the problem itself (and its timer) opens
   * only when the member chooses "Start solving". The LMS keeps opening straight on the problem.
   */
  const [open, setOpen] = useState(!cp);

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
  const member = cp || !!stats?.member;

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
      setMemberPos(r.member || null);
      if (r.empty || !r.challenge) { setEmpty(r.message || 'No challenge available yet.'); setChallenge(null); }
      else hydrate(r.challenge);
    } catch (e: any) { setErr(e?.response?.data?.message || 'Failed to load your challenge.'); }
    finally { setLoading(false); }
  }, [hydrate]);

  useEffect(() => { load(); }, [load]);

  // Timer runs while an unsolved challenge is open — in CareerPilot, only while its problem screen is on view.
  const timing = !!challenge && !done && open && (!cp || tab === 'challenge');
  useEffect(() => {
    if (timing) {
      timerRef.current = setInterval(() => setSeconds(s => s + 1), 1000);
      return () => clearInterval(timerRef.current);
    }
  }, [timing]);

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
    try { const r = await thinkingLabApi.revealHint(challenge.challengeId); setHints(h => [...h, r.hint]); setChallenge(c => c ? { ...c, hintsUsed: r.hintsUsed } : c); }
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
        stream.getTracks().forEach(tr => tr.stop());
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

  /*
   * The tests are stdin/stdout, so any language works. Switching language swaps in that
   * language's input-reading template — but only while the editor still holds an untouched
   * template, so nobody loses code they wrote.
   */
  const templateFor = (lang: string) => {
    const p = challenge?.problem;
    if (p?.starterCode && (p.language || 'javascript') === lang) return p.starterCode;
    return TL_TEMPLATES[lang] || '';
  };
  const changeLanguage = (next: string) => {
    const untouched = !code.trim() || code === templateFor(language) || Object.values(TL_TEMPLATES).includes(code);
    setLanguage(next);
    if (untouched) setCode(templateFor(next));
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
    try {
      const r = await thinkingLabApi.next();
      if (r.empty || !r.challenge) {
        // A member keeps today's solved problem on screen and is told when the next one comes.
        if (member) toast(r.message || 'Your next problem unlocks tomorrow.', 'info');
        else setEmpty('No more challenges right now — come back tomorrow!');
      } else { hydrate(r.challenge); setSubmitResult(null); if (cp) setOpen(false); }
    }
    catch (e: any) { setErr(e?.response?.data?.message || 'Failed.'); }
    finally { setLoading(false); }
  };

  if (loading) return <div style={{ padding: 40, color: t.sub, fontSize: fz(t, 14) }}>Loading your challenge…</div>;

  const p = challenge?.problem;
  const started = !!challenge && !done && (seconds > 0 || challenge.attempts > 0 || !!challenge.approach?.trim());
  /* The problem set's size and how much of it is solved, for the banner's ring and bar. */
  const setTotal = memberPos?.total || 0;
  const setPct = setTotal ? Math.min(100, Math.round(((stats?.solvedTotal || 0) / setTotal) * 100)) : 0;
  /* Where today's problem stands, in the lab's own four steps. */
  const stepDone = [unlocked || done, (challenge?.attempts || 0) > 0 || done, done, journalSaved];
  const firstOpen = stepDone.findIndex(x => !x);
  const stepMarks = ['Think', 'Code', 'Submit', 'Reflect'].map((label, i) => ({
    key: label, label, state: stepDone[i] ? 'done' : i === firstOpen ? 'current' : '',
  }));
  const diffColor = p ? (t.diff[p.difficulty] || t.primary) : t.primary;
  const card: React.CSSProperties = { background: '#fff', border: `1px solid ${t.border}`, borderRadius: 16, padding: 20 };
  const btn = (bg: string, fg = '#fff'): React.CSSProperties => ({ background: bg, color: fg, border: 'none', borderRadius: 10, padding: '10px 16px', fontWeight: 700, fontSize: fz(t, 13.5), cursor: 'pointer' });
  const pre: React.CSSProperties = { margin: 0, fontFamily: 'ui-monospace,monospace', fontSize: fz(t, 12.5), color: '#334155', whiteSpace: 'pre-wrap' };
  const miniH: React.CSSProperties = { fontSize: fz(t, 10.5), color: t.faint, fontWeight: 700, marginBottom: 3, textTransform: 'uppercase', letterSpacing: '.03em' };
  const cxChip: React.CSSProperties = { fontSize: fz(t, 12), fontWeight: 700, color: '#334155', background: t.surface, border: `1px solid ${t.line}`, borderRadius: 8, padding: '4px 10px' };
  const scopes: [string, string][] = member
    ? [['overall', 'Overall'], ['weekly', 'This Week'], ['monthly', 'This Month']]
    : [['overall', 'Overall'], ['weekly', 'This Week'], ['monthly', 'This Month'], ['batch', 'My Batch']];

  return (
    <ThemeCtx.Provider value={t}>
    <div className={`tl-root tl-${variant}`}>
      {/* Header — CareerPilot uses the member pages' banner (the Mock Interview one, same classes), the LMS keeps its own. */}
      {cp ? (
        <div className="cp-iv-page iv2 tl-hero-wrap">
          <section className="iv2-hero">
            <div className="iv2-hero-copy">
              <span className="iv2-eyebrow">Think first, then code</span>
              <h1>Thinking <span>Lab</span></h1>
              <p>One new problem every day. Explain your approach, code it in any language, and get AI feedback on how you think.</p>
              <div className="iv2-chips">
                <span><i className="bi bi-lightbulb" /> Think before you code</span>
                <span><i className="bi bi-code-slash" /> Any language</span>
                <span><i className="bi bi-stars" /> AI feedback</span>
              </div>
              <div className="iv2-actions">
                {p && (
                  <button className="iv2-btn light" onClick={() => { setTab('challenge'); setOpen(true); }}>
                    <i className="bi bi-play-fill" /> {done ? 'Review today’s solution' : started ? 'Continue solving' : 'Start today’s problem'}
                  </button>
                )}
                <button className="iv2-btn ghost" onClick={() => setTab('progress')}><i className="bi bi-graph-up-arrow" /> My progress</button>
              </div>
            </div>
            {/* The member's own lab: problems solved, where today's problem stands, and today's problem itself. */}
            <div className="iv2-momentum">
              <span className="iv2-eyebrow">Your lab</span>
              <div className={`iv2-strip${(stats?.solvedTotal || 0) > 0 ? ' on' : ''}`}>
                <span className="ic"><i className="bi bi-lightbulb-fill" aria-hidden="true" /></span>
                <div>
                  <b>{stats?.solvedTotal ?? 0} problem{stats?.solvedTotal === 1 ? '' : 's'} solved</b>
                  <span>{(stats?.streak || 0) > 0
                    ? `${stats!.streak}-day lab streak · ${stats!.xpTotal} lab XP`
                    : `${stats?.xpTotal ?? 0} lab XP · solve today’s problem to start a streak`}</span>
                  {setTotal > 0 && <i className="iv2-strip-bar" aria-hidden="true"><em style={{ width: `${barWidth(setPct)}%` }} /></i>}
                </div>
              </div>
              {challenge && (
                <ol className="iv2-steps2">
                  {stepMarks.map(m => <li key={m.key} className={m.state}><i /><span>{m.label}</span></li>)}
                </ol>
              )}
              {p && (
                <button type="button" className="iv2-next" onClick={() => { setTab('challenge'); setOpen(true); }}>
                  <span className="ic"><i className={`bi ${done ? 'bi-check-lg' : 'bi-play-fill'}`} aria-hidden="true" /></span>
                  <div>
                    <b>Today’s problem</b>
                    <span>{p.title}</span>
                    <em>{p.difficulty ? p.difficulty.charAt(0).toUpperCase() + p.difficulty.slice(1) : ''} · {p.xp} XP{p.estimatedMinutes ? ` · ~${p.estimatedMinutes} min` : ''}</em>
                  </div>
                  <i className="bi bi-chevron-right" aria-hidden="true" />
                </button>
              )}
            </div>
            <div className="iv2-score">
              <div className="iv2-ring" style={{ ['--iv2-deg' as any]: `${setPct * 3.6}deg` }}>
                <div><strong>{stats?.solvedTotal ?? 0}</strong>{setTotal > 0 && <span>/{setTotal}</span>}</div>
              </div>
              <div className="iv2-score-copy">
                <small>Problem set</small>
                <b>{memberPos && memberPos.position > 0 ? `Problem ${memberPos.position} of ${memberPos.total}` : 'Your problems'}</b>
                <span>{stats?.badgeCount ?? 0} badge{stats?.badgeCount === 1 ? '' : 's'} · best streak {stats?.longestStreak ?? 0}d</span>
              </div>
            </div>
          </section>
        </div>
      ) : (
        <>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 12 }}>
        <div style={{ minWidth: 0 }}>
          <h1 style={{ margin: 0, fontSize: fz(t, 26), color: t.ink, fontWeight: 800 }}>Thinking Lab</h1>
          <p style={{ margin: '4px 0 0', color: t.sub, fontSize: fz(t, 13.5) }}>
            {member
              ? 'One new problem every day — think first, then code. 30 interview-style problems, from hashing to system design.'
              : 'Your daily brain gym — think first, then code. One challenge a day builds real problem-solving.'}
          </p>
        </div>
        {/* In CareerPilot the shell's bar already shows the member's XP, level, coins and
            streak. Lab-only figures are labelled as such, and lab coins (which do not reach
            the CareerPilot wallet) are not shown, so the page never contradicts the bar. */}
        {stats && cp && (
          <div className="tl-stats">
            <Stat label="Lab XP" value={stats.xpTotal} accent={t.primary} />
            <Stat label="Solved" value={stats.solvedTotal} accent={t.success} />
            <Stat label="🔥 Lab streak" value={`${stats.streak}d`} accent={t.danger} />
            <Stat label="🏅 Badges" value={stats.badgeCount} accent={t.accent} />
          </div>
        )}
        {stats && !cp && (
          <div className="tl-stats">
            <Stat label="XP" value={stats.xpTotal} accent={t.primary} />
            <Stat label="Level" value={stats.level} accent={t.accent} />
            <Stat label="🪙 Coins" value={stats.coins} accent={t.warn} />
            <Stat label="🔥 Streak" value={`${stats.streak}d`} accent={cp ? t.danger : '#ea580c'} />
            <Stat label="🏅 Badges" value={stats.badgeCount} accent={t.success} />
          </div>
        )}
      </div>
        </>
      )}

      {/* Tabs */}
      {cp ? (
        <nav className="tl-cp-tabs" role="tablist" aria-label="Thinking Lab">
          {([['challenge', 'Today’s Challenge'], ['progress', 'My Progress'], ['analytics', 'Analytics'], ['leaderboard', 'Leaderboard']] as [any, string][]).map(([k, l]) => (
            <button key={k} role="tab" aria-selected={tab === k} className={tab === k ? 'on' : ''} onClick={() => setTab(k)}>{l}</button>
          ))}
        </nav>
      ) : (
      <div className="tl-tabs" role="tablist" style={{ marginTop: 16, borderBottom: `1px solid ${t.border}` }}>
        {([['challenge', "Today's Challenge"], ['progress', 'My Progress'], ['analytics', 'Analytics'], ['leaderboard', 'Leaderboard']] as [any, string][]).map(([k, l]) => (
          <button key={k} role="tab" aria-selected={tab === k} onClick={() => setTab(k)} style={{ background: 'none', border: 'none', borderBottom: `2.5px solid ${tab === k ? t.primary : 'transparent'}`, color: tab === k ? t.primary : t.sub, fontWeight: 700, fontSize: fz(t, 14), padding: '10px 14px', cursor: 'pointer' }}>{l}</button>
        ))}
      </div>
      )}

      {tab === 'challenge' && empty && (
        <div style={{ marginTop: 20, background: '#fff', border: `1px dashed ${t.field}`, borderRadius: 16, padding: 40, textAlign: 'center' }}>
          <div style={{ fontSize: 34 }}>🧠</div>
          <div style={{ fontSize: fz(t, 16), fontWeight: 700, color: t.ink, marginTop: 8 }}>{empty}</div>
        </div>
      )}
      {tab === 'challenge' && !p && !empty && err && (
        <div style={{ background: t.dangerSoft, color: t.danger, borderRadius: 8, padding: '10px 12px', fontSize: fz(t, 13), marginTop: 16 }}>{err}</div>
      )}

      {tab === 'challenge' && p && challenge && !open && (
        <ChallengeOverview
          challenge={challenge} position={memberPos} seconds={seconds} done={done} minWords={minWords}
          onOpen={() => setOpen(true)}
        />
      )}

      {tab === 'challenge' && p && challenge && open && (
        <>
          {cp && (
            <button type="button" className="tl-back" onClick={() => setOpen(false)}>
              <i className="bi bi-arrow-left" aria-hidden /> Back to Thinking Lab{!done && <span> · the timer pauses</span>}
            </button>
          )}
          {/* Challenge top bar */}
          <div style={{ ...card, marginTop: 18, padding: '16px 18px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 12 }}>
            <div style={{ minWidth: 0 }}>
              <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
                {memberPos && memberPos.position > 0 && (
                  <span style={{ fontSize: fz(t, 11.5), fontWeight: 800, color: t.primary, background: t.primarySoft, border: `1px solid ${t.primaryBorder}`, borderRadius: 999, padding: '3px 10px' }}>Problem {memberPos.position} of {memberPos.total}</span>
                )}
                <span style={{ fontSize: fz(t, 11), fontWeight: 800, color: '#fff', background: diffColor, borderRadius: 999, padding: '3px 10px', textTransform: 'capitalize' }}>{p.difficulty}</span>
                <span style={{ fontSize: fz(t, 11.5), fontWeight: 700, color: cp ? t.accentInk : t.primary, background: cp ? t.accentSoft : t.primarySoft, borderRadius: 999, padding: '3px 10px' }}>{p.category}</span>
                <span style={{ fontSize: fz(t, 12), color: t.sub }}>⚡ {p.xp} XP</span>
                {p.estimatedMinutes && <span style={{ fontSize: fz(t, 12), color: t.sub }}>· ~{p.estimatedMinutes} min</span>}
              </div>
              <h2 style={{ margin: '8px 0 0', fontSize: fz(t, 19), color: t.ink, fontWeight: 700 }}>{p.title}</h2>
            </div>
            <div style={{ textAlign: 'right' }}>
              <div style={{ fontFamily: 'ui-monospace,monospace', fontSize: fz(t, 22), fontWeight: 800, color: t.ink }}>{fmtTime(seconds)}</div>
              <div style={{ fontSize: fz(t, 11.5), color: t.sub }}>Attempt {challenge.attempts + (done ? 0 : 1)} · {challenge.hintsUsed} hints used</div>
            </div>
          </div>

          {/* Problem + Thinking */}
          <div className="tl-split" style={{ marginTop: 16 }}>
            {/* Left: problem */}
            <div style={card}>
              <SectionH>Problem</SectionH>
              <div className="tl-statement" style={{ fontSize: fz(t, 14.5), color: t.ink, lineHeight: 1.6, whiteSpace: 'pre-wrap', overflowWrap: 'anywhere' }}>{p.statement}</div>
              {p.imageUrl && <img src={p.imageUrl} alt="problem" style={{ maxWidth: '100%', borderRadius: 10, marginTop: 12, border: `1px solid ${t.line}` }} />}
              {p.examples?.length > 0 && (
                <div style={{ marginTop: 14 }}>
                  <SectionH>Examples</SectionH>
                  {p.examples.map((ex, i) => (
                    <div key={i} className="tl-example" style={{ background: t.surface, border: `1px solid ${t.line}`, borderRadius: 10, padding: 10, marginBottom: 8 }}>
                      <div style={{ minWidth: 0 }}><div style={miniH}>Input</div><pre style={pre}>{ex.input || '(none)'}</pre></div>
                      <div style={{ minWidth: 0 }}><div style={miniH}>Output</div><pre style={pre}>{ex.expectedOutput}</pre></div>
                      {ex.explanation && <div style={{ gridColumn: '1 / -1', fontSize: fz(t, 12.5), color: t.sub }}>{ex.explanation}</div>}
                    </div>
                  ))}
                </div>
              )}
              {p.constraints && <div style={{ marginTop: 12 }}><SectionH>Constraints</SectionH><ul className="tl-constraints" style={{ ...pre, color: '#475569', listStyle: 'none', padding: 0 }}>{constraintLines(p.constraints).map((c, i) => <li key={i} style={{ margin: '0 0 3px' }}>{c}</li>)}</ul></div>}
              {p.notes && <div style={{ marginTop: 12, fontSize: fz(t, 13), color: t.sub }}>{p.notes}</div>}
            </div>

            {/* Right: thinking notes (the gate) */}
            <div style={card}>
              <SectionH>🧠 Think first — how will you solve this?</SectionH>
              <p style={{ fontSize: fz(t, 12.5), color: t.sub, margin: '2px 0 10px' }}>Explain your approach in plain English (min {minWords} words). The code editor unlocks only after you've thought it through — this is how real problem-solving is built.</p>
              <textarea aria-label="Your approach" value={approach} onChange={e => setApproach(e.target.value)} disabled={done}
                placeholder={'e.g. First I will read the input... then I will loop through... to check... and finally I will print...'}
                style={{ width: '100%', minHeight: 150, border: `1px solid ${unlocked ? t.successBorder : t.field}`, borderRadius: 12, padding: 12, fontSize: fz(t, 13.5), fontFamily: 'inherit', boxSizing: 'border-box', lineHeight: 1.5, color: t.ink }} />
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 8, gap: 10, flexWrap: 'wrap' }}>
                <span className="tl-wordcount" style={{ fontSize: fz(t, 12.5), fontWeight: 700, color: wc >= minWords ? t.success : t.sub }}>{wc}/{minWords} words {wc >= minWords ? '✓' : ''}</span>
                {!unlocked && !done && (
                  <button className="tl-unlock" onClick={checkApproach} disabled={savingApproach || wc < minWords} style={{ ...btn(wc >= minWords ? t.primary : t.field), cursor: wc >= minWords ? 'pointer' : 'not-allowed' }}>
                    {savingApproach ? 'Checking…' : '🔓 Unlock code editor'}
                  </button>
                )}
                {unlocked && !done && <span style={{ fontSize: fz(t, 12.5), color: t.success, fontWeight: 700 }}>✓ Editor unlocked</span>}
              </div>

              {/* Hints */}
              {unlocked && !done && (
                <div style={{ marginTop: 14 }}>
                  {hints.map((h, i) => (
                    <div key={i} style={{ background: t.warnSoft, border: `1px solid ${t.warnBorder}`, color: t.warnInk, borderRadius: 8, padding: '8px 11px', fontSize: fz(t, 12.5), marginBottom: 6 }}>💡 Hint {i + 1}: {h}</div>
                  ))}
                  {hints.length < (p.totalHints || 0) && (
                    <button onClick={revealHint} style={{ background: 'none', border: `1px dashed ${t.warn}`, color: t.warnInk, borderRadius: 8, padding: '6px 12px', fontSize: fz(t, 12.5), fontWeight: 600, cursor: 'pointer' }}>
                      Need a hint? ({hints.length}/{p.totalHints}) — costs some XP
                    </button>
                  )}
                </div>
              )}

              {/* Voice — Explain to AI (optional, +30 XP) */}
              <div style={{ marginTop: 16, borderTop: `1px dashed ${t.border}`, paddingTop: 14 }}>
                <div style={{ fontSize: fz(t, 12.5), fontWeight: 800, color: t.accent }}>🎤 Explain your logic out loud <span style={{ color: t.sub, fontWeight: 500 }}>(optional · +30 XP)</span></div>
                <p style={{ fontSize: fz(t, 12), color: t.sub, margin: '2px 0 8px' }}>Speak your approach — the AI coaches your confidence, clarity and communication. Great interview practice.</p>
                {!voiceEval && (
                  <div style={{ display: 'flex', gap: 10, alignItems: 'center', flexWrap: 'wrap' }}>
                    {!recording
                      ? <button onClick={startRec} disabled={voiceBusy} style={{ ...btn(t.accent), padding: '8px 14px' }}>{voiceBusy ? 'Evaluating…' : '● Record explanation'}</button>
                      : <button onClick={stopRec} style={{ ...btn(t.danger), padding: '8px 14px' }}>■ Stop &amp; evaluate</button>}
                    {recording && <span style={{ fontSize: fz(t, 12.5), color: t.danger, fontWeight: 700 }}>● Recording… speak now</span>}
                  </div>
                )}
                {voiceEval && (
                  <div style={{ background: t.accentSoft, border: `1px solid ${t.accentBorder}`, borderRadius: 10, padding: 12 }}>
                    <div style={{ fontSize: fz(t, 13), fontWeight: 800, color: t.accentInk }}>Voice score: {voiceEval.overall}/100</div>
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, margin: '8px 0' }}>
                      {([['Confidence', voiceEval.confidence], ['Communication', voiceEval.communication], ['Logic', voiceEval.logic], ['Flow', voiceEval.flow], ['Grammar', voiceEval.grammar], ['Professionalism', voiceEval.professionalism], ['Tech vocab', voiceEval.technicalVocabulary]] as [string, number][]).map(([l, v]) => (
                        <span key={l} style={{ fontSize: fz(t, 11), fontWeight: 700, background: '#fff', border: `1px solid ${t.accentBorder}`, borderRadius: 6, padding: '2px 8px', color: t.accentInk }}>{l} {v}</span>
                      ))}
                    </div>
                    <div style={{ fontSize: fz(t, 12.5), color: '#475569' }}>{voiceEval.summary}</div>
                    {voiceEval.tips?.length > 0 && <ul style={{ margin: '6px 0 0', paddingLeft: 18 }}>{voiceEval.tips.map((tip, i) => <li key={i} style={{ fontSize: fz(t, 12), color: t.sub }}>{tip}</li>)}</ul>}
                    {!done && <button onClick={() => setVoiceEval(null)} style={{ marginTop: 8, background: 'none', border: 'none', color: t.accent, fontSize: fz(t, 12), cursor: 'pointer' }}>↻ Try again</button>}
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Editor */}
          {unlocked && (
            <div className="tl-editor" style={{ ...card, marginTop: 16, padding: 16, opacity: done ? 0.85 : 1 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10, gap: 10, flexWrap: 'wrap' }}>
                <SectionH>Code your solution</SectionH>
                <select aria-label="Language" value={language} onChange={e => changeLanguage(e.target.value)} disabled={done} style={{ border: `1px solid ${t.field}`, borderRadius: 8, padding: '7px 10px', fontSize: fz(t, 13), color: t.ink, background: '#fff' }}>
                  {TL_LANGS.map(l => <option key={l.v} value={l.v}>{l.l}</option>)}
                </select>
              </div>
              {cp && <div style={{ fontSize: fz(t, 12), color: t.sub, margin: '-4px 0 8px' }}>Read the input from standard input and print the answer — any language works.</div>}
              <div style={{ border: `1px solid ${t.border}`, borderRadius: 10, overflow: 'hidden' }}>
                <Editor height="320px" theme="light" language={language === 'cpp' ? 'cpp' : language} value={code} onChange={v => setCode(v ?? '')} options={{ minimap: { enabled: false }, fontSize: 14, scrollBeyondLastLine: false, tabSize: 2, readOnly: done }} />
              </div>
              {!done && (
                <div className="tl-actions" style={{ marginTop: 12 }}>
                  <button className="tl-run" onClick={runCode} disabled={running} style={btn(t.run)}>{running ? '⏳ Running…' : '▶ Run'}</button>
                  <button onClick={() => setCode(templateFor(language))} style={btn(t.surface, '#475569')}>↺ Reset</button>
                  <button className="tl-submit" onClick={submit} disabled={submitting} style={btn(t.success)}>{submitting ? 'Evaluating…' : '✓ Submit for evaluation'}</button>
                </div>
              )}
              {runResult && !done && (
                <div className="tl-run-result" style={{ marginTop: 12 }}>
                  {runResult.compileError && <pre style={{ background: t.dangerSoft, color: t.danger, borderRadius: 8, padding: 10, fontSize: fz(t, 12), whiteSpace: 'pre-wrap' }}>{runResult.compileError.slice(0, 400)}</pre>}
                  <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                    {runResult.results.map(r => <span key={r.index} style={{ fontSize: fz(t, 11.5), fontWeight: 700, borderRadius: 6, padding: '3px 9px', background: r.passed ? t.successSoft : t.dangerSoft, color: r.passed ? t.success : t.danger }}>{r.passed ? '✓' : '✕'} {r.hidden ? 'Hidden' : 'Test'} {r.index + 1}</span>)}
                  </div>
                  <div style={{ fontSize: fz(t, 12.5), color: t.sub, marginTop: 6 }}>{runResult.passedCount}/{runResult.total} passing — Submit when ready for full AI feedback.</div>
                </div>
              )}
            </div>
          )}

          {err && <div role="alert" style={{ background: t.dangerSoft, color: t.danger, borderRadius: 8, padding: '10px 12px', fontSize: fz(t, 13), marginTop: 12 }}>{err}</div>}

          {/* AI feedback */}
          {submitResult && <Feedback result={submitResult} onNext={nextChallenge} nextLabel={member ? 'What’s next →' : 'Next challenge →'} />}

          {/* Thinking Journal — mandatory reflection after solving */}
          {done && (
            <div style={{ ...card, marginTop: 16 }}>
              <SectionH>📓 Thinking Journal <span style={{ color: t.sub, fontWeight: 500, fontSize: fz(t, 12) }}>(+15 XP · builds your Thinking Profile)</span></SectionH>
              {journalSaved ? (
                <div style={{ background: t.successSoft, border: `1px solid ${t.successBorder}`, color: t.success, borderRadius: 10, padding: 12, fontSize: fz(t, 13) }}>✓ Journal saved. Your Thinking Profile updates as you reflect on more problems — see the <b>My Progress</b> tab.</div>
              ) : (
                <div style={{ display: 'grid', gap: 10 }}>
                  {([['firstThought', 'What was your first thought when you read the problem?'], ['gotStuck', 'Where did you get stuck (if anywhere)?'], ['learned', 'What did you learn from this one?']] as [keyof typeof journal, string][]).map(([k, q]) => (
                    <label key={k}><span style={{ fontSize: fz(t, 12.5), fontWeight: 600, color: '#475569', display: 'block', marginBottom: 4 }}>{q}</span>
                      <textarea value={journal[k]} onChange={e => setJournal(j => ({ ...j, [k]: e.target.value }))} style={{ width: '100%', minHeight: 52, border: `1px solid ${t.field}`, borderRadius: 8, padding: 10, fontSize: fz(t, 13), fontFamily: 'inherit', boxSizing: 'border-box' }} />
                    </label>
                  ))}
                  <div><button onClick={saveJournal} disabled={journalBusy || !(journal.firstThought || journal.learned)} style={{ ...btn(t.primary), opacity: (journal.firstThought || journal.learned) ? 1 : 0.5 }}>{journalBusy ? 'Saving…' : 'Save reflection'}</button></div>
                </div>
              )}
            </div>
          )}

          {/* Step-by-step explainer (post-solve learning) */}
          {done && (
            <div style={{ ...card, marginTop: 16 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 8 }}>
                <SectionH>🔍 Understand it step by step</SectionH>
                {!explanation && <button onClick={runExplain} disabled={explainBusy} style={btn(t.run)}>{explainBusy ? 'Generating…' : 'Show dry run & complexity'}</button>}
              </div>
              {explanation && (
                <div>
                  {explanation.sampleInput && <div style={{ fontSize: fz(t, 12.5), color: t.sub, marginBottom: 8 }}>Traced on input: <code style={{ background: t.surface, padding: '1px 6px', borderRadius: 4 }}>{explanation.sampleInput}</code> → output <code style={{ background: t.surface, padding: '1px 6px', borderRadius: 4 }}>{explanation.finalOutput}</code></div>}
                  {!!explanation.dryRun?.length && (
                    <div style={{ overflowX: 'auto' }}>
                      <table style={{ borderCollapse: 'collapse', width: '100%', fontSize: fz(t, 12.5), minWidth: 460 }}>
                        <thead><tr style={{ background: t.surface, textAlign: 'left' }}>{['#', 'Action', 'State after'].map(h => <th key={h} style={{ padding: '7px 10px', fontSize: fz(t, 10.5), textTransform: 'uppercase', color: t.sub }}>{h}</th>)}</tr></thead>
                        <tbody>{explanation.dryRun.map((s, i) => (
                          <tr key={i} style={{ borderTop: `1px solid ${t.line}` }}>
                            <td style={{ padding: '7px 10px', fontWeight: 700, color: t.sub }}>{s.step}</td>
                            <td style={{ padding: '7px 10px', color: t.ink }}>{s.action}</td>
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
                  {explanation.bestPractice && <div style={{ marginTop: 10, fontSize: fz(t, 13), color: '#475569' }}><b>Best practice:</b> {explanation.bestPractice}</div>}
                  {explanation.altLogic && <div style={{ marginTop: 4, fontSize: fz(t, 13), color: t.sub }}><b>Another way:</b> {explanation.altLogic}</div>}
                </div>
              )}
              {p.referenceVideo && <div style={{ marginTop: 12 }}><a href={p.referenceVideo} target="_blank" rel="noreferrer" style={{ color: t.primary, fontWeight: 700, fontSize: fz(t, 13) }}>▶ Watch reference video</a></div>}
            </div>
          )}
        </>
      )}

      {/* Progress tab — thinking profile + badges */}
      {tab === 'progress' && (
        <div className="tl-progress" style={{ marginTop: 18 }}>
          {/* Thinking Profile */}
          <div style={{ background: `linear-gradient(120deg,${t.surface},${t.primarySoft})`, border: `1px solid ${t.border}`, borderRadius: 16, padding: 20, marginBottom: 16 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <SectionH>🧭 Your Thinking Profile</SectionH>
              {profile?.profile && <button onClick={() => loadProfile(true)} disabled={profileBusy} style={{ background: 'none', border: `1px solid ${t.field}`, borderRadius: 8, padding: '4px 10px', fontSize: fz(t, 12), color: t.sub, cursor: 'pointer' }}>{profileBusy ? 'Refreshing…' : '↻ Refresh'}</button>}
            </div>
            {profileBusy && !profile ? <div style={{ color: t.sub, fontSize: fz(t, 13) }}>Analysing your thinking…</div> :
              !profile?.profile ? (
                <div style={{ fontSize: fz(t, 13), color: t.sub }}>Solve a few challenges and answer the Thinking Journal after each — your AI profile appears once you've reflected on {profile?.needMore ? `${profile.needMore} more` : 'a couple of'} problems.</div>
              ) : (
                <div>
                  {profile.profile.summary && <p style={{ fontSize: fz(t, 14), color: t.ink, lineHeight: 1.6, margin: '2px 0 12px' }}>{profile.profile.summary}</p>}
                  {!!profile.profile.traits?.length && (
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginBottom: 12 }}>
                      {profile.profile.traits.map((tr, i) => (
                        <span key={i} title={tr.note} style={{ fontSize: fz(t, 12), fontWeight: 700, background: '#fff', border: `1px solid ${t.accentBorder}`, color: t.accentInk, borderRadius: 999, padding: '4px 12px' }}>{tr.label}</span>
                      ))}
                    </div>
                  )}
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(220px,1fr))', gap: 12 }}>
                    {!!profile.profile.strengths?.length && <ListCard title="✅ Strengths" items={profile.profile.strengths} color={t.success} />}
                    {!!profile.profile.weaknesses?.length && <ListCard title="⚠️ Growth areas" items={profile.profile.weaknesses} color={t.warn} />}
                    {!!profile.profile.recommendations?.length && <ListCard title="🎯 Do next" items={profile.profile.recommendations} color={t.primary} />}
                  </div>
                  <div style={{ fontSize: fz(t, 11), color: t.faint, marginTop: 8 }}>Based on {profile.profile.basedOnCount} reflections.</div>
                </div>
              )}
          </div>

          <div style={card}>
            <SectionH>🏅 Badges {stats && `(${stats.badgeCount}/${badges?.length ?? 11})`}</SectionH>
            {!badges ? <div style={{ color: t.sub, fontSize: fz(t, 13) }}>Loading…</div> : (
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill,minmax(150px,1fr))', gap: 12 }}>
                {badges.map(b => (
                  <div key={b.key} style={{ border: `1px solid ${b.earned ? t.primaryBorder : t.line}`, background: b.earned ? t.primarySoft : t.surface, borderRadius: 12, padding: 14, textAlign: 'center', opacity: b.earned ? 1 : 0.6 }}>
                    <div style={{ fontSize: 30, filter: b.earned ? 'none' : 'grayscale(1)' }}>{b.icon}</div>
                    <div style={{ fontSize: fz(t, 12.5), fontWeight: 800, color: t.ink, marginTop: 4 }}>{b.name}</div>
                    <div style={{ fontSize: fz(t, 11), color: t.sub, marginTop: 2 }}>{b.desc}</div>
                    {b.earned && <div style={{ fontSize: fz(t, 10.5), color: t.primary, fontWeight: 700, marginTop: 4 }}>✓ Earned</div>}
                  </div>
                ))}
              </div>
            )}
          </div>
          {stats && (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(130px,1fr))', gap: 12, marginTop: 12 }}>
              <Stat label={cp ? 'Lab XP' : 'Total XP'} value={stats.xpTotal} accent={t.primary} />
              {!cp && <Stat label="Level" value={stats.level} accent={t.accent} />}
              {!cp && <Stat label="🪙 Coins" value={stats.coins} accent={t.warn} />}
              <Stat label="Solved" value={stats.solvedTotal} accent={t.success} />
              <Stat label="🔥 Best streak" value={`${stats.longestStreak}d`} accent={cp ? t.danger : '#ea580c'} />
            </div>
          )}
        </div>
      )}

      {/* Leaderboard tab */}
      {tab === 'leaderboard' && (
        <div className="tl-leaderboard" style={{ marginTop: 18 }}>
          <div style={{ display: 'flex', gap: 6, marginBottom: 12, flexWrap: 'wrap', alignItems: 'center' }}>
            {scopes.map(([k, l]) => (
              <button key={k} onClick={() => setLbScope(k)} style={{ border: `1.5px solid ${lbScope === k ? t.primary : t.border}`, background: lbScope === k ? t.primarySoft : '#fff', color: lbScope === k ? t.primary : t.sub, borderRadius: 999, padding: '6px 14px', fontSize: fz(t, 13), fontWeight: 700, cursor: 'pointer' }}>{l}</button>
            ))}
            {member && <span style={{ fontSize: fz(t, 12), color: t.sub, marginLeft: 4 }}>Ranked among CareerPilot members</span>}
          </div>
          <div style={{ background: '#fff', border: `1px solid ${t.border}`, borderRadius: 16, overflow: 'hidden' }}>
            {!lb ? <div style={{ color: t.sub, fontSize: fz(t, 13), padding: 20 }}>Loading…</div> :
              lb.leaderboard.length === 0 ? <div style={{ color: t.sub, fontSize: fz(t, 13), padding: 20, textAlign: 'center' }}>No rankings yet — be the first to solve a challenge!</div> :
                lb.leaderboard.map(r => (
                  <div key={r.studentId + r.rank} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '11px 16px', borderTop: `1px solid ${t.line}`, background: r.isMe ? t.primarySoft : '#fff', flexWrap: 'wrap' }}>
                    <div style={{ width: 30, textAlign: 'center', fontWeight: 800, fontSize: fz(t, 15), color: t.sub }}>{r.rank <= 3 ? ['🥇', '🥈', '🥉'][r.rank - 1] : r.rank}</div>
                    <div style={{ flex: 1, minWidth: 0, fontWeight: r.isMe ? 800 : 600, color: t.ink, fontSize: fz(t, 14), overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{r.name}{r.isMe && <span style={{ color: t.primary, fontSize: fz(t, 12) }}> (you)</span>}</div>
                    {typeof r.streak === 'number' && r.streak > 0 && <span style={{ fontSize: fz(t, 12), color: cp ? t.danger : '#ea580c', fontWeight: 700 }}>🔥{r.streak}</span>}
                    {typeof r.solved === 'number' && <span style={{ fontSize: fz(t, 12), color: t.sub }}>{r.solved} solved</span>}
                    <div style={{ fontWeight: 800, color: t.primary, fontSize: fz(t, 14), minWidth: 70, textAlign: 'right' }}>{r.xp} XP</div>
                  </div>
                ))}
            {lb && lb.myRank && lb.myRank > lb.leaderboard.length && (
              <div style={{ padding: '11px 16px', borderTop: `1px solid ${t.line}`, background: t.primarySoft, fontSize: fz(t, 13), color: t.sub }}>Your rank: <b style={{ color: t.primary }}>#{lb.myRank}</b></div>
            )}
          </div>
        </div>
      )}

      {/* Analytics tab */}
      {tab === 'analytics' && (
        <div className="tl-analytics" style={{ marginTop: 18 }}>
          {!analytics ? <div style={{ color: t.sub, fontSize: fz(t, 13) }}>Loading analytics…</div> : (
            <>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(120px,1fr))', gap: 12 }}>
                <Stat label="Accuracy" value={`${analytics.accuracy}%`} accent={t.success} />
                <Stat label="Solved" value={analytics.solvedTotal} accent={t.primary} />
                <Stat label="Thinking" value={analytics.avgThinking} accent={t.accent} />
                <Stat label="Coding" value={analytics.avgCoding} accent={t.run} />
                <Stat label="Communication" value={analytics.avgCommunication} accent={t.warn} />
                <Stat label="Avg time" value={`${Math.round(analytics.avgTimeSec / 60)}m`} accent={cp ? t.primary : '#ea580c'} />
              </div>

              <div style={{ ...card, marginTop: 16 }}>
                <SectionH>Activity heatmap (last 16 weeks)</SectionH>
                <Heatmap data={analytics.heatmap} />
              </div>

              <div className="tl-split-wide" style={{ marginTop: 16 }}>
                <div style={card}>
                  <SectionH>Performance by topic</SectionH>
                  {analytics.byCategory.length === 0 ? <div style={{ color: t.sub, fontSize: fz(t, 13) }}>No data yet — solve today's problem to start your chart.</div> : analytics.byCategory.map(c => (
                    <div key={c.category} style={{ marginBottom: 10 }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: fz(t, 12.5), marginBottom: 3 }}><span style={{ color: '#475569', fontWeight: 600 }}>{c.category}</span><b style={{ color: c.rate >= 60 ? t.success : t.warn }}>{c.rate}% · {c.solved}/{c.total}</b></div>
                      <div style={{ height: 6, background: t.line, borderRadius: 6, overflow: 'hidden' }}><div style={{ width: `${c.rate}%`, height: '100%', background: c.rate >= 60 ? t.success : t.warn }} /></div>
                    </div>
                  ))}
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                  {analytics.strongTopics.length > 0 && <ListCard title="💪 Strong topics" items={analytics.strongTopics} color={t.success} />}
                  {analytics.weakTopics.length > 0 && <ListCard title="🎯 Focus areas" items={analytics.weakTopics} color={t.warn} />}
                </div>
              </div>
            </>
          )}
        </div>
      )}

      {celebration && <CelebrationModal result={celebration} onClose={() => setCelebration(null)} />}
    </div>
    </ThemeCtx.Provider>
  );
};

/**
 * TODAY'S PROBLEM, BEFORE IT STARTS.
 *
 * What the problem is, how big it is, and where the member stands on it — and one button that
 * opens the problem screen, which is where the timer runs. Nothing here is invented: every figure
 * is a field of the challenge the server sent.
 */
const ChallengeOverview: React.FC<{
  challenge: TLChallenge; position: { position: number; total: number } | null; seconds: number; done: boolean; minWords: number; onOpen: () => void;
}> = ({ challenge, position, seconds, done, minWords, onOpen }) => {
  const t = useT();
  const p = challenge.problem!;
  const started = !done && (seconds > 0 || challenge.attempts > 0 || !!challenge.approach?.trim());
  const solved = challenge.status === 'solved' || (done && challenge.passed);
  const statement = String(p.statement || '').replace(/\s+/g, ' ').trim();
  const preview = statement.length > 260 ? `${statement.slice(0, 257).trimEnd()}…` : statement;
  const state = solved ? { label: 'Solved', cls: 'ok' } : done ? { label: 'Submitted', cls: 'ok' } : started ? { label: 'In progress', cls: 'go' } : { label: 'Not started', cls: '' };
  const steps: [string, string, string][] = [
    ['bi-lightbulb', 'Think first', `Explain your approach in plain words (at least ${minWords}). The editor unlocks after.`],
    ['bi-code-slash', 'Code it', 'Any language — read from standard input, print the answer. Run it against the examples.'],
    ['bi-stars', 'Get AI feedback', 'Submit for a score on thinking, code and communication.'],
    ['bi-journal-text', 'Reflect', 'A short journal after solving builds your Thinking Profile.'],
  ];
  return (
    <div className="tl-ov">
      <section className="tl-ov-card">
        <div className="tl-ov-main">
          <div className="tl-ov-chips">
            <span className="tl-ov-eyebrow">Today’s problem</span>
            {position && position.position > 0 && <span className="tl-ov-chip">Problem {position.position} of {position.total}</span>}
            <span className="tl-ov-chip diff" style={{ background: t.diff[p.difficulty] || t.primary }}>{p.difficulty}</span>
            {p.category && <span className="tl-ov-chip soft">{p.category}</span>}
          </div>
          <h2>{p.title}</h2>
          {preview && <p className="tl-ov-preview">{preview}</p>}
          <div className="tl-ov-meta">
            <span><i className="bi bi-lightning-charge-fill" aria-hidden /> {p.xp} XP</span>
            {p.estimatedMinutes ? <span><i className="bi bi-clock" aria-hidden /> ~{p.estimatedMinutes} min</span> : null}
            {(p.examples?.length || 0) > 0 && <span><i className="bi bi-list-check" aria-hidden /> {p.examples.length} example{p.examples.length === 1 ? '' : 's'}</span>}
            {(p.totalHints || 0) > 0 && <span><i className="bi bi-life-preserver" aria-hidden /> {p.totalHints} hint{p.totalHints === 1 ? '' : 's'} available</span>}
          </div>
        </div>
        <aside className="tl-ov-side">
          <span className={`tl-ov-state ${state.cls}`}>{state.label}</span>
          <div className="tl-ov-time">
            <b>{fmtTime(seconds)}</b>
            <small>{done ? 'time spent' : started ? 'spent so far' : 'timer not started'}</small>
          </div>
          {(challenge.attempts > 0 || challenge.hintsUsed > 0) && (
            <div className="tl-ov-sub">{challenge.attempts} attempt{challenge.attempts === 1 ? '' : 's'} · {challenge.hintsUsed} hint{challenge.hintsUsed === 1 ? '' : 's'} used</div>
          )}
          {solved && challenge.xpEarned > 0 && <div className="tl-ov-sub ok">+{challenge.xpEarned} XP earned</div>}
          <button type="button" className="tl-ov-start" onClick={onOpen}>
            {done ? 'Review your solution' : started ? 'Continue solving' : 'Start solving'} <i className="bi bi-arrow-right" aria-hidden />
          </button>
          {!done && <small className="tl-ov-note">The timer starts when you open the problem.</small>}
        </aside>
      </section>

      <section className="tl-ov-steps" aria-label="How Thinking Lab works">
        {steps.map(([icon, title, text], i) => (
          <div key={title} className="tl-ov-step">
            <span className="tl-ov-step-ic"><i className={`bi ${icon}`} aria-hidden /></span>
            <div><b><em>{i + 1}</em> {title}</b><span>{text}</span></div>
          </div>
        ))}
      </section>
    </div>
  );
};

// ── Simple GitHub-style contribution heatmap (last ~16 weeks) ────────────────
const Heatmap: React.FC<{ data: { date: string; count: number }[] }> = ({ data }) => {
  const t = useT();
  const map = new Map(data.map(d => [d.date, d.count]));
  const weeks = 16, days: { date: string; count: number }[] = [];
  const today = new Date();
  const start = new Date(today); start.setDate(start.getDate() - (weeks * 7 - 1));
  for (let i = 0; i < weeks * 7; i++) {
    const d = new Date(start); d.setDate(start.getDate() + i);
    const ds = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
    days.push({ date: ds, count: map.get(ds) || 0 });
  }
  const color = (c: number) => c === 0 ? t.heat[0] : c === 1 ? t.heat[1] : c === 2 ? t.heat[2] : c <= 4 ? t.heat[3] : t.heat[4];
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
  const t = useT();
  const colors = t.scale > 1
    ? ['#051D64', '#359AAD', '#7FD3E0', '#17885D', '#B86B00', '#0B2D72']
    : ['#2563eb', '#7c3aed', '#16a34a', '#f59e0b', '#ef4444', '#0ea5e9'];
  const pieces = Array.from({ length: 44 });
  return (
    <div className="tl-celebration" onClick={onClose} style={{ position: 'fixed', inset: 0, background: 'rgba(15,23,42,.55)', display: 'grid', placeItems: 'center', zIndex: 3000, overflow: 'hidden' }}>
      <style>{`@keyframes tl-fall{0%{transform:translateY(-60px) rotate(0);opacity:1}100%{transform:translateY(105vh) rotate(720deg);opacity:.9}}@keyframes tl-pop{0%{transform:scale(.7);opacity:0}60%{transform:scale(1.05)}100%{transform:scale(1);opacity:1}}`}</style>
      {pieces.map((_, i) => (
        <span key={i} style={{ position: 'fixed', top: -20, left: `${(i * 2.27) % 100}%`, width: 9, height: 14, background: colors[i % colors.length], borderRadius: 2, animation: `tl-fall ${2 + (i % 5) * 0.4}s linear ${(i % 7) * 0.12}s infinite` }} />
      ))}
      <div onClick={e => e.stopPropagation()} role="dialog" aria-label="Challenge solved" style={{ position: 'relative', background: '#fff', borderRadius: 20, padding: 28, width: 380, maxWidth: '90vw', textAlign: 'center', animation: 'tl-pop .35s ease-out', boxShadow: '0 20px 60px rgba(0,0,0,.3)' }}>
        <div style={{ fontSize: 46 }}>🎉</div>
        <div style={{ fontSize: fz(t, 22), fontWeight: 900, color: t.ink }}>Challenge solved!</div>
        <div style={{ display: 'flex', justifyContent: 'center', gap: 12, marginTop: 14 }}>
          <div style={{ background: t.primarySoft, borderRadius: 12, padding: '10px 18px' }}><div style={{ fontSize: fz(t, 22), fontWeight: 900, color: t.primary }}>+{result.xpEarned}</div><div style={{ fontSize: fz(t, 11), color: t.sub, fontWeight: 700 }}>XP</div></div>
          {t.scale === 1 && <div style={{ background: t.warnSoft, borderRadius: 12, padding: '10px 18px' }}><div style={{ fontSize: fz(t, 22), fontWeight: 900, color: t.warn }}>+{result.coinsEarned}</div><div style={{ fontSize: fz(t, 11), color: t.sub, fontWeight: 700 }}>🪙 Coins</div></div>}
        </div>
        {result.newBadges?.length > 0 && (
          <div style={{ marginTop: 16 }}>
            <div style={{ fontSize: fz(t, 12.5), fontWeight: 800, color: t.accent }}>NEW BADGE{result.newBadges.length > 1 ? 'S' : ''} UNLOCKED!</div>
            <div style={{ display: 'flex', justifyContent: 'center', gap: 10, marginTop: 8, flexWrap: 'wrap' }}>
              {result.newBadges.map(b => (
                <div key={b.key} style={{ background: t.accentSoft, border: `1px solid ${t.accentBorder}`, borderRadius: 12, padding: '8px 12px' }}>
                  <div style={{ fontSize: 26 }}>{b.icon}</div>
                  <div style={{ fontSize: fz(t, 11), fontWeight: 800, color: t.ink }}>{b.name}</div>
                </div>
              ))}
            </div>
          </div>
        )}
        <button onClick={onClose} style={{ marginTop: 20, background: t.primary, color: '#fff', border: 'none', borderRadius: 10, padding: '11px 26px', fontWeight: 800, fontSize: fz(t, 14), cursor: 'pointer' }}>Awesome!</button>
      </div>
    </div>
  );
};

// ── AI feedback panel ─────────────────────────────────────────────────────────
const Feedback: React.FC<{ result: TLSubmitResult; onNext: () => void; nextLabel: string }> = ({ result, onNext, nextLabel }) => {
  const t = useT();
  const f = result.feedback || {};
  const bars: [string, number | undefined][] = [
    ['Logical thinking', f.logicalThinking], ['Problem understanding', f.problemUnderstanding], ['Approach', f.approach],
    ['Optimization', f.optimization], ['Edge cases', f.edgeCases], ['Coding style', f.codingStyle],
    ['Communication', f.communication], ['Overall', f.overall],
  ];
  const barColor = (n: number) => (n >= 75 ? t.success : n >= 50 ? t.warn : t.danger);
  const card: React.CSSProperties = { background: '#fff', border: `1px solid ${t.border}`, borderRadius: 16, padding: 18 };
  const cxChip: React.CSSProperties = { fontSize: fz(t, 12), fontWeight: 700, color: '#334155', background: t.surface, borderRadius: 8, padding: '4px 10px' };
  return (
    <div className="tl-feedback" style={{ marginTop: 16 }}>
      {/* Result banner */}
      <div style={{ background: result.allPassed ? t.banner : t.warnSoft, color: result.allPassed ? '#fff' : t.warnInk, border: result.allPassed ? 'none' : `1px solid ${t.warnBorder}`, borderRadius: 16, padding: 20, textAlign: 'center' }}>
        <div style={{ fontSize: 30 }}>{result.allPassed ? '🎉' : '💪'}</div>
        <div style={{ fontSize: fz(t, 19), fontWeight: 800 }}>{result.allPassed ? `Solved! +${result.xpEarned} XP` : 'Submitted — keep going'}</div>
        {f.summary && <div style={{ fontSize: fz(t, 13.5), opacity: .95, marginTop: 4, maxWidth: 620, marginLeft: 'auto', marginRight: 'auto' }}>{f.summary}</div>}
        <button onClick={onNext} style={{ marginTop: 14, background: '#fff', color: t.primary, border: result.allPassed ? 'none' : `1px solid ${t.warnBorder}`, borderRadius: 10, padding: '10px 22px', fontWeight: 800, fontSize: fz(t, 14), cursor: 'pointer' }}>{nextLabel}</button>
      </div>

      {/* Rubric */}
      <div className="tl-split-even" style={{ marginTop: 16 }}>
        <div style={card}>
          <SectionH>AI evaluation</SectionH>
          {bars.filter(([, v]) => typeof v === 'number').map(([label, v]) => (
            <div key={label} style={{ marginBottom: 9 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: fz(t, 12.5), marginBottom: 3 }}><span style={{ color: '#475569', fontWeight: 600 }}>{label}</span><b style={{ color: barColor(v!) }}>{v}</b></div>
              <div style={{ height: 7, background: t.line, borderRadius: 6, overflow: 'hidden' }}><div style={{ width: `${v}%`, height: '100%', background: barColor(v!) }} /></div>
            </div>
          ))}
          {(f.timeComplexity || f.spaceComplexity) && (
            <div style={{ display: 'flex', gap: 10, marginTop: 10, flexWrap: 'wrap' }}>
              {f.timeComplexity && <span style={cxChip}>⏱ Time: {f.timeComplexity}</span>}
              {f.spaceComplexity && <span style={cxChip}>💾 Space: {f.spaceComplexity}</span>}
            </div>
          )}
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          {!!(f.strengths?.length) && <ListCard title="✅ Strengths" items={f.strengths!} color={t.success} />}
          {!!(f.weaknesses?.length) && <ListCard title="⚠️ To improve" items={f.weaknesses!} color={t.warn} />}
          {!!(f.commonMistakes?.length) && <ListCard title="🚫 Common mistakes" items={f.commonMistakes!} color={t.danger} />}
        </div>
      </div>

      {(f.improvedSolution || f.alternativeSolution) && (
        <div style={{ ...card, marginTop: 16 }}>
          {f.improvedSolution && <><SectionH>A better solution</SectionH><pre style={{ margin: 0, fontFamily: 'ui-monospace,monospace', fontSize: fz(t, 12.5), whiteSpace: 'pre-wrap', color: '#334155', background: t.surface, padding: 12, borderRadius: 8 }}>{f.improvedSolution}</pre></>}
          {f.alternativeSolution && <div style={{ marginTop: 10, fontSize: fz(t, 13), color: t.sub }}><b>Alternative approach:</b> {f.alternativeSolution}</div>}
          {!!(f.relatedQuestions?.length) && <div style={{ marginTop: 10, fontSize: fz(t, 13), color: t.sub }}><b>Practice next:</b> {f.relatedQuestions!.join(' · ')}</div>}
        </div>
      )}
    </div>
  );
};

const Stat: React.FC<{ label: string; value: any; accent: string }> = ({ label, value, accent }) => {
  const t = useT();
  return (
    <div style={{ background: '#fff', border: `1px solid ${t.border}`, borderRadius: 12, padding: '8px 14px', minWidth: 78, textAlign: 'center' }}>
      <div style={{ fontSize: fz(t, 18), fontWeight: 800, color: accent }}>{value}</div>
      <div style={{ fontSize: fz(t, 10.5), color: t.sub, fontWeight: 600 }}>{label}</div>
    </div>
  );
};
const ListCard: React.FC<{ title: string; items: string[]; color: string }> = ({ title, items, color }) => {
  const t = useT();
  return (
    <div style={{ background: '#fff', border: `1px solid ${t.border}`, borderRadius: 14, padding: 14 }}>
      <div style={{ fontSize: fz(t, 12.5), fontWeight: 800, color, marginBottom: 6 }}>{title}</div>
      <ul style={{ margin: 0, paddingLeft: 18 }}>{items.map((it, i) => <li key={i} style={{ fontSize: fz(t, 12.5), color: '#475569', marginBottom: 3, lineHeight: 1.45 }}>{it}</li>)}</ul>
    </div>
  );
};
const SectionH: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const t = useT();
  return <div style={{ fontSize: fz(t, 13), fontWeight: 800, color: t.ink, marginBottom: 8 }}>{children}</div>;
};

export default ThinkingLab;
