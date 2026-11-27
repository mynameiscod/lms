import React, { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  websiteSectionsApi, WcSections, WcBattle, WcBattleSettings, WcPrize, WcWinner, WcEvent, WcCourse, WcTestimonial, WcTrainer, WcHistory, WcSectionList,
} from '../../api';
import { Modal } from '../../components/common';
import { Ok, Err, History, StatusPill, useReorder, ImagePick, LinesBox, NumbersEditor, confirmRemove, initials, dateText } from './shared';

/**
 * Website Content stages 2–4 (2026-11-27): Tech Battle, Events, Courses, Testimonials, Trainers and
 * Site settings tabs. Same rules as Placements: typed here, nothing calculated, published only.
 */

export interface SectionPaneProps { data: WcSections; reload: () => Promise<void>; ok: Ok; err: Err }

const reorderOf = (list: WcSectionList | 'courses', reload: () => Promise<void>, err: Err) => async (ids: string[]) => {
  try { await websiteSectionsApi.reorder(list, ids); await reload(); } catch (e) { err(e, 'Could not save the order'); await reload(); }
};

const ReorderButtons: React.FC<{ i: number; n: number; name: string; move: (d: number) => void; vertical?: boolean }> = ({ i, n, name, move, vertical }) => (
  <>
    <button className="wct-icon" onClick={() => move(-1)} disabled={i === 0} aria-label={`Move ${name} earlier`}><i className={`fa-solid ${vertical ? 'fa-arrow-up' : 'fa-arrow-left'}`} /></button>
    <button className="wct-icon" onClick={() => move(1)} disabled={i === n - 1} aria-label={`Move ${name} later`}><i className={`fa-solid ${vertical ? 'fa-arrow-down' : 'fa-arrow-right'}`} /></button>
  </>
);

const FormActions: React.FC<{ saving: boolean; onCancel: () => void; onSave: () => void; label?: string }> = ({ saving, onCancel, onSave, label = 'Save' }) => (
  <div className="wct-form-actions">
    <button className="wct-btn ghost" onClick={onCancel} disabled={saving}>Cancel</button>
    <button className="wct-btn primary" onClick={onSave} disabled={saving}>{saving ? 'Saving…' : label}</button>
  </div>
);

function useSaver(reload: () => Promise<void>, ok: Ok, err: Err) {
  const [saving, setSaving] = useState(false);
  const run = async (fn: () => Promise<unknown>, done = 'Saved. The website shows it within about a minute.') => {
    setSaving(true);
    try { await fn(); await reload(); ok(done); return true; }
    catch (e) { err(e); return false; }
    finally { setSaving(false); }
  };
  return { saving, run };
}

/* ── Tech Battle ───────────────────────────────────────────────────────────────────────────── */

type BattleTab = 'page' | 'battles' | 'numbers';

export const TechBattlePane: React.FC<SectionPaneProps> = ({ data, reload, ok, err }) => {
  const { battle } = data;
  const [tab, setTab] = useState<BattleTab>('page');
  const current = battle.battles.find((b) => b.id === battle.currentId) || null;
  return (
    <section>
      <div className={`wct-nextcard ${current ? '' : 'none'}`}>
        <div className="wct-nextcard-label"><i className="fa-solid fa-calendar-check" /> Next battle on the website</div>
        {current ? (
          <>
            <div className="wct-nextcard-title">{current.title}</div>
            <div className="wct-nextcard-meta">
              <span><i className="fa-regular fa-calendar" /> {current.date}</span>
              <span><i className="fa-regular fa-clock" /> {current.time}</span>
              {current.partnerCollege && <span><i className="fa-solid fa-building-columns" /> {current.partnerCollege}</span>}
            </div>
            <p>The date, time and countdown come from this battle in <Link to="/admin/battles">Tech Battles</Link>, so you enter them once. {current.partnerCollege ? '' : 'Add the partner college under “Battles & winners”.'}</p>
          </>
        ) : (
          <p>No public battle is live in <Link to="/admin/battles">Tech Battles</Link>, so the website shows no date{battle.settings.scheduleText ? <> — it shows “<b>{battle.settings.scheduleText}</b>” instead</> : ''}. Make next week's battle live there and the website follows by itself.</p>
        )}
      </div>

      <div className="wct-tabs" role="tablist" aria-label="Tech Battle">
        {([['page', 'Page & prizes', 'fa-gift'], ['battles', 'Battles & winners', 'fa-medal'], ['numbers', 'Numbers', 'fa-chart-simple']] as [BattleTab, string, string][]).map(([k, label, icon]) => (
          <button key={k} role="tab" aria-selected={tab === k} className={`wct-tab ${tab === k ? 'on' : ''}`} onClick={() => setTab(k)}>
            <i className={`fa-solid ${icon}`} /> <span>{label}</span>
          </button>
        ))}
      </div>
      {tab === 'page' && <BattleSettingsForm settings={battle.settings} reload={reload} ok={ok} err={err} />}
      {tab === 'battles' && <BattleList battles={battle.battles} currentId={battle.currentId} reload={reload} ok={ok} err={err} />}
      {tab === 'numbers' && (
        <NumbersEditor stats={battle.stats} section="tech_battle" reload={reload} ok={ok} err={err} sample={['1000+', 'Active participants']}
          blurb={<>The counters on the Tech Battle page, e.g. <b>1000+</b> Active participants.</>}
          empty="No numbers yet. Add participants, colleges, weekly challenges — whatever the Tech Battle page shows." />
      )}
    </section>
  );
};

