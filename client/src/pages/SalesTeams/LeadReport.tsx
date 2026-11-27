import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Link, Navigate, useSearchParams } from 'react-router-dom';
import {
  leadReportApi, stErr, LeadReport as Report, ReportRow, ReportView, ReportParams, BatchOption, Chance, CHANCE_LABEL, DoneToday,
  fmtDay, timeOf, outcomeLabel, salesTeamApi, SalesMe,
} from '../../api/salesTeamApi';
import { DayPicker, Avatar, Dialog, Toast, useToast, Empty, Loading } from './shared';
import './salesTeams.css';
import './leadReport.css';

/**
 * LEAD REPORT — leads by stage and sub-stage, for a sales member (own leads), a manager (their team) and
 * the super admin (every team). Tabs: New today · Worked today · Follow-ups & overdue · All leads · Probables. Every tab
 * shows how many leads sit in each stage and sub-stage; clicking one filters the list. A lead can be marked
 * "probable" for an upcoming batch. Read-only on leads: nothing here changes a lead.
 *
 * Since 2026-11-25 it is not a page of its own: it is the "Leads" tab of My Day (the member), a member's
 * page (manager) and My Team (the whole team). The old /lead-report address sends people there.
 */

const TABS: { key: ReportView; label: string; icon: string }[] = [
  { key: 'new', label: 'New today', icon: 'bi-stars' },
  { key: 'worked', label: 'Worked today', icon: 'bi-lightning-charge' },
  { key: 'followups', label: 'Follow-ups & overdue', icon: 'bi-alarm' },
  { key: 'all', label: 'All leads', icon: 'bi-collection' },
  { key: 'probables', label: 'Probables', icon: 'bi-bullseye' },
];
const dateTime = (iso: string) => `${fmtDay(new Date(iso).toLocaleDateString('en-CA', { timeZone: 'Asia/Kolkata' }), { day: 'numeric', month: 'short' })}, ${timeOf(iso)}`;
/** "Called 2× · Moved stage · WhatsApp" for the Worked tab. */
export function doneParts(d: DoneToday): string[] {
  const out: string[] = [];
  if (d.calls) out.push(d.calls > 1 ? `Called ${d.calls}×` : 'Called');
  if (d.stageMoves) out.push(d.stageMoves > 1 ? `Moved ${d.stageMoves}×` : 'Moved stage');
  if (d.whatsapp) out.push(d.whatsapp > 1 ? `WhatsApp ${d.whatsapp}×` : 'WhatsApp');
  if (d.followUpsDone) out.push('Follow-up done');
  if (d.meetings) out.push('Demo / meeting');
  if (d.notes) out.push(d.notes > 1 ? `${d.notes} notes` : 'Note / follow-up');
  return out;
}
const dateOnly = (iso: string) => new Date(iso).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric', timeZone: 'Asia/Kolkata' });

