import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  roadmapV2Api, RoadmapV2Overview, RoadmapV2Settings, StagePriorities, TopicPriority, RoadmapV2Budget, PrioritySummary,
} from '../../api/passportApi';
import './adminRoadmapV2.css';

/**
 * Admin: Roadmap V2.
 *
 * Two things an admin decides here. The SETTINGS — who is on V2 and the daily study time a
 * roadmap is planned for. And each topic's PRIORITY — MUST is never left out, SHOULD goes in while
 * there is room, OPTIONAL goes first — which is how a roadmap fits the admin's days at a daily load
 * a college student can carry. Each year's card shows whether its MUST topics fit what the year can
 * hold after the bridge a fresh joiner needs.
 *
 * A priority change applies to roadmaps built from now on; one already being followed is not re-cut.
 */

const YEARS: { key: string; label: string; short: string }[] = [
  { key: 'foundation', label: 'Year 1 · Foundation', short: 'Year 1' },
  { key: 'build', label: 'Year 2 · Build', short: 'Year 2' },
  { key: 'specialize', label: 'Year 3 · Specialize', short: 'Year 3' },
  { key: 'placement', label: 'Year 4 · Placement', short: 'Year 4' },
];
const PRIORITIES: { key: TopicPriority; label: string; hint: string }[] = [
  { key: 'MUST', label: 'Must', hint: 'Never left out' },
  { key: 'SHOULD', label: 'Should', hint: 'In while there is room' },
  { key: 'OPTIONAL', label: 'Optional', hint: 'First to go' },
];
const hrs = (m: number) => `${Math.round((m || 0) / 6) / 10} h`;
const yearOf = (k: string) => YEARS.find(y => y.key === k) || { key: k, label: k, short: k };

const BudgetCard: React.FC<{ stage: string; budget: RoadmapV2Budget; summary: PrioritySummary; topics: number; available: boolean; active: boolean; onOpen: () => void }> =
  ({ stage, budget, summary, topics, available, active, onOpen }) => {
    const must = summary.MUST.minutes;
    const fits = must <= budget.mustCapMinutes;
    const pct = budget.mustCapMinutes ? Math.min(100, Math.round((must / budget.mustCapMinutes) * 100)) : 0;
    return (
      <button type="button" className={`rv2-year${active ? ' on' : ''}${available ? '' : ' na'}`} onClick={onOpen}>
        <div className="rv2-year-hd"><b>{yearOf(stage).label}</b><span>{topics} topics</span></div>
        {!available ? <p className="rv2-muted">No published curriculum for this year.</p> : <>
          <div className="rv2-year-math">
            <span><b>{budget.programDays}</b> days × {hrs(budget.dailyMinutes)}</span>
            <span>= <b>{hrs(budget.budgetMinutes)}</b></span>
          </div>
          <div className="rv2-year-rows">
            <span>Bridge for a fresh joiner</span><b>{budget.bridgeMinutes ? hrs(budget.bridgeMinutes) : '—'}</b>
            <span>Room for this year’s Must</span><b>{hrs(budget.mustCapMinutes)}</b>
          </div>
          <div className={`rv2-meter${fits ? '' : ' over'}`} title={`Must topics: ${hrs(must)} of ${hrs(budget.mustCapMinutes)}`}>
            <i style={{ width: `${pct}%` }} />
          </div>
          <div className={`rv2-fit${fits ? ' ok' : ' bad'}`}>
            <i className={`bi ${fits ? 'bi-check-circle-fill' : 'bi-exclamation-triangle-fill'}`} />
            {fits ? `Must topics fit: ${hrs(must)}` : `Must topics exceed the room by ${hrs(must - budget.mustCapMinutes)}`}
          </div>
          <div className="rv2-chips">
            <span className="p-must">{summary.MUST.topics} Must</span>
            <span className="p-should">{summary.SHOULD.topics} Should</span>
            <span className="p-optional">{summary.OPTIONAL.topics} Optional</span>
            {summary.UNSET.topics > 0 && <span className="p-unset">{summary.UNSET.topics} not set</span>}
          </div>
        </>}
      </button>
    );
  };

