import React, { useEffect, useState } from 'react';
import passportApi, { CoinAdminResponse, CoinConfig, CoinRule } from '../../api/passportApi';

/**
 * Admin control of the coin economy.
 *
 * Everything here is data, so what an action pays, what it caps at, and whether it runs at
 * all can change without a deploy. Every event the product already emits is listed —
 * including the ones seeded at zero and switched off — so turning one on is an edit rather
 * than a release.
 *
 * The stats strip exists so nobody tunes these numbers blind. The figure that matters is
 * the worst-case rupee exposure per member, which is what the 3%-of-revenue budget is
 * actually about.
 */

const box: React.CSSProperties = {
  background: '#fff', border: '1px solid #eef0f7', borderRadius: 12, padding: 18, marginBottom: 16,
};
const label: React.CSSProperties = { display: 'block', fontSize: 11.5, fontWeight: 800, color: '#64748b', marginBottom: 5 };
const input: React.CSSProperties = {
  width: '100%', padding: '8px 10px', border: '1px solid #e2e8f0', borderRadius: 8, fontSize: 13.5,
};
const th: React.CSSProperties = {
  textAlign: 'left', padding: '9px 10px', fontSize: 11, fontWeight: 800, color: '#64748b',
  textTransform: 'uppercase', letterSpacing: .4, borderBottom: '1px solid #eef0f7',
};
const td: React.CSSProperties = { padding: '8px 10px', borderBottom: '1px solid #f6f8fb', fontSize: 13 };

const CONFIG_FIELDS: { key: keyof CoinConfig; label: string; hint: string }[] = [
  { key: 'coinsPerRupee',           label: 'Coins per ₹1 (internal)', hint: 'Accounting only — never shown to members' },
  { key: 'monthlyEarnCap',          label: 'Monthly earn cap',        hint: 'From daily activity. Referrals are exempt' },
  { key: 'annualRealCostBudgetInr', label: 'Reward budget ₹/member/yr', hint: 'Your real cost ceiling. 3% of ₹1599 ≈ ₹48' },
  { key: 'minRedemption',           label: 'Minimum to redeem',       hint: 'Below this nothing can be spent' },
  { key: 'expiryMonths',            label: 'Coins expire after (months)', hint: '0 = never expire' },
  { key: 'referrerCoins',           label: 'Referrer reward',         hint: 'Paid when the referee PAYS, never on signup' },
  { key: 'refereeCoins',            label: 'Referee welcome bonus',   hint: 'Paid on their payment' },
  { key: 'referralMonthlyCap',      label: 'Referrals/month',         hint: 'Above this, referrals go to manual review' },
];

