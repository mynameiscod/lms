import React, { useCallback, useEffect, useRef, useState } from 'react';
import { useParams } from 'react-router-dom';
import { hackathonExamAdminApi as api } from '../../api/hackathonExamApi';
import './hackathonExamAdmin.css';

/**
 * Running the hackathon exam — one screen, three states of the same event.
 *
 * SETUP is the question plan and the rules. LIVE is where every candidate is right now.
 * RESULTS is the leaderboard and the decision to publish it.
 *
 * ── THE ORDER IS ENFORCED, NOT SUGGESTED ──────────────────────────────────────────────────
 *
 * Coverage before papers, papers before invitations, grading before publishing. The server
 * refuses each step out of order; this screen shows WHY it would refuse, before the admin
 * presses anything — a 409 in front of 800 people is a worse way to learn it.
 *
 * ── LIVE POLLS, AND SAYS WHEN IT LAST LOOKED ──────────────────────────────────────────────
 *
 * An admin watching a dashboard needs to know whether a number is current or stale, because
 * the one thing worse than "42 started" is "42 started" from four minutes ago.
 */

type Tab = 'setup' | 'live' | 'results';

const fmt = (iso?: string | null) =>
  iso ? new Date(iso).toLocaleString('en-IN', { dateStyle: 'medium', timeStyle: 'short' }) : '—';

