import React, { useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import passportApi, { AssessQuestion, AssessResult } from '../../api/passportApi';
import { useAuth } from '../../contexts/AuthContext';
import MemberShell from './MemberShell';
import './assessment.css';

/**
 * Career Readiness Assessment — the free deterministic entry point (CareerPilot).
 * Student answers the MCQ bank one at a time; on submit we score server-side and show the
 * Career Score, category breakdown, strengths/gaps, recommended pathway, 7-day preview + ₹499 CTA.
 */
const CAT_ICON: Record<string, string> = {
  career_clarity: '🎯', aptitude: '🔢', logical_reasoning: '🧩',
  technical: '💻', communication: '🗣️', employability: '💼',
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

const SIDE_FEATS: { ic: string; bg: string; title: string; desc: string }[] = [
  { ic: '🎯', bg: '#e7f8f0', title: 'Discover Your Path', desc: 'Find the career roles that match your strengths and interests.' },
  { ic: '📈', bg: '#e6f2ff', title: 'Know Your Score', desc: 'Get your Career Readiness Score across key areas.' },
  { ic: '🗺️', bg: '#fff2e3', title: 'Personalized Roadmap', desc: 'Receive a 90-day plan tailored to your academic year and goals.' },
  { ic: '⚡', bg: '#efeaff', title: 'Take Daily Action', desc: 'Unlock daily missions, resources, and expert guidance.' },
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

  const total = questions.length;
  const answeredCount = Object.keys(answers).length;
  const current = questions[idx];
  const progress = total ? Math.round(((idx + 1) / total) * 100) : 0;
  const canSubmit = answeredCount === total && total > 0;

  const submit = async () => {
    setSubmitting(true); setError('');
    try {
      const payload = Object.entries(answers).map(([questionId, chosen]) => ({ questionId, chosen }));
      const { result: r } = await passportApi.submitAssessment(payload);
      setResult(r); setRetake(false);
    } catch (e: any) { setError(e?.response?.data?.message || 'Submit failed. Try again.'); }
    setSubmitting(false);
  };

  const Top = (progressUI: React.ReactNode) => (
    <div className="pf-top"><div className="pf-top-in">
      <div className="pf-brand"><span className="mark">🧭</span><div className="bt"><b>Career<span className="p">Pilot</span></b><small>Powered by CodeBegun</small></div></div>
      <button className="pf-back" onClick={() => nav('/passport')}>← Mission Control</button>
      {progressUI}
    </div></div>
  );

  if (loading) return <div className="pf-shell">{Top(<div className="pf-spacer" />)}<div style={{ textAlign: 'center', color: '#64748b', padding: 80 }}>Loading…</div></div>;

  if (result && !retake) return <ResultView result={result} firstName={firstName} initial={initial} onRetake={startFresh} onHome={() => nav('/passport')} topBrand={Top} />;

  return (
    <div className="pf-shell">
      {Top(
        <>
          <div className="pf-progress">
            <div className="col"><div className="lbl">Assessment Progress</div><div className="track"><i style={{ width: `${progress}%` }} /></div></div>
            <div className="pct">{progress}%</div>
          </div>
          <div className={`pf-timer${secsLeft <= 60 ? ' low' : ''}`}><span className="ic">⏱️</span><div><b>{fmt(secsLeft)}</b><small>Time Left</small></div></div>
          <div className="pf-user"><span className="av">{initial}</span><div className="who"><b>Hi, {firstName}</b><small>Keep going!</small></div></div>
        </>
      )}

      <div className="as-wrap">
        {/* Left sidebar */}
        <aside className="as-side">
          <h2>Your Career <span className="b">Journey Starts Here</span></h2>
          <div className="rule" />
          <div className="intro">This assessment will help us understand your strengths, interests, and skills to create your personalized career roadmap.</div>
          <div className="as-feats">
            {SIDE_FEATS.map(f => (
              <div className="as-feat" key={f.title}><span className="ic" style={{ background: f.bg }}>{f.ic}</span><div><b>{f.title}</b><span>{f.desc}</span></div></div>
            ))}
          </div>
          <div className="as-safe">
            <span className="sh">🛡️</span>
            <div><b>Your Data is Safe</b><span>We never share your answers with anyone. Your privacy is 100% protected.</span></div>
            <span className="lock">🔒</span>
          </div>
        </aside>

        {/* Main */}
        <main className="as-main">
          <div className="as-banner">
            <span className="bic">✨</span>
            <div><b>Answer honestly. There are no wrong answers.</b><span>We just want to understand you better.</span></div>
            <span className="bimg">🎯</span>
          </div>

          {error && <div className="as-err">{error}</div>}

          {current && (
            <div className="as-card">
              <div className="as-qhead">
                <span className="as-cat">{CAT_ICON[current.category] || '•'} {prettyCat(current.category)}</span>
                <span className="as-qnum">Question {idx + 1} of {total}</span>
              </div>
              <h2 className="as-q">{current.text}</h2>
              <p className="as-qsub">{CAT_HELP[current.category] || 'Choose the option that best describes you.'}</p>
              <div className="as-opts">
                {current.options.map((opt, i) => {
                  const sel = answers[current.id] === i;
                  const [head, ...restp] = String(opt).split(/\s[—–-]\s|:\s/);
                  const sub = restp.join(' ').trim();
                  return (
                    <button key={i} className={`as-opt${sel ? ' sel' : ''}`} onClick={() => setAnswers(a => ({ ...a, [current.id]: i }))}>
                      <span className="radio" />
                      <span className="ltr">{String.fromCharCode(65 + i)}</span>
                      <span className="otxt"><b>{head}</b>{sub && <span>{sub}</span>}</span>
                    </button>
                  );
                })}
              </div>
              <div className="as-nav">
                <button className="as-btn-back" disabled={idx === 0} onClick={() => setIdx(i => Math.max(0, i - 1))}>← Back</button>
                {idx < total - 1 ? (
                  <button className="as-btn-next" disabled={answers[current.id] === undefined} onClick={() => setIdx(i => i + 1)}>Next →</button>
                ) : (
                  <button className="as-btn-next" disabled={!canSubmit || submitting} onClick={submit}>{submitting ? 'Scoring…' : 'See my Career Score →'}</button>
                )}
              </div>
              {!canSubmit && idx === total - 1 && <div style={{ textAlign: 'right', fontSize: 12, color: '#94a3b8', marginTop: 8 }}>Answer all {total} questions to submit ({answeredCount}/{total}).</div>}
            </div>
          )}

          <div className="as-tip">
            <span className="ic">⭐</span>
            <div><b>Tip: There are no right or wrong answers.</b><span>Be honest so we can give you the best guidance.</span></div>
          </div>
        </main>
      </div>
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

  const body = (
      <div className="rs-wrap">
        <div className="rs-hi">
          <h1>Great start, {firstName}! 🎉</h1>
          <p>You've just discovered your Career Score. This is the first step towards your dream career.</p>
        </div>

        {/* Score summary */}
        <div className="rs-card">
          <div className="rs-score">
            <div>
              <div className="lbl">Your Career Score</div>
              <div className="big">{score}<small> /100</small></div>
              <span className="rs-badge" style={{ background: scoreBand.color + '1a', color: scoreBand.color }}>{result.level} ✓</span>
              <div className="enc">{encourage}</div>
            </div>
            <div className="rs-gauge">
              <svg width="150" height="150">
                <circle cx="75" cy="75" r="62" fill="none" stroke="#eef1f6" strokeWidth="13" />
                <circle cx="75" cy="75" r="62" fill="none" stroke="#6650d8" strokeWidth="13" strokeLinecap="round" strokeDasharray={`${dash} ${circumference}`} transform="rotate(-90 75 75)" />
              </svg>
              <div className="ctr"><b>{score}</b><span>/ 100</span></div>
            </div>
            <div className="rs-path">
              <div className="k">Recommended pathway</div>
              <div className="sub">Your best-fit direction</div>
              <span className="chip">🚀 {result.pathwayLabel}</span>
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
                <div className="nm">{CAT_ICON[c.key] || '•'} {c.label}</div>
                <div className="track"><i style={{ width: `${c.score}%`, background: b.color }} /></div>
                <div className="pct">{c.score}%</div>
                <div className="tag" style={{ color: b.color }}>{b.tag}</div>
              </div>
            );
          })}
        </div>

        {/* Strengths / focus */}
        <div className="rs-two">
          <div className="rs-card">
            <div className="rs-sec-h">Your Top Strengths 💪</div>
            <div className="rs-list">
              {result.strengths.map((s, i) => (
                <div className="rs-li" key={i}><span className="ic" style={{ background: '#e7f8f0' }}>✓</span><div><b>{s}</b></div></div>
              ))}
            </div>
          </div>
          <div className="rs-card">
            <div className="rs-sec-h">Focus Areas 🎯</div>
            <div className="rs-list">
              {result.weaknesses.map((s, i) => (
                <div className="rs-li" key={i}><span className="ic" style={{ background: '#fff2e3' }}>!</span><div><b>{s}</b></div></div>
              ))}
            </div>
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

        {/* Unlock — never pitched to someone who has already paid */}
        {isMember ? (
          <div className="rs-done">
            <div className="em">🎫</div>
            <h3>You're a CareerPilot member.</h3>
            <p>This is your latest result. Your roadmap, Practice Lab, mock interviews and Resume Center are all unlocked.</p>
            <button onClick={onHome}>Go to Coding Home →</button>
          </div>
        ) : unlocked ? (
          <div className="rs-done">
            <div className="em">🎉</div>
            <h3>You're in! Membership activated.</h3>
            <p>Your personalized daily missions are ready.</p>
            <button onClick={onHome}>Go to Mission Control →</button>
          </div>
        ) : (
          <div className="rs-unlock">
            <div className="rs-unlock-l">
              <h3>Unlock your full 90-day <span className="y">career transformation!</span></h3>
              <div className="rs-uf">
                <div><span className="ck">✓</span> Personalized 90-day roadmap</div>
                <div><span className="ck">✓</span> Daily missions &amp; practice</div>
                <div><span className="ck">✓</span> AI-powered feedback</div>
                <div><span className="ck">✓</span> Track progress &amp; improve</div>
                <div><span className="ck">✓</span> Certificates &amp; Career Passport</div>
              </div>
            </div>
            <div className="rs-unlock-r">
              <span className="rs-offer">LIMITED TIME OFFER</span>
              <span className="rs-save">Save 66%<br />Limited Seats!</span>
              <div className="t">CareerPilot Founding Membership</div>
              <div className="price">₹{price}<small> /year</small></div>
              <div className="oneline">One-time payment · 12 months access</div>
              <div className="rs-plan">
                <div><span className="ck">✓</span> Full 90-day journey</div>
                <div><span className="ck">✓</span> A career coach</div>
                <div><span className="ck">✓</span> AI assessments &amp; practice</div>
                <div><span className="ck">✓</span> Career Passport &amp; certificates</div>
                <div><span className="ck">✓</span> Priority support</div>
              </div>
              {paymentOff ? (
                <div style={{ fontSize: 13, color: '#475569', textAlign: 'center' }}>Online payment isn't enabled yet — please contact your mentor to activate.</div>
              ) : (
                <button className="rs-unlock-btn" onClick={unlock} disabled={paying}>{paying ? 'Opening payment…' : 'Unlock My Journey →'}</button>
              )}
              {payMsg && <div style={{ marginTop: 12, fontSize: 13, background: '#fef2f2', border: '1px solid #fecaca', color: '#b91c1c', borderRadius: 8, padding: '8px 12px' }}>{payMsg}</div>}
              <div className="rs-guarantee">🔒 30-day money-back guarantee</div>
            </div>
          </div>
        )}

        {/* Conversion furniture — pointless once someone has bought */}
        {!isMember && (
          <>
            <div className="rs-trust">🔒 100% secure · Your data is safe with us · Trusted by 12,000+ students across 200+ colleges</div>
            <div className="rs-colleges">
              <span className="lb">Trusted by students from</span>
              {[['🎓', 'VIT', 'Vellore Institute of Technology'], ['🎓', 'SRM', 'Institute of Science & Technology'], ['🎓', 'GITAM', '(Deemed to be University)'], ['🎓', 'Andhra University', 'Andhra University'], ['🏛️', '200+ More Colleges', 'Across AP & Telangana']].map(([ic, nm, sub]) => (
                <div className="rs-col" key={nm}><span className="bd">{ic}</span><div><b>{nm}</b><span>{sub}</span></div></div>
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
  if (isMember) return <MemberShell>{body}</MemberShell>;

  return (
    <div className="pf-shell">
      {topBrand(
        <>
          <div className="pf-spacer" />
          <button className="pf-report" onClick={() => { if (printRef.current) return; printRef.current = true; window.print(); setTimeout(() => (printRef.current = false), 800); }}>⬇ Download Report</button>
          <div className="pf-user"><span className="av">{initial}</span><div className="who"><b>Hi, {firstName}</b></div></div>
        </>
      )}
      {body}
    </div>
  );
};

export default Assessment;
