import React, { useEffect, useMemo, useState } from 'react';
import passportApi, { AdminBadgeRow, BadgeCondition, BadgeInput, LevelLadder } from '../../api/passportApi';
import { SaveBar, Skeleton, useLeaveWarning } from './AdminRewardsTabs';
import './adminBadges.css';

/**
 * XP & Rewards → Badges and Levels.
 *
 * BADGES: each is a rule over something the product already counts — "finish 5 mock interviews",
 * "hit a 7-day streak". A member who meets the rule is awarded it, including members who already
 * met it before the badge existed. A badge once earned is kept, whatever the admin changes later.
 *
 * LEVELS: members climb levels by XP; the admin names each level. The XP a level needs is fixed,
 * because rewards can be gated on level.
 */

const ICONS = [
  'bi-award-fill', 'bi-trophy-fill', 'bi-star-fill', 'bi-stars', 'bi-gem', 'bi-patch-check-fill',
  'bi-lightning-charge-fill', 'bi-fire', 'bi-rocket-takeoff-fill', 'bi-bullseye', 'bi-flag-fill', 'bi-shield-check',
  'bi-mic-fill', 'bi-chat-quote-fill', 'bi-people-fill', 'bi-hand-thumbs-up-fill', 'bi-heart-fill', 'bi-emoji-sunglasses-fill',
  'bi-code-slash', 'bi-terminal-fill', 'bi-diagram-3-fill', 'bi-magic', 'bi-puzzle-fill', 'bi-lightbulb-fill',
  'bi-calendar2-check-fill', 'bi-check2-circle', 'bi-clipboard-check-fill', 'bi-file-earmark-check-fill', 'bi-briefcase-fill', 'bi-mortarboard-fill',
  'bi-graph-up-arrow', 'bi-signpost-2-fill',
];
const COLORS = ['#f59e0b', '#ef4444', '#ec4899', '#8b5cf6', '#2563eb', '#0891b2', '#0f766e', '#16a34a', '#64748b', '#051d64'];
const CONDITION_ICON: Record<string, string> = {
  PROBLEMS_SOLVED: 'bi-code-slash', MOCK_INTERVIEWS: 'bi-mic', DAYS_COMPLETED: 'bi-calendar2-check', STREAK: 'bi-fire',
  XP_TOTAL: 'bi-lightning-charge', RESUME_SCORE: 'bi-file-earmark-text', ROADMAP_PERCENT: 'bi-signpost-2', EVENT_COUNT: 'bi-hash',
};
const n = (v: number) => (v || 0).toLocaleString('en-IN');

/** The rule in words, as the server writes it — so the preview says exactly what members will read. */
function ruleSentence(type: string, threshold: number, eventName?: string): string {
  const t = n(threshold);
  const pl = (one: string, many: string) => (threshold === 1 ? one : many);
  switch (type) {
    case 'PROBLEMS_SOLVED': return `Solve ${t} practice ${pl('problem', 'problems')}`;
    case 'MOCK_INTERVIEWS': return `Finish ${t} mock ${pl('interview', 'interviews')}`;
    case 'DAYS_COMPLETED': return `Complete ${t} journey ${pl('day', 'days')}`;
    case 'STREAK': return `Hit a ${t}-day streak`;
    case 'XP_TOTAL': return `Earn ${t} XP`;
    case 'RESUME_SCORE': return `Score ${t}+ on your resume`;
    case 'ROADMAP_PERCENT': return `Complete ${t}% of your roadmap`;
    case 'EVENT_COUNT': return `${eventName || 'Do it'} ${t} ${pl('time', 'times')}`;
    default: return '';
  }
}

/** The hexagon members see, earned (in its colour) or locked. */
export const BadgeHex: React.FC<{ icon: string; color: string; earned: boolean; size?: 'sm' | 'lg' }> = ({ icon, color, earned, size }) => (
  <span className={`xb-hex${earned ? ' on' : ''}${size ? ` ${size}` : ''}`} style={{ ['--bc' as any]: color }} aria-hidden>
    <i className={`bi ${earned ? icon : 'bi-lock-fill'}`} />
  </span>
);

