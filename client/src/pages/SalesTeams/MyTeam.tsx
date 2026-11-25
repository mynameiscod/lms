import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { salesTeamApi, stErr, SalesMe, TeamDay, Targets, TARGET_KEYS, TARGET_LABEL, fmtDay } from '../../api/salesTeamApi';
import { DayPicker, LivePill, Avatar, ReviewChip, Dialog, Toast, useToast, Empty, Loading, SectionTabs } from './shared';
import { LeadReportPanel } from './LeadReport';
import { useTenantModules } from '../../contexts/TenantModulesContext';
import './salesTeams.css';

/**
 * MY TEAM — the manager's page. Every member's day (live today, saved at 9 PM for past days), problems
 * flagged, targets, and which reports still need a review. A member's card opens their full report.
 * The Leads tab is the team's lead report (stages, sub-stages, new / worked today, follow-ups, probables).
 */
export default function MyTeam() {
  const [params, setParams] = useSearchParams();
  const navigate = useNavigate();
  const [me, setMe] = useState<SalesMe | null>(null);
  const [data, setData] = useState<TeamDay | null>(null);
  const [err, setErr] = useState('');
  const [targetsOpen, setTargetsOpen] = useState(false);
  const [toast, setToast] = useToast();
  const { isModuleEnabled } = useTenantModules();
  const leadsOn = isModuleEnabled('crmLeadReport' as any);
  const section = params.get('tab') === 'leads' && leadsOn ? 'leads' : 'members';

  useEffect(() => { salesTeamApi.me().then(setMe).catch(e => setErr(stErr(e))); }, []);
  const teamId = params.get('team') || me?.managerOf[0]?._id || '';
  const day = params.get('day') || '';

  const load = useCallback(() => {
    if (!teamId) return;
    salesTeamApi.teamDay(teamId, day || undefined).then(d => { setData(d); setErr(''); }).catch(e => setErr(stErr(e, 'Could not load the team.')));
  }, [teamId, day]);
  useEffect(() => { load(); }, [load]);
  // Today is live: refresh every 2 minutes while the page is open.
  useEffect(() => {
    if (!data?.live) return;
    const h = setInterval(() => { if (!document.hidden) load(); }, 120000);
    return () => clearInterval(h);
  }, [data?.live, load]);

  const setQuery = (k: string, v: string) => { const p = new URLSearchParams(params); if (v) p.set(k, v); else p.delete(k); setParams(p, { replace: true }); };

  if (me && !teamId) {
    return <div className="stm"><Empty icon="bi-people">You don't manage a sales team yet. Your admin sets up teams in <b>Leads → Sales Teams</b>.</Empty></div>;
  }
  if (err && !data) return <div className="stm"><div className="stm-alert">{err}</div></div>;
  if (!data) return <div className="stm"><Loading /></div>;

  const t = data.totals;
  const teams = me?.managerOf || [];
  return (
    <div className="stm">
      <header className="stm-head">
        <div className="stm-head-main">
          <span className="stm-eyebrow">Leads · My Team</span>
          <h1><span className="stm-team-dot" style={{ background: data.team.color }} /> {data.team.name}</h1>
          <p>{data.members.length} member{data.members.length === 1 ? '' : 's'}{data.team.manager ? ` · Manager ${data.team.manager.name}` : ''}. Open a member to see their full day and review it.</p>
        </div>
        <div className="stm-head-side">
          {teams.length > 1 && (
            <select className="stm-select" value={teamId} onChange={e => { const p = new URLSearchParams(params); p.set('team', e.target.value); setParams(p, { replace: true }); }} aria-label="Team">
              {teams.map(x => <option key={x._id} value={x._id}>{x.name}</option>)}
            </select>
          )}
          <DayPicker day={data.day} today={data.today} onChange={d => setQuery('day', d === data.today ? '' : d)} />
          <LivePill live={data.live} />
        </div>
      </header>

      {leadsOn && <SectionTabs value={section} onChange={k => setQuery('tab', k === 'leads' ? 'leads' : '')} tabs={[['members', 'bi-people', 'Members'], ['leads', 'bi-diagram-3', 'Leads']]} />}

      {section === 'leads' ? <LeadReportPanel embedded teamId={data.team._id} /> : (<>
      {data.pending.count > 0 && (
        <div className="stm-banner">
          <i className="bi bi-clipboard-check" />
          <span><b>{data.pending.count} report{data.pending.count === 1 ? '' : 's'} waiting for your review.</b> Check each member's day and mark it reviewed.</span>
          <div className="stm-banner-days">
            {data.pending.days.slice(0, 4).map(d => <button key={d} type="button" className="stm-btn sm" onClick={() => setQuery('day', d === data.today ? '' : d)}>{fmtDay(d, { day: 'numeric', month: 'short' })}</button>)}
          </div>
        </div>
      )}

      <section className="stm-tiles" aria-label="Team totals">
        <Tile icon="bi-stopwatch" label="New leads called in 5 min" value={t.calledWithin5} sub={`of ${t.newAssigned} new · ${t.notCalled} not called yet`} tone={t.notCalled ? 'warn' : 'good'} />
        <Tile icon="bi-telephone" label="Leads called" value={t.leadsCalled} sub={`${t.calls} calls · ${t.connected} connected`} />
        <Tile icon="bi-question-circle" label="Calls with no outcome" value={t.outcomeMissing} sub={t.outcomeMissing ? 'Ask them to record how it went' : 'Every call has an outcome'} tone={t.outcomeMissing ? 'warn' : ''} />
        <Tile icon="bi-check2-square" label="Follow-ups done today" value={t.followUpsDone} sub={`${t.followUpsMissed} missed today · ${t.carriedOver} from earlier`} tone={t.followUpsMissed ? 'warn' : ''} />
        <Tile icon="bi-easel" label="Demos" value={t.demos} sub={`${t.seats} seat${t.seats === 1 ? '' : 's'} reserved`} />
        <Tile icon="bi-mortarboard" label="Enrollments" value={t.enrollments} sub={`${t.leadsMovedForward} leads moved stage`} tone="good" />
      </section>

      <div className="stm-section-head">
        <h2>Members</h2>
        <button type="button" className="stm-btn" onClick={() => setTargetsOpen(true)}><i className="bi bi-bullseye" /> Daily targets</button>
      </div>

      {data.members.length === 0 ? <Empty icon="bi-people">No members in this team.</Empty> : (
        <div className="stm-members">
          {data.members.map(m => {
            const x = m.metrics;
            const flags: { tone: string; text: string }[] = [];
            if (x.notCalled) flags.push({ tone: 'bad', text: `${x.notCalled} new lead${x.notCalled === 1 ? '' : 's'} not called` });
            if (x.calledLate) flags.push({ tone: 'warn', text: `${x.calledLate} called after 30 min` });
            if (x.outcomeMissing) flags.push({ tone: 'warn', text: `${x.outcomeMissing} call${x.outcomeMissing === 1 ? '' : 's'} with no outcome` });
            if (x.followUpsMissed) flags.push({ tone: 'bad', text: `${x.followUpsMissed} follow-up${x.followUpsMissed === 1 ? '' : 's'} missed` });
            const href = `/my-team/member/${m.user._id}?team=${data.team._id}${data.day !== data.today ? `&day=${data.day}` : ''}`;
            return (
              <article key={m.user._id} className="stm-member" onClick={() => navigate(href)} role="link" tabIndex={0} onKeyDown={e => { if (e.key === 'Enter') navigate(href); }}>
                <div className="stm-member-top">
                  <Avatar name={m.user.name} />
                  <div className="stm-member-id"><b>{m.user.name}</b><span>{m.user.email}</span></div>
                  <ReviewChip review={m.review} open={data.reviewOpen} />
                </div>
                <div className={`stm-member-speed${x.newAssigned ? '' : ' empty'}`}>
                  {x.newAssigned ? (
                    <>
                      <div className="stm-member-speed-top"><span>New leads</span><b>{x.calledWithin5} of {x.newAssigned} called in 5 min{m.targets?.fastCalls ? <em> · target {m.targets.fastCalls}</em> : null}</b></div>
                      <div className="stm-speed-bar sm">
                        <i className="fast" style={{ width: `${(x.calledWithin5 / x.newAssigned) * 100}%` }} /><i className="ok" style={{ width: `${(x.calledWithin30 / x.newAssigned) * 100}%` }} />
                        <i className="slow" style={{ width: `${(x.calledLate / x.newAssigned) * 100}%` }} /><i className="none" style={{ width: `${(x.notCalled / x.newAssigned) * 100}%` }} />
                      </div>
                    </>
                  ) : <span className="stm-muted">No new leads assigned this day</span>}
                </div>
                <div className="stm-member-nums">
                  <div title="Different leads they called"><b>{x.leadsCalled}</b><span>Called</span></div>
                  <div title="Calls where they recorded Connected"><b>{x.connected}</b><span>Connected</span></div>
                  <div title="Follow-ups done today"><b>{x.followUpsDone}</b><span>Follow-ups</span></div>
                  <div><b>{x.demos}</b><span>Demos</span></div>
                </div>
                <div className="stm-member-foot">
                  <div className="stm-flags">
                    {flags.length === 0 ? <span className="stm-flag ok"><i className="bi bi-check-circle" /> On track</span> : flags.slice(0, 3).map(f => <span key={f.text} className={`stm-flag ${f.tone}`}>{f.text}</span>)}
                    {m.hasNote && <span className="stm-flag note"><i className="bi bi-journal-text" /> Note</span>}
                  </div>
                  <Link to={href} className="stm-open" onClick={e => e.stopPropagation()}>Open report <i className="bi bi-arrow-right" /></Link>
                </div>
              </article>
            );
          })}
        </div>
      )}
      </>)}

      {targetsOpen && <TargetsDialog data={data} onClose={() => setTargetsOpen(false)} onSaved={() => { setTargetsOpen(false); setToast('Targets saved'); load(); }} />}
      <Toast text={toast} />
    </div>
  );
}