const BattleSettingsForm: React.FC<{ settings: WcBattleSettings; reload: () => Promise<void>; ok: Ok; err: Err }> = ({ settings, reload, ok, err }) => {
  const [f, setF] = useState<WcBattleSettings>(settings);
  const { saving, run } = useSaver(reload, ok, err);
  const setPrize = (i: number, p: Partial<WcPrize>) => setF({ ...f, prizes: f.prizes.map((x, j) => (j === i ? { ...x, ...p } : x)) });
  return (
    <div className="wct-form wct-panel">
      <div className="wct-form-three">
        <label><span>Who can take part</span><input value={f.eligibility} maxLength={80} onChange={(e) => setF({ ...f, eligibility: e.target.value })} placeholder="B.Tech Students" /></label>
        <label><span>Also open to</span><input value={f.alsoOpenTo} maxLength={80} onChange={(e) => setF({ ...f, alsoOpenTo: e.target.value })} placeholder="Recent Passed Outs" /></label>
        <label><span>Duration</span><input value={f.durationText} maxLength={40} onChange={(e) => setF({ ...f, durationText: e.target.value })} placeholder="30 minutes" /></label>
      </div>
      <div className="wct-form-two">
        <label><span>Mode</span><input value={f.modeText} maxLength={40} onChange={(e) => setF({ ...f, modeText: e.target.value })} placeholder="Online" /></label>
        <label><span>When no battle is live, show <em>(optional)</em></span><input value={f.scheduleText} maxLength={80} onChange={(e) => setF({ ...f, scheduleText: e.target.value })} placeholder="Every Friday, 7:30 PM" /></label>
      </div>
      <div className="wct-form-two">
        <LinesBox label={<>Topics <em>(one per line)</em></>} value={f.topics} onChange={(v) => setF({ ...f, topics: v })} rows={5} placeholder={'Live Coding Challenges\nAptitude & Logical Thinking'} />
        <LinesBox label={<>Every participant gets <em>(one per line)</em></>} value={f.everyone} onChange={(v) => setF({ ...f, everyone: v })} rows={5} placeholder="Participation Certificate" />
      </div>
      <div className="wct-subhead">
        <b>Prizes</b>
        <button className="wct-btn ghost sm" onClick={() => setF({ ...f, prizes: [...f.prizes, { place: `${f.prizes.length + 1}${['st', 'nd', 'rd'][f.prizes.length] || 'th'} Prize`, amount: '', items: [] }] })}><i className="fa-solid fa-plus" /> Add prize</button>
      </div>
      {f.prizes.length === 0 ? <div className="wct-none">No prizes yet.</div> : (
        <div className="wct-prizes">
          {f.prizes.map((p, i) => (
            <div key={i} className="wct-prize">
              <div className="wct-form-two">
                <label><span>Place</span><input value={p.place} maxLength={30} onChange={(e) => setPrize(i, { place: e.target.value })} placeholder="1st Prize" /></label>
                <label><span>Cash</span><input value={p.amount} maxLength={30} onChange={(e) => setPrize(i, { amount: e.target.value })} placeholder="₹1000" /></label>
              </div>
              <LinesBox label={<>Also wins <em>(one per line)</em></>} value={p.items} onChange={(v) => setPrize(i, { items: v })} rows={4} placeholder={'Myntra Gift Voucher\nSurprise Gift Hamper'} />
              <div className="wct-card-actions">
                <ReorderButtons i={i} n={f.prizes.length} name={p.place || 'prize'} move={(d) => { const a = [...f.prizes]; const j = i + d; [a[i], a[j]] = [a[j], a[i]]; setF({ ...f, prizes: a }); }} />
                <span className="wct-grow" />
                <button className="wct-icon danger" onClick={() => setF({ ...f, prizes: f.prizes.filter((_, j) => j !== i) })} aria-label={`Remove ${p.place || 'prize'}`}><i className="fa-solid fa-trash" /></button>
              </div>
            </div>
          ))}
        </div>
      )}
      <History items={settings.history} />
      <div className="wct-form-actions">
        <button className="wct-btn primary" disabled={saving} onClick={() => run(() => websiteSectionsApi.battleSettings(f))}>{saving ? 'Saving…' : 'Save page & prizes'}</button>
      </div>
    </div>
  );
};

interface NoteForm { battle: WcBattle; partnerCollege: string; partnerImageId: string | null; partnerImageUrl: string | null; winners: WcWinner[]; winnersPublished: boolean }

const BattleList: React.FC<{ battles: WcBattle[]; currentId: string | null; reload: () => Promise<void>; ok: Ok; err: Err }> = ({ battles, currentId, reload, ok, err }) => {
  const [form, setForm] = useState<NoteForm | null>(null);
  const [filling, setFilling] = useState(false);
  const { saving, run } = useSaver(reload, ok, err);
  const setWinner = (i: number, w: Partial<WcWinner>) => form && setForm({ ...form, winners: form.winners.map((x, j) => (j === i ? { ...x, ...w } : x)) });
  const fill = async () => {
    if (!form) return;
    setFilling(true);
    try {
      const top = await websiteSectionsApi.battleTop(form.battle.id, 3);
      if (!top.length) err({ message: 'Nobody has submitted this battle yet.' });
      else setForm({ ...form, winners: top.map((t) => ({ ...t, photoId: null, photoUrl: null })) });
    } catch (e) { err(e); } finally { setFilling(false); }
  };
  const statusText = (b: WcBattle) => (b.id === currentId ? 'On the website now' : b.ended ? 'Ended' : b.status === 'live' ? (b.visibility === 'public' ? 'Live' : 'Private') : b.status === 'draft' ? 'Draft' : 'Closed');
  return (
    <section>
      <p className="wct-muted wct-sub">Battles come from <Link to="/admin/battles">Tech Battles</Link>. Here you add what the website shows with each one: the partner college, and after it ends, the winners.</p>
      {battles.length === 0 ? <div className="wct-none">No battles yet. Create one in Tech Battles.</div> : (
        <ul className="wct-battles">
          {battles.map((b) => (
            <li key={b.id} className={b.id === currentId ? 'now' : ''}>
              <div className="wct-battle-main">
                <b>{b.title}</b>
                <span>{b.date} · {b.time}{b.partnerCollege ? ` · ${b.partnerCollege}` : ''}</span>
                {b.winners.length > 0 && <span className="wct-battle-winners"><i className="fa-solid fa-medal" /> {b.winners.map((w) => w.name).join(', ')}</span>}
              </div>
              <div className="wct-battle-flags">
                <span className={`wct-pill ${b.id === currentId ? 'pub' : 'draft'}`}>{statusText(b)}</span>
                {b.winners.length > 0 && <StatusPill on={b.winnersPublished} onText="Winners shown" offText="Winners hidden" />}
              </div>
              <button className="wct-btn ghost sm" onClick={() => setForm({ battle: b, partnerCollege: b.partnerCollege, partnerImageId: b.partnerImageId, partnerImageUrl: b.partnerImageUrl, winners: b.winners, winnersPublished: b.winnersPublished })}>
                <i className="fa-solid fa-pen" /> {b.ended ? 'Winners' : 'Edit'}
              </button>
            </li>
          ))}
        </ul>
      )}
      <Modal isOpen={!!form} onClose={() => setForm(null)} title={form ? form.battle.title : ''} size="large">
        {form && (
          <div className="wct-form">
            <div className="wct-muted">{form.battle.date} · {form.battle.time} — date and time are set in Tech Battles.</div>
            <label><span>Partner college <em>(optional)</em></span><input value={form.partnerCollege} maxLength={120} onChange={(e) => setForm({ ...form, partnerCollege: e.target.value })} placeholder="St. Ann's College of Engineering & Technology, Chirala" /></label>
            <ImagePick kind="thumb" url={form.partnerImageUrl} fallback="College" onError={(m) => err({ message: m })}
              onUploaded={(id, url) => setForm({ ...form, partnerImageId: id, partnerImageUrl: url })} onClear={() => setForm({ ...form, partnerImageId: null, partnerImageUrl: null })} />
            <div className="wct-subhead">
              <b>Winners</b>
              <div className="wct-subhead-actions">
                <button className="wct-btn ghost sm" onClick={fill} disabled={filling}><i className="fa-solid fa-ranking-star" /> {filling ? 'Reading…' : 'Fill from leaderboard'}</button>
                <button className="wct-btn ghost sm" onClick={() => setForm({ ...form, winners: [...form.winners, { place: form.winners.length + 1, name: '', college: '', score: '', photoId: null, photoUrl: null }] })}><i className="fa-solid fa-plus" /> Add winner</button>
              </div>
            </div>
            {form.winners.length === 0 ? <div className="wct-none">No winners yet. After the battle ends, fill them from the leaderboard or type them.</div> : (
              <div className="wct-winners">
                {form.winners.map((w, i) => (
                  <div key={i} className="wct-winner">
                    <ImagePick kind="photo" url={w.photoUrl} fallback={initials(w.name) || `#${w.place}`} onError={(m) => err({ message: m })}
                      onUploaded={(id, url) => setWinner(i, { photoId: id, photoUrl: url })} onClear={() => setWinner(i, { photoId: null, photoUrl: null })} />
                    <div className="wct-winner-fields">
                      <label><span>Place</span><input type="number" min={1} max={10} value={w.place} onChange={(e) => setWinner(i, { place: Number(e.target.value) })} /></label>
                      <label><span>Name</span><input value={w.name} maxLength={60} onChange={(e) => setWinner(i, { name: e.target.value })} /></label>
                      <label><span>College</span><input value={w.college} maxLength={120} onChange={(e) => setWinner(i, { college: e.target.value })} /></label>
                      <label><span>Score <em>(optional)</em></span><input value={w.score} maxLength={20} onChange={(e) => setWinner(i, { score: e.target.value })} /></label>
                    </div>
                    <button className="wct-icon danger" onClick={() => setForm({ ...form, winners: form.winners.filter((_, j) => j !== i) })} aria-label={`Remove ${w.name || 'winner'}`}><i className="fa-solid fa-trash" /></button>
                  </div>
                ))}
              </div>
            )}
            <label className={`wct-check ${form.winners.length ? '' : 'dim'}`}>
              <input type="checkbox" disabled={!form.winners.length} checked={form.winnersPublished && form.winners.length > 0} onChange={(e) => setForm({ ...form, winnersPublished: e.target.checked })} />
              Show these winners on the website (past battles)
            </label>
            <History items={form.battle.history} />
            <FormActions saving={saving} onCancel={() => setForm(null)} onSave={async () => {
              const body = {
                partnerCollege: form.partnerCollege, partnerImageId: form.partnerImageId,
                winners: form.winners.map(({ place, name, college, score, photoId }) => ({ place, name, college, score, photoId })),
                winnersPublished: form.winnersPublished && form.winners.length > 0,
              };
              if (await run(() => websiteSectionsApi.battleNote(form.battle.id, body))) setForm(null);
            }} />
          </div>
        )}
      </Modal>
    </section>
  );
};