// ── Badges ──────────────────────────────────────────────────────────────────

export const BadgesTab: React.FC = () => {
  const [badges, setBadges] = useState<AdminBadgeRow[] | null>(null);
  const [conditions, setConditions] = useState<BadgeCondition[]>([]);
  const [events, setEvents] = useState<{ key: string; name: string }[]>([]);
  const [editing, setEditing] = useState<AdminBadgeRow | 'new' | null>(null);
  const [err, setErr] = useState('');
  const [msg, setMsg] = useState('');
  const [busy, setBusy] = useState('');

  useEffect(() => {
    passportApi.getAdminGamification()
      .then(d => { setBadges(d.badges); setConditions(d.badgeConditions || []); setEvents(d.events); })
      .catch(e => setErr(e?.response?.data?.message || 'Could not load the badges.'));
  }, []);

  const flash = (m: string) => { setMsg(m); window.setTimeout(() => setMsg(''), 3600); };

  const toggle = async (b: AdminBadgeRow) => {
    setBusy(`t:${b.key}`); setErr('');
    try {
      const r = await passportApi.updateBadgeDefinition(b.key, { active: !b.active });
      setBadges(r.badges);
      flash(b.active ? `“${b.name}” is switched off. Members no longer see it.` : `“${b.name}” is on. Members see it now.`);
    } catch (e: any) { setErr(e?.response?.data?.message || 'Could not change that badge.'); }
    setBusy('');
  };

  const move = async (i: number, d: -1 | 1) => {
    if (!badges) return;
    const next = [...badges];
    const j = i + d;
    if (j < 0 || j >= next.length) return;
    [next[i], next[j]] = [next[j], next[i]];
    setBadges(next);
    setBusy('order');
    try { setBadges((await passportApi.reorderBadgeDefinitions(next.map(b => b.key))).badges); }
    catch (e: any) { setErr(e?.response?.data?.message || 'Could not save the order.'); }
    setBusy('');
  };

  if (!badges) return err ? <div className="xr-err"><i className="bi bi-exclamation-circle" /> {err}</div> : <Skeleton />;

  const live = badges.filter(b => b.active);
  const awards = badges.reduce((s, b) => s + b.earnedBy, 0);

  return <>
    {err && <div className="xr-err"><i className="bi bi-exclamation-circle" /> {err}</div>}
    {msg && <div className="xr-ok" role="status"><i className="bi bi-check-circle-fill" /> {msg}</div>}

    <section className="xr-card">
      <div className="xr-card-hd">
        <div>
          <h2>Achievement badges <span className="xr-n">{badges.length}</span></h2>
          <p>Each badge has a rule. A member gets it the moment they meet the rule, including members who already meet it when you add it. Members see live badges on their Dashboard and Achievements page, in this order.</p>
        </div>
        <button type="button" className="xr-btn primary" onClick={() => setEditing('new')}><i className="bi bi-plus-lg" /> New badge</button>
      </div>

      <div className="xb-sum">
        <span><b>{n(live.length)}</b> live</span>
        <span><b>{n(badges.length - live.length)}</b> switched off</span>
        <span><b>{n(awards)}</b> {awards === 1 ? 'award' : 'awards'} given</span>
      </div>

      {!badges.length
        ? <div className="xr-blank"><i className="bi bi-award" /> No badges yet. Add the first one.</div>
        : <ol className="xb-list">
          {badges.map((b, i) => (
            <li key={b.key} className={b.active ? '' : 'off'}>
              <BadgeHex icon={b.iconKey} color={b.color} earned />
              <span className="xb-tx">
                <b>{b.name}</b>
                <span className="xb-rule"><i className={`bi ${CONDITION_ICON[b.conditionType] || 'bi-check2'}`} /> {b.rule}</span>
                {b.description && b.description !== b.rule && <small>Members read: “{b.description}”</small>}
              </span>
              <span className="xb-held" title="Members who have earned it">
                <i className="bi bi-people-fill" /> {n(b.earnedBy)} <em>earned</em>
              </span>
              <label className="xr-switch sm" title={b.active ? 'Switch off to hide it from members' : 'Switch on to show it to members'}>
                <input type="checkbox" checked={b.active} disabled={busy === `t:${b.key}`} onChange={() => toggle(b)} />
                <span>{b.active ? 'Live' : 'Off'}</span>
              </label>
              <span className="xb-order">
                <button type="button" disabled={i === 0 || busy === 'order'} onClick={() => move(i, -1)} aria-label={`Move ${b.name} up`}><i className="bi bi-chevron-up" /></button>
                <button type="button" disabled={i === badges.length - 1 || busy === 'order'} onClick={() => move(i, 1)} aria-label={`Move ${b.name} down`}><i className="bi bi-chevron-down" /></button>
              </span>
              <button type="button" className="xr-btn sm" onClick={() => setEditing(b)}><i className="bi bi-pencil" /> Edit</button>
            </li>
          ))}
        </ol>}
      <p className="xr-foot">A member keeps a badge once earned, even if you change its rule or switch it off later.</p>
    </section>

    {editing && <BadgeEditor
      initial={editing === 'new' ? null : editing}
      conditions={conditions}
      events={events}
      onClose={() => setEditing(null)}
      onSaved={(list, text) => { setBadges(list); setEditing(null); flash(text); }}
    />}
  </>;
};

