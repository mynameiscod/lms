import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { websiteBatchApi, WebsiteBatchRow, WebsiteCourseRow } from '../../api';
import { Modal } from '../../components/common';
import './WebsiteBatches.css';

/**
 * Website Batches (2026-11-26): the next batch date and seats left your public website shows — the
 * top bar on every page and each course page. Staff type the numbers; the website shows a change
 * within about a minute. A course moves to its next batch when seats reach 0 or on the start date.
 */

type Overview = Awaited<ReturnType<typeof websiteBatchApi.overview>>;
type CourseCard = Overview['courses'][number];
interface Form { id?: string; courseKey: string; startDate: string; seatsLeft: string; mode: string; showOnWebsite: boolean; history?: WebsiteBatchRow['history'] }

const STATE_LABEL: Record<WebsiteBatchRow['state'], string> = {
  live: 'Live on website', queued: 'Next in line', full: 'Full (0 seats)', hidden: 'Hidden', started: 'Started — not shown',
};
const tomorrow = (today: string) => new Date(Date.parse(`${today}T00:00:00Z`) + 86_400_000).toISOString().slice(0, 10);
const fmtWhen = (iso: string) => new Date(iso).toLocaleString('en-IN', { day: 'numeric', month: 'short', hour: 'numeric', minute: '2-digit' });
const daysText = (n: number) => (n === 1 ? 'tomorrow' : `in ${n} days`);