/* ── Events ────────────────────────────────────────────────────────────────────────────────── */

type EventForm = Omit<WcEvent, 'id' | 'status' | 'history'> & { id?: string; history?: WcHistory[] };
const emptyEvent = (): EventForm => ({
  type: 'workshop', title: '', summary: '', startDate: '', endDate: '', timeText: '', venue: '', mode: 'online', teamSize: '', feeText: '',
  prizes: [], registerUrl: '', pageUrl: '', imageId: null, imageUrl: null, published: true,
});
const EVENT_TYPE: Record<WcEvent['type'], string> = { hackathon: 'Hackathon', workshop: 'Workshop', other: 'Event' };
const STATUS_LABEL: Record<WcEvent['status'], string> = { upcoming: 'Upcoming', ongoing: 'Ongoing', past: 'Past' };

export const EventsPane: React.FC<SectionPaneProps> = ({ data, reload, ok, err }) => {
  const [filter, setFilter] = useState<'all' | WcEvent['status']>('all');
  const [form, setForm] = useState<EventForm | null>(null);
  const { saving, run } = useSaver(reload, ok, err);
  const rank = (s: string) => (s === 'ongoing' ? 0 : s === 'upcoming' ? 1 : 2);
  const list = useMemo(() => [...data.events]
    .sort((x, y) => rank(x.status) - rank(y.status) || (x.status === 'past' ? y.startDate.localeCompare(x.startDate) : x.startDate.localeCompare(y.startDate)))
    .filter((e) => filter === 'all' || e.status === filter), [data.events, filter]);
  const save = async () => {
    if (!form) return;
    if (!form.title.trim()) return err({ message: 'Type the event title.' });
    if (!form.startDate) return err({ message: 'Pick the start date.' });
    const { id, history, imageUrl, ...body } = form;
    if (await run(() => (id ? websiteSectionsApi.update('events', id, body) : websiteSectionsApi.create('events', body)))) setForm(null);
  };
  return (
    <section>
      <div className="wct-bar">
        <select className="wct-filter" value={filter} onChange={(e) => setFilter(e.target.value as any)} aria-label="Show">
          <option value="all">All events</option><option value="upcoming">Upcoming</option><option value="ongoing">Ongoing</option><option value="past">Past</option>
        </select>
        <button className="wct-btn primary" onClick={() => setForm(emptyEvent())}><i className="fa-solid fa-plus" /> Add event</button>
      </div>
      <p className="wct-muted wct-sub">Hackathons, workshops and other events. Upcoming, Ongoing and Past are worked out from the dates every day, so an old event never shows as upcoming.</p>
      {list.length === 0 ? <div className="wct-none">{data.events.length ? 'No event matches.' : 'No events yet.'}</div> : (
        <div className="wct-events">
          {list.map((e) => (
            <article key={e.id} className={`wct-event ${e.published ? '' : 'off'}`}>
              <div className="wct-event-img">{e.imageUrl ? <img src={e.imageUrl} alt="" /> : <i className={`fa-solid ${e.type === 'hackathon' ? 'fa-laptop-code' : 'fa-chalkboard'}`} />}</div>
              <div className="wct-event-body">
                <div className="wct-student-flags">
                  <span className={`wct-pill st-${e.status}`}>{STATUS_LABEL[e.status]}</span>
                  <span className="wct-type">{EVENT_TYPE[e.type]}</span>
                  <StatusPill on={e.published} />
                </div>
                <b>{e.title}</b>
                <span className="wct-muted">{dateText(e.startDate)}{e.endDate && e.endDate !== e.startDate ? ` – ${dateText(e.endDate)}` : ''}{e.timeText ? ` · ${e.timeText}` : ''}</span>
                <span className="wct-muted">{[e.mode === 'online' ? 'Online' : e.venue || (e.mode === 'hybrid' ? 'Hybrid' : 'Offline'), e.teamSize, e.feeText].filter(Boolean).join(' · ')}</span>
                <div className="wct-card-actions">
                  <span className="wct-grow" />
                  <button className="wct-icon" onClick={() => run(() => websiteSectionsApi.update('events', e.id, { published: !e.published }), e.published ? 'Taken off the website.' : 'Published.')} aria-label={e.published ? `Unpublish ${e.title}` : `Publish ${e.title}`}><i className={`fa-solid ${e.published ? 'fa-eye-slash' : 'fa-eye'}`} /></button>
                  <button className="wct-icon" onClick={() => setForm({ ...e })} aria-label={`Edit ${e.title}`}><i className="fa-solid fa-pen" /></button>
                  <button className="wct-icon danger" onClick={() => confirmRemove(e.title, () => websiteSectionsApi.remove('events', e.id), reload, ok, err)} aria-label={`Remove ${e.title}`}><i className="fa-solid fa-trash" /></button>
                </div>
              </div>
            </article>
          ))}
        </div>
      )}
      <Modal isOpen={!!form} onClose={() => setForm(null)} title={form?.id ? 'Edit event' : 'Add event'} size="large">
        {form && (
          <div className="wct-form">
            <ImagePick kind="thumb" url={form.imageUrl} fallback="Image" onError={(m) => err({ message: m })}
              onUploaded={(id, url) => setForm({ ...form, imageId: id, imageUrl: url })} onClear={() => setForm({ ...form, imageId: null, imageUrl: null })} />
            <div className="wct-form-two">
              <label><span>Title</span><input value={form.title} maxLength={100} onChange={(e) => setForm({ ...form, title: e.target.value })} placeholder="CodeBegun HackZen" /></label>
              <label><span>Type</span>
                <select value={form.type} onChange={(e) => setForm({ ...form, type: e.target.value as WcEvent['type'] })}>
                  <option value="hackathon">Hackathon</option><option value="workshop">Workshop</option><option value="other">Other event</option>
                </select>
              </label>
            </div>
            <label><span>Summary <em>({form.summary.length}/300)</em></span><input value={form.summary} maxLength={300} onChange={(e) => setForm({ ...form, summary: e.target.value })} placeholder="A 24-hour technical hackathon" /></label>
            <div className="wct-form-three">
              <label><span>Start date</span><input type="date" value={form.startDate} onChange={(e) => setForm({ ...form, startDate: e.target.value })} /></label>
              <label><span>End date <em>(optional)</em></span><input type="date" value={form.endDate} min={form.startDate || undefined} onChange={(e) => setForm({ ...form, endDate: e.target.value })} /></label>
              <label><span>Time <em>(optional)</em></span><input value={form.timeText} maxLength={60} onChange={(e) => setForm({ ...form, timeText: e.target.value })} placeholder="6:00 – 7:30 PM" /></label>
            </div>
            <div className="wct-form-three">
              <label><span>Mode</span>
                <select value={form.mode} onChange={(e) => setForm({ ...form, mode: e.target.value as WcEvent['mode'] })}>
                  <option value="online">Online</option><option value="offline">Offline</option><option value="hybrid">Hybrid</option>
                </select>
              </label>
              <label><span>Venue <em>(optional)</em></span><input value={form.venue} maxLength={120} onChange={(e) => setForm({ ...form, venue: e.target.value })} placeholder="College name, city" /></label>
              <label><span>Team size <em>(optional)</em></span><input value={form.teamSize} maxLength={40} onChange={(e) => setForm({ ...form, teamSize: e.target.value })} placeholder="Teams of 2–4" /></label>
            </div>
            <div className="wct-form-two">
              <label><span>Fee <em>(optional)</em></span><input value={form.feeText} maxLength={40} onChange={(e) => setForm({ ...form, feeText: e.target.value })} placeholder="Free" /></label>
              <LinesBox label={<>Prizes <em>(one per line)</em></>} value={form.prizes} onChange={(v) => setForm({ ...form, prizes: v })} rows={3} placeholder="1st: ₹10,000" />
            </div>
            <div className="wct-form-two">
              <label><span>Registration link <em>(optional)</em></span><input value={form.registerUrl} maxLength={500} onChange={(e) => setForm({ ...form, registerUrl: e.target.value })} placeholder="https://… or /workshops/ai-agent" /></label>
              <label><span>Event page link <em>(optional)</em></span><input value={form.pageUrl} maxLength={500} onChange={(e) => setForm({ ...form, pageUrl: e.target.value })} placeholder="/hackathons/hackzen" /></label>
            </div>
            <label className="wct-check"><input type="checkbox" checked={form.published} onChange={(e) => setForm({ ...form, published: e.target.checked })} /> Published — show on the website</label>
            <History items={form.history} />
            <FormActions saving={saving} onCancel={() => setForm(null)} onSave={save} />
          </div>
        )}
      </Modal>
    </section>
  );
};

