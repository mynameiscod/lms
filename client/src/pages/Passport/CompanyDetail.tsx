import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import passportApi, { CompanyDetail as Detail, TaxItem, Stat, CompanyQuestionRow } from '../../api/passportApi';
import PassportShell from './PassportShell';

/**
 * One company: what it asks, round by round.
 *
 * Laid out to the shared design — header band with the headline figures, tab bar, category
 * pills, filter row, ranked question rows, round cards, and a sticky filter/insights rail.
 *
 * The one rule the design does not dictate: NO NUMBER APPEARS WITHOUT ITS SAMPLE. Every
 * statistic arrives as { value, n } and is rendered with "from N reports" under it; a
 * figure with n = 0 is not drawn at all. A student who catches one invented number stops
 * believing the rest of the page, and this page is mostly numbers.
 */

const DIFF: Record<string, { fg: string; bg: string; dot: string }> = {
  easy:   { fg: '#166534', bg: '#dcfce7', dot: '#16a34a' },
  medium: { fg: '#92400e', bg: '#fef3c7', dot: '#f59e0b' },
  hard:   { fg: '#991b1b', bg: '#fee2e2', dot: '#dc2626' },
};
const labelOf = (list: TaxItem[], key: string) => list.find(x => x.key === key)?.label || key;

const monthYear = (iso?: string | null) =>
  iso ? new Date(iso).toLocaleDateString('en-IN', { month: 'short', year: 'numeric' }) : '—';

/** A headline figure in the header band. Renders nothing when nothing supports it. */
const HeadStat: React.FC<{ title: string; s: Stat<any>; fmt?: (v: any) => string; suffix?: string; tone?: string }> =
  ({ title, s, fmt, suffix, tone }) => {
    if (s.value === null || s.n === 0) return null;
    return (
      <div className="ci-hstat">
        <span className="k">{title}</span>
        <b style={tone ? { color: tone } : undefined}>{fmt ? fmt(s.value) : s.value}{suffix}</b>
        <em>from {s.n} {s.n === 1 ? 'report' : 'reports'}</em>
      </div>
    );
  };

type TabKey = 'overview' | 'questions' | 'rounds' | 'salary' | 'reviews' | 'tips';

