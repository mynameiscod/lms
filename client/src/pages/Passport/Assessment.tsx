import React, { useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import passportApi, { AssessQuestion, AssessResult } from '../../api/passportApi';
import { useAuth } from '../../contexts/AuthContext';
import { useMember } from './MemberLayout';
import './assessment.css';

/**
 * Career Readiness Assessment — the free deterministic entry point (CareerPilot).
 * Student answers the MCQ bank one at a time; on submit we score server-side and show the
 * Career Score, category breakdown, strengths/gaps, recommended pathway, 7-day preview + ₹499 CTA.
 */
/** Bootstrap Icons per category. Unknown keys fall back to a dot where used. */
const CAT_ICON: Record<string, string> = {
  career_clarity: 'bi-bullseye', aptitude: 'bi-calculator-fill', logical_reasoning: 'bi-puzzle-fill',
  technical: 'bi-code-slash', communication: 'bi-chat-dots-fill', employability: 'bi-briefcase-fill',
};
const CAT_LABEL: Record<string, string> = {
  career_clarity: 'Career Clarity', aptitude: 'Aptitude', logical_reasoning: 'Logical Reasoning',
  technical: 'Technical Foundation', communication: 'Communication', employability: 'Employability',
};
const CAT_HELP: Record<string, string> = {
  career_clarity: 'This helps us understand your career clarity and planning stage.',
  aptitude: 'This helps us gauge your logical and numerical ability.',
  logical_reasoning: 'This helps us understand your problem-solving approach.',
  technical: 'This helps us assess your technical foundation.',
  communication: 'This helps us understand your communication readiness.',
  employability: 'This helps us gauge your job-readiness.',
};
const prettyCat = (k: string) => CAT_LABEL[k] || k.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase());

/**
 * The side panel mirrors the /careerpilot landing so the two screens read as one product.
 * `tone` picks the tile tint; the wording matches the promises made before they started.
 */
const SIDE_FEATS: { ic: string; tone: string; title: string; desc: string }[] = [
  { ic: 'bi-compass', tone: 'blue', title: 'Know Your Current Level', desc: 'Get your Career Score and see how career-ready you are.' },
  { ic: 'bi-graph-up-arrow', tone: 'teal', title: 'Identify Your Strengths & Gaps', desc: "Discover what you're good at and what needs improvement." },
  { ic: 'bi-map-fill', tone: 'amber', title: 'Get Your Personalized Roadmap', desc: 'Receive a 90-day plan tailored to your goals and academic year.' },
  { ic: 'bi-lightning-charge-fill', tone: 'violet', title: 'Start Taking Daily Action', desc: 'Unlock daily missions, practice, and expert guidance.' },
];

/** Mirrors the /careerpilot landing so both screens make the same promises. */
const WHY: { ic: string; tone: string; title: string; desc: string }[] = [
  { ic: 'bi-bullseye', tone: 'rose', title: 'Right Career Direction', desc: 'Understand which career path suits you best based on your strengths and interests.' },
  { ic: 'bi-map-fill', tone: 'blue', title: 'Personalized Roadmap', desc: 'Get a customized 90-day roadmap based on your academic year and goals.' },
  { ic: 'bi-star-fill', tone: 'amber', title: 'Improve Faster', desc: 'Focus on the right skills and activities that will make the biggest impact.' },
  { ic: 'bi-trophy-fill', tone: 'violet', title: 'Stand Out', desc: 'Build a strong profile and become the kind of candidate employers value.' },
  { ic: 'bi-graph-up-arrow', tone: 'teal', title: 'Track Your Growth', desc: 'See your progress over time and celebrate every improvement.' },
];

/**
 * Named institutions. The same list was emptied from the signup page on 2026-07-30 for
 * being mockup copy rather than real relationships — empty this array to hide the strip.
 */
