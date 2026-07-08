import React, { useEffect, useMemo, useState } from 'react';
import { batchApi, userApi, courseApi, departmentApi } from '../../api';
import { Alert, Spinner } from '../../components/common';
import CourseSelect from '../../components/common/CourseSelect';
import { Batch, User } from '../../types';
import './BatchesPage.css';

interface Department { _id: string; name: string; code: string; }
interface Course { _id: string; title: string; code: string; }

const DAYS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];
const ABBR: Record<string, string> = { Monday: 'Mon', Tuesday: 'Tue', Wednesday: 'Wed', Thursday: 'Thu', Friday: 'Fri', Saturday: 'Sat', Sunday: 'Sun' };
const STEPS = ['Basic Details', 'Schedule', 'Instructors', 'Review'];
const PAGE_SIZE = 6;
const CARD_TINTS = ['blue', 'green', 'purple', 'orange', 'cyan', 'pink'];

type Timing = { day: string; startTime: string; endTime: string };

const fmtDate = (s?: string) => s ? new Date(s).toLocaleDateString('en-US', { month: 'short', day: '2-digit', year: 'numeric' }) : '';

const BatchesPage: React.FC = () => {
  const [batches, setBatches] = useState<Batch[]>([]);
  const [instructors, setInstructors] = useState<User[]>([]);
  const [courses, setCourses] = useState<Course[]>([]);
  const [departments, setDepartments] = useState<Department[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const [view, setView] = useState<'list' | 'wizard'>('list');
  const [step, setStep] = useState(0);
  const [editingBatch, setEditingBatch] = useState<Batch | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'inactive'>('all');
  const [page, setPage] = useState(1);

  const [form, setForm] = useState({
    name: '', courseId: '', departmentId: '', startDate: '', endDate: '',
    timings: [{ day: 'Monday', startTime: '10:00', endTime: '11:30' }] as Timing[],
    instructors: [] as string[], capacity: 30, holidays: [] as string[],
    // Content-pacing: which weekdays advance a curriculum Day (getDay nums 0=Sun..6=Sat).
    contentDays: [1, 2, 3, 4, 5] as number[],
    specialDays: [] as { date: string; type: string; label?: string }[],
  });

  useEffect(() => { fetchData(); }, []);

  const fetchData = async () => {
    try {
      setLoading(true);
      const [b, u, c, d] = await Promise.all([
        batchApi.getBatches(), userApi.getUsers(), courseApi.getCourses({ isActive: true }), departmentApi.list(),
      ]);
      setBatches(b.data || []);
      setCourses(c.data || []);
      setDepartments(d.data || []);
      setInstructors((u.data || []).filter((x: User) => ['INSTRUCTOR', 'TENANT_ADMIN', 'SUPER_ADMIN'].includes((x.role || '').toUpperCase())));
    } catch (err: any) { setError(err.message || 'Failed to fetch data'); }
    finally { setLoading(false); }
  };

  const calcEnd = (start: string) => start ? new Date(new Date(start).getTime() + 150 * 864e5).toISOString().split('T')[0] : '';

  const openCreate = () => {
    const today = new Date().toISOString().split('T')[0];
    setEditingBatch(null);
    setForm({ name: '', courseId: '', departmentId: '', startDate: today, endDate: calcEnd(today),
      timings: DAYS.slice(0, 5).map(day => ({ day, startTime: '10:00', endTime: '11:30' })), instructors: [], capacity: 30, holidays: [],
      contentDays: [1, 2, 3, 4, 5], specialDays: [] });
    setStep(0); setError(''); setView('wizard');
  };
  const openEdit = (batch: Batch) => {
    setEditingBatch(batch);
    setForm({
      name: batch.name,
      courseId: (batch as any).courseId?._id || (batch as any).courseId || '',
      departmentId: (batch as any).departmentId?._id || (batch as any).departmentId || '',
      startDate: batch.startDate.split('T')[0], endDate: batch.endDate.split('T')[0],
      timings: batch.timings.length ? batch.timings : [{ day: 'Monday', startTime: '10:00', endTime: '11:30' }],
      instructors: batch.instructors.map(i => i._id), capacity: batch.capacity || 30,
      holidays: (batch as any).holidays || [],
      contentDays: (() => {
        const off = new Set<number>(Array.isArray((batch as any).weeklyOffDays) && (batch as any).weeklyOffDays.length ? (batch as any).weeklyOffDays : [0, 6]);
        return [0, 1, 2, 3, 4, 5, 6].filter(d => !off.has(d));
      })(),
      specialDays: (batch as any).specialDays || [],
    });
    setStep(0); setError(''); setView('wizard');
  };
  const backToList = () => { setView('list'); setEditingBatch(null); };

  // Schedule helpers (7-day model)
  const dayOn = (day: string) => form.timings.some(t => t.day === day);
  const dayTiming = (day: string) => form.timings.find(t => t.day === day) || { day, startTime: '10:00', endTime: '11:30' };
  const toggleDay = (day: string) => setForm(f => ({ ...f, timings: dayOn(day) ? f.timings.filter(t => t.day !== day) : [...f.timings, { day, startTime: '10:00', endTime: '11:30' }] }));
  const setDayTime = (day: string, field: 'startTime' | 'endTime', value: string) =>
    setForm(f => ({ ...f, timings: f.timings.map(t => t.day === day ? { ...t, [field]: value } : t) }));
  const orderedTimings = useMemo(() => [...form.timings].sort((a, b) => DAYS.indexOf(a.day) - DAYS.indexOf(b.day)), [form.timings]);

  const toggleInstructor = (id: string) => setForm(f => ({ ...f, instructors: f.instructors.includes(id) ? f.instructors.filter(i => i !== id) : [...f.instructors, id] }));

  const courseTitle = (id: string) => courses.find(c => c._id === id)?.title || '';
  const deptName = (id: string) => departments.find(d => d._id === id)?.name || '';

  const canNext = () => {
    if (step === 0) return !!(form.name.trim() && form.capacity > 0 && form.courseId && form.startDate && form.endDate);
    if (step === 1) return form.timings.length > 0;
    return true;
  };

  const submit = async () => {
    if (!form.name || !form.startDate || !form.endDate || form.timings.length === 0) { setError('Please complete all required fields'); return; }
    try {
      setSubmitting(true); setError('');
      const { contentDays, ...rest } = form;
      const payload: any = {
        ...rest,
        weeklyOffDays: [0, 1, 2, 3, 4, 5, 6].filter(d => !contentDays.includes(d)),
        specialDays: form.specialDays.filter(s => /^\d{4}-\d{2}-\d{2}$/.test(s.date)),
      };
      if (editingBatch) { await batchApi.updateBatch(editingBatch._id, payload); setSuccess('Batch updated successfully'); }
      else { await batchApi.createBatch(payload); setSuccess('Batch created successfully'); }
      backToList(); fetchData();
    } catch (err: any) { setError(err.message || 'Operation failed'); }
    finally { setSubmitting(false); }
  };

  const handleDelete = async (batch: Batch) => {
    if (!window.confirm(`Delete batch "${batch.name}"?`)) return;
    try { setError(''); await batchApi.deleteBatch(batch._id); setSuccess('Batch deleted'); fetchData(); }
    catch (err: any) { setError(err.message || 'Failed to delete batch'); }
  };

  if (loading) return <Spinner fullScreen />;

  // ───────────────────── WIZARD ─────────────────────
  if (view === 'wizard') {
    const scheduleChips = orderedTimings.map(t => `${ABBR[t.day]} ${t.startTime} - ${t.endTime}`);
    return (
      <div className="bm-page">
        <button className="bm-back" onClick={backToList}>← Back to Batches</button>
        <h1 className="bm-title">{editingBatch ? 'Edit Batch' : 'Create New Batch'}</h1>
        <p className="bm-sub">Set up a {editingBatch ? '' : 'new '}batch with schedule and instructor details</p>

        {/* Stepper */}
        <div className="bm-stepper">
          {STEPS.map((label, i) => (
            <React.Fragment key={label}>
              <div className={`bm-step ${i === step ? 'active' : ''} ${i < step ? 'done' : ''}`}>
                <span className="bm-step-num">{i < step ? '✓' : i + 1}</span>
                <span className="bm-step-label">{label}</span>
              </div>
              {i < STEPS.length - 1 && <span className={`bm-step-line ${i < step ? 'done' : ''}`} />}
            </React.Fragment>
          ))}
        </div>

        {error && <Alert type="error" message={error} onClose={() => setError('')} />}

        <div className="bm-card bm-wizard-card">
          {/* Step 1 — Basic Details */}
          {step === 0 && (
            <>
              <h3 className="bm-section-title">Basic Information</h3>
              <div className="bm-grid2">
                <label className="bm-field"><span className="bm-label">Batch Name <b className="req">*</b></span>
                  <input className="bm-input" placeholder="e.g. Python Batch - Week 1" value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} /></label>
                <label className="bm-field"><span className="bm-label">Batch Size <b className="req">*</b></span>
                  <input className="bm-input" type="number" placeholder="e.g. 30" value={form.capacity || ''} onChange={e => setForm({ ...form, capacity: parseInt(e.target.value) || 0 })} /></label>
                <label className="bm-field"><span className="bm-label">Course <b className="req">*</b></span>
                  <CourseSelect
                    className="bm-input"
                    value={form.courseId}
                    onChange={id => setForm({ ...form, courseId: id })}
                    onCreated={c => setCourses(prev => [...prev, { _id: c._id, title: c.title, code: c.code || '' }])}
                  /></label>
                <label className="bm-field"><span className="bm-label">Department <span className="opt">(Optional)</span></span>
                  <select className="bm-input" value={form.departmentId} onChange={e => setForm({ ...form, departmentId: e.target.value })}>
                    <option value="">-- Select Department --</option>
                    {departments.map(d => <option key={d._id} value={d._id}>{d.name}{d.code ? ` (${d.code})` : ''}</option>)}
                  </select></label>
                <label className="bm-field"><span className="bm-label">Start Date <b className="req">*</b></span>
                  <input className="bm-input" type="date" value={form.startDate} onChange={e => setForm({ ...form, startDate: e.target.value, endDate: calcEnd(e.target.value) })} /></label>
                <label className="bm-field"><span className="bm-label">End Date <span className="opt">(Auto-calculated)</span> <b className="req">*</b></span>
                  <input className="bm-input" type="date" value={form.endDate} onChange={e => setForm({ ...form, endDate: e.target.value })} /></label>
                <label className="bm-field" style={{ gridColumn: '1 / -1' }}>
                  <span className="bm-label">Holidays <span className="opt">(these dates won't advance the curriculum "Today's Day")</span></span>
                  <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center' }}>
                    <input className="bm-input" type="date" style={{ maxWidth: 190 }}
                      onChange={e => { const v = e.target.value; if (v && !form.holidays.includes(v)) setForm({ ...form, holidays: [...form.holidays, v].sort() }); e.currentTarget.value = ''; }} />
                    {form.holidays.map(h => (
                      <span key={h} style={{ display: 'inline-flex', alignItems: 'center', gap: 6, background: '#eef2ff', color: '#4338ca', borderRadius: 16, padding: '4px 10px', fontSize: 13, fontWeight: 600 }}>
                        {h}
                        <button type="button" onClick={() => setForm({ ...form, holidays: form.holidays.filter(x => x !== h) })} style={{ border: 'none', background: 'none', color: '#6366f1', cursor: 'pointer', fontSize: 15, lineHeight: 1 }}>×</button>
                      </span>
                    ))}
                    {form.holidays.length === 0 && <span style={{ color: '#94a3b8', fontSize: 13 }}>No holidays added</span>}
                  </div>
                </label>
              </div>
            </>
          )}

          {/* Step 2 — Schedule */}
          {step === 1 && (
            <>
              <h3 className="bm-section-title">Class Timings</h3>
              <p className="bm-section-sub">Set the days and time for this batch</p>
              <div className="bm-days">
                {DAYS.map(day => {
                  const on = dayOn(day); const t = dayTiming(day);
                  return (
                    <div key={day} className={`bm-day-row ${on ? 'on' : ''}`}>
                      <label className="bm-day-check">
                        <input type="checkbox" checked={on} onChange={() => toggleDay(day)} />
                        <span>{day}</span>
                      </label>
                      <input className="bm-input time" type="time" value={t.startTime} disabled={!on} onChange={e => setDayTime(day, 'startTime', e.target.value)} />
                      <span className="bm-to">to</span>
                      <input className="bm-input time" type="time" value={t.endTime} disabled={!on} onChange={e => setDayTime(day, 'endTime', e.target.value)} />
                      <button type="button" className="bm-day-del" disabled={!on} onClick={() => on && toggleDay(day)} title="Remove">🗑️</button>
                    </div>
                  );
                })}
              </div>

              {/* Content pacing — which weekdays advance a curriculum Day */}
              <h3 className="bm-section-title" style={{ marginTop: 24 }}>Curriculum Day Pacing</h3>
              <p className="bm-section-sub">A curriculum "Day" advances only on these weekdays. Tick Saturday if this batch runs Saturday classes. Sunday is usually off.</p>
              <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                {([['Mon', 1], ['Tue', 2], ['Wed', 3], ['Thu', 4], ['Fri', 5], ['Sat', 6], ['Sun', 0]] as [string, number][]).map(([lbl, num]) => {
                  const on = form.contentDays.includes(num);
                  return (
                    <button key={num} type="button"
                      onClick={() => setForm(f => ({ ...f, contentDays: on ? f.contentDays.filter(d => d !== num) : [...f.contentDays, num] }))}
                      style={{ padding: '8px 14px', borderRadius: 10, border: `1.5px solid ${on ? '#6366f1' : '#e2e8f0'}`, background: on ? '#eef0fe' : '#fff', color: on ? '#4338ca' : '#64748b', fontWeight: 700, fontSize: 13, cursor: 'pointer' }}>
                      {on ? '✓ ' : ''}{lbl}
                    </button>
                  );
                })}
              </div>

              {/* Special (non-content) dates — mock interviews / events that skip a Day */}
              <h3 className="bm-section-title" style={{ marginTop: 24 }}>Special Days <span className="opt" style={{ fontWeight: 400 }}>(mock interview / event — skipped, does not consume a Day)</span></h3>
              <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center' }}>
                <input className="bm-input" type="date" style={{ maxWidth: 180 }} id="bm-special-date" />
                <select className="bm-input" style={{ maxWidth: 170 }} id="bm-special-type" defaultValue="mock_interview">
                  <option value="mock_interview">Mock Interview</option>
                  <option value="event">Event</option>
                  <option value="off">Off day</option>
                </select>
                <button type="button" className="bm-btn-ghost"
                  onClick={() => {
                    const dEl = document.getElementById('bm-special-date') as HTMLInputElement;
                    const tEl = document.getElementById('bm-special-type') as HTMLSelectElement;
                    const v = dEl?.value;
                    if (v && /^\d{4}-\d{2}-\d{2}$/.test(v) && !form.specialDays.some(s => s.date === v)) {
                      setForm(f => ({ ...f, specialDays: [...f.specialDays, { date: v, type: tEl.value }].sort((a, b) => a.date.localeCompare(b.date)) }));
                      dEl.value = '';
                    }
                  }}
                  style={{ padding: '9px 14px', borderRadius: 8, border: '1.5px solid #6366f1', background: '#fff', color: '#4338ca', fontWeight: 700, cursor: 'pointer' }}>+ Add</button>
              </div>
              <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginTop: 10 }}>
                {form.specialDays.length === 0 && <span style={{ color: '#94a3b8', fontSize: 13 }}>No special days added</span>}
                {form.specialDays.map(s => (
                  <span key={s.date} style={{ display: 'inline-flex', alignItems: 'center', gap: 6, background: '#fef3c7', color: '#92400e', borderRadius: 16, padding: '4px 10px', fontSize: 13, fontWeight: 600 }}>
                    {s.date} · {s.type === 'mock_interview' ? 'Mock' : s.type === 'event' ? 'Event' : 'Off'}
                    <button type="button" onClick={() => setForm(f => ({ ...f, specialDays: f.specialDays.filter(x => x.date !== s.date) }))} style={{ border: 'none', background: 'none', color: '#b45309', cursor: 'pointer', fontSize: 15, lineHeight: 1 }}>×</button>
                  </span>
                ))}
              </div>
            </>
          )}

          {/* Step 3 — Instructors */}
          {step === 2 && (
            <div className="bm-grid-instr">
              <div>
                <h3 className="bm-section-title">Assign Instructors</h3>
                <p className="bm-section-sub">Select one or more instructors for this batch</p>
                <div className="bm-instr-list">
                  {instructors.length === 0 ? <p className="bm-empty">No instructors available</p> :
                    instructors.map(i => (
                      <label key={i._id} className={`bm-instr ${form.instructors.includes(i._id) ? 'checked' : ''}`}>
                        <input type="checkbox" checked={form.instructors.includes(i._id)} onChange={() => toggleInstructor(i._id)} />
                        <span>{i.firstName} {i.lastName}</span>
                      </label>
                    ))}
                </div>
              </div>
              <div className="bm-summary">
                <h3 className="bm-section-title">Batch Summary</h3>
                <SummaryRows form={form} courseTitle={courseTitle} deptName={deptName} chips={scheduleChips} instructors={instructors} />
              </div>
            </div>
          )}

          {/* Step 4 — Review */}
          {step === 3 && (
            <>
              <h3 className="bm-section-title">Review &amp; Confirm</h3>
              <p className="bm-section-sub">Double-check the details, then create the batch</p>
              <div className="bm-summary review">
                <SummaryRows form={form} courseTitle={courseTitle} deptName={deptName} chips={scheduleChips} instructors={instructors} />
              </div>
            </>
          )}

          {/* Footer nav */}
          <div className="bm-wizard-foot">
            {step > 0 ? <button className="bm-btn" onClick={() => setStep(step - 1)}>← Back</button> : <span />}
            {step < STEPS.length - 1 ? (
              <button className="bm-btn primary" disabled={!canNext()} onClick={() => setStep(step + 1)}>Next: {STEPS[step + 1]} →</button>
            ) : (
              <button className="bm-btn primary" disabled={submitting} onClick={submit}>{submitting ? 'Saving…' : (editingBatch ? '✓ Update Batch' : '✓ Create Batch')}</button>
            )}
          </div>
        </div>
      </div>
    );
  }

  // ───────────────────── LIST ─────────────────────
  const filtered = batches.filter(b => {
    const q = search.trim().toLowerCase();
    const matchesQ = !q || b.name.toLowerCase().includes(q) || courseTitle((b as any).courseId?._id || (b as any).courseId).toLowerCase().includes(q);
    const matchesS = statusFilter === 'all' || (statusFilter === 'active' ? b.isActive : !b.isActive);
    return matchesQ && matchesS;
  });
  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const cur = Math.min(page, totalPages);
  const pageItems = filtered.slice((cur - 1) * PAGE_SIZE, cur * PAGE_SIZE);

  return (
    <div className="bm-page">
      <div className="bm-head">
        <div><h1 className="bm-title">Batch Management</h1><p className="bm-sub">Create and manage batches with schedules and instructors</p></div>
        <button className="bm-btn primary" onClick={openCreate}>+ Create Batch</button>
      </div>

      {error && <Alert type="error" message={error} onClose={() => setError('')} />}
      {success && <Alert type="success" message={success} onClose={() => setSuccess('')} />}

      <div className="bm-toolbar">
        <div className="bm-search"><span>🔍</span><input placeholder="Search batches…" value={search} onChange={e => { setSearch(e.target.value); setPage(1); }} /></div>
        <select className="bm-status" value={statusFilter} onChange={e => { setStatusFilter(e.target.value as any); setPage(1); }}>
          <option value="all">All Status</option><option value="active">Active</option><option value="inactive">Inactive</option>
        </select>
      </div>

      {filtered.length === 0 ? (
        <div className="bm-empty-card">No batches found. Create your first batch to get started.</div>
      ) : (
        <>
          <div className="bm-grid">
            {pageItems.map((batch, i) => {
              const tint = CARD_TINTS[(((cur - 1) * PAGE_SIZE) + i) % CARD_TINTS.length];
              const cId = (batch as any).courseId?._id || (batch as any).courseId;
              const cTitle = (batch as any).courseId?.title || courseTitle(cId);
              const ts = [...batch.timings].sort((a, b) => DAYS.indexOf(a.day) - DAYS.indexOf(b.day));
              const days = ts.map(t => ABBR[t.day] || t.day);
              const dayLabel = days.length ? (days.length > 2 ? `${days[0]} - ${days[days.length - 1]}` : days.join(', ')) : '—';
              const timeLabel = ts.length ? `${ts[0].startTime} - ${ts[0].endTime}` : '';
              const pct = batch.capacity ? Math.min(100, Math.round(((batch.enrolledCount || 0) / batch.capacity) * 100)) : 0;
              return (
                <div key={batch._id} className="bm-card bm-batch">
                  <div className="bm-batch-top">
                    <span className={`bm-batch-ic ${tint}`}>👥</span>
                    <div className="bm-batch-title">
                      <div className="bm-batch-name">{batch.name} <span className={`bm-badge ${batch.isActive ? 'active' : 'inactive'}`}>{batch.isActive ? 'Active' : 'Inactive'}</span></div>
                      {cTitle && <div className="bm-batch-course">{cTitle}</div>}
                      <div className="bm-batch-dates">{fmtDate(batch.startDate)} - {fmtDate(batch.endDate)}</div>
                    </div>
                    <div className="bm-batch-actions">
                      <button className="bm-icon-btn" onClick={() => openEdit(batch)} title="Edit">✏️</button>
                      <button className="bm-icon-btn del" onClick={() => handleDelete(batch)} title="Delete">🗑️</button>
                    </div>
                  </div>

                  <div className="bm-cap">
                    <div className="bm-cap-head"><span>🎟️ Capacity</span><b>{batch.enrolledCount || 0} / {batch.capacity}</b></div>
                    <div className="bm-cap-bar"><div style={{ width: `${pct}%` }} /></div>
                  </div>

                  <div className="bm-meta">
                    <div className="bm-meta-label">Schedule</div>
                    <div className="bm-meta-val">📅 {dayLabel} {timeLabel && <><span className="bm-dot" /> {timeLabel}</>}</div>
                  </div>
                  <div className="bm-meta">
                    <div className="bm-meta-label">Instructor</div>
                    <div className="bm-meta-val">👤 {batch.instructors.length ? batch.instructors.map(x => `${x.firstName} ${x.lastName}`).join(', ') : '—'}</div>
                  </div>
                </div>
              );
            })}
          </div>

          {totalPages > 1 && (
            <div className="bm-pagination">
              <button className="bm-page-btn" onClick={() => setPage(p => Math.max(1, p - 1))} disabled={cur <= 1}>←</button>
              {Array.from({ length: totalPages }, (_, n) => <button key={n} className={`bm-page-btn ${cur === n + 1 ? 'active' : ''}`} onClick={() => setPage(n + 1)}>{n + 1}</button>)}
              <button className="bm-page-btn" onClick={() => setPage(p => Math.min(totalPages, p + 1))} disabled={cur >= totalPages}>→</button>
            </div>
          )}
        </>
      )}
    </div>
  );
};

