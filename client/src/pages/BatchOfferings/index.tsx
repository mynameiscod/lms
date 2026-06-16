import React, { useEffect, useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { batchOfferingApi, BatchOffering } from '../../api/batchOfferingApi';
import { curriculumApi, Curriculum, DayPlan, DayContentItem } from '../../api/curriculumApi';
import { enrollmentPlanApi } from '../../api/enrollmentPlanApi';
import { batchApi } from '../../api';
import { ActivityPickerModal, PickedActivity } from '../CurriculumBuilder/BuilderPage';

const KIND_ICON: Record<string, string> = { content: '📄', quiz: '📝', assignment: '📋', codeSnippet: '⌨️', mockInterview: '🎤' };

const pickedToItem = (p: PickedActivity, order: number): DayContentItem => ({
  kind: p.kind,
  contentId: p.kind === 'content' ? p.id : undefined,
  sourceModel: p.kind === 'content' ? undefined : p.sourceModel,
  sourceId: p.kind === 'content' ? undefined : p.id,
  contentTitle: p.title,
  contentType: p.kind === 'content' ? p.contentType : p.kind,
  slot: 'anytime', isGating: false, required: true, points: 0,
  order, estimatedDuration: p.estimatedDuration || 0,
});

const fmtDate = (s: string) => new Date(s).toLocaleDateString('en-IN', { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric' });

export default function BatchOfferings() {
  const navigate = useNavigate();
  const [offerings, setOfferings] = useState<BatchOffering[]>([]);
  const [curricula, setCurricula] = useState<Curriculum[]>([]);
  const [batches, setBatches] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // create form
  const [form, setForm] = useState({ curriculumId: '', batchId: '', startDate: '' });
  const [creating, setCreating] = useState(false);

  // selected offering detail
  const [sel, setSel] = useState<BatchOffering | null>(null);
  const [selCurriculum, setSelCurriculum] = useState<Curriculum | null>(null);
  const [templateDays, setTemplateDays] = useState<Record<number, DayPlan>>({});
  const [holidayInput, setHolidayInput] = useState('');
  const [msg, setMsg] = useState('');

  // day editor
  const [dayNum, setDayNum] = useState(1);
  const [dayDate, setDayDate] = useState('');
  const [added, setAdded] = useState<DayContentItem[]>([]);
  const [removed, setRemoved] = useState<Set<string>>(new Set());
  const [picker, setPicker] = useState(false);
  const [savingDay, setSavingDay] = useState(false);

  const loadList = useCallback(async () => {
    setLoading(true);
    try {
      const [offs, curRes, batchRes] = await Promise.all([
        batchOfferingApi.list(),
        curriculumApi.list({ published: 'true' }),
        batchApi.getBatches(),
      ]);
      setOfferings(offs);
      setCurricula(curRes.curricula || []);
      setBatches(batchRes.batches || batchRes.data || batchRes || []);
    } catch {
      // ignore
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { loadList(); }, [loadList]);

  const create = async () => {
    if (!form.curriculumId || !form.batchId || !form.startDate) { setMsg('Pick curriculum, batch and start date'); return; }
    setCreating(true); setMsg('');
    try {
      const off = await batchOfferingApi.create(form);
      setForm({ curriculumId: '', batchId: '', startDate: '' });
      await loadList();
      openOffering(off);
    } catch (e: any) {
      setMsg(e?.response?.data?.message || 'Failed to create offering');
    } finally {
      setCreating(false);
    }
  };

  const openOffering = async (off: BatchOffering) => {
    setSel(off); setMsg(''); setDayNum(1);
    try {
      const [cur, days] = await Promise.all([
        curriculumApi.getById(off.curriculumId),
        curriculumApi.getDayPlans(off.curriculumId),
      ]);
      setSelCurriculum(cur);
      const dm: Record<number, DayPlan> = {};
      days.forEach(d => { dm[d.dayNumber] = d; });
      setTemplateDays(dm);
      loadDay(off, 1);
    } catch { /* ignore */ }
  };

  const loadDay = async (off: BatchOffering, day: number) => {
    try {
      const d = await batchOfferingApi.getDay(off._id, day);
      setDayDate(d.date);
      setAdded(d.override?.addedItems || []);
      setRemoved(new Set(d.override?.removedItemIds || []));
    } catch { /* ignore */ }
  };

  const saveMeta = async (patch: { startDate?: string; holidays?: string[]; status?: string }) => {
    if (!sel) return;
    const updated = await batchOfferingApi.update(sel._id, patch);
    setSel(updated);
    setOfferings(prev => prev.map(o => o._id === updated._id ? updated : o));
  };

  const addHoliday = async () => {
    if (!sel || !holidayInput) return;
    if (sel.holidays.includes(holidayInput)) { setHolidayInput(''); return; }
    await saveMeta({ holidays: [...sel.holidays, holidayInput].sort() });
    setHolidayInput('');
    loadDay({ ...sel, holidays: [...sel.holidays, holidayInput] }, dayNum);
  };
  const removeHoliday = async (h: string) => {
    if (!sel) return;
    await saveMeta({ holidays: sel.holidays.filter(x => x !== h) });
    loadDay({ ...sel, holidays: sel.holidays.filter(x => x !== h) }, dayNum);
  };

  const enrollBatch = async () => {
    if (!sel) return;
    if (!window.confirm(`Enroll all students of "${sel.batchName}" into "${sel.curriculumTitle}" starting ${fmtDate(sel.startDate)}?`)) return;
    try {
      const r = await enrollmentPlanApi.enrollBatch({ curriculumId: sel.curriculumId, batchId: sel.batchId, startDate: sel.startDate, offeringId: sel._id });
      await saveMeta({ status: 'active' });
      setMsg(r.message || 'Batch enrolled');
    } catch (e: any) {
      setMsg(e?.response?.data?.message || 'Failed to enroll batch');
    }
  };

  const gotoDay = (day: number) => { if (!sel || !selCurriculum) return; const d = Math.min(Math.max(1, day), selCurriculum.totalDays); setDayNum(d); loadDay(sel, d); };

  const toggleRemove = (id?: string) => {
    if (!id) return;
    setRemoved(prev => { const n = new Set(prev); n.has(id) ? n.delete(id) : n.add(id); return n; });
  };
  const addActivity = (p: PickedActivity) => {
    setAdded(prev => {
      const dup = prev.some(i => p.kind === 'content' ? i.contentId === p.id : i.sourceId === p.id);
      return dup ? prev : [...prev, pickedToItem(p, prev.length)];
    });
    setPicker(false);
  };
  const saveDay = async () => {
    if (!sel) return;
    setSavingDay(true);
    try {
      const updated = await batchOfferingApi.saveDayOverride(sel._id, dayNum, { addedItems: added, removedItemIds: [...removed] });
      setSel(updated);
      setMsg(`Day ${dayNum} override saved`);
    } catch (e: any) {
      setMsg(e?.response?.data?.message || 'Failed to save day');
    } finally {
      setSavingDay(false);
    }
  };

  if (loading) return <div style={{ padding: 40, textAlign: 'center', color: '#94a3b8' }}>Loading offerings…</div>;

  // ── Detail view ──────────────────────────────────────────────────────────────
  if (sel) {
    const templateItems = templateDays[dayNum]?.items || [];
    return (
      <div style={{ padding: 24, maxWidth: 1100, margin: '0 auto' }}>
        <button onClick={() => { setSel(null); setSelCurriculum(null); }} style={{ background: 'none', border: '1.5px solid #e2e8f0', borderRadius: 7, padding: '6px 12px', cursor: 'pointer', fontSize: 13, color: '#475569', marginBottom: 16 }}>← All Offerings</button>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 8, flexWrap: 'wrap' }}>
          <h2 style={{ margin: 0, fontSize: 20, fontWeight: 700, color: '#0f172a' }}>{sel.curriculumTitle}</h2>
          <span style={{ background: '#eef2ff', color: '#4338ca', borderRadius: 6, padding: '3px 10px', fontSize: 12, fontWeight: 600 }}>👥 {sel.batchName}</span>
          <span style={{ background: sel.status === 'active' ? '#dcfce7' : '#f1f5f9', color: sel.status === 'active' ? '#16a34a' : '#94a3b8', borderRadius: 6, padding: '3px 10px', fontSize: 12, fontWeight: 600 }}>{sel.status}</span>
        </div>
        {msg && <div style={{ background: '#eff6ff', color: '#1e3a8a', borderRadius: 8, padding: '8px 12px', fontSize: 13, marginBottom: 12 }}>{msg}</div>}

        {/* Meta */}
        <div style={{ display: 'flex', gap: 24, flexWrap: 'wrap', background: '#fff', border: '1.5px solid #e2e8f0', borderRadius: 12, padding: 16, marginBottom: 16 }}>
          <label style={{ display: 'flex', flexDirection: 'column', gap: 4, fontSize: 13, fontWeight: 600, color: '#374151' }}>
            Cohort start date
            <input type="date" value={sel.startDate.slice(0, 10)} onChange={e => saveMeta({ startDate: e.target.value }).then(() => loadDay({ ...sel, startDate: e.target.value }, dayNum))}
              style={{ padding: '8px 12px', border: '1.5px solid #e2e8f0', borderRadius: 7, fontSize: 13 }} />
          </label>
          <div style={{ flex: 1, minWidth: 240 }}>
            <div style={{ fontSize: 13, fontWeight: 600, color: '#374151', marginBottom: 4 }}>Holidays (skipped in the calendar)</div>
            <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', alignItems: 'center' }}>
              {sel.holidays.map(h => (
                <span key={h} style={{ background: '#fef3c7', color: '#b45309', borderRadius: 6, padding: '3px 8px', fontSize: 12, fontWeight: 600 }}>
                  {h} <span onClick={() => removeHoliday(h)} style={{ cursor: 'pointer' }}>×</span>
                </span>
              ))}
              <input type="date" value={holidayInput} onChange={e => setHolidayInput(e.target.value)} style={{ padding: '6px 10px', border: '1.5px solid #e2e8f0', borderRadius: 7, fontSize: 12 }} />
              <button onClick={addHoliday} style={{ background: '#f1f5f9', border: '1px solid #e2e8f0', borderRadius: 6, padding: '6px 10px', fontSize: 12, cursor: 'pointer' }}>+ Holiday</button>
            </div>
          </div>
          <div style={{ alignSelf: 'flex-end', display: 'flex', gap: 8 }}>
            <button onClick={() => navigate(`/batch-offerings/${sel._id}/progress`)} style={{ background: '#fff', color: '#4338ca', border: '1.5px solid #c7d2fe', borderRadius: 8, padding: '10px 16px', fontWeight: 700, fontSize: 13, cursor: 'pointer' }}>
              📊 View progress
            </button>
            <button onClick={enrollBatch} style={{ background: '#0f172a', color: '#fff', border: 'none', borderRadius: 8, padding: '10px 18px', fontWeight: 700, fontSize: 13, cursor: 'pointer' }}>
              👥 Enroll this batch
            </button>
          </div>
        </div>

        {/* Day override editor */}
        <div style={{ background: '#fff', border: '1.5px solid #e2e8f0', borderRadius: 12, padding: 16 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 14, flexWrap: 'wrap' }}>
            <h3 style={{ margin: 0, fontSize: 15, fontWeight: 700 }}>Per-day overrides</h3>
            <span style={{ color: '#94a3b8', fontSize: 12 }}>Customize THIS batch without changing the template.</span>
            <div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: 6 }}>
              <button onClick={() => gotoDay(dayNum - 1)} style={{ border: '1px solid #e2e8f0', borderRadius: 6, background: '#fff', padding: '4px 10px', cursor: 'pointer' }}>‹</button>
              <span style={{ fontSize: 13, fontWeight: 700 }}>Day</span>
              <input type="number" min={1} max={selCurriculum?.totalDays || 999} value={dayNum} onChange={e => gotoDay(parseInt(e.target.value) || 1)} style={{ width: 64, padding: '6px 8px', border: '1.5px solid #e2e8f0', borderRadius: 6, fontSize: 13, textAlign: 'center' }} />
              <button onClick={() => gotoDay(dayNum + 1)} style={{ border: '1px solid #e2e8f0', borderRadius: 6, background: '#fff', padding: '4px 10px', cursor: 'pointer' }}>›</button>
              {dayDate && <span style={{ marginLeft: 8, fontSize: 12, color: '#475569' }}>📅 {fmtDate(dayDate)}</span>}
            </div>
          </div>

          {/* Template items (toggle include) */}
          <div style={{ fontSize: 12, fontWeight: 700, color: '#64748b', marginBottom: 6 }}>FROM TEMPLATE</div>
          {templateItems.length === 0 ? (
            <div style={{ color: '#94a3b8', fontSize: 13, marginBottom: 12 }}>No template activities on this day.</div>
          ) : templateItems.map((it, i) => {
            const id = (it as any)._id;
            const isRemoved = id && removed.has(id);
            return (
              <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '7px 10px', background: '#f8fafc', borderRadius: 8, marginBottom: 4, opacity: isRemoved ? 0.5 : 1 }}>
                <span>{KIND_ICON[(it.kind as any) || 'content'] || '📄'}</span>
                <span style={{ flex: 1, fontSize: 13, fontWeight: 500, textDecoration: isRemoved ? 'line-through' : 'none' }}>{it.contentTitle}</span>
                <label style={{ fontSize: 12, color: '#64748b', display: 'flex', gap: 4, alignItems: 'center' }}>
                  <input type="checkbox" checked={!isRemoved} onChange={() => toggleRemove(id)} /> Include
                </label>
              </div>
            );
          })}

          {/* Added items */}
          <div style={{ fontSize: 12, fontWeight: 700, color: '#64748b', margin: '14px 0 6px' }}>ADDED FOR THIS BATCH</div>
          {added.map((it, i) => (
            <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '7px 10px', background: '#eff6ff', borderRadius: 8, marginBottom: 4 }}>
              <span>{KIND_ICON[(it.kind as any) || 'content'] || '📄'}</span>
              <span style={{ flex: 1, fontSize: 13, fontWeight: 500 }}>{it.contentTitle}</span>
              <button onClick={() => setAdded(prev => prev.filter((_, x) => x !== i))} style={{ background: 'none', border: 'none', color: '#ef4444', cursor: 'pointer', fontSize: 14 }}>×</button>
            </div>
          ))}
          <div style={{ display: 'flex', gap: 8, marginTop: 8 }}>
            <button onClick={() => setPicker(true)} style={{ background: '#f1f5f9', border: '1.5px solid #e2e8f0', borderRadius: 7, padding: '7px 14px', fontSize: 13, fontWeight: 600, cursor: 'pointer', color: '#374151' }}>+ Add activity</button>
            <button onClick={saveDay} disabled={savingDay} style={{ background: '#10b981', color: '#fff', border: 'none', borderRadius: 7, padding: '7px 16px', fontSize: 13, fontWeight: 700, cursor: 'pointer' }}>{savingDay ? 'Saving…' : `Save Day ${dayNum}`}</button>
          </div>
        </div>

        {picker && <ActivityPickerModal onSelect={addActivity} onClose={() => setPicker(false)} />}
      </div>
    );
  }

  // ── List view ────────────────────────────────────────────────────────────────
  return (
    <div style={{ padding: 24, maxWidth: 1100, margin: '0 auto' }}>
      <h2 style={{ margin: '0 0 4px', fontSize: 20, fontWeight: 700, color: '#0f172a' }}>📅 Batch Offerings</h2>
      <p style={{ margin: '0 0 20px', color: '#64748b', fontSize: 13 }}>Run a curriculum for a specific batch: set its calendar (start date + holidays), customize day activities for that batch, and enroll the cohort.</p>

      {/* Create */}
      <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', alignItems: 'flex-end', background: '#fff', border: '1.5px solid #e2e8f0', borderRadius: 12, padding: 16, marginBottom: 20 }}>
        <label style={{ display: 'flex', flexDirection: 'column', gap: 4, fontSize: 13, fontWeight: 600, color: '#374151' }}>
          Curriculum
          <select value={form.curriculumId} onChange={e => setForm(f => ({ ...f, curriculumId: e.target.value }))} style={{ padding: '8px 12px', border: '1.5px solid #e2e8f0', borderRadius: 7, fontSize: 13, minWidth: 220 }}>
            <option value="">— Select —</option>
            {curricula.map(c => <option key={c._id} value={c._id}>{c.title}</option>)}
          </select>
        </label>
        <label style={{ display: 'flex', flexDirection: 'column', gap: 4, fontSize: 13, fontWeight: 600, color: '#374151' }}>
          Batch
          <select value={form.batchId} onChange={e => setForm(f => ({ ...f, batchId: e.target.value }))} style={{ padding: '8px 12px', border: '1.5px solid #e2e8f0', borderRadius: 7, fontSize: 13, minWidth: 200 }}>
            <option value="">— Select —</option>
            {batches.map((b: any) => <option key={b._id} value={b._id}>{b.name}</option>)}
          </select>
        </label>
        <label style={{ display: 'flex', flexDirection: 'column', gap: 4, fontSize: 13, fontWeight: 600, color: '#374151' }}>
          Start date
          <input type="date" value={form.startDate} onChange={e => setForm(f => ({ ...f, startDate: e.target.value }))} style={{ padding: '8px 12px', border: '1.5px solid #e2e8f0', borderRadius: 7, fontSize: 13 }} />
        </label>
        <button onClick={create} disabled={creating} style={{ background: '#0f172a', color: '#fff', border: 'none', borderRadius: 8, padding: '10px 20px', fontWeight: 700, fontSize: 13, cursor: 'pointer' }}>{creating ? 'Creating…' : '+ Create Offering'}</button>
      </div>
      {msg && <div style={{ background: '#fef2f2', color: '#b91c1c', borderRadius: 8, padding: '8px 12px', fontSize: 13, marginBottom: 12 }}>{msg}</div>}

      {offerings.length === 0 ? (
        <div style={{ textAlign: 'center', padding: 50, color: '#94a3b8', background: '#f8fafc', borderRadius: 12, border: '1.5px dashed #e2e8f0' }}>No offerings yet. Create one above.</div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {offerings.map(o => (
            <div key={o._id} onClick={() => openOffering(o)} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '14px 16px', background: '#fff', border: '1.5px solid #e2e8f0', borderRadius: 10, cursor: 'pointer' }}>
              <div style={{ flex: 1 }}>
                <div style={{ fontWeight: 700, fontSize: 14, color: '#0f172a' }}>{o.curriculumTitle}</div>
                <div style={{ fontSize: 12, color: '#64748b', marginTop: 2 }}>👥 {o.batchName} · 📅 starts {fmtDate(o.startDate)} · {o.dayOverrides.length} day override{o.dayOverrides.length !== 1 ? 's' : ''}</div>
              </div>
              <span style={{ background: o.status === 'active' ? '#dcfce7' : '#f1f5f9', color: o.status === 'active' ? '#16a34a' : '#94a3b8', borderRadius: 20, padding: '4px 12px', fontSize: 12, fontWeight: 600 }}>{o.status}</span>
              <button onClick={(e) => { e.stopPropagation(); if (window.confirm('Delete this offering?')) batchOfferingApi.remove(o._id).then(loadList); }} style={{ background: 'none', border: '1px solid #fecaca', color: '#dc2626', borderRadius: 6, padding: '5px 10px', fontSize: 12, cursor: 'pointer' }}>Delete</button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
