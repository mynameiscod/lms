import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import passportApi, { RewardCatalogue, RewardCard, RedemptionRow } from '../../api/passportApi';
import './rewards.css';
import './rewardsRedesign.css';

const STATUS_LABEL: Record<string, string> = { PENDING: 'Processing', RESERVED: 'Reserved', FULFILLED: 'Fulfilled', CANCELLED: 'Cancelled' };
const newIntent = () => `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;

/* Where each way of earning actually happens. */
const EARN = [
  { icon: 'bi-check2-circle', title: "Finish today's missions", sub: 'Every task on your journey day earns XP', to: '/careerpilot' },
  { icon: 'bi-fire', title: 'Keep your streak going', sub: 'Show up every day on My 90 Days', to: '/careerpilot/journey' },
  { icon: 'bi-code-square', title: 'Practise and take assessments', sub: 'Solve problems in the Practice Lab', to: '/careerpilot/practice' },
];

const Rewards: React.FC = () => {
  const nav = useNavigate();
  const [data, setData] = useState<RewardCatalogue | null>(null);
  const [history, setHistory] = useState<RedemptionRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [confirming, setConfirming] = useState<RewardCard | null>(null);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState('');
  const [done, setDone] = useState('');

  const load = useCallback(async () => {
    try {
      const [cat, hist] = await Promise.all([passportApi.getRewards(), passportApi.getMyRedemptions().catch(() => ({ redemptions: [] }))]);
      setData(cat); setHistory(hist.redemptions || []);
    } catch { /* honest unavailable state below */ }
    setLoading(false);
  }, []);
  useEffect(() => { load(); }, [load]);

  const confirm = async () => {
    if (!confirming) return;
    setBusy(true); setErr(''); setDone('');
    try {
      const r = await passportApi.redeemReward(confirming.key, newIntent());
      setDone(r?.message || 'Reward reserved.'); setConfirming(null); await load();
    } catch (e: any) {
      setErr(e?.response?.data?.message || 'Could not complete that redemption.'); setConfirming(null);
    }
    setBusy(false);
  };

  const closest = useMemo(() => {
    if (!data?.rewards?.length) return null;
    return [...data.rewards].filter(r => !r.eligibility.reasons.includes('OUT_OF_STOCK')).sort((a, b) => Math.max(0, a.coinCost - data.student.coins) - Math.max(0, b.coinCost - data.student.coins))[0] || null;
  }, [data]);

  if (loading) return <div className="rwd rwd2"><div className="rwd-load">Loading rewards…</div></div>;
  if (!data) return <div className="rwd rwd2"><div className="rwd2-soon"><i className="bi bi-cloud-slash" /><b>Rewards are unavailable right now</b><span>Please try again in a little while.</span></div></div>;
  const { student } = data;
  const min = student.minRedemption || 0;
  const locked = min > 0 && student.coins < min;
  const unlockPct = min > 0 ? Math.min(100, Math.round((student.coins / min) * 100)) : 100;

  return <div className="rwd rwd2">
    <section className="rwd2-hero">
      <div className="rwd2-hero-copy">
        <span className="rwd2-eyebrow"><i className="bi bi-stars" /> CareerPilot rewards</span>
        <h1>Earn it. <span>Unlock it.</span> Celebrate it.</h1>
        <p>Coins you earn from real career work can be spent here. Your XP is never spent — it shows how consistent you are.</p>
        <div className="rwd2-unlock">
          <div className="top"><b>{locked ? `${(min - student.coins).toLocaleString()} coins to unlock redeeming` : 'Redeeming is unlocked'}</b><span>{student.coins.toLocaleString()}{min > 0 ? ` / ${min.toLocaleString()}` : ''} coins</span></div>
          <div className="bar"><i style={{ width: `${Math.max(unlockPct, 2)}%` }} /></div>
        </div>
      </div>
      <div className="rwd2-wallet">
        <div className="rwd2-coinbig"><span><i className="bi bi-coin" /></span><div><small>CareerPilot coins</small><b>{student.coins.toLocaleString()}</b></div></div>
        <div className="rwd2-pair">
          <div><i className="bi bi-lightning-charge-fill" /><b>{student.xp.toLocaleString()}</b><small>Total XP</small></div>
          <div><i className="bi bi-award-fill" /><b>{student.level}</b><small>Level</small></div>
        </div>
        <span className="rwd2-secure"><i className="bi bi-shield-check" /> Every redemption is verified</span>
      </div>
    </section>

    {student.expiredCoins > 0 && <div className="rwd2-note warn"><i className="bi bi-hourglass-bottom" />{student.expiredCoins.toLocaleString()} of your coins have expired and cannot be spent.</div>}
    {done && <div className="rwd2-note ok"><i className="bi bi-check-circle-fill" />{done}</div>}
    {err && <div className="rwd2-note warn"><i className="bi bi-exclamation-circle-fill" />{err}</div>}

    <div className="rwd2-layout"><main>
      <div className="rwd2-sechd"><div><h2>Rewards store</h2><span>{data.rewards.length ? `${data.rewards.length} reward${data.rewards.length === 1 ? '' : 's'} · redeem the ones available to you` : 'New rewards are being added'}</span></div></div>
      {data.rewards.length === 0 ? <div className="rwd2-soon">
        <div className="gifts"><i className="bi bi-gift-fill" /><i className="bi bi-trophy-fill" /><i className="bi bi-mortarboard-fill" /></div>
        <b>Rewards are coming soon</b>
        <span>Keep building your XP, streak and coins. When the store opens, your coins will be ready to spend.</span>
        <button onClick={() => nav('/careerpilot')}><i className="bi bi-lightning-charge-fill" /> Earn coins now</button>
      </div> :
      <div className="rwd-grid">{data.rewards.map((r, idx) => { const e = r.eligibility; const out = e.reasons.includes('OUT_OF_STOCK'); const progress = Math.min(100, Math.round((student.coins / Math.max(r.coinCost, 1)) * 100)); return <article className={`rwd-card${e.eligible ? '' : ' locked'}`} key={r.key}>
        <div className={`rwd-art art-${idx % 4}`}><i className={`bi ${r.iconKey || 'bi-gift'}`} />{!e.eligible && <span className="lock"><i className="bi bi-lock-fill" /></span>}</div>
        <b>{r.name}</b>{r.description && <p>{r.description}</p>}<div className="cost"><strong>{r.coinCost.toLocaleString()}</strong> Coins</div>
        <div className="rwd-progress"><span style={{ width: `${progress}%` }} /></div><small className="rwd-progress-txt">{Math.min(student.coins, r.coinCost).toLocaleString()} / {r.coinCost.toLocaleString()} Coins</small>
        {r.stockMode === 'LIMITED' && r.stockAvailable !== null && r.stockAvailable > 0 && <em className="stock">{r.stockAvailable} left</em>}
        {!e.eligible && <div className="why">{e.messages.slice(0, 1).map((m, i) => <span key={i}>{m}</span>)}{e.coinsShort > 0 && <span>Need {e.coinsShort.toLocaleString()} more coins</span>}</div>}
        <button className="rwd-btn primary" disabled={!e.eligible} onClick={() => setConfirming(r)}>{out ? 'Out of stock' : e.eligible ? 'Redeem reward' : 'Locked'}</button>
      </article>; })}</div>}

      <div className="rwd2-trust">
        <div><i className="bi bi-shield-check" /><span><b>Secure · Verified · Fair</b><small>Eligibility, stock and limits are checked by CareerPilot.</small></span></div>
        <div><i className="bi bi-lock" /><span><b>Protected redemption</b><small>Every transaction is verified on our servers.</small></span></div>
        <div><i className="bi bi-arrow-repeat" /><span><b>Clear status</b><small>Track every redemption you make.</small></span></div>
      </div>
    </main>

    <aside className="rwd2-side">
      {closest && <section className="rwd2-panel"><h3>Closest reward</h3><div className="closest"><span><i className={`bi ${closest.iconKey || 'bi-gift-fill'}`} /></span><div><b>{closest.name}</b><small>{closest.coinCost.toLocaleString()} coins</small></div></div><div className="bar"><i style={{ width: `${Math.min(100, (student.coins / Math.max(closest.coinCost, 1)) * 100)}%` }} /></div><div className="row"><span>{Math.min(100, Math.round((student.coins / Math.max(closest.coinCost, 1)) * 100))}% there</span><b>{student.coins.toLocaleString()} / {closest.coinCost.toLocaleString()}</b></div><button disabled={!closest.eligibility.eligible} onClick={() => closest.eligibility.eligible && setConfirming(closest)}>Redeem</button></section>}
      <section className="rwd2-panel"><h3>How to earn more</h3>{EARN.map(w => <button className="rwd2-way" key={w.to} onClick={() => nav(w.to)}><span><i className={`bi ${w.icon}`} /></span><div><b>{w.title}</b><small>{w.sub}</small></div><i className="bi bi-chevron-right go" /></button>)}</section>
      {!!history.length && <section className="rwd2-panel history"><h3>Redemption history</h3>{history.slice(0, 5).map(h => <div className="hist-row" key={h.id}><div className="hist-icon"><i className="bi bi-gift" /></div><span><b>{h.rewardName}</b><small>{new Date(h.requestedAt).toLocaleDateString()}</small></span><div><strong>-{h.coinCost.toLocaleString()} Coins</strong><em className={`s-${h.status.toLowerCase()}`}>{STATUS_LABEL[h.status] || h.status}{h.status === 'CANCELLED' && h.refunded > 0 ? ' · refunded' : ''}</em></div></div>)}</section>}
    </aside></div>

    {confirming && <div className="rwd-modal" role="dialog"><div className="bx"><div className="modal-icon"><i className="bi bi-gift-fill" /></div><b>Redeem {confirming.name}?</b><p>Cost: <strong>{confirming.coinCost.toLocaleString()} coins</strong><br />Your balance afterwards: <strong>{(student.coins - confirming.coinCost).toLocaleString()} coins</strong></p>{confirming.instructions && <p className="ins">{confirming.instructions}</p>}<div className="acts"><button className="rwd-btn" onClick={() => setConfirming(null)}>Cancel</button><button className="rwd-btn primary" disabled={busy} onClick={confirm}>{busy ? 'Redeeming…' : 'Confirm redemption'}</button></div></div></div>}
  </div>;
};
export default Rewards;
