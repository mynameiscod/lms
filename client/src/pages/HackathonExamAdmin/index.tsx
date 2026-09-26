import React, { useCallback, useEffect, useRef, useState } from 'react';
import { useParams } from 'react-router-dom';
import { hackathonExamAdminApi as api } from '../../api/hackathonExamApi';
import { assessmentAdminApi } from '../../api/assessmentAdminApi';
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

/**
 * Choose topics from what the bank actually holds, with counts.
 *
 * This replaced a free-text box asking for comma-separated tags. An admin typing one from
 * memory — or a tag that only has MCQs in it when the section wants coding — got "no items
 * match this section" and nothing to work out why from. Here the wrong choice is visible
 * before it is made: a tag with no items OF THIS TYPE is shown greyed with a zero.
 *
 * Choosing nothing means "no topic constraint", which is usually what a 30-question MCQ
 * section wants, so that is stated rather than left as an empty box.
 */
const TagPicker: React.FC<{
  all: { tag: string; total: number; byType: Record<string, number> }[];
  type: string;
  chosen: string[];
  onChange: (tags: string[]) => void;
}> = ({ all, type, chosen, onChange }) => {
  const [open, setOpen] = useState(false);
  const [q, setQ] = useState('');
  const box = useRef<HTMLDivElement>(null);

  /*
   * Close on a click anywhere else, and on Escape.
   *
   * Without this the only way out is the button that opened it — which the menu itself covers
   * once the chosen-topic chips push the layout down. Choosing a topic deliberately does NOT
   * close it: picking two tags is the normal case here, and a menu that shut after the first
   * would make the second one a fight.
   */
  useEffect(() => {
    if (!open) return;
    const away = (e: MouseEvent) => { if (!box.current?.contains(e.target as Node)) setOpen(false); };
    const esc = (e: KeyboardEvent) => { if (e.key === 'Escape') setOpen(false); };
    document.addEventListener('mousedown', away);
    document.addEventListener('keydown', esc);
    return () => { document.removeEventListener('mousedown', away); document.removeEventListener('keydown', esc); };
  }, [open]);

  const withCounts = all
    .map((t) => ({ ...t, n: t.byType[type] || 0 }))
    .filter((t) => !q || t.tag.toLowerCase().includes(q.toLowerCase()))
    .sort((a, b) => b.n - a.n || a.tag.localeCompare(b.tag));

  const toggle = (tag: string) =>
    onChange(chosen.includes(tag) ? chosen.filter((x) => x !== tag) : [...chosen, tag]);

  const available = chosen.reduce(
    (n, tag) => n + (all.find((t) => t.tag === tag)?.byType[type] || 0), 0,
  );

  return (
    <div className="hxa-tagpick" ref={box}>
      <button type="button" className="hxa-tagbtn" onClick={() => setOpen((o) => !o)}>
        {chosen.length
          ? `${chosen.length} topic(s) · ${available} question(s) available`
          : 'Any topic (whole bank)'}
        <span>{open ? '▴' : '▾'}</span>
      </button>

      {!!chosen.length && (
        <div className="hxa-tagsel">
          {chosen.map((tag) => (
            <button type="button" key={tag} onClick={() => toggle(tag)}>{tag} ×</button>
          ))}
        </div>
      )}

      {open && (
        <div className="hxa-tagmenu">
          <input placeholder="Search topics…" value={q} onChange={(e) => setQ(e.target.value)} autoFocus />
          <div className="hxa-taglist">
            {withCounts.map((t) => (
              <button
                type="button"
                key={t.tag}
                className={`${chosen.includes(t.tag) ? 'on' : ''} ${t.n === 0 ? 'none' : ''}`}
                onClick={() => toggle(t.tag)}
                title={t.n === 0 ? `No ${type} questions carry this topic` : ''}
              >
                <span>{t.tag}</span><b>{t.n}</b>
              </button>
            ))}
            {!withCounts.length && <div className="hxa-msg">Nothing matches.</div>}
          </div>
        </div>
      )}
    </div>
  );
};

/**
 * Watching one candidate's recording.
 *
 * Clips load one at a time and the previous object URL is revoked before the next is made.
 * An hour of fifteen-second slices is 240 clips; holding them all would put an entire
 * recording in the reviewer's memory to watch one minute of it.
 */
