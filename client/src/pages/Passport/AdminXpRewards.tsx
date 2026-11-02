import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import passportApi, { AdminGamification, CoinConfig, XpRewardsOverview, XpRuleRow } from '../../api/passportApi';
import { RewardsTab, RedemptionsTab, BudgetTab, SaveBar, Skeleton, useLeaveWarning } from './AdminRewardsTabs';
import './adminXpRewards.css';

/**
 * XP & Rewards — what a member earns, and what they can spend it on.
 *
 * XP: what each type of journey task pays, what the other activities (assessment, mock interview,
 * orientation…) pay, the day bonus, and the tasks priced one by one in the Content Builder. Every figure
 * here is the figure the day player shows and the ledger pays — one price list, read by both.
 *
 * A change applies to XP earned from now on. XP already paid is never re-priced.
 */

type Tab = 'xp' | 'coins' | 'rewards' | 'redemptions' | 'budget';
const TABS: { key: Tab; label: string; icon: string }[] = [
  { key: 'xp', label: 'XP', icon: 'bi-lightning-charge-fill' },
  { key: 'coins', label: 'XP to coins', icon: 'bi-arrow-left-right' },
  { key: 'rewards', label: 'Rewards', icon: 'bi-gift-fill' },
  { key: 'redemptions', label: 'Redemptions', icon: 'bi-inbox-fill' },
  { key: 'budget', label: 'Budget', icon: 'bi-wallet2' },
];

/** The task-XP rule is priced per task, below; its own amount is only a fallback nobody should edit. */
const TASK_EVENT = 'FOUNDATION_ACTIVITY_COMPLETED';
const DAY_EVENT = 'FOUNDATION_DAY_COMPLETED';

/** Task types grouped the way a day runs: take it in, practise it, prove it. */
const GROUPS: { key: string; label: string; hint: string; icon: string; types: string[] }[] = [
  { key: 'learn', label: 'Learn', hint: 'Watching and reading', icon: 'bi-book-half', types: ['video', 'notes', 'worked_example', 'interactive_lesson', 'interactive_activity'] },
  { key: 'practise', label: 'Practise', hint: 'Doing it yourself', icon: 'bi-pencil-square', types: ['practice_theory', 'tech_qa', 'behavioral_qa', 'aptitude', 'practice_coding'] },
  { key: 'prove', label: 'Prove', hint: 'Checkpoints and projects', icon: 'bi-patch-check-fill', types: ['quiz', 'assignment'] },
];
const TYPE_ICON: Record<string, string> = {
  video: 'bi-play-circle', notes: 'bi-file-earmark-text', worked_example: 'bi-lightbulb', interactive_lesson: 'bi-easel',
  interactive_activity: 'bi-hand-index', practice_theory: 'bi-pencil', tech_qa: 'bi-cpu', behavioral_qa: 'bi-people',
  aptitude: 'bi-calculator', practice_coding: 'bi-code-slash', quiz: 'bi-patch-question', assignment: 'bi-briefcase',
};
const EVENT_ICON: Record<string, string> = {
  ORIENTATION_DAY_COMPLETED: 'bi-flag', CAREER_MISSION_COMPLETED: 'bi-bullseye', PERSONALIZED_ASSESSMENT_COMPLETED: 'bi-clipboard-check',
  MOCK_INTERVIEW_COMPLETED: 'bi-mic', COMPANY_MOCK_TEST_COMPLETED: 'bi-building',
};
const n = (v: number) => (v || 0).toLocaleString('en-IN');

