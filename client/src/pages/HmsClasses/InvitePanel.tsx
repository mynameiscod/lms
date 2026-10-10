import React, { useCallback, useEffect, useState } from 'react';
import { hmsClassApi, HmsClass, HmsInvite, HmsInviteSendResult } from '../../api';

/**
 * Who a live class is for, and the invitations. A host can:
 *   - open it to everyone in the institute,
 *   - add whole batches,
 *   - pick people by name, or paste emails / mobile numbers (people with no LMS account too),
 * then send everyone a personal join link by email (with a calendar invite) and WhatsApp.
 */

interface Person { _id: string; name: string; email: string; phone: string; role: string }

const when = (d?: string | null) => (d ? new Date(d).toLocaleString('en-IN', { day: 'numeric', month: 'short', hour: 'numeric', minute: '2-digit' }) : '');
const KIND: Record<HmsInvite['kind'], string> = { user: 'Picked', contact: 'Pasted', batch: 'Batch' };

const InvitePanel: React.FC<{ cls: HmsClass; batches: { _id: string; name: string }[]; onClose: () => void }> = ({ cls, batches, onClose }) => {
  const [invites, setInvites] = useState<HmsInvite[]>([]);
  const [classBatches, setClassBatches] = useState<string[]>([]);
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState('');
  const [ok, setOk] = useState('');
  const [busy, setBusy] = useState(false);

  const [q, setQ] = useState('');
  const [found, setFound] = useState<Person[]>([]);
  const [picked, setPicked] = useState<Person[]>([]);
  const [pasted, setPasted] = useState('');
  const [addBatches, setAddBatches] = useState<string[]>([]);
  const [viaEmail, setViaEmail] = useState(true);
  const [viaWa, setViaWa] = useState(true);
  const [copied, setCopied] = useState('');

  const load = useCallback(async () => {
    try {
      const r: any = await hmsClassApi.invites(cls._id);
      if (!r.success) throw new Error(r.message);
      setInvites(r.data.invites); setClassBatches(r.data.batchIds); setOpen(r.data.openToInstitute);
    } catch (e: any) { setErr(e.message || 'Could not load invites.'); }
    setLoading(false);
  }, [cls._id]);
  useEffect(() => { load(); }, [load]);

  useEffect(() => {
    const term = q.trim();
    if (term.length < 2) { setFound([]); return; }
    const t = setTimeout(async () => {
      try { const r: any = await hmsClassApi.searchPeople(term); setFound(r.success ? r.data : []); } catch { setFound([]); }
    }, 250);
    return () => clearTimeout(t);
  }, [q]);

  const sentNote = (s: HmsInviteSendResult | null | undefined) => {
    if (!s) return '';
    const parts = [`${s.email} email${s.email === 1 ? '' : 's'}`, `${s.whatsapp} WhatsApp message${s.whatsapp === 1 ? '' : 's'}`];
    return ` Sending ${parts.join(' and ')} now.${s.whatsappSkipped ? ` ${s.whatsappSkipped}` : ''}`;
  };

  const add = async (send: boolean) => {
    setErr(''); setOk('');
    if (!picked.length && !pasted.trim() && !addBatches.length) { setErr('Pick people, paste emails or mobiles, or choose a batch first.'); return; }
    setBusy(true);
    try {
      const r: any = await hmsClassApi.addInvites(cls._id, {
        userIds: picked.map((p) => p._id), contacts: pasted, batchIds: addBatches,
        ...(send ? { send: { email: viaEmail, whatsapp: viaWa } } : {}),
      });
      if (!r.success) throw new Error(r.message);
      const d = r.data;
      setOk(`Added ${d.added} ${d.added === 1 ? 'person' : 'people'}${d.batchesAdded ? ` and ${d.batchesAdded} batch${d.batchesAdded === 1 ? '' : 'es'}` : ''}.${d.already ? ` ${d.already} already invited.` : ''}${d.invalid?.length ? ` Not understood: ${d.invalid.slice(0, 3).join('; ')}.` : ''}${sentNote(d.sent)}`);
      setPicked([]); setPasted(''); setAddBatches([]); setQ('');
      await load();
      if (send) setTimeout(load, 4000);
    } catch (e: any) { setErr(e.message || 'Could not add invites.'); }
    setBusy(false);
  };

  const sendAll = async (onlyUnsent: boolean) => {
    setErr(''); setOk(''); setBusy(true);
    try {
      const r: any = await hmsClassApi.sendInvites(cls._id, { email: viaEmail, whatsapp: viaWa, onlyUnsent });
      if (!r.success) throw new Error(r.message);
      setOk(`${r.data.recipients} invited.${sentNote(r.data)}`);
      setTimeout(load, 4000);
    } catch (e: any) { setErr(e.message || 'Could not send.'); }
    setBusy(false);
  };

  const resend = async (inv: HmsInvite) => {
    setErr(''); setOk('');
    try {
      const r: any = await hmsClassApi.sendInvites(cls._id, { inviteIds: [inv._id], email: viaEmail, whatsapp: viaWa });
      if (!r.success) throw new Error(r.message);
      setOk(`Sending again to ${inv.name || inv.email || inv.phone}.${sentNote(r.data)}`);
      setTimeout(load, 4000);
    } catch (e: any) { setErr(e.message); }
  };

  const remove = async (inv: HmsInvite) => {
    try { await hmsClassApi.removeInvite(cls._id, inv._id); load(); } catch (e: any) { setErr(e.message); }
  };
  const dropBatch = async (b: string) => {
    try { await hmsClassApi.removeBatch(cls._id, b); load(); } catch (e: any) { setErr(e.message); }
  };
  const toggleOpen = async (v: boolean) => {
    try { await hmsClassApi.addInvites(cls._id, { openToInstitute: v }); setOpen(v); } catch (e: any) { setErr(e.message); }
  };
  const copy = async (inv: HmsInvite) => {
    try { await navigator.clipboard.writeText(inv.link); setCopied(inv._id); setTimeout(() => setCopied(''), 1500); }
    catch { window.prompt('Copy this join link:', inv.link); }
  };

  const batchName = (id: string) => batches.find((b) => b._id === id)?.name || 'Batch';
  const pending = invites.filter((i) => (i.email && !i.emailSentAt) || (i.phone && !i.whatsappSentAt)).length;

  return (
    <div style={back} onClick={(e) => { if (e.target === e.currentTarget) onClose(); }} role="dialog" aria-modal="true" aria-label="Invite people">
      <div style={sheet}>
        <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12, alignItems: 'flex-start' }}>
          <div>
            <h3 style={{ margin: 0, fontSize: 18 }}>Invite people</h3>
            <div style={{ color: '#6b7280', fontSize: 13 }}>{cls.title} · {when(cls.scheduledAt)}</div>
          </div>
          <button onClick={onClose} style={ghost} aria-label="Close">✕</button>
        </div>

        {err && <div style={alertBad} role="alert">{err}</div>}
        {ok && <div style={alertOk} role="status">{ok}</div>}

        <label style={{ display: 'flex', gap: 8, alignItems: 'center', margin: '14px 0 4px', cursor: 'pointer' }}>
          <input type="checkbox" checked={open} onChange={(e) => toggleOpen(e.target.checked)} />
          <span><b>Everyone in the institute</b> can see and join this class</span>
        </label>

        <section style={card}>
          <div style={h4}>Add people</div>
          <label style={lbl} htmlFor="inv-search">Find by name, email or mobile</label>
          <input id="inv-search" style={input} value={q} onChange={(e) => setQ(e.target.value)} placeholder="Type at least 2 letters…" />
          {found.length > 0 && (
            <div style={dropdown}>
              {found.filter((f) => !picked.some((p) => p._id === f._id)).map((f) => (
                <button key={f._id} style={option} onClick={() => { setPicked((p) => [...p, f]); setQ(''); }}>
                  <b>{f.name || f.email}</b> <span style={{ color: '#6b7280' }}>{f.email}{f.phone ? ` · ${f.phone}` : ''} · {f.role.toLowerCase()}</span>
                </button>
              ))}
            </div>
          )}
          {picked.length > 0 && (
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginTop: 8 }}>
              {picked.map((p) => (
                <span key={p._id} style={chip}>{p.name || p.email}
                  <button style={chipX} onClick={() => setPicked((x) => x.filter((y) => y._id !== p._id))} aria-label={`Remove ${p.name}`}>×</button>
                </span>
              ))}
            </div>
          )}

          <label style={{ ...lbl, marginTop: 12 }} htmlFor="inv-paste">Or paste emails / mobile numbers (one person per line)</label>
          <textarea id="inv-paste" style={{ ...input, minHeight: 90, fontFamily: 'inherit' }} value={pasted} onChange={(e) => setPasted(e.target.value)}
            placeholder={'ravi@gmail.com\nPriya Sharma, priya@college.edu, 98765 43210\n91234 56789'} />
          <div style={hint}>People without an LMS account can join too: they get a personal link and no login is needed.</div>

          <label style={{ ...lbl, marginTop: 12 }}>Add batches</label>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
            {batches.filter((b) => !classBatches.includes(b._id)).map((b) => (
              <label key={b._id} style={{ ...chip, cursor: 'pointer', background: addBatches.includes(b._id) ? '#dbeafe' : '#f3f4f6' }}>
                <input type="checkbox" checked={addBatches.includes(b._id)}
                  onChange={(e) => setAddBatches((x) => e.target.checked ? [...x, b._id] : x.filter((y) => y !== b._id))} /> {b.name}
              </label>
            ))}
            {!batches.length && <span style={hint}>No batches found.</span>}
          </div>

          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 14, alignItems: 'center', marginTop: 14 }}>
            <span style={{ fontSize: 13, fontWeight: 600 }}>Send by</span>
            <label style={{ fontSize: 13 }}><input type="checkbox" checked={viaEmail} onChange={(e) => setViaEmail(e.target.checked)} /> Email (with calendar invite)</label>
            <label style={{ fontSize: 13 }}><input type="checkbox" checked={viaWa} onChange={(e) => setViaWa(e.target.checked)} /> WhatsApp</label>
          </div>
          <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end', marginTop: 12, flexWrap: 'wrap' }}>
            <button style={secondary} disabled={busy} onClick={() => add(false)}>Add without sending</button>
            <button style={primary} disabled={busy || (!viaEmail && !viaWa)} onClick={() => add(true)}>{busy ? 'Working…' : 'Add & send invites'}</button>
          </div>
        </section>

        <section style={card}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
            <div style={h4}>Invited ({invites.length}){classBatches.length ? ` · ${classBatches.length} batch${classBatches.length === 1 ? '' : 'es'}` : ''}</div>
            <button style={secondary} disabled={busy || (!viaEmail && !viaWa)} onClick={() => sendAll(true)}>
              Send to everyone not yet sent{pending ? ` (${pending})` : ''}
            </button>
          </div>
          {classBatches.length > 0 && (
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, margin: '8px 0' }}>
              {classBatches.map((b) => (
                <span key={b} style={chip}>👥 {batchName(b)}<button style={chipX} onClick={() => dropBatch(b)} aria-label={`Remove batch ${batchName(b)}`}>×</button></span>
              ))}
            </div>
          )}
          {classBatches.length > 0 && <div style={hint}>Batch students are listed below once invites are sent. Students who join a batch later can still find the class in Live Classes.</div>}
          {loading ? <p style={hint}>Loading…</p> : !invites.length ? <p style={hint}>Nobody invited yet.</p> : (
            <div style={{ overflowX: 'auto', marginTop: 8 }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
                <thead><tr>{['Person', 'From', 'Email', 'WhatsApp', 'Joined', ''].map((h) => <th key={h} style={th}>{h}</th>)}</tr></thead>
                <tbody>
                  {invites.map((i) => (
                    <tr key={i._id}>
                      <td style={td}><b>{i.name || i.email || i.phone}</b>
                        <div style={{ color: '#6b7280', fontSize: 12 }}>{[i.email, i.phone].filter(Boolean).join(' · ')}{i.hasAccount ? '' : ' · guest'}</div>
                        {i.lastSendError && <div style={{ color: '#b91c1c', fontSize: 12 }}>{i.lastSendError}</div>}
                      </td>
                      <td style={td}>{KIND[i.kind]}</td>
                      <td style={td}>{!i.email ? '—' : i.emailSentAt ? `✓ ${when(i.emailSentAt)}` : 'Not sent'}</td>
                      <td style={td}>{!i.phone ? '—' : i.whatsappSentAt ? `✓ ${when(i.whatsappSentAt)}` : 'Not sent'}</td>
                      <td style={td}>{i.firstJoinedAt ? `✓ ${Math.round(i.totalSeconds / 60)} min` : '—'}</td>
                      <td style={{ ...td, whiteSpace: 'nowrap' }}>
                        <button style={tiny} onClick={() => copy(i)}>{copied === i._id ? 'Copied' : 'Copy link'}</button>
                        <button style={tiny} onClick={() => resend(i)}>Resend</button>
                        <button style={{ ...tiny, color: '#b91c1c' }} onClick={() => remove(i)} aria-label="Remove invite">Remove</button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>
      </div>
    </div>
  );
};

const back: React.CSSProperties = { position: 'fixed', inset: 0, background: 'rgba(0,0,0,.5)', zIndex: 1000, display: 'flex', alignItems: 'flex-start', justifyContent: 'center', overflowY: 'auto', padding: '32px 16px' };
const sheet: React.CSSProperties = { background: '#fff', borderRadius: 14, width: '100%', maxWidth: 820, padding: 22 };
const card: React.CSSProperties = { border: '1px solid #e5e7eb', borderRadius: 10, padding: 14, marginTop: 12, position: 'relative' };
const h4: React.CSSProperties = { fontWeight: 700, fontSize: 14, marginBottom: 8 };
const lbl: React.CSSProperties = { fontSize: 13, fontWeight: 600, color: '#374151', marginBottom: 4, display: 'block' };
const input: React.CSSProperties = { padding: '9px 11px', border: '1px solid #d1d5db', borderRadius: 8, fontSize: 14, width: '100%', outline: 'none', boxSizing: 'border-box' };
const hint: React.CSSProperties = { color: '#6b7280', fontSize: 12.5, marginTop: 4 };
const dropdown: React.CSSProperties = { border: '1px solid #e5e7eb', borderRadius: 8, marginTop: 4, maxHeight: 220, overflowY: 'auto', background: '#fff' };
const option: React.CSSProperties = { display: 'block', width: '100%', textAlign: 'left', padding: '8px 10px', border: 0, borderBottom: '1px solid #f3f4f6', background: '#fff', cursor: 'pointer', fontSize: 13 };
const chip: React.CSSProperties = { display: 'inline-flex', alignItems: 'center', gap: 6, background: '#f3f4f6', borderRadius: 999, padding: '4px 10px', fontSize: 12.5 };
const chipX: React.CSSProperties = { border: 0, background: 'none', cursor: 'pointer', fontSize: 15, lineHeight: 1, color: '#6b7280' };
const primary: React.CSSProperties = { padding: '9px 16px', background: '#1a5490', color: '#fff', border: 'none', borderRadius: 8, fontSize: 14, fontWeight: 600, cursor: 'pointer' };
const secondary: React.CSSProperties = { padding: '8px 14px', background: '#fff', color: '#1f2937', border: '1px solid #d1d5db', borderRadius: 8, fontSize: 13, fontWeight: 600, cursor: 'pointer' };
const ghost: React.CSSProperties = { border: 0, background: 'none', fontSize: 18, cursor: 'pointer', color: '#6b7280' };
const tiny: React.CSSProperties = { padding: '3px 8px', marginLeft: 4, background: '#fff', border: '1px solid #e5e7eb', borderRadius: 6, fontSize: 12, cursor: 'pointer' };
const th: React.CSSProperties = { textAlign: 'left', fontSize: 11.5, textTransform: 'uppercase', letterSpacing: '.04em', color: '#6b7280', padding: '6px 8px', borderBottom: '1px solid #e5e7eb' };
const td: React.CSSProperties = { padding: '8px', borderBottom: '1px solid #f3f4f6', verticalAlign: 'top' };
const alertBad: React.CSSProperties = { background: '#fef2f2', color: '#b91c1c', borderRadius: 8, padding: '8px 12px', fontSize: 13, marginTop: 10 };
const alertOk: React.CSSProperties = { background: '#ecfdf5', color: '#047857', borderRadius: 8, padding: '8px 12px', fontSize: 13, marginTop: 10 };

export default InvitePanel;