const RecordingViewer: React.FC<{ examId: string; attempt: any; onClose: () => void }> = ({ examId, attempt, onClose }) => {
  const total = attempt?.recording?.chunks || 0;
  const [seq, setSeq] = useState(1);
  const [src, setSrc] = useState('');
  const [err, setErr] = useState('');

  useEffect(() => {
    let dead = false;
    let made = '';
    setErr('');
    api.recordingChunkBlob(examId, attempt._id, seq)
      .then((u) => { if (dead) { URL.revokeObjectURL(u); return; } made = u; setSrc(u); })
      .catch((e) => !dead && setErr(e.message));
    return () => { dead = true; if (made) URL.revokeObjectURL(made); };
  }, [examId, attempt._id, seq]);

  return (
    <div className="hxa-rec-wrap">
      <div className="hxa-rec-head">
        <b>{attempt.memberName}</b>
        <span>{total} clip(s) · about {Math.round((total * 15) / 60)} min · {Math.round((attempt.recording?.bytes || 0) / 1048576)} MB</span>
        <button className="hxa-btn small" onClick={onClose}>Close</button>
      </div>
      {err ? <div className="hxa-msg">{err}</div>
        : <video className="hxa-rec-video" src={src} controls autoPlay
            onEnded={() => seq < total && setSeq(seq + 1)} />}
      <div className="hxa-rec-nav">
        <button className="hxa-btn small" disabled={seq <= 1} onClick={() => setSeq(seq - 1)}>Previous</button>
        <span>clip {seq} of {total}</span>
        <button className="hxa-btn small" disabled={seq >= total} onClick={() => setSeq(seq + 1)}>Next</button>
      </div>
    </div>
  );
};