const AdminXpRewards: React.FC = () => {
  const [params, setParams] = useSearchParams();
  const tab = (TABS.some(t => t.key === params.get('tab')) ? params.get('tab') : 'xp') as Tab;
  const goTo = useCallback((t: string) => setParams(p => { const q = new URLSearchParams(p); q.set('tab', t); return q; }), [setParams]);
  const [ov, setOv] = useState<XpRewardsOverview | null>(null);
  /** Figures move after a save on any tab, so each tab tells the header when it changed something. */
  const loadOverview = useCallback(() => { passportApi.getXpRewardsOverview().then(setOv).catch(() => { /* the strip stays empty; tabs still work */ }); }, []);
  useEffect(() => { loadOverview(); }, [loadOverview]);

  const waiting = ov?.waiting || 0;

  return <div className="xr">
    <header className="xr-head">
      <div>
        <span className="xr-eyebrow">CareerPilot</span>
        <h1>XP &amp; Rewards</h1>
        <p>What members earn for their work, and what they can spend it on.</p>
      </div>
      <a className="xr-btn" href="/admin/passport/coins"><i className="bi bi-sliders" /> Coin rules &amp; limits</a>
    </header>

    <section className="xr-ov" aria-label="This month">
      <button type="button" className={`xr-ov-t${tab === 'xp' ? ' on' : ''}`} onClick={() => goTo('xp')}>
        <span className="xr-ov-ic teal"><i className="bi bi-lightning-charge-fill" /></span>
        <span className="xr-ov-c"><small>XP earned this month</small><b>{ov?.xpThisMonth ? n(ov.xpThisMonth.total) : '—'}</b>
          <em>{ov?.xpThisMonth ? `by ${n(ov.xpThisMonth.members)} member${ov.xpThisMonth.members === 1 ? '' : 's'}` : ' '}</em></span>
      </button>
      <button type="button" className={`xr-ov-t${tab === 'coins' ? ' on' : ''}`} onClick={() => goTo('coins')}>
        <span className="xr-ov-ic gold"><i className="bi bi-arrow-left-right" /></span>
        <span className="xr-ov-c"><small>XP converted to coins</small>
          {ov?.conversion?.enabled
            ? <><b>{n(ov.conversion.coinsThisMonth)} <span className="u">coins</span></b><em>{n(ov.conversion.xpPerCoin)} XP = 1 coin</em></>
            : <><b className="muted">{ov?.conversion ? 'Off' : '—'}</b><em>{ov?.conversion ? 'Members cannot convert yet' : ' '}</em></>}</span>
      </button>
      <button type="button" className={`xr-ov-t${tab === 'redemptions' ? ' on' : ''}${waiting > 0 ? ' needs' : ''}`} onClick={() => goTo('redemptions')}>
        <span className="xr-ov-ic red"><i className="bi bi-inbox-fill" /></span>
        <span className="xr-ov-c"><small>Waiting to fulfil</small><b>{ov ? n(waiting) : '—'}</b>
          <em>{ov ? `${n(ov.liveRewards || 0)} live reward${ov.liveRewards === 1 ? '' : 's'}` : ' '}</em></span>
      </button>
      <button type="button" className={`xr-ov-t${tab === 'budget' ? ' on' : ''}`} onClick={() => goTo('budget')}>
        <span className={`xr-ov-ic ${ov?.store?.open ? 'green' : 'grey'}`}><i className="bi bi-shop" /></span>
        <span className="xr-ov-c"><small>Rewards store</small>
          {ov?.store?.open
            ? <><b>Open</b><em>₹{n(ov.store.leftRupees)} of ₹{n(ov.store.budgetRupees)} left</em></>
            : <><b className="muted">{ov?.store ? 'Closed' : '—'}</b><em>{ov?.store ? 'Switch on in Budget' : ' '}</em></>}</span>
      </button>
    </section>

    <nav className="xr-tabs" aria-label="Sections">
      {TABS.map(t => (
        <button key={t.key} type="button" className={t.key === tab ? 'on' : ''} aria-current={t.key === tab ? 'page' : undefined}
          onClick={() => goTo(t.key)}>
          <i className={`bi ${t.icon}`} /> {t.label}
          {t.key === 'redemptions' && waiting > 0 && <span className="xr-count" aria-label={`${waiting} waiting`}>{waiting}</span>}
        </button>
      ))}
    </nav>

    {tab === 'xp' && <XpTab onSaved={loadOverview} />}
    {tab === 'coins' && <ConversionTab onSaved={loadOverview} />}
    {tab === 'rewards' && <RewardsTab goTo={goTo} onSaved={loadOverview} />}
    {tab === 'redemptions' && <RedemptionsTab onChanged={loadOverview} />}
    {tab === 'budget' && <BudgetTab onSaved={loadOverview} />}
  </div>;
};

// ── XP → coins ──────────────────────────────────────────────────────────────

/**
 * XP → coins: switch it on and set the rate. Members convert on their Coins page, when they choose.
 *
 * The first switch-on fixes the start date on the server; XP earned before it never converts.
 */
