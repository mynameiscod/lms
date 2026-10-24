import React, { useCallback, useEffect, useState } from 'react';
import axios from 'axios';

/**
 * CareerPilot Journey: where people drop, step by step, from the first look at the sign-up page to
 * "still here in week two". Every number comes from the server (careerPilotJourneyService); this page
 * only draws it. Click a step to see who stopped there and where they were last seen.
 */

const BASE = (process.env.REACT_APP_API_URL || '/api/v1') + '/careerpilot/admin/journey';
const auth = () => {
  const token = localStorage.getItem('token'); const tenantId = localStorage.getItem('tenantId');
  return { ...(token && { Authorization: `Bearer ${token}` }), ...(tenantId && { 'X-Tenant-Id': tenantId }) };
};

interface Step { key: string; group: 'visitor' | 'member'; label: string; count: number; pctOfPrev?: number | null; pctOfTop?: number | null; pctOfAccounts?: number | null; medianMinutes?: number | null }
interface Row { name: string; visitors?: number; gotOtp?: number; verified?: number; pctVerified?: number | null; accounts?: number; paid?: number; pctPaid?: number | null }
interface Journey {
  steps: Step[]; tracking: { accounts: number; verifiedSeen: number; coverage: number | null };
  formLeaks: { leftAfterField: { what: string; visitors: number }[]; blockedByErrors: { what: string; visitors: number }[]; rejectedByServer: { what: string; visitors: number }[]; wrongOtpVisitors: number; resentOtpVisitors: number };
  bySource: Row[]; byDevice: Row[]; accountsBySource: Row[];
}
interface Dropped { total: number; lastSeen: { name: string; count: number }[]; people: { id: string; name: string; email: string; phone: string; joinedAt: string; lastSeen: string; lastSeenAt: string | null; daysSince: number }[] }

const card: React.CSSProperties = { background: '#fff', border: '1px solid #e5e7eb', borderRadius: 12, boxShadow: '0 1px 3px rgba(0,0,0,.05)' };
const PRESETS: [string, string][] = [['today', 'Today'], ['7d', 'Last 7 days'], ['30d', 'Last 30 days'], ['all', 'All time']];

const when = (mins?: number | null) => {
  if (mins == null) return '—';
  if (mins < 1) return 'under a minute';
  if (mins < 90) return `${mins} min`;
  if (mins < 60 * 36) return `${Math.round(mins / 60)} h`;
  return `${Math.round(mins / 1440)} days`;
};

