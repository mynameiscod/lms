import React, { useCallback, useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import passportApi, { CompanyDetail as Detail, TaxItem, Stat } from '../../api/passportApi';
import PassportShell from './PassportShell';

/**
 * One company: what it asks, round by round, and what students who went through it say.
 *
 * The governing rule is that NO NUMBER APPEARS WITHOUT ITS SAMPLE. Every statistic arrives
 * as { value, n } and renders as "5.6 · from 3 reports". A figure with n = 0 is not shown
 * at all — an empty slot is honest, an invented number is not, and a student who catches
 * one fabricated stat stops believing the rest of the page.
 */

const DIFF_COLOR: Record<string, string> = { easy: '#16a34a', medium: '#b45309', hard: '#b91c1c' };
const label = (list: TaxItem[], key: string) => list.find(x => x.key === key)?.label || key;

/** A headline figure. Renders nothing when there is nothing behind it. */
const StatChip: React.FC<{ title: string; s: Stat<any>; fmt?: (v: any) => string; unit?: string }> =
  ({ title, s, fmt, unit }) => {
    if (s.value === null || s.n === 0) return null;
    return (
      <div className="cd-stat">
        <span className="t">{title}</span>
        <b>{fmt ? fmt(s.value) : s.value}{unit}</b>
        {/* The sample size is not fine print — it is what makes the number honest. */}
        <em>from {s.n} {s.n === 1 ? 'report' : 'reports'}</em>
      </div>
    );
  };

const CompanyDetail: React.FC<{ slug: string }> = ({ slug }) => {
  const nav = useNavigate();
  const [d, setD] = useState<Detail | null>(null);
  const [tab, setTab] = useState<'questions' | 'rounds' | 'salary' | 'tips'>('questions');
  const [round, setRound] = useState('');
  const [difficulty, setDifficulty] = useState('');
  const [q, setQ] = useState('');
  const [open, setOpen] = useState<string | null>(null);
  const [err, setErr] = useState('');
  const [msg, setMsg] = useState('');
  const [showExp, setShowExp] = useState(false);

  const load = useCallback(() => {
    const params: Record<string, string> = {};
    if (round) params.round = round;
    if (difficulty) params.difficulty = difficulty;
    passportApi.companyDetail(slug, params)
      .then(setD)
      .catch(e => setErr(e?.response?.data?.message || 'Could not load that company'));
  }, [slug, round, difficulty]);

  useEffect(() => { load(); }, [load]);

  if (err) return <PassportShell><div className="pm-msg err">{err}</div></PassportShell>;
  if (!d) return <PassportShell><div className="pm-card">Loading…</div></PassportShell>;

  const c = d.company;
  const st = d.stats;
  const shown = d.questions.filter(x => !q || x.questionText.toLowerCase().includes(q.toLowerCase()));

  return (
    <PassportShell>
      <button className="pm-btn ghost" onClick={() => nav('/careerpilot/companies')} style={{ marginBottom: 10 }}>← All companies</button>

      {/* ── Header ── */}
      <div className="cd-head">
        <div className="cd-id">
          {c.logoUrl
            ? <img src={c.logoUrl} alt="" onError={e => { (e.currentTarget as HTMLImageElement).style.display = 'none'; }} />
            : <span className="mk">{c.name.slice(0, 2).toUpperCase()}</span>}
          <div>
            <h1>{c.name}</h1>
            <div className="cd-tags">
              {c.industry && <span>{c.industry}</span>}
              {c.employeeBand && <span>{c.employeeBand}</span>}
              {c.location && <span>📍 {c.location}</span>}
            </div>
          </div>
        </div>

        <div className="cd-stats">
          <StatChip title="Rating" s={st.rating} unit="/5" />
          <StatChip title="Avg rounds" s={st.avgRounds} />
          <StatChip title="Avg duration" s={st.avgDurationDays} fmt={v => String(Math.round(v / 7))} unit=" wks" />
          <StatChip title="Offer rate" s={st.offerRate} unit="%" />
          <StatChip title="Felt" s={st.difficultyFelt} />
          {/* When nothing has been reported yet, say so rather than showing zeros. */}
          {st.experiences === 0 && (
            <div className="cd-nostats">
              No interview reports yet — be the first and earn coins.
            </div>
          )}
        </div>
      </div>

      {msg && <div className="pm-msg ok">{msg}</div>}

      <div className="cd-tabs">
        {([['questions', `Questions (${st.totals.questions})`], ['rounds', 'By round'], ['salary', 'Salary'], ['tips', 'Tips']] as const)
          .map(([k, l]) => (
            <button key={k} className={tab === k ? 'on' : ''} onClick={() => setTab(k as any)}>{l}</button>
          ))}
        <button className="cd-add" onClick={() => setShowExp(true)}>+ I interviewed here</button>
      </div>

      {tab === 'questions' && (
        <>
          <div className="cd-filters">
            <input className="cq-input" placeholder="Search questions…" value={q} onChange={e => setQ(e.target.value)} />
            <select className="cq-input" value={round} onChange={e => setRound(e.target.value)}>
              <option value="">All rounds</option>
              {d.rounds.filter(r => (r.count || 0) > 0).map(r => <option key={r.key} value={r.key}>{r.label} ({r.count})</option>)}
            </select>
            <select className="cq-input" value={difficulty} onChange={e => setDifficulty(e.target.value)}>
              <option value="">Any difficulty</option>
              {d.difficulties.map(x => <option key={x.key} value={x.key}>{x.label}</option>)}
            </select>
          </div>

          <div className="cd-bank">
            <span><b>{st.totals.questions}</b> questions</span>
            <span><b>{st.totals.askedThisYear}</b> asked this year</span>
            {st.totals.avgSuccessRate.value !== null && (
              <span><b>{st.totals.avgSuccessRate.value}%</b> solved by our students <em>({st.totals.avgSuccessRate.n} runnable)</em></span>
            )}
          </div>

          {!shown.length && <div className="pm-card">Nothing here yet for these filters.</div>}

          {shown.map(x => (
            <div className="cq-q" key={x.id}>
              <button className="cq-q-head" onClick={() => setOpen(open === x.id ? null : x.id)}>
                <span className="tx">{x.questionText}</span>
                <span className="chev">{open === x.id ? '▲' : '▼'}</span>
              </button>
              <div className="cq-q-meta">
                <span className="rd">{label(d.rounds, x.round)}</span>
                {x.category && <span className="cat">{label(d.categories, x.category)}</span>}
                <span className="diff" style={{ color: DIFF_COLOR[x.difficulty] || '#64748b' }}>{x.difficulty}</span>
                {/* Only claim a frequency once more than one person has reported it. */}
                {(x.askedCount || 1) > 1 && <span className="freq">asked {x.askedCount}×</span>}
                {x.year && <span className="yr">{x.year}</span>}
                {x.aiPredicted && <span className="pred" title="Generated by AI to help you prepare — not a question we have a record of being asked">AI-predicted</span>}
                {x.practiceProblemId && (
                  <button className="solve" onClick={() => nav(`/careerpilot/practice/${x.practiceProblemId}`)}>▶ Solve it</button>
                )}
              </div>
              {open === x.id && (
                <div className="cq-q-body">
                  {x.answer ? <p>{x.answer}</p> : <p className="muted">No model answer recorded yet — try it in a mock interview.</p>}
                </div>
              )}
            </div>
          ))}
        </>
      )}

      {tab === 'rounds' && (
        <div className="cd-rounds">
          {!st.rounds.length && <div className="pm-card">No questions filed by round yet.</div>}
          {st.rounds.map(r => (
            <button key={r.key} className="cd-round" onClick={() => { setRound(r.key); setTab('questions'); }}>
              <b>{label(d.rounds, r.key)}</b>
              <span>{r.questions} question{r.questions === 1 ? '' : 's'}</span>
              {/* null means "none of these are runnable", which is not the same as 0%. */}
              {r.attemptedPct !== null
                ? <div className="bar"><i style={{ width: `${r.attemptedPct}%` }} /><em>{r.attemptedPct}% attempted</em></div>
                : <em className="na">Not yet runnable</em>}
            </button>
          ))}
        </div>
      )}

      {tab === 'salary' && (
        <div className="pm-card">
          {!c.salaryBands.length ? (
            <p style={{ margin: 0, fontSize: 13.5, color: '#64748b' }}>No salary guidance published for this company yet.</p>
          ) : (
            <>
              {/* Stated plainly, because these are estimates from placement experience and
                  not a salary survey. Letting a student assume otherwise would be the
                  dishonest part. */}
              <div className="pm-msg info" style={{ marginBottom: 12 }}>
                Indicative ranges from our placement experience — not survey data.
              </div>
              {c.salaryBands.map((b, i) => (
                <div className="cd-salary" key={i}>
                  <b>{b.role}</b>
                  <span>₹{b.minLpa} – ₹{b.maxLpa} LPA</span>
                  {b.note && <em>{b.note}</em>}
                </div>
              ))}
            </>
          )}
        </div>
      )}

      {tab === 'tips' && (
        <div className="pm-card">
          {!c.tips.length
            ? <p style={{ margin: 0, fontSize: 13.5, color: '#64748b' }}>No tips published yet.</p>
            : <ul className="cd-tips">{c.tips.map((t, i) => <li key={i}>{t}</li>)}</ul>}
        </div>
      )}

      {showExp && (
        <ExperienceForm
          slug={slug}
          rounds={d.rounds}
          onClose={() => setShowExp(false)}
          onDone={m => { setShowExp(false); setMsg(m); load(); }}
        />
      )}
    </PassportShell>
  );
};

/** "I interviewed here" — the input behind almost every number on this page. */
const ExperienceForm: React.FC<{
  slug: string; rounds: TaxItem[]; onClose: () => void; onDone: (msg: string) => void;
}> = ({ slug, rounds, onClose, onDone }) => {
  const [f, setF] = useState({
    role: '', interviewedOn: '', durationDays: '', outcome: 'waiting',
    difficultyFelt: '', rating: '', review: '',
  });
  const [picked, setPicked] = useState<string[]>([]);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState('');

  const submit = async () => {
    setBusy(true); setErr('');
    try {
      const r = await passportApi.submitExperience(slug, {
        ...f,
        roundsFaced: picked,
        durationDays: Number(f.durationDays) || undefined,
        rating: Number(f.rating) || undefined,
      });
      onDone(r.message);
    } catch (e: any) {
      setErr(e?.response?.data?.message || 'Could not submit');
    }
    setBusy(false);
  };

  return (
    <div className="cd-modal" onClick={onClose}>
      <div className="cd-modal-in" onClick={e => e.stopPropagation()}>
        <h3>You interviewed here — what happened?</h3>
        <p className="lead">
          This is what turns this page from a list of questions into something the next
          student can rely on. Reviewed before it goes live; you earn coins when it does.
        </p>

        <label>Role</label>
        <input className="cq-input" value={f.role} placeholder="e.g. Software Engineer"
          onChange={e => setF(v => ({ ...v, role: e.target.value }))} />

        <label>When did you interview?</label>
        <input className="cq-input" type="date" value={f.interviewedOn}
          onChange={e => setF(v => ({ ...v, interviewedOn: e.target.value }))} />

        <label>Which rounds did you face?</label>
        <div className="cd-pick">
          {rounds.map(r => (
            <button
              key={r.key}
              className={picked.includes(r.key) ? 'on' : ''}
              onClick={() => setPicked(p => p.includes(r.key) ? p.filter(x => x !== r.key) : [...p, r.key])}
            >{r.label}</button>
          ))}
        </div>

        <div className="cd-form-row">
          <div>
            <label>How long, start to finish? (days)</label>
            <input className="cq-input" inputMode="numeric" value={f.durationDays}
              onChange={e => setF(v => ({ ...v, durationDays: e.target.value }))} />
          </div>
          <div>
            <label>Outcome</label>
            <select className="cq-input" value={f.outcome} onChange={e => setF(v => ({ ...v, outcome: e.target.value }))}>
              <option value="waiting">Still waiting</option>
              <option value="offer">Got an offer</option>
              <option value="rejected">Rejected</option>
              <option value="withdrew">I withdrew</option>
            </select>
          </div>
        </div>

        <div className="cd-form-row">
          <div>
            <label>How hard did it feel?</label>
            <select className="cq-input" value={f.difficultyFelt} onChange={e => setF(v => ({ ...v, difficultyFelt: e.target.value }))}>
              <option value="">Prefer not to say</option>
              <option value="easy">Easy</option><option value="medium">Medium</option><option value="hard">Hard</option>
            </select>
          </div>
          <div>
            <label>Rate the experience (1–5)</label>
            <select className="cq-input" value={f.rating} onChange={e => setF(v => ({ ...v, rating: e.target.value }))}>
              <option value="">—</option>
              {[1, 2, 3, 4, 5].map(n => <option key={n} value={n}>{n}</option>)}
            </select>
          </div>
        </div>

        <label>Anything else worth telling the next person?</label>
        <textarea className="cq-input" style={{ minHeight: 80 }} value={f.review}
          onChange={e => setF(v => ({ ...v, review: e.target.value }))} />

        {err && <div className="pm-msg err" style={{ marginTop: 10 }}>{err}</div>}

        <div style={{ display: 'flex', gap: 8, marginTop: 14 }}>
          <button className="pm-btn primary" disabled={busy || !f.interviewedOn || !picked.length} onClick={submit}>
            {busy ? 'Sending…' : 'Submit'}
          </button>
          <button className="pm-btn ghost" onClick={onClose}>Cancel</button>
        </div>
      </div>
    </div>
  );
};

export default CompanyDetail;
