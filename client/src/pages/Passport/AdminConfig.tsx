import React, { useEffect, useMemo, useState } from 'react';
import passportApi, { PassportConfig, CurriculumEngineSummary, FoundationReadiness, StageReadiness, OnboardingField } from '../../api/passportApi';
import AdminInterviewPlans from './AdminInterviewPlans';
import LinesTextarea from '../../components/common/LinesTextarea';
import './adminConfig.css';

/**
 * CareerPilot — Configuration.
 *
 * Every control here changes behaviour; nothing is decorative. Settings that live on two
 * documents (programme length and missions on PassportContent, the rest on PassportConfig) are
 * still edited in one place and saved by one button — which document a value sits in is an
 * implementation detail, and hunting three screens for one setting is not.
 */

/** A form row being edited on this screen. `_id` is a client-only handle; new rows have no key yet. */
type Row = OnboardingField & { _id: string };

const TYPE_LABEL: Record<string, string> = {
  text: 'Text', textarea: 'Textarea', select: 'Dropdown', number: 'Number', date: 'Date', phone: 'Phone', email: 'Email',
};
const EDITABLE_TYPES = ['text', 'textarea', 'select', 'number', 'date'];

/** "2026-06-01T00:00:00.000Z" → "2026-06-01", the value an <input type="date"> takes. */
const toDay = (v?: string | null) => (v ? String(v).slice(0, 10) : '');

/** This academic year and the next few, e.g. "2026-2027". */
const sessionChoices = () => {
  const now = new Date();
  const start = now.getMonth() >= 5 ? now.getFullYear() : now.getFullYear() - 1;
  return [start - 1, start, start + 1, start + 2].map(y => `${y}-${y + 1}`);
};

const Switch: React.FC<{ on: boolean; onChange: (v: boolean) => void; label: string; disabled?: boolean }> = ({ on, onChange, label, disabled }) => (
  <button type="button" role="switch" aria-checked={on} aria-label={label} disabled={disabled}
    className={`cpc-sw${on ? ' on' : ''}`} onClick={() => onChange(!on)} />
);

let rowSeq = 0;
const toRows = (fields: OnboardingField[]): Row[] =>
  [...(fields || [])].sort((a, b) => (a.order || 0) - (b.order || 0)).map(f => ({ ...f, _id: `r${++rowSeq}` }));

/**
 * The four years an admin prices and lengths, with the figure each inherits when left blank.
 * `job_seeker` is absent on purpose: it is not a year of a course, so it has no programme.
 * The defaults mirror DEFAULT_PROGRAM_DAYS_BY_STAGE on the server — shown as placeholders only,
 * never written, so the two cannot silently disagree about what was actually saved.
 */
const STAGE_YEARS: { key: string; label: string; who: string; defaultDays: number }[] = [
  { key: 'foundation', label: 'Year 1 — Foundation', who: '1st year', defaultDays: 90 },
  { key: 'build', label: 'Year 2 — Build', who: '2nd year', defaultDays: 110 },
  { key: 'specialize', label: 'Year 3 — Specialize', who: '3rd year', defaultDays: 130 },
  { key: 'placement', label: 'Year 4 — Placement', who: 'Final year', defaultDays: 150 },
];