const BadgeEditor: React.FC<{
  initial: AdminBadgeRow | null;
  conditions: BadgeCondition[];
  events: { key: string; name: string }[];
  onClose: () => void;
  onSaved: (badges: AdminBadgeRow[], msg: string) => void;
}> = ({ initial, conditions, events, onClose, onSaved }) => {
  const isNew = !initial;
  const [b, setB] = useState<BadgeInput>(() => initial
    ? { name: initial.name, description: initial.description, iconKey: initial.iconKey, color: initial.color, conditionType: initial.conditionType, threshold: initial.threshold, eventKey: initial.eventKey }
    : { name: '', description: '', iconKey: 'bi-award-fill', color: COLORS[0], conditionType: conditions[0]?.type || 'PROBLEMS_SOLVED', threshold: 5, eventKey: null });
  const [target, setTarget] = useState(String(b.threshold));
  const [err, setErr] = useState('');
  const [busy, setBusy] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const set = (p: Partial<BadgeInput>) => setB(x => ({ ...x, ...p }));

  useEffect(() => {
    const h = (e: KeyboardEvent) => { if (e.key === 'Escape' && !busy) onClose(); };
    window.addEventListener('keydown', h);
    return () => window.removeEventListener('keydown', h);
  }, [busy, onClose]);

  const cond = conditions.find(c => c.type === b.conditionType);
  const max = cond?.max ?? 1_000_000;
  const t = Number(target);
  const targetOk = target !== '' && Number.isInteger(t) && t >= 1 && t <= max;
  const eventName = events.find(e => e.key === b.eventKey)?.name;
  const rule = targetOk ? ruleSentence(b.conditionType, t, eventName) : '';
  const icons = ICONS.includes(b.iconKey) ? ICONS : [b.iconKey, ...ICONS];

  const problem = !b.name.trim() ? 'Give the badge a name.'
    : !targetOk ? `The target must be a whole number from 1 to ${n(max)}.`
    : cond?.needsEvent && !b.eventKey ? 'Choose which activity is counted.' : '';

  const save = async () => {
    if (problem) { setErr(problem); return; }
    setBusy(true); setErr('');
    const body: BadgeInput = {
      name: b.name.trim(), description: b.description.trim(), iconKey: b.iconKey, color: b.color,
      conditionType: b.conditionType, threshold: t, eventKey: cond?.needsEvent ? b.eventKey : null,
    };
    try {
      const r = isNew ? await passportApi.createBadgeDefinition(body) : await passportApi.updateBadgeDefinition(initial!.key, body);
      onSaved(r.badges, isNew ? `“${body.name}” added. Members who already qualify get it the next time they open their dashboard.` : `“${body.name}” saved.`);
    } catch (e: any) { setErr(e?.response?.data?.message || 'Could not save that badge.'); }
    setBusy(false);
  };

  const remove = async () => {
    setBusy(true); setErr('');
    try {
      const r = await passportApi.deleteBadgeDefinition(initial!.key);
      onSaved(r.badges, `“${initial!.name}” deleted.`);
    } catch (e: any) { setErr(e?.response?.data?.message || 'Could not delete that badge.'); setConfirmDelete(false); }
    setBusy(false);
  };

  return <div className="xr-drawer-bg" onMouseDown={e => { if (e.target === e.currentTarget && !busy) onClose(); }}>
    <aside className="xr-drawer" role="dialog" aria-modal="true" aria-label={isNew ? 'New badge' : `Edit ${initial!.name}`}>
      <header className="xr-drawer-hd">
        <div><span className="xr-eyebrow">{isNew ? 'New badge' : 'Edit badge'}</span><h2>{b.name.trim() || 'Untitled badge'}</h2></div>
        <button type="button" className="xr-icon-btn" onClick={onClose} aria-label="Close"><i className="bi bi-x-lg" /></button>
      </header>

      <div className="xr-drawer-body">
        <div className="xb-prev" aria-label="What members see">
          <div className="xb-prev-tiles">
            <div className="xb-tile on"><BadgeHex icon={b.iconKey} color={b.color} earned /><b>{b.name.trim() || 'Badge name'}</b><small>Earned</small></div>
            <div className="xb-tile"><BadgeHex icon={b.iconKey} color={b.color} earned={false} /><b>{b.name.trim() || 'Badge name'}</b><small>Not yet</small></div>
          </div>
          <p><i className="bi bi-eye" /> Members read: <b>{b.description.trim() || rule || '—'}</b></p>
        </div>

        <label className="xr-f"><span className="xr-lbl">Name</span>
          <input value={b.name} maxLength={60} autoFocus={isNew} placeholder="Interview Pro" onChange={e => set({ name: e.target.value })} />
        </label>

        <fieldset className="xr-fs">
          <legend>Rule: a member earns it when…</legend>
          <div className="xb-conds" role="radiogroup" aria-label="What the member has to do">
            {conditions.map(c => (
              <button key={c.type} type="button" role="radio" aria-checked={b.conditionType === c.type}
                className={b.conditionType === c.type ? 'on' : ''}
                onClick={() => { set({ conditionType: c.type }); if (c.max && Number(target) > c.max) setTarget(String(c.max)); }}>
                <i className={`bi ${CONDITION_ICON[c.type] || 'bi-check2'}`} /> {c.label}
              </button>
            ))}
          </div>
          {cond?.needsEvent && <label className="xr-f"><span className="xr-lbl">Which activity</span>
            <select value={b.eventKey || ''} onChange={e => set({ eventKey: e.target.value || null })}>
              <option value="">Choose…</option>
              {events.map(e => <option key={e.key} value={e.key}>{e.name}</option>)}
            </select>
          </label>}
          <label className="xr-f"><span className="xr-lbl">Target</span>
            <span className={`xr-type-in wide${targetOk ? '' : ' bad'}`}>
              <input type="number" min={1} max={max} step={1} inputMode="numeric" value={target} onChange={e => setTarget(e.target.value)} aria-label="Target" />
              <em>{cond?.unit || ''}</em>
            </span>
          </label>
          {rule && <p className="xb-rule-out"><i className="bi bi-check2-circle" /> {rule}</p>}
          {!isNew && initial!.earnedBy > 0 && <p className="xr-hint">{n(initial!.earnedBy)} member{initial!.earnedBy === 1 ? ' has' : 's have'} earned it already and keep it if you change the rule.</p>}
        </fieldset>

        <label className="xr-f"><span className="xr-lbl">Description <em>optional · leave empty to show the rule</em></span>
          <textarea rows={2} maxLength={300} value={b.description} placeholder={rule || 'What the member did to earn it.'} onChange={e => set({ description: e.target.value })} />
        </label>

        <div className="xr-f"><span className="xr-lbl">Icon</span>
          <div className="xb-icons" role="radiogroup" aria-label="Icon">
            {icons.map(ic => <button key={ic} type="button" role="radio" aria-checked={b.iconKey === ic} aria-label={ic.replace(/^bi-|-fill$/g, '').replace(/-/g, ' ')}
              className={b.iconKey === ic ? 'on' : ''} style={{ ['--bc' as any]: b.color }} onClick={() => set({ iconKey: ic })}><i className={`bi ${ic}`} /></button>)}
          </div>
        </div>
        <div className="xr-f"><span className="xr-lbl">Colour</span>
          <div className="xb-colors" role="radiogroup" aria-label="Colour">
            {COLORS.map(c => <button key={c} type="button" role="radio" aria-checked={b.color === c} aria-label={c}
              className={b.color === c ? 'on' : ''} style={{ background: c }} onClick={() => set({ color: c })}>{b.color === c && <i className="bi bi-check-lg" />}</button>)}
          </div>
        </div>

        {err && <div className="xr-err"><i className="bi bi-exclamation-circle" /> <span>{err}</span></div>}
      </div>

      <footer className="xr-drawer-ft xb-ft">
        {!isNew && (initial!.earnedBy > 0
          ? <span className="xb-ft-note" title="Switch it off in the list to hide it instead">Earned by {n(initial!.earnedBy)}, so it can't be deleted</span>
          : <button type="button" className="xr-btn danger" disabled={busy} onClick={() => setConfirmDelete(true)}><i className="bi bi-trash3" /> Delete</button>)}
        <span className="xb-ft-gap" />
        <button type="button" className="xr-btn" disabled={busy} onClick={onClose}>Cancel</button>
        <button type="button" className="xr-btn primary" disabled={busy} onClick={save}>{busy ? 'Saving…' : isNew ? 'Add badge' : 'Save'}</button>
      </footer>
    </aside>

    {confirmDelete && <div className="xr-drawer-bg center" onMouseDown={e => { if (e.target === e.currentTarget && !busy) setConfirmDelete(false); }}>
      <div className="xr-modal" role="dialog" aria-modal="true">
        <h3>Delete “{initial!.name}”?</h3>
        <p>Nobody has earned it yet, so no member loses anything. This cannot be undone.</p>
        <div className="xr-modal-ft">
          <button type="button" className="xr-btn" disabled={busy} onClick={() => setConfirmDelete(false)}>Back</button>
          <button type="button" className="xr-btn danger" disabled={busy} onClick={remove}>{busy ? 'Deleting…' : 'Delete badge'}</button>
        </div>
      </div>
    </div>}
  </div>;
};