const ConversionTab: React.FC<{ onSaved: () => void }> = ({ onSaved }) => {
  const [cfg, setCfg] = useState<CoinConfig | null>(null);
  const [enabled, setEnabled] = useState(false);
  const [rate, setRate] = useState('100');
  const [err, setErr] = useState('');
  const [msg, setMsg] = useState('');
  const [busy, setBusy] = useState(false);

  const load = async () => {
    try {
      const d = await passportApi.getCoinAdmin();
      setCfg(d.config);
      setEnabled(!!d.config.xpConversionEnabled);
      setRate(String(d.config.xpPerCoin || 100));
      setErr('');
    } catch (e: any) {
      setErr(e?.response?.data?.message || 'Could not load the coin settings.');
    }
  };
  useEffect(() => { load(); }, []);

  const r = Number(rate);
  const rateOk = rate !== '' && Number.isInteger(r) && r >= 1 && r <= 1_000_000;
  const dirty = !!cfg && (enabled !== !!cfg.xpConversionEnabled || String(cfg.xpPerCoin || 100) !== rate);
  useLeaveWarning(dirty);

  const save = async () => {
    if (!rateOk) return;
    setBusy(true); setErr('');
    try {
      await passportApi.saveCoinConfig({ xpConversionEnabled: enabled, xpPerCoin: r } as any);
      await load();
      onSaved();
      setMsg(enabled ? 'Saved. Members can convert XP on their Coins page.' : 'Saved. Converting is switched off.');
      window.setTimeout(() => setMsg(''), 3200);
    } catch (e: any) {
      setErr(e?.response?.data?.message || 'Could not save.');
    }
    setBusy(false);
  };

  if (!cfg) return err ? <div className="xr-err"><i className="bi bi-exclamation-circle" /> {err}</div> : <Skeleton />;

  const startsAt = cfg.xpConversionStartsAt ? new Date(cfg.xpConversionStartsAt) : null;
  const examples = [100, 500, 1000, 5000];
  // The preview: a member with a typical fortnight's XP.
  const sampleXp = 370;
  const sampleCoins = rateOk ? Math.floor(sampleXp / r) : 0;

  return <>
    {err && <div className="xr-err"><i className="bi bi-exclamation-circle" /> {err}</div>}
    {msg && <div className="xr-ok" role="status"><i className="bi bi-check-circle-fill" /> {msg}</div>}
    {!cfg.enabled && <div className="xr-warn"><i className="bi bi-exclamation-triangle-fill" /><span>Coins are switched off for this tenant, so members cannot convert. Switch coins on in <a href="/admin/passport/coins">CareerPilot Coins</a>.</span></div>}

    <div className="xr-split">
      <section className="xr-card">
        <div className="xr-card-hd">
          <div>
            <h2>Let members turn XP into coins</h2>
            <p>Members choose when to convert. Their XP, level and rank never go down — only the XP left to convert does.</p>
          </div>
          <label className="xr-switch">
            <input type="checkbox" checked={enabled} onChange={e => setEnabled(e.target.checked)} />
            <span>{enabled ? 'On' : 'Off'}</span>
          </label>
        </div>

        <div className={`xr-conv${enabled ? '' : ' dim'}`}>
          <label className="xr-conv-rate">
            <span>Exchange rate</span>
            <span className="xr-conv-eq">
              <span className={`xr-type-in wide${rateOk ? '' : ' bad'}`}>
                <input type="number" min={1} step={1} value={rate} inputMode="numeric" onChange={e => setRate(e.target.value)} aria-label="XP for one coin" />
                <em>XP</em>
              </span>
              <b>=</b>
              <span className="xr-conv-coin"><i className="bi bi-coin" /> 1 coin</span>
            </span>
            {!rateOk && <small className="xr-hint bad">A whole number from 1 to 1,000,000.</small>}
          </label>

          <div className="xr-conv-ex">
            <span>What XP buys at this rate</span>
            <ul>
              {examples.map(x => <li key={x}><b>{n(x)} XP</b><i className="bi bi-arrow-right" /><span>{rateOk ? `${n(Math.floor(x / r))} ${Math.floor(x / r) === 1 ? 'coin' : 'coins'}` : '—'}</span></li>)}
            </ul>
          </div>
        </div>

        <ul className="xr-facts">
          <li><i className="bi bi-calendar-check" /><span>{startsAt
            ? <>Counting XP earned since <b>{startsAt.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}</b>, when converting was first switched on.</>
            : <>XP earned before you switch this on never converts — counting starts at that moment.</>}</span></li>
          <li><i className="bi bi-speedometer2" /><span>{cfg.monthlyEarnCap > 0
            ? <>A member can get at most <b>{n(cfg.monthlyEarnCap)} coins a month</b> (conversions included). Leftover XP waits for next month.</>
            : <>No monthly coin limit is set.</>}{' '}<a href="/admin/passport/coins">Change</a></span></li>
          <li><i className="bi bi-arrow-repeat" /><span>Changing the rate applies to XP converted from then on. Coins already given are kept.</span></li>
        </ul>
      </section>

      <aside className="xr-card xr-preview" aria-label="What members see">
        <span className="xr-preview-lbl"><i className="bi bi-phone" /> What members see</span>
        {enabled ? <div className="xr-pv">
          <div className="xr-pv-top">
            <span className="xr-pv-ic"><i className="bi bi-lightning-charge-fill" /></span>
            <div><b>Turn your XP into coins</b><small><em>{rateOk ? n(r) : '—'} XP = 1 coin.</em> Your XP never goes down.</small></div>
          </div>
          <div className="xr-pv-nums">
            <div><small>XP ready</small><b>{n(sampleXp)}</b></div>
            <i className="bi bi-arrow-right" />
            <div><small>Coins</small><b className="coin"><i className="bi bi-coin" /> {n(sampleCoins)}</b></div>
          </div>
          <span className="xr-pv-btn">{!rateOk ? '—' : sampleCoins > 0 ? `Convert ${n(sampleCoins * r)} XP` : `${n(r - (sampleXp % r))} more XP for a coin`}</span>
          <small className="xr-pv-note">Example: a member with {n(sampleXp)} XP. It also shows on their Dashboard and in the Reward Store.</small>
        </div> : <div className="xr-blank"><i className="bi bi-eye-slash" /> Members see a convert card once this is on.</div>}
      </aside>
    </div>

    <SaveBar dirty={dirty} count={1} busy={busy} disabled={!rateOk}
      onDiscard={() => { setEnabled(!!cfg.xpConversionEnabled); setRate(String(cfg.xpPerCoin || 100)); }} onSave={save} />
  </>;
};