const HackathonExamAdmin: React.FC = () => {
  const { hackathonId = '' } = useParams();
  const [tab, setTab] = useState<Tab>('setup');
  const [exam, setExam] = useState<any>(null);
  const [form, setForm] = useState<any>(null);
  const [coverage, setCoverage] = useState<any>(null);
  const [watching, setWatching] = useState<any>(null);
  const [readiness, setReadiness] = useState<any>(null);
  const [dash, setDash] = useState<any>(null);
  const [rows, setRows] = useState<any[]>([]);
  const [board, setBoard] = useState<any[]>([]);
  const [filter, setFilter] = useState<{ status?: string; flagged?: string; search?: string }>({});
  const [msg, setMsg] = useState('');
  const [err, setErr] = useState('');
  const [busy, setBusy] = useState('');
  const [lastAt, setLastAt] = useState<Date | null>(null);
  const [bankTags, setBankTags] = useState<{ tag: string; total: number; byType: Record<string, number> }[]>([]);

  /** Totals shown before the admin is asked for a single tag. */
  const bankTotals = {
    mcq: bankTags.reduce((n, t) => n + (t.byType.mcq || 0), 0),
    coding: bankTags.reduce((n, t) => n + (t.byType.live_code || 0) + (t.byType.sql || 0), 0),
  };

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
        runPolicy: { enabled: true, maxRunsPerQuestion: 10, cooldownSeconds: 5, maxSampleCases: 2, allowVisualizer: false },
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
  useEffect(() => { assessmentAdminApi.tags().then(setBankTags).catch(() => {}); }, []);

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
        <>
        {/*
          Where the questions come from, said before anything asks for a tag.
          Without this an admin is asked to type a tag from memory, and a tag that does not
          exist simply reports "no items match" with nothing to correct it with.
        */}
        <div className="hxa-explain">
          <div>
            <b>Questions are not written here.</b>
            <p>
              They live in the <b>question bank</b>, shared by every exam. Below you choose
              <i> which</i> of them each candidate draws — by topic tag, type and difficulty.
              Everyone gets their own draw, so teammates never see the same paper.
            </p>
            <p className="hxa-explain-sub">
              Need coding problems? The bank has <b>{bankTotals.mcq} multiple-choice</b> and{' '}
              <b className={bankTotals.coding ? '' : 'hxa-zero'}>{bankTotals.coding} coding</b> question(s).
              {!bankTotals.coding && ' You will need to author some before the coding section can be filled.'}
            </p>
          </div>
          <a className="hxa-btn primary" href="/assessment-admin" target="_blank" rel="noreferrer">
            Open the question bank ↗
          </a>
        </div>

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
              <span className="hxa-count">{(form.instructions || '').length} characters</span>
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
                    <label>Topics
                      <TagPicker
                        all={bankTags}
                        type={s.types[0]}
                        chosen={s.tags || []}
                        onChange={(tags) => upSection(i, { tags })}
                      />
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
            <p className="hxa-sub">Let candidates test their answer before they commit it.</p>
            <label className="hxa-check"><input type="checkbox" checked={form.runPolicy.enabled} onChange={(e) => up({ runPolicy: { ...form.runPolicy, enabled: e.target.checked } })} /> Let candidates run their code</label>
            <div className="hxa-row">
              <label>Runs per question (0 = unlimited)<input type="number" min={0} value={form.runPolicy.maxRunsPerQuestion} onChange={(e) => up({ runPolicy: { ...form.runPolicy, maxRunsPerQuestion: Number(e.target.value) } })} /></label>
              <label>Cooldown (seconds)<input type="number" min={0} value={form.runPolicy.cooldownSeconds} onChange={(e) => up({ runPolicy: { ...form.runPolicy, cooldownSeconds: Number(e.target.value) } })} /></label>
            </div>
            <label>Sample cases a candidate may run<input type="number" min={0} value={form.runPolicy.maxSampleCases} onChange={(e) => up({ runPolicy: { ...form.runPolicy, maxSampleCases: Number(e.target.value) } })} /></label>
            <label className="hxa-check"><input type="checkbox" checked={!!form.runPolicy.allowVisualizer} disabled={!form.runPolicy.enabled} onChange={(e) => up({ runPolicy: { ...form.runPolicy, allowVisualizer: e.target.checked } })} /> Allow the Code Visualizer (step through code line by line)</label>
            <p className="hxa-sub" style={{ marginTop: -4 }}>
              Off by default. It shows candidates exactly what their program does, so it suits practice
              rounds more than graded ones. Java only; each visualization uses one of the question's runs.
            </p>
            <p className="hxa-warnbox">
              A Java run costs about seven seconds of a CPU core. With 800 candidates, an unlimited
              Run button is an outage rather than a slow exam — keep the cap and the cooldown.
            </p>
          </div>

          <div className="hxa-card">
            <h3>Proctoring</h3>
            <p className="hxa-sub">Keep the paper honest without locking anyone out.</p>
            <label className="hxa-check"><input type="checkbox" checked={form.proctoring.tabSwitch.enabled} onChange={(e) => up({ proctoring: { ...form.proctoring, tabSwitch: { ...form.proctoring.tabSwitch, enabled: e.target.checked } } })} /> Record tab switches</label>
            <div className="hxa-row">
              <label>Warnings before auto-submit<input type="number" min={1} value={form.proctoring.tabSwitch.maxWarnings} onChange={(e) => up({ proctoring: { ...form.proctoring, tabSwitch: { ...form.proctoring.tabSwitch, maxWarnings: Number(e.target.value) } } })} /></label>
              <label className="hxa-check tall"><input type="checkbox" checked={form.proctoring.tabSwitch.autoSubmit} onChange={(e) => up({ proctoring: { ...form.proctoring, tabSwitch: { ...form.proctoring.tabSwitch, autoSubmit: e.target.checked } } })} /> Auto-submit at the limit</label>
            </div>
            <label className="hxa-check"><input type="checkbox" checked={form.proctoring.fullscreen.required} onChange={(e) => up({ proctoring: { ...form.proctoring, fullscreen: { ...form.proctoring.fullscreen, required: e.target.checked } } })} /> Require fullscreen</label>
            <label className="hxa-check"><input type="checkbox" checked={form.proctoring.copyPasteBlocked} onChange={(e) => up({ proctoring: { ...form.proctoring, copyPasteBlocked: e.target.checked } })} /> Block copy and paste</label>
            <label className="hxa-check"><input type="checkbox" checked={form.proctoring.clusterDetection} onChange={(e) => up({ proctoring: { ...form.proctoring, clusterDetection: e.target.checked } })} /> Flag teams sitting from one device or address</label>
            <label className="hxa-check"><input type="checkbox" checked={!!form.proctoring.camera?.enabled} onChange={(e) => up({ proctoring: { ...form.proctoring, camera: { ...(form.proctoring.camera || {}), enabled: e.target.checked } } })} /> Record camera and microphone</label>
            <p className="hxa-sub">Continuous video with audio, about 90MB per candidate per hour, stored in Bunny. A candidate who refuses or has no camera still sits the paper — it is recorded on their attempt and shown in the candidate list.</p>
            <p className="hxa-sub">Clustering is the control that matches the risk here: scores average into a team result, so the cheat worth catching is one member sitting several papers.</p>
          </div>

          <div className="hxa-card">
            <h3>Messages</h3>
            <p className="hxa-sub">Invitations, reminders and results.</p>
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
                    onClick={() => act('inv', () => api.invite(examId), (r) => {
                      /*
                       * Say WHY nothing went.
                       *
                       * This skips anyone already invited, which is right — pressing it twice must
                       * not message eight hundred people twice. But it reported only what it sent,
                       * so a run that skipped everybody said "Sent — 0 email, 0 WhatsApp" and read
                       * as a broken button. The skipped count was in the response all along and
                       * the screen was throwing it away.
                       */
                      const sent = (r.email || 0) + (r.whatsapp || 0);
                      if (!sent && r.skipped) {
                        say(`Nobody new to invite — all ${r.skipped} already have theirs. Use "Send to everyone again" to send anyway.`);
                      } else {
                        say(`Sent — ${r.email} email, ${r.whatsapp} WhatsApp`
                          + `${r.skipped ? `, ${r.skipped} already had theirs` : ''}`
                          + `${r.failed ? `, ${r.failed} failed` : ''}.`);
                      }
                    })}>
                    {busy === 'inv' ? 'Sending…' : 'Send invitations'}
                  </button>
                  {/* Sends again to everybody, flags ignored. Confirmed with a count, because
                      the number of people about to be messaged is the thing worth knowing. */}
                  <button className="hxa-btn small" disabled={busy === 'inv2'}
                    onClick={() => {
                      const n = readiness?.provisionedCandidates ?? readiness?.provisionedTeams ?? 0;
                      if (!window.confirm(
                        `Send the invitation again to EVERY candidate on this exam${n ? ` (${n})` : ''}?

`
                        + 'Anyone who already had one gets another. Use this when the first batch was wrong.',
                      )) return;
                      act('inv2', () => api.invite(examId, true),
                        (r) => say(`Sent again — ${r.email} email, ${r.whatsapp} WhatsApp${r.failed ? `, ${r.failed} failed` : ''}.`));
                    }}>
                    {busy === 'inv2' ? 'Sending…' : 'Send to everyone again'}
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
        </>
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

          {watching && <RecordingViewer examId={examId} attempt={watching} onClose={() => setWatching(null)} />}

          <div className="hxa-tablewrap">
            <table className="hxa-table">
              <thead><tr><th>Candidate</th><th>Team</th><th>Status</th><th>Started</th><th>Time</th><th>Score</th><th>Flags</th><th>Grading</th><th>Recording</th><th>Invite</th></tr></thead>
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
                    <td>
                      {r.recording?.chunks > 0 ? (
                        <button className="hxa-btn small" onClick={() => setWatching(r)}>
                          Watch ({r.recording.chunks})
                        </button>
                      ) : (
                        <span className={`hxa-pill ${r.recording?.state || 'off'}`}>
                          {r.recording?.state === 'denied' ? 'refused'
                            : r.recording?.state === 'unavailable' ? 'no camera'
                            : r.recording?.state === 'recording' ? 'recording' : 'none'}
                        </span>
                      )}
                    </td>
                    <td>
                      <button className="hxa-btn small" disabled={busy === `re${r._id}`}
                        onClick={() => act(`re${r._id}`, () => api.resendInvite(examId, r._id),
                          (c) => say(`Re-sent to ${r.memberName} — ${c.email} email, ${c.whatsapp} WhatsApp.`))}>
                        {busy === `re${r._id}` ? 'Sending…' : 'Resend'}
                      </button>
                      <div className="hxa-dim">
                        {r.invitesSent?.email || r.invitesSent?.whatsapp
                          ? `sent: ${[r.invitesSent?.email && 'email', r.invitesSent?.whatsapp && 'WA'].filter(Boolean).join(' + ')}`
                          : 'never sent'}
                      </div>
                      <div className="hxa-rescue">
                        {!r.otpVerifiedAt && !r.submittedAt && (
                          <button className="hxa-link" disabled={busy === `v${r._id}`}
                            onClick={() => {
                              if (!window.confirm(
                                `Let ${r.memberName} start WITHOUT a code?

`
                                + 'This exam is sat remotely, so nobody has seen them. You are vouching for '
                                + 'them, and your name is recorded against it.',
                              )) return;
                              act(`v${r._id}`, () => api.verifyAttempt(examId, r._id),
                                (r) => say(r?.message || 'Verified.'));
                            }}>Let them in without a code</button>
                        )}
                        {r.otpVerifiedBy && <span className="hxa-waived">let in by {r.otpVerifiedBy}</span>}
                        {!r.submittedAt && (
                          <button className="hxa-link" disabled={busy === `m${r._id}`}
                            onClick={() => {
                              const next = window.prompt(`New mobile for ${r.memberName}`, r.memberMobile || '');
                              if (!next) return;
                              act(`m${r._id}`, () => api.setAttemptMobile(examId, r._id, next),
                                (r) => say(r?.message || 'Number changed.'));
                            }}>Fix number</button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
                {!rows.length && <tr><td colSpan={10} className="hxa-msg">Nobody matches that filter.</td></tr>}
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
                onClick={() => act('send', () => api.sendResults(examId), (r) => {
                  const sent = (r.email || 0) + (r.whatsapp || 0);
                  say(!sent && r.skipped
                    ? `Nobody new — all ${r.skipped} already have their result.`
                    : `Sent — ${r.email} email, ${r.whatsapp} WhatsApp`
                      + `${r.skipped ? `, ${r.skipped} already had theirs` : ''}`
                      + `${r.failed ? `, ${r.failed} failed` : ''}.`);
                })}>
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
