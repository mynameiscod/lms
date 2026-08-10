import React, { useEffect, useState } from 'react';
import passportApi, { CoinsResponse } from '../../api/passportApi';
import PassportShell from './PassportShell';

/**
 * The member's coin wallet.
 *
 * Deliberately shows NO rupee value. Publishing an exchange rate creates an expectation
 * that has to be honoured forever — a member with 20,000 coins will insist they are owed
 * ₹200 — and makes every reward not priced at exactly that rate look like a cheat. When
 * the catalogue arrives, its coin prices are the only prices that exist.
 *
 * What earns coins is read from the server rather than listed here, so a rule an admin
 * switches off stops being advertised at the same moment it stops paying.
 */

const EVENT_ICON: Record<string, string> = {
  daily_login: '📅',
  mission_complete: '✅',
  mission_all_done: '🎯',
  practice_solved: '💻',
  streak_7: '🔥',
  interview_complete: '🎙️',
  resume_scored: '📄',
  assessment_complete: '🧭',
  social_share: '📣',
  referral_converted: '🤝',
};

const Coins: React.FC = () => {
  const [data, setData] = useState<CoinsResponse | null>(null);
  const [err, setErr] = useState('');

  useEffect(() => {
    passportApi.getCoins().then(setData).catch(e =>
      setErr(e?.response?.data?.message || 'Could not load your coins'));
  }, []);

  if (err) return <PassportShell><div className="pm-msg err">{err}</div></PassportShell>;
  if (!data) return <PassportShell><div className="pm-card">Loading…</div></PassportShell>;

  if (!data.enabled) {
    return (
      <PassportShell>
        <div className="pm-head"><h1>Coins</h1></div>
        <div className="pm-card">Coins aren't switched on yet. Keep going — your activity still counts.</div>
      </PassportShell>
    );
  }

  return (
    <PassportShell>
      <div className="pm-head">
        <h1>Your coins</h1>
        <p>Earn coins for showing up and doing the work. Spend them on rewards.</p>
      </div>

      <div className="cn-hero">
        <div className="cn-balance">
          <span className="cn-coin">🪙</span>
          <span className="cn-num">{data.balance.toLocaleString('en-IN')}</span>
        </div>
        <div className="cn-sub">
          {data.lifetimeEarned.toLocaleString('en-IN')} earned all time
          {data.lifetimeSpent > 0 && <> · {data.lifetimeSpent.toLocaleString('en-IN')} spent</>}
        </div>
        {/* Free members accrue but cannot spend. Saying so plainly is the whole point —
            a balance you can see and not touch is the prompt. */}
        {!data.redeemable && (
          <div className="cn-locked">
            🔒 Your coins are saving up. Activate your membership to spend them.
          </div>
        )}
      </div>

      {!!data.earnRules.length && (
        <div className="pm-card">
          <h3 style={{ fontSize: 15, fontWeight: 900, color: '#0f172a', margin: '0 0 12px' }}>How to earn</h3>
          {data.earnRules.map(r => (
            <div className="cn-earn-row" key={r.eventKey}>
              <span className="ic">{EVENT_ICON[r.eventKey] || '⭐'}</span>
              <span className="lbl">
                {r.label}
                {r.dailyCap > 0 && <em> · up to {r.dailyCap}×/day</em>}
              </span>
              <span className="amt">+{r.coins}</span>
            </div>
          ))}
          {data.monthlyEarnCap > 0 && (
            <p className="cn-note">
              Up to {data.monthlyEarnCap.toLocaleString('en-IN')} coins a month from daily activity.
              Referrals don't count toward that limit.
            </p>
          )}
        </div>
      )}

      <div className="pm-card">
        <h3 style={{ fontSize: 15, fontWeight: 900, color: '#0f172a', margin: '0 0 12px' }}>Recent activity</h3>
        {!data.history.length ? (
          <p style={{ fontSize: 13.5, color: '#64748b', margin: 0 }}>
            Nothing yet. Finish today's missions to earn your first coins.
          </p>
        ) : (
          data.history.map((h, i) => (
            <div className="cn-hist-row" key={i}>
              <span className="ic">{EVENT_ICON[h.eventKey] || '⭐'}</span>
              <span className="lbl">
                {h.note || h.eventKey.replace(/_/g, ' ')}
                <em>{new Date(h.at).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}</em>
              </span>
              <span className={`amt ${h.coins < 0 ? 'neg' : ''}`}>
                {h.coins > 0 ? '+' : ''}{h.coins}
              </span>
            </div>
          ))
        )}
      </div>
    </PassportShell>
  );
};

export default Coins;