// ── XP ──────────────────────────────────────────────────────────────────────

const XpTab: React.FC<{ onSaved: () => void }> = ({ onSaved }) => {
  const [data, setData] = useState<AdminGamification | null>(null);
  const [types, setTypes] = useState<Record<string, string>>({});
  const [rules, setRules] = useState<XpRuleRow[]>([]);
  const [err, setErr] = useState('');
  const [msg, setMsg] = useState('');
  const [busy, setBusy] = useState('');
  const [find, setFind] = useState('');

  const load = async () => {
    try {
      const d = await passportApi.getAdminGamification();
      setData(d);
      setTypes(Object.fromEntries(d.taskTypes.map(t => [t.key, String(t.xp)])));
      setRules(d.rules);
      setErr('');
    } catch (e: any) {
      setErr(e?.response?.data?.message || 'Could not load the XP settings.');
    }
  };
  useEffect(() => { load(); }, []);

  const flash = (m: string) => { setMsg(m); window.setTimeout(() => setMsg(''), 3600); };
  const max = data?.taskXpMax || 1000;
  const valid = (v: string) => v !== '' && Number.isInteger(Number(v)) && Number(v) >= 0 && Number(v) <= max;
  const validLimit = (v: any) => String(v) !== '' && Number.isInteger(Number(v)) && Number(v) >= 0;

  const ruleOf = (key: string) => rules.find(r => r.eventKey === key);
  const setRule = (key: string, patch: Partial<XpRuleRow>) => setRules(rs => rs.map(r => (r.eventKey === key ? { ...r, ...patch } : r)));
  const ruleDirty = useCallback((key: string) => {
    const a = rules.find(r => r.eventKey === key); const b = data?.rules.find(r => r.eventKey === key);
    return !!a && !!b && (a.enabled !== b.enabled || String(a.xp) !== String(b.xp) || String(a.dailyLimit) !== String(b.dailyLimit));
  }, [rules, data]);

  const dirtyTypes = useMemo(() => (data ? data.taskTypes.filter(t => String(t.xp) !== types[t.key]).map(t => t.key) : []), [data, types]);
  const dirtyRules = useMemo(() => (data ? data.rules.map(r => r.eventKey).filter(ruleDirty) : []), [data, ruleDirty]);
  const dirtyCount = dirtyTypes.length + dirtyRules.length;
  const allValid = Object.values(types).every(valid) && rules.every(r => valid(String(r.xp)) && validLimit(r.dailyLimit));
  useLeaveWarning(dirtyCount > 0);

  const saveAll = async () => {
    if (!allValid) { setErr(`Use whole numbers from 0 to ${n(max)}.`); return; }
    setBusy('save'); setErr('');
    try {
      if (dirtyTypes.length) {
        const r = await passportApi.updateTaskXp(Object.fromEntries(dirtyTypes.map(k => [k, Math.round(Number(types[k]))])));
        setData(d => (d ? { ...d, taskTypes: r.taskTypes } : d));
        setTypes(Object.fromEntries(r.taskTypes.map(t => [t.key, String(t.xp)])));
      }
      for (const key of dirtyRules) {
        const r = ruleOf(key)!;
        const out = await passportApi.updateXpRule(key, { enabled: r.enabled, xp: Math.round(Number(r.xp)), dailyLimit: Math.round(Number(r.dailyLimit)) });
        setData(d => (d ? { ...d, rules: d.rules.map(x => (x.eventKey === key ? out.rule : x)) } : d));
        setRules(rs => rs.map(x => (x.eventKey === key ? out.rule : x)));
      }
      onSaved();
      flash(`Saved ${dirtyCount} change${dirtyCount === 1 ? '' : 's'}. Members see the new amounts the next time they open a page.`);
    } catch (e: any) {
      setErr(e?.response?.data?.message || 'Could not save every change. Check the figures and save again.');
    }
    setBusy('');
  };

  const discard = () => {
    if (!data) return;
    setTypes(Object.fromEntries(data.taskTypes.map(t => [t.key, String(t.xp)])));
    setRules(data.rules);
  };

  const resetOverride = async (refKind: 'content' | 'module', refId: string) => {
    setBusy(`o:${refId}`);
    try {
      await passportApi.clearTaskXpOverride(refKind, refId);
      setData(d => (d ? { ...d, taskOverrides: d.taskOverrides.filter(o => o.refId !== refId) } : d));
      flash('Back to the amount for its type.');
    } catch (e: any) {
      setErr(e?.response?.data?.message || 'Could not reset that task.');
    }
    setBusy('');
  };

  if (!data) return err ? <div className="xr-err"><i className="bi bi-exclamation-circle" /> {err}</div> : <Skeleton />;

  const typeByKey = new Map(data.taskTypes.map(t => [t.key, t]));
  const grouped = new Set(GROUPS.flatMap(g => g.types));
  const extra = data.taskTypes.filter(t => !grouped.has(t.key)).map(t => t.key);
  const groups = extra.length ? [...GROUPS, { key: 'other', label: 'Other', hint: 'Other task types', icon: 'bi-three-dots', types: extra }] : GROUPS;

  const taskRule = ruleOf(TASK_EVENT);
  const dayRule = ruleOf(DAY_EVENT);
  const otherEvents = data.events.filter(e => e.key !== TASK_EVENT && e.key !== DAY_EVENT);
  const tasksOff = !!taskRule && !taskRule.enabled;
  const overrides = data.taskOverrides.filter(o => !find || (o.title || '').toLowerCase().includes(find.toLowerCase()));

  return <>
    {err && <div className="xr-err"><i className="bi bi-exclamation-circle" /> {err}</div>}
    {msg && <div className="xr-ok" role="status"><i className="bi bi-check-circle-fill" /> {msg}</div>}

    {/* ── Tasks on a learning day ───────────────────────────────────────── */}
    <section className="xr-card">
      <div className="xr-card-hd">
        <div>
          <h2>Tasks on a learning day</h2>
          <p>What a member earns for finishing each type of task. A task given its own amount in the Content Builder keeps it.</p>
        </div>
        {taskRule && <label className="xr-switch" title="Switch off to stop paying XP for day tasks">
          <input type="checkbox" checked={taskRule.enabled} onChange={e => setRule(TASK_EVENT, { enabled: e.target.checked })} />
          <span>{taskRule.enabled ? 'Paying XP' : 'Not paying XP'}</span>
        </label>}
      </div>

      <div className={`xr-groups${tasksOff ? ' dim' : ''}`}>
        {groups.map(g => (
          <div key={g.key} className={`xr-group g-${g.key}`}>
            <div className="xr-group-hd"><span className="xr-group-ic"><i className={`bi ${g.icon}`} /></span><div><b>{g.label}</b><small>{g.hint}</small></div></div>
            <ul>
              {g.types.map(k => {
                const t = typeByKey.get(k);
                if (!t) return null;
                const v = types[k] ?? '';
                const unsaved = String(t.xp) !== v;
                const notDefault = String(t.defaultXp) !== v;
                return <li key={k} className={`${valid(v) ? '' : 'bad'}${unsaved ? ' unsaved' : ''}`}>
                  <span className="xr-tt"><i className={`bi ${TYPE_ICON[k] || 'bi-dot'}`} /><span><b>{t.label}</b>{notDefault && <button type="button" className="xr-reset" onClick={() => setTypes(s => ({ ...s, [k]: String(t.defaultXp) }))}>Default {t.defaultXp} · reset</button>}</span></span>
                  <Stepper value={v} max={max} disabled={tasksOff} label={`${t.label} XP`} onChange={x => setTypes(s => ({ ...s, [k]: x }))} />
                </li>;
              })}
            </ul>
          </div>
        ))}
      </div>
      {!Object.values(types).every(valid) && <p className="xr-hint bad">Use whole numbers from 0 to {n(max)}.</p>}
    </section>

    {/* ── Day rules ─────────────────────────────────────────────────────── */}
    <section className="xr-card">
      <div className="xr-card-hd"><div><h2>Day rules</h2><p>A bonus for finishing a whole day, and a ceiling so nobody can farm task XP.</p></div></div>
      <div className="xr-dayrules">
        {dayRule && <div className={`xr-dr${dayRule.enabled ? '' : ' off'}${ruleDirty(DAY_EVENT) ? ' unsaved' : ''}`}>
          <span className="xr-dr-ic gold"><i className="bi bi-trophy-fill" /></span>
          <div className="xr-dr-c"><b>Day bonus</b><small>Paid once when every task of a day is done.</small></div>
          <div className="xr-dr-ctl">
            <Stepper value={String(dayRule.xp)} max={max} disabled={!dayRule.enabled} label="Day bonus XP" onChange={x => setRule(DAY_EVENT, { xp: x as any })} />
            <label className="xr-switch sm"><input type="checkbox" checked={dayRule.enabled} onChange={e => setRule(DAY_EVENT, { enabled: e.target.checked })} /><span>{dayRule.enabled ? 'On' : 'Off'}</span></label>
          </div>
        </div>}
        {taskRule && <div className={`xr-dr${ruleDirty(TASK_EVENT) ? ' unsaved' : ''}`}>
          <span className="xr-dr-ic blue"><i className="bi bi-speedometer2" /></span>
          <div className="xr-dr-c"><b>Daily limit for task XP</b><small>The most task XP one member can earn in a day. 0 = no limit.</small></div>
          <div className="xr-dr-ctl">
            <Stepper value={String(taskRule.dailyLimit)} max={100000} step={25} label="Daily limit for task XP" onChange={x => setRule(TASK_EVENT, { dailyLimit: x as any })} />
          </div>
        </div>}
      </div>
    </section>

    {/* ── Other activities ──────────────────────────────────────────────── */}
    <section className="xr-card">
      <div className="xr-card-hd"><div><h2>Other activities</h2><p>Each pays once per sitting — for taking part, not for the score.</p></div></div>
      <div className="xr-acts">
        <div className="xr-acts-hd" aria-hidden><span>Activity</span><span>XP</span><span>Daily limit</span><span>Paying</span></div>
        {otherEvents.map(ev => {
          const r = ruleOf(ev.key);
          if (!r) return null;
          return <div key={ev.key} className={`xr-act${r.enabled ? '' : ' off'}${ruleDirty(ev.key) ? ' unsaved' : ''}`}>
            <span className="xr-act-l"><span className="xr-act-ic"><i className={`bi ${EVENT_ICON[ev.key] || 'bi-stars'}`} /></span><span><b>{ev.name}</b><small>{ev.description}</small></span></span>
            <label className="xr-act-f"><span>XP</span><Stepper value={String(r.xp)} max={max} disabled={!r.enabled} label={`${ev.name} XP`} onChange={x => setRule(ev.key, { xp: x as any })} /></label>
            <label className="xr-act-f"><span>Daily limit</span><Stepper value={String(r.dailyLimit)} max={100000} step={10} disabled={!r.enabled} label={`${ev.name} daily limit`} onChange={x => setRule(ev.key, { dailyLimit: x as any })} /></label>
            <label className="xr-switch sm"><input type="checkbox" checked={r.enabled} onChange={e => setRule(ev.key, { enabled: e.target.checked })} /><span>{r.enabled ? 'On' : 'Off'}</span></label>
          </div>;
        })}
      </div>
      <p className="xr-foot">Daily limit 0 means no limit. Streak bonuses (100 XP at 7 days, 500 at 30) are fixed.</p>
    </section>

    {/* ── Tasks priced one by one ───────────────────────────────────────── */}
    <section className="xr-card">
      <div className="xr-card-hd">
        <div>
          <h2>Tasks with their own XP <span className="xr-n">{data.taskOverrides.length}</span></h2>
          <p>Set in the Content Builder by clicking a task's <span className="xr-pill">+5 XP</span>. It applies wherever that task is used.</p>
        </div>
        <a className="xr-btn" href="/admin/passport/content-builder"><i className="bi bi-layers" /> Open Content Builder</a>
      </div>
      {data.taskOverrides.length > 6 && <label className="xr-search"><i className="bi bi-search" /><input value={find} onChange={e => setFind(e.target.value)} placeholder="Find a task" aria-label="Find a task" /></label>}
      {!data.taskOverrides.length
        ? <div className="xr-blank"><i className="bi bi-pin-angle" /> No task has its own XP yet. Every task pays the amount for its type.</div>
        : !overrides.length ? <div className="xr-blank"><i className="bi bi-search" /> No task matches “{find}”.</div>
        : <ul className="xr-list">
          {overrides.map(o => (
            <li key={`${o.refKind}:${o.refId}`}>
              <span className="xr-list-ic"><i className={`bi ${o.refKind === 'content' ? 'bi-file-earmark-text' : 'bi-patch-question'}`} /></span>
              <span className="xr-list-t"><b>{o.title || 'Untitled task'}</b><small>{o.refKind === 'content' ? 'Lesson content' : 'Checkpoint, assignment or code task'}</small></span>
              <span className="xr-pill strong">{n(o.xp)} XP</span>
              <button type="button" className="xr-btn sm" disabled={busy === `o:${o.refId}`} onClick={() => resetOverride(o.refKind, o.refId)}
                title="Pay the amount for its type again"><i className="bi bi-arrow-counterclockwise" /> Use type amount</button>
            </li>
          ))}
        </ul>}
    </section>

    <SaveBar dirty={dirtyCount > 0} count={dirtyCount} busy={busy === 'save'} disabled={!allValid} onDiscard={discard} onSave={saveAll} />
  </>;
};

/** A whole-number field with − and + buttons; the buttons are what a phone user reaches for. */
const Stepper: React.FC<{ value: string; onChange: (v: string) => void; max: number; step?: number; disabled?: boolean; label: string }> = ({ value, onChange, max, step = 1, disabled, label }) => {
  const v = Number(value);
  const bump = (d: number) => onChange(String(Math.max(0, Math.min(max, (Number.isFinite(v) ? v : 0) + d))));
  return <span className={`xr-step${disabled ? ' off' : ''}`}>
    <button type="button" tabIndex={-1} disabled={disabled || !(v > 0)} onClick={() => bump(-step)} aria-label={`Less ${label}`}>−</button>
    <input type="number" inputMode="numeric" min={0} max={max} step={step} value={value} disabled={disabled} aria-label={label}
      onChange={e => onChange(e.target.value)} />
    <button type="button" tabIndex={-1} disabled={disabled || v >= max} onClick={() => bump(step)} aria-label={`More ${label}`}>+</button>
  </span>;
};

export default AdminXpRewards;
