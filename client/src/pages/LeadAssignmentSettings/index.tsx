import React, { useEffect, useMemo, useState } from 'react';
import { leadApi, leadAssignmentApi } from '../../api';
import './LeadAssignmentSettings.css';

/**
 * Lead Assignment — the ONE place an admin decides how new leads get a counsellor (2026-11-09).
 * Replaced Lead Distribution and the Assignment tab of Lead Scoring. Applies to every lead source.
 */
type Mode = 'manual' | 'round_robin' | 'rules';
interface Member { userId: string; available: boolean; maxPerDay: number | null }
interface Rule { name: string; enabled: boolean; sources: string[]; courses: string[]; members: string[] }
interface Counsellor { _id: string; firstName?: string; lastName?: string; email: string; roleName?: string }

const SOURCE_LABEL: Record<string, string> = {
  meta_form: 'Meta Ads', meta_ads: 'Meta Ads', facebook: 'Facebook', instagram: 'Instagram', google_ads: 'Google Ads', website: 'Website',
  whatsapp: 'WhatsApp', walkin: 'Walk-in', referral: 'Referral', phone: 'Phone', google_sheet: 'Google Sheet', linkedin: 'LinkedIn',
  youtube: 'YouTube', assessment: 'Assessment', other: 'Other',
};
const MODES: { key: Mode; title: string; text: string }[] = [
  { key: 'manual', title: 'Manual', text: 'Nobody is assigned automatically. Admins assign every lead by hand.' },
  { key: 'round_robin', title: 'Round robin', text: 'New leads rotate between the counsellors below, one after another.' },
  { key: 'rules', title: 'Rules', text: 'Leads matching a rule (source or course) go to that rule’s counsellors; the rest rotate between everyone below.' },
];
const name = (c?: Counsellor) => (c ? `${c.firstName || ''} ${c.lastName || ''}`.trim() || c.email : 'Unknown');