const COLLEGES: [string, string][] = [
  ['VIT', 'Vellore Institute of Technology'],
  ['SRM', 'Institute of Science & Technology'],
  ['GITAM', '(Deemed to be University)'],
  ['Andhra University', 'Andhra University'],
  ['200+ More Colleges', 'Across AP & Telangana'],
];

const fmt = (s: number) => `${String(Math.floor(s / 60)).padStart(2, '0')}:${String(s % 60).padStart(2, '0')}`;

const Assessment: React.FC = () => {
  const nav = useNavigate();
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [questions, setQuestions] = useState<AssessQuestion[]>([]);
  const [answers, setAnswers] = useState<Record<string, number>>({});
  const [idx, setIdx] = useState(0);
  const [submitting, setSubmitting] = useState(false);
  const [result, setResult] = useState<AssessResult | null>(null);
  const [retake, setRetake] = useState(false);
  const [error, setError] = useState('');
  const [secsLeft, setSecsLeft] = useState(600); // 10:00 soft timer

  const firstName = user?.firstName || 'there';
  const initial = (firstName[0] || 'C').toUpperCase();

  useEffect(() => {
    (async () => {
      try {
        const existing = await passportApi.getResult();
        if (existing.result) { setResult(existing.result); setLoading(false); return; }
        const a = await passportApi.getAssessment();
        setQuestions(a.questions);
      } catch (e: any) { setError(e?.response?.data?.message || 'Could not load the assessment.'); }
      setLoading(false);
    })();
  }, []);

  // Soft countdown while taking the assessment.
  const taking = !loading && (!result || retake);
  useEffect(() => {
    if (!taking) return;
    const t = setInterval(() => setSecsLeft(s => (s > 0 ? s - 1 : 0)), 1000);
    return () => clearInterval(t);
  }, [taking]);

  const startFresh = async () => {
    setLoading(true); setResult(null); setRetake(true); setAnswers({}); setIdx(0); setSecsLeft(600);
    try { const a = await passportApi.getAssessment(); setQuestions(a.questions); } catch { /* */ }
    setLoading(false);
  };

  // A conditional question only appears once its premise holds. Asking "how many
  // companies have you applied to?" straight after "resume: not written" reads as a form
  // that is not listening, and the member stops trusting the score it produces.
  const visible = React.useMemo(
    () => questions.filter(q => {
      const dep = q.dependsOn;
      if (!dep?.questionId) return true;
      const parent = answers[dep.questionId];
      return parent !== undefined && parent >= (dep.minChosen ?? 1);
    }),
    [questions, answers],
  );

  const total = visible.length;
  // Answers to questions that later became hidden are NOT counted or submitted: going
  // Back and lowering the parent retracts the child, so it must not still be scored.
  const visibleIds = React.useMemo(() => new Set(visible.map(q => q.id)), [visible]);
  const answeredCount = Object.keys(answers).filter(id => visibleIds.has(id)).length;

  // Hiding a question can leave idx past the end of the list.
  React.useEffect(() => {
    if (idx > 0 && idx >= total) setIdx(Math.max(0, total - 1));
  }, [idx, total]);

  const current = visible[Math.min(idx, Math.max(0, total - 1))];
  const progress = total ? Math.round(((idx + 1) / total) * 100) : 0;
  const canSubmit = answeredCount === total && total > 0;

  const submit = async () => {
    setSubmitting(true); setError('');
    try {
      const payload = Object.entries(answers)
        .filter(([questionId]) => visibleIds.has(questionId))
        .map(([questionId, chosen]) => ({ questionId, chosen }));
      const { result: r } = await passportApi.submitAssessment(payload);
      setResult(r); setRetake(false);
    } catch (e: any) { setError(e?.response?.data?.message || 'Submit failed. Try again.'); }
    setSubmitting(false);
  };

  const Top = (progressUI: React.ReactNode) => (
    <div className="pf-top"><div className="pf-top-in">
      <div className="pf-brand"><span className="mark"><i className="bi bi-compass" /></span><div className="bt"><b>Career<span className="p">Pilot</span></b><small>Powered by CodeBegun</small></div></div>
      <button className="pf-back" onClick={() => nav('/careerpilot')}>← Mission Control</button>
      {progressUI}
    </div></div>
  );

  if (loading) return <div className="pf-shell">{Top(<div className="pf-spacer" />)}<div style={{ textAlign: 'center', color: '#64748b', padding: 80 }}>Loading…</div></div>;

  if (result && !retake) return <ResultView result={result} firstName={firstName} initial={initial} onRetake={startFresh} onHome={() => nav('/careerpilot')} topBrand={Top} />;

  return (
    <div className="pf-shell">
      {Top(
        <>
          <div className="pf-progress">
            <div className="col"><div className="lbl">Assessment Progress</div><div className="track"><i style={{ width: `${progress}%` }} /></div></div>
            <div className="pct">{progress}%</div>
          </div>
          <div className={`pf-timer${secsLeft <= 60 ? ' low' : ''}`}><span className="ic"><i className="bi bi-stopwatch-fill" /></span><div><b>{fmt(secsLeft)}</b><small>Time Left</small></div></div>
          <div className="pf-user"><span className="av">{initial}</span><div className="who"><b>Hi, {firstName}</b><small>Keep going!</small></div></div>
        </>
      )}

      <div className="cpa-wrap">
        {/* Left sidebar */}
        <aside className="cpa-side">
          <span className="cpa-chip"><i className="bi bi-rocket-takeoff-fill" /> Mission Control</span>
          <div className="cpa-side-top">
            <h2>Your Career Journey<br />Starts with <span className="b">Clarity</span></h2>
            <svg className="cpa-art" viewBox="0 0 120 108" aria-hidden="true">
              <rect x="46" y="56" width="40" height="46" rx="5" fill="#7C6BF0" />
              <rect x="46" y="56" width="40" height="7" rx="3.5" fill="#9B8DF7" />
              <rect x="24" y="76" width="20" height="26" rx="4" fill="#3ECFC0" />
              <circle cx="72" cy="38" r="22" fill="#EEF0FF" />
              <circle cx="72" cy="38" r="15" fill="#4F46E5" />
              <circle cx="72" cy="38" r="8" fill="#EEF0FF" />
              <circle cx="72" cy="38" r="3" fill="#4F46E5" />
              <path d="M72 38 L96 14" stroke="#3B3486" strokeWidth="2.5" strokeLinecap="round" />
              <path d="M92 10 L104 12 L98 22 Z" fill="#4F46E5" />
              <path d="M22 60 C34 44 52 40 62 46" stroke="#C7CBF5" strokeWidth="1.5"
                    strokeDasharray="3 4" fill="none" strokeLinecap="round" />
              <path d="M18 30 l2.5 5 5 2.5 -5 2.5 -2.5 5 -2.5 -5 -5 -2.5 5 -2.5 Z" fill="#8B9BFB" />
              <path d="M104 46 l1.8 3.6 3.6 1.8 -3.6 1.8 -1.8 3.6 -1.8 -3.6 -3.6 -1.8 3.6 -1.8 Z" fill="#3ECFC0" />
            </svg>
          </div>
          <p className="intro">
            Take the free Career Readiness Assessment to know where you stand today and get a
            personalized roadmap to achieve your dream career.
          </p>

          <div className="cpa-feats">
            {SIDE_FEATS.map(f => (
              <div className="cpa-feat" key={f.title}>
                <span className={`ic t-${f.tone}`} aria-hidden="true"><i className={`bi ${f.ic}`} /></span>
                <div><b>{f.title}</b><span>{f.desc}</span></div>
              </div>
            ))}
          </div>

          {/* The landing shows "Start Free Assessment" here. Mid-assessment that button
              would either do nothing or throw away answers, so this says where they are
              instead. */}
          <div className="cpa-side-foot">
            <i className="bi bi-clock" /> Assessment in progress
            <span className="dot">·</span>
            <i className="bi bi-shield-check" /> Your answers stay private
          </div>
        </aside>

        {/* Main */}
        <main className="cpa-main">
          <div className="cpa-banner">
            <span className="bic" aria-hidden="true"><i className="bi bi-star-fill" /></span>
            <div><b>Answer honestly. There are no wrong answers.</b><span>We just want to understand you better.</span></div>
            <span className="bimg" aria-hidden="true"><i className="bi bi-bullseye" /></span>
          </div>

          {error && <div className="cpa-err">{error}</div>}

          {current && (
            <div className="cpa-card">
              <div className="cpa-qhead">
                <span className="cpa-cat"><i className={`bi ${CAT_ICON[current.category] || 'bi-dot'}`} /> {prettyCat(current.category)}</span>
                <span className="cpa-qnum">Question {idx + 1} of {total}</span>
              </div>
              <h2 className="cpa-q">{current.text}</h2>
              <p className="cpa-qsub">{CAT_HELP[current.category] || 'Choose the option that best describes you.'}</p>
              <div className="cpa-opts">
                {current.options.map((opt, i) => {
                  const sel = answers[current.id] === i;
                  const [head, ...restp] = String(opt).split(/\s[—–-]\s|:\s/);
                  const sub = restp.join(' ').trim();
                  return (
                    <button key={i} className={`cpa-opt${sel ? ' sel' : ''}`} onClick={() => setAnswers(a => ({ ...a, [current.id]: i }))}>
                      <span className="radio" />
                      <span className="ltr">{String.fromCharCode(65 + i)}</span>
                      <span className="otxt"><b>{head}</b>{sub && <span>{sub}</span>}</span>
                    </button>
                  );
                })}
              </div>
              <div className="cpa-nav">
                <button className="cpa-btn-back" disabled={idx === 0} onClick={() => setIdx(i => Math.max(0, i - 1))}><i className="bi bi-arrow-left" /> Back</button>
                {idx < total - 1 ? (
                  <button className="cpa-btn-next" disabled={answers[current.id] === undefined} onClick={() => setIdx(i => i + 1)}>Next <i className="bi bi-arrow-right" /></button>
                ) : (
                  <button className="cpa-btn-next" disabled={!canSubmit || submitting} onClick={submit}>{submitting ? 'Scoring…' : <>See my Career Score <i className="bi bi-arrow-right" /></>}</button>
                )}
              </div>
              {!canSubmit && idx === total - 1 && <div style={{ textAlign: 'right', fontSize: 12, color: '#94a3b8', marginTop: 8 }}>Answer all {total} questions to submit ({answeredCount}/{total}).</div>}
            </div>
          )}

          <div className="cpa-tip">
            <span className="ic" aria-hidden="true"><i className="bi bi-lightbulb-fill" /></span>
            <div><b>Tip: There are no right or wrong answers.</b><span>Be honest so we can give you the best guidance.</span></div>
          </div>
        </main>
      </div>

      {/* Same promises as the landing, carried through the assessment. */}
      <section className="cpa-why">
        <h2>Why take the Career Readiness Assessment?</h2>
        <div className="cpa-why-grid">
          {WHY.map(w => (
            <div className="cpa-why-card" key={w.title}>
              <div className={`ic t-${w.tone}`} aria-hidden="true"><i className={`bi ${w.ic}`} /></div>
              <b>{w.title}</b><span>{w.desc}</span>
            </div>
          ))}
        </div>
      </section>

      {!!COLLEGES.length && (
        <section className="cpa-colleges">
          <span className="lab">Trusted by Students from</span>
          {COLLEGES.map(([nm, sub]) => (
            <div className="cpa-college" key={nm}>
              <span className="badge" aria-hidden="true"><i className="bi bi-mortarboard-fill" /></span>
              <div><b>{nm}</b><span>{sub}</span></div>
            </div>
          ))}
        </section>
      )}
    </div>
  );
};