export function LeadReportPanel({ embedded = false, teamId: lockTeam = '', userId: lockUser = '', showDay = false }: { embedded?: boolean; teamId?: string; userId?: string; showDay?: boolean }) {
  const [params, setParams] = useSearchParams();
  const [data, setData] = useState<Report | null>(null);
  const [err, setErr] = useState('');
  const [busy, setBusy] = useState(false);
  const [search, setSearch] = useState(params.get('q') || '');
  const [marking, setMarking] = useState<ReportRow | null>(null);
  const [hideEmpty, setHideEmpty] = useState(true);
  const [toast, setToast] = useToast();

  const view = (params.get('view') as ReportView) || 'new';
  const query: ReportParams = useMemo(() => {
    const p: any = { view };
    ['day', 'teamId', 'userId', 'stageId', 'subStageId', 'due', 'batchId', 'q', 'page'].forEach(k => { const v = params.get(k); if (v) p[k] = k === 'page' ? Number(v) : v; });
    // Inside My Team / a member's page the host decides the team and the person.
    if (lockTeam) p.teamId = lockTeam;
    if (lockUser) p.userId = lockUser;
    return p;
  }, [params, view, lockTeam, lockUser]);

  const load = useCallback(() => {
    setBusy(true);
    leadReportApi.report(query)
      .then(d => { setData(d); setErr(''); })
      .catch(e => setErr(stErr(e, 'Could not load the report.')))
      .finally(() => setBusy(false));
  }, [query]);
  useEffect(() => { load(); }, [load]);
  // The search box filters after a short pause.
  useEffect(() => {
    const h = setTimeout(() => { if ((params.get('q') || '') !== search.trim()) set({ q: search.trim() }); }, 400);
    return () => clearTimeout(h);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [search]);

  /** Change filters; any change other than the page goes back to page 1. */
  function set(changes: Record<string, string | undefined>) {
    const p = new URLSearchParams(params);
    for (const [k, v] of Object.entries(changes)) { if (v) p.set(k, v); else p.delete(k); }
    if (!('page' in changes)) p.delete('page');
    setParams(p, { replace: true });
  }
  const switchTab = (k: ReportView) => set({ view: k === 'new' ? undefined : k, stageId: undefined, subStageId: undefined, due: undefined, batchId: undefined });

  async function exportCsv() {
    try {
      const all = await leadReportApi.report({ ...query, page: undefined, export: '1' });
      const head = ['Name', 'Phone', 'Email', 'Course', 'Source', 'Owner', 'Stage', 'Sub-stage', ...(view === 'worked' ? ['New that day', 'Done that day', 'Worked by'] : []), 'Assigned at', 'Next follow-up', 'Follow-up', 'Last call', 'Probable batch', 'Batch starts', 'Chance'];
      const lines = all.rows.map(r => [
        r.name, r.phone, r.email, r.course, r.source, r.owner?.name || '', r.stage?.name || '', r.subStage?.name || '',
        ...(view === 'worked' ? [r.doneToday?.isNew ? 'Yes' : 'No', r.doneToday ? doneParts(r.doneToday).join(', ') : '', (r.doneToday?.by || []).join(', ')] : []),
        r.assignedAt ? dateTime(r.assignedAt) : '', r.nextFollowUp ? dateTime(r.nextFollowUp) : '', r.followUp || '',
        r.lastCallOutcome ? outcomeLabel(r.lastCallOutcome) : '', r.probable?.batchName || '', r.probable ? dateOnly(r.probable.batchStart) : '', r.probable ? CHANCE_LABEL[r.probable.chance] : '',
      ]);
      const csv = [head, ...lines].map(row => row.map(c => `"${String(c).replace(/"/g, '""')}"`).join(',')).join('\r\n');
      const a = document.createElement('a');
      a.href = URL.createObjectURL(new Blob(['﻿' + csv], { type: 'text/csv;charset=utf-8' }));
      a.download = `lead-report-${view}-${all.day}.csv`;
      a.click();
      URL.revokeObjectURL(a.href);
      if (all.total > all.rows.length) setToast(`Exported the first ${all.rows.length} of ${all.total} leads.`);
    } catch (e) { setErr(stErr(e, 'Could not export.')); }
  }

  const shell = embedded ? 'stm lrp lrp-embed' : 'stm';
  if (err && !data) return <div className={shell}><div className="stm-alert">{err}</div></div>;
  if (!data) return <div className={shell}><Loading /></div>;

  const f = data.filters;
  const people = data.teams.filter(t => !f.teamId || t._id === f.teamId).flatMap(t => t.members);
  const personName = new Map(data.teams.flatMap(t => t.members).map(m => [m._id, m.name]));
  const showOwner = data.as !== 'member';
  const tabCount: Record<ReportView, number> = { new: data.tabs.new, worked: data.tabs.worked, followups: data.tabs.followups, all: data.tabs.all, probables: data.tabs.probables };
  const stages = data.stages.filter(s => !hideEmpty || s.count > 0 || s._id === f.stageId);
  const stageTotal = data.stages.reduce((n, s) => n + s.count, 0);
  const activeStage = data.stages.find(s => s._id === f.stageId);
  const activeSub = activeStage?.subStages.find(s => s._id === f.subStageId);

  return (
    <div className={`stm lrp${embedded ? ' lrp-embed' : ''}`}>
      <header className={embedded ? 'lrp-embed-bar' : 'stm-head'}>
        {!embedded && <div className="stm-head-main">
          <span className="stm-eyebrow">Leads · Lead Report</span>
          <h1>Lead report</h1>
          <p>
            {data.as === 'member' ? 'Your leads by stage and sub-stage: new today, follow-ups and overdue, all of them, and the ones you expect to join a batch.'
              : data.as === 'manager' ? 'Your team\'s leads by stage and sub-stage. Pick a member to see only theirs.'
                : 'Every sales team\'s leads by stage and sub-stage. Pick a team or a member to narrow it down.'}
          </p>
        </div>}
        <div className="stm-head-side">
          {!lockTeam && data.as === 'admin' && data.teams.length > 1 && (
            <select className="stm-select" value={f.teamId} onChange={e => set({ teamId: e.target.value, userId: undefined })} aria-label="Team">
              <option value="">All teams</option>
              {data.teams.map(t => <option key={t._id} value={t._id}>{t.name}</option>)}
            </select>
          )}
          {showOwner && !lockUser && (
            <select className="stm-select" value={f.userId} onChange={e => set({ userId: e.target.value })} aria-label="Member">
              <option value="">{data.as === 'admin' && !f.teamId ? 'All members' : 'Whole team'}</option>
              {people.map(m => <option key={m._id} value={m._id}>{m.name}</option>)}
            </select>
          )}
          <label className="lrp-search">
            <i className="bi bi-search" />
            <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search name or phone" aria-label="Search leads" />
            {search && <button type="button" aria-label="Clear search" onClick={() => setSearch('')}><i className="bi bi-x" /></button>}
          </label>
        </div>
      </header>

      {/* Tabs */}
      <nav className="lrp-tabs" aria-label="Report">
        {TABS.map(t => (
          <button key={t.key} type="button" className={view === t.key ? 'on' : ''} onClick={() => switchTab(t.key)} aria-pressed={view === t.key}>
            <i className={`bi ${t.icon}`} />
            <span className="lrp-tab-label">{t.label}</span>
            <b className="lrp-tab-n">{tabCount[t.key]}</b>
            {t.key === 'followups' && data.tabs.overdue > 0 && <em className="lrp-tab-over" title="Overdue">{data.tabs.overdue} overdue</em>}
            {t.key === 'worked' && data.tabs.worked > 0 && <em className="lrp-tab-sub">{data.tabs.worked - data.tabs.workedNew} older · {data.tabs.workedNew} new</em>}
          </button>
        ))}
      </nav>

      {err && <div className="stm-alert">{err}</div>}

      {/* What this tab means, and its own filter */}
      <section className="lrp-context">
        {view === 'new' && (
          <>
            <p><b>{data.tabs.new}</b> lead{data.tabs.new === 1 ? '' : 's'} assigned {data.live ? 'today' : `on ${fmtDay(data.day)}`}. A lead created earlier and handed over that day is marked <span className="lrp-tag re">Reassigned</span>.</p>
            {(!embedded || showDay) && <DayPicker day={data.day} today={data.today} onChange={d => set({ day: d === data.today ? undefined : d })} />}
          </>
        )}
        {view === 'worked' && (
          <>
            <p><b>{data.tabs.worked}</b> lead{data.tabs.worked === 1 ? '' : 's'} worked {data.live ? 'today' : `on ${fmtDay(data.day)}`}: <b>{data.tabs.workedNew}</b> new and <b>{data.tabs.worked - data.tabs.workedNew}</b> older ones called, messaged, moved or followed up. Stages are where each lead is now.</p>
            {(!embedded || showDay) && <DayPicker day={data.day} today={data.today} onChange={d => set({ day: d === data.today ? undefined : d })} />}
          </>
        )}
        {view === 'followups' && (
          <>
            <p>Open leads (not lost, not enrolled) with a follow-up today or one that was missed. Same as Leads → Follow-up queue.</p>
            <div className="lrp-seg" role="group" aria-label="Follow-ups">
              <button type="button" className={!f.due ? 'on' : ''} onClick={() => set({ due: undefined })}>All <b>{data.tabs.followups}</b></button>
              <button type="button" className={f.due === 'today' ? 'on' : ''} onClick={() => set({ due: 'today' })}>Due today <b>{data.tabs.dueToday}</b></button>
              <button type="button" className={`over${f.due === 'overdue' ? ' on' : ''}`} onClick={() => set({ due: 'overdue' })}>Overdue <b>{data.tabs.overdue}</b></button>
            </div>
          </>
        )}
        {view === 'all' && <p>Every lead {data.as === 'member' ? 'you own' : 'the team owns'}, in any stage, newest activity first.</p>}
        {view === 'probables' && (
          <p>Leads expected to join a batch, soonest batch first. Mark a lead from any tab with <b>Mark probable</b>. "Joined" means the lead is now in an enrolled stage.</p>
        )}
      </section>

      {view === 'probables' && data.batches && (
        data.batches.length ? (
          <div className="lrp-batches">
            <button type="button" className={`lrp-batch all${!f.batchId ? ' on' : ''}`} onClick={() => set({ batchId: undefined })}>
              <span className="lrp-batch-name">All batches</span>
              <span className="lrp-batch-n"><b>{data.tabs.probables}</b> probable{data.tabs.probables === 1 ? '' : 's'}</span>
            </button>
            {data.batches.map(b => (
              <button key={b.batchId} type="button" className={`lrp-batch${f.batchId === b.batchId ? ' on' : ''}`} onClick={() => set({ batchId: f.batchId === b.batchId ? undefined : b.batchId })}>
                <span className="lrp-batch-date"><i className="bi bi-calendar-event" /> Starts {dateOnly(b.startDate)}</span>
                <span className="lrp-batch-name">{b.name}</span>
                <span className="lrp-batch-n"><b>{b.count}</b> probable{b.count === 1 ? '' : 's'}</span>
                <span className="lrp-batch-meta">
                  {b.high > 0 && <span className="lrp-tag hi">{b.high} high</span>}
                  {b.joined > 0 && <span className="lrp-tag ok">{b.joined} joined</span>}
                </span>
              </button>
            ))}
          </div>
        ) : <Empty icon="bi-bullseye">No probables yet. Open any tab and use <b>Mark probable</b> on a lead to add it to a batch.</Empty>
      )}

      {/* Stage and sub-stage counts */}
      <section className="lrp-stages-card" aria-label="Leads by stage">
        <div className="lrp-card-head">
          <h2>By stage <span>{stageTotal} lead{stageTotal === 1 ? '' : 's'} in this tab</span></h2>
          <div className="lrp-card-tools">
            {(f.stageId || f.subStageId) && <button type="button" className="stm-linkbtn" onClick={() => set({ stageId: undefined, subStageId: undefined })}>Clear stage filter</button>}
            <label className="lrp-check"><input type="checkbox" checked={!hideEmpty} onChange={e => setHideEmpty(!e.target.checked)} /> Show empty stages</label>
          </div>
        </div>
        {stages.length ? (
          <div className="lrp-stages">
            {stages.map(s => {
              const on = f.stageId === s._id;
              const pct = stageTotal ? Math.round((s.count / stageTotal) * 100) : 0;
              return (
                <div key={s._id} className={`lrp-stage${on ? ' on' : ''}${s.count ? '' : ' zero'}`} style={{ ['--c' as any]: s.color || '#94a3b8' }}>
                  <button type="button" className="lrp-stage-top" onClick={() => set({ stageId: on && !f.subStageId ? undefined : s._id, subStageId: undefined })} aria-pressed={on && !f.subStageId}>
                    <span className="lrp-stage-name"><i className="lrp-dot" />{s.name}</span>
                    <span className="lrp-stage-n">{s.count}</span>
                  </button>
                  <div className="lrp-stage-bar" aria-hidden="true"><i style={{ width: `${pct}%` }} /></div>
                  {s.subStages.length > 0 && (
                    <ul className="lrp-subs">
                      {s.subStages.filter(x => !hideEmpty || x.count > 0 || x._id === f.subStageId).map(x => {
                        const subOn = on && f.subStageId === x._id;
                        return (
                          <li key={x._id}>
                            <button type="button" className={subOn ? 'on' : ''} onClick={() => set({ stageId: s._id, subStageId: subOn ? undefined : x._id })} aria-pressed={subOn}>
                              <span>{x.name}</span><b>{x.count}</b>
                            </button>
                          </li>
                        );
                      })}
                    </ul>
                  )}
                </div>
              );
            })}
          </div>
        ) : <p className="stm-muted pad">No leads in this tab.</p>}
      </section>

      {/* Per member (managers and admins) */}
      {data.members && data.members.length > 1 && !f.userId && (
        <section className="lrp-members" aria-label="By member">
          <div className="lrp-card-head"><h2>By member</h2></div>
          <div className="lrp-mtable-wrap">
            <table className="lrp-mtable">
              <thead><tr><th>Member</th><th>New today</th><th>Worked today</th><th>Due today</th><th>Overdue</th><th>All leads</th><th>Probables</th></tr></thead>
              <tbody>
                {data.members.slice().sort((a, b) => (personName.get(a.userId) || '').localeCompare(personName.get(b.userId) || '')).map(m => (
                  <tr key={m.userId}>
                    <td><button type="button" className="lrp-person" onClick={() => set({ userId: m.userId })}><Avatar name={personName.get(m.userId) || '?'} size={30} /> {personName.get(m.userId)}</button></td>
                    <td data-label="New today">{m.new}</td>
                    <td data-label="Worked today"><button type="button" className="lrp-mlink" onClick={() => set({ userId: m.userId, view: 'worked', stageId: undefined, subStageId: undefined })} title={`${m.worked - m.workedNew} older · ${m.workedNew} new`}>{m.worked}</button></td>
                    <td data-label="Due today">{m.dueToday}</td>
                    <td data-label="Overdue" className={m.overdue ? 'bad' : ''}>{m.overdue}</td>
                    <td data-label="All leads">{m.all}</td>
                    <td data-label="Probables">{m.probables}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      )}

      {/* The leads */}
      <section className="lrp-list" aria-label="Leads">
        <div className="lrp-card-head">
          <h2>
            {TABS.find(t => t.key === view)!.label}
            {activeStage && <span className="lrp-filter-chip" style={{ ['--c' as any]: activeStage.color }}><i className="lrp-dot" />{activeStage.name}{activeSub ? ` › ${activeSub.name}` : ''}</span>}
            <span>{data.total} lead{data.total === 1 ? '' : 's'}</span>
          </h2>
          <div className="lrp-card-tools">
            {busy && <span className="stm-spin sm" aria-label="Loading" />}
            <button type="button" className="stm-btn sm" onClick={exportCsv} disabled={!data.total}><i className="bi bi-download" /> Export CSV</button>
          </div>
        </div>
        {data.rows.length ? (
          <div className="lrp-table-wrap">
            <table className="lrp-table">
              <thead>
                <tr>
                  <th>Lead</th>
                  {showOwner && <th>Owner</th>}
                  <th>Stage · sub-stage</th>
                  <th>{view === 'new' ? 'Assigned' : view === 'worked' ? 'Done today' : view === 'probables' ? 'Batch' : 'Next follow-up'}</th>
                  <th>Last call</th>
                  <th>Probable</th>
                  <th aria-label="Open" />
                </tr>
              </thead>
              <tbody>
                {data.rows.map(r => (
                  <tr key={r.leadId}>
                    <td className="lrp-lead">
                      <b>{r.name}</b>
                      <span>{r.phone}{r.course ? ` · ${r.course}` : ''}</span>
                      {r.reassigned && <span className="lrp-tag re">Reassigned</span>}
                      {view === 'worked' && r.doneToday?.isNew && <span className="lrp-tag ok">New today</span>}
                    </td>
                    {showOwner && <td data-label="Owner">{r.owner?.name || '—'}</td>}
                    <td data-label="Stage">
                      {r.stage ? <span className="lrp-stage-pill" style={{ ['--c' as any]: r.stage.color }}><i className="lrp-dot" />{r.stage.name}</span> : <span className="stm-muted">No stage</span>}
                      {r.subStage && <span className="lrp-sub">{r.subStage.name}</span>}
                    </td>
                    <td data-label={view === 'new' ? 'Assigned' : view === 'worked' ? 'Done today' : view === 'probables' ? 'Batch' : 'Follow-up'}>
                      {view === 'worked' ? <DoneCell d={r.doneToday} showBy={showOwner} />
                        : view === 'new' ? (r.assignedAt ? timeOf(r.assignedAt) : r.createdAt ? timeOf(r.createdAt) : '—')
                        : view === 'probables' && r.probable ? <span className="lrp-when">{r.probable.batchName}<em>Starts {dateOnly(r.probable.batchStart)}</em></span>
                          : r.nextFollowUp ? <span className={`lrp-fu ${r.followUp}`}>{r.followUp === 'overdue' ? 'Overdue · ' : r.followUp === 'today' ? 'Today · ' : ''}{dateTime(r.nextFollowUp)}</span>
                            : <span className="stm-muted">None set</span>}
                    </td>
                    <td data-label="Last call">{r.lastCallOutcome ? <span className="lrp-when">{outcomeLabel(r.lastCallOutcome)}{r.lastContactedAt && <em>{dateTime(r.lastContactedAt)}</em>}</span> : <span className="stm-muted">Not called</span>}</td>
                    <td data-label="Probable">
                      {r.probable ? (
                        <button type="button" className={`lrp-prob ${r.probable.chance}${r.probable.joined ? ' joined' : ''}`} onClick={() => setMarking(r)} title={r.probable.note || 'Change'}>
                          <i className={`bi ${r.probable.joined ? 'bi-patch-check-fill' : 'bi-bullseye'}`} />
                          <span>{r.probable.batchName}<em>{r.probable.joined ? 'Joined' : CHANCE_LABEL[r.probable.chance]}</em></span>
                        </button>
                      ) : <button type="button" className="stm-btn sm ghost" onClick={() => setMarking(r)}><i className="bi bi-plus-lg" /> Mark probable</button>}
                    </td>
                    <td className="lrp-open"><Link to={`/leads/${r.leadId}`} className="stm-btn sm" aria-label={`Open ${r.name}`}>Open <i className="bi bi-arrow-up-right" /></Link></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <Empty icon={view === 'new' ? 'bi-inbox' : view === 'followups' ? 'bi-check2-circle' : 'bi-search'}>
            {f.q || f.stageId ? 'No leads match these filters.'
              : view === 'new' ? `No leads were assigned ${data.live ? 'today' : 'on this day'}.`
              : view === 'worked' ? `No leads worked ${data.live ? 'yet today' : 'on this day'}.`
                : view === 'followups' ? 'Nothing due and nothing overdue. All caught up.'
                  : view === 'probables' ? 'No probables here yet.' : 'No leads yet.'}
          </Empty>
        )}
        {data.pages > 1 && (
          <div className="lrp-pager">
            <button type="button" className="stm-btn sm" disabled={data.page <= 1} onClick={() => set({ page: String(data.page - 1) })}><i className="bi bi-chevron-left" /> Previous</button>
            <span>Page {data.page} of {data.pages}</span>
            <button type="button" className="stm-btn sm" disabled={data.page >= data.pages} onClick={() => set({ page: String(data.page + 1) })}>Next <i className="bi bi-chevron-right" /></button>
          </div>
        )}
      </section>

      {marking && (
        <ProbableDialog
          row={marking}
          onClose={() => setMarking(null)}
          onSaved={msg => { setMarking(null); setToast(msg); load(); }}
        />
      )}
      <Toast text={toast} />
    </div>
  );
}

/** Mark a lead as likely to join a batch, change it, or take it off. */
function ProbableDialog({ row, onClose, onSaved }: { row: ReportRow; onClose: () => void; onSaved: (msg: string) => void }) {
  const [batches, setBatches] = useState<BatchOption[] | null>(null);
  const [batchId, setBatchId] = useState(row.probable?.batchId || '');
  const [chance, setChance] = useState<Chance>(row.probable?.chance || 'medium');
  const [note, setNote] = useState(row.probable?.note || '');
  const [err, setErr] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => { leadReportApi.batches().then(setBatches).catch(e => setErr(stErr(e, 'Could not load batches.'))); }, []);

  async function save() {
    if (!batchId) { setErr('Choose a batch.'); return; }
    setSaving(true);
    try { await leadReportApi.mark(row.leadId, { batchId, chance, note }); onSaved(`${row.name} marked probable.`); }
    catch (e) { setErr(stErr(e)); setSaving(false); }
  }
  async function remove() {
    setSaving(true);
    try { await leadReportApi.unmark(row.leadId); onSaved(`${row.name} is no longer a probable.`); }
    catch (e) { setErr(stErr(e)); setSaving(false); }
  }

  // Keep the lead's current batch in the list even if it has already started long ago.
  const options = batches && row.probable && !batches.some(b => b._id === row.probable!.batchId)
    ? [{ _id: row.probable.batchId, name: row.probable.batchName, startDate: row.probable.batchStart, mode: null, course: '' }, ...batches]
    : batches;

  return (
    <Dialog title={row.probable ? 'Change probable' : 'Mark as probable'} onClose={onClose}>
      <div className="stm-form lrp-form">
        <p className="lrp-form-lead"><b>{row.name}</b> · {row.phone}{row.stage ? ` · ${row.stage.name}${row.subStage ? ` › ${row.subStage.name}` : ''}` : ''}</p>
        <label className="stm-field">
          <span>Batch they are likely to join</span>
          {options === null ? <span className="stm-muted">Loading batches…</span>
            : options.length ? (
              <select className="stm-select" value={batchId} onChange={e => setBatchId(e.target.value)}>
                <option value="">Choose a batch</option>
                {options.map(b => <option key={b._id} value={b._id}>{b.name} · starts {dateOnly(b.startDate)}{b.course ? ` · ${b.course}` : ''}</option>)}
              </select>
            ) : <span className="stm-muted">No upcoming batches. Batches are created under Batches; ones starting from two weeks ago onward are listed here.</span>}
        </label>
        <div className="stm-field">
          <span>Chance</span>
          <div className="lrp-seg" role="group" aria-label="Chance">
            {(['high', 'medium', 'low'] as Chance[]).map(c => (
              <button key={c} type="button" className={`${c}${chance === c ? ' on' : ''}`} onClick={() => setChance(c)} aria-pressed={chance === c}>{CHANCE_LABEL[c]}</button>
            ))}
          </div>
        </div>
        <label className="stm-field">
          <span>Note <em>(optional)</em></span>
          <textarea rows={3} maxLength={500} value={note} onChange={e => setNote(e.target.value)} placeholder="e.g. Paying after salary on the 1st; wants the weekend batch" />
        </label>
        {err && <div className="stm-alert">{err}</div>}
        <div className="stm-form-actions lrp-form-actions">
          {row.probable && <button type="button" className="stm-btn ghost danger" onClick={remove} disabled={saving}><i className="bi bi-x-circle" /> Not a probable</button>}
          <span className="lrp-grow" />
          <button type="button" className="stm-btn" onClick={onClose} disabled={saving}>Cancel</button>
          <button type="button" className="stm-btn primary" onClick={save} disabled={saving || !batchId}>{saving ? 'Saving…' : 'Save'}</button>
        </div>
      </div>
    </Dialog>
  );
}

/** The Worked tab's "Done today" cell: what was done, the last time, and (for managers) by whom. */
function DoneCell({ d, showBy }: { d?: DoneToday | null; showBy: boolean }) {
  if (!d) return <span className="stm-muted">—</span>;
  const parts = doneParts(d);
  return (
    <span className="lrp-done">
      {parts.length ? <span className="lrp-done-parts">{parts.map(p => <i key={p}>{p}</i>)}</span> : <span className="stm-muted">Assigned, nothing done yet</span>}
      <em>{d.lastAt ? `Last at ${timeOf(d.lastAt)}` : ''}{showBy && d.by.length ? `${d.lastAt ? ' · ' : ''}by ${d.by.join(', ')}` : ''}</em>
    </span>
  );
}

/**
 * /lead-report — the old address. The report now lives in the Leads tab of My Day (a member), My Team
 * (a manager) and Sales Teams → a team (an admin). Saved links and bookmarks land there.
 */
export default function LeadReportRedirect() {
  const [params] = useSearchParams();
  const [me, setMe] = useState<SalesMe | null>(null);
  const [err, setErr] = useState('');
  useEffect(() => { salesTeamApi.me().then(setMe).catch(e => setErr(stErr(e))); }, []);
  if (err) return <div className="stm"><div className="stm-alert">{err}</div></div>;
  if (!me) return <div className="stm"><Loading /></div>;
  const keep = new URLSearchParams(params);
  keep.set('tab', 'leads');
  if (me.managerOf.length) { keep.set('team', keep.get('teamId') || me.managerOf[0]._id); keep.delete('teamId'); return <Navigate to={`/my-team?${keep}`} replace />; }
  if (me.isAdmin) return <Navigate to={`/sales-teams?${keep}`} replace />;
  return <Navigate to={`/my-day?${keep}`} replace />;
}
