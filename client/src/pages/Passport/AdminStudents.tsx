import React, { useEffect, useState, useCallback } from 'react';
import passportApi from '../../api/passportApi';

const PassportAdminStudents: React.FC = () => {
  const [rows, setRows] = useState<any[]>([]);
  const [search, setSearch] = useState('');
  const [convertId, setConvertId] = useState('');
  const [msg, setMsg] = useState('');
  const [editId, setEditId] = useState('');
  const [editVal, setEditVal] = useState('');
  const [adding, setAdding] = useState(false);
  const [nw, setNw] = useState({ firstName: '', lastName: '', email: '', phone: '' });

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

  const removeMember = async (r: any) => {
    // The server refuses this for anyone who has paid or been assessed and returns the
    // reason, so the UI does not duplicate that rule — it just shows what came back.
    if (!window.confirm(`Permanently delete ${r.firstName}?\n\nThis only works for records created in error. Members who have paid or taken the assessment must be deactivated instead.`)) return;
    setMsg('');
    try { const r2 = await passportApi.deleteMember(r._id); setMsg('✅ ' + (r2.message || 'Deleted')); await load(); }
    catch (e: any) { setMsg(e?.response?.data?.message || 'Could not delete'); }
  };

  return (
    <div style={{ padding: '22px 26px', maxWidth: 980 }}>
      <div style={{ fontSize: 13, color: '#94a3b8', marginBottom: 8 }}>CareerPilot <span style={{ color: '#cbd5e1' }}>›</span> <b style={{ color: '#334155' }}>Students</b></div>
      <h1 style={{ fontSize: 24, fontWeight: 800, color: '#0f172a', margin: '0 0 16px' }}>CareerPilot Students</h1>

      <div style={{ background: '#f8fafc', border: '1px solid #eef1f6', borderRadius: 12, padding: 14, marginBottom: 16, display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
        <span style={{ fontSize: 13, fontWeight: 700, color: '#475569' }}>Manually activate a student:</span>
        <input placeholder="student id" value={convertId} onChange={e => setConvertId(e.target.value)} style={{ padding: '8px 10px', border: '1.5px solid #e2e8f0', borderRadius: 9, fontSize: 13, minWidth: 240 }} />
        <button onClick={convert} style={{ background: '#4f46e5', color: '#fff', border: 'none', borderRadius: 9, padding: '8px 16px', fontWeight: 700, fontSize: 13, cursor: 'pointer' }}>Activate</button>
        {msg && <span style={{ fontSize: 13, color: msg.startsWith('✅') ? '#16a34a' : '#dc2626' }}>{msg}</span>}
      </div>

      <input placeholder="Search name / email…" value={search} onChange={e => setSearch(e.target.value)} style={{ padding: '9px 12px', border: '1.5px solid #e2e8f0', borderRadius: 10, fontSize: 13.5, width: 300, marginBottom: 12 }} />

      {!adding ? (
        <button style={{ ...mini, marginBottom: 12, padding: '9px 15px' }} onClick={() => setAdding(true)}>+ Add member</button>
      ) : (
        <div style={{ background: '#fff', border: '1px solid #eef1f6', borderRadius: 12, padding: 14, marginBottom: 12, display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center' }}>
          <input placeholder="First name" value={nw.firstName} onChange={e => setNw({ ...nw, firstName: e.target.value })} style={inp} />
          <input placeholder="Last name" value={nw.lastName} onChange={e => setNw({ ...nw, lastName: e.target.value })} style={inp} />
          <input placeholder="Email" value={nw.email} onChange={e => setNw({ ...nw, email: e.target.value })} style={inp} />
          <input placeholder="Phone" value={nw.phone} onChange={e => setNw({ ...nw, phone: e.target.value })} style={inp} />
          <button style={mini} onClick={addMember} disabled={!nw.firstName.trim() || !nw.email.trim()}>Add</button>
          <button style={mini} onClick={() => setAdding(false)}>Cancel</button>
        </div>
      )}

      <div style={{ background: '#fff', border: '1px solid #eef1f6', borderRadius: 14, overflow: 'hidden' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
          <thead><tr style={{ background: '#f8fafc' }}>
            {['Student', 'Email', 'Status', 'Activated', 'Expires', ''].map(h => <th key={h} style={{ textAlign: 'left', padding: '10px 14px', fontSize: 11, fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase' }}>{h}</th>)}
          </tr></thead>
          <tbody>
            {rows.length === 0 ? <tr><td colSpan={6} style={{ padding: 30, textAlign: 'center', color: '#94a3b8' }}>No CareerPilot students yet.</td></tr> :
              rows.map(r => (
                <React.Fragment key={r._id}>
                <tr style={{ borderTop: '1px solid #f5f7fa', opacity: r.isActive === false ? .55 : 1 }}>
                  <td style={{ padding: '10px 14px', fontWeight: 600 }}>
                    {editId === r._id
                      ? <input defaultValue={`${r.firstName || ''} ${r.lastName || ''}`.trim()}
                          onChange={e => setEditVal(e.target.value)} style={inp} autoFocus />
                      : <>{r.firstName} {r.lastName}</>}
                  </td>
                  <td style={{ padding: '10px 14px', color: '#64748b' }}>{r.email}</td>
                  <td style={{ padding: '10px 14px' }}>
                    {/* Paid and active are different facts: someone can be a member whose
                        account has been deactivated, and staff need to see both. */}
                    <span style={r.passport?.active ? pillPaid : pillFree}>{r.passport?.active ? 'Member' : 'Free'}</span>
                    {r.isActive === false && <span style={pillOff}>Deactivated</span>}
                  </td>
                  <td style={{ padding: '10px 14px', color: '#64748b' }}>{r.passport?.activatedAt ? new Date(r.passport.activatedAt).toLocaleDateString('en-IN') : '—'}</td>
                  <td style={{ padding: '10px 14px', color: '#64748b' }}>{r.passport?.expiresAt ? new Date(r.passport.expiresAt).toLocaleDateString('en-IN') : '—'}</td>
                  <td style={{ padding: '10px 14px', whiteSpace: 'nowrap' }}>
                    {editId === r._id ? (
                      <>
                        <button style={mini} onClick={() => saveName(r)}>Save</button>
                        <button style={mini} onClick={() => setEditId('')}>Cancel</button>
                      </>
                    ) : (
                      <>
                        <button style={mini} onClick={() => openAnswers(r._id)}>{answersFor === r._id ? 'Hide answers' : 'Answers'}</button>
                        <button style={mini} onClick={() => openInterviews(r._id)}>{ivFor === r._id ? 'Hide interviews' : 'Interviews'}</button>
                        <button style={mini} onClick={() => { setEditId(r._id); setEditVal(`${r.firstName || ''} ${r.lastName || ''}`.trim()); }}>Edit</button>
                        <button style={mini} onClick={() => toggleActive(r)}>{r.isActive === false ? 'Restore' : 'Deactivate'}</button>
                        <button style={{ ...mini, color: '#b91c1c' }} onClick={() => removeMember(r)}>Delete</button>
                      </>
                    )}
                  </td>
                </tr>

                {answersFor === r._id && (
                  <tr>
                    <td colSpan={6} style={{ padding: '0 14px 16px', background: '#fbfcfe' }}>
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
                    <td colSpan={6} style={{ padding: '0 14px 16px', background: '#fbfcfe' }}>
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
    </div>
  );
};

const inp: React.CSSProperties = { border: '1px solid #e2e8f0', borderRadius: 8, padding: '8px 11px', fontSize: 13, color: '#0f172a', minWidth: 150 };
const mini: React.CSSProperties = { background: '#fff', border: '1px solid #e2e8f0', borderRadius: 7, padding: '6px 11px', fontSize: 12.5, fontWeight: 600, color: '#475569', cursor: 'pointer', marginRight: 6 };
const pillBase: React.CSSProperties = { display: 'inline-block', padding: '2px 9px', borderRadius: 999, fontSize: 10.5, fontWeight: 700, marginRight: 5 };
const pillPaid: React.CSSProperties = { ...pillBase, background: '#dcfce7', color: '#166534' };
const pillFree: React.CSSProperties = { ...pillBase, background: '#eef2f7', color: '#64748b' };
const pillOff: React.CSSProperties = { ...pillBase, background: '#fee2e2', color: '#b91c1c' };

export default PassportAdminStudents;