/* ── Courses ───────────────────────────────────────────────────────────────────────────────── */

type CourseTab = 'card' | 'modules' | 'projects' | 'timeline' | 'faqs';

export const CoursesPane: React.FC<SectionPaneProps> = ({ data, reload, ok, err }) => {
  const { order, move, props } = useReorder<WcCourse>(data.courses, reorderOf('courses', reload, err));
  const [form, setForm] = useState<WcCourse | null>(null);
  const [ctab, setCtab] = useState<CourseTab>('card');
  const [adding, setAdding] = useState<{ key: string; name: string } | null>(null);
  const { saving, run } = useSaver(reload, ok, err);
  const save = async () => {
    if (!form) return;
    const { id, key, name, active, nextBatch, history, ...body } = form;
    if (await run(() => websiteSectionsApi.saveCourse(key, body))) setForm(null);
  };
  const upd = (p: Partial<WcCourse>) => form && setForm({ ...form, ...p });
  const listRow = <K extends 'modules' | 'projects' | 'timeline' | 'faqs'>(k: K, i: number, p: Partial<WcCourse[K][number]>) =>
    form && setForm({ ...form, [k]: (form[k] as any[]).map((x, j) => (j === i ? { ...x, ...p } : x)) } as WcCourse);
  const listMove = (k: 'modules' | 'projects' | 'timeline' | 'faqs', i: number, d: number) => {
    if (!form) return;
    const a = [...(form[k] as any[])]; const j = i + d;
    if (j < 0 || j >= a.length) return;
    [a[i], a[j]] = [a[j], a[i]];
    setForm({ ...form, [k]: a } as WcCourse);
  };
  const listDel = (k: 'modules' | 'projects' | 'timeline' | 'faqs', i: number) => form && setForm({ ...form, [k]: (form[k] as any[]).filter((_, j) => j !== i) } as WcCourse);
  const RowTools: React.FC<{ k: 'modules' | 'projects' | 'timeline' | 'faqs'; i: number; n: number }> = ({ k, i, n }) => (
    <div className="wct-card-actions">
      <ReorderButtons i={i} n={n} name={`item ${i + 1}`} move={(d) => listMove(k, i, d)} vertical />
      <span className="wct-grow" />
      <button className="wct-icon danger" onClick={() => listDel(k, i)} aria-label={`Remove item ${i + 1}`}><i className="fa-solid fa-trash" /></button>
    </div>
  );
  return (
    <section>
      <div className="wct-bar">
        <p className="wct-muted">Course cards and course pages. The next batch date comes from <Link to="/website-batches">Website Batches</Link>. Drag to change the order of the cards.</p>
        <button className="wct-btn ghost" onClick={() => setAdding({ key: '', name: '' })}><i className="fa-solid fa-plus" /> Add course</button>
      </div>
      <div className="wct-courses">
        {order.map((c, i) => (
          <article key={c.id} className={`wct-course ${c.published ? '' : 'off'}`} {...props(c.id)}>
            <div className="wct-student-flags">
              <StatusPill on={c.published && c.active} offText={c.active ? 'Draft' : 'Course off'} />
              {c.badge && <span className="wct-pill feat"><i className="fa-solid fa-crown" /> {c.badge}</span>}
            </div>
            <b className="wct-course-title">{c.title || c.name}</b>
            <code className="wct-key">{c.key}</code>
            {c.tags.length > 0 && <div className="wct-student-tags">{c.tags.slice(0, 5).map((t) => <span key={t}>{t}</span>)}</div>}
            <div className="wct-course-facts">
              {c.duration && <span><i className="fa-regular fa-calendar" /> {c.duration}</span>}
              {c.seatsText && <span><i className="fa-solid fa-users" /> {c.seatsText}</span>}
            </div>
            <div className="wct-course-fee">{c.oldFee && <s>{c.oldFee}</s>} <b>{c.fee || <em>No fee set</em>}</b></div>
            <div className={`wct-course-batch ${c.nextBatch ? '' : 'none'}`}>
              {c.nextBatch ? <>Next batch {c.nextBatch.displayDate} · {c.nextBatch.seatsLeft} seats</> : <>No upcoming batch in Website Batches</>}
            </div>
            <div className="wct-course-page">
              Course page: {c.modules.length} modules · {c.projects.length} projects · {c.faqs.length} FAQs
            </div>
            <div className="wct-card-actions">
              <ReorderButtons i={i} n={order.length} name={c.title || c.name} move={(d) => move(c.id, d)} />
              <span className="wct-grow" />
              <button className="wct-icon" onClick={() => run(() => websiteSectionsApi.saveCourse(c.key, { published: !c.published }), c.published ? 'Taken off the website.' : 'Published.')} aria-label={c.published ? `Unpublish ${c.name}` : `Publish ${c.name}`}><i className={`fa-solid ${c.published ? 'fa-eye-slash' : 'fa-eye'}`} /></button>
              <button className="wct-icon" onClick={() => { setForm({ ...c, title: c.title || c.name }); setCtab('card'); }} aria-label={`Edit ${c.name}`}><i className="fa-solid fa-pen" /></button>
            </div>
          </article>
        ))}
      </div>

      <Modal isOpen={!!adding} onClose={() => setAdding(null)} title="Add course" size="small">
        {adding && (
          <div className="wct-form">
            <label><span>Name</span><input value={adding.name} maxLength={120} onChange={(e) => setAdding({ ...adding, name: e.target.value })} placeholder="MERN Stack with AI" autoFocus /></label>
            <label><span>Key <em>(what the website sends, e.g. mern_stack)</em></span><input value={adding.key} maxLength={40} onChange={(e) => setAdding({ ...adding, key: e.target.value.toLowerCase().replace(/[^a-z0-9_]/g, '_') })} placeholder="mern_stack" /></label>
            <FormActions saving={saving} onCancel={() => setAdding(null)} label="Add course" onSave={async () => {
              if (!adding.key || !adding.name) return err({ message: 'Type the name and the key.' });
              if (await run(() => websiteSectionsApi.addCourse(adding), 'Course added. Fill in its card and publish it.')) setAdding(null);
            }} />
          </div>
        )}
      </Modal>

      <Modal isOpen={!!form} onClose={() => setForm(null)} title={form ? `${form.title || form.name}` : ''} size="large">
        {form && (
          <div className="wct-form">
            <div className="wct-tabs small" role="tablist">
              {([['card', 'Card'], ['modules', `Curriculum (${form.modules.length})`], ['projects', `Projects (${form.projects.length})`], ['timeline', `Placement timeline (${form.timeline.length})`], ['faqs', `FAQs (${form.faqs.length})`]] as [CourseTab, string][]).map(([k, l]) => (
                <button key={k} role="tab" aria-selected={ctab === k} className={`wct-tab ${ctab === k ? 'on' : ''}`} onClick={() => setCtab(k)}>{l}</button>
              ))}
            </div>
            {ctab === 'card' && (
              <>
                <div className="wct-form-two">
                  <label><span>Title on the website</span><input value={form.title} maxLength={120} onChange={(e) => upd({ title: e.target.value })} /></label>
                  <label><span>Badge <em>(optional)</em></span><input value={form.badge} maxLength={30} onChange={(e) => upd({ badge: e.target.value })} placeholder="Most Popular" /></label>
                </div>
                <label><span>Tagline <em>(optional)</em></span><input value={form.tagline} maxLength={240} onChange={(e) => upd({ tagline: e.target.value })} placeholder="145-day live course with 6 real projects" /></label>
                <div className="wct-form-three">
                  <label><span>Duration</span><input value={form.duration} maxLength={40} onChange={(e) => upd({ duration: e.target.value })} placeholder="145 Days" /></label>
                  <label><span>Mode</span><input value={form.mode} maxLength={60} onChange={(e) => upd({ mode: e.target.value })} placeholder="Online & Offline" /></label>
                  <label><span>Seats</span><input value={form.seatsText} maxLength={40} onChange={(e) => upd({ seatsText: e.target.value })} placeholder="Only 27 / Batch" /></label>
                </div>
                <div className="wct-form-two">
                  <label><span>Fee</span><input value={form.fee} maxLength={40} onChange={(e) => upd({ fee: e.target.value })} placeholder="₹35,000" /></label>
                  <label><span>Old fee, shown struck through <em>(optional)</em></span><input value={form.oldFee} maxLength={40} onChange={(e) => upd({ oldFee: e.target.value })} placeholder="₹1,55,000" /></label>
                </div>
                <div className="wct-form-two">
                  <LinesBox label={<>Skill chips <em>(one per line, up to 8)</em></>} value={form.tags} onChange={(v) => upd({ tags: v })} rows={4} placeholder={'Java\nSpring Boot\nReact'} />
                  <LinesBox label={<>Tools <em>(one per line)</em></>} value={form.tools} onChange={(v) => upd({ tools: v })} rows={4} placeholder={'Git\nDocker\nAWS'} />
                </div>
                <div className="wct-form-two">
                  <label><span>Course page link</span><input value={form.pageUrl} maxLength={300} onChange={(e) => upd({ pageUrl: e.target.value })} placeholder="/courses/java-full-stack" /></label>
                  <label><span>Brochure link <em>(optional)</em></span><input value={form.brochureUrl} maxLength={500} onChange={(e) => upd({ brochureUrl: e.target.value })} placeholder="/brochures/java.pdf" /></label>
                </div>
                <div className="wct-muted">Next batch: {form.nextBatch ? `${form.nextBatch.displayDate}, ${form.nextBatch.seatsLeft} seats` : 'none'} — set in <Link to="/website-batches">Website Batches</Link>.</div>
                <label className={`wct-check ${form.active ? '' : 'dim'}`}><input type="checkbox" checked={form.published} onChange={(e) => upd({ published: e.target.checked })} /> Published — show this course on the website{form.active ? '' : ' (switched off in Website Batches, so it stays hidden)'}</label>
              </>
            )}
            {ctab === 'modules' && (
              <>
                {form.modules.map((m, i) => (
                  <div key={i} className="wct-rowbox">
                    <div className="wct-form-two">
                      <label><span>Module {i + 1}</span><input value={m.title} maxLength={100} onChange={(e) => listRow('modules', i, { title: e.target.value })} placeholder="Core Java" /></label>
                      <label><span>Days <em>(optional)</em></span><input value={m.days} maxLength={30} onChange={(e) => listRow('modules', i, { days: e.target.value })} placeholder="Days 1–25" /></label>
                    </div>
                    <LinesBox label={<>Topics <em>(one per line)</em></>} value={m.topics} onChange={(v) => listRow('modules', i, { topics: v })} rows={3} />
                    <RowTools k="modules" i={i} n={form.modules.length} />
                  </div>
                ))}
                <button className="wct-btn ghost sm" onClick={() => upd({ modules: [...form.modules, { title: '', days: '', topics: [] }] })}><i className="fa-solid fa-plus" /> Add module</button>
              </>
            )}
            {ctab === 'projects' && (
              <>
                {form.projects.map((p, i) => (
                  <div key={i} className="wct-rowbox">
                    <label><span>Project {i + 1}</span><input value={p.title} maxLength={80} onChange={(e) => listRow('projects', i, { title: e.target.value })} placeholder="ShopKart" /></label>
                    <label><span>Description</span><textarea rows={2} value={p.description} maxLength={400} onChange={(e) => listRow('projects', i, { description: e.target.value })} /></label>
                    <LinesBox label={<>Tags <em>(one per line)</em></>} value={p.tags} onChange={(v) => listRow('projects', i, { tags: v })} rows={2} />
                    <RowTools k="projects" i={i} n={form.projects.length} />
                  </div>
                ))}
                <button className="wct-btn ghost sm" onClick={() => upd({ projects: [...form.projects, { title: '', description: '', tags: [] }] })}><i className="fa-solid fa-plus" /> Add project</button>
              </>
            )}
            {ctab === 'timeline' && (
              <>
                {form.timeline.map((t, i) => (
                  <div key={i} className="wct-rowbox">
                    <div className="wct-form-two">
                      <label><span>Day</span><input value={t.day} maxLength={20} onChange={(e) => listRow('timeline', i, { day: e.target.value })} placeholder="Day 30" /></label>
                      <label><span>Stage</span><input value={t.title} maxLength={80} onChange={(e) => listRow('timeline', i, { title: e.target.value })} placeholder="Resume & profile" /></label>
                    </div>
                    <LinesBox label={<>Points <em>(one per line)</em></>} value={t.points} onChange={(v) => listRow('timeline', i, { points: v })} rows={2} />
                    <RowTools k="timeline" i={i} n={form.timeline.length} />
                  </div>
                ))}
                <button className="wct-btn ghost sm" onClick={() => upd({ timeline: [...form.timeline, { day: '', title: '', points: [] }] })}><i className="fa-solid fa-plus" /> Add stage</button>
              </>
            )}
            {ctab === 'faqs' && (
              <>
                {form.faqs.map((f, i) => (
                  <div key={i} className="wct-rowbox">
                    <label><span>Question {i + 1}</span><input value={f.q} maxLength={200} onChange={(e) => listRow('faqs', i, { q: e.target.value })} /></label>
                    <label><span>Answer</span><textarea rows={3} value={f.a} maxLength={1500} onChange={(e) => listRow('faqs', i, { a: e.target.value })} /></label>
                    <RowTools k="faqs" i={i} n={form.faqs.length} />
                  </div>
                ))}
                <button className="wct-btn ghost sm" onClick={() => upd({ faqs: [...form.faqs, { q: '', a: '' }] })}><i className="fa-solid fa-plus" /> Add FAQ</button>
              </>
            )}
            <History items={form.history} />
            <FormActions saving={saving} onCancel={() => setForm(null)} onSave={save} />
          </div>
        )}
      </Modal>
    </section>
  );
};

