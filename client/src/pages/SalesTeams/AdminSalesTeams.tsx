import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { salesTeamApi, stErr, Overview, TeamRow, StaffOption, fmtDay } from '../../api/salesTeamApi';
import { DayPicker, LivePill, Avatar, Dialog, Toast, useToast, Empty, Loading } from './shared';
import './salesTeams.css';

/**
 * SALES TEAMS — the super admin's page.
 *   Overview  every team's day (live today, saved for past days), every member's numbers, and whether
 *             each manager reviewed their team's reports over the last 7 days.
 *   Teams     set up teams: a manager (any staff role) and members. One level, one team per member.
 */
type Tab = 'overview' | 'teams';
const COLORS = ['#051D64', '#359AAD', '#6246C9', '#C87808', '#17885D', '#C93737', '#0B6E99', '#9C27B0'];

export default function AdminSalesTeams() {
  const [tab, setTab] = useState<Tab>('overview');
  const [toast, setToast] = useToast();
  return (
    <div className="stm">
      <header className="stm-head">
        <div className="stm-head-main">
          <span className="stm-eyebrow">Leads · Sales Teams</span>
          <h1>Sales Teams</h1>
          <p>Each manager gets a daily report for every member, counted from the CRM, and reviews it. Managers also see their members' leads.</p>
        </div>
      </header>
      <nav className="stm-tabs big" role="tablist">
        {([['overview', 'bi-speedometer2', 'Overview'], ['teams', 'bi-diagram-3', 'Teams']] as const).map(([k, ic, l]) => (
          <button key={k} type="button" role="tab" aria-selected={tab === k} className={tab === k ? 'on' : ''} onClick={() => setTab(k)}><i className={`bi ${ic}`} /> {l}</button>
        ))}
      </nav>
      {tab === 'overview' ? <OverviewTab onTeams={() => setTab('teams')} /> : <TeamsTab onToast={setToast} />}
      <Toast text={toast} />
    </div>
  );
}

/* ───────────────────────────── Overview ───────────────────────────── */