const SummaryRows: React.FC<{ form: any; courseTitle: (id: string) => string; deptName: (id: string) => string; chips: string[]; instructors: User[] }> = ({ form, courseTitle, deptName, chips, instructors }) => {
  const insNames = form.instructors.map((id: string) => { const u = instructors.find(x => x._id === id); return u ? `${u.firstName} ${u.lastName}` : ''; }).filter(Boolean);
  const row = (label: string, value: React.ReactNode) => (
    <div className="bm-sum-row"><span className="bm-sum-label">{label}</span><span className="bm-sum-val">{value || '—'}</span></div>
  );
  return (
    <div className="bm-sum">
      {row('Batch Name', form.name)}
      {row('Batch Size', form.capacity)}
      {row('Course', courseTitle(form.courseId))}
      {row('Department', deptName(form.departmentId))}
      {row('Start Date', fmtDate(form.startDate))}
      {row('End Date', fmtDate(form.endDate))}
      <div className="bm-sum-row"><span className="bm-sum-label">Schedule</span>
        <span className="bm-sum-val">
          {chips.slice(0, 3).map((c, i) => <span key={i} className="bm-sum-chip">{c}</span>)}
          {chips.length > 3 && <span className="bm-sum-chip more">+{chips.length - 3} more</span>}
        </span>
      </div>
      <div className="bm-sum-row"><span className="bm-sum-label">Instructors</span>
        <span className="bm-sum-val">{insNames.length ? insNames.map((n: string, i: number) => <span key={i} className="bm-sum-chip">{n}</span>) : '—'}</span>
      </div>
    </div>
  );
};

export default BatchesPage;