const AdminJourney: React.FC = () => {
  const [preset, setPreset] = useState('7d');
  const [data, setData] = useState<Journey | null>(null);
  const [err, setErr] = useState('');
  const [open, setOpen] = useState<Step | null>(null);
  const [dropped, setDropped] = useState<Dropped | null>(null);
  const [loading, setLoading] = useState(false);

  const load = useCallback(() => {
    setLoading(true); setErr('');
    axios.get(BASE, { headers: auth(), params: { preset } }).then((r) => setData(r.data)).catch((e) => setErr(e?.response?.data?.message || 'Could not load the journey.')).finally(() => setLoading(false));
  }, [preset]);
  useEffect(() => { load(); setOpen(null); setDropped(null); }, [load]);

  const pick = (s: Step) => {
    setOpen(s); setDropped(null);
    if (s.group === 'member' && s.key !== 'account') axios.get(`${BASE}/dropped`, { headers: auth(), params: { preset, step: s.key } }).then((r) => setDropped(r.data)).catch(() => setDropped({ total: 0, lastSeen: [], people: [] }));
  };

  const top = data?.steps[0]?.count || 0;
  const accounts = data?.tracking.accounts || 0;

  return (
    <div style={{ padding: 24, maxWidth: 1180, margin: '0 auto' }}>
      <h2 style={{ margin: 0, fontSize: 22, fontWeight: 800 }}>CareerPilot Journey</h2>
      <p style={{ margin: '4px 0 14px', color: '#6b7280', fontSize: 14 }}>Where people drop, from the first look at the sign-up page to week two. Click a step to see who stopped there.</p>

      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 14 }}>
        {PRESETS.map(([k, label]) => (
          <button key={k} onClick={() => setPreset(k)} style={{ padding: '7px 14px', borderRadius: 999, border: '1px solid #d1d5db', background: preset === k ? '#1a5490' : '#fff', color: preset === k ? '#fff' : '#374151', fontWeight: 600, fontSize: 13, cursor: 'pointer' }}>{label}</button>
        ))}
        <button onClick={load} style={{ padding: '7px 14px', borderRadius: 999, border: '1px solid #d1d5db', background: '#fff', fontSize: 13, cursor: 'pointer' }}>{loading ? 'Loading…' : '↻ Refresh'}</button>
      </div>

      {err && <div style={{ color: '#b91c1c', marginBottom: 12 }}>{err}</div>}
      {!data && !err && <div style={{ color: '#9ca3af', padding: 40, textAlign: 'center' }}>Loading…</div>}

      {data && (
        <>
          <div style={{ ...card, padding: 18, marginBottom: 14 }}>
            {data.steps.map((s, i) => {
              const width = s.group === 'visitor' ? (top ? (s.count / top) * 100 : 0) : (s.pctOfAccounts ?? 0);
              const showHeader = i === 0 || data.steps[i - 1].group !== s.group;
              const lost = s.group === 'visitor' && i > 0 ? data.steps[i - 1].count - s.count : 0;
              return (
                <React.Fragment key={s.key}>
                  {showHeader && <div style={{ fontSize: 11.5, fontWeight: 700, letterSpacing: '.06em', textTransform: 'uppercase', color: '#6b7280', margin: i ? '18px 0 8px' : '0 0 8px' }}>
                    {s.group === 'visitor' ? 'Before an account (people who visited)' : `After sign-up (${accounts} new accounts; each step is a share of them)`}
                  </div>}
                  <button onClick={() => pick(s)} style={{ display: 'block', width: '100%', textAlign: 'left', background: open?.key === s.key ? '#eff6ff' : 'transparent', border: 'none', padding: '6px 4px', cursor: 'pointer', borderRadius: 8 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13.5, gap: 8 }}>
                      <span><b>{s.label}</b></span>
                      <span style={{ color: '#374151' }}>
                        <b>{s.count}</b>
                        {s.group === 'visitor' && s.pctOfPrev != null && <span style={{ marginLeft: 8, color: s.pctOfPrev < 50 ? '#b91c1c' : '#6b7280' }}>{s.pctOfPrev}% of the step above{lost > 0 ? ` (${lost} left)` : ''}</span>}
                        {s.group === 'member' && s.pctOfAccounts != null && <span style={{ marginLeft: 8, color: '#6b7280' }}>{s.pctOfAccounts}%</span>}
                        {s.group === 'member' && s.medianMinutes != null && s.key !== 'account' && <span style={{ marginLeft: 8, color: '#9ca3af' }}>typically {when(s.medianMinutes)} after joining</span>}
                      </span>
                    </div>
                    <div style={{ height: 9, background: '#eef2f7', borderRadius: 5, marginTop: 4, overflow: 'hidden' }}>
                      <div style={{ width: `${Math.max(width, s.count ? 2 : 0)}%`, height: '100%', background: s.group === 'visitor' ? '#3b82f6' : '#10b981', borderRadius: 5 }} />
                    </div>
                  </button>
                </React.Fragment>
              );
            })}
            {data.tracking.coverage !== null && data.tracking.coverage < 90 && (
              <p style={{ margin: '14px 0 0', fontSize: 12.5, color: '#92400e', background: '#fffbeb', padding: '8px 10px', borderRadius: 8 }}>
                The sign-up page tracking saw {data.tracking.verifiedSeen} of the {data.tracking.accounts} accounts created in this period ({data.tracking.coverage}%). Older sign-ups happened before tracking started, or the visitor blocked it. Read the top part as a sample.
              </p>
            )}
          </div>

          {open && (
            <div style={{ ...card, padding: 18, marginBottom: 14 }}>
              <h3 style={{ margin: '0 0 8px', fontSize: 16 }}>{open.group === 'member' ? `Did not reach: ${open.label}` : `Where the sign-up form loses people (before "${open.label}")`}</h3>
              {open.group === 'visitor' ? (
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(260px,1fr))', gap: 14, fontSize: 13.5 }}>
                  <LeakList title="Left the page after touching…" rows={data.formLeaks.leftAfterField} />
                  <LeakList title="Pressed Create but the form had errors in…" rows={data.formLeaks.blockedByErrors} />
                  <LeakList title="The server said no because…" rows={data.formLeaks.rejectedByServer} />
                  <div><b>OTP trouble</b><p style={{ margin: '6px 0 0', color: '#374151' }}>{data.formLeaks.wrongOtpVisitors} visitors typed a wrong code · {data.formLeaks.resentOtpVisitors} asked for the code again.</p></div>
                </div>
              ) : !dropped ? <p style={{ color: '#9ca3af' }}>Loading…</p> : (
                <>
                  <p style={{ margin: '0 0 8px', color: '#374151' }}><b>{dropped.total}</b> of the {accounts} new accounts. Last thing each was seen doing:</p>
                  <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 12 }}>
                    {dropped.lastSeen.map((l) => <span key={l.name} style={{ background: '#f3f4f6', borderRadius: 999, padding: '4px 10px', fontSize: 12.5 }}>{l.name} <b>{l.count}</b></span>)}
                  </div>
                  <div style={{ overflowX: 'auto' }}>
                    <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
                      <thead><tr style={{ textAlign: 'left', color: '#6b7280', fontSize: 11.5, textTransform: 'uppercase' }}><th style={th}>Person</th><th style={th}>Phone</th><th style={th}>Last seen doing</th><th style={th}>Quiet for</th></tr></thead>
                      <tbody>
                        {dropped.people.map((p) => (
                          <tr key={p.id}>
                            <td style={td}><b>{p.name}</b><div style={{ color: '#9ca3af', fontSize: 12 }}>{p.email}</div></td>
                            <td style={td}>{p.phone ? <a href={`https://wa.me/${p.phone.replace(/\D/g, '')}`} target="_blank" rel="noreferrer">{p.phone}</a> : '—'}</td>
                            <td style={td}>{p.lastSeen}</td>
                            <td style={td}>{p.daysSince === 0 ? 'today' : `${p.daysSince} d`}</td>
                          </tr>
                        ))}
                        {!dropped.people.length && <tr><td style={{ ...td, color: '#9ca3af' }} colSpan={4}>Nobody: everyone in this period reached this step.</td></tr>}
                      </tbody>
                    </table>
                  </div>
                </>
              )}
            </div>
          )}

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(340px,1fr))', gap: 14 }}>
            <Table title="Visitors by where they came from" rows={data.bySource} cols={[['visitors', 'Visitors'], ['gotOtp', 'Got OTP'], ['verified', 'Verified'], ['pctVerified', '% verified']]} />
            <Table title="Visitors by device" rows={data.byDevice} cols={[['visitors', 'Visitors'], ['gotOtp', 'Got OTP'], ['verified', 'Verified'], ['pctVerified', '% verified']]} />
            <Table title="New accounts by campaign source" rows={data.accountsBySource} cols={[['accounts', 'Accounts'], ['paid', 'Paid'], ['pctPaid', '% paid']]} />
          </div>
        </>
      )}
    </div>
  );
};