const CompanyDetail: React.FC<{ slug: string }> = ({ slug }) => {
  const nav = useNavigate();
  const [d, setD] = useState<Detail | null>(null);
  const [tab, setTab] = useState<TabKey>('questions');
  const [round, setRound] = useState('');
  const [difficulty, setDifficulty] = useState('');
  const [category, setCategory] = useState('');
  const [year, setYear] = useState('');
  const [q, setQ] = useState('');
  const [sort, setSort] = useState<'asked' | 'recent' | 'difficulty'>('asked');
  const [open, setOpen] = useState<string | null>(null);
  const [saved, setSaved] = useState<string[]>([]);
  const [showAll, setShowAll] = useState(false);
  const [showExp, setShowExp] = useState(false);
  const [msg, setMsg] = useState('');
  const [err, setErr] = useState('');

  const load = useCallback(() => {
    const params: Record<string, string> = {};
    if (round) params.round = round;
    if (difficulty) params.difficulty = difficulty;
    if (category) params.category = category;
    passportApi.companyDetail(slug, params)
      .then(setD)
      .catch(e => setErr(e?.response?.data?.message || 'Could not load that company'));
  }, [slug, round, difficulty, category]);

  useEffect(() => { load(); }, [load]);

  /** Category pill counts come from the unfiltered set, so they never change as you filter. */
  const [allQs, setAllQs] = useState<CompanyQuestionRow[]>([]);
  useEffect(() => {
    passportApi.companyDetail(slug).then(r => setAllQs(r.questions)).catch(() => setAllQs([]));
  }, [slug]);

  const rows = useMemo(() => {
    if (!d) return [];
    let list = d.questions.filter(x =>
      (!year || String(x.year) === year) &&
      (!q || x.questionText.toLowerCase().includes(q.toLowerCase())
          || (x.tags || []).some(t => t.toLowerCase().includes(q.toLowerCase()))));
    if (sort === 'asked') list = [...list].sort((a, b) => (b.askedCount || 1) - (a.askedCount || 1));
    if (sort === 'recent') list = [...list].sort((a, b) => (b.year || 0) - (a.year || 0));
    if (sort === 'difficulty') {
      const w: Record<string, number> = { hard: 3, medium: 2, easy: 1 };
      list = [...list].sort((a, b) => (w[b.difficulty] || 0) - (w[a.difficulty] || 0));
    }
    return list;
  }, [d, q, year, sort]);

  const counts = useMemo(() => {
    const byCat = new Map<string, number>();
    const byDiff = new Map<string, number>();
    const byTag = new Map<string, number>();
    for (const x of allQs) {
      if (x.category) byCat.set(x.category, (byCat.get(x.category) || 0) + 1);
      byDiff.set(x.difficulty, (byDiff.get(x.difficulty) || 0) + 1);
      for (const t of x.tags || []) byTag.set(t, (byTag.get(t) || 0) + 1);
    }
    return { byCat, byDiff, byTag };
  }, [allQs]);

  const years = useMemo(
    () => Array.from(new Set(allQs.map(x => x.year).filter(Boolean))).sort((a, b) => (b as number) - (a as number)),
    [allQs]);

  const resetFilters = () => { setRound(''); setDifficulty(''); setCategory(''); setYear(''); setQ(''); };
  const toggleSave = (id: string) => setSaved(s => s.includes(id) ? s.filter(x => x !== id) : [...s, id]);

  if (err) return <PassportShell><div className="pm-msg err">{err}</div></PassportShell>;
  if (!d) return <PassportShell><div className="pm-card">Loading…</div></PassportShell>;

  const c = d.company;
  const st = d.stats;
  const visible = showAll ? rows : rows.slice(0, 5);

  return (
    <PassportShell>
      <div className="ci-crumbs">
        <button onClick={() => nav('/careerpilot/companies')}>Company Insights</button>
        <span>›</span><button onClick={() => nav('/careerpilot/companies')}>Interview Patterns</button>
        <span>›</span><b>{c.name}</b>
      </div>

      {/* ── Header band ── */}
      <div className="ci-head">
        <div className="ci-head-id">
          {c.logoUrl
            ? <img src={c.logoUrl} alt="" onError={e => { (e.currentTarget as HTMLImageElement).style.display = 'none'; }} />
            : <span className="mk">{c.name.slice(0, 2).toUpperCase()}</span>}
          <div className="tx">
            <h1>{c.name}</h1>
            {!!c.roles.length && <div className="role">{c.roles[0]}</div>}
            {st.rating.value !== null && (
              <div className="rate">
                <b>★ {st.rating.value}</b>
                <span>({st.rating.n} {st.rating.n === 1 ? 'review' : 'reviews'})</span>
              </div>
            )}
            <div className="chips">
              {c.industry && <span>{c.industry}</span>}
              {c.employeeBand && <span>{c.employeeBand}</span>}
              {c.location && <span>📍 {c.location}</span>}
            </div>
          </div>
        </div>

        <div className="ci-head-stats">
          <HeadStat title="Difficulty" s={st.difficultyFelt}
            fmt={v => String(v).charAt(0).toUpperCase() + String(v).slice(1)}
            tone={DIFF[String(st.difficultyFelt.value)]?.fg} />
          <HeadStat title="Avg Rounds" s={st.avgRounds} />
          <HeadStat title="Avg Duration" s={st.avgDurationDays} fmt={v => String(Math.max(1, Math.round(v / 7)))} suffix=" wks" />
          <HeadStat title="Offer Rate" s={st.offerRate} suffix="%" />
          {st.experiences === 0 && (
            <div className="ci-noreports">
              No interview reports yet.<br /><em>Be the first — you earn coins for it.</em>
            </div>
          )}
        </div>

        <button className="ci-follow" onClick={() => setShowExp(true)}>+ I interviewed here</button>
      </div>

      {msg && <div className="pm-msg ok">{msg}</div>}

      {/* ── Tabs ── */}
      <div className="ci-tabs">
        {([['overview', 'Overview'], ['questions', 'Questions'], ['rounds', 'By Round'],
           ['salary', 'Salary Insights'], ['reviews', 'Reviews'], ['tips', 'Tips']] as [TabKey, string][])
          .map(([k, l]) => (
            <button key={k} className={tab === k ? 'on' : ''} onClick={() => setTab(k)}>{l}</button>
          ))}
      </div>

      <div className="ci-body">
        <div className="ci-main">
          {tab === 'questions' && (
            <>
              {/* Category pills */}
              <div className="ci-pills">
                <button className={category === '' ? 'on' : ''} onClick={() => setCategory('')}>
                  All Questions ({allQs.length})
                </button>
                {d.categories.filter(cat => counts.byCat.get(cat.key)).map(cat => (
                  <button key={cat.key} className={category === cat.key ? 'on' : ''} onClick={() => setCategory(cat.key)}>
                    {cat.label} ({counts.byCat.get(cat.key)})
                  </button>
                ))}
              </div>

              {/* Filter row */}
              <div className="ci-filters">
                <input className="ci-search" placeholder="Search questions, topics or keywords…" value={q} onChange={e => setQ(e.target.value)} />
                <select value={round} onChange={e => setRound(e.target.value)}>
                  <option value="">Round: All Rounds</option>
                  {d.rounds.filter(r => (r.count || 0) > 0).map(r => <option key={r.key} value={r.key}>{r.label} ({r.count})</option>)}
                </select>
                <select value={difficulty} onChange={e => setDifficulty(e.target.value)}>
                  <option value="">Difficulty: All</option>
                  {d.difficulties.map(x => <option key={x.key} value={x.key}>{x.label}</option>)}
                </select>
                <select value={year} onChange={e => setYear(e.target.value)}>
                  <option value="">Year: All</option>
                  {years.map(y => <option key={y} value={String(y)}>{y}</option>)}
                </select>
                <button className="ci-reset" onClick={resetFilters}>↻ Reset</button>
              </div>

              <div className="ci-listhead">
                <h2>Most Asked Questions</h2>
                <label>
                  Sort by:
                  <select value={sort} onChange={e => setSort(e.target.value as any)}>
                    <option value="asked">Most Asked</option>
                    <option value="recent">Most Recent</option>
                    <option value="difficulty">Hardest First</option>
                  </select>
                </label>
              </div>

              {!rows.length && <div className="pm-card">No questions match those filters yet.</div>}

              {visible.map((x, i) => (
                <div className="ci-row" key={x.id}>
                  <div className="ci-rank">{i + 1}{(x.askedCount || 1) > 2 && <span className="hot">🔥</span>}</div>

                  <div className="ci-qtx">
                    <button className="t" onClick={() => setOpen(open === x.id ? null : x.id)}>{x.questionText}</button>
                    <div className="tags">
                      {(x.tags || []).slice(0, 3).map(t => <span key={t}>{t}</span>)}
                      {x.aiPredicted && <span className="pred" title="Generated by AI to help you prepare — not a question we have a record of being asked">AI-predicted</span>}
                    </div>
                    {open === x.id && (
                      <div className="ci-ans">
                        {x.answer ? <p>{x.answer}</p> : <p className="muted">No model answer recorded yet — try it in a mock interview.</p>}
                      </div>
                    )}
                  </div>

                  <div className="ci-col">
                    <span className="k">Asked</span>
                    {/* Only claims a frequency once more than one person has reported it. */}
                    <b>{(x.askedCount || 1) > 1 ? `${x.askedCount} times` : 'once'}</b>
                  </div>

                  <div className="ci-col">
                    <span className="k">Difficulty</span>
                    <span className="ci-diff" style={{ color: DIFF[x.difficulty]?.fg, background: DIFF[x.difficulty]?.bg }}>
                      {x.difficulty}
                    </span>
                  </div>

                  <div className="ci-col">
                    <span className="k">Last Asked</span>
                    <b>{x.year ? monthYear(x.lastAsked) !== '—' ? monthYear(x.lastAsked) : String(x.year) : '—'}</b>
                  </div>

                  <div className="ci-col wide">
                    <span className="k">Round</span>
                    <b className="round">{labelOf(d.rounds, x.round)}</b>
                  </div>

                  <div className="ci-acts">
                    {x.practiceProblemId
                      ? <button className="p" onClick={() => nav(`/careerpilot/practice/${x.practiceProblemId}`)}>Practice</button>
                      : <button className="p ghost" disabled title="No runnable problem linked to this one yet">Practice</button>}
                    <button className="v" onClick={() => setOpen(open === x.id ? null : x.id)}>
                      {open === x.id ? 'Hide' : 'View Solution'}
                    </button>
                  </div>

                  <button className={`ci-bm${saved.includes(x.id) ? ' on' : ''}`} onClick={() => toggleSave(x.id)} aria-label="Save">
                    {saved.includes(x.id) ? '🔖' : '📑'}
                  </button>
                </div>
              ))}

              {rows.length > 5 && (
                <button className="ci-viewall" onClick={() => setShowAll(s => !s)}>
                  {showAll ? 'Show top 5' : `View all ${rows.length} questions →`}
                </button>
              )}

              {/* ── Questions by round ── */}
              <div className="ci-roundshead">
                <h2>Questions by Interview Rounds</h2>
              </div>
              <div className="ci-roundgrid">
                {st.rounds.map(r => (
                  <button key={r.key} className={`ci-roundcard${round === r.key ? ' on' : ''}`}
                    onClick={() => setRound(round === r.key ? '' : r.key)}>
                    <b>{labelOf(d.rounds, r.key)}</b>
                    <span className="n">{r.questions} Question{r.questions === 1 ? '' : 's'}</span>
                    {r.attemptedPct !== null ? (
                      <>
                        <div className="bar"><i style={{ width: `${r.attemptedPct}%` }} /></div>
                        <span className="pc">{r.attemptedPct}% attempted</span>
                      </>
                    ) : (
                      <span className="na">Not yet runnable</span>
                    )}
                  </button>
                ))}
                {!st.rounds.length && <div className="pm-card">No questions filed by round yet.</div>}
              </div>
            </>
          )}

          {tab === 'overview' && (
            <div className="pm-card">
              <h3 style={{ fontSize: 15, fontWeight: 900, margin: '0 0 8px' }}>About {c.name}</h3>
              <p style={{ fontSize: 13.5, color: '#475569', lineHeight: 1.7, margin: 0 }}>
                {c.about || 'No overview published yet.'}
              </p>
              {c.website && <p style={{ marginTop: 10 }}><a href={c.website} target="_blank" rel="noreferrer">{c.website}</a></p>}
            </div>
          )}

          {tab === 'rounds' && (
            <div className="ci-roundgrid">
              {st.rounds.map(r => (
                <button key={r.key} className="ci-roundcard" onClick={() => { setRound(r.key); setTab('questions'); }}>
                  <b>{labelOf(d.rounds, r.key)}</b>
                  <span className="n">{r.questions} Question{r.questions === 1 ? '' : 's'}</span>
                  {r.attemptedPct !== null
                    ? <><div className="bar"><i style={{ width: `${r.attemptedPct}%` }} /></div><span className="pc">{r.attemptedPct}% attempted</span></>
                    : <span className="na">Not yet runnable</span>}
                </button>
              ))}
              {!st.rounds.length && <div className="pm-card">No questions filed by round yet.</div>}
            </div>
          )}

          {tab === 'salary' && (
            <div className="pm-card">
              {!c.salaryBands.length ? (
                <p style={{ margin: 0, fontSize: 13.5, color: '#64748b' }}>No salary guidance published yet.</p>
              ) : (
                <>
                  <div className="pm-msg info" style={{ marginBottom: 12 }}>
                    Indicative ranges from our placement experience — not survey data.
                  </div>
                  {c.salaryBands.map((b, i) => (
                    <div className="cd-salary" key={i}>
                      <b>{b.role}</b><span>₹{b.minLpa} – ₹{b.maxLpa} LPA</span>
                      {b.note && <em>{b.note}</em>}
                    </div>
                  ))}
                </>
              )}
            </div>
          )}

          {tab === 'reviews' && (
            <div className="pm-card">
              {st.rating.n === 0
                ? <p style={{ margin: 0, fontSize: 13.5, color: '#64748b' }}>No reviews yet — the first comes from a student who reports their interview.</p>
                : <p style={{ margin: 0, fontSize: 13.5, color: '#334155' }}>
                    <b>★ {st.rating.value}</b> average from {st.rating.n} {st.rating.n === 1 ? 'student' : 'students'} who interviewed here.
                  </p>}
            </div>
          )}

          {tab === 'tips' && (
            <div className="pm-card">
              {!c.tips.length
                ? <p style={{ margin: 0, fontSize: 13.5, color: '#64748b' }}>No tips published yet.</p>
                : <ul className="cd-tips">{c.tips.map((t, i) => <li key={i}>{t}</li>)}</ul>}
            </div>
          )}
        </div>

        {/* ── Rail ── */}
        <aside className="ci-rail">
          <div className="ci-panel">
            <div className="ci-panel-hd"><h3>Filter Questions</h3><button onClick={resetFilters}>Clear all</button></div>

            <div className="ci-sec">Rounds</div>
            <div className="ci-chips">
              <button className={round === '' ? 'on' : ''} onClick={() => setRound('')}>All</button>
              {d.rounds.filter(r => (r.count || 0) > 0).map(r => (
                <button key={r.key} className={round === r.key ? 'on' : ''} onClick={() => setRound(r.key)}>{r.label}</button>
              ))}
            </div>

            <div className="ci-sec">Difficulty</div>
            {d.difficulties.map(x => (
              <label className="ci-check" key={x.key}>
                <input type="checkbox" checked={difficulty === x.key}
                  onChange={() => setDifficulty(difficulty === x.key ? '' : x.key)} />
                <i style={{ background: DIFF[x.key]?.dot }} />
                <span>{x.label}</span>
                <em>({counts.byDiff.get(x.key) || 0})</em>
              </label>
            ))}

            {!!counts.byTag.size && (
              <>
                <div className="ci-sec">Topics</div>
                {Array.from(counts.byTag.entries()).sort((a, b) => b[1] - a[1]).slice(0, 6).map(([t, n]) => (
                  <label className="ci-check" key={t}>
                    <input type="checkbox" checked={q === t} onChange={() => setQ(q === t ? '' : t)} />
                    <span>{t}</span><em>({n})</em>
                  </label>
                ))}
              </>
            )}

            <div className="ci-sec">Year</div>
            <select className="ci-railsel" value={year} onChange={e => setYear(e.target.value)}>
              <option value="">All Years</option>
              {years.map(y => <option key={y} value={String(y)}>{y}</option>)}
            </select>
          </div>

          <div className="ci-panel">
            <h3 style={{ margin: '0 0 10px' }}>Question Bank Insights</h3>
            <div className="ci-insight"><span>Total Questions</span><b>{st.totals.questions}</b></div>
            <div className="ci-insight">
              <span>Asked in {new Date().getFullYear()}</span>
              <b>{st.totals.askedThisYear}
                {st.totals.questions > 0 && <em> ({Math.round((st.totals.askedThisYear / st.totals.questions) * 100)}%)</em>}
              </b>
            </div>
            <div className="ci-insight"><span>Interview reports</span><b>{st.experiences}</b></div>
            {st.totals.avgSuccessRate.value !== null && (
              <div className="ci-insight">
                <span>Solved by our students</span>
                <b>{st.totals.avgSuccessRate.value}%</b>
                <div className="bar"><i style={{ width: `${st.totals.avgSuccessRate.value}%` }} /></div>
              </div>
            )}
          </div>

          <div className="ci-panel ci-cta">
            <b>Interviewed here?</b>
            <p>Your report is what gives the next student real numbers instead of guesses.</p>
            <button onClick={() => setShowExp(true)}>Share your experience</button>
          </div>
        </aside>
      </div>

      {showExp && (
        <ExperienceForm slug={slug} rounds={d.rounds}
          onClose={() => setShowExp(false)}
          onDone={m => { setShowExp(false); setMsg(m); load(); }} />
      )}
    </PassportShell>
  );
};