const AdminRoadmapV2: React.FC = () => {
  const [overview, setOverview] = useState<RoadmapV2Overview | null>(null);
  const [form, setForm] = useState<RoadmapV2Settings | null>(null);
  const [pilotText, setPilotText] = useState('');
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);

  const [stage, setStage] = useState('placement');
  const [data, setData] = useState<StagePriorities | null>(null);
  const [loadingTopics, setLoadingTopics] = useState(false);
  const [filter, setFilter] = useState<'ALL' | TopicPriority>('ALL');
  const [q, setQ] = useState('');
  const [busyTopic, setBusyTopic] = useState('');

  const loadOverview = useCallback(async () => {
    const o = await roadmapV2Api.overview();
    setOverview(o);
    setForm(o.settings);
    setPilotText(o.settings.studentIds.join(', '));
  }, []);
  useEffect(() => { loadOverview().catch(() => setMsg({ ok: false, text: 'Could not load Roadmap V2.' })); }, [loadOverview]);

  useEffect(() => {
    let alive = true;
    setLoadingTopics(true);
    roadmapV2Api.topics(stage)
      .then(d => { if (alive) setData(d); })
      .catch(() => { if (alive) setData(null); })
      .finally(() => { if (alive) setLoadingTopics(false); });
    return () => { alive = false; };
  }, [stage]);

  const save = async () => {
    if (!form) return;
    setSaving(true); setMsg(null);
    try {
      await roadmapV2Api.saveSettings({
        ...form,
        studentIds: pilotText.split(/[\s,]+/).map(s => s.trim()).filter(Boolean),
      });
      await loadOverview();
      setData(await roadmapV2Api.topics(stage));
      setMsg({ ok: true, text: 'Saved.' });
    } catch (e: any) {
      const d = e?.response?.data;
      setMsg({ ok: false, text: [d?.message, ...(d?.errors || [])].filter(Boolean).join(' ') || 'Could not save.' });
    } finally { setSaving(false); }
  };

  const setPriority = async (topicCode: string, priority: TopicPriority) => {
    setBusyTopic(topicCode);
    try {
      const d = await roadmapV2Api.setPriority(stage, topicCode, priority);
      setData(d);
      setOverview(o => o ? { ...o, stages: o.stages.map(s => (s.stage === stage ? { ...s, summary: d.summary } : s)) } : o);
    } catch (e: any) {
      setMsg({ ok: false, text: e?.response?.data?.message || 'Could not save the priority.' });
    } finally { setBusyTopic(''); }
  };

  const rows = useMemo(() => {
    const needle = q.trim().toLowerCase();
    return (data?.topics || []).filter(t =>
      (filter === 'ALL' || t.priority === filter)
      && (!needle || t.title.toLowerCase().includes(needle) || t.topicCode.toLowerCase().includes(needle)));
  }, [data, filter, q]);

  const status = !form ? '' : form.enabled ? 'On for every student'
    : form.stages.length ? `On for ${form.stages.map(s => yearOf(s).short).join(', ')}`
      : form.studentIds.length ? `Pilot: ${form.studentIds.length} student(s)` : 'Off';

  if (!overview || !form) {
    return <div className="rv2"><div className="rv2-card rv2-muted">{msg?.text || 'Loading Roadmap V2…'}</div></div>;
  }

  return (
    <div className="rv2">
      <header className="rv2-head">
        <div>
          <span className="rv2-eyebrow">CareerPilot</span>
          <h1>Roadmap V2</h1>
          <p>Every roadmap fits the days you set for its year, at the daily study time below. A student joining
            Year 2, 3 or 4 gets a bridge of the earlier years’ important topics first. Topics that do not fit are left
            out by priority — a <b>Must</b> topic never is.</p>
        </div>
        <span className={`rv2-status${form.enabled || form.stages.length || form.studentIds.length ? ' on' : ''}`}>
          <i className="bi bi-circle-fill" /> {status}
        </span>
      </header>

      {/* ── Settings ── */}
      <section className="rv2-card">
        <h2><i className="bi bi-sliders" /> Settings</h2>
        <div className="rv2-settings">
          <label className="rv2-switch">
            <input type="checkbox" checked={form.enabled} onChange={e => setForm({ ...form, enabled: e.target.checked })} />
            <span><b>On for every student</b><small>Leave off to pilot first with named students or one year.</small></span>
          </label>
          <div className="rv2-field">
            <span className="rv2-label">On for these years only</span>
            <div className="rv2-years-pick">
              {YEARS.map(y => (
                <label key={y.key} className={form.stages.includes(y.key) ? 'on' : ''}>
                  <input type="checkbox" checked={form.stages.includes(y.key)}
                    onChange={e => setForm({ ...form, stages: e.target.checked ? [...form.stages, y.key] : form.stages.filter(s => s !== y.key) })} />
                  {y.short}
                </label>
              ))}
            </div>
          </div>
          <label className="rv2-field">
            <span className="rv2-label">Daily study time</span>
            <select value={form.dailyMinutes} onChange={e => setForm({ ...form, dailyMinutes: Number(e.target.value) })}>
              {[60, 90, 120, 150, 180, 210, 240, 270, 300].map(m => <option key={m} value={m}>{m / 60} hours</option>)}
            </select>
          </label>
          <label className="rv2-field">
            <span className="rv2-label">Revision days for members moving up a year</span>
            <input type="number" min={0} max={30} value={form.revisionDays}
              onChange={e => setForm({ ...form, revisionDays: Number(e.target.value) })} />
          </label>
          <label className="rv2-field wide">
            <span className="rv2-label">Pilot students (user IDs, comma separated)</span>
            <textarea rows={2} value={pilotText} onChange={e => setPilotText(e.target.value)} placeholder="Optional — try V2 on a few students first" />
          </label>
        </div>
        <div className="rv2-actions">
          {msg && <span className={msg.ok ? 'rv2-ok' : 'rv2-err'}>{msg.text}</span>}
          <button type="button" className="rv2-btn" onClick={save} disabled={saving}>{saving ? 'Saving…' : 'Save settings'}</button>
        </div>
      </section>

      {/* ── Each year's budget ── */}
      <section>
        <h2 className="rv2-h2"><i className="bi bi-calendar3" /> Does each year fit?</h2>
        <div className="rv2-years">
          {overview.stages.map(s => (
            <BudgetCard key={s.stage} {...s} active={stage === s.stage} onOpen={() => setStage(s.stage)} />
          ))}
        </div>
      </section>

      {/* ── Topic priorities ── */}
      <section className="rv2-card">
        <div className="rv2-topics-hd">
          <h2><i className="bi bi-list-ol" /> Topic priorities · {yearOf(stage).label}</h2>
          <div className="rv2-tabs" role="tablist">
            {YEARS.map(y => (
              <button key={y.key} type="button" role="tab" aria-selected={stage === y.key}
                className={stage === y.key ? 'on' : ''} onClick={() => setStage(y.key)}>{y.short}</button>
            ))}
          </div>
        </div>
        <p className="rv2-muted">Your changes apply to roadmaps built from now on. Draft priorities were set from the curriculum and can be changed freely.</p>
        <div className="rv2-tools">
          <div className="rv2-filter">
            {(['ALL', 'MUST', 'SHOULD', 'OPTIONAL'] as const).map(f => (
              <button key={f} type="button" className={filter === f ? 'on' : ''} onClick={() => setFilter(f)}>
                {f === 'ALL' ? 'All' : PRIORITIES.find(p => p.key === f)!.label}
                {data && f !== 'ALL' && <em>{data.summary[f].topics}</em>}
              </button>
            ))}
          </div>
          <label className="rv2-search"><i className="bi bi-search" />
            <input value={q} onChange={e => setQ(e.target.value)} placeholder="Search topics" />
          </label>
        </div>

        {loadingTopics && <div className="rv2-muted">Loading topics…</div>}
        {!loadingTopics && data && !data.available && <div className="rv2-muted">This year has no published curriculum yet.</div>}
        {!loadingTopics && data?.available && (
          <div className="rv2-list">
            {rows.map(t => (
              <div key={t.topicCode} className={`rv2-topic p-${(t.priority || 'unset').toLowerCase()}`}>
                <div className="rv2-topic-main">
                  <b>{t.title}</b>
                  <div className="rv2-topic-meta">
                    <code>{t.topicCode}</code>
                    <span><i className="bi bi-clock" /> {hrs(t.minutes)}</span>
                    {t.backbone && <span className="tag core">Core</span>}
                    {t.hasCheckpoint && <span className="tag check">Checkpoint</span>}
                    {t.prioritySource === 'ADMIN' && <span className="tag admin">Set by admin</span>}
                    {t.prioritySource === 'DRAFT' && <span className="tag draft">Draft</span>}
                  </div>
                </div>
                <div className="rv2-seg" role="radiogroup" aria-label={`Priority for ${t.title}`}>
                  {PRIORITIES.map(p => (
                    <button key={p.key} type="button" role="radio" aria-checked={t.priority === p.key} title={p.hint}
                      className={`${p.key.toLowerCase()}${t.priority === p.key ? ' on' : ''}`}
                      disabled={busyTopic === t.topicCode}
                      onClick={() => t.priority !== p.key && setPriority(t.topicCode, p.key)}>{p.label}</button>
                  ))}
                </div>
              </div>
            ))}
            {!rows.length && <div className="rv2-muted">No topics match.</div>}
          </div>
        )}
      </section>
    </div>
  );
};

export default AdminRoadmapV2;