const th: React.CSSProperties = { padding: '8px 10px', borderBottom: '1px solid #e5e7eb' };
const td: React.CSSProperties = { padding: '8px 10px', borderBottom: '1px solid #f1f5f9', verticalAlign: 'top' };

const LeakList: React.FC<{ title: string; rows: { what: string; visitors: number }[] }> = ({ title, rows }) => (
  <div>
    <b>{title}</b>
    {rows.length ? <ul style={{ margin: '6px 0 0', paddingLeft: 18 }}>{rows.map((r) => <li key={r.what}>{r.what} <b>({r.visitors})</b></li>)}</ul> : <p style={{ margin: '6px 0 0', color: '#9ca3af' }}>Nothing recorded yet.</p>}
  </div>
);

const Table: React.FC<{ title: string; rows: Row[]; cols: [keyof Row, string][] }> = ({ title, rows, cols }) => (
  <div style={{ ...card, padding: 16 }}>
    <b style={{ fontSize: 14 }}>{title}</b>
    <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13, marginTop: 8 }}>
      <thead><tr style={{ textAlign: 'left', color: '#6b7280', fontSize: 11.5 }}><th style={th}></th>{cols.map(([, l]) => <th key={l} style={th}>{l}</th>)}</tr></thead>
      <tbody>
        {rows.map((r) => <tr key={r.name}><td style={td}><b>{r.name}</b></td>{cols.map(([k, l]) => <td key={l} style={td}>{r[k] == null ? '—' : String(r[k]) + (String(k).startsWith('pct') ? '%' : '')}</td>)}</tr>)}
        {!rows.length && <tr><td style={{ ...td, color: '#9ca3af' }} colSpan={cols.length + 1}>No data in this period yet.</td></tr>}
      </tbody>
    </table>
  </div>
);

export default AdminJourney;
