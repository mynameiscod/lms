import React, { useCallback, useEffect, useState } from 'react';
import passportApi, { RewardCatalogue, RewardCard, RedemptionRow } from '../../api/passportApi';
import './rewards.css';

/**
 * Spending coins on rewards.
 *
 * COINS AND XP ARE LABELLED APART. They sit in different places on this page and are never
 * shown as convertible, because they are not: XP measures engagement and ranks you, coins
 * are the reward balance. A student who thinks their 12,480 XP is worth something at the
 * counter has been misled by the interface, not by the rules.
 *
 * NOTHING HERE DECIDES ANYTHING. Eligibility, price, stock and limits all arrive from the
 * server, and the Redeem button is disabled from the same verdict the redeem endpoint will
 * apply. The confirmation shows the coin cost and the balance afterwards — never what the
 * reward costs the business.
 *
 * AN EMPTY CATALOGUE IS A REAL STATE. A tenant that has configured no rewards sees an honest
 * message, not placeholder products.
 */

const STATUS_LABEL: Record<string, string> = {
  PENDING: 'Processing',
  RESERVED: 'Reserved',
  FULFILLED: 'Fulfilled',
  CANCELLED: 'Cancelled',
};

/** Stable per attempt, so a double-click sends the same intent and redeems once. */
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
      const [cat, hist] = await Promise.all([
        passportApi.getRewards(),
        passportApi.getMyRedemptions().catch(() => ({ redemptions: [] })),
      ]);
      setData(cat);
      setHistory(hist.redemptions || []);
    } catch { /* the page shows its empty state */ }
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  const confirm = async () => {
    if (!confirming) return;
    setBusy(true); setErr(''); setDone('');
    try {
      const r = await passportApi.redeemReward(confirming.key, newIntent());
      setDone(r?.message || 'Reward reserved.');
      setConfirming(null);
      await load();
    } catch (e: any) {
      // The server re-checks everything, so this is where a race surfaces — somebody took
      // the last one between the page loading and the click.
      setErr(e?.response?.data?.message || 'Could not complete that redemption.');
      setConfirming(null);
    }
    setBusy(false);
  };

  if (loading) return <div className="rwd"><div className="rwd-load">Loading rewards…</div></div>;
  if (!data) return <div className="rwd"><div className="rwd-empty">Rewards are unavailable right now.</div></div>;

  const { student } = data;

  return (
    <div className="rwd">
      <div className="rwd-hd">
        <h1>Rewards</h1>
        <p>Spend the coins you have earned. Your XP is not spent — it unlocks some rewards.</p>
      </div>

      {/* Two balances, deliberately distinct in wording and placement. */}
      <div className="rwd-bal">
        <div className="b main">
          <b>{student.coins.toLocaleString()}</b>
          <span>Coins</span>
          <em>Reward balance</em>
        </div>
        <div className="b">
          <b>{student.xp.toLocaleString()}</b>
          <span>XP</span>
          <em>Engagement score — never spent</em>
        </div>
        <div className="b">
          <b>{student.level}</b>
          <span>Level</span>
          <em>Unlocks some rewards</em>
        </div>
      </div>

      {student.expiredCoins > 0 && (
        <div className="rwd-note warn">
          {student.expiredCoins.toLocaleString()} of your coins have expired and cannot be spent.
        </div>
      )}
      {student.minRedemption > 0 && student.coins < student.minRedemption && (
        <div className="rwd-note">
          You need at least {student.minRedemption.toLocaleString()} coins before you can redeem.
        </div>
      )}
      {done && <div className="rwd-note ok">{done}</div>}
      {err && <div className="rwd-note warn">{err}</div>}

      {data.rewards.length === 0 ? (
        <div className="rwd-empty">
          <i className="bi bi-gift" />
          <b>Rewards are coming soon</b>
          <span>Keep building your XP, streak and coins — there will be something to spend them on.</span>
        </div>
      ) : (
        <div className="rwd-grid">
          {data.rewards.map(r => {
            const e = r.eligibility;
            const outOfStock = r.eligibility.reasons.includes('OUT_OF_STOCK');
            return (
              <div className={`rwd-card${e.eligible ? '' : ' locked'}`} key={r.key}>
                <div className="ic"><i className={`bi ${r.iconKey}`} /></div>
                <b>{r.name}</b>
                {r.description && <p>{r.description}</p>}

                <div className="cost">
                  <span>{r.coinCost.toLocaleString()}</span> coins
                </div>

                {r.stockMode === 'LIMITED' && r.stockAvailable !== null && r.stockAvailable > 0 && (
                  <em className="stock">{r.stockAvailable} left</em>
                )}

                {/* Every blocking reason, in the server's own words. */}
                {!e.eligible && (
                  <ul className="why">
                    {e.messages.slice(0, 2).map((m, i) => <li key={i}>{m}</li>)}
                    {e.coinsShort > 0 && <li>Need {e.coinsShort.toLocaleString()} more coins</li>}
                  </ul>
                )}

                <button
                  className="rwd-btn primary"
                  disabled={!e.eligible}
                  onClick={() => setConfirming(r)}
                >
                  {outOfStock ? 'Out of stock' : e.eligible ? 'Redeem' : 'Locked'}
                </button>
              </div>
            );
          })}
        </div>
      )}

      {!!history.length && (
        <div className="rwd-hist">
          <b>Your redemptions</b>
          {history.map(h => (
            <div className={`row s-${h.status.toLowerCase()}`} key={h.id}>
              <div className="tx">
                <b>{h.rewardName}</b>
                <em>{new Date(h.requestedAt).toLocaleDateString()}</em>
              </div>
              <span className="coins">
                {h.coinCost.toLocaleString()} coins
                {h.status === 'CANCELLED' && h.refunded > 0 && <i> · refunded</i>}
              </span>
              <span className={`st s-${h.status.toLowerCase()}`}>{STATUS_LABEL[h.status] || h.status}</span>
            </div>
          ))}
        </div>
      )}

      {confirming && (
        <div className="rwd-modal" role="dialog">
          <div className="bx">
            <b>Redeem {confirming.name}?</b>
            <p>
              Cost: <strong>{confirming.coinCost.toLocaleString()} coins</strong><br />
              Your balance afterwards: <strong>
                {(student.coins - confirming.coinCost).toLocaleString()} coins
              </strong>
            </p>
            {confirming.instructions && <p className="ins">{confirming.instructions}</p>}
            <div className="acts">
              <button className="rwd-btn" onClick={() => setConfirming(null)}>Cancel</button>
              <button className="rwd-btn primary" disabled={busy} onClick={confirm}>
                {busy ? 'Redeeming…' : 'Confirm redemption'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Rewards;
