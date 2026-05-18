import React, { useState, useEffect, useCallback } from 'react';
import axios from 'axios';
import {
  enrollmentPlanApi,
  CurriculumEnrollment,
  EnrollmentStatus,
  STATUS_LABELS,
  STATUS_COLORS,
} from '../../api/enrollmentPlanApi';
import { curriculumApi, Curriculum } from '../../api/curriculumApi';
import { batchApi } from '../../api/index';

const authHeader = () => {
  const token    = localStorage.getItem('token');
  const tenantId = localStorage.getItem('tenantId');
  return {
    ...(token    && { Authorization: `Bearer ${token}` }),
    ...(tenantId && { 'X-Tenant-Id': tenantId }),
  };
};

type EnrollMode = 'batch' | 'individual';

// ─── Enroll Modal ─────────────────────────────────────────────────────────────

function EnrollModal({
  onClose,
  onSuccess,
}: {
  onClose: () => void;
  onSuccess: () => void;
}) {
  const [step, setStep]               = useState<1 | 2 | 3>(1);
  const [curricula, setCurricula]     = useState<Curriculum[]>([]);
  const [batches, setBatches]         = useState<any[]>([]);
  const [students, setStudents]       = useState<any[]>([]);
  const [studentSearch, setStudentSearch] = useState('');

  const [selCurriculum, setSelCurriculum] = useState('');
  const [mode, setMode]               = useState<EnrollMode>('batch');
  const [selBatch, setSelBatch]       = useState('');
  const [selStudent, setSelStudent]   = useState('');
  const [startDate, setStartDate]     = useState(() => new Date().toISOString().split('T')[0]);
  const [enforceSeq, setEnforceSeq]   = useState(false);
  const [weekendsOn, setWeekendsOn]   = useState(true);
  const [saving, setSaving]           = useState(false);
  const [error, setError]             = useState('');

  useEffect(() => {
    curriculumApi.list({ published: 'true' }).then(r => setCurricula(r.curricula)).catch(() => {});
    batchApi.getBatches().then(r => setBatches(r.data || r.batches || r || [])).catch(() => {});
  }, []);

  useEffect(() => {
    if (mode !== 'individual' || !studentSearch.trim()) { setStudents([]); return; }
    const t = setTimeout(async () => {
      try {
        const { data } = await axios.get(
          `/api/v1/users?search=${encodeURIComponent(studentSearch)}&role=STUDENT`,
          { headers: authHeader() }
        );
        setStudents(data.data || data.users || []);
      } catch { setStudents([]); }
    }, 350);
    return () => clearTimeout(t);
  }, [studentSearch, mode]);

  const handleSubmit = async () => {
    setError('');
    if (!selCurriculum) { setError('Select a curriculum'); return; }
    if (mode === 'batch' && !selBatch) { setError('Select a batch'); return; }
    if (mode === 'individual' && !selStudent) { setError('Select a student'); return; }
    if (!startDate) { setError('Set a start date'); return; }

    setSaving(true);
    try {
      const settings = { enforceSequential: enforceSeq, weekendsActive: weekendsOn };
      if (mode === 'batch') {
        const res = await enrollmentPlanApi.enrollBatch({ curriculumId: selCurriculum, batchId: selBatch, startDate, settings });
        alert(res.message);
      } else {
        await enrollmentPlanApi.enrollStudent({ curriculumId: selCurriculum, studentId: selStudent, startDate, settings });
        alert('Student enrolled successfully');
      }
      onSuccess();
      onClose();
    } catch (e: any) {
      setError(e?.response?.data?.message || 'Failed to enroll');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }}
      onClick={e => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div style={{ background: '#fff', borderRadius: '12px', width: '540px', maxHeight: '90vh', overflow: 'auto', boxShadow: '0 20px 60px rgba(0,0,0,0.2)' }}>
        <div style={{ padding: '20px', borderBottom: '1px solid #f1f5f9', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <h3 style={{ margin: 0, fontSize: '16px', fontWeight: 700 }}>Enroll Students</h3>
          <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: '20px', color: '#64748b' }}>×</button>
        </div>

        {/* Step indicators */}
        <div style={{ display: 'flex', padding: '12px 20px', gap: '8px', borderBottom: '1px solid #f1f5f9' }}>
          {[1, 2, 3].map(s => (
            <div key={s} style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '13px' }}>
              <div style={{
                width: '22px', height: '22px', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center',
                background: step >= s ? '#0f172a' : '#e2e8f0', color: step >= s ? '#fff' : '#94a3b8', fontSize: '12px', fontWeight: 700,
              }}>
                {s}
              </div>
              <span style={{ color: step >= s ? '#0f172a' : '#94a3b8', fontWeight: step === s ? 600 : 400 }}>
                {s === 1 ? 'Curriculum' : s === 2 ? 'Mode' : 'Details'}
              </span>
              {s < 3 && <span style={{ color: '#e2e8f0' }}>›</span>}
            </div>
          ))}
        </div>

        <div style={{ padding: '20px' }}>
          {/* Step 1: Curriculum */}
          {step === 1 && (
            <div>
              <label style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                <span style={{ fontWeight: 600, fontSize: '14px' }}>Select Curriculum</span>
                <select
                  value={selCurriculum}
                  onChange={e => setSelCurriculum(e.target.value)}
                  style={{ padding: '10px 12px', border: '1.5px solid #e2e8f0', borderRadius: '8px', fontSize: '14px' }}
                >
                  <option value="">-- Choose a published curriculum --</option>
                  {curricula.map(c => (
                    <option key={c._id} value={c._id}>{c.title} ({c.totalDays} days)</option>
                  ))}
                </select>
              </label>
            </div>
          )}

          {/* Step 2: Mode */}
          {step === 2 && (
            <div style={{ display: 'flex', gap: '12px' }}>
              {(['batch', 'individual'] as EnrollMode[]).map(m => (
                <div
                  key={m}
                  onClick={() => setMode(m)}
                  style={{
                    flex: 1, padding: '16px', border: `2px solid ${mode === m ? '#0f172a' : '#e2e8f0'}`,
                    borderRadius: '10px', cursor: 'pointer', textAlign: 'center',
                    background: mode === m ? '#f8fafc' : '#fff',
                  }}
                >
                  <div style={{ fontSize: '28px', marginBottom: '8px' }}>{m === 'batch' ? '👥' : '👤'}</div>
                  <div style={{ fontWeight: 700, fontSize: '15px', color: '#0f172a', textTransform: 'capitalize' }}>{m}</div>
                  <div style={{ fontSize: '12px', color: '#64748b', marginTop: '4px' }}>
                    {m === 'batch' ? 'Enroll all students in a batch' : 'Enroll a single student'}
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Step 3: Details */}
          {step === 3 && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
              {mode === 'batch' ? (
                <label style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                  <span style={{ fontWeight: 600, fontSize: '14px' }}>Select Batch</span>
                  <select
                    value={selBatch}
                    onChange={e => setSelBatch(e.target.value)}
                    style={{ padding: '10px 12px', border: '1.5px solid #e2e8f0', borderRadius: '8px', fontSize: '14px' }}
                  >
                    <option value="">-- Choose a batch --</option>
                    {batches.map((b: any) => (
                      <option key={b._id} value={b._id}>{b.name}</option>
                    ))}
                  </select>
                </label>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                  <span style={{ fontWeight: 600, fontSize: '14px' }}>Search Student</span>
                  <input
                    type="text"
                    placeholder="Type student name or email..."
                    value={studentSearch}
                    onChange={e => { setStudentSearch(e.target.value); setSelStudent(''); }}
                    style={{ padding: '10px 12px', border: '1.5px solid #e2e8f0', borderRadius: '8px', fontSize: '14px', outline: 'none' }}
                  />
                  {students.length > 0 && (
                    <div style={{ border: '1px solid #e2e8f0', borderRadius: '8px', maxHeight: '160px', overflowY: 'auto' }}>
                      {students.map((s: any) => (
                        <div
                          key={s._id}
                          onClick={() => { setSelStudent(s._id); setStudentSearch(`${s.firstName} ${s.lastName} (${s.email})`); setStudents([]); }}
                          style={{
                            padding: '8px 12px', cursor: 'pointer', fontSize: '13px',
                            background: selStudent === s._id ? '#f0f9ff' : '#fff',
                            borderBottom: '1px solid #f1f5f9',
                          }}
                          onMouseEnter={e => (e.currentTarget.style.background = '#f8fafc')}
                          onMouseLeave={e => (e.currentTarget.style.background = selStudent === s._id ? '#f0f9ff' : '#fff')}
                        >
                          <strong>{s.firstName} {s.lastName}</strong> · <span style={{ color: '#64748b' }}>{s.email}</span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}

              <label style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                <span style={{ fontWeight: 600, fontSize: '14px' }}>Start Date (Day 1)</span>
                <input
                  type="date"
                  value={startDate}
                  onChange={e => setStartDate(e.target.value)}
                  style={{ padding: '10px 12px', border: '1.5px solid #e2e8f0', borderRadius: '8px', fontSize: '14px', outline: 'none' }}
                />
                <span style={{ fontSize: '12px', color: '#94a3b8' }}>Weekdays only — Day 1 begins on this date</span>
              </label>

              <div style={{ background: '#f8fafc', borderRadius: '8px', padding: '12px', display: 'flex', flexDirection: 'column', gap: '10px' }}>
                <span style={{ fontWeight: 600, fontSize: '13px', color: '#374151' }}>Settings</span>
                <label style={{ display: 'flex', alignItems: 'center', gap: '10px', cursor: 'pointer', fontSize: '13px' }}>
                  <input type="checkbox" checked={enforceSeq} onChange={e => setEnforceSeq(e.target.checked)} />
                  <span>
                    <strong>Enforce Sequential Unlock</strong>
                    <span style={{ display: 'block', color: '#64748b', fontSize: '12px' }}>
                      Students must complete gating items before the next day unlocks
                    </span>
                  </span>
                </label>
                <label style={{ display: 'flex', alignItems: 'center', gap: '10px', cursor: 'pointer', fontSize: '13px' }}>
                  <input type="checkbox" checked={weekendsOn} onChange={e => setWeekendsOn(e.target.checked)} />
                  <span>
                    <strong>Show Weekend Plans</strong>
                    <span style={{ display: 'block', color: '#64748b', fontSize: '12px' }}>
                      Weekend plans (revision, project, etc.) are visible to students
                    </span>
                  </span>
                </label>
              </div>
            </div>
          )}

          {error && (
            <div style={{ marginTop: '12px', padding: '10px 14px', background: '#fef2f2', borderRadius: '7px', color: '#dc2626', fontSize: '13px' }}>
              {error}
            </div>
          )}

          {/* Navigation */}
          <div style={{ display: 'flex', gap: '8px', marginTop: '20px' }}>
            {step > 1 && (
              <button
                onClick={() => setStep(prev => (prev - 1) as any)}
                style={{ padding: '9px 18px', border: '1.5px solid #e2e8f0', borderRadius: '7px', background: '#fff', color: '#374151', fontWeight: 600, fontSize: '14px', cursor: 'pointer' }}
              >
                ← Back
              </button>
            )}
            {step < 3 ? (
              <button
                onClick={() => {
                  if (step === 1 && !selCurriculum) { setError('Select a curriculum'); return; }
                  setError('');
                  setStep(prev => (prev + 1) as any);
                }}
                style={{ flex: 1, padding: '9px 18px', border: 'none', borderRadius: '7px', background: '#0f172a', color: '#fff', fontWeight: 600, fontSize: '14px', cursor: 'pointer' }}
              >
                Next →
              </button>
            ) : (
              <button
                onClick={handleSubmit}
                disabled={saving}
                style={{ flex: 1, padding: '9px 18px', border: 'none', borderRadius: '7px', background: '#0f172a', color: '#fff', fontWeight: 600, fontSize: '14px', cursor: saving ? 'not-allowed' : 'pointer', opacity: saving ? 0.7 : 1 }}
              >
                {saving ? 'Enrolling...' : mode === 'batch' ? 'Enroll Batch' : 'Enroll Student'}
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── Main Page ─────────────────────────────────────────────────────────────────

const STATUS_TABS: Array<{ key: EnrollmentStatus | 'all'; label: string }> = [
  { key: 'all',       label: 'All' },
  { key: 'active',    label: 'Active' },
  { key: 'paused',    label: 'Paused' },
  { key: 'completed', label: 'Completed' },
  { key: 'dropped',   label: 'Dropped' },
];

export default function EnrollmentPlansPage() {
  const [enrollments, setEnrollments] = useState<CurriculumEnrollment[]>([]);
  const [total, setTotal]             = useState(0);
  const [loading, setLoading]         = useState(true);
  const [activeTab, setActiveTab]     = useState<EnrollmentStatus | 'all'>('all');
  const [search, setSearch]           = useState('');
  const [curricula, setCurricula]     = useState<Curriculum[]>([]);
  const [curFilter, setCurFilter]     = useState('');
  const [showModal, setShowModal]     = useState(false);
  const [updating, setUpdating]       = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await enrollmentPlanApi.listAll({
        status: activeTab !== 'all' ? activeTab : undefined,
        curriculumId: curFilter || undefined,
        search: search || undefined,
      });
      setEnrollments(res.enrollments);
      setTotal(res.total);
    } catch {
      // ignore
    } finally {
      setLoading(false);
    }
  }, [activeTab, search, curFilter]);

  useEffect(() => { load(); }, [load]);

  useEffect(() => {
    curriculumApi.list().then(r => setCurricula(r.curricula)).catch(() => {});
  }, []);

  const changeStatus = async (id: string, status: EnrollmentStatus) => {
    setUpdating(id);
    try {
      const updated = await enrollmentPlanApi.updateStatus(id, status);
      setEnrollments(prev => prev.map(e => e._id === id ? { ...e, status: updated.status } : e));
    } catch (e: any) {
      alert(e?.response?.data?.message || 'Failed');
    } finally {
      setUpdating(null);
    }
  };

  const fmtDate = (d: string) => new Date(d).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });

  return (
    <div style={{ padding: '24px', maxWidth: '1400px', margin: '0 auto' }}>

      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '24px', flexWrap: 'wrap', gap: '12px' }}>
        <div>
          <h2 style={{ margin: 0, fontSize: '24px', fontWeight: 700, color: '#0f172a' }}>
            🎓 Enrollment Management
          </h2>
          <p style={{ margin: '4px 0 0', color: '#64748b', fontSize: '14px' }}>
            Enroll batches and students in learning curricula
          </p>
        </div>
        <button
          onClick={() => setShowModal(true)}
          style={{ background: '#0f172a', color: '#fff', border: 'none', borderRadius: '8px', padding: '10px 20px', fontWeight: 600, fontSize: '14px', cursor: 'pointer' }}
        >
          + Enroll Students
        </button>
      </div>

      {/* Status tabs */}
      <div style={{ display: 'flex', gap: '4px', borderBottom: '2px solid #e2e8f0', marginBottom: '16px' }}>
        {STATUS_TABS.map(t => {
          const count = t.key === 'all' ? total : enrollments.filter(e => e.status === t.key).length;
          return (
            <button
              key={t.key}
              onClick={() => setActiveTab(t.key)}
              style={{
                padding: '8px 16px', border: 'none', background: 'none', cursor: 'pointer',
                fontWeight: 600, fontSize: '13px',
                color: activeTab === t.key ? '#0f172a' : '#64748b',
                borderBottom: activeTab === t.key ? '2px solid #0f172a' : '2px solid transparent',
                marginBottom: '-2px',
              }}
            >
              {t.label}
              <span style={{ marginLeft: '5px', fontSize: '11px', color: '#94a3b8' }}>({count})</span>
            </button>
          );
        })}
      </div>

      {/* Filters */}
      <div style={{ display: 'flex', gap: '10px', marginBottom: '20px', flexWrap: 'wrap' }}>
        <input
          type="text"
          placeholder="Search by student name..."
          value={search}
          onChange={e => setSearch(e.target.value)}
          style={{ flex: 1, minWidth: '200px', padding: '8px 12px', border: '1.5px solid #e2e8f0', borderRadius: '7px', fontSize: '13px', outline: 'none' }}
        />
        <select
          value={curFilter}
          onChange={e => setCurFilter(e.target.value)}
          style={{ padding: '8px 12px', border: '1.5px solid #e2e8f0', borderRadius: '7px', fontSize: '13px', minWidth: '200px' }}
        >
          <option value="">All Curricula</option>
          {curricula.map(c => <option key={c._id} value={c._id}>{c.title}</option>)}
        </select>
      </div>

      {/* Table */}
      {loading ? (
        <div style={{ textAlign: 'center', padding: '60px', color: '#94a3b8' }}>Loading enrollments...</div>
      ) : enrollments.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '80px 24px', background: '#f8fafc', borderRadius: '12px', border: '1.5px dashed #e2e8f0' }}>
          <div style={{ fontSize: '48px', marginBottom: '16px' }}>📭</div>
          <h3 style={{ color: '#0f172a', margin: '0 0 8px' }}>No enrollments found</h3>
          <p style={{ color: '#64748b', margin: 0 }}>Click "+ Enroll Students" to get started.</p>
        </div>
      ) : (
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px' }}>
            <thead>
              <tr style={{ background: '#f8fafc' }}>
                {['Student', 'Curriculum', 'Batch', 'Start Date', 'Progress', 'Today\'s Day', 'Status', 'Actions'].map(h => (
                  <th key={h} style={{ padding: '10px 14px', textAlign: 'left', fontWeight: 600, color: '#475569', fontSize: '12px', textTransform: 'uppercase', letterSpacing: '0.04em', whiteSpace: 'nowrap' }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {enrollments.map(e => {
                const sc = STATUS_COLORS[e.status];
                return (
                  <tr key={e._id} style={{ borderBottom: '1px solid #f1f5f9' }}>
                    <td style={{ padding: '12px 14px' }}>
                      <div style={{ fontWeight: 600, color: '#0f172a' }}>{e.studentName}</div>
                      <div style={{ fontSize: '11px', color: '#94a3b8' }}>{e.studentEmail}</div>
                    </td>
                    <td style={{ padding: '12px 14px', color: '#374151', maxWidth: '200px' }}>
                      <div style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{e.curriculumTitle}</div>
                    </td>
                    <td style={{ padding: '12px 14px', color: '#64748b' }}>{e.batchName || '—'}</td>
                    <td style={{ padding: '12px 14px', color: '#64748b', whiteSpace: 'nowrap' }}>{fmtDate(e.startDate)}</td>
                    <td style={{ padding: '12px 14px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                        <div style={{ flex: 1, height: '6px', background: '#f1f5f9', borderRadius: '3px', minWidth: '60px' }}>
                          <div style={{ height: '6px', background: '#0f172a', borderRadius: '3px', width: `${e.progressPct || 0}%` }} />
                        </div>
                        <span style={{ fontSize: '11px', color: '#94a3b8', whiteSpace: 'nowrap' }}>{e.progressPct || 0}%</span>
                      </div>
                      <div style={{ fontSize: '11px', color: '#94a3b8', marginTop: '2px' }}>
                        {e.completedDays?.length || 0} days done
                      </div>
                    </td>
                    <td style={{ padding: '12px 14px', color: '#374151', whiteSpace: 'nowrap' }}>
                      {e.todayPlanDay ? `Day ${e.todayPlanDay}` : e.status === 'active' ? 'Not started' : '—'}
                    </td>
                    <td style={{ padding: '12px 14px' }}>
                      <span style={{ background: sc.bg, color: sc.color, borderRadius: '12px', padding: '3px 10px', fontSize: '12px', fontWeight: 600 }}>
                        {STATUS_LABELS[e.status]}
                      </span>
                    </td>
                    <td style={{ padding: '12px 14px' }}>
                      <div style={{ display: 'flex', gap: '4px' }}>
                        {e.status === 'active' && (
                          <button
                            onClick={() => changeStatus(e._id, 'paused')}
                            disabled={updating === e._id}
                            title="Pause"
                            style={{ padding: '4px 8px', border: '1px solid #fbbf24', borderRadius: '5px', background: '#fff', color: '#b45309', cursor: 'pointer', fontSize: '12px' }}
                          >
                            {updating === e._id ? '...' : '⏸'}
                          </button>
                        )}
                        {e.status === 'paused' && (
                          <button
                            onClick={() => changeStatus(e._id, 'active')}
                            disabled={updating === e._id}
                            title="Resume"
                            style={{ padding: '4px 8px', border: '1px solid #86efac', borderRadius: '5px', background: '#fff', color: '#15803d', cursor: 'pointer', fontSize: '12px' }}
                          >
                            {updating === e._id ? '...' : '▶'}
                          </button>
                        )}
                        {['active', 'paused'].includes(e.status) && (
                          <button
                            onClick={() => { if (window.confirm('Mark as completed?')) changeStatus(e._id, 'completed'); }}
                            disabled={updating === e._id}
                            title="Mark complete"
                            style={{ padding: '4px 8px', border: '1px solid #93c5fd', borderRadius: '5px', background: '#fff', color: '#1d4ed8', cursor: 'pointer', fontSize: '12px' }}
                          >
                            ✓
                          </button>
                        )}
                        {['active', 'paused'].includes(e.status) && (
                          <button
                            onClick={() => { if (window.confirm('Drop this enrollment?')) changeStatus(e._id, 'dropped'); }}
                            disabled={updating === e._id}
                            title="Drop"
                            style={{ padding: '4px 8px', border: '1px solid #fecaca', borderRadius: '5px', background: '#fff', color: '#dc2626', cursor: 'pointer', fontSize: '12px' }}
                          >
                            ✕
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {showModal && (
        <EnrollModal
          onClose={() => setShowModal(false)}
          onSuccess={load}
        />
      )}
    </div>
  );
}