/** "I interviewed here" — the input behind almost every number on this page. */
const ExperienceForm: React.FC<{
  slug: string; rounds: TaxItem[]; onClose: () => void; onDone: (msg: string) => void;
}> = ({ slug, rounds, onClose, onDone }) => {
  const [f, setF] = useState({ role: '', interviewedOn: '', durationDays: '', outcome: 'waiting', difficultyFelt: '', rating: '', review: '' });
  const [picked, setPicked] = useState<string[]>([]);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState('');

  const submit = async () => {
    setBusy(true); setErr('');
    try {
      const r = await passportApi.submitExperience(slug, {
        ...f, roundsFaced: picked,
        durationDays: Number(f.durationDays) || undefined,
        rating: Number(f.rating) || undefined,
      });
      onDone(r.message);
    } catch (e: any) { setErr(e?.response?.data?.message || 'Could not submit'); }
    setBusy(false);
  };

  return (
    <div className="cd-modal" onClick={onClose}>
      <div className="cd-modal-in" onClick={e => e.stopPropagation()}>
        <h3>You interviewed here — what happened?</h3>
        <p className="lead">
          This is what turns the page from a list of questions into numbers the next student
          can rely on. Reviewed before it goes live; you earn coins when it does.
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
            <button key={r.key} className={picked.includes(r.key) ? 'on' : ''}
              onClick={() => setPicked(p => p.includes(r.key) ? p.filter(x => x !== r.key) : [...p, r.key])}>
              {r.label}
            </button>
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
