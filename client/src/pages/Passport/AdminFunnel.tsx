import React, { useCallback, useEffect, useState } from 'react';
import passportApi, { FunnelStage, FunnelTotals, FunnelMember } from '../../api/passportApi';

/**
 * Where members stopped, and who to contact about it.
 *
 * Built to be worked from, not admired. Stages are ordered by how close the person came
 * to paying rather than by how many of them there are, because the first call of the day
 * should be to someone who already had their card out — not to the biggest bucket.
 *
 * Within a stage the coldest lead is first. Sorted newest-first, a caller works the same
 * fresh names every morning and the people stuck for a month are never called at all.
 */

const card: React.CSSProperties = {
  background: '#fff', border: '1px solid #eef0f7', borderRadius: 14, padding: 18,
};
const HEAT: Record<number, { bg: string; fg: string; word: string }> = {
  1: { bg: '#fef2f2', fg: '#b91c1c', word: 'Call today' },
  2: { bg: '#fff7ed', fg: '#c2410c', word: 'High value' },
  3: { bg: '#fffbeb', fg: '#b45309', word: 'Worth a nudge' },
  4: { bg: '#f8fafc', fg: '#64748b', word: 'Check the number' },
  5: { bg: '#fef2f2', fg: '#b91c1c', word: 'Churn risk' },
  6: { bg: '#f5f3ff', fg: '#6d28d9', word: 'Renewal' },
  7: { bg: '#f0fdf4', fg: '#15803d', word: 'Healthy' },
};

/** Digits only, with the country code, so the wa.me link resolves. */
const waNumber = (phone: string) => {
  const d = String(phone || '').replace(/\D/g, '');
  if (!d) return '';
  return d.length > 10 ? d : `91${d}`;
};