function OverviewTab({ onTeams }: { onTeams: () => void }) {
  const [day, setDay] = useState('');
  const [data, setData] = useState<Overview | null>(null);
  const [err, setErr] = useState('');
  const load = useCallback(() => {
    salesTeamApi.overview(day || undefined).then(d => { setData(d); setErr(''); }).catch(e => setErr(stErr(e, 'Could not load the overview.')));
  }, [day]);
  useEffect(() => { load(); }, [load]);

  if (err && !data) return <div className="stm-alert">{err}</div>;
  if (!data) return <Loading />;
  const all = data.teams.reduce((a, t) => ({ newAssigned: a.newAssigned + t.totals.newAssigned, fast: a.fast + t.totals.calledWithin5, notCalled: a.notCalled + t.totals.notCalled, leadsCalled: a.leadsCalled + t.totals.leadsCalled, connected: a.connected + t.totals.connected, enrollments: a.enrollments + t.totals.enrollments, members: a.members + t.members.length }), { newAssigned: 0, fast: 0, notCalled: 0, leadsCalled: 0, connected: 0, enrollments: 0, members: 0 });

  return (
    <>
      <div className="stm-toolbar">
        <DayPicker day={data.day} today={data.today} onChange={d => setDay(d === data.today ? '' : d)} />
        <LivePill live={data.live} />
      </div>
      {data.teams.length === 0 ? (
        <Empty icon="bi-diagram-3">No sales teams yet. <button type="button" className="stm-linkbtn" onClick={onTeams}>Create the first team</button>.</Empty>
      ) : (
        <>
          <section className="stm-tiles compact" aria-label="All teams">
            <div className="stm-tile"><span className="stm-tile-ic"><i className="bi bi-diagram-3" /></span><div><span className="stm-tile-label">Teams</span><b>{data.teams.length}</b><small>{all.members} members</small></div></div>
            <div className={`stm-tile ${all.notCalled ? 'warn' : 'good'}`}><span className="stm-tile-ic"><i className="bi bi-stopwatch" /></span><div><span className="stm-tile-label">New leads called in 5 min</span><b>{all.fast} / {all.newAssigned}</b><small>{all.notCalled} not called yet</small></div></div>
            <div className="stm-tile"><span className="stm-tile-ic"><i className="bi bi-telephone" /></span><div><span className="stm-tile-label">Leads called</span><b>{all.leadsCalled}</b><small>{all.connected} connected</small></div></div>
            <div className="stm-tile good"><span className="stm-tile-ic"><i className="bi bi-mortarboard" /></span><div><span className="stm-tile-label">Enrollments</span><b>{all.enrollments}</b><small>{fmtDay(data.day, { day: 'numeric', month: 'short' })}</small></div></div>
          </section>
          <div className="stm-ov-grid">
            {data.teams.map(t => (
              <article key={t._id} className="stm-ov" style={{ ['--tc' as any]: t.color }}>
                <div className="stm-ov-head">
                  <div>
                    <h3>{t.name}</h3>
                    <span className="stm-muted"><i className="bi bi-person-badge" /> {t.manager.name}</span>
                  </div>
                  <Link className="stm-btn sm" to={`/my-team?team=${t._id}${data.day !== data.today ? `&day=${data.day}` : ''}`}>Open team <i className="bi bi-arrow-right" /></Link>
                </div>
                <div className="stm-ov-nums">
                  <div className={t.totals.notCalled ? 'bad' : ''} title="New leads not called yet"><b>{t.totals.notCalled}</b><span>Not called</span></div>
                  <div title="New leads called within 5 minutes"><b>{t.totals.calledWithin5}/{t.totals.newAssigned}</b><span>In 5 min</span></div>
                  <div><b>{t.totals.leadsCalled}</b><span>Leads called</span></div>
                  <div><b>{t.totals.connected}</b><span>Connected</span></div>
                  <div className={t.totals.outcomeMissing ? 'warn' : ''} title="Calls with no outcome recorded"><b>{t.totals.outcomeMissing}</b><span>No outcome</span></div>
                  <div><b>{t.totals.enrollments}</b><span>Enrolled</span></div>
                </div>
                <div className="stm-ov-table-wrap">
                  <table className="stm-ov-table">
                    <thead><tr><th scope="col">Member</th><th scope="col">New</th><th scope="col">In 5 min</th><th scope="col">Not called</th><th scope="col">Called</th><th scope="col">No outcome</th></tr></thead>
                    <tbody>
                      {t.members.map(m => (
                        <tr key={m.user._id}>
                          <th scope="row"><Link to={`/my-team/member/${m.user._id}?team=${t._id}${data.day !== data.today ? `&day=${data.day}` : ''}`}>{m.user.name}</Link></th>
                          <td data-label="New">{m.metrics.newAssigned}</td>
                          <td data-label="In 5 min">{m.metrics.calledWithin5}</td>
                          <td data-label="Not called" className={m.metrics.notCalled ? 'bad' : ''}>{m.metrics.notCalled}</td>
                          <td data-label="Called">{m.metrics.leadsCalled}</td>
                          <td data-label="No outcome" className={m.metrics.outcomeMissing ? 'warn' : ''}>{m.metrics.outcomeMissing}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                <div className="stm-ov-review">
                  <span>Reviews, last 7 days</span>
                  <div className="stm-rgrid">
                    {t.reviewGrid.map(g => {
                      const tone = g.due === 0 ? 'na' : g.reviewed >= g.due ? 'all' : g.reviewed > 0 ? 'some' : 'none';
                      const tip = g.due === 0 ? `${fmtDay(g.day)}: not due yet` : `${fmtDay(g.day)}: ${g.reviewed} of ${g.due} reviewed`;
                      return <span key={g.day} className={`stm-rcell ${tone}`} title={tip} aria-label={tip}><em>{fmtDay(g.day, { weekday: 'narrow' })}</em></span>;
                    })}
                  </div>
                </div>
              </article>
            ))}
          </div>
          <p className="stm-legend-row"><span className="stm-rcell all" /> All reviewed <span className="stm-rcell some" /> Some <span className="stm-rcell none" /> None <span className="stm-rcell na" /> Not due</p>
        </>
      )}
    </>
  );
}

/* ───────────────────────────── Teams ───────────────────────────── */

function TeamsTab({ onToast }: { onToast: (s: string) => void }) {
  const [teams, setTeams] = useState<TeamRow[] | null>(null);
  const [staff, setStaff] = useState<StaffOption[]>([]);
  const [err, setErr] = useState('');
  const [editing, setEditing] = useState<TeamRow | 'new' | null>(null);
  const [removing, setRemoving] = useState<TeamRow | null>(null);

  const load = useCallback(() => {
    Promise.all([salesTeamApi.teams(), salesTeamApi.staff()])
      .then(([t, s]) => { setTeams(t); setStaff(s); setErr(''); })
      .catch(e => setErr(stErr(e, 'Could not load the teams.')));
  }, []);
  useEffect(() => { load(); }, [load]);

  if (err && !teams) return <div className="stm-alert">{err}</div>;
  if (!teams) return <Loading />;
  return (
    <>
      <div className="stm-toolbar">
        <span className="stm-muted">{teams.length} team{teams.length === 1 ? '' : 's'} · {teams.reduce((a, t) => a + t.members.length, 0)} members</span>
        <button type="button" className="stm-btn primary" onClick={() => setEditing('new')}><i className="bi bi-plus-lg" /> New team</button>
      </div>
      {teams.length === 0 ? <Empty icon="bi-diagram-3">No teams yet. Create one: pick a manager and their members.</Empty> : (
        <div className="stm-team-grid">
          {teams.map(t => (
            <article key={t._id} className="stm-team" style={{ ['--tc' as any]: t.color }}>
              <div className="stm-team-head">
                <h3>{t.name}</h3>
                <div className="stm-team-actions">
                  <button type="button" className="stm-icon-btn" aria-label={`Edit ${t.name}`} onClick={() => setEditing(t)}><i className="bi bi-pencil" /></button>
                  <button type="button" className="stm-icon-btn danger" aria-label={`Remove ${t.name}`} onClick={() => setRemoving(t)}><i className="bi bi-trash" /></button>
                </div>
              </div>
              <div className="stm-team-mgr"><Avatar name={t.manager.name} color={t.color} size={36} /><div><span>Manager</span><b>{t.manager.name}</b></div></div>
              <div className="stm-team-members">
                <span>{t.members.length} member{t.members.length === 1 ? '' : 's'}</span>
                <ul>{t.members.map(m => <li key={m._id}><Avatar name={m.name} size={26} /> {m.name}</li>)}</ul>
              </div>
              <Link className="stm-open" to={`/my-team?team=${t._id}`}>See today's reports <i className="bi bi-arrow-right" /></Link>
            </article>
          ))}
        </div>
      )}
      {editing && <TeamDialog team={editing === 'new' ? null : editing} staff={staff} onClose={() => setEditing(null)} onSaved={(rows, msg) => { setTeams(rows); setEditing(null); onToast(msg); salesTeamApi.staff().then(setStaff).catch(() => {}); }} />}
      {removing && (
        <Dialog title={`Remove ${removing.name}?`} onClose={() => setRemoving(null)}>
          <div className="stm-form">
            <p className="stm-note">The team and its manager link are removed and its members become free to join another team. Saved daily reports and reviews are kept.</p>
            <div className="stm-form-actions">
              <button type="button" className="stm-btn ghost" onClick={() => setRemoving(null)}>Cancel</button>
              <button type="button" className="stm-btn danger-solid" onClick={async () => {
                try { setTeams(await salesTeamApi.removeTeam(removing._id)); setRemoving(null); onToast('Team removed'); salesTeamApi.staff().then(setStaff).catch(() => {}); } catch (e) { onToast(stErr(e)); }
              }}>Remove team</button>
            </div>
          </div>
        </Dialog>
      )}
    </>
  );
}

function TeamDialog({ team, staff, onClose, onSaved }: { team: TeamRow | null; staff: StaffOption[]; onClose: () => void; onSaved: (rows: TeamRow[], msg: string) => void }) {
  const [name, setName] = useState(team?.name || '');
  const [color, setColor] = useState(team?.color || COLORS[0]);
  const [managerId, setManagerId] = useState(team?.manager._id || '');
  const [memberIds, setMemberIds] = useState<string[]>(team?.members.map(m => m._id) || []);
  const [q, setQ] = useState('');
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState('');

  // Who is busy elsewhere (not counting this team).
  const elsewhere = (s: StaffOption) => (s.team && s.team.teamId !== team?._id ? s.team : null);
  const matches = useMemo(() => {
    const re = q.trim().toLowerCase();
    return staff.filter(s => !re || s.name.toLowerCase().includes(re) || s.email.toLowerCase().includes(re) || s.role.toLowerCase().includes(re));
  }, [staff, q]);
  const managerOptions = staff.filter(s => !(elsewhere(s)?.as === 'member'));

  const toggle = (id: string) => setMemberIds(ids => ids.includes(id) ? ids.filter(x => x !== id) : [...ids, id]);
  const save = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true); setErr('');
    try {
      const body = { name, color, managerId, memberIds };
      const rows = team ? await salesTeamApi.updateTeam(team._id, body) : await salesTeamApi.createTeam(body);
      onSaved(rows, team ? 'Team saved' : 'Team created');
    } catch (x) { setErr(stErr(x)); setBusy(false); }
  };

  return (
    <Dialog title={team ? `Edit ${team.name}` : 'New team'} onClose={onClose} wide>
      <form className="stm-form" onSubmit={save}>
        <div className="stm-two">
          <label>Team name<input value={name} onChange={e => setName(e.target.value)} required maxLength={60} placeholder="e.g. Team Ravi" autoFocus /></label>
          <div className="stm-field">
            <span>Colour</span>
            <div className="stm-swatches" role="radiogroup" aria-label="Team colour">
              {COLORS.map(c => <button key={c} type="button" role="radio" aria-checked={color === c} aria-label={c} className={`stm-sw${color === c ? " on" : ""}`} style={{ background: c }} onClick={() => setColor(c)} />)}
            </div>
          </div>
        </div>
        <label>Manager
          <select value={managerId} onChange={e => { setManagerId(e.target.value); setMemberIds(ids => ids.filter(x => x !== e.target.value)); }} required>
            <option value="">Choose the manager</option>
            {managerOptions.map(s => <option key={s._id} value={s._id}>{s.name} · {s.role}{elsewhere(s)?.as === 'manager' ? ` (manages ${elsewhere(s)!.team})` : ''}</option>)}
          </select>
        </label>
        <div className="stm-field">
          <span>Members <em>({memberIds.length} chosen)</em></span>
          <label className="stm-search"><i className="bi bi-search" /><input value={q} onChange={e => setQ(e.target.value)} placeholder="Search by name, email or role" aria-label="Search staff" /></label>
          <ul className="stm-pick">
            {matches.length === 0 && <li className="stm-muted pad">No staff match.</li>}
            {matches.map(s => {
              const busyIn = elsewhere(s);
              const isMgr = s._id === managerId;
              const disabled = !!busyIn || isMgr;
              const why = isMgr ? 'Manager of this team' : busyIn ? (busyIn.as === 'manager' ? `Manages ${busyIn.team}` : `In ${busyIn.team}`) : '';
              return (
                <li key={s._id} className={disabled ? 'off' : ''}>
                  <label>
                    <input type="checkbox" checked={memberIds.includes(s._id)} disabled={disabled} onChange={() => toggle(s._id)} />
                    <Avatar name={s.name} size={30} />
                    <span className="stm-pick-id"><b>{s.name}</b><small>{s.role} · {s.email}</small></span>
                    {why && <em>{why}</em>}
                  </label>
                </li>
              );
            })}
          </ul>
        </div>
        {err && <div className="stm-alert">{err}</div>}
        <div className="stm-form-actions">
          <button type="button" className="stm-btn ghost" onClick={onClose}>Cancel</button>
          <button type="submit" className="stm-btn primary" disabled={busy || !managerId || !memberIds.length}>{busy ? 'Saving…' : team ? 'Save team' : 'Create team'}</button>
        </div>
      </form>
    </Dialog>
  );
}