function Tile({ icon, label, value, sub, tone = '' }: { icon: string; label: string; value: number; sub: string; tone?: string }) {
  return (
    <div className={`stm-tile ${tone}`}>
      <span className="stm-tile-ic"><i className={`bi ${icon}`} /></span>
      <div><span className="stm-tile-label">{label}</span><b>{value}</b><small>{sub}</small></div>
    </div>
  );
}

function TargetsDialog({ data, onClose, onSaved }: { data: TeamDay; onClose: () => void; onSaved: () => void }) {
  const toForm = (t?: Targets | null) => Object.fromEntries(TARGET_KEYS.map(k => [k, t?.[k] !== undefined ? String(t[k]) : ''])) as Record<string, string>;
  const [team, setTeam] = useState(toForm(data.team.defaultTargets));
  // A member shows their own targets only when they differ from the team's.
  const initialOwn = useMemo(() => Object.fromEntries(data.members.map(m => {
    const same = JSON.stringify(m.targets || {}) === JSON.stringify(data.team.defaultTargets || {});
    return [m.user._id, same ? toForm(null) : toForm(m.targets)];
  })), [data]);
  const [own, setOwn] = useState<Record<string, Record<string, string>>>(initialOwn);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState('');
  const num = (r: Record<string, string>) => Object.fromEntries(Object.entries(r).filter(([, v]) => v !== '').map(([k, v]) => [k, Number(v)])) as Targets;

  const save = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true); setErr('');
    try {
      await salesTeamApi.saveTargets(data.team._id, {
        defaultTargets: num(team),
        memberTargets: data.members.map(m => ({ userId: m.user._id, targets: num(own[m.user._id] || {}) })),
      });
      onSaved();
    } catch (x) { setErr(stErr(x)); } finally { setBusy(false); }
  };

  return (
    <Dialog title="Daily targets" onClose={onClose} wide>
      <form className="stm-form" onSubmit={save}>
        <p className="stm-note">Targets are optional. Leave a box empty for no target. A member's own target replaces the team's for that member.</p>
        <div className="stm-tgrid-wrap">
          <table className="stm-tgrid">
            <thead><tr><th scope="col">Who</th>{TARGET_KEYS.map(k => <th key={k} scope="col">{TARGET_LABEL[k]}</th>)}</tr></thead>
            <tbody>
              <tr className="team-row">
                <th scope="row">Whole team</th>
                {TARGET_KEYS.map(k => <td key={k} data-label={TARGET_LABEL[k]}><input type="number" min={0} max={1000} value={team[k]} onChange={e => setTeam({ ...team, [k]: e.target.value })} aria-label={`Team ${TARGET_LABEL[k]}`} /></td>)}
              </tr>
              {data.members.map(m => (
                <tr key={m.user._id}>
                  <th scope="row">{m.user.name}</th>
                  {TARGET_KEYS.map(k => (
                    <td key={k} data-label={TARGET_LABEL[k]}>
                      <input type="number" min={0} max={1000} placeholder={team[k] || '—'} value={own[m.user._id]?.[k] || ''} aria-label={`${m.user.name} ${TARGET_LABEL[k]}`}
                        onChange={e => setOwn({ ...own, [m.user._id]: { ...(own[m.user._id] || {}), [k]: e.target.value } })} />
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {err && <div className="stm-alert">{err}</div>}
        <div className="stm-form-actions">
          <button type="button" className="stm-btn ghost" onClick={onClose}>Cancel</button>
          <button type="submit" className="stm-btn primary" disabled={busy}>{busy ? 'Saving…' : 'Save targets'}</button>
        </div>
      </form>
    </Dialog>
  );
}
