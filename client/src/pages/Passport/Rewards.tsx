import React, { useCallback, useEffect, useMemo, useState } from 'react';
import passportApi, { RewardCatalogue, RewardCard, RedemptionRow } from '../../api/passportApi';
import './rewards.css';

const STATUS_LABEL: Record<string, string> = { PENDING: 'Processing', RESERVED: 'Reserved', FULFILLED: 'Fulfilled', CANCELLED: 'Cancelled' };
const newIntent = () => `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;

const Rewards: React.FC = () => {
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

  if (loading) return <div className="rwd"><div className="rwd-load">Loading rewards…</div></div>;
  if (!data) return <div className="rwd"><div className="rwd-empty">Rewards are unavailable right now.</div></div>;
  const { student } = data;

  return <div className="rwd">
    <header className="rwd-hd"><div><span className="rwd-kicker">CAREERPILOT REWARDS</span><h1>Rewards</h1><p>Unlock rewards for your consistency, skills & progress.</p></div><div className="rwd-secure"><i className="bi bi-shield-check"/> Your rewards are secure</div></header>

    <div className="rwd-layout"><main>
      <section className="rwd-hero"><div className="rwd-hero-copy"><span>Your Balance</span><div className="rwd-bal"><div><i className="bi bi-coin coin"/><b>{student.coins.toLocaleString()}</b><small>CareerPilot Coins</small></div><div><i className="bi bi-star-fill xp"/><b>{student.xp.toLocaleString()}</b><small>Total XP Earned</small></div><div><i className="bi bi-award level"/><b>{student.level}</b><small>Current Level</small></div></div><div className="rwd-info"><i className="bi bi-info-circle"/><span><b>Use Coins to redeem rewards.</b><small>XP shows your engagement & consistency and is never spent.</small></span></div></div><div className="rwd-gift"><i className="bi bi-gift-fill"/><span>Earn. Unlock.<br/>Celebrate.</span></div></section>

      {student.expiredCoins > 0 && <div className="rwd-note warn">{student.expiredCoins.toLocaleString()} of your coins have expired and cannot be spent.</div>}
      {student.minRedemption > 0 && student.coins < student.minRedemption && <div className="rwd-note">You need at least {student.minRedemption.toLocaleString()} coins before you can redeem.</div>}
      {done && <div className="rwd-note ok">{done}</div>}{err && <div className="rwd-note warn">{err}</div>}

      <div className="rwd-toolbar"><div><button className="active"><i className="bi bi-gift"/> All Rewards</button><span>Redeem only rewards currently available to you.</span></div></div>
      {data.rewards.length === 0 ? <div className="rwd-empty"><i className="bi bi-gift"/><b>Rewards are coming soon</b><span>Keep building your XP, streak and coins — there will be something to spend them on.</span></div> :
      <div className="rwd-grid">{data.rewards.map((r, idx) => { const e=r.eligibility; const out=e.reasons.includes('OUT_OF_STOCK'); const progress=Math.min(100, Math.round((student.coins/Math.max(r.coinCost,1))*100)); return <article className={`rwd-card${e.eligible?'':' locked'}`} key={r.key}>
        <div className={`rwd-art art-${idx%4}`}><i className={`bi ${r.iconKey || 'bi-gift'}`}/>{!e.eligible && <span className="lock"><i className="bi bi-lock-fill"/></span>}</div>
        <b>{r.name}</b>{r.description && <p>{r.description}</p>}<div className="cost"><strong>{r.coinCost.toLocaleString()}</strong> Coins</div>
        <div className="rwd-progress"><span style={{width:`${progress}%`}}/></div><small className="rwd-progress-txt">{Math.min(student.coins,r.coinCost).toLocaleString()} / {r.coinCost.toLocaleString()} Coins</small>
        {r.stockMode==='LIMITED' && r.stockAvailable!==null && r.stockAvailable>0 && <em className="stock">{r.stockAvailable} left</em>}
        {!e.eligible && <div className="why">{e.messages.slice(0,1).map((m,i)=><span key={i}>{m}</span>)}{e.coinsShort>0 && <span>Need {e.coinsShort.toLocaleString()} more coins</span>}</div>}
        <button className="rwd-btn primary" disabled={!e.eligible} onClick={()=>setConfirming(r)}>{out?'Out of stock':e.eligible?'Redeem reward':'Locked'}</button>
      </article>})}</div>}
    </main>

    <aside className="rwd-side">
      {closest && <section className="rwd-panel"><div className="panel-title"><b>Closest Reward</b></div><div className="closest-art"><i className={`bi ${closest.iconKey || 'bi-gift-fill'}`}/></div><h3>{closest.name}</h3><strong className="closest-cost">{closest.coinCost.toLocaleString()} Coins</strong><div className="rwd-progress"><span style={{width:`${Math.min(100,(student.coins/Math.max(closest.coinCost,1))*100)}%`}}/></div><div className="closest-row"><span>{Math.min(100,Math.round((student.coins/Math.max(closest.coinCost,1))*100))}% there</span><b>{student.coins.toLocaleString()} / {closest.coinCost.toLocaleString()}</b></div><button className="rwd-btn" disabled={!closest.eligibility.eligible} onClick={()=>closest.eligibility.eligible&&setConfirming(closest)}>View details</button></section>}
      <section className="rwd-panel earn"><div className="panel-title"><b>How to Earn More?</b></div><div><i className="bi bi-check2-circle"/><span><b>Complete daily missions</b><small>Build consistent career activity</small></span></div><div><i className="bi bi-fire"/><span><b>Maintain your streak</b><small>Keep showing up consistently</small></span></div><div><i className="bi bi-code-square"/><span><b>Practice & take assessments</b><small>Build evidence through practice</small></span></div></section>
      {!!history.length && <section className="rwd-panel history"><div className="panel-title"><b>Redemption History</b></div>{history.slice(0,5).map(h=><div className="hist-row" key={h.id}><div className="hist-icon"><i className="bi bi-gift"/></div><span><b>{h.rewardName}</b><small>{new Date(h.requestedAt).toLocaleDateString()}</small></span><div><strong>-{h.coinCost.toLocaleString()} Coins</strong><em className={`s-${h.status.toLowerCase()}`}>{STATUS_LABEL[h.status]||h.status}{h.status==='CANCELLED'&&h.refunded>0?' · refunded':''}</em></div></div>)}</section>}
    </aside></div>

    <footer className="rwd-trust"><div><i className="bi bi-shield-check"/><span><b>Secure · Verified · Fair</b><small>Eligibility, stock and redemption limits are verified by CareerPilot.</small></span></div><div><i className="bi bi-lock"/><span><b>Protected redemption</b><small>Server-verified transactions</small></span></div><div><i className="bi bi-arrow-repeat"/><span><b>Clear status</b><small>Track every redemption</small></span></div></footer>

    {confirming && <div className="rwd-modal" role="dialog"><div className="bx"><div className="modal-icon"><i className="bi bi-gift-fill"/></div><b>Redeem {confirming.name}?</b><p>Cost: <strong>{confirming.coinCost.toLocaleString()} coins</strong><br/>Your balance afterwards: <strong>{(student.coins-confirming.coinCost).toLocaleString()} coins</strong></p>{confirming.instructions&&<p className="ins">{confirming.instructions}</p>}<div className="acts"><button className="rwd-btn" onClick={()=>setConfirming(null)}>Cancel</button><button className="rwd-btn primary" disabled={busy} onClick={confirm}>{busy?'Redeeming…':'Confirm redemption'}</button></div></div></div>}
  </div>;
};
export default Rewards;
