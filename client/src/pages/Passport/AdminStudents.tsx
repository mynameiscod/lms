import React, { useEffect, useState, useCallback, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import passportApi from '../../api/passportApi';
import './adminStudents.css';
import { personName } from '../../utils/personName';
// Several shared classes (pm-btn, pm-msg and this page's own) live in the member stylesheet; import
// it here so the page is styled the same on a fresh load as after visiting a member page.
import './member.css';

type Filter = 'all' | 'member' | 'free' | 'comp' | 'off';
const PAGE = 25;
/** A member's display name: no stray "-" placeholder, and the email when there is no name at all. */
const nameOf = (r: any) => personName(r, 'Unnamed member');
const initialsOf = (n: string) => n.split(/[\s@.]+/).filter(Boolean).slice(0, 2).map(w => w[0]?.toUpperCase()).join('') || '?';
const fmt = (d?: string) => (d ? new Date(d).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' }) : '—');

const PassportAdminStudents: React.FC = () => {
  const nav = useNavigate();
  const [rows, setRows] = useState<any[]>([]);
  const [search, setSearch] = useState('');
  const [convertId, setConvertId] = useState('');
  const [msg, setMsg] = useState('');
  const [editId, setEditId] = useState('');
  const [editVal, setEditVal] = useState('');
  const [adding, setAdding] = useState(false);
  const [nw, setNw] = useState({ firstName: '', lastName: '', email: '', phone: '' });
  const [filter, setFilter] = useState<Filter>('all');
  const [page, setPage] = useState(1);
  const [menuFor, setMenuFor] = useState('');
  const [showActivate, setShowActivate] = useState(false);

  // The row menu closes on any click outside it.
  useEffect(() => {
    if (!menuFor) return;
    const close = (e: MouseEvent) => { if (!(e.target as HTMLElement).closest('.cpm-menu-wrap')) setMenuFor(''); };
    document.addEventListener('mousedown', close);
    return () => document.removeEventListener('mousedown', close);
  }, [menuFor]);

  // Written mission answers for one member, loaded on demand. Not folded into the list
  // query: it replays the mission generator per answered day, which is wasted work for
  // the members an admin never opens.
  const [answersFor, setAnswersFor] = useState<string>('');
  const [answers, setAnswers] = useState<any[] | null>(null);
  const [answersBusy, setAnswersBusy] = useState(false);

  // Mock interviews for one member, same load-on-demand shape as the answers panel.
  // Only one of the two panels is open at a time — they are both wide, and stacking them
  // under one row makes the table unreadable.
  const [ivFor, setIvFor] = useState<string>('');
  const [ivs, setIvs] = useState<any[] | null>(null);
  const [ivBusy, setIvBusy] = useState(false);

  const openInterviews = async (id: string) => {
    if (ivFor === id) { setIvFor(''); setIvs(null); return; }
    setAnswersFor(''); setAnswers(null);
    setIvFor(id); setIvs(null); setIvBusy(true);
    try { setIvs((await passportApi.listStudentInterviews(id)).interviews); }
    catch { setIvs([]); }
    setIvBusy(false);
  };

  const openAnswers = async (id: string) => {
    if (answersFor === id) { setAnswersFor(''); setAnswers(null); return; }
    setIvFor(''); setIvs(null);
    setAnswersFor(id); setAnswers(null); setAnswersBusy(true);
    try { setAnswers((await passportApi.listStudentAnswers(id)).answers); }
    catch { setAnswers([]); }
    setAnswersBusy(false);
  };

  const load = useCallback(async () => {
    try { setRows(await passportApi.listStudents(search)); } catch { setRows([]); }
  }, [search]);
  useEffect(() => { load(); }, [load]);

  const convert = async () => {
    if (!convertId.trim()) return;
    setMsg('');
    try { const r = await passportApi.convert(convertId.trim()); setMsg('✅ ' + (r.message || 'Activated')); setConvertId(''); await load(); }
    catch (e: any) { setMsg(e?.response?.data?.message || 'Failed'); }
  };

  const addMember = async () => {
    setMsg('');
    try {
      await passportApi.createMember(nw);
      setNw({ firstName: '', lastName: '', email: '', phone: '' });
      setAdding(false);
      setMsg('✅ Member added. They start on the free tier — use Activate above to grant membership.');
      await load();
    } catch (e: any) { setMsg(e?.response?.data?.message || 'Could not add member'); }
  };

  const saveName = async (r: any) => {
    const parts = editVal.trim().split(/\s+/);
    setMsg('');
    try {
      await passportApi.updateMember(r._id, { firstName: parts[0] || '', lastName: parts.slice(1).join(' ') });
      setEditId('');
      await load();
    } catch (e: any) { setMsg(e?.response?.data?.message || 'Could not save'); }
  };

  const toggleActive = async (r: any) => {
    const next = r.isActive === false;
    if (!next && !window.confirm(`Deactivate ${r.firstName}? They keep their data and can be restored at any time.`)) return;
    setMsg('');
    try { await passportApi.setMemberActive(r._id, next); await load(); }
    catch (e: any) { setMsg(e?.response?.data?.message || 'Could not change status'); }
  };

  /**
    * Complimentary access, with the reason recorded.
    *
    * The reason is required by the server rather than optional here: a grant with no
    * reason is indistinguishable from a mistake once whoever made it has moved on, which
    * is exactly the state hand-editing the database used to leave things in.
    */
  const grantAccess = async (r: any) => {
    const reason = window.prompt(
      `Give ${r.firstName || 'this member'} complimentary access.\n\nWhy? (shown to staff later, e.g. "sales demo", "college pilot")`,
      'Demo account',
    );
    if (reason === null) return;
    if (!reason.trim()) { setMsg('A reason is required.'); return; }

    const daysRaw = window.prompt('For how many days? (1–365)', '30');
    if (daysRaw === null) return;
    const days = Number(daysRaw);
    if (!Number.isFinite(days) || days < 1 || days > 365) { setMsg('Enter a number of days between 1 and 365.'); return; }

    setMsg('');
    try {
      const res = await passportApi.grantMembership(r._id, days, reason.trim());
      setMsg(`✅ Access granted until ${new Date(res.expiresAt).toLocaleDateString('en-IN')}.`);
      await load();
    } catch (e: any) { setMsg(e?.response?.data?.message || 'Could not grant access'); }
  };

  const revokeAccess = async (r: any) => {
    if (!window.confirm(`Revoke complimentary access for ${r.firstName || 'this member'}?\n\nThey keep their data and can be granted access again.`)) return;
    setMsg('');
    try {
      await passportApi.revokeMembership(r._id);
      setMsg('✅ Access revoked.');
      await load();
    } catch (e: any) { setMsg(e?.response?.data?.message || 'Could not revoke access'); }
  };

  const removeMember = async (r: any) => {
    // The server refuses this for anyone who has paid or been assessed and returns the
    // reason, so the UI does not duplicate that rule — it just shows what came back.
    if (!window.confirm(`Permanently delete ${r.firstName}?\n\nThis only works for records created in error. Members who have paid or taken the assessment must be deactivated instead.`)) return;
    setMsg('');
    try { const r2 = await passportApi.deleteMember(r._id); setMsg('✅ ' + (r2.message || 'Deleted')); await load(); }
    catch (e: any) { setMsg(e?.response?.data?.message || 'Could not delete'); }
  };

  const counts = useMemo(() => ({
    all: rows.length,
    member: rows.filter(r => r.passport?.active && !r.passport?.grant?.at).length,
    free: rows.filter(r => !r.passport?.active).length,
    comp: rows.filter(r => r.passport?.grant?.at).length,
    off: rows.filter(r => r.isActive === false).length,
  }), [rows]);
  const shown = useMemo(() => rows.filter(r =>
    filter === 'all' ? true
      : filter === 'member' ? r.passport?.active && !r.passport?.grant?.at
      : filter === 'free' ? !r.passport?.active
      : filter === 'comp' ? !!r.passport?.grant?.at
      : r.isActive === false), [rows, filter]);
  const pages = Math.max(1, Math.ceil(shown.length / PAGE));
  const pageRows = shown.slice((Math.min(page, pages) - 1) * PAGE, Math.min(page, pages) * PAGE);
  useEffect(() => { setPage(1); }, [filter, search]);
  const ok = msg.startsWith('✅');

  return (
    <div className="cpm">
      <header className="cpx-head">
        <div>
          <span className="cpx-eyebrow">CareerPilot</span>
          <h1>Members</h1>
          <p>Everyone who has signed up for CareerPilot: their membership, their roadmap, what they wrote and their mock interviews.</p>
        </div>
        <div className="cpm-head-actions">
          <button className="cpx-btn" onClick={() => setShowActivate(v => !v)}><i className="bi bi-patch-check" /> Activate by ID</button>
          <button className="cpx-btn primary" onClick={() => setAdding(true)}><i className="bi bi-person-plus" /> Add member</button>
        </div>
      </header>

      {msg && <div className={`pm-msg ${ok ? 'ok' : 'err'}`}>{msg.replace(/^✅\s*/, '')}</div>}

      {showActivate && (
        <div className="cpm-panel">
          <b>Activate a membership manually</b>
          <span className="cpm-panel-note">Paste the student's ID. Use this when a payment was taken outside CareerPilot.</span>
          <div className="cpm-panel-row">
            <input aria-label="Student ID" placeholder="Student ID" value={convertId} onChange={e => setConvertId(e.target.value)} />
            <button className="cpx-btn primary" onClick={convert} disabled={!convertId.trim()}>Activate</button>
          </div>
        </div>
      )}

      {adding && (
        <div className="cpm-panel">
          <b>Add a member</b>
          <span className="cpm-panel-note">They start on the free tier. Activate them afterwards to grant membership.</span>
          <div className="cpm-add-grid">
            <input aria-label="First name" placeholder="First name" value={nw.firstName} onChange={e => setNw({ ...nw, firstName: e.target.value })} />
            <input aria-label="Last name" placeholder="Last name" value={nw.lastName} onChange={e => setNw({ ...nw, lastName: e.target.value })} />
            <input aria-label="Email" placeholder="Email" value={nw.email} onChange={e => setNw({ ...nw, email: e.target.value })} />
            <input aria-label="Phone" placeholder="Phone" value={nw.phone} onChange={e => setNw({ ...nw, phone: e.target.value })} />
          </div>
          <div className="cpm-panel-row end">
            <button className="cpx-btn" onClick={() => setAdding(false)}>Cancel</button>
            <button className="cpx-btn primary" onClick={addMember} disabled={!nw.firstName.trim() || !nw.email.trim()}>Add member</button>
          </div>
        </div>
      )}

      <div className="cpm-toolbar">
        <div className="cpm-search">
          <i className="bi bi-search" aria-hidden="true" />
          <input placeholder="Search by name or email" value={search} onChange={e => setSearch(e.target.value)} aria-label="Search members" />
        </div>
        <div className="cpm-filters" role="tablist" aria-label="Filter members">
          {([['all', 'All'], ['member', 'Members'], ['free', 'Free'], ['comp', 'Complimentary'], ['off', 'Deactivated']] as [Filter, string][]).map(([k, label]) => (
            <button key={k} role="tab" aria-selected={filter === k} className={filter === k ? 'on' : ''} onClick={() => setFilter(k)}>
              {label} <em>{counts[k]}</em>
            </button>
          ))}
        </div>
      </div>

      <div className="cpm-table-card">
        <table className="cpm-table">
          <thead><tr><th>Member</th><th>Status</th><th>Activated</th><th>Expires</th><th aria-label="Actions" /></tr></thead>
          <tbody>
            {pageRows.length === 0 ? <tr><td colSpan={5} className="cpm-empty">{rows.length ? 'No members match this filter.' : 'No CareerPilot members yet.'}</td></tr> :
              pageRows.map(r => (
                <React.Fragment key={r._id}>
                <tr className={r.isActive === false ? 'off' : ''}>
                  <td className="cpm-who" data-label="Member">
                    <span className="cpm-avatar" aria-hidden="true">{initialsOf(nameOf(r))}</span>
                    {editId === r._id
                      ? <input className="cpm-edit" aria-label="Full name" defaultValue={nameOf(r) === r.email ? '' : nameOf(r)} placeholder="Full name"
                          onChange={e => setEditVal(e.target.value)} autoFocus />
                      : <span className="cpm-names">
                          {/* The name opens the member's full profile. */}
                          <button type="button" className="cpm-name-link" onClick={() => nav(`/admin/passport/students/${r._id}`)}>{nameOf(r)}</button>
                          {nameOf(r) !== r.email && <small>{r.email}</small>}
                        </span>}
                  </td>
                  <td data-label="Status">
                    {/* Paid and active are different facts: someone can be a member whose
                        account has been deactivated, and staff need to see both. */}
                    <span className={`cpm-pill ${r.passport?.active ? 'paid' : 'free'}`}>{r.passport?.active ? 'Member' : 'Free'}</span>
                    {/* A complimentary member is a member — but staff must be able to tell
                        them apart from a customer at a glance, and see why. */}
                    {r.passport?.grant?.at && (
                      <span className="cpm-pill comp"
                        title={`${r.passport.grant.reason || 'granted'} — by ${r.passport.grant.byName || 'admin'} on ${new Date(r.passport.grant.at).toLocaleDateString('en-IN')}`}>
                        Complimentary
                      </span>
                    )}
                    {r.isActive === false && <span className="cpm-pill off">Deactivated</span>}
                  </td>
                  <td data-label="Activated" className="cpm-date">{fmt(r.passport?.activatedAt)}</td>
                  <td data-label="Expires" className="cpm-date">{fmt(r.passport?.expiresAt)}</td>
                  <td className="cpm-actions">
                    {editId === r._id ? (
                      <>
                        <button className="cpx-btn" onClick={() => setEditId('')}>Cancel</button>
                        <button className="cpx-btn primary" onClick={() => saveName(r)}>Save</button>
                      </>
                    ) : (
                      <>
                        <button className="cpx-btn" onClick={() => nav(`/admin/passport/students/${r._id}/roadmap`)}><i className="bi bi-map" /> Roadmap</button>
                        <span className="cpm-menu-wrap">
                          <button className="cpx-btn cpm-more" aria-haspopup="menu" aria-expanded={menuFor === r._id} aria-label={`More actions for ${nameOf(r)}`}
                            onClick={() => setMenuFor(menuFor === r._id ? '' : r._id)}><i className="bi bi-three-dots" /></button>
                          {menuFor === r._id && (
                            <span className="cpm-menu" role="menu">
                              <button role="menuitem" onClick={() => { setMenuFor(''); nav(`/admin/passport/students/${r._id}`); }}><i className="bi bi-person-vcard" /> Full profile</button>
                              <button role="menuitem" onClick={() => { setMenuFor(''); openAnswers(r._id); }}><i className="bi bi-chat-left-text" /> {answersFor === r._id ? 'Hide answers' : 'Mission answers'}</button>
                              <button role="menuitem" onClick={() => { setMenuFor(''); openInterviews(r._id); }}><i className="bi bi-mic" /> {ivFor === r._id ? 'Hide interviews' : 'Mock interviews'}</button>
                              <button role="menuitem" onClick={() => { setMenuFor(''); setEditId(r._id); setEditVal(nameOf(r) === r.email ? '' : nameOf(r)); }}><i className="bi bi-pencil" /> Edit name</button>
                              {r.passport?.grant?.at
                                ? <button role="menuitem" onClick={() => { setMenuFor(''); revokeAccess(r); }}><i className="bi bi-x-octagon" /> Revoke access</button>
                                : <button role="menuitem" onClick={() => { setMenuFor(''); grantAccess(r); }}><i className="bi bi-gift" /> Grant access</button>}
                              <button role="menuitem" onClick={() => { setMenuFor(''); toggleActive(r); }}><i className={`bi ${r.isActive === false ? 'bi-arrow-counterclockwise' : 'bi-pause-circle'}`} /> {r.isActive === false ? 'Restore' : 'Deactivate'}</button>
                              <button role="menuitem" className="danger" onClick={() => { setMenuFor(''); removeMember(r); }}><i className="bi bi-trash" /> Delete</button>
                            </span>
                          )}
                        </span>
                      </>
                    )}
                  </td>
                </tr>

                {answersFor === r._id && (
                  <tr>
                    <td colSpan={5} className="cpm-detail">
                      {answersBusy ? (
                        <div style={{ padding: 14, color: '#94a3b8', fontSize: 13 }}>Loading answers…</div>
                      ) : !answers?.length ? (
                        <div style={{ padding: 14, color: '#94a3b8', fontSize: 13 }}>
                          This member hasn't written any mission answers yet.
                        </div>
                      ) : (
                        <div style={{ display: 'grid', gap: 10, paddingTop: 12 }}>
                          {answers.map(a => (
                            <div key={`${a.day}-${a.key}`} style={{ background: '#fff', border: '1px solid #eef0f7', borderRadius: 10, padding: '11px 13px' }}>
                              <div style={{ display: 'flex', gap: 8, alignItems: 'baseline', flexWrap: 'wrap', marginBottom: 5 }}>
                                <span style={{ fontSize: 10.5, fontWeight: 800, color: '#6650d8', background: '#f1eeff', borderRadius: 99, padding: '2px 8px' }}>DAY {a.day}</span>
                                <b style={{ fontSize: 13, color: '#0f172a' }}>{a.title}</b>
                                <span style={{ fontSize: 11.5, color: '#94a3b8', marginLeft: 'auto' }}>
                                  {a.at ? new Date(a.at).toLocaleDateString('en-IN') : ''}
                                </span>
                              </div>
                              {/* pre-wrap: the member typed line breaks and they carry meaning
                                  (one role, then three skills). Collapsing them loses the shape. */}
                              <div style={{ fontSize: 13, color: '#29313f', lineHeight: 1.6, whiteSpace: 'pre-wrap' }}>{a.answer}</div>
                              {/* The extracted fields are the point of this screen at scale:
                                  prose cannot be counted, these can. Shown per answer so you
                                  can sanity-check the extraction against the words above it
                                  before trusting any aggregate built on top. */}
                              {a.extract && (a.extract.targetRole || a.extract.skills?.length || a.extract.gaps?.length) && (
                                <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginTop: 8, paddingTop: 8, borderTop: '1px dashed #eef0f7' }}>
                                  {a.extract.targetRole && <span style={{ fontSize: 11, fontWeight: 700, background: '#eef2ff', color: '#4338ca', borderRadius: 99, padding: '3px 9px' }}>🎯 {a.extract.targetRole}</span>}
                                  {(a.extract.skills || []).map(k => <span key={`s-${k}`} style={{ fontSize: 11, fontWeight: 700, background: '#ecfdf5', color: '#047857', borderRadius: 99, padding: '3px 9px' }}>{k}</span>)}
                                  {(a.extract.gaps || []).map(k => <span key={`g-${k}`} style={{ fontSize: 11, fontWeight: 700, background: '#fff7ed', color: '#c2410c', borderRadius: 99, padding: '3px 9px' }}>gap: {k}</span>)}
                                  {typeof a.extract.specificity === 'number' && <span style={{ fontSize: 11, fontWeight: 700, color: '#94a3b8' }}>specificity {a.extract.specificity}/3</span>}
                                  {a.extract.flag && a.extract.flag !== 'none' && <span style={{ fontSize: 11, fontWeight: 800, background: '#fef2f2', color: '#b91c1c', borderRadius: 99, padding: '3px 9px' }}>⚠ {a.extract.flag.replace(/_/g, ' ')}</span>}
                                </div>
                              )}
                              {a.feedback && (
                                <div style={{ marginTop: 8, background: '#f8fafc', borderLeft: '3px solid #c7d2fe', borderRadius: 6, padding: '8px 11px', fontSize: 12.5, color: '#475569', lineHeight: 1.55 }}>
                                  <b style={{ color: '#6650d8', fontSize: 10.5, letterSpacing: .4 }}>COACH SAID</b><br />{a.feedback}
                                </div>
                              )}
                            </div>
                          ))}
                        </div>
                      )}
                    </td>
                  </tr>
                )}

                {ivFor === r._id && (
                  <tr>
                    <td colSpan={5} className="cpm-detail">
                      {ivBusy ? (
                        <div style={{ padding: 14, color: '#94a3b8', fontSize: 13 }}>Loading interviews…</div>
                      ) : !ivs?.length ? (
                        <div style={{ padding: 14, color: '#94a3b8', fontSize: 13 }}>
                          This member hasn't sat a mock interview yet.
                        </div>
                      ) : (
                        <div style={{ display: 'grid', gap: 10, paddingTop: 12 }}>
                          {ivs.map(s => (
                            <details key={s.id} style={{ background: '#fff', border: '1px solid #eef0f7', borderRadius: 10, padding: '11px 13px' }}>
                              <summary style={{ cursor: 'pointer', listStyle: 'none', display: 'flex', gap: 8, alignItems: 'baseline', flexWrap: 'wrap' }}>
                                <span style={{
                                  fontSize: 12, fontWeight: 900, borderRadius: 99, padding: '3px 9px',
                                  background: s.status === 'completed' ? '#eef2ff' : '#f1f5f9',
                                  color: s.status === 'completed' ? '#4338ca' : '#64748b',
                                }}>
                                  {s.evaluation ? `${s.evaluation.overallScore}%` : s.status.replace(/_/g, ' ')}
                                </span>
                                <b style={{ fontSize: 13, color: '#0f172a' }}>{s.role}</b>
                                <span style={{ fontSize: 11.5, color: '#94a3b8' }}>{s.answers} answers</span>
                                <span style={{ fontSize: 11.5, color: '#94a3b8', marginLeft: 'auto' }}>
                                  {s.startedAt ? new Date(s.startedAt).toLocaleDateString('en-IN') : ''}
                                </span>
                              </summary>

                              {s.evaluation?.summary && (
                                <div style={{ marginTop: 10, fontSize: 12.5, color: '#475569', lineHeight: 1.6 }}>{s.evaluation.summary}</div>
                              )}
                              {!!s.evaluation?.areaScores?.length && (
                                <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginTop: 8 }}>
                                  {s.evaluation.areaScores.map((a: any, i: number) => (
                                    <span key={i} style={{ fontSize: 11, fontWeight: 700, background: '#f8fafc', color: '#475569', border: '1px solid #eef0f7', borderRadius: 99, padding: '3px 9px' }}>
                                      {a.title} {a.percentage}%
                                    </span>
                                  ))}
                                </div>
                              )}
                              {/* The transcript is the whole reason to look at this: a score
                                  says a member struggled, the words say what to teach them. */}
                              <div style={{ marginTop: 10, paddingTop: 10, borderTop: '1px dashed #eef0f7', display: 'grid', gap: 7 }}>
                                {s.transcript.map((t: any, i: number) => (
                                  <div key={i} style={{ fontSize: 12.5, lineHeight: 1.6, color: t.role === 'interviewer' ? '#6650d8' : '#29313f' }}>
                                    <b style={{ fontSize: 10.5, letterSpacing: .4 }}>{t.role === 'interviewer' ? 'PRIYA' : 'MEMBER'}</b>{' '}
                                    <span style={{ whiteSpace: 'pre-wrap' }}>{t.text}</span>
                                  </div>
                                ))}
                              </div>
                            </details>
                          ))}
                        </div>
                      )}
                    </td>
                  </tr>
                )}
                </React.Fragment>
              ))}
          </tbody>
        </table>
      </div>

      {pages > 1 && (
        <nav className="cpm-pager" aria-label="Pages">
          <button className="cpx-btn" disabled={page <= 1} onClick={() => setPage(p => p - 1)}><i className="bi bi-chevron-left" /> Previous</button>
          <span>Page {Math.min(page, pages)} of {pages} · {shown.length} members</span>
          <button className="cpx-btn" disabled={page >= pages} onClick={() => setPage(p => p + 1)}>Next <i className="bi bi-chevron-right" /></button>
        </nav>
      )}
    </div>
  );
};


export default PassportAdminStudents;