const AdminCoins: React.FC = () => {
  const [data, setData] = useState<CoinAdminResponse | null>(null);
  const [cfg, setCfg] = useState<CoinConfig | null>(null);
  const [rules, setRules] = useState<CoinRule[]>([]);
  const [msg, setMsg] = useState('');
  const [err, setErr] = useState('');
  const [busy, setBusy] = useState(false);

  const load = () => passportApi.getCoinAdmin().then(d => {
    setData(d); setCfg(d.config); setRules(d.rules);
  }).catch(e => setErr(e?.response?.data?.message || 'Could not load coin settings'));

  useEffect(() => { load(); }, []);

  const saveAll = async () => {
    if (!cfg) return;
    setBusy(true); setMsg(''); setErr('');
    try {
      // Config and rules save separately because they validate separately; a bad number in
      // one table should not silently discard edits made in the other.
      await passportApi.saveCoinConfig(cfg);
      await passportApi.saveCoinRules(rules);
      await load();
      setMsg('Saved. New amounts apply to the next award.');
    } catch (e: any) {
      setErr(e?.response?.data?.message || 'Save failed');
    }
    setBusy(false);
  };

  const setRule = (key: string, patch: Partial<CoinRule>) =>
    setRules(rs => rs.map(r => (r.eventKey === key ? { ...r, ...patch } : r)));

  if (err && !data) return <div className="pm-msg err">{err}</div>;
  if (!data || !cfg) return <div style={box}>Loading…</div>;

  const s = data.stats;
  const budgetPct = s.membershipPriceInr > 0
    ? ((s.budgetInrPerMember / s.membershipPriceInr) * 100).toFixed(1) : '0';

  return (
    <div>
      <div style={{ ...box, display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(150px,1fr))', gap: 14 }}>
        {[
          ['Coins issued', s.totalIssued.toLocaleString('en-IN')],
          ['Awards made', s.awards.toLocaleString('en-IN')],
          ['Members earning', String(s.earningMembers)],
          ['Worst case ₹/member', `₹${s.worstCaseInrPerMember}`],
          ['Budget ₹/member/yr', `₹${s.budgetInrPerMember} (${budgetPct}%)`],
        ].map(([k, v]) => (
          <div key={k}>
            <div style={{ fontSize: 11, fontWeight: 800, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: .4 }}>{k}</div>
            <div style={{ fontSize: 20, fontWeight: 900, color: '#0f172a', marginTop: 3 }}>{v}</div>
          </div>
        ))}
      </div>

      <div style={box}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 16 }}>
          <h3 style={{ fontSize: 15, fontWeight: 900, color: '#0f172a', margin: 0, flex: 1 }}>Economy settings</h3>
          <label style={{ display: 'flex', alignItems: 'center', gap: 7, fontSize: 13, fontWeight: 800 }}>
            <input type="checkbox" checked={cfg.enabled} onChange={e => setCfg({ ...cfg, enabled: e.target.checked })} />
            Coins enabled
          </label>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(190px,1fr))', gap: 14 }}>
          {CONFIG_FIELDS.map(f => (
            <div key={String(f.key)}>
              <label style={label}>{f.label}</label>
              <input
                style={input} type="number" min={0}
                value={String(cfg[f.key] ?? 0)}
                onChange={e => setCfg({ ...cfg, [f.key]: Number(e.target.value) } as CoinConfig)}
              />
              <div style={{ fontSize: 11, color: '#94a3b8', marginTop: 4, lineHeight: 1.45 }}>{f.hint}</div>
            </div>
          ))}
        </div>

        <label style={{ display: 'flex', alignItems: 'center', gap: 7, fontSize: 13, fontWeight: 700, marginTop: 16 }}>
          <input
            type="checkbox" checked={cfg.freeMembersAccrue}
            onChange={e => setCfg({ ...cfg, freeMembersAccrue: e.target.checked })}
          />
          Free members accrue coins but cannot spend them until they pay
        </label>
      </div>

      <div style={box}>
        <h3 style={{ fontSize: 15, fontWeight: 900, color: '#0f172a', margin: '0 0 4px' }}>Earning rules</h3>
        <p style={{ fontSize: 12.5, color: '#64748b', margin: '0 0 14px', lineHeight: 1.6 }}>
          Every event the product already emits is listed. Set an amount and switch it on — no
          deploy needed. A cap of 0 means unlimited.
        </p>

        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: 620 }}>
            <thead>
              <tr>
                <th style={th}>On</th><th style={th}>Event</th>
                <th style={th}>Coins</th><th style={th}>Per day</th><th style={th}>Per month</th>
              </tr>
            </thead>
            <tbody>
              {rules.map(r => (
                <tr key={r.eventKey} style={{ opacity: r.enabled ? 1 : .55 }}>
                  <td style={td}>
                    <input type="checkbox" checked={r.enabled} onChange={e => setRule(r.eventKey, { enabled: e.target.checked })} />
                  </td>
                  <td style={td}>
                    <b style={{ color: '#0f172a' }}>{r.label || r.eventKey}</b>
                    <div style={{ fontSize: 11, color: '#94a3b8', fontFamily: 'monospace' }}>{r.eventKey}</div>
                  </td>
                  {(['coins', 'dailyCap', 'monthlyCap'] as const).map(f => (
                    <td style={td} key={f}>
                      <input
                        style={{ ...input, width: 90 }} type="number" min={0}
                        value={String(r[f] ?? 0)}
                        onChange={e => setRule(r.eventKey, { [f]: Number(e.target.value) } as Partial<CoinRule>)}
                      />
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {msg && <div className="pm-msg ok">{msg}</div>}
      {err && <div className="pm-msg err">{err}</div>}

      <button className="pm-btn primary" disabled={busy} onClick={saveAll}>
        {busy ? 'Saving…' : 'Save coin settings'}
      </button>
    </div>
  );
};

export default AdminCoins;