// ── Levels ──────────────────────────────────────────────────────────────────

export const LevelsTab: React.FC = () => {
  const [ladder, setLadder] = useState<LevelLadder | null>(null);
  const [names, setNames] = useState<string[]>([]);
  const [focus, setFocus] = useState(0);
  const [err, setErr] = useState('');
  const [msg, setMsg] = useState('');
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    passportApi.getAdminGamification()
      .then(d => { setLadder(d.levels); setNames(d.levels.names); })
      .catch(e => setErr(e?.response?.data?.message || 'Could not load the levels.'));
  }, []);

  const dirty = !!ladder && JSON.stringify(names) !== JSON.stringify(ladder.names);
  const blank = names.findIndex(x => !x.trim());
  const changedCount = useMemo(() => {
    if (!ladder) return 0;
    const len = Math.max(names.length, ladder.names.length);
    let c = 0;
    for (let i = 0; i < len; i++) if ((names[i] || '') !== (ladder.names[i] || '')) c++;
    return c;
  }, [names, ladder]);
  useLeaveWarning(dirty);

  if (!ladder) return err ? <div className="xr-err"><i className="bi bi-exclamation-circle" /> {err}</div> : <Skeleton />;

  const isDefault = JSON.stringify(names) === JSON.stringify(ladder.defaults);

  const save = async () => {
    if (blank >= 0) { setErr(`Level ${blank + 1} needs a name.`); return; }
    setBusy(true); setErr('');
    try {
      const r = await passportApi.saveLevelNames(names.map(x => x.trim()));
      setLadder(r.levels); setNames(r.levels.names);
      setMsg('Saved. Members see the new level names the next time they open a page.');
      window.setTimeout(() => setMsg(''), 3600);
    } catch (e: any) { setErr(e?.response?.data?.message || 'Could not save the level names.'); }
    setBusy(false);
  };

  const setName = (i: number, v: string) => setNames(xs => xs.map((x, j) => (j === i ? v : x)));
  const xpAt = (level: number) => ladder.xpToReach[level - 1] ?? 0;
  const lvl = Math.min(focus, names.length - 1) + 1;
  const nameOf = (level: number) => names[Math.min(level, names.length) - 1] || '';
  const span = xpAt(lvl + 1) - xpAt(lvl);

  return <>
    {err && <div className="xr-err"><i className="bi bi-exclamation-circle" /> {err}</div>}
    {msg && <div className="xr-ok" role="status"><i className="bi bi-check-circle-fill" /> {msg}</div>}

    <div className="xr-split xb-lv-split">
      <section className="xr-card">
        <div className="xr-card-hd">
          <div>
            <h2>Level names</h2>
            <p>Members move up a level as they earn XP. Give each level a name. It shows under the level number on their Dashboard and profile.</p>
          </div>
          {!isDefault && <button type="button" className="xr-btn sm" onClick={() => { setNames(ladder.defaults); setFocus(0); }}><i className="bi bi-arrow-counterclockwise" /> Use the original names</button>}
        </div>

        <div className="xb-lv-hd" aria-hidden><span>Level</span><span>Reached at</span><span>Name</span></div>
        <ol className="xb-levels">
          {names.map((name, i) => {
            const unsaved = name !== (ladder.names[i] ?? null);
            return <li key={i} className={`${focus === i ? 'on' : ''}${unsaved ? ' unsaved' : ''}${name.trim() ? '' : ' bad'}`}>
              <span className="xb-lv-n">{i + 1}</span>
              <span className="xb-lv-xp">{i === 0 ? 'Start' : `${n(xpAt(i + 1))} XP`}</span>
              <input value={name} maxLength={ladder.nameMax} aria-label={`Name of level ${i + 1}`} placeholder="Name this level"
                onFocus={() => setFocus(i)} onChange={e => setName(i, e.target.value)} />
              {i === names.length - 1 && names.length > 1
                ? <button type="button" className="xb-lv-x" onClick={() => { setNames(xs => xs.slice(0, -1)); setFocus(f => Math.min(f, names.length - 2)); }} aria-label={`Remove level ${i + 1}`} title="Remove this level's name"><i className="bi bi-x-lg" /></button>
                : <span className="xb-lv-x-gap" />}
            </li>;
          })}
        </ol>
        <div className="xb-lv-foot">
          {names.length < ladder.max && <button type="button" className="xr-btn sm" onClick={() => { setNames(xs => [...xs, xs[xs.length - 1] || '']); setFocus(names.length); }}><i className="bi bi-plus-lg" /> Name level {names.length + 1}</button>}
          <p className="xr-foot">Level {names.length + 1} and above keep the name “{names[names.length - 1] || '—'}”. The XP each level needs is fixed.</p>
        </div>
      </section>

      <aside className="xr-card xr-preview" aria-label="What members see">
        <span className="xr-preview-lbl"><i className="bi bi-phone" /> What members see at level {lvl}</span>
        <div className="xb-lvcard">
          <div className="xb-lvcard-top">
            <span className="medal"><i className="bi bi-award-fill" /></span>
            <div className="tx"><b>Level {lvl}</b><span>{nameOf(lvl) || 'Name this level'}</span></div>
            <span className="xp"><b>{n(Math.round(span * 0.4))}</b> / {n(span)} XP</span>
          </div>
          <div className="xb-lvcard-bar"><i style={{ width: '40%' }} /></div>
          <small>{n(Math.round(span * 0.6))} XP to reach Level {lvl + 1}{nameOf(lvl + 1) !== nameOf(lvl) ? ` · ${nameOf(lvl + 1)}` : ''}</small>
        </div>
        <small className="xr-pv-note">Click a level's name to preview it.</small>
      </aside>
    </div>

    <SaveBar dirty={dirty} count={changedCount} busy={busy} disabled={blank >= 0}
      onDiscard={() => setNames(ladder.names)} onSave={save} />
  </>;
};