const toLocalInput = (iso?: string | null): string => {
  if (!iso) return '';
  const d = new Date(iso);
  if (isNaN(d.getTime())) return '';
  const p = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}T${p(d.getHours())}:${p(d.getMinutes())}`;
};
const fromLocalInput = (v: string): string | null => (v ? new Date(v).toISOString() : null);

const mins = (n: number) => (n >= 1440 ? `${Math.round(n / 1440)}d` : n >= 60 ? `${Math.round(n / 60)}h` : `${n}m`);

const emptySection = (key: string) => ({
  key, label: '', types: ['mcq'], drawCount: 10,
  dimensions: [], tags: [], languages: [],
  minDifficulty: 1, maxDifficulty: 5, marksPerItem: 0,
});

const HackathonExamAdmin: React.FC = () => {
  const { hackathonId = '' } = useParams();
  const [tab, setTab] = useState<Tab>('setup');
  const [exam, setExam] = useState<any>(null);
  const [form, setForm] = useState<any>(null);
  const [coverage, setCoverage] = useState<any>(null);
  const [readiness, setReadiness] = useState<any>(null);
  const [dash, setDash] = useState<any>(null);
  const [rows, setRows] = useState<any[]>([]);
  const [board, setBoard] = useState<any[]>([]);
  const [filter, setFilter] = useState<{ status?: string; flagged?: string; search?: string }>({});
  const [msg, setMsg] = useState('');
  const [err, setErr] = useState('');
  const [busy, setBusy] = useState('');
  const [lastAt, setLastAt] = useState<Date | null>(null);

  const examId = exam?._id;
  const say = (m: string) => { setMsg(m); setErr(''); setTimeout(() => setMsg(''), 6000); };
  const oops = (e: any) => { setErr(e?.message || 'Something went wrong'); setMsg(''); };

  const load = useCallback(async () => {
    try {
      const e = await api.get(hackathonId);
      setExam(e);
      setForm(e ? JSON.parse(JSON.stringify(e)) : {
        title: '', instructions: '', startAt: '', endAt: '',
        durationMins: 60, joinCutoffMins: 15, navigation: 'free',
        sections: [{ ...emptySection('mcq'), label: 'Multiple choice', drawCount: 30 },
          { ...emptySection('code'), label: 'Coding', types: ['live_code'], drawCount: 1, marksPerItem: 20 }],
        runPolicy: { enabled: true, maxRunsPerQuestion: 10, cooldownSeconds: 5, maxSampleCases: 2 },
        proctoring: {
          tabSwitch: { enabled: true, maxWarnings: 3, autoSubmit: true },
          fullscreen: { required: true, maxExits: 3, autoSubmit: false },
          copyPasteBlocked: true, camera: { enabled: false, snapshotEverySec: 0 }, clusterDetection: true,
        },
        reminders: [
          { minutesBefore: 1440, channels: ['email', 'whatsapp'] },
          { minutesBefore: 720, channels: ['email', 'whatsapp'] },
          { minutesBefore: 180, channels: ['whatsapp'] },
          { minutesBefore: 60, channels: ['email', 'whatsapp'] },
          { minutesBefore: 0, channels: ['whatsapp'] },
        ],
        inviteChannels: ['email', 'whatsapp'],
        resultChannels: ['email', 'whatsapp'],
        teamScoreDenominator: 'registered',
      });
      if (e?._id) {
        const [c, r] = await Promise.all([api.coverage(e._id), api.readiness(e._id)]);
        setCoverage(c); setReadiness(r);
      }
    } catch (e) { oops(e); }
  }, [hackathonId]);

  useEffect(() => { load(); }, [load]);

  /* Live view polls; a stale number on a dashboard is worse than no number. */
  const pollRef = useRef<any>(null);
  useEffect(() => {
    if (tab !== 'live' || !examId) return;
    const pull = async () => {
      try {
        const [d, list] = await Promise.all([
          api.dashboard(examId),
          api.attempts(examId, filter as any),
        ]);
        setDash(d); setRows(list); setLastAt(new Date());
      } catch (e) { oops(e); }
    };
    pull();
    pollRef.current = setInterval(pull, 8000);
    return () => clearInterval(pollRef.current);
  }, [tab, examId, filter]);

  useEffect(() => {
    if (tab !== 'results' || !examId) return;
    api.leaderboard(examId).then(setBoard).catch(oops);
  }, [tab, examId]);

  const act = async (name: string, fn: () => Promise<any>, after?: (r: any) => void) => {
    setBusy(name); setErr('');
    try { const r = await fn(); after?.(r); await load(); }
    catch (e) { oops(e); } finally { setBusy(''); }
  };

  const up = (patch: any) => setForm((f: any) => ({ ...f, ...patch }));
  const upSection = (i: number, patch: any) =>
    setForm((f: any) => ({ ...f, sections: f.sections.map((s: any, j: number) => (j === i ? { ...s, ...patch } : s)) }));

  if (!form) return <div className="hxa-page"><div className="hxa-msg">Loading…</div></div>;

  const t = dash?.totals;

  return (
    <div className="hxa-page">
      <div className="hxa-head">
        <div>
          <h1>{exam?.title || 'Hackathon exam'}</h1>
          <p>
            {exam
              ? <>Status <b className={`hxa-pill ${exam.status}`}>{exam.status}</b> · {fmt(exam.startAt)} → {fmt(exam.endAt)}</>
              : 'Not configured yet. Set the window and the question plan below.'}
          </p>
        </div>
        <div className="hxa-tabs">
          {(['setup', 'live', 'results'] as Tab[]).map((x) => (
            <button key={x} className={tab === x ? 'on' : ''} onClick={() => setTab(x)} disabled={x !== 'setup' && !examId}>
              {x === 'setup' ? 'Setup' : x === 'live' ? 'Live' : 'Results'}
            </button>
          ))}
        </div>
      </div>

      {msg && <div className="hxa-ok">{msg}</div>}
      {err && <div className="hxa-err">{err}</div>}

      {/* ───────────────────────────── SETUP ───────────────────────────── */}
      {tab === 'setup' && (
        <div className="hxa-grid">
          <div className="hxa-card">
            <h3>The exam</h3>
            <label>Title<input value={form.title} onChange={(e) => up({ title: e.target.value })} /></label>
            <div className="hxa-row">
              <label>Opens<input type="datetime-local" value={toLocalInput(form.startAt)} onChange={(e) => up({ startAt: fromLocalInput(e.target.value) })} /></label>
              <label>Closes<input type="datetime-local" value={toLocalInput(form.endAt)} onChange={(e) => up({ endAt: fromLocalInput(e.target.value) })} /></label>
            </div>
            <div className="hxa-row">
              <label>Minutes each candidate gets<input type="number" min={1} value={form.durationMins} onChange={(e) => up({ durationMins: Number(e.target.value) })} /></label>
              <label>Cannot start after (mins)<input type="number" min={0} value={form.joinCutoffMins} onChange={(e) => up({ joinCutoffMins: Number(e.target.value) })} /></label>
            </div>
            <label>Navigation
              <select value={form.navigation} onChange={(e) => up({ navigation: e.target.value })}>
                <option value="free">Free — any section, any order</option>
                <option value="sequential">Sequential — in order</option>
              </select>
            </label>
            <label>Instructions shown before starting
              <textarea rows={5} value={form.instructions} onChange={(e) => up({ instructions: e.target.value })} placeholder="Anything the organisers want candidates to read first. HTML allowed." />
            </label>
          </div>

          <div className="hxa-card">
            <h3>The question plan</h3>
            <p className="hxa-sub">Every candidate gets their OWN draw from the bank — teammates never see the same paper.</p>
            {form.sections.map((s: any, i: number) => {
              const cov = coverage?.sections?.find((c: any) => c.key === s.key);
              return (
                <div className="hxa-sec" key={i}>
                  <div className="hxa-row">
                    <label>Label<input value={s.label} onChange={(e) => upSection(i, { label: e.target.value })} /></label>
                    <label>How many<input type="number" min={1} value={s.drawCount} onChange={(e) => upSection(i, { drawCount: Number(e.target.value) })} /></label>
                  </div>
                  <div className="hxa-row">
                    <label>Type
                      <select value={s.types[0]} onChange={(e) => upSection(i, { types: [e.target.value] })}>
                        <option value="mcq">Multiple choice</option>
                        <option value="live_code">Coding</option>
                        <option value="sql">SQL</option>
                        <option value="predict_output">Predict output</option>
                      </select>
                    </label>
                    <label>Marks each (0 = use the item's own)
                      <input type="number" min={0} value={s.marksPerItem} onChange={(e) => upSection(i, { marksPerItem: Number(e.target.value) })} />
                    </label>
                  </div>
                  <div className="hxa-row">
                    <label>Tags (comma separated)
                      <input value={(s.tags || []).join(', ')} onChange={(e) => upSection(i, { tags: e.target.value.split(',').map((x) => x.trim()).filter(Boolean) })} placeholder="DSA_ARRAYS, SQL_BASICS" />
                    </label>
                    <label>Difficulty
                      <span className="hxa-band">
                        <input type="number" min={1} max={5} value={s.minDifficulty} onChange={(e) => upSection(i, { minDifficulty: Number(e.target.value) })} />
                        <input type="number" min={1} max={5} value={s.maxDifficulty} onChange={(e) => upSection(i, { maxDifficulty: Number(e.target.value) })} />
                      </span>
                    </label>
                  </div>
                  {cov && (
                    <div className={`hxa-cov ${cov.ok ? 'ok' : 'bad'}`}>
                      {cov.ok
                        ? `✓ ${cov.available} item(s) in the bank for this section.`
                        : `✕ ${cov.problem}`}
                    </div>
                  )}
                  {form.sections.length > 1 && (
                    <button className="hxa-x" onClick={() => up({ sections: form.sections.filter((_: any, j: number) => j !== i) })}>Remove section</button>
                  )}
                </div>
              );
            })}
            <button className="hxa-btn small" onClick={() => up({ sections: [...form.sections, emptySection(`s${form.sections.length + 1}`)] })}>+ Section</button>
          </div>

          <div className="hxa-card">
            <h3>Running code</h3>
            <label className="hxa-check"><input type="checkbox" checked={form.runPolicy.enabled} onChange={(e) => up({ runPolicy: { ...form.runPolicy, enabled: e.target.checked } })} /> Let candidates run their code</label>
            <div className="hxa-row">
              <label>Runs per question (0 = unlimited)<input type="number" min={0} value={form.runPolicy.maxRunsPerQuestion} onChange={(e) => up({ runPolicy: { ...form.runPolicy, maxRunsPerQuestion: Number(e.target.value) } })} /></label>
              <label>Cooldown (seconds)<input type="number" min={0} value={form.runPolicy.cooldownSeconds} onChange={(e) => up({ runPolicy: { ...form.runPolicy, cooldownSeconds: Number(e.target.value) } })} /></label>
            </div>
            <label>Sample cases a candidate may run<input type="number" min={0} value={form.runPolicy.maxSampleCases} onChange={(e) => up({ runPolicy: { ...form.runPolicy, maxSampleCases: Number(e.target.value) } })} /></label>
            <p className="hxa-warnbox">
              A Java run costs about seven seconds of a CPU core. With 800 candidates, an unlimited
              Run button is an outage rather than a slow exam — keep the cap and the cooldown.
            </p>
          </div>

          <div className="hxa-card">
            <h3>Proctoring</h3>
            <label className="hxa-check"><input type="checkbox" checked={form.proctoring.tabSwitch.enabled} onChange={(e) => up({ proctoring: { ...form.proctoring, tabSwitch: { ...form.proctoring.tabSwitch, enabled: e.target.checked } } })} /> Record tab switches</label>
            <div className="hxa-row">
              <label>Warnings before auto-submit<input type="number" min={1} value={form.proctoring.tabSwitch.maxWarnings} onChange={(e) => up({ proctoring: { ...form.proctoring, tabSwitch: { ...form.proctoring.tabSwitch, maxWarnings: Number(e.target.value) } } })} /></label>
              <label className="hxa-check tall"><input type="checkbox" checked={form.proctoring.tabSwitch.autoSubmit} onChange={(e) => up({ proctoring: { ...form.proctoring, tabSwitch: { ...form.proctoring.tabSwitch, autoSubmit: e.target.checked } } })} /> Auto-submit at the limit</label>
            </div>
            <label className="hxa-check"><input type="checkbox" checked={form.proctoring.fullscreen.required} onChange={(e) => up({ proctoring: { ...form.proctoring, fullscreen: { ...form.proctoring.fullscreen, required: e.target.checked } } })} /> Require fullscreen</label>
            <label className="hxa-check"><input type="checkbox" checked={form.proctoring.copyPasteBlocked} onChange={(e) => up({ proctoring: { ...form.proctoring, copyPasteBlocked: e.target.checked } })} /> Block copy and paste</label>
            <label className="hxa-check"><input type="checkbox" checked={form.proctoring.clusterDetection} onChange={(e) => up({ proctoring: { ...form.proctoring, clusterDetection: e.target.checked } })} /> Flag teams sitting from one device or address</label>
            <p className="hxa-sub">Clustering is the control that matches the risk here: scores average into a team result, so the cheat worth catching is one member sitting several papers.</p>
          </div>

          <div className="hxa-card">
            <h3>Messages</h3>
            <label>Invitations go by
              <span className="hxa-chips">
                {(['email', 'whatsapp'] as const).map((c) => (
                  <button key={c} className={form.inviteChannels.includes(c) ? 'on' : ''}
                    onClick={() => up({ inviteChannels: form.inviteChannels.includes(c) ? form.inviteChannels.filter((x: string) => x !== c) : [...form.inviteChannels, c] })}>{c}</button>
                ))}
              </span>
            </label>
            <label>Results go by
              <span className="hxa-chips">
                {(['email', 'whatsapp'] as const).map((c) => (
                  <button key={c} className={form.resultChannels.includes(c) ? 'on' : ''}
                    onClick={() => up({ resultChannels: form.resultChannels.includes(c) ? form.resultChannels.filter((x: string) => x !== c) : [...form.resultChannels, c] })}>{c}</button>
                ))}
              </span>
            </label>
            <div className="hxa-sub" style={{ marginTop: 10 }}>Reminders before the start</div>
            {form.reminders.map((r: any, i: number) => (
              <div className="hxa-rem" key={i}>
                <input type="number" min={0} value={r.minutesBefore}
                  onChange={(e) => up({ reminders: form.reminders.map((x: any, j: number) => (j === i ? { ...x, minutesBefore: Number(e.target.value) } : x)) })} />
                <span>min before ({mins(r.minutesBefore)})</span>
                <span className="hxa-chips small">
                  {(['email', 'whatsapp'] as const).map((c) => (
                    <button key={c} className={r.channels.includes(c) ? 'on' : ''}
                      onClick={() => up({ reminders: form.reminders.map((x: any, j: number) => (j === i ? { ...x, channels: x.channels.includes(c) ? x.channels.filter((y: string) => y !== c) : [...x.channels, c] } : x)) })}>{c[0].toUpperCase()}</button>
                  ))}
                </span>
                <button className="hxa-x" onClick={() => up({ reminders: form.reminders.filter((_: any, j: number) => j !== i) })}>×</button>
              </div>
            ))}
            <button className="hxa-btn small" onClick={() => up({ reminders: [...form.reminders, { minutesBefore: 30, channels: ['whatsapp'] }] })}>+ Reminder</button>
          </div>

          <div className="hxa-card hxa-actions">
            <h3>Get it ready</h3>
            <button className="hxa-btn primary" disabled={busy === 'save'} onClick={() => act('save', () => api.save(hackathonId, { ...form, hackathonId }), () => say('Saved.'))}>
              {busy === 'save' ? 'Saving…' : 'Save exam'}
            </button>

            {examId && (
              <>
                <div className="hxa-step">
                  <b>1 · Can the bank fill it?</b>
                  {coverage
                    ? <span className={coverage.ok ? 'ok' : 'bad'}>
                        {coverage.ok ? `Yes — ${coverage.totalQuestions} questions, ${coverage.totalMarks} marks.` : 'No — see the sections above.'}
                      </span>
                    : <span>—</span>}
                  <button className="hxa-btn small" onClick={() => act('cov', () => api.coverage(examId), (c) => { setCoverage(c); say(c.ok ? 'The bank can fill every section.' : 'Some sections cannot be filled.'); })}>Re-check</button>
                </div>

                <div className="hxa-step">
                  <b>2 · Draw the papers</b>
                  <span>{readiness ? `${readiness.provisionedTeams}/${readiness.confirmedTeams} confirmed teams have papers` : '—'}</span>
                  <button className="hxa-btn small" disabled={busy === 'prov' || !coverage?.ok}
                    onClick={() => act('prov', () => api.provision(examId), (r) => say(`${r.created} paper(s) drawn, ${r.existing} already had one.`))}>
                    {busy === 'prov' ? 'Drawing…' : 'Draw papers'}
                  </button>
                </div>

                <div className="hxa-step">
                  <b>3 · Send the links</b>
                  <span>Email and WhatsApp, skipping anyone already invited</span>
                  <button className="hxa-btn small" disabled={busy === 'inv'}
                    onClick={() => act('inv', () => api.invite(examId), (r) => say(`Sent — ${r.email} email, ${r.whatsapp} WhatsApp${r.failed ? `, ${r.failed} failed` : ''}.`))}>
                    {busy === 'inv' ? 'Sending…' : 'Send invitations'}
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      )}

      {/* ───────────────────────────── LIVE ───────────────────────────── */}
      {tab === 'live' && (
        <>
          <div className="hxa-stats">
            {[
              ['Teams', t?.teams, ''],
              ['Candidates', t?.candidates, ''],
              ['Not started', t?.notStarted, 'grey'],
              ['In progress', t?.inProgress, 'blue'],
              ['Finished', t?.finished, 'green'],
              ['Auto-submitted', t?.autoSubmitted, 'amber'],
              ['No-shows', t?.noShow, 'grey'],
              ['Flagged', dash?.integrity?.flaggedCandidates, 'red'],
            ].map(([label, value, tone]) => (
              <div className={`hxa-stat ${tone || ''}`} key={label as string}>
                <b>{value ?? '—'}</b><span>{label as string}</span>
              </div>
            ))}
          </div>

          <div className="hxa-stats sub">
            {[
              ['Waiting to grade', dash?.grading?.pending, 'grey'],
              ['Grading now', dash?.grading?.grading, 'blue'],
              ['Graded', dash?.grading?.graded, 'green'],
              ['Needs review', dash?.grading?.reviewRequired, 'red'],
            ].map(([label, value, tone]) => (
              <div className={`hxa-stat ${tone}`} key={label as string}>
                <b>{value ?? '—'}</b><span>{label as string}</span>
              </div>
            ))}
            <button className="hxa-btn small" disabled={busy === 'grade'}
              onClick={() => act('grade', () => api.gradePass(examId), (r) => say(`Graded ${r.graded}, ${r.retried} retried, ${r.review} for review.`))}>
              {busy === 'grade' ? 'Grading…' : 'Run a grading pass'}
            </button>
            <button className="hxa-btn small" disabled={busy === 'close'}
              onClick={() => { if (window.confirm('Close the exam now? Anyone still writing is submitted.')) act('close', () => api.close(examId), (r) => say(`Closed. ${r.autoSubmitted} auto-submitted, ${r.noShows} no-shows.`)); }}>
              Close exam
            </button>
          </div>

          <div className="hxa-filters">
            <select value={filter.status || ''} onChange={(e) => setFilter((f) => ({ ...f, status: e.target.value || undefined }))}>
              <option value="">All statuses</option>
              {['invited', 'verified', 'started', 'submitted', 'auto_submitted', 'no_show'].map((s) => <option key={s} value={s}>{s.replace('_', ' ')}</option>)}
            </select>
            <label className="hxa-check"><input type="checkbox" checked={filter.flagged === 'true'} onChange={(e) => setFilter((f) => ({ ...f, flagged: e.target.checked ? 'true' : undefined }))} /> Flagged only</label>
            <input placeholder="Name, mobile, team or code…" value={filter.search || ''} onChange={(e) => setFilter((f) => ({ ...f, search: e.target.value || undefined }))} />
            <span className="hxa-fresh">{lastAt ? `Updated ${lastAt.toLocaleTimeString('en-IN')}` : 'Loading…'}</span>
          </div>

          <div className="hxa-tablewrap">
            <table className="hxa-table">
              <thead><tr><th>Candidate</th><th>Team</th><th>Status</th><th>Started</th><th>Time</th><th>Score</th><th>Flags</th><th>Grading</th></tr></thead>
              <tbody>
                {rows.map((r) => (
                  <tr key={r._id} className={r.violationCount ? 'flagged' : ''}>
                    <td><b>{r.memberName}</b><div className="hxa-dim">{r.memberMobile}</div></td>
                    <td>{r.teamName}<div className="hxa-dim">{r.registrationCode}</div></td>
                    <td><span className={`hxa-pill ${r.status}`}>{String(r.status).replace('_', ' ')}</span></td>
                    <td>{r.startedAt ? new Date(r.startedAt).toLocaleTimeString('en-IN') : '—'}</td>
                    <td>{r.timeSpentSec ? `${Math.round(r.timeSpentSec / 60)}m` : '—'}</td>
                    <td>{r.score != null ? `${r.score}/${r.totalMarks ?? '?'}` : '—'}</td>
                    <td>{r.violationCount ? <span className="hxa-flag">{r.violationCount}</span> : '—'}</td>
                    <td><span className={`hxa-pill ${r.grading?.status}`}>{r.grading?.status}</span></td>
                  </tr>
                ))}
                {!rows.length && <tr><td colSpan={8} className="hxa-msg">Nobody matches that filter.</td></tr>}
              </tbody>
            </table>
          </div>
        </>
      )}

      {/* ───────────────────────────── RESULTS ───────────────────────────── */}
      {tab === 'results' && (
        <>
          <div className="hxa-publish">
            <div>
              <b>Team score = sum of member scores ÷ {exam?.teamScoreDenominator === 'attempted' ? 'members who sat it' : 'registered members'}</b>
              <p className="hxa-sub">
                {exam?.publishedAt
                  ? `Published ${fmt(exam.publishedAt)}. Candidates can see their result.`
                  : 'Nothing is visible to candidates until you publish.'}
              </p>
            </div>
            <div className="hxa-publish-actions">
              <button className="hxa-btn primary" disabled={busy === 'pub'}
                onClick={() => act('pub', () => api.publish(examId), () => say('Results published.'))}>
                {busy === 'pub' ? 'Publishing…' : 'Publish results'}
              </button>
              <button className="hxa-btn" disabled={busy === 'send' || !exam?.publishedAt}
                onClick={() => act('send', () => api.sendResults(examId), (r) => say(`Sent — ${r.email} email, ${r.whatsapp} WhatsApp.`))}>
                {busy === 'send' ? 'Sending…' : 'Send results'}
              </button>
            </div>
          </div>

          <div className="hxa-tablewrap">
            <table className="hxa-table">
              <thead><tr><th>#</th><th>Team</th><th>Team score</th><th>Members</th><th>Total time</th><th>Flags</th></tr></thead>
              <tbody>
                {board.map((r, i) => (
                  <tr key={r.registrationCode} className={r.flags?.length ? 'flagged' : ''}>
                    <td className="hxa-rank">{i + 1}</td>
                    <td><b>{r.teamName}</b><div className="hxa-dim">{r.registrationCode}</div></td>
                    <td><b>{r.teamScore}</b><div className="hxa-dim">of {r.totalMarks}</div></td>
                    <td>{r.attemptedMembers}/{r.registeredMembers} sat</td>
                    <td>{Math.round((r.timeSpentSec || 0) / 60)}m</td>
                    <td>{r.flags?.length ? <span className="hxa-flag" title={r.flags.join(' · ')}>{r.flags.length}</span> : '—'}</td>
                  </tr>
                ))}
                {!board.length && <tr><td colSpan={6} className="hxa-msg">No results yet.</td></tr>}
              </tbody>
            </table>
          </div>
        </>
      )}
    </div>
  );
};

export default HackathonExamAdmin;