// ── Result ──
const BANDS = (score: number): { tag: string; color: string } => {
  if (score >= 85) return { tag: 'Excellent', color: '#16a34a' };
  if (score >= 60) return { tag: 'Good Progress', color: '#0ea5a3' };
  if (score >= 40) return { tag: 'Keep Improving', color: '#f59e0b' };
  return { tag: 'Keep Exploring', color: '#8b5cf6' };
};

const ResultView: React.FC<{
  result: AssessResult; firstName: string; initial: string;
  onRetake: () => void; onHome: () => void; topBrand: (ui: React.ReactNode) => React.ReactNode;
}> = ({ result, firstName, initial, onRetake, onHome, topBrand }) => {
  const nav = useNavigate();
  const { data: member } = useMember();
  const [paying, setPaying] = useState(false);
  const [payMsg, setPayMsg] = useState('');
  const [unlocked, setUnlocked] = useState(false);
  const [status, setStatus] = useState<any>(null);
  const printRef = useRef(false);

  // Seed `unlocked` from the server, not just from a payment made in THIS session —
  // otherwise a member who paid days ago is pitched the ₹499 upgrade all over again.
  useEffect(() => {
    passportApi.me().then(me => {
      setStatus(me);
      if (me?.active) setUnlocked(true);
    }).catch(() => {});
  }, []);

  // A payment can complete in a redirected tab (checkout callback never fires here). When the
  // user returns to this tab, re-check membership; if now active, show the unlocked state.
  useEffect(() => {
    const recheck = async () => {
      if (unlocked) return;
      try { const me = await passportApi.me(); setStatus(me); if (me?.active) setUnlocked(true); } catch { /* ignore */ }
    };
    window.addEventListener('focus', recheck);
    document.addEventListener('visibilitychange', recheck);
    return () => { window.removeEventListener('focus', recheck); document.removeEventListener('visibilitychange', recheck); };
  }, [unlocked]);

  const unlock = async () => {
    setPaying(true); setPayMsg('');
    const res = await passportApi.membershipCheckout();
    setPaying(false);
    if (res.ok) { setUnlocked(true); setPayMsg(''); }
    else setPayMsg(res.message || 'Payment did not complete.');
  };

  const price = status?.priceInr ?? 499;
  const paymentOff = status?.paymentAvailable === false;
  const isMember = !!status?.active;
  const score = result.careerScore;
  const scoreBand = BANDS(score);
  const circumference = 2 * Math.PI * 62;
  const dash = useMemo(() => (score / 100) * circumference, [score, circumference]);
  const encourage = score >= 75 ? "You're on a strong track. Stay consistent and you'll go far!"
    : score >= 45 ? "You're on the right track. With the right plan and consistent effort, you can achieve great things!"
    : "Great first step — a focused plan will move your score up fast.";

  const sorted = [...(result.categoryScores || [])].sort((a, b) => b.score - a.score);
  const topThree = sorted.slice(0, 3);

  /** How many questions actually fed the score — the mockup's fourth fact. */
  const answeredTotal = result.categoryScores.reduce(
    (n, c: any) => n + (c.total ?? c.answered ?? 0), 0);

  const body = (
      <div className={`rs-wrap${isMember ? ' rs-member' : ''}`}>
        {isMember && <div className="rs-crumb">Assessment <span>›</span> <b>Results</b></div>}
        <div className="rs-hi">
          <h1>Great start, {firstName}! <i className="bi bi-stars" /></h1>
          <p>You've just discovered your Career Score. This is the first step towards your dream career.</p>
        </div>

        <div className="rs-cols">
        <div className="rs-colmain">

        {/* Score summary */}
        <div className="rs-card">
          <div className="rs-score">
            <div>
              <div className="lbl">Your Career Score</div>
              <div className="big">{score}<small> /100</small></div>
              <span className="rs-badge" style={{ background: scoreBand.color + '1a', color: scoreBand.color }}>{result.level}</span>
              <div className="enc">{encourage}</div>
            </div>
            <div className="rs-gauge">
              <svg width="150" height="150">
                <circle cx="75" cy="75" r="62" fill="none" stroke="#eef1f6" strokeWidth="13" />
                <circle cx="75" cy="75" r="62" fill="none" stroke="#6650d8" strokeWidth="13" strokeLinecap="round" strokeDasharray={`${dash} ${circumference}`} transform="rotate(-90 75 75)" />
              </svg>
              <div className="ctr"><b>{score}</b><span>/ 100</span></div>
            </div>
            {/* Only facts we genuinely hold — no invented percentile when there are no peers */}
            <div className="rs-facts">
              <div className="rs-fact">
                <div className="k">Percentile</div>
                <div className="v">{member?.percentileAhead != null ? `Top ${100 - member.percentileAhead}% of members` : 'Needs more members'}</div>
              </div>
              <div className="rs-fact">
                <div className="k">Strongest area</div>
                <div className="v">{topThree[0] ? `${topThree[0].label} · ${topThree[0].score}%` : '—'}</div>
              </div>
              <div className="rs-fact">
                <div className="k">Attempts</div>
                <div className="v">{(result as any).attempts ?? 1}</div>
              </div>
              <div className="rs-fact">
                <div className="k">Total questions</div>
                <div className="v">{answeredTotal || '—'}</div>
              </div>
            </div>
          </div>
        </div>

        {/* Category breakdown */}
        <div className="rs-card">
          <div className="rs-sec-h">Category Breakdown <span className="hint">This shows your current strength in key areas</span></div>
          {result.categoryScores.map(c => {
            const b = BANDS(c.score);
            return (
              <div className="rs-cat" key={c.key}>
                <div className="nm"><i className={`bi ${CAT_ICON[c.key] || 'bi-dot'}`} /> {c.label}</div>
                <div className="track"><i style={{ width: `${c.score}%`, background: b.color }} /></div>
                <div className="pct">{c.score}%</div>
                <div className="tag" style={{ color: b.color }}>{b.tag}</div>
              </div>
            );
          })}
        </div>


        {isMember && (
          <div className="rs-cta">
            <span className="em"><i className="bi bi-stars" /></span>
            <div className="tx">
              <b>Every step counts!</b>
              <span>Stay consistent, keep learning, and unlock your full potential.</span>
            </div>
            <button onClick={() => nav('/careerpilot/roadmap')}>Go to Roadmap →</button>
          </div>
        )}
        </div>

        {/* ── Aside ── */}
        <div className="rs-aside">
          <div className="rs-path-card">
            <div className="hd"><i className="bi bi-signpost-split-fill" /> Recommended Pathway</div>
            <div className="sub">Your best-fit learning path</div>
            <div className="rs-path-pick">
              <span className="ic">{'</>'}</span>
              <b>{result.pathwayLabel}</b>
            </div>
            <div className="rs-path-why">
              <div><span><i className="bi bi-dot" /></span>Matched to your strongest areas: {topThree.slice(0, 2).map(c => c.label).join(' and ')}.</div>
              <div><span><i className="bi bi-dot" /></span>Sets the weekly themes of your {member?.stats?.totalDays ?? 90}-day roadmap.</div>
              <div><span><i className="bi bi-dot" /></span>Daily missions are biased to your two weakest categories.</div>
            </div>
            <button className="rs-path-btn" onClick={() => nav('/careerpilot/roadmap')}>View Full Roadmap →</button>
          </div>

          <div className="rs-card">
            <div className="rs-sec-h"><i className="bi bi-trophy-fill" /> Your Top Strengths</div>
            {topThree.map(c => (
              <div className="rs-str" key={c.key}>
                <span className="ic"><i className={`bi ${CAT_ICON[c.key] || 'bi-dot'}`} /></span>
                <div className="tx"><b>{c.label}</b><span>Your strongest scoring area</span></div>
                <span className="pc">{c.score}%</span>
              </div>
            ))}
            <div style={{ fontSize: 12.5, color: '#64748b', marginTop: 8 }}>Keep it up! You're doing great.</div>
          </div>

          {/* Next steps = today's real missions, with their real XP */}
          {isMember && !!member?.missions?.length && (
            <div className="rs-card">
              <div className="rs-sec-h"><i className="bi bi-flag-fill" /> Next Steps</div>
              {member.missions.map(m => (
                <div className="rs-next" key={m.key}>
                  <span className={`ck${m.done ? ' on' : ''}`} />
                  <span className="t" style={{ textDecoration: m.done ? 'line-through' : 'none', color: m.done ? '#94a3b8' : undefined }}>{m.title}</span>
                  <span className="xp">+{m.xp} XP</span>
                </div>
              ))}
              <button className="rs-path-btn" style={{ marginTop: 12 }} onClick={() => nav('/careerpilot')}>View All Missions →</button>
            </div>
          )}
        </div>
        </div>

        {/* Focus areas — the weakest categories, each with somewhere to act on it */}
        {/* Focus areas beside the first week — the mockup pairs them, and they
            answer the same question: what do I do about this score? */}
        <div className="rs-pair">
        <div className="rs-card">
          <div className="rs-sec-h">Focus Areas <span className="hint">Areas to improve for a stronger profile</span></div>
          <div className="rs-focus-grid">
            {sorted.slice(-3).reverse().map((c, i) => {
              const tint = ['#f4f2ff', '#f0fdf4', '#fff7ed'][i] || '#f8fafc';
              const to = c.key === 'technical' ? '/careerpilot/practice?kind=coding'
                : c.key === 'aptitude' || c.key === 'logical_reasoning' ? '/careerpilot/practice?kind=mcq'
                : c.key === 'communication' ? '/careerpilot/interview'
                : c.key === 'employability' ? '/careerpilot/resume' : '/careerpilot/roadmap';
              return (
                <div className="rs-focus-card" style={{ background: tint }} key={c.key}>
                  <span className="ic"><i className={`bi ${CAT_ICON[c.key] || 'bi-dot'}`} /></span>
                  <b>{c.label}</b>
                  <span>Currently {c.score}% — the fastest place to gain points.</span>
                  {isMember && <button onClick={() => nav(to)}>Practice now →</button>}
                </div>
              );
            })}
          </div>
        </div>

        {/* 7-day preview */}
        <div className="rs-card">
          <div className="rs-sec-h">Your First 7 Days (Preview) <span className="hint">Small steps today, big change tomorrow</span></div>
          <div className="rs-days">
            {result.weekPreview.map((d, i) => (
              <div className={`rs-day${i === 0 ? ' on' : ''}`} key={d.day}>
                <div className="circ">{d.day}</div>
                <b>{d.title}</b>
                <span>{d.detail}</span>
              </div>
            ))}
          </div>
        </div>
        </div>

        {/* Unlock — never pitched to someone who has already paid */}
        {isMember ? (
          <div className="rs-done">
            <div className="em"><i className="bi bi-stars" /></div>
            <h3>You're a CareerPilot member.</h3>
            <p>This is your latest result. Your roadmap, Practice Lab, mock interviews and Resume Center are all unlocked.</p>
            <button onClick={onHome}>Go to Coding Home →</button>
          </div>
        ) : unlocked ? (
          <div className="rs-done">
            <div className="em"><i className="bi bi-stars" /></div>
            <h3>You're in! Membership activated.</h3>
            <p>Your personalized daily missions are ready.</p>
            <button onClick={onHome}>Go to Mission Control →</button>
          </div>
        ) : (
          <div className="rs-unlock">
            <div className="rs-unlock-l">
              <h3>Unlock your full 90-day <span className="y">career transformation!</span></h3>
              <div className="rs-uf">
                <div><span className="ck"><i className="bi bi-check-lg" /></span> Personalized 90-day roadmap</div>
                <div><span className="ck"><i className="bi bi-check-lg" /></span> Daily missions &amp; practice</div>
                <div><span className="ck"><i className="bi bi-check-lg" /></span> AI-powered feedback</div>
                <div><span className="ck"><i className="bi bi-check-lg" /></span> Track progress &amp; improve</div>
                <div><span className="ck"><i className="bi bi-check-lg" /></span> Certificates &amp; CareerPilot</div>
              </div>
            </div>
            <div className="rs-unlock-r">
              <span className="rs-offer">LIMITED TIME OFFER</span>
              <span className="rs-save">Save 66%<br />Limited Seats!</span>
              <div className="t">CareerPilot Founding Membership</div>
              <div className="price">₹{price}<small> /year</small></div>
              <div className="oneline">One-time payment · 12 months access</div>
              <div className="rs-plan">
                <div><span className="ck"><i className="bi bi-check-lg" /></span> Full 90-day journey</div>
                <div><span className="ck"><i className="bi bi-check-lg" /></span> A career coach</div>
                <div><span className="ck"><i className="bi bi-check-lg" /></span> AI assessments &amp; practice</div>
                <div><span className="ck"><i className="bi bi-check-lg" /></span> CareerPilot &amp; certificates</div>
                <div><span className="ck"><i className="bi bi-check-lg" /></span> Priority support</div>
              </div>
              {paymentOff ? (
                <div style={{ fontSize: 13, color: '#475569', textAlign: 'center' }}>Online payment isn't enabled yet — please contact your mentor to activate.</div>
              ) : (
                <button className="rs-unlock-btn" onClick={unlock} disabled={paying}>{paying ? 'Opening payment…' : 'Unlock My Journey →'}</button>
              )}
              {payMsg && <div style={{ marginTop: 12, fontSize: 13, background: '#fef2f2', border: '1px solid #fecaca', color: '#b91c1c', borderRadius: 8, padding: '8px 12px' }}>{payMsg}</div>}
              <div className="rs-guarantee"><i className="bi bi-patch-check-fill" /> 30-day money-back guarantee</div>
            </div>
          </div>
        )}

        {/* Conversion furniture — pointless once someone has bought */}
        {!isMember && (
          <>
            <div className="rs-trust"><i className="bi bi-shield-lock-fill" /> 100% secure · Your data is safe with us · Trusted by students across 200+ colleges</div>
            <div className="rs-colleges">
              <span className="lb">Trusted by students from</span>
              {[['bi-mortarboard-fill', 'VIT', 'Vellore Institute of Technology'], ['bi-mortarboard-fill', 'SRM', 'Institute of Science & Technology'], ['bi-mortarboard-fill', 'GITAM', '(Deemed to be University)'], ['bi-mortarboard-fill', 'Andhra University', 'Andhra University'], ['bi-mortarboard-fill', '200+ More Colleges', 'Across AP & Telangana']].map(([ic, nm, sub]) => (
                <div className="rs-col" key={nm}><span className="bd"><i className={`bi ${ic}`} /></span><div><b>{nm}</b><span>{sub}</span></div></div>
              ))}
            </div>
          </>
        )}

        <div className="rs-retake"><button onClick={onRetake}>↻ Retake assessment</button></div>
      </div>
  );

  // A paying member gets the rail on this screen like every other member page. A free
  // candidate keeps the standalone marketing chrome — the rail's destinations are all
  // locked to them, so it would be a menu of dead ends.
  if (isMember) return body;

  return (
    <div className="pf-shell">
      {topBrand(
        <>
          <div className="pf-spacer" />
          <button className="pf-report" onClick={() => { if (printRef.current) return; printRef.current = true; window.print(); setTimeout(() => (printRef.current = false), 800); }}><i className="bi bi-download" /> Download Report</button>
          <div className="pf-user"><span className="av">{initial}</span><div className="who"><b>Hi, {firstName}</b></div></div>
        </>
      )}
      {body}
    </div>
  );
};

export default Assessment;