const PassportAdminConfig: React.FC = () => {
  const [cfg, setCfg] = useState<PassportConfig | null>(null);
  const [rows, setRows] = useState<Row[]>([]);
  const [platformEnabled, setPlatformEnabled] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);
  /** The engine each stage is on as the SERVER resolved it after the last save. */
  const [engine, setEngine] = useState<CurriculumEngineSummary | null>(null);
  const [foundation, setFoundation] = useState<FoundationReadiness | null>(null);
  /** Per-year: has this stage got a curriculum behind it, and how many published units. */
  const [stageReadiness, setStageReadiness] = useState<Record<string, StageReadiness>>({});
  /** Programme length and missions per day live on PassportContent; edited here anyway. */
  const [journeyDays, setJourneyDays] = useState(90);
  const [missionsPerDay, setMissionsPerDay] = useState(3);
  /** Interview plans are a list with their own editor, so they get a tab on this screen. */
  const [tab, setTab] = useState<'settings' | 'interviews'>('settings');
  /** The form row open for editing, by client handle. */
  const [editing, setEditing] = useState<string | null>(null);
  const [dragId, setDragId] = useState<string | null>(null);
  const [overId, setOverId] = useState<string | null>(null);
  /** What was last loaded or saved, to tell the admin when there is something unsaved. */
  const [snapshot, setSnapshot] = useState('');

  const serialise = (c: PassportConfig | null, r: Row[], jd: number, mpd: number) =>
    JSON.stringify({ c, r: r.map(({ _id, ...f }) => f), jd, mpd });

  const load = async () => {
    setLoading(true); setMsg(null); setEditing(null);
    try {
      const [r, content] = await Promise.all([
        passportApi.getConfig(),
        // Content may legitimately fail to load; the config half of the screen still works.
        passportApi.getContent().catch(() => null),
      ]);
      const loadedRows = toRows(r.config.onboardingFields);
      const jd = content?.content?.journeyDays || 90;
      const mpd = content?.content?.missionsPerDay ?? 3;
      setCfg(r.config); setRows(loadedRows); setPlatformEnabled(r.platformEnabled);
      setEngine(r.engine || null); setFoundation(r.foundation || null);
      setStageReadiness(r.stageReadiness || {});
      setJourneyDays(jd); setMissionsPerDay(mpd);
      setSnapshot(serialise(r.config, loadedRows, jd, mpd));
    } catch (e: any) { setMsg({ ok: false, text: e?.response?.data?.message || 'Failed to load' }); }
    setLoading(false);
  };
  useEffect(() => { load(); }, []);

  const dirty = useMemo(() => !!cfg && serialise(cfg, rows, journeyDays, missionsPerDay) !== snapshot,
    [cfg, rows, journeyDays, missionsPerDay, snapshot]);

  const save = async () => {
    if (!cfg) return;
    // A new question with no name cannot be saved; say which rather than failing on the server.
    const unnamed = rows.find(r => !String(r.label || '').trim());
    if (unnamed) { setEditing(unnamed._id); setMsg({ ok: false, text: 'Give every form field a name before saving.' }); return; }
    setSaving(true); setMsg(null);
    try {
      await passportApi.saveContent({ journeyDays, missionsPerDay });
      const saved = await passportApi.updateConfig({
        enabled: cfg.enabled, assessmentMode: cfg.assessmentMode, priceInr: cfg.priceInr,
        paymentMode: cfg.paymentMode || 'live',
        conceptLearningEnabled: cfg.conceptLearningEnabled,
        membershipMonths: cfg.membershipMonths,
        // One programme length for missions and roadmap; the planner clamps it to its ceiling.
        roadmapDays: journeyDays,
        roadmapPreviewDays: cfg.roadmapPreviewDays ?? 7,
        foundationProgramDays: cfg.foundationProgramDays ?? 90,
        /**
         * Only the years an admin actually set are sent. An empty box means "use the single
         * price/length", so sending 0 for it would sell that year for nothing — and the server
         * would accept it, because 0 is a legal price.
         */
        programDaysByStage: cfg.programDaysByStage || {},
        priceInrByStage: cfg.priceInrByStage || {},
        /**
         * Which years are on the unit engine. `megaCurriculumEnabled` is deliberately NOT sent:
         * it moves every stage at once, including ones added later and ones with no content, and
         * nothing on this screen should be able to do that by accident. Years are chosen one at
         * a time, below.
         */
        megaCurriculumStages: cfg.megaCurriculumStages || [],
        entitlements: cfg.entitlements,
        registrationOpensAt: cfg.registrationOpensAt || null,
        registrationClosesAt: cfg.registrationClosesAt || null,
        academicSession: cfg.academicSession || '',
        // New rows go without a key: the server names them from their label.
        onboardingFields: rows.map(({ _id, ...f }, i) => ({ ...f, key: f.key || (undefined as any), order: i + 1 })),
      });
      /* The save already answers with the resolved engine and readiness — capability is applied
         server-side after the switches, so this screen must never work out for itself what a
         year resolved to. It used to re-GET for that; one round trip is enough. */
      const savedCfg = saved.config;
      const savedRows = toRows(savedCfg.onboardingFields);
      setCfg(savedCfg); setRows(savedRows); setEditing(null);
      setSnapshot(serialise(savedCfg, savedRows, journeyDays, missionsPerDay));
      if (saved.engine) setEngine(saved.engine);
      if (saved.foundation) setFoundation(saved.foundation);
      if (saved.stageReadiness) setStageReadiness(saved.stageReadiness);
      setMsg({ ok: true, text: 'Saved.' });
    } catch (e: any) {
      const errors: string[] = e?.response?.data?.errors || [];
      setMsg({ ok: false, text: errors.length ? `${e?.response?.data?.message} ${errors.join(' ')}` : (e?.response?.data?.message || 'Save failed') });
    }
    setSaving(false);
  };

  if (loading) return <div className="cpc">Loading…</div>;
  if (!cfg) return <div className="cpc" style={{ color: '#dc2626' }}>{msg?.text || 'No config'}</div>;

  const set = (patch: Partial<PassportConfig>) => setCfg({ ...cfg, ...patch });
  const setEnt = (key: string, tier: 'free' | 'paid') =>
    set({ entitlements: cfg.entitlements.map(e => e.featureKey === key ? { ...e, tier } : e) });

  /**
   * Set — or clear — one year's price or programme length.
   *
   * CLEARING IS NOT SETTING ZERO. An empty box means "this year uses the single value above",
   * so the key is DELETED rather than written as 0. The server accepts 0 as a price (a tenant
   * may give a year away), so writing it on an empty box would silently make that year free,
   * and the admin would have no way to tell that apart from what they meant.
   */
  const setStageNum = (field: 'programDaysByStage' | 'priceInrByStage', stage: string, raw: string) => {
    const next = { ...(cfg[field] || {}) };
    const trimmed = raw.trim();
    if (trimmed === '') delete next[stage];
    else next[stage] = Number(trimmed);
    set({ [field]: next } as Partial<PassportConfig>);
  };
  const setRow = (id: string, patch: Partial<Row>) => setRows(rs => rs.map(r => r._id === id ? { ...r, ...patch } : r));

  /** The free roadmap preview is the `roadmap_preview` entitlement; the switch is a shortcut to it. */
  const previewEnt = cfg.entitlements.find(e => e.featureKey === 'roadmap_preview');
  const testPayments = (cfg.paymentMode || 'live') === 'test';

  const addField = () => {
    const r: Row = { _id: `r${++rowSeq}`, key: '', label: '', type: 'text', required: false, order: rows.length + 1, placeholder: '', enabled: true, custom: true, options: [] };
    setRows(rs => [...rs, r]);
    setEditing(r._id);
  };

  /** Native drag and drop — locked rows stay at the top and cannot be moved or displaced. */
  const drop = (targetId: string) => {
    if (!dragId || dragId === targetId) return;
    setRows(rs => {
      const from = rs.findIndex(r => r._id === dragId);
      let to = rs.findIndex(r => r._id === targetId);
      const lockedCount = rs.filter(r => r.locked).length;
      if (from < 0 || to < 0) return rs;
      to = Math.max(to, lockedCount);
      const next = [...rs];
      const [moved] = next.splice(from, 1);
      next.splice(to, 0, moved);
      return next;
    });
  };

  /** Enter in a single-line box finishes editing the row, which is what it means in a form. */
  const enterCloses = (e: React.KeyboardEvent) => { if (e.key === 'Enter') { e.preventDefault(); setEditing(null); } };

  return (
    <div className="cpc">
      <div className="cpc-crumb">CareerPilot <span style={{ color: '#cbd5e1' }}>›</span> <b>Configuration</b></div>
      <div className="cpc-head">
        <div>
          <h1>CareerPilot — Configuration</h1>
          <p>Set up CareerPilot for your institution: product settings, registration and the sign-up form. Changes apply without a deploy.</p>
        </div>
        <a className="cpc-view" href="/careerpilot/join" target="_blank" rel="noreferrer">View CareerPilot <i className="bi bi-box-arrow-up-right" /></a>
      </div>

      {!platformEnabled && (
        <div className="cpc-warn">
          <b>PASSPORT_ENABLED</b> is off in Platform Settings → Other Integrations. Even with CareerPilot switched on below,
          students cannot see it until you enable it there. That setting is the master switch.
        </div>
      )}

      <div className="cpc-tabs">
        <button className={`cpc-tab${tab === 'settings' ? ' on' : ''}`} onClick={() => setTab('settings')}>Settings</button>
        <button className={`cpc-tab${tab === 'interviews' ? ' on' : ''}`} onClick={() => setTab('interviews')}>Mock interviews</button>
      </div>

      {tab === 'interviews' ? <AdminInterviewPlans /> : (
        <>
          {/* ── Product details ─────────────────────────────────────────────── */}
          <section className="cpc-card">
            <div className="cpc-card-head">
              <span className="cpc-badge indigo"><i className="bi bi-box-seam" /></span>
              <div className="grow"><h2>Product Details</h2><p>Who can join, when, and what membership costs.</p></div>
            </div>
            <div className="cpc-grid">
              <div className="cpc-f">
                <span className="lbl">CareerPilot for this institute</span>
                <div className="inline"><Switch on={cfg.enabled} onChange={v => set({ enabled: v })} label="Enable CareerPilot" /><span className="hint" style={{ margin: 0 }}>{cfg.enabled ? 'On' : 'Off'}</span></div>
              </div>
              <label className="cpc-f">
                <span className="lbl">Academic session</span>
                <select value={cfg.academicSession || ''} onChange={e => set({ academicSession: e.target.value })}>
                  <option value="">Not set</option>
                  {[...new Set([...(cfg.academicSession ? [cfg.academicSession] : []), ...sessionChoices()])].map(s => <option key={s} value={s}>{s}</option>)}
                </select>
                <span className="hint">The intake this registration is for. Shown to students when registration is closed.</span>
              </label>
              <label className="cpc-f">
                <span className="lbl">Registration start date</span>
                <input type="date" value={toDay(cfg.registrationOpensAt)} onChange={e => set({ registrationOpensAt: e.target.value || null })} />
                <span className="hint">New students can sign up from this day. Empty = open now.</span>
              </label>
              <label className="cpc-f">
                <span className="lbl">Registration end date</span>
                <input type="date" value={toDay(cfg.registrationClosesAt)} min={toDay(cfg.registrationOpensAt) || undefined} onChange={e => set({ registrationClosesAt: e.target.value || null })} />
                <span className="hint">Last day to sign up. Existing members can always log in. Empty = no end.</span>
              </label>
              <label className="cpc-f">
                <span className="lbl">Membership price (₹)</span>
                <input type="number" min={0} value={cfg.priceInr} onChange={e => set({ priceInr: Number(e.target.value) })} />
              </label>
              <label className="cpc-f">
                <span className="lbl">Account access (months)</span>
                <input type="number" min={1} max={60} value={cfg.membershipMonths} onChange={e => set({ membershipMonths: Number(e.target.value) })} />
                <span className="hint">How long a member can use CareerPilot after paying.</span>
              </label>
              {previewEnt && (
                <div className="cpc-f">
                  <span className="lbl">Free roadmap preview</span>
                  <div className="inline">
                    <Switch on={previewEnt.tier === 'free'} onChange={v => setEnt('roadmap_preview', v ? 'free' : 'paid')} label="Free roadmap preview" />
                    <input type="number" min={1} max={30} style={{ width: 80 }} disabled={previewEnt.tier !== 'free'} aria-label="Preview days"
                      value={cfg.roadmapPreviewDays ?? 7} onChange={e => set({ roadmapPreviewDays: Number(e.target.value) || 7 })} />
                    <span className="hint" style={{ margin: 0 }}>days</span>
                  </div>
                  <span className="hint">Days of their own roadmap a student sees before paying. Off = nothing until they pay.</span>
                </div>
              )}
              <div className="cpc-f">
                <span className="lbl">Test payments</span>
                <div className="inline"><Switch on={testPayments} onChange={v => set({ paymentMode: v ? 'test' : 'live' })} label="Test payments" /><span className="hint" style={{ margin: 0 }}>{testPayments ? 'On — no money taken' : 'Off — live payments'}</span></div>
              </div>
            </div>
            {testPayments && (
              <div className="cpc-note warn">
                <b>Test payments are on.</b> Anyone who clicks Unlock gets a full membership and pays nothing. This affects CareerPilot
                membership only — hackathon registration still takes real money. Switch it off before students buy.
              </div>
            )}
          </section>

          {/* ── Programme & engine ──────────────────────────────────────────── */}
          <section className="cpc-card">
            <div className="cpc-card-head">
              <span className="cpc-badge teal"><i className="bi bi-diagram-3" /></span>
              <div className="grow"><h2>Programme &amp; Curriculum</h2><p>How long the programme runs and how daily work is built.</p></div>
            </div>
            <div className="cpc-grid">
              <label className="cpc-f">
                <span className="lbl">Programme length (days)</span>
                <input type="number" min={7} max={365} value={journeyDays} onChange={e => setJourneyDays(Number(e.target.value) || 90)} />
                <span className="hint">
                  Missions and roadmap both run this long ({Math.ceil((journeyDays || 90) / 7)} weeks).
                  {journeyDays > 90 && <> The skill plan covers the first <b>90</b> and is rebuilt at the next assessment.</>}
                </span>
              </label>
              <label className="cpc-f">
                <span className="lbl">Foundation programme (days)</span>
                <input type="number" min={30} max={180} value={cfg.foundationProgramDays ?? 90} onChange={e => set({ foundationProgramDays: Number(e.target.value) || 90 })} />
                <span className="hint">Length of the next Foundation journey composed (30–180). Journeys under way keep theirs.</span>
              </label>
              <label className="cpc-f">
                <span className="lbl">Missions per day</span>
                <input type="number" min={1} max={6} value={missionsPerDay} onChange={e => setMissionsPerDay(Math.max(1, Math.min(6, Number(e.target.value) || 3)))} />
                <span className="hint">One per category, so 6 is the ceiling.</span>
              </label>
              <label className="cpc-f">
                <span className="lbl">Free assessment engine</span>
                <select value={cfg.assessmentMode} onChange={e => set({ assessmentMode: e.target.value as any })}>
                  <option value="deterministic">Deterministic (no AI — cheap, scales)</option>
                  <option value="ai">AI (rich, costs tokens)</option>
                </select>
              </label>
              <div className="cpc-f">
                <span className="lbl">Teach from published journeys</span>
                <div className="inline"><Switch on={!!cfg.conceptLearningEnabled} onChange={v => set({ conceptLearningEnabled: v })} label="Teach from published learning journeys" /></div>
                <span className="hint">Off serves the first resource mapped to each skill, exactly as before journeys existed.</span>
              </div>
            </div>
            {foundation && (
              <div className={`cpc-note ${foundation.configured ? 'ok' : 'bad'}`}>
                <b>Foundation curriculum: {foundation.configured ? 'provisioned' : 'NOT CONFIGURED'}</b>
                {' · '}{foundation.publishedUnits} published units · {foundation.skillCheckMappings} skill-check mappings
                {!foundation.configured && foundation.message && <div style={{ marginTop: 4 }}>{foundation.message}</div>}
              </div>
            )}
            {engine && (
              <div className="cpc-chips">
                {engine.stages.map(s => <span key={s.stage} className={`cpc-chip${s.mode === 'UNIT' ? ' unit' : ''}`}>{s.label}: {s.mode}</span>)}
              </div>
            )}

            {/* ── Which years are live ─────────────────────────────────────────
              * These three fields have been on PassportConfig and validated by the API since the
              * unit engine shipped, and NOTHING rendered them. A tenant could hold four years of
              * published curriculum and still serve every second-, third- and final-year the old
              * topic roadmap, because the last step was a config write no screen could make.
              * That is not hypothetical: it is what happened in production, and it took a
              * mongosh one-liner to undo.
              *
              * Foundation has no toggle because it has no choice — every first-year is planned by
              * the unit engine, always. A year with no curriculum is refused here rather than
              * allowed and then explained to a student, because switching it on would move that
              * year from a wrong roadmap to no roadmap at all. */}
            {engine && (
              <div className="cpc-years cpc-engine">
                <div className="cpc-years-hd"><span>Year</span><span>Published units</span><span>Planned by</span></div>
                {engine.stages.filter(st => engine.unitCapableStages.includes(st.stage)).map(st => {
                  const ready = stageReadiness[st.stage];
                  const mandatory = st.stage === 'foundation';
                  const on = (cfg.megaCurriculumStages || []).includes(st.stage);
                  const blocked = !mandatory && ready && !ready.configured;
                  return (
                    <div key={st.stage} className="cpc-year">
                      <span className="cpc-year-name">
                        <b>{st.label}</b>
                        <small>{mandatory ? 'Always on — every first-year is planned by units' : st.mode === 'UNIT' ? 'Their curriculum' : 'The old topic roadmap'}</small>
                      </span>
                      <span className={`cpc-units${blocked ? ' short' : ''}`}>
                        {ready?.publishedUnits ?? '—'}
                        {blocked && <em>not enough to compose</em>}
                      </span>
                      {mandatory ? (
                        <span className="cpc-locked"><i className="bi bi-lock-fill" /> Units</span>
                      ) : (
                        <label className={`cpc-toggle${blocked ? ' off' : ''}`} title={blocked ? (ready?.message || '') : undefined}>
                          <input
                            type="checkbox"
                            checked={on}
                            disabled={!!blocked}
                            onChange={e => {
                              const next = new Set(cfg.megaCurriculumStages || []);
                              if (e.target.checked) next.add(st.stage); else next.delete(st.stage);
                              set({ megaCurriculumStages: [...next] });
                            }}
                          />
                          <span>{on ? 'Their curriculum' : 'Topic roadmap'}</span>
                        </label>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
            <p className="cpc-years-note">
              Turning a year on plans everyone in it from that year&apos;s curriculum. It does not rewrite a
              plan somebody already has — those change when the student next triggers a recomposition.
              A year with too few published units cannot be switched on; publish its curriculum first.
            </p>
          </section>

          {/* ── Per-year price and length ───────────────────────────────────────
            * WHY THIS SCREEN EXISTS. Every year was sold at one price and planned at one
            * length, because the single `priceInr` and `foundationProgramDays` boxes above
            * were the only ones the UI had. The fields behind this have been on PassportConfig
            * and validated by the API the whole time — nothing rendered them, so the only way
            * to set a second-year's price was to edit the database by hand. Measured in
            * production: a final-year offered ₹1.
            *
            * EMPTY IS NOT ZERO. A blank box inherits the single value above, which is why the
            * placeholder shows what it would inherit rather than a 0.
            */}
          <section className="cpc-card">
            <div className="cpc-card-head">
              <span className="cpc-badge"><i className="bi bi-calendar3" /></span>
              <div className="grow">
                <h2>Price and length, per year</h2>
                <p>Each year can carry its own membership price and its own number of days. Leave a box empty to use the single values above.</p>
              </div>
            </div>
            <div className="cpc-years">
              <div className="cpc-years-hd"><span>Year</span><span>Price (₹)</span><span>Programme length (days)</span></div>
              {STAGE_YEARS.map(y => (
                <div key={y.key} className="cpc-year">
                  <span className="cpc-year-name"><b>{y.label}</b><small>{y.who}</small></span>
                  {/* The column headings are hidden on a phone, so each box carries its own
                      label there. Hidden on desktop, where the heading row says it once. */}
                  <label className="cpc-year-in">
                    <span className="cpc-year-lbl">Price (₹)</span>
                    <input
                      type="number" min={0} max={100000}
                      aria-label={`${y.label} membership price in rupees`}
                      value={cfg.priceInrByStage?.[y.key] ?? ''}
                      placeholder={`${cfg.priceInr}`}
                      onChange={e => setStageNum('priceInrByStage', y.key, e.target.value)}
                    />
                  </label>
                  <label className="cpc-year-in">
                    <span className="cpc-year-lbl">Days</span>
                    <input
                      type="number" min={30} max={180}
                      aria-label={`${y.label} programme length in days`}
                      value={cfg.programDaysByStage?.[y.key] ?? ''}
                      placeholder={`${y.defaultDays}`}
                      onChange={e => setStageNum('programDaysByStage', y.key, e.target.value)}
                    />
                  </label>
                </div>
              ))}
            </div>
            <p className="cpc-years-note">
              Price 0–100,000. Length 30–180 days, and it only changes journeys composed from now on —
              a member already on a plan keeps the length theirs was built with.
            </p>
          </section>

          {/* ── Free vs paid ────────────────────────────────────────────────── */}
          <section className="cpc-card">
            <div className="cpc-card-head">
              <span className="cpc-badge amber"><i className="bi bi-unlock" /></span>
              <div className="grow"><h2>Free vs Paid</h2><p>Which features are free to convert, and which unlock with the ₹{cfg.priceInr} membership.</p></div>
            </div>
            {cfg.entitlements.map(e => (
              <div key={e.featureKey} className="cpc-ent">
                <span>{e.label}</span>
                <div className="cpc-seg">
                  {(['free', 'paid'] as const).map(t => (
                    <button key={t} type="button" className={e.tier === t ? t : ''} onClick={() => setEnt(e.featureKey, t)}>{t}</button>
                  ))}
                </div>
              </div>
            ))}
          </section>

          {/* ── Sign-up form ────────────────────────────────────────────────── */}
          <section className="cpc-card">
            <div className="cpc-card-head">
              <span className="cpc-badge sky"><i className="bi bi-ui-checks" /></span>
              <div className="grow"><h2>Registration Form</h2><p>What new students fill in to join. Drag to reorder; Name, Mobile and Email are always asked.</p></div>
              <button type="button" className="cpc-add" onClick={addField}><i className="bi bi-plus-lg" /> Add Custom Field</button>
            </div>
            <div className="cpc-rows">
              {rows.map(r => {
                const on = r.enabled !== false;
                const open = editing === r._id;
                return (
                  <div key={r._id}
                    className={`cpc-row${on ? '' : ' off'}${dragId === r._id ? ' dragging' : ''}${overId === r._id && dragId !== r._id ? ' drag-over' : ''}`}
                    onDragOver={e => { if (dragId) { e.preventDefault(); setOverId(r._id); } }}
                    onDragLeave={() => setOverId(o => (o === r._id ? null : o))}
                    onDrop={e => { e.preventDefault(); drop(r._id); setDragId(null); setOverId(null); }}>
                    <span className={`cpc-grip${r.locked ? ' fixed' : ''}`} draggable={!r.locked} title={r.locked ? 'Always first' : 'Drag to reorder'}
                      onDragStart={e => { setDragId(r._id); e.dataTransfer.effectAllowed = 'move'; }}
                      onDragEnd={() => { setDragId(null); setOverId(null); }}>
                      <i className="bi bi-grip-vertical" />
                    </span>
                    <span className="name">{r.label || <i style={{ color: '#94a3b8' }}>New field</i>}{r.locked && <i className="bi bi-lock-fill lock" title="Always asked" />}</span>
                    <span className="cpc-type">{TYPE_LABEL[r.type] || r.type}</span>
                    <span className="ph">{r.type === 'select' ? `${(r.options || []).length} choices` : (r.placeholder || '')}</span>
                    <div className="cpc-acts">
                      <Switch on={on} disabled={r.locked} onChange={v => setRow(r._id, { enabled: v, ...(v ? {} : { required: false }) })} label={`Show ${r.label} on the form`} />
                      <span className="cpc-req">
                        <Switch on={!!r.required} disabled={r.locked || !on} onChange={v => setRow(r._id, { required: v })} label={`${r.label} required`} />
                        {r.required ? 'Required' : 'Optional'}
                      </span>
                      <button type="button" className="cpc-icon" disabled={r.locked} title="Edit" onClick={() => setEditing(open ? null : r._id)}><i className="bi bi-pencil" /></button>
                      <button type="button" className="cpc-icon danger" disabled={!r.custom} title="Delete"
                        onClick={() => { if (window.confirm(`Delete "${r.label || 'this field'}"? Answers members already gave are kept.`)) { setRows(rs => rs.filter(x => x._id !== r._id)); setEditing(null); } }}>
                        <i className="bi bi-trash" />
                      </button>
                    </div>
                    {open && (
                      <div className="cpc-edit">
                        <label className="cpc-f">
                          <span className="lbl">Field name <em>*</em></span>
                          <input autoFocus value={r.label} maxLength={80} placeholder="e.g. Why do you want to join?" onKeyDown={enterCloses} onChange={e => setRow(r._id, { label: e.target.value })} />
                        </label>
                        <label className="cpc-f">
                          <span className="lbl">Answer type</span>
                          <select value={r.type} disabled={!r.custom && !EDITABLE_TYPES.includes(r.type)} onChange={e => setRow(r._id, { type: e.target.value })}>
                            {EDITABLE_TYPES.map(t => <option key={t} value={t}>{TYPE_LABEL[t]}</option>)}
                          </select>
                        </label>
                        {r.type !== 'select' && (
                          <label className="cpc-f">
                            <span className="lbl">Placeholder</span>
                            <input value={r.placeholder || ''} maxLength={120} placeholder="Hint shown inside the empty box" onKeyDown={enterCloses} onChange={e => setRow(r._id, { placeholder: e.target.value })} />
                          </label>
                        )}
                        {r.type === 'select' && (
                          <label className="cpc-f wide">
                            <span className="lbl">Choices — one per line ({(r.options || []).length})</span>
                            <LinesTextarea rows={Math.min(12, Math.max(4, (r.options || []).length + 1))} value={r.options || []} onChange={options => setRow(r._id, { options })} />
                            <span className="hint">Renaming a choice does not change members who already picked the old one.</span>
                          </label>
                        )}
                        <div className="done"><button type="button" className="cpc-btn-sm" onClick={() => setEditing(null)}>Done</button></div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </section>

          <div className="cpc-bar">
            <button className="cpc-save" onClick={save} disabled={saving}><i className="bi bi-floppy" /> {saving ? 'Saving…' : 'Save Changes'}</button>
            <button className="cpc-reset" onClick={() => { if (!dirty || window.confirm('Discard your unsaved changes?')) load(); }} disabled={saving}><i className="bi bi-arrow-counterclockwise" /> Reset</button>
            {dirty && !msg && <span className="cpc-dirty">Unsaved changes</span>}
            {msg && <span className={`cpc-msg ${msg.ok ? 'ok' : 'err'}`}>{msg.text}</span>}
          </div>
        </>
      )}
    </div>
  );
};

export default PassportAdminConfig;