/* ── Testimonials ──────────────────────────────────────────────────────────────────────────── */

type TestimonialForm = { id?: string; name: string; thumbId: string | null; thumbUrl: string | null; videoUrl: string; companyId: string; packageLpa: string;
  label: string; courseKey: string; quote: string; consent: boolean; published: boolean; history?: WcHistory[] };

export const TestimonialsPane: React.FC<SectionPaneProps> = ({ data, reload, ok, err }) => {
  const { order, move, props } = useReorder<WcTestimonial>(data.testimonials, reorderOf('testimonials', reload, err));
  const [form, setForm] = useState<TestimonialForm | null>(null);
  const [play, setPlay] = useState<WcTestimonial | null>(null);
  const { saving, run } = useSaver(reload, ok, err);
  const canPublish = !!form && form.consent && !!form.videoUrl.trim();
  const save = async () => {
    if (!form) return;
    if (!form.name.trim()) return err({ message: "Type the student's name." });
    const { id, history, thumbUrl, ...rest } = form;
    const body = { ...rest, companyId: rest.companyId || null, published: rest.published && canPublish };
    if (await run(() => (id ? websiteSectionsApi.update('testimonials', id, body) : websiteSectionsApi.create('testimonials', body)))) setForm(null);
  };
  return (
    <section>
      <div className="wct-bar">
        <p className="wct-muted">The “Hear from our students” videos. Paste the video's embed link (Bunny, YouTube or Vimeo) and upload a still for the card. A video needs the student's consent to be published.</p>
        <button className="wct-btn primary" onClick={() => setForm({ name: '', thumbId: null, thumbUrl: null, videoUrl: '', companyId: '', packageLpa: '', label: '', courseKey: '', quote: '', consent: false, published: false })}><i className="fa-solid fa-plus" /> Add video</button>
      </div>
      {order.length === 0 ? <div className="wct-none">No videos yet.</div> : (
        <div className="wct-videos">
          {order.map((t, i) => (
            <article key={t.id} className={`wct-video ${t.published ? '' : 'off'}`} {...props(t.id)}>
              <button className="wct-video-thumb" onClick={() => t.videoUrl && setPlay(t)} aria-label={`Play ${t.name}'s video`}>
                {t.thumbUrl ? <img src={t.thumbUrl} alt="" /> : <span>{initials(t.name)}</span>}
                {t.videoUrl && <i className="fa-solid fa-circle-play" />}
              </button>
              <div className="wct-video-body">
                <div className="wct-student-flags">
                  <StatusPill on={t.published} />
                  {!t.consent && <span className="wct-pill warn">No consent</span>}
                  {!t.videoUrl && <span className="wct-pill warn">No video link</span>}
                </div>
                <b>{t.name}</b>
                <span className="wct-muted">{t.company ? `${t.company.name}${t.package ? ` · ${t.package.text}` : ''}` : t.label || '—'}</span>
                <div className="wct-card-actions">
                  <ReorderButtons i={i} n={order.length} name={t.name} move={(d) => move(t.id, d)} />
                  <span className="wct-grow" />
                  <button className="wct-icon" disabled={!t.published && (!t.consent || !t.videoUrl)} title={!t.published && !t.consent ? 'Tick consent first' : t.published ? 'Unpublish' : 'Publish'}
                    onClick={() => run(() => websiteSectionsApi.update('testimonials', t.id, { published: !t.published }), t.published ? 'Taken off the website.' : 'Published.')}
                    aria-label={t.published ? `Unpublish ${t.name}` : `Publish ${t.name}`}><i className={`fa-solid ${t.published ? 'fa-eye-slash' : 'fa-eye'}`} /></button>
                  <button className="wct-icon" onClick={() => setForm({ ...t, companyId: t.companyId || '', packageLpa: t.packageLpa === null ? '' : String(t.packageLpa) })} aria-label={`Edit ${t.name}`}><i className="fa-solid fa-pen" /></button>
                  <button className="wct-icon danger" onClick={() => confirmRemove(`${t.name}'s video`, () => websiteSectionsApi.remove('testimonials', t.id), reload, ok, err)} aria-label={`Remove ${t.name}`}><i className="fa-solid fa-trash" /></button>
                </div>
              </div>
            </article>
          ))}
        </div>
      )}
      <Modal isOpen={!!play} onClose={() => setPlay(null)} title={play ? `${play.name}` : ''} size="large">
        {play && <div className="wct-player"><iframe src={play.videoUrl.replace('autoplay=true', 'autoplay=false')} title={`${play.name}'s video`} allow="encrypted-media; picture-in-picture" allowFullScreen /></div>}
      </Modal>
      <Modal isOpen={!!form} onClose={() => setForm(null)} title={form?.id ? 'Edit video' : 'Add video'} size="large">
        {form && (
          <div className="wct-form">
            <ImagePick kind="thumb" url={form.thumbUrl} fallback={initials(form.name) || 'Still'} onError={(m) => err({ message: m })}
              onUploaded={(id, url) => setForm({ ...form, thumbId: id, thumbUrl: url })} onClear={() => setForm({ ...form, thumbId: null, thumbUrl: null })} />
            <div className="wct-form-two">
              <label><span>Name</span><input value={form.name} maxLength={60} onChange={(e) => setForm({ ...form, name: e.target.value })} /></label>
              <label><span>Video embed link</span><input value={form.videoUrl} maxLength={500} onChange={(e) => setForm({ ...form, videoUrl: e.target.value })} placeholder="https://iframe.mediadelivery.net/embed/…" /></label>
            </div>
            <div className="wct-form-three">
              <label><span>Company <em>(optional)</em></span>
                <select value={form.companyId} onChange={(e) => setForm({ ...form, companyId: e.target.value })}>
                  <option value="">— None —</option>
                  {data.companies.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
                </select>
              </label>
              <label><span>Package (LPA) <em>(optional)</em></span><input type="number" min={0} max={500} step={0.1} value={form.packageLpa} onChange={(e) => setForm({ ...form, packageLpa: e.target.value })} /></label>
              <label><span>Label when no company</span><input value={form.label} maxLength={40} onChange={(e) => setForm({ ...form, label: e.target.value })} placeholder="Student Review" /></label>
            </div>
            <div className="wct-form-two">
              <label><span>Course <em>(optional)</em></span>
                <select value={form.courseKey} onChange={(e) => setForm({ ...form, courseKey: e.target.value })}>
                  <option value="">— Not set —</option>
                  {data.courses.map((c) => <option key={c.key} value={c.key}>{c.name}</option>)}
                </select>
              </label>
              <label><span>Quote <em>(optional, {form.quote.length}/200)</em></span><input value={form.quote} maxLength={200} onChange={(e) => setForm({ ...form, quote: e.target.value })} /></label>
            </div>
            <div className="wct-publish">
              <label className="wct-check strong"><input type="checkbox" checked={form.consent} onChange={(e) => setForm({ ...form, consent: e.target.checked, published: e.target.checked ? form.published : false })} /> Student agreed to be shown on the website</label>
              <label className={`wct-check ${canPublish ? '' : 'dim'}`}><input type="checkbox" disabled={!canPublish} checked={form.published && canPublish} onChange={(e) => setForm({ ...form, published: e.target.checked })} /> Published — show on the website</label>
              {!canPublish && <small>{!form.consent ? 'Tick the consent box to publish.' : 'Add the video link to publish.'}</small>}
            </div>
            <History items={form.history} />
            <FormActions saving={saving} onCancel={() => setForm(null)} onSave={save} />
          </div>
        )}
      </Modal>
    </section>
  );
};

/* ── Trainers ──────────────────────────────────────────────────────────────────────────────── */

type TrainerForm = Omit<WcTrainer, 'id' | 'history'> & { id?: string; history?: WcHistory[] };

export const TrainersPane: React.FC<SectionPaneProps> = ({ data, reload, ok, err }) => {
  const { order, move, props } = useReorder<WcTrainer>(data.trainers, reorderOf('trainers', reload, err));
  const [form, setForm] = useState<TrainerForm | null>(null);
  const { saving, run } = useSaver(reload, ok, err);
  const save = async () => {
    if (!form) return;
    if (!form.name.trim()) return err({ message: "Type the trainer's name." });
    const { id, history, photoUrl, ...body } = form;
    if (await run(() => (id ? websiteSectionsApi.update('trainers', id, body) : websiteSectionsApi.create('trainers', body)))) setForm(null);
  };
  return (
    <section>
      <div className="wct-bar">
        <p className="wct-muted">The mentors your website shows. Drag to change the order.</p>
        <button className="wct-btn primary" onClick={() => setForm({ name: '', photoId: null, photoUrl: null, title: '', company: '', experience: '', skills: [], linkedin: '', bio: '', published: true })}><i className="fa-solid fa-plus" /> Add trainer</button>
      </div>
      {order.length === 0 ? <div className="wct-none">No trainers yet.</div> : (
        <div className="wct-trainers">
          {order.map((t, i) => (
            <article key={t.id} className={`wct-trainer ${t.published ? '' : 'off'}`} {...props(t.id)}>
              <div className="wct-student-flags"><StatusPill on={t.published} /></div>
              <div className="wct-trainer-photo">{t.photoUrl ? <img src={t.photoUrl} alt="" /> : <span>{initials(t.name)}</span>}</div>
              <b>{t.name}</b>
              <span className="wct-muted">{t.title}</span>
              <div className="wct-student-tags">{t.company && <span>{t.company}</span>}{t.experience && <span>{t.experience}</span>}</div>
              <div className="wct-card-actions">
                <ReorderButtons i={i} n={order.length} name={t.name} move={(d) => move(t.id, d)} />
                <span className="wct-grow" />
                <button className="wct-icon" onClick={() => run(() => websiteSectionsApi.update('trainers', t.id, { published: !t.published }), t.published ? 'Taken off the website.' : 'Published.')} aria-label={t.published ? `Unpublish ${t.name}` : `Publish ${t.name}`}><i className={`fa-solid ${t.published ? 'fa-eye-slash' : 'fa-eye'}`} /></button>
                <button className="wct-icon" onClick={() => setForm({ ...t })} aria-label={`Edit ${t.name}`}><i className="fa-solid fa-pen" /></button>
                <button className="wct-icon danger" onClick={() => confirmRemove(t.name, () => websiteSectionsApi.remove('trainers', t.id), reload, ok, err)} aria-label={`Remove ${t.name}`}><i className="fa-solid fa-trash" /></button>
              </div>
            </article>
          ))}
        </div>
      )}
      <Modal isOpen={!!form} onClose={() => setForm(null)} title={form?.id ? 'Edit trainer' : 'Add trainer'} size="large">
        {form && (
          <div className="wct-form">
            <ImagePick kind="photo" url={form.photoUrl} fallback={initials(form.name) || 'Photo'} onError={(m) => err({ message: m })}
              onUploaded={(id, url) => setForm({ ...form, photoId: id, photoUrl: url })} onClear={() => setForm({ ...form, photoId: null, photoUrl: null })} />
            <div className="wct-form-two">
              <label><span>Name</span><input value={form.name} maxLength={60} onChange={(e) => setForm({ ...form, name: e.target.value })} /></label>
              <label><span>Title</span><input value={form.title} maxLength={60} onChange={(e) => setForm({ ...form, title: e.target.value })} placeholder="Tech Lead" /></label>
            </div>
            <div className="wct-form-three">
              <label><span>Company</span><input value={form.company} maxLength={60} onChange={(e) => setForm({ ...form, company: e.target.value })} placeholder="Ex-Flipkart" /></label>
              <label><span>Experience</span><input value={form.experience} maxLength={20} onChange={(e) => setForm({ ...form, experience: e.target.value })} placeholder="12 yrs" /></label>
              <label><span>LinkedIn <em>(optional)</em></span><input value={form.linkedin} maxLength={300} onChange={(e) => setForm({ ...form, linkedin: e.target.value })} placeholder="https://www.linkedin.com/in/…" /></label>
            </div>
            <div className="wct-form-two">
              <LinesBox label={<>Skills <em>(one per line, optional)</em></>} value={form.skills} onChange={(v) => setForm({ ...form, skills: v })} rows={3} />
              <label><span>Short bio <em>(optional, {form.bio.length}/400)</em></span><textarea rows={3} value={form.bio} maxLength={400} onChange={(e) => setForm({ ...form, bio: e.target.value })} /></label>
            </div>
            <label className="wct-check"><input type="checkbox" checked={form.published} onChange={(e) => setForm({ ...form, published: e.target.checked })} /> Published — show on the website</label>
            <History items={form.history} />
            <FormActions saving={saving} onCancel={() => setForm(null)} onSave={save} />
          </div>
        )}
      </Modal>
    </section>
  );
};

/* ── Site settings ─────────────────────────────────────────────────────────────────────────── */

export const SitePane: React.FC<SectionPaneProps> = ({ data, reload, ok, err }) => {
  const [bar, setBar] = useState(data.settings.topBar);
  const { saving, run } = useSaver(reload, ok, err);
  return (
    <section>
      <div className="wct-panel wct-form">
        <div className="wct-subhead"><b>Top announcement bar</b></div>
        <div className={`wct-barpreview ${bar.enabled ? '' : 'off'}`}>
          <i className="fa-solid fa-graduation-cap" /> <b>{bar.text || 'Your announcement'}</b> {bar.linkText && <u>{bar.linkText}</u>}
          {!bar.enabled && <em>Hidden on the website</em>}
        </div>
        <div className="wct-form-two">
          <label><span>Text <em>({bar.text.length}/140)</em></span><input value={bar.text} maxLength={140} onChange={(e) => setBar({ ...bar, text: e.target.value })} placeholder="2026 B.Tech Graduate? If you are looking for placement" /></label>
          <div className="wct-form-two">
            <label><span>Link text</span><input value={bar.linkText} maxLength={40} onChange={(e) => setBar({ ...bar, linkText: e.target.value })} placeholder="Click here →" /></label>
            <label><span>Link</span><input value={bar.url} maxLength={500} onChange={(e) => setBar({ ...bar, url: e.target.value })} placeholder="/placements-2026" /></label>
          </div>
        </div>
        <label className="wct-check"><input type="checkbox" checked={bar.enabled} onChange={(e) => setBar({ ...bar, enabled: e.target.checked })} /> Show the bar on the website</label>
        <History items={data.settings.history} />
        <div className="wct-form-actions"><button className="wct-btn primary" disabled={saving} onClick={() => run(() => websiteSectionsApi.saveSettings({ topBar: bar }))}>{saving ? 'Saving…' : 'Save top bar'}</button></div>
      </div>
      <div className="wct-subhead wct-gap"><b>Home page numbers</b></div>
      <NumbersEditor stats={data.settings.stats} section="home" reload={reload} ok={ok} err={err} sample={['4 hrs', 'Daily training']}
        blurb={<>The counters at the top of your home page, e.g. <b>60+</b> Company network.</>}
        empty="No home page numbers yet." />
      <p className="wct-muted wct-gap">The next batch date and seats in the top bar are set in <Link to="/website-batches">Website Batches</Link>.</p>
    </section>
  );
};