const WebsiteBatches: React.FC = () => {
  const [data, setData] = useState<Overview | null>(null);
  const [loading, setLoading] = useState(true);
  const [msg, setMsg] = useState<{ type: 'ok' | 'err'; text: string } | null>(null);
  const [form, setForm] = useState<Form | null>(null);
  const [saving, setSaving] = useState(false);
  const [busyId, setBusyId] = useState('');
  const [coursesOpen, setCoursesOpen] = useState(false);
  const [newCourse, setNewCourse] = useState({ key: '', name: '' });

  const load = useCallback(async () => {
    try { setData(await websiteBatchApi.overview()); }
    catch (e: any) { setMsg({ type: 'err', text: e.message || 'Could not load website batches' }); }
    finally { setLoading(false); }
  }, []);
  useEffect(() => { load(); }, [load]);

  const active = useMemo(() => (data?.courses || []).filter((c) => c.active), [data]);
  const commonLive = useMemo(() => data?.common.batches.find((b) => b.id === data.common.live) || null, [data]);
  // With no common date, the website's top bar falls back to the soonest course batch.
  const fallback = useMemo(() => {
    const lives = active.map((c) => ({ c, b: c.batches.find((b) => b.id === c.live) })).filter((x) => x.b) as { c: CourseCard; b: WebsiteBatchRow }[];
    return lives.sort((x, y) => x.b.startDate.localeCompare(y.b.startDate) || y.b.seatsLeft - x.b.seatsLeft)[0] || null;
  }, [active]);

  const openNew = (courseKey = 'common') => setForm({ courseKey, startDate: data ? tomorrow(data.today) : '', seatsLeft: '', mode: '', showOnWebsite: true });
  const openEdit = (b: WebsiteBatchRow) => setForm({ id: b.id, courseKey: b.courseKey, startDate: b.startDate, seatsLeft: String(b.seatsLeft), mode: b.mode, showOnWebsite: b.showOnWebsite, history: b.history });

  const save = async () => {
    if (!form) return;
    const seats = Number(form.seatsLeft);
    if (!form.courseKey) return setMsg({ type: 'err', text: 'Pick a course.' });
    if (!form.startDate) return setMsg({ type: 'err', text: 'Pick a start date.' });
    if (form.seatsLeft.trim() === '' || !Number.isInteger(seats) || seats < 0) return setMsg({ type: 'err', text: 'Seats left must be a whole number, 0 or more.' });
    setSaving(true); setMsg(null);
    try {
      const body = { courseKey: form.courseKey, startDate: form.startDate, seatsLeft: seats, mode: form.mode, showOnWebsite: form.showOnWebsite };
      if (form.id) await websiteBatchApi.update(form.id, body); else await websiteBatchApi.create(body);
      setForm(null);
      setMsg({ type: 'ok', text: 'Saved. The website shows it within about a minute.' });
      await load();
    } catch (e: any) { setMsg({ type: 'err', text: e.message || 'Could not save' }); }
    finally { setSaving(false); }
  };

  const bump = async (b: WebsiteBatchRow, delta: number) => {
    const next = Math.max(0, b.seatsLeft + delta);
    if (next === b.seatsLeft) return;
    if (next === 0 && !window.confirm('Set seats left to 0? The website will move to this course\'s next batch.')) return;
    setBusyId(b.id); setMsg(null);
    try { await websiteBatchApi.update(b.id, { seatsLeft: next }); await load(); }
    catch (e: any) { setMsg({ type: 'err', text: e.message || 'Could not save' }); }
    finally { setBusyId(''); }
  };

  const remove = async (b: WebsiteBatchRow) => {
    if (!window.confirm(`Remove the batch starting ${b.displayDate}?`)) return;
    setBusyId(b.id); setMsg(null);
    try { await websiteBatchApi.remove(b.id); await load(); setMsg({ type: 'ok', text: 'Batch removed.' }); }
    catch (e: any) { setMsg({ type: 'err', text: e.message || 'Could not remove' }); }
    finally { setBusyId(''); }
  };

  const saveCourse = async (body: { id?: string; key?: string; name?: string; active?: boolean }) => {
    setMsg(null);
    try { await websiteBatchApi.saveCourse(body); await load(); if (!body.id) setNewCourse({ key: '', name: '' }); }
    catch (e: any) { setMsg({ type: 'err', text: e.message || 'Could not save the course' }); }
  };

  return (
    <div className="wbt-page">
      <div className="wbt-head">
        <div>
          <h1>Website Batches</h1>
          <p>The next batch date and seats left your website shows — the top bar on every page and each course page. Changes appear on the website within about a minute.</p>
        </div>
        <div className="wbt-head-actions">
          <button className="wbt-btn ghost" onClick={() => setCoursesOpen(true)}><i className="fa-solid fa-list" /> Courses</button>
          <button className="wbt-btn primary" onClick={() => openNew(active[0]?.key || 'common')}><i className="fa-solid fa-plus" /> Add batch</button>
        </div>
      </div>

      {msg && <div className={`wbt-alert ${msg.type}`} role="status"><span>{msg.text}</span><button onClick={() => setMsg(null)} aria-label="Close">✕</button></div>}

      {!loading && data && (
        <section className="wbt-topcard">
          <div className="wbt-topcard-head">
            <div>
              <div className="wbt-topbar-label">Top bar — home page and every page</div>
              <h2>Common batch date and seats</h2>
            </div>
            <button className="wbt-btn light sm" onClick={() => openNew('common')}><i className="fa-solid fa-plus" /> Common date</button>
          </div>
          {commonLive ? (
            <div className="wbt-topcard-live">
              <div>
                <div className="wbt-topbar-text"><b>Next Batch</b> · Starts {commonLive.displayDate} ({daysText(commonLive.daysLeft)}) · <b>Only {commonLive.seatsLeft} seats left</b></div>
                {commonLive.history[0] && <div className="wbt-topcard-muted">Last change {fmtWhen(commonLive.history[0].at)}{commonLive.history[0].byName ? ` by ${commonLive.history[0].byName}` : ''}</div>}
              </div>
              <div className="wbt-topcard-actions">
                <div className="wbt-seats light" aria-label="Seats left">
                  <button onClick={() => bump(commonLive, -1)} disabled={busyId === commonLive.id} aria-label="One seat less">−</button>
                  <div><b>{commonLive.seatsLeft}</b><span>seats left</span></div>
                  <button onClick={() => bump(commonLive, +1)} disabled={busyId === commonLive.id} aria-label="One seat more">+</button>
                </div>
                <button className="wbt-btn light sm" onClick={() => openEdit(commonLive)}><i className="fa-solid fa-pen" /> Edit</button>
              </div>
            </div>
          ) : (
            <div className="wbt-topcard-none">
              No common date set — the top bar now shows the soonest course batch: {fallback ? <b>{fallback.c.name} · {fallback.b.displayDate} · {fallback.b.seatsLeft} seats</b> : <b>nothing (the bar is hidden)</b>}.{' '}
              <button className="wbt-link light" onClick={() => openNew('common')}>Set a common date</button>
            </div>
          )}
          {data.common.batches.filter((b) => b.id !== data.common.live).length > 0 && (
            <ul className="wbt-list light">
              {data.common.batches.filter((b) => b.id !== data.common.live).map((b) => (
                <li key={b.id} className={`wbt-row ${b.state}`}>
                  <div className="wbt-row-main"><b>{b.displayDate}</b><span>{b.seatsLeft} seats</span></div>
                  <span className={`wbt-pill ${b.state}`}>{STATE_LABEL[b.state]}</span>
                  <div className="wbt-row-actions">
                    <button className="wbt-icon" onClick={() => openEdit(b)} aria-label={`Edit common date ${b.displayDate}`}><i className="fa-solid fa-pen" /></button>
                    <button className="wbt-icon danger" onClick={() => remove(b)} disabled={busyId === b.id} aria-label={`Remove common date ${b.displayDate}`}><i className="fa-solid fa-trash" /></button>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </section>
      )}

      {!loading && <h3 className="wbt-section-title">Course pages — each course's own batch</h3>}

      {loading ? <div className="wbt-empty">Loading…</div> : (
        <div className="wbt-grid">
          {active.map((c) => {
            const live = c.batches.find((b) => b.id === c.live);
            const others = c.batches.filter((b) => b.id !== c.live);
            return (
              <section key={c.key} className="wbt-card">
                <div className="wbt-card-head">
                  <div><h2>{c.name}</h2><code>{c.key}</code></div>
                  <button className="wbt-btn ghost sm" onClick={() => openNew(c.key)}><i className="fa-solid fa-plus" /> Batch</button>
                </div>

                {live ? (
                  <div className="wbt-live">
                    <div className="wbt-live-tag">● Live on website</div>
                    <div className="wbt-live-row">
                      <div>
                        <div className="wbt-live-date">Starts {live.displayDate}</div>
                        <div className="wbt-muted">{daysText(live.daysLeft)}{live.mode ? ` · ${live.mode}` : ''}</div>
                      </div>
                      <div className="wbt-seats" aria-label="Seats left">
                        <button onClick={() => bump(live, -1)} disabled={busyId === live.id} aria-label="One seat less">−</button>
                        <div><b>{live.seatsLeft}</b><span>seats left</span></div>
                        <button onClick={() => bump(live, +1)} disabled={busyId === live.id} aria-label="One seat more">+</button>
                      </div>
                    </div>
                    <div className="wbt-live-actions">
                      <button className="wbt-btn ghost sm" onClick={() => openEdit(live)}><i className="fa-solid fa-pen" /> Edit</button>
                      {live.history[0] && <span className="wbt-muted">Last change {fmtWhen(live.history[0].at)}{live.history[0].byName ? ` by ${live.history[0].byName}` : ''}</span>}
                    </div>
                  </div>
                ) : (
                  <div className="wbt-none">Nothing on the website for this course — the course page hides its batch section. <button className="wbt-link" onClick={() => openNew(c.key)}>Add a batch</button></div>
                )}

                {others.length > 0 && (
                  <ul className="wbt-list">
                    {others.map((b) => (
                      <li key={b.id} className={`wbt-row ${b.state}`}>
                        <div className="wbt-row-main">
                          <b>{b.displayDate}</b>
                          <span className="wbt-muted">{b.seatsLeft} seats{b.mode ? ` · ${b.mode}` : ''}</span>
                        </div>
                        <span className={`wbt-pill ${b.state}`}>{STATE_LABEL[b.state]}</span>
                        <div className="wbt-row-actions">
                          <button className="wbt-icon" onClick={() => openEdit(b)} aria-label={`Edit batch ${b.displayDate}`}><i className="fa-solid fa-pen" /></button>
                          <button className="wbt-icon danger" onClick={() => remove(b)} disabled={busyId === b.id} aria-label={`Remove batch ${b.displayDate}`}><i className="fa-solid fa-trash" /></button>
                        </div>
                      </li>
                    ))}
                  </ul>
                )}
              </section>
            );
          })}
        </div>
      )}

      {!loading && (
        <div className="wbt-help">
          <b>How the website chooses:</b> the top bar shows the common date; each course page shows its own course. In both, the earliest entry that is shown, has seats left and starts after today wins. Set seats to 0 when a batch is full, or let the start date pass — the website moves to the next batch by itself. Add the next two or three batches ahead so a course is never empty.
        </div>
      )}

      <Modal isOpen={!!form} onClose={() => setForm(null)} title={form?.id ? 'Edit website batch' : 'Add website batch'} size="medium">
        {form && (
          <div className="wbt-form">
            <label><span>Course</span>
              <select value={form.courseKey} onChange={(e) => setForm({ ...form, courseKey: e.target.value })}>
                <option value="common">Top bar — common date (home page, every page)</option>
                {active.map((c) => <option key={c.key} value={c.key}>{c.name}</option>)}
              </select>
            </label>
            <div className="wbt-form-two">
              <label><span>Start date</span>
                <input type="date" value={form.startDate} onChange={(e) => setForm({ ...form, startDate: e.target.value })} />
              </label>
              <label><span>Seats left</span>
                <input type="number" min={0} step={1} inputMode="numeric" value={form.seatsLeft} onChange={(e) => setForm({ ...form, seatsLeft: e.target.value })} placeholder="e.g. 25" />
              </label>
            </div>
            <label><span>Mode <em>(optional)</em></span>
              <input value={form.mode} maxLength={80} onChange={(e) => setForm({ ...form, mode: e.target.value })} placeholder="e.g. Offline · Hyderabad" />
            </label>
            <label className="wbt-check"><input type="checkbox" checked={form.showOnWebsite} onChange={(e) => setForm({ ...form, showOnWebsite: e.target.checked })} /> Show on website</label>
            {data && form.startDate && form.startDate <= data.today && <div className="wbt-warn">This date is today or earlier, so the website won't show this batch.</div>}
            {form.seatsLeft.trim() === '0' && <div className="wbt-warn">0 seats left: the website will show the next {form.courseKey === 'common' ? 'common date' : 'batch of this course'} instead.</div>}
            {form.history && form.history.length > 0 && (
              <div className="wbt-history">
                <div className="wbt-history-title">Changes</div>
                <ul>{form.history.map((h, i) => <li key={i}><span className="wbt-muted">{fmtWhen(h.at)}{h.byName ? ` · ${h.byName}` : ''}</span> {h.change}</li>)}</ul>
              </div>
            )}
            <div className="wbt-form-actions">
              <button className="wbt-btn ghost" onClick={() => setForm(null)} disabled={saving}>Cancel</button>
              <button className="wbt-btn primary" onClick={save} disabled={saving}>{saving ? 'Saving…' : 'Save'}</button>
            </div>
          </div>
        )}
      </Modal>

      <Modal isOpen={coursesOpen} onClose={() => setCoursesOpen(false)} title="Website courses" size="medium">
        <div className="wbt-courses">
          <p className="wbt-muted">The courses your website has pages for. The key is what the website sends — give your website developer the key for each course page.</p>
          <ul>
            {(data?.courses || []).map((c: WebsiteCourseRow) => (
              <li key={c.id} className={c.active ? '' : 'off'}>
                <input defaultValue={c.name} aria-label={`Name of ${c.key}`} onBlur={(e) => { const v = e.target.value.trim(); if (v && v !== c.name) saveCourse({ id: c.id, name: v }); }} />
                <code>{c.key}</code>
                <label className="wbt-check"><input type="checkbox" checked={c.active} onChange={(e) => saveCourse({ id: c.id, active: e.target.checked })} /> On</label>
              </li>
            ))}
          </ul>
          <div className="wbt-add-course">
            <input placeholder="Key, e.g. mern_stack" value={newCourse.key} onChange={(e) => setNewCourse({ ...newCourse, key: e.target.value.toLowerCase().replace(/[^a-z0-9_]/g, '_') })} />
            <input placeholder="Name, e.g. MERN Stack with AI" value={newCourse.name} onChange={(e) => setNewCourse({ ...newCourse, name: e.target.value })} />
            <button className="wbt-btn primary sm" disabled={!newCourse.key || !newCourse.name} onClick={() => saveCourse(newCourse)}>Add</button>
          </div>
        </div>
      </Modal>
    </div>
  );
};

export default WebsiteBatches;