const LeadAssignmentSettings: React.FC = () => {
  const [mode, setMode] = useState<Mode>('manual');
  const [members, setMembers] = useState<Member[]>([]);
  const [rules, setRules] = useState<Rule[]>([]);
  const [counsellors, setCounsellors] = useState<Counsellor[]>([]);
  const [sources, setSources] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState<{ type: 'success' | 'danger'; text: string } | null>(null);

  useEffect(() => {
    Promise.all([
      leadAssignmentApi.get(),
      leadApi.getSources().catch(() => ({ data: [] })),
    ]).then(([r, s]: any[]) => {
      const d = r?.data || {};
      setMode(d.mode || 'manual');
      setMembers((d.members || []).map((m: any) => ({ userId: m.userId, available: m.available !== false, maxPerDay: m.maxPerDay ?? null })));
      setRules(d.rules || []);
      setCounsellors(d.counsellors || []);
      const known = (s?.data || []).map((x: any) => (typeof x === 'string' ? x : x._id || x.source)).filter(Boolean);
      setSources(Array.from(new Set([...Object.keys(SOURCE_LABEL), ...known])));
    }).catch((e: any) => setMsg({ type: 'danger', text: e.message || 'Could not load lead assignment' }))
      .finally(() => setLoading(false));
  }, []);

  const byId = useMemo(() => new Map(counsellors.map(c => [c._id, c])), [counsellors]);
  const memberIds = members.map(m => m.userId);
  const notAdded = counsellors.filter(c => !memberIds.includes(c._id));

  const setMember = (id: string, patch: Partial<Member>) => setMembers(ms => ms.map(m => (m.userId === id ? { ...m, ...patch } : m)));
  const removeMember = (id: string) => {
    setMembers(ms => ms.filter(m => m.userId !== id));
    setRules(rs => rs.map(r => ({ ...r, members: r.members.filter(x => x !== id) })));
  };
  const move = (i: number, d: number) => setMembers(ms => {
    const j = i + d; if (j < 0 || j >= ms.length) return ms;
    const c = [...ms]; [c[i], c[j]] = [c[j], c[i]]; return c;
  });
  const setRule = (i: number, patch: Partial<Rule>) => setRules(rs => rs.map((r, k) => (k === i ? { ...r, ...patch } : r)));
  const toggleIn = (list: string[], v: string) => (list.includes(v) ? list.filter(x => x !== v) : [...list, v]);

  const save = async () => {
    setSaving(true); setMsg(null);
    try {
      const r: any = await leadAssignmentApi.save({ mode, members, rules });
      const d = r?.data || {};
      setMembers(d.members || members); setRules(d.rules || rules);
      setMsg({ type: 'success', text: 'Saved. New leads from every source now follow this setting.' });
    } catch (e: any) { setMsg({ type: 'danger', text: e.message || 'Could not save' }); }
    finally { setSaving(false); }
  };

  if (loading) return <div className="las-page"><div className="las-muted">Loading…</div></div>;

  return (
    <div className="las-page">
      <header className="las-head">
        <div>
          <h1>Lead Assignment</h1>
          <p>How new leads get a counsellor. One setting for every source: Meta, website, WhatsApp, Google Sheets, Google Ads, assessment, manual and import.</p>
        </div>
        <button className="las-btn las-primary" onClick={save} disabled={saving}>{saving ? 'Saving…' : 'Save'}</button>
      </header>

      {msg && <div className={`alert alert-${msg.type} py-2`} role="status">{msg.text}</div>}

      <section className="las-card">
        <h2>Method</h2>
        <div className="las-modes" role="radiogroup" aria-label="Assignment method">
          {MODES.map(m => (
            <label key={m.key} className={`las-mode${mode === m.key ? ' on' : ''}`}>
              <input type="radio" name="mode" checked={mode === m.key} onChange={() => setMode(m.key)} />
              <span className="las-mode-title">{m.title}</span>
              <span className="las-mode-text">{m.text}</span>
            </label>
          ))}
        </div>
      </section>

      {mode !== 'manual' && (
        <section className="las-card">
          <h2>Counsellors</h2>
          <p className="las-muted">Leads rotate in this order. Switch someone off while they are on leave. A daily cap stops new leads once they have that many today.</p>
          {members.length === 0 && <div className="las-empty">No counsellors yet. Add at least one below.</div>}
          {members.length > 0 && (
            <table className="las-table">
              <thead><tr><th>Order</th><th>Counsellor</th><th>Taking leads</th><th>Daily cap</th><th /></tr></thead>
              <tbody>
                {members.map((m, i) => (
                  <tr key={m.userId} className={m.available ? '' : 'off'}>
                    <td className="las-order">
                      <button className="las-icon" onClick={() => move(i, -1)} disabled={i === 0} aria-label="Move up">▲</button>
                      <span>{i + 1}</span>
                      <button className="las-icon" onClick={() => move(i, 1)} disabled={i === members.length - 1} aria-label="Move down">▼</button>
                    </td>
                    <td>
                      <div className="fw-semibold">{name(byId.get(m.userId))}</div>
                      <div className="las-muted small">{byId.get(m.userId)?.roleName || (byId.has(m.userId) ? '' : 'No longer a counsellor — will be skipped')}</div>
                    </td>
                    <td>
                      <div className="form-check form-switch m-0">
                        <input className="form-check-input" type="checkbox" role="switch" checked={m.available}
                          onChange={e => setMember(m.userId, { available: e.target.checked })} aria-label={`${name(byId.get(m.userId))} taking leads`} />
                      </div>
                    </td>
                    <td>
                      <input className="form-control form-control-sm las-cap" type="number" min={0} placeholder="No cap"
                        value={m.maxPerDay ?? ''} onChange={e => setMember(m.userId, { maxPerDay: e.target.value === '' ? null : Number(e.target.value) })}
                        aria-label={`Daily cap for ${name(byId.get(m.userId))}`} />
                    </td>
                    <td><button className="las-link danger" onClick={() => removeMember(m.userId)}>Remove</button></td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
          {notAdded.length > 0 && (
            <div className="las-add">
              <select className="form-select form-select-sm" value="" onChange={e => e.target.value && setMembers(ms => [...ms, { userId: e.target.value, available: true, maxPerDay: null }])} aria-label="Add counsellor">
                <option value="">+ Add counsellor…</option>
                {notAdded.map(c => <option key={c._id} value={c._id}>{name(c)}{c.roleName ? ` — ${c.roleName}` : ''}</option>)}
              </select>
            </div>
          )}
          <p className="las-muted small mt-2">Only counsellors appear here: Super Admin, System Admin and roles with “BDM” in the name.</p>
        </section>
      )}

      {mode === 'rules' && (
        <section className="las-card">
          <div className="las-row">
            <h2>Rules</h2>
            <button className="las-btn" onClick={() => setRules(rs => [...rs, { name: `Rule ${rs.length + 1}`, enabled: true, sources: [], courses: [], members: [] }])}>+ Add rule</button>
          </div>
          <p className="las-muted">Checked top to bottom; the first rule that matches wins. A lead that matches no rule rotates between all counsellors above.</p>
          {rules.length === 0 && <div className="las-empty">No rules yet — every lead uses the round robin above.</div>}
          {rules.map((r, i) => (
            <div key={i} className={`las-rule${r.enabled ? '' : ' off'}`}>
              <div className="las-row">
                <input className="form-control form-control-sm las-rule-name" value={r.name} onChange={e => setRule(i, { name: e.target.value })} aria-label="Rule name" />
                <div className="d-flex align-items-center gap-3">
                  <label className="form-check form-switch m-0 d-flex align-items-center gap-2">
                    <input className="form-check-input" type="checkbox" role="switch" checked={r.enabled} onChange={e => setRule(i, { enabled: e.target.checked })} />
                    <span className="small">On</span>
                  </label>
                  <button className="las-icon" disabled={i === 0} onClick={() => setRules(rs => { const c = [...rs]; [c[i - 1], c[i]] = [c[i], c[i - 1]]; return c; })} aria-label="Move rule up">▲</button>
                  <button className="las-icon" disabled={i === rules.length - 1} onClick={() => setRules(rs => { const c = [...rs]; [c[i + 1], c[i]] = [c[i], c[i + 1]]; return c; })} aria-label="Move rule down">▼</button>
                  <button className="las-link danger" onClick={() => setRules(rs => rs.filter((_, k) => k !== i))}>Delete</button>
                </div>
              </div>
              <div className="las-field">
                <span className="las-label">Source is</span>
                <div className="las-chips">
                  {sources.map(s => (
                    <button type="button" key={s} className={`las-chip${r.sources.includes(s) ? ' on' : ''}`} onClick={() => setRule(i, { sources: toggleIn(r.sources, s) })}>{SOURCE_LABEL[s] || s}</button>
                  ))}
                </div>
                <span className="las-muted small">None picked = any source.</span>
              </div>
              <div className="las-field">
                <span className="las-label">Course contains</span>
                <input className="form-control form-control-sm" placeholder="e.g. Java, Python (comma separated; empty = any course)"
                  value={r.courses.join(', ')} onChange={e => setRule(i, { courses: e.target.value.split(',').map(x => x.trimStart()) })}
                  onBlur={() => setRule(i, { courses: r.courses.map(x => x.trim()).filter(Boolean) })} aria-label="Courses" />
              </div>
              <div className="las-field">
                <span className="las-label">Give to</span>
                <div className="las-chips">
                  {members.length === 0 && <span className="las-muted small">Add counsellors above first.</span>}
                  {members.map(m => (
                    <button type="button" key={m.userId} className={`las-chip${r.members.includes(m.userId) ? ' on' : ''}`} onClick={() => setRule(i, { members: toggleIn(r.members, m.userId) })}>{name(byId.get(m.userId))}</button>
                  ))}
                </div>
              </div>
            </div>
          ))}
        </section>
      )}

      <section className="las-card las-notes">
        <h2>Always true</h2>
        <ul>
          <li>A lead that already has a counsellor keeps them.</li>
          <li>Leads Outpero is calling wait for the call result, then get a counsellor (or after the wait set in Outpero settings).</li>
          <li>When the AI call says <b>not interested</b>, <b>wrong number</b> or <b>opt-out</b>, the lead stays unassigned. Admins can still assign it by hand.</li>
          <li>Admins can assign or reassign any lead from the Leads screen (row menu → Assign, or select several → Assign).</li>
        </ul>
      </section>
    </div>
  );
};

export default LeadAssignmentSettings;