const AdminFunnel: React.FC = () => {
  const [stages, setStages] = useState<FunnelStage[]>([]);
  const [totals, setTotals] = useState<FunnelTotals | null>(null);
  const [notes, setNotes] = useState<string[]>([]);
  const [open, setOpen] = useState<string>('');
  const [members, setMembers] = useState<FunnelMember[]>([]);
  const [loadingList, setLoadingList] = useState(false);
  const [err, setErr] = useState('');

  useEffect(() => {
    passportApi.getFunnel()
      .then(r => { setStages(r.stages); setTotals(r.totals); setNotes(r.notes || []); })
      .catch(e => setErr(e?.response?.data?.message || 'Could not load the funnel.'));
  }, []);

  const openStage = useCallback(async (key: string) => {
    if (open === key) { setOpen(''); setMembers([]); return; }
    setOpen(key); setLoadingList(true); setErr('');
    try {
      const r = await passportApi.getFunnelStage(key);
      setMembers(r.members);
    } catch (e: any) { setErr(e?.response?.data?.message || 'Could not load this stage.'); }
    setLoadingList(false);
  }, [open]);

  const max = Math.max(1, ...stages.map(s => s.count));

  return (
    <div style={{ maxWidth: 1080, margin: '0 auto', padding: '8px 4px 60px' }}>
      <h1 style={{ fontSize: 22, fontWeight: 900, color: '#0f172a', margin: 0 }}>
        📉 Where members drop off
      </h1>
      <p style={{ color: '#64748b', fontSize: 13.5, margin: '5px 0 0', maxWidth: '70ch', lineHeight: 1.6 }}>
        Every member sits in exactly one stage — the furthest point they reached. Ordered by
        how close they came to paying, so the top of this list is the first call of the day.
      </p>

      {totals && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(150px,1fr))', gap: 12, margin: '20px 0' }}>
          {[
            ['Members', String(totals.members), '#0f172a'],
            ['Paid', String(totals.paid), '#15803d'],
            ['Revenue', `₹${totals.revenueInr.toLocaleString('en-IN')}`, '#15803d'],
            ['Never verified', `${totals.unverifiedShare}%`, totals.unverifiedShare > 30 ? '#b91c1c' : '#0f172a'],
          ].map(([k, v, c]) => (
            <div key={k} style={card}>
              <div style={{ fontSize: 10.5, fontWeight: 800, letterSpacing: '.08em', textTransform: 'uppercase', color: '#94a3b8' }}>{k}</div>
              <div style={{ fontSize: 26, fontWeight: 900, color: c as string, marginTop: 5, fontVariantNumeric: 'tabular-nums' }}>{v}</div>
            </div>
          ))}
        </div>
      )}

      {err && <div className="pm-msg err" style={{ marginBottom: 14 }}>{err}</div>}

      <div style={{ display: 'flex', flexDirection: 'column', gap: 9 }}>
        {stages.map(s => {
          const h = HEAT[s.heat] || HEAT[7];
          const isOpen = open === s.key;
          return (
            <div key={s.key} style={{ ...card, padding: 0, overflow: 'hidden' }}>
              <button
                onClick={() => openStage(s.key)}
                aria-expanded={isOpen}
                style={{
                  width: '100%', border: 'none', background: isOpen ? '#f8fafc' : '#fff',
                  padding: '15px 18px', cursor: 'pointer', textAlign: 'left', fontFamily: 'inherit',
                  display: 'grid', gridTemplateColumns: '1fr auto', gap: '6px 16px', alignItems: 'center',
                }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
                  <span style={{
                    fontSize: 10, fontWeight: 800, letterSpacing: '.07em', textTransform: 'uppercase',
                    background: h.bg, color: h.fg, borderRadius: 5, padding: '3px 8px', whiteSpace: 'nowrap',
                  }}>{h.word}</span>
                  <b style={{ fontSize: 15, color: '#0f172a' }}>{s.label}</b>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
                  <span style={{ fontSize: 22, fontWeight: 900, color: h.fg, fontVariantNumeric: 'tabular-nums' }}>{s.count}</span>
                  <span style={{ color: '#94a3b8', fontSize: 13 }}>{isOpen ? '▲' : '▼'}</span>
                </div>

                <div style={{ gridColumn: '1/-1' }}>
                  <div style={{ height: 6, borderRadius: 99, background: '#eef2f7', overflow: 'hidden', margin: '4px 0 8px' }}>
                    <i style={{ display: 'block', height: '100%', width: `${(s.count / max) * 100}%`, background: h.fg, opacity: .75 }} />
                  </div>
                  <div style={{ fontSize: 12.5, color: '#64748b', lineHeight: 1.55 }}>{s.meaning}</div>
                  <div style={{ fontSize: 12.5, color: h.fg, fontWeight: 700, marginTop: 4 }}>→ {s.action}</div>
                </div>
              </button>

              {isOpen && (
                <div style={{ borderTop: '1px solid #eef0f7', padding: '14px 18px', background: '#fcfdff' }}>
                  {loadingList ? (
                    <div style={{ color: '#64748b', fontSize: 13 }}>Loading…</div>
                  ) : !members.length ? (
                    <div style={{ color: '#94a3b8', fontSize: 13 }}>Nobody is stuck here. Good.</div>
                  ) : (
                    <>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 12, flexWrap: 'wrap', marginBottom: 10 }}>
                        <span style={{ fontSize: 12, color: '#64748b' }}>
                          {members.length} shown, coldest first
                        </span>
                        {/* Fetched with the auth header, not linked — the server logs who exported. */}
                        <button className="pm-btn ghost" style={{ fontSize: 12.5 }}
                          onClick={() => passportApi.exportFunnelStage(s.key, `careerpilot-${s.key}.csv`)
                            .catch(() => setErr('Could not export that list.'))}>⬇ Export CSV</button>
                      </div>

                      <div style={{ overflowX: 'auto' }}>
                        <table style={{ borderCollapse: 'collapse', width: '100%', fontSize: 13, minWidth: 620 }}>
                          <thead>
                            <tr>
                              {['Name', 'Mobile', 'Stuck', 'Score', 'Contact'].map(th => (
                                <th key={th} style={{
                                  textAlign: 'left', fontSize: 10, letterSpacing: '.09em', textTransform: 'uppercase',
                                  color: '#94a3b8', fontWeight: 800, padding: '0 12px 8px 0', borderBottom: '1px solid #eef0f7',
                                }}>{th}</th>
                              ))}
                            </tr>
                          </thead>
                          <tbody>
                            {members.map(m => (
                              <tr key={m.id}>
                                <td style={{ padding: '10px 12px 10px 0', borderBottom: '1px solid #f3f6fb' }}>
                                  <b style={{ color: '#0f172a' }}>{m.name}</b>
                                  <div style={{ fontSize: 11.5, color: '#94a3b8' }}>{m.email}</div>
                                </td>
                                <td style={{ padding: '10px 12px 10px 0', borderBottom: '1px solid #f3f6fb', fontFamily: 'ui-monospace, Consolas, monospace', fontSize: 12.5 }}>
                                  {m.phone || <span style={{ color: '#cbd5e1' }}>none</span>}
                                </td>
                                <td style={{ padding: '10px 12px 10px 0', borderBottom: '1px solid #f3f6fb', fontVariantNumeric: 'tabular-nums', color: m.stuckDays >= 14 ? '#b91c1c' : '#64748b', fontWeight: m.stuckDays >= 14 ? 800 : 400 }}>
                                  {m.stuckDays}d
                                </td>
                                <td style={{ padding: '10px 12px 10px 0', borderBottom: '1px solid #f3f6fb', fontVariantNumeric: 'tabular-nums', color: '#64748b' }}>
                                  {m.careerScore ?? '—'}
                                  {m.pendingAmountInr ? <span style={{ color: '#c2410c', fontWeight: 700 }}> ₹{m.pendingAmountInr}</span> : null}
                                </td>
                                <td style={{ padding: '10px 0', borderBottom: '1px solid #f3f6fb', whiteSpace: 'nowrap' }}>
                                  {m.phone && (
                                    <a className="pm-btn ghost" style={{ textDecoration: 'none', fontSize: 12, marginRight: 6 }}
                                      href={`https://wa.me/${waNumber(m.phone)}`} target="_blank" rel="noreferrer">WhatsApp</a>
                                  )}
                                  {m.email && (
                                    <a className="pm-btn ghost" style={{ textDecoration: 'none', fontSize: 12 }}
                                      href={`mailto:${m.email}`}>Email</a>
                                  )}
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* What the numbers cannot tell you, said out loud rather than implied by a zero. */}
      {!!notes.length && (
        <div style={{ ...card, marginTop: 18, background: '#f8fafc' }}>
          <div style={{ fontSize: 10.5, fontWeight: 800, letterSpacing: '.08em', textTransform: 'uppercase', color: '#94a3b8', marginBottom: 8 }}>
            How to read this
          </div>
          {notes.map((n, i) => (
            <div key={i} style={{ fontSize: 12.5, color: '#64748b', lineHeight: 1.6, marginBottom: 4 }}>• {n}</div>
          ))}
        </div>
      )}
    </div>
  );
};

export default AdminFunnel;
