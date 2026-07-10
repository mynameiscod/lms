import React, { useCallback, useEffect, useState } from 'react';
import { aiUsageApi } from '../../api/aiUsageApi';

const INK = '#0f172a', SUB = '#64748b', BLUE = '#2563eb';
const inr = (n: number) => `₹${(n ?? 0).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
const PROVIDER_COLOR: Record<string, string> = { openai: '#10a37f', anthropic: '#d97757', whisper: '#7c3aed' };

const AiSpend: React.FC = () => {
  const [days, setDays] = useState(30);
  const [d, setD] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    try { const r = await aiUsageApi.summary(days); if (r.data.success) setD(r.data.data); }
    catch { /* ignore */ } finally { setLoading(false); }
  }, [days]);
  useEffect(() => { load(); }, [load]);

  const maxDay = d ? Math.max(1, ...d.series.map((s: any) => s.inr)) : 1;

  return (
    <div style={{ maxWidth: 1120, margin: '0 auto', padding: 22 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 10 }}>
        <div>
          <h1 style={{ margin: 0, fontSize: 24, color: INK, fontWeight: 800 }}>AI Spend</h1>
          <p style={{ color: SUB, fontSize: 13.5 }}>What you're spending on AI, in ₹ — by day, module, provider and model. {d ? `(₹${d.usdToInr}/USD)` : ''}</p>
        </div>
        <select value={days} onChange={e => setDays(Number(e.target.value))} style={{ border: '1px solid #cbd5e1', borderRadius: 8, padding: '8px 12px', fontSize: 13.5 }}>
          <option value={7}>Last 7 days</option><option value={30}>Last 30 days</option><option value={90}>Last 90 days</option>
        </select>
      </div>

      {loading || !d ? <div style={{ padding: 40, color: SUB }}>Loading…</div> : (
        <>
          {/* Headline stats */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(150px,1fr))', gap: 12, margin: '16px 0' }}>
            {[
              { l: 'Today', v: inr(d.todayInr), s: `${d.todayCalls} calls`, c: BLUE },
              { l: `Last ${d.days} days`, v: inr(d.totalInr), s: `${d.totalCalls} calls`, c: '#16a34a' },
              { l: 'Avg / day', v: inr(d.avgPerDayInr), s: '', c: '#7c3aed' },
              { l: 'Projected / month', v: inr(d.avgPerDayInr * 30), s: 'at current rate', c: '#d97706' },
              { l: 'Total tokens', v: (d.totalTokens || 0).toLocaleString('en-IN'), s: '', c: '#0ea5e9' },
            ].map((s: any) => (
              <div key={s.l} style={{ background: '#fff', border: '1px solid #e6e8f0', borderRadius: 14, padding: 16 }}>
                <div style={{ fontSize: 21, fontWeight: 800, color: s.c }}>{s.v}</div>
                <div style={{ fontSize: 12, color: SUB, fontWeight: 600 }}>{s.l}</div>
                {s.s && <div style={{ fontSize: 11, color: '#94a3b8' }}>{s.s}</div>}
              </div>
            ))}
          </div>

          {/* Daily chart */}
          <div style={{ background: '#fff', border: '1px solid #e6e8f0', borderRadius: 16, padding: 20, marginBottom: 16 }}>
            <div style={{ fontSize: 14, fontWeight: 800, color: INK, marginBottom: 12 }}>Daily spend (₹)</div>
            <div style={{ display: 'flex', alignItems: 'flex-end', gap: 3, height: 140, overflowX: 'auto' }}>
              {d.series.map((s: any) => (
                <div key={s.date} title={`${s.date}: ${inr(s.inr)} · ${s.calls} calls`} style={{ flex: '1 0 8px', minWidth: 8, display: 'flex', flexDirection: 'column', justifyContent: 'flex-end', height: '100%' }}>
                  <div style={{ height: `${Math.max(2, (s.inr / maxDay) * 100)}%`, background: s.inr > 0 ? BLUE : '#eef1f6', borderRadius: '3px 3px 0 0' }} />
                </div>
              ))}
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 10.5, color: '#94a3b8', marginTop: 6 }}>
              <span>{d.series[0]?.date}</span><span>{d.series[d.series.length - 1]?.date}</span>
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0,1.4fr) minmax(0,1fr)', gap: 16 }}>
            {/* By module */}
            <div style={{ background: '#fff', border: '1px solid #e6e8f0', borderRadius: 16, padding: 18 }}>
              <div style={{ fontSize: 14, fontWeight: 800, color: INK, marginBottom: 10 }}>By module</div>
              {d.byModule.length === 0 ? <div style={{ color: SUB, fontSize: 13 }}>No AI usage recorded yet.</div> :
                d.byModule.map((m: any) => {
                  const pct = d.totalInr ? (m.inr / d.totalInr) * 100 : 0;
                  return (
                    <div key={m.module} style={{ marginBottom: 10 }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12.5, marginBottom: 3 }}><span style={{ color: '#475569', fontWeight: 600 }}>{m.label}</span><b style={{ color: INK }}>{inr(m.inr)} <span style={{ color: '#94a3b8', fontWeight: 500 }}>· {m.calls}</span></b></div>
                      <div style={{ height: 6, background: '#eef1f6', borderRadius: 6, overflow: 'hidden' }}><div style={{ width: `${pct}%`, height: '100%', background: BLUE }} /></div>
                    </div>
                  );
                })}
            </div>

            {/* By provider + model */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
              <div style={{ background: '#fff', border: '1px solid #e6e8f0', borderRadius: 16, padding: 18 }}>
                <div style={{ fontSize: 14, fontWeight: 800, color: INK, marginBottom: 10 }}>By provider</div>
                {d.byProvider.map((p: any) => (
                  <div key={p.provider} style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
                    <span style={{ width: 9, height: 9, borderRadius: '50%', background: PROVIDER_COLOR[p.provider] || '#64748b' }} />
                    <span style={{ flex: 1, fontSize: 13, color: '#475569', textTransform: 'capitalize' }}>{p.provider}</span>
                    <b style={{ fontSize: 13, color: INK }}>{inr(p.inr)}</b>
                  </div>
                ))}
              </div>
              <div style={{ background: '#fff', border: '1px solid #e6e8f0', borderRadius: 16, padding: 18 }}>
                <div style={{ fontSize: 14, fontWeight: 800, color: INK, marginBottom: 10 }}>By model</div>
                {d.byModel.map((m: any) => (
                  <div key={m.model} style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12.5, marginBottom: 6 }}>
                    <span style={{ color: '#475569', fontFamily: 'ui-monospace,monospace', fontSize: 11.5 }}>{m.model}</span>
                    <b style={{ color: INK }}>{inr(m.inr)}</b>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Recent calls */}
          <div style={{ background: '#fff', border: '1px solid #e6e8f0', borderRadius: 16, marginTop: 16, overflowX: 'auto' }}>
            <div style={{ fontSize: 14, fontWeight: 800, color: INK, padding: '16px 18px 0' }}>Recent AI calls</div>
            <table style={{ borderCollapse: 'collapse', width: '100%', fontSize: 12.5, minWidth: 640 }}>
              <thead><tr style={{ textAlign: 'left' }}>{['When', 'Module', 'Provider', 'Model', 'Tokens', 'Cost'].map(h => <th key={h} style={{ padding: '9px 14px', fontSize: 10.5, textTransform: 'uppercase', color: '#94a3b8' }}>{h}</th>)}</tr></thead>
              <tbody>
                {d.recent.map((r: any, i: number) => (
                  <tr key={i} style={{ borderTop: '1px solid #f1f5f9' }}>
                    <td style={{ padding: '8px 14px', color: SUB, whiteSpace: 'nowrap' }}>{new Date(r.at).toLocaleString('en-IN', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}</td>
                    <td style={{ padding: '8px 14px', color: INK }}>{r.module}{r.fellBack && <span title="Primary provider failed — used the fallback" style={{ color: '#d97706' }}> ⤵</span>}</td>
                    <td style={{ padding: '8px 14px', textTransform: 'capitalize', color: PROVIDER_COLOR[r.provider] || SUB, fontWeight: 600 }}>{r.provider}</td>
                    <td style={{ padding: '8px 14px', fontFamily: 'ui-monospace,monospace', fontSize: 11, color: '#475569' }}>{r.model}</td>
                    <td style={{ padding: '8px 14px', color: SUB }}>{r.audioSeconds ? `${r.audioSeconds}s audio` : `${(r.inTok || 0) + (r.outTok || 0)}`}</td>
                    <td style={{ padding: '8px 14px', fontWeight: 700, color: INK }}>{inr(r.inr)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <p style={{ fontSize: 11.5, color: '#94a3b8', marginTop: 14 }}>Costs are estimated from token counts × model pricing, converted at ₹{d.usdToInr}/USD (set via <code>USD_TO_INR</code>). Tracked modules: Thinking Lab, question generation, drills, and speech-to-text. Coverage expands as more features route through the AI gateway.</p>
        </>
      )}
    </div>
  );
};

export default AiSpend;
