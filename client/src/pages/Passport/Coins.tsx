import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import passportApi, { CoinsResponse } from '../../api/passportApi';
import PassportShell from './PassportShell';
import './coinsRedesign.css';

const EVENT_ICON: Record<string, string> = {
  daily_login: 'bi-calendar-check',
  mission_complete: 'bi-bullseye',
  mission_all_done: 'bi-flag-fill',
  practice_solved: 'bi-code-square',
  streak_7: 'bi-fire',
  interview_complete: 'bi-mic',
  resume_scored: 'bi-file-earmark-text',
  assessment_complete: 'bi-clipboard2-check',
  social_share: 'bi-megaphone',
  referral_converted: 'bi-people',
};

const Coins: React.FC = () => {
  const nav = useNavigate();
  const [data, setData] = useState<CoinsResponse | null>(null);
  const [err, setErr] = useState('');
  const [filter, setFilter] = useState<'ALL' | 'EARNED' | 'SPENT'>('ALL');

  useEffect(() => {
    passportApi.getCoins().then(setData).catch(e =>
      setErr(e?.response?.data?.message || 'Could not load your coins'));
  }, []);

  const filteredHistory = useMemo(() => {
    if (!data) return [];
    if (filter === 'EARNED') return data.history.filter(h => h.coins > 0);
    if (filter === 'SPENT') return data.history.filter(h => h.coins < 0);
    return data.history;
  }, [data, filter]);

  if (err) return <PassportShell><div className="pm-msg err">{err}</div></PassportShell>;
  if (!data) return <PassportShell><div className="pm-card">Loading…</div></PassportShell>;

  if (!data.enabled) {
    return (
      <PassportShell>
        <div className="cpw-empty"><i className="bi bi-coin" /><h2>Coins aren’t switched on yet</h2><p>Keep going — your activity still counts toward your CareerPilot progress.</p></div>
      </PassportShell>
    );
  }

  const spendable = data.redeemable;

  return (
    <PassportShell>
      <div className="cpw">
        <div className="cpw-head">
          <div><span className="cpw-kicker"><i className="bi bi-coin" /> CareerPilot wallet</span><h1>Coins / Wallet</h1><p>Track your coins, earnings and spending activity.</p></div>
          <button className="cpw-rewards-btn" onClick={() => nav('/careerpilot/rewards')}>Explore Rewards <i className="bi bi-arrow-right" /></button>
        </div>

        <div className="cpw-top-grid">
          <section className="cpw-balance-card">
            <div className="cpw-balance-copy"><span>Your Coin Balance</span><strong>{data.balance.toLocaleString('en-IN')}</strong><em>CareerPilot Coins</em><p>Coins have no cash value and are non-transferable.</p></div>
            <div className="cpw-wallet-art"><i className="bi bi-wallet2" /><span><i className="bi bi-coin" /></span></div>
          </section>

          <section className="cpw-stat-grid">
            <div className="cpw-stat"><span className="green"><i className="bi bi-arrow-up-right" /></span><small>Coins earned</small><b>{data.lifetimeEarned.toLocaleString('en-IN')}</b><em>Lifetime earned</em></div>
            <div className="cpw-stat"><span className="red"><i className="bi bi-arrow-down-left" /></span><small>Coins spent</small><b>{data.lifetimeSpent.toLocaleString('en-IN')}</b><em>Lifetime spent</em></div>
            <div className="cpw-stat"><span className="blue"><i className="bi bi-gift" /></span><small>Spend status</small><b>{spendable ? 'Ready' : 'Locked'}</b><em>{spendable ? 'Rewards can be redeemed' : 'Membership needed to spend'}</em></div>
            <div className="cpw-stat"><span className="orange"><i className="bi bi-speedometer2" /></span><small>Monthly earn cap</small><b>{data.monthlyEarnCap > 0 ? data.monthlyEarnCap.toLocaleString('en-IN') : '—'}</b><em>{data.monthlyEarnCap > 0 ? 'Daily activity cap' : 'No cap configured'}</em></div>
          </section>
        </div>

        {!data.redeemable && <div className="cpw-banner"><i className="bi bi-lock" /><span>Your coins are saving up. Activate your membership to spend them on rewards.</span></div>}

        <div className="cpw-main-grid">
          <div className="cpw-left">
            {!!data.earnRules.length && (
              <section className="cpw-card">
                <div className="cpw-card-head"><div><h3>Coin Activity Overview</h3><p>These earning rules come directly from the current CareerPilot configuration.</p></div></div>
                <div className="cpw-earn-grid">
                  {data.earnRules.map(r => (
                    <div className="cpw-earn" key={r.eventKey}>
                      <span><i className={`bi ${EVENT_ICON[r.eventKey] || 'bi-stars'}`} /></span>
                      <b>{r.label}</b>
                      <strong>+{r.coins.toLocaleString('en-IN')}</strong>
                      <em>{r.dailyCap > 0 ? `Up to ${r.dailyCap}×/day` : 'Per eligible action'}</em>
                    </div>
                  ))}
                </div>
                {data.monthlyEarnCap > 0 && <div className="cpw-note">Up to {data.monthlyEarnCap.toLocaleString('en-IN')} coins a month from daily activity. Referrals don’t count toward that limit.</div>}
              </section>
            )}

            <section className="cpw-card cpw-history">
              <div className="cpw-card-head cpw-history-head"><div><h3>Recent Transactions</h3><p>Your latest CareerPilot coin activity.</p></div><div className="cpw-filters"><button className={filter === 'ALL' ? 'on' : ''} onClick={() => setFilter('ALL')}>All</button><button className={filter === 'EARNED' ? 'on' : ''} onClick={() => setFilter('EARNED')}>Earned</button><button className={filter === 'SPENT' ? 'on' : ''} onClick={() => setFilter('SPENT')}>Spent</button></div></div>
              {!filteredHistory.length ? <div className="cpw-nohist">No transactions in this view yet.</div> : filteredHistory.map((h, i) => (
                <div className="cpw-row" key={`${h.at}-${i}`}>
                  <span className="cpw-row-ic"><i className={`bi ${EVENT_ICON[h.eventKey] || 'bi-stars'}`} /></span>
                  <div className="cpw-row-copy"><b>{h.note || h.eventKey.replace(/_/g, ' ')}</b><em>{new Date(h.at).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}</em></div>
                  <span className={`cpw-type ${h.coins < 0 ? 'spent' : 'earned'}`}>{h.coins < 0 ? 'Spent' : 'Earned'}</span>
                  <strong className={h.coins < 0 ? 'neg' : ''}>{h.coins > 0 ? '+' : ''}{h.coins.toLocaleString('en-IN')}</strong>
                </div>
              ))}
            </section>
          </div>

          <aside className="cpw-right">
            <section className="cpw-card"><div className="cpw-card-head"><div><h3>Quick Actions</h3><p>Move directly to the next useful step.</p></div></div><button className="cpw-action" onClick={() => nav('/careerpilot/rewards')}><span><i className="bi bi-gift" /></span><div><b>Explore Rewards</b><em>See what your coins can unlock</em></div><i className="bi bi-arrow-right" /></button><button className="cpw-action" onClick={() => nav('/careerpilot/missions')}><span><i className="bi bi-bullseye" /></span><div><b>Complete Missions</b><em>Earn through meaningful actions</em></div><i className="bi bi-arrow-right" /></button><button className="cpw-action" onClick={() => nav('/careerpilot/practice')}><span><i className="bi bi-code-square" /></span><div><b>Practice & Improve</b><em>Earn from configured practice rules</em></div><i className="bi bi-arrow-right" /></button></section>

            <section className="cpw-card cpw-policy"><div className="cpw-card-head"><div><h3>Coin Rules</h3><p>Simple and transparent.</p></div></div><ul><li><i className="bi bi-check-circle" /> Coins are separate from XP.</li><li><i className="bi bi-check-circle" /> Coins have no rupee or cash value.</li><li><i className="bi bi-check-circle" /> Reward prices are defined in coins only.</li><li><i className="bi bi-check-circle" /> Server eligibility rules always decide redemption.</li></ul></section>
          </aside>
        </div>
      </div>
    </PassportShell>
  );
};

export default Coins;
