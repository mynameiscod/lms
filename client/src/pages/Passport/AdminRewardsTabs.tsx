import React, { useEffect, useMemo, useState } from 'react';
import passportApi, { AdminRedemption, AdminReward, RewardBudgetView } from '../../api/passportApi';
import { mediaPathFor } from '../../utils/mediaUrl';

/**
 * The rewards store, from the admin side: the catalogue, the redemption queue and the budget.
 *
 * Every rule that decides a redemption lives on the server (rewardEligibilityService and the
 * redemption saga). These screens only edit the catalogue and move redemptions through their states;
 * they never touch a balance, a stock counter or a budget figure by hand.
 */

const TYPE_LABEL: Record<AdminReward['type'], string> = {
  PHYSICAL: 'Physical item', DISCOUNT: 'Discount', ACCESS: 'Access', COUPON: 'Coupon', RECOGNITION: 'Recognition',
};
const ICONS = ['bi-gift-fill', 'bi-trophy-fill', 'bi-award-fill', 'bi-mortarboard-fill', 'bi-bag-fill', 'bi-cup-hot-fill', 'bi-ticket-perforated-fill', 'bi-headphones', 'bi-book-fill', 'bi-star-fill'];
const rupees = (paise: number) => `₹${(Math.round(paise) / 100).toLocaleString('en-IN', { maximumFractionDigits: 2 })}`;
const n = (v: number) => (v || 0).toLocaleString('en-IN');
const day = (d?: string | null) => (d ? new Date(d).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' }) : '');
const toKey = (name: string) => name.toUpperCase().replace(/[^A-Z0-9]+/g, '_').replace(/^_+|_+$/g, '').replace(/^(\d)/, 'R_$1').slice(0, 40) || 'REWARD';
const imgSrc = (url?: string) => (!url ? '' : /^(https?:|\/)/.test(url) ? url : mediaPathFor(url));

const Notice: React.FC<{ kind?: 'err' | 'ok' | 'warn'; children: React.ReactNode }> = ({ kind = 'err', children }) => (
  <div className={kind === 'ok' ? 'xr-ok' : kind === 'warn' ? 'xr-warn' : 'xr-err'} role={kind === 'ok' ? 'status' : undefined}>
    <i className={`bi ${kind === 'ok' ? 'bi-check-circle-fill' : kind === 'warn' ? 'bi-exclamation-triangle-fill' : 'bi-exclamation-circle'}`} /> <span>{children}</span>
  </div>
);

// ── Rewards ─────────────────────────────────────────────────────────────────

const BLANK: AdminReward = {
  key: '', name: '', description: '', type: 'PHYSICAL', iconKey: 'bi-gift-fill', imageUrl: '', instructions: '',
  coinCost: 500, budgetCostPaise: 0, active: false, studentVisible: true,
  stockMode: 'UNLIMITED', stockAvailable: 0, perStudentLimit: 1, totalRedemptionLimit: 0,
  minimumXp: 0, minimumLevel: 0, availableFrom: null, availableUntil: null, displayOrder: 100,
};

export const RewardsTab: React.FC<{ goTo: (tab: string) => void }> = ({ goTo }) => {
  const [rewards, setRewards] = useState<AdminReward[] | null>(null);
  const [allowance, setAllowance] = useState<number | null>(null);
  const [minRedemption, setMinRedemption] = useState(0);
  const [storeOn, setStoreOn] = useState<boolean | null>(null);
  const [editing, setEditing] = useState<{ reward: AdminReward; isNew: boolean } | null>(null);
  const [err, setErr] = useState('');
  const [msg, setMsg] = useState('');
  const [busy, setBusy] = useState('');

  const load = async () => {
    try {
      const [r, coins, budget] = await Promise.all([passportApi.adminRewards(), passportApi.getCoinAdmin(), passportApi.getRewardBudget()]);
      setRewards(r.rewards);
      setMinRedemption(r.policy?.minRedemption || 0);
      setAllowance(coins.config.annualRealCostBudgetInr);
      setStoreOn(!!budget.policy?.enabled);
      setErr('');
    } catch (e: any) {
      setErr(e?.response?.data?.message || 'Could not load the rewards.');
    }
  };
  useEffect(() => { load(); }, []);

  const flash = (m: string) => { setMsg(m); window.setTimeout(() => setMsg(''), 3200); };

  const toggleLive = async (r: AdminReward) => {
    setBusy(r.key);
    try {
      await passportApi.adminUpdateReward(r.key, { active: !r.active });
      setRewards(rs => rs && rs.map(x => (x.key === r.key ? { ...x, active: !r.active } : x)));
      flash(r.active ? `${r.name} is hidden from the store.` : `${r.name} is live in the store.`);
    } catch (e: any) {
      setErr(e?.response?.data?.message || 'Could not change that reward.');
    }
    setBusy('');
  };

  if (!rewards) return err ? <Notice>{err}</Notice> : <div className="xr-load">Loading…</div>;

  const live = rewards.filter(r => r.active).length;

  return <>
    {err && <Notice>{err}</Notice>}
    {msg && <Notice kind="ok">{msg}</Notice>}
    {storeOn === false && <Notice kind="warn">
      The store is closed: no member can redeem until the reward budget is switched on.{' '}
      <button type="button" className="xr-linkbtn" onClick={() => goTo('budget')}>Open Budget</button>
    </Notice>}

    <section className="xr-card">
      <div className="xr-card-hd">
        <div>
          <h2>Rewards in the store</h2>
          <p>{rewards.length ? `${rewards.length} reward${rewards.length === 1 ? '' : 's'}, ${live} live.` : 'No rewards yet.'} {minRedemption > 0 ? `Members need at least ${n(minRedemption)} coins before they can redeem anything.` : 'Members can redeem as soon as they have the coins.'}</p>
        </div>
        <button type="button" className="xr-btn primary" onClick={() => setEditing({ reward: { ...BLANK }, isNew: true })}><i className="bi bi-plus-lg" /> New reward</button>
      </div>

      {!rewards.length
        ? <div className="xr-empty">
          <i className="bi bi-gift" />
          <b>Add your first reward</b>
          <span>A T-shirt, a course discount, a mentor session — anything a member can buy with coins.</span>
          <button type="button" className="xr-btn primary" onClick={() => setEditing({ reward: { ...BLANK }, isNew: true })}><i className="bi bi-plus-lg" /> New reward</button>
        </div>
        : <div className="xr-rw-grid">
          {rewards.map(r => {
            const costInr = r.budgetCostPaise / 100;
            const overAllowance = allowance !== null && costInr > allowance;
            const left = r.stockMode === 'LIMITED' ? r.stockAvailable : null;
            return <article key={r.key} className={`xr-rw${r.active ? '' : ' off'}`}>
              <div className="xr-rw-art">
                {r.imageUrl ? <img src={imgSrc(r.imageUrl)} alt="" /> : <i className={`bi ${r.iconKey || 'bi-gift-fill'}`} />}
                <span className={`xr-st ${r.active ? 'live' : 'hidden'}`}>{r.active ? 'Live' : 'Hidden'}</span>
              </div>
              <div className="xr-rw-body">
                <b>{r.name}</b>
                <small>{TYPE_LABEL[r.type]}{r.studentVisible ? '' : ' · not listed'}</small>
                <div className="xr-rw-cost">
                  <span className="xr-coin"><i className="bi bi-coin" /> {n(r.coinCost)}</span>
                  <span className="xr-rw-inr" title="What one redemption costs the business">costs you {rupees(r.budgetCostPaise)}</span>
                </div>
                <ul className="xr-rw-meta">
                  <li>{left === null ? 'Unlimited stock' : left > 0 ? `${n(left)} left` : <em className="bad">Out of stock</em>}{r.stockReserved ? ` · ${n(r.stockReserved)} reserved` : ''}</li>
                  <li>{n(r.totalRedeemed || 0)} redeemed{r.perStudentLimit > 0 ? ` · ${r.perStudentLimit} per member` : ''}</li>
                  {(r.availableFrom || r.availableUntil) && <li>{r.availableFrom ? `From ${day(r.availableFrom)}` : ''}{r.availableFrom && r.availableUntil ? ' · ' : ''}{r.availableUntil ? `until ${day(r.availableUntil)}` : ''}</li>}
                </ul>
                {overAllowance && <p className="xr-rw-warn"><i className="bi bi-exclamation-triangle-fill" /><span>Costs more than the ₹{n(allowance!)} yearly limit per member, so nobody can redeem it. <a href="/admin/passport/coins">Change the limit</a></span></p>}
              </div>
              <div className="xr-rw-act">
                <button type="button" className="xr-btn sm" onClick={() => setEditing({ reward: { ...r }, isNew: false })}><i className="bi bi-pencil" /> Edit</button>
                <button type="button" className={`xr-btn sm${r.active ? '' : ' primary'}`} disabled={busy === r.key} onClick={() => toggleLive(r)}>
                  {r.active ? <><i className="bi bi-eye-slash" /> Hide</> : <><i className="bi bi-broadcast" /> Go live</>}
                </button>
              </div>
            </article>;
          })}
        </div>}
    </section>

    {editing && <RewardEditor initial={editing.reward} isNew={editing.isNew} allowance={allowance}
      onClose={() => setEditing(null)}
      onSaved={async (name, isNew) => { setEditing(null); await load(); flash(isNew ? `${name} added. It is hidden until you make it live.` : `${name} saved.`); }} />}
  </>;
};

const RewardEditor: React.FC<{
  initial: AdminReward; isNew: boolean; allowance: number | null;
  onClose: () => void; onSaved: (name: string, isNew: boolean) => void;
}> = ({ initial, isNew, allowance, onClose, onSaved }) => {
  const [r, setR] = useState<AdminReward>(initial);
  const [inr, setInr] = useState(String(initial.budgetCostPaise / 100));
  const [keyTouched, setKeyTouched] = useState(!isNew);
  const [err, setErr] = useState('');
  const [busy, setBusy] = useState(false);
  const [uploading, setUploading] = useState(false);
  const set = (p: Partial<AdminReward>) => setR(x => ({ ...x, ...p }));

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  const costInr = Number(inr);
  const problems = useMemo(() => {
    const p: string[] = [];
    if (!r.name.trim()) p.push('Give the reward a name.');
    if (isNew && !/^[A-Z][A-Z0-9]*(_[A-Z0-9]+)*$/.test(r.key)) p.push('The code must be capital letters, numbers and underscores, starting with a letter.');
    if (!(r.coinCost >= 1)) p.push('The coin price must be at least 1.');
    if (inr === '' || !Number.isFinite(costInr) || costInr < 0) p.push('Enter what one redemption costs you in rupees (0 is allowed).');
    if (r.stockMode === 'LIMITED' && !(r.stockAvailable >= 0)) p.push('Enter how many are in stock.');
    if (r.availableFrom && r.availableUntil && new Date(r.availableFrom) > new Date(r.availableUntil)) p.push('“Available until” is before “Available from”.');
    return p;
  }, [r, inr, costInr, isNew]);

  const upload = async (file: File) => {
    setUploading(true); setErr('');
    try {
      const { attachment } = await passportApi.uploadAttachment(file);
      set({ imageUrl: mediaPathFor(attachment.fileKey) });
    } catch (e: any) {
      setErr(e?.response?.data?.message || 'Could not upload that picture. You can paste an image link instead.');
    }
    setUploading(false);
  };

  const save = async () => {
    if (problems.length) { setErr(problems[0]); return; }
    setBusy(true); setErr('');
    const body: Partial<AdminReward> = {
      name: r.name.trim(), description: r.description.trim(), type: r.type, iconKey: r.iconKey,
      imageUrl: r.imageUrl || '', instructions: r.instructions || '',
      coinCost: Math.round(r.coinCost), budgetCostPaise: Math.round(costInr * 100),
      studentVisible: r.studentVisible, stockMode: r.stockMode, stockAvailable: Math.round(r.stockAvailable || 0),
      perStudentLimit: Math.round(r.perStudentLimit || 0), totalRedemptionLimit: Math.round(r.totalRedemptionLimit || 0),
      minimumLevel: Math.round(r.minimumLevel || 0), minimumXp: Math.round(r.minimumXp || 0),
      availableFrom: r.availableFrom || null, availableUntil: r.availableUntil || null,
      displayOrder: Math.round(r.displayOrder || 100),
    };
    try {
      if (isNew) await passportApi.adminCreateReward({ ...body, key: r.key });
      else await passportApi.adminUpdateReward(r.key, body);
      onSaved(body.name!, isNew);
    } catch (e: any) {
      setErr(e?.response?.data?.message || 'Could not save that reward.');
    }
    setBusy(false);
  };

  const num = (v: string) => (v === '' ? 0 : Math.max(0, Math.floor(Number(v) || 0)));
  const dateIn = (d?: string | null) => (d ? new Date(d).toISOString().slice(0, 10) : '');

  return <div className="xr-drawer-bg" onMouseDown={e => { if (e.target === e.currentTarget) onClose(); }}>
    <aside className="xr-drawer" role="dialog" aria-modal="true" aria-label={isNew ? 'New reward' : `Edit ${initial.name}`}>
      <header className="xr-drawer-hd">
        <div><span className="xr-eyebrow">{isNew ? 'New reward' : 'Edit reward'}</span><h2>{r.name || 'Untitled reward'}</h2></div>
        <button type="button" className="xr-icon-btn" onClick={onClose} aria-label="Close"><i className="bi bi-x-lg" /></button>
      </header>

      <div className="xr-drawer-body">
        <div className="xr-pic">
          <div className="xr-pic-prev">{r.imageUrl ? <img src={imgSrc(r.imageUrl)} alt="" /> : <i className={`bi ${r.iconKey}`} />}</div>
          <div className="xr-pic-ctl">
            <span className="xr-lbl">Picture</span>
            <div className="xr-pic-row">
              <label className="xr-btn sm"><i className={`bi ${uploading ? 'bi-arrow-repeat' : 'bi-upload'}`} /> {uploading ? 'Uploading…' : 'Upload picture'}
                <input type="file" accept="image/*" hidden disabled={uploading} onChange={e => { const f = e.target.files?.[0]; if (f) upload(f); e.target.value = ''; }} />
              </label>
              {r.imageUrl && <button type="button" className="xr-btn sm" onClick={() => set({ imageUrl: '' })}>Use an icon instead</button>}
            </div>
            {!r.imageUrl && <div className="xr-icons" role="radiogroup" aria-label="Icon">
              {ICONS.map(ic => <button key={ic} type="button" role="radio" aria-checked={r.iconKey === ic} className={r.iconKey === ic ? 'on' : ''} onClick={() => set({ iconKey: ic })}><i className={`bi ${ic}`} /></button>)}
            </div>}
          </div>
        </div>

        <label className="xr-f"><span className="xr-lbl">Name</span>
          <input value={r.name} maxLength={80} placeholder="CodeBegun T-shirt"
            onChange={e => set({ name: e.target.value, ...(keyTouched ? {} : { key: toKey(e.target.value) }) })} />
        </label>
        {isNew && <label className="xr-f"><span className="xr-lbl">Code <em>used in reports; cannot change later</em></span>
          <input value={r.key} maxLength={40} onChange={e => { setKeyTouched(true); set({ key: e.target.value.toUpperCase().replace(/[^A-Z0-9_]/g, '') }); }} />
        </label>}
        <label className="xr-f"><span className="xr-lbl">Description</span>
          <textarea rows={3} maxLength={500} value={r.description} placeholder="What the member gets." onChange={e => set({ description: e.target.value })} />
        </label>
        <label className="xr-f"><span className="xr-lbl">Type</span>
          <select value={r.type} onChange={e => set({ type: e.target.value as AdminReward['type'] })}>
            {Object.entries(TYPE_LABEL).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
          </select>
        </label>

        <div className="xr-f2">
          <label className="xr-f"><span className="xr-lbl">Price in coins</span>
            <span className="xr-type-in wide"><input type="number" min={1} value={r.coinCost} onChange={e => set({ coinCost: num(e.target.value) })} /><em>coins</em></span>
          </label>
          <label className="xr-f"><span className="xr-lbl">What it costs you <em>never shown to members</em></span>
            <span className="xr-type-in wide"><em className="pre">₹</em><input type="number" min={0} step="0.01" value={inr} onChange={e => setInr(e.target.value)} /></span>
          </label>
        </div>
        {allowance !== null && costInr > allowance && <p className="xr-rw-warn"><i className="bi bi-exclamation-triangle-fill" /><span>More than the ₹{n(allowance)} yearly limit per member, so nobody could redeem it. Raise “Reward budget ₹/member/yr” in <a href="/admin/passport/coins">CareerPilot Coins</a>.</span></p>}

        <fieldset className="xr-fs">
          <legend>Stock and limits</legend>
          <div className="xr-seg" role="radiogroup">
            <button type="button" className={r.stockMode === 'UNLIMITED' ? 'on' : ''} onClick={() => set({ stockMode: 'UNLIMITED' })}>Unlimited</button>
            <button type="button" className={r.stockMode === 'LIMITED' ? 'on' : ''} onClick={() => set({ stockMode: 'LIMITED' })}>Limited stock</button>
          </div>
          <div className="xr-f2">
            {r.stockMode === 'LIMITED' && <label className="xr-f"><span className="xr-lbl">In stock</span>
              <input type="number" min={0} value={r.stockAvailable} onChange={e => set({ stockAvailable: num(e.target.value) })} />
            </label>}
            <label className="xr-f"><span className="xr-lbl">Per member <em>0 = no limit</em></span>
              <input type="number" min={0} value={r.perStudentLimit} onChange={e => set({ perStudentLimit: num(e.target.value) })} />
            </label>
            <label className="xr-f"><span className="xr-lbl">In total <em>0 = no limit</em></span>
              <input type="number" min={0} value={r.totalRedemptionLimit} onChange={e => set({ totalRedemptionLimit: num(e.target.value) })} />
            </label>
            <label className="xr-f"><span className="xr-lbl">Minimum level <em>0 = any</em></span>
              <input type="number" min={0} value={r.minimumLevel} onChange={e => set({ minimumLevel: num(e.target.value) })} />
            </label>
          </div>
        </fieldset>

        <fieldset className="xr-fs">
          <legend>When it is available <em>leave empty for always</em></legend>
          <div className="xr-f2">
            <label className="xr-f"><span className="xr-lbl">From</span><input type="date" value={dateIn(r.availableFrom)} onChange={e => set({ availableFrom: e.target.value || null })} /></label>
            <label className="xr-f"><span className="xr-lbl">Until</span><input type="date" value={dateIn(r.availableUntil)} onChange={e => set({ availableUntil: e.target.value || null })} /></label>
          </div>
        </fieldset>

        <label className="xr-f"><span className="xr-lbl">Note shown when redeeming <em>optional</em></span>
          <textarea rows={2} value={r.instructions || ''} placeholder="We will email you within 5 working days to collect your size and address."
            onChange={e => set({ instructions: e.target.value })} />
        </label>
        <label className="xr-check"><input type="checkbox" checked={r.studentVisible} onChange={e => set({ studentVisible: e.target.checked })} /> List it in the store <em>(untick to keep it live but unlisted)</em></label>
        {isNew && <p className="xr-hint">A new reward starts hidden. Make it live from the list when you are ready.</p>}
        {err && <Notice>{err}</Notice>}
      </div>

      <footer className="xr-drawer-ft">
        <button type="button" className="xr-btn" onClick={onClose}>Cancel</button>
        <button type="button" className="xr-btn primary" disabled={busy || uploading} onClick={save}>{busy ? 'Saving…' : isNew ? 'Add reward' : 'Save'}</button>
      </footer>
    </aside>
  </div>;
};

// ── Redemptions ─────────────────────────────────────────────────────────────

const STATUS: { key: string; label: string }[] = [
  { key: 'RESERVED', label: 'To fulfil' },
  { key: 'FULFILLED', label: 'Fulfilled' },
  { key: 'CANCELLED', label: 'Cancelled' },
  { key: '', label: 'All' },
];
const STATUS_LABEL: Record<string, string> = { PENDING: 'Processing', RESERVED: 'To fulfil', FULFILLED: 'Fulfilled', CANCELLED: 'Cancelled' };

export const RedemptionsTab: React.FC<{ onCount?: (n: number) => void }> = ({ onCount }) => {
  const [status, setStatus] = useState('RESERVED');
  const [rows, setRows] = useState<AdminRedemption[] | null>(null);
  const [counts, setCounts] = useState<Record<string, number>>({});
  const [total, setTotal] = useState(0);
  const [stranded, setStranded] = useState<AdminRedemption[]>([]);
  const [act, setAct] = useState<{ row: AdminRedemption; kind: 'fulfil' | 'cancel' } | null>(null);
  const [text, setText] = useState('');
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState('');
  const [msg, setMsg] = useState('');

  const load = async (s = status) => {
    try {
      const [r, st] = await Promise.all([passportApi.adminRedemptions(s || undefined), passportApi.adminStrandedRedemptions().catch(() => ({ stranded: [] }))]);
      setRows(r.redemptions); setCounts(r.counts || {}); setTotal(r.total); setStranded(st.stranded || []);
      onCount?.(r.counts?.RESERVED || 0);
      setErr('');
    } catch (e: any) {
      setErr(e?.response?.data?.message || 'Could not load redemptions.');
    }
  };
  useEffect(() => { setRows(null); load(status); /* eslint-disable-next-line react-hooks/exhaustive-deps */ }, [status]);

  const flash = (m: string) => { setMsg(m); window.setTimeout(() => setMsg(''), 3600); };

  const submit = async () => {
    if (!act) return;
    setBusy(true); setErr('');
    try {
      if (act.kind === 'fulfil') {
        await passportApi.adminFulfilRedemption(act.row._id, text.trim() || undefined);
        flash(`Marked fulfilled: ${act.row.rewardName} for ${act.row.studentSnapshot?.displayName || 'the member'}.`);
      } else {
        await passportApi.adminCancelRedemption(act.row._id, text.trim() || undefined);
        flash(`Cancelled. ${n(act.row.coinCost)} coins went back to ${act.row.studentSnapshot?.displayName || 'the member'}.`);
      }
      setAct(null); setText('');
      await load();
    } catch (e: any) {
      setErr(e?.response?.data?.message || 'Could not update that redemption.');
    }
    setBusy(false);
  };

  const recover = async (row: AdminRedemption) => {
    setBusy(true);
    try {
      const r = await passportApi.adminRecoverRedemption(row._id);
      flash(r.ok ? 'Finished: the redemption is reserved and waiting to be fulfilled.' : 'Rolled back: the member got their coins back.');
      await load();
    } catch (e: any) {
      setErr(e?.response?.data?.message || 'Could not recover that redemption.');
    }
    setBusy(false);
  };

  return <>
    {err && <Notice>{err}</Notice>}
    {msg && <Notice kind="ok">{msg}</Notice>}
    {!!stranded.length && <Notice kind="warn">
      {stranded.length} redemption{stranded.length === 1 ? '' : 's'} stopped part-way (for example, the server restarted).{' '}
      {stranded.slice(0, 3).map(s => <button key={s._id} type="button" className="xr-linkbtn" disabled={busy} onClick={() => recover(s)}>Finish {s.rewardName}</button>)}
    </Notice>}

    <section className="xr-card">
      <div className="xr-card-hd">
        <div>
          <h2>Redemptions</h2>
          <p>A member's coins are taken when they redeem. Mark it fulfilled once they have the reward; cancelling gives the coins back.</p>
        </div>
      </div>
      <div className="xr-seg wide" role="tablist">
        {STATUS.map(s => <button key={s.key || 'all'} type="button" role="tab" aria-selected={status === s.key} className={status === s.key ? 'on' : ''} onClick={() => setStatus(s.key)}>
          {s.label}{s.key && counts[s.key] ? <span className="xr-n">{n(counts[s.key])}</span> : null}
        </button>)}
      </div>

      {!rows ? <div className="xr-load">Loading…</div> : !rows.length
        ? <div className="xr-blank"><i className="bi bi-inbox" /> {status === 'RESERVED' ? 'Nothing waiting. New redemptions appear here.' : 'No redemptions here yet.'}</div>
        : <ul className="xr-rd">
          {rows.map(row => (
            <li key={row._id}>
              <span className="xr-rd-who">
                <b>{row.studentSnapshot?.displayName || 'Member'}</b>
                <small>{row.studentSnapshot?.collegeName || '—'}</small>
              </span>
              <span className="xr-rd-what">
                <b>{row.rewardName}</b>
                <small>{n(row.coinCost)} coins · {rupees(row.budgetCostPaise)} · {day(row.requestedAt)}</small>
                {row.status === 'FULFILLED' && row.fulfillmentReference && <small>Ref: {row.fulfillmentReference}</small>}
                {row.status === 'CANCELLED' && row.cancelReason && <small>Reason: {row.cancelReason}</small>}
              </span>
              <span className={`xr-st s-${row.status.toLowerCase()}`}>{STATUS_LABEL[row.status] || row.status}</span>
              <span className="xr-rd-act">
                {row.status === 'RESERVED' && <>
                  <button type="button" className="xr-btn sm primary" onClick={() => { setAct({ row, kind: 'fulfil' }); setText(''); }}><i className="bi bi-check2" /> Fulfilled</button>
                  <button type="button" className="xr-btn sm danger" onClick={() => { setAct({ row, kind: 'cancel' }); setText(''); }}>Cancel</button>
                </>}
              </span>
            </li>
          ))}
        </ul>}
      {rows && total > rows.length && <p className="xr-foot">Showing the latest {rows.length} of {n(total)}.</p>}
    </section>

    {act && <div className="xr-drawer-bg center" onMouseDown={e => { if (e.target === e.currentTarget && !busy) setAct(null); }}>
      <div className="xr-modal" role="dialog" aria-modal="true">
        <h3>{act.kind === 'fulfil' ? 'Mark as fulfilled?' : 'Cancel and refund?'}</h3>
        <p>{act.row.rewardName} for <b>{act.row.studentSnapshot?.displayName || 'this member'}</b>.{' '}
          {act.kind === 'fulfil' ? 'This cannot be undone.' : `${n(act.row.coinCost)} coins go back to their wallet.`}</p>
        <label className="xr-f"><span className="xr-lbl">{act.kind === 'fulfil' ? 'Reference (optional)' : 'Reason (optional)'}</span>
          <input autoFocus value={text} maxLength={200} placeholder={act.kind === 'fulfil' ? 'Courier tracking number, coupon code…' : 'Out of stock'} onChange={e => setText(e.target.value)} />
        </label>
        <div className="xr-modal-ft">
          <button type="button" className="xr-btn" disabled={busy} onClick={() => setAct(null)}>Back</button>
          <button type="button" className={`xr-btn ${act.kind === 'fulfil' ? 'primary' : 'danger'}`} disabled={busy} onClick={submit}>
            {busy ? 'Saving…' : act.kind === 'fulfil' ? 'Mark fulfilled' : 'Cancel and refund'}
          </button>
        </div>
      </div>
    </div>}
  </>;
};

// ── Budget ──────────────────────────────────────────────────────────────────

export const BudgetTab: React.FC = () => {
  const [view, setView] = useState<RewardBudgetView | null>(null);
  const [enabled, setEnabled] = useState(false);
  const [mode, setMode] = useState<'MANUAL' | 'PERCENTAGE'>('MANUAL');
  const [manual, setManual] = useState('0');
  const [pct, setPct] = useState('0');
  const [cap, setCap] = useState('0');
  const [from, setFrom] = useState('');
  const [err, setErr] = useState('');
  const [msg, setMsg] = useState('');
  const [busy, setBusy] = useState(false);

  const apply = (v: RewardBudgetView) => {
    setView(v);
    setEnabled(!!v.policy?.enabled);
    setMode(v.policy?.mode || 'MANUAL');
    setManual(String((v.policy?.manualBudgetPaise || 0) / 100));
    setPct(String((v.policy?.basisPoints || 0) / 100));
    setCap(String((v.policy?.capPaise || 0) / 100));
    setFrom(v.policy?.effectiveFrom ? new Date(v.policy.effectiveFrom).toISOString().slice(0, 10) : '');
  };
  useEffect(() => {
    passportApi.getRewardBudget().then(apply).catch(e => setErr(e?.response?.data?.message || 'Could not load the budget.'));
  }, []);

  const bad = [manual, pct, cap].some(v => v === '' || !(Number(v) >= 0)) || Number(pct) > 100;
  const save = async () => {
    if (bad) { setErr('Enter amounts of 0 or more, and a percentage up to 100.'); return; }
    setBusy(true); setErr('');
    try {
      const v = await passportApi.updateRewardBudget({
        enabled, mode,
        manualBudgetPaise: Math.round(Number(manual) * 100),
        basisPoints: Math.round(Number(pct) * 100),
        capPaise: Math.round(Number(cap) * 100),
        // Switching on without a start date counts from today, never from the start of history.
        effectiveFrom: from || (enabled ? new Date().toISOString().slice(0, 10) : null),
      });
      apply(v);
      setMsg(enabled ? 'Saved. The store is open.' : 'Saved. The store is closed.');
      window.setTimeout(() => setMsg(''), 3200);
    } catch (e: any) {
      setErr(e?.response?.data?.message || 'Could not save the budget.');
    }
    setBusy(false);
  };

  if (!view) return err ? <Notice>{err}</Notice> : <div className="xr-load">Loading…</div>;
  const s = view.summary;
  const used = s.display.effectiveBudget > 0 ? Math.min(100, Math.round(((s.display.reserved + s.display.redeemed) / s.display.effectiveBudget) * 100)) : 0;
  const month = (() => { const [y, m] = s.period.split('-').map(Number); return new Date(y, m - 1, 1).toLocaleDateString('en-IN', { month: 'long', year: 'numeric' }); })();

  return <>
    {err && <Notice>{err}</Notice>}
    {msg && <Notice kind="ok">{msg}</Notice>}

    <section className="xr-card">
      <div className="xr-card-hd">
        <div>
          <h2>This month: {month}</h2>
          <p>Every redemption takes its cost to you from this budget. When it runs out, the store waits for next month.</p>
        </div>
        <span className={`xr-st big ${s.enabled ? 'live' : 'hidden'}`}>{s.enabled ? 'Store open' : 'Store closed'}</span>
      </div>
      <div className="xr-kpis">
        <div><small>Budget</small><b>₹{n(s.display.effectiveBudget)}</b></div>
        <div><small>Waiting to fulfil</small><b>₹{n(s.display.reserved)}</b></div>
        <div><small>Fulfilled</small><b>₹{n(s.display.redeemed)}</b></div>
        <div><small>Left</small><b className="good">₹{n(s.display.available)}</b></div>
        <div><small>Members rewarded</small><b>{n(s.studentsRewarded)}</b></div>
      </div>
      <div className="xr-meter" aria-label={`${used}% used`}><span style={{ width: `${used}%` }} /></div>
      {s.mode === 'PERCENTAGE' && <p className="xr-foot">{s.basisPoints / 100}% of ₹{n(s.display.revenueBase)} membership revenue this month{s.display.cap ? `, capped at ₹${n(s.display.cap)}` : ''}.</p>}
    </section>

    <section className="xr-card">
      <div className="xr-card-hd">
        <div>
          <h2>Budget settings</h2>
          <p>How much you are willing to spend on rewards each month.</p>
        </div>
        <label className="xr-switch">
          <input type="checkbox" checked={enabled} onChange={e => setEnabled(e.target.checked)} />
          <span>{enabled ? 'Store open' : 'Store closed'}</span>
        </label>
      </div>

      <div className="xr-seg" role="radiogroup">
        <button type="button" className={mode === 'MANUAL' ? 'on' : ''} onClick={() => setMode('MANUAL')}>A fixed amount</button>
        <button type="button" className={mode === 'PERCENTAGE' ? 'on' : ''} onClick={() => setMode('PERCENTAGE')}>A share of revenue</button>
      </div>

      <div className="xr-f2 wide">
        {mode === 'MANUAL'
          ? <label className="xr-f"><span className="xr-lbl">Each month</span>
            <span className="xr-type-in wide"><em className="pre">₹</em><input type="number" min={0} value={manual} onChange={e => setManual(e.target.value)} /></span>
          </label>
          : <label className="xr-f"><span className="xr-lbl">Share of paid membership revenue</span>
            <span className="xr-type-in wide"><input type="number" min={0} max={100} step="0.1" value={pct} onChange={e => setPct(e.target.value)} /><em>%</em></span>
          </label>}
        <label className="xr-f"><span className="xr-lbl">Never more than <em>0 = no ceiling</em></span>
          <span className="xr-type-in wide"><em className="pre">₹</em><input type="number" min={0} value={cap} onChange={e => setCap(e.target.value)} /></span>
        </label>
        <label className="xr-f"><span className="xr-lbl">Counting from <em>revenue before this date does not count</em></span>
          <input type="date" value={from} onChange={e => setFrom(e.target.value)} />
        </label>
      </div>

      <div className="xr-actions">
        <button type="button" className="xr-btn primary" disabled={busy || bad} onClick={save}>{busy ? 'Saving…' : 'Save'}</button>
      </div>
    </section>
  </>;
};
