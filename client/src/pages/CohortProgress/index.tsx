import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { batchOfferingApi, OfferingProgress } from '../../api/batchOfferingApi';

const fmtDate = (s: string) => new Date(s).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
const fmtAgo = (s: string | null) => {
  if (!s) return 'never';
  const diff = Date.now() - new Date(s).getTime();
  const d = Math.floor(diff / 86400000);
  if (d === 0) return 'today';
  if (d === 1) return 'yesterday';
  return `${d}d ago`;
};

export default function CohortProgress() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [data, setData] = useState<OfferingProgress | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!id) return;
    batchOfferingApi.getProgress(id).then(setData).catch(() => {}).finally(() => setLoading(false));
  }, [id]);

  if (loading) return <div style={{ padding: 40, textAlign: 'center', color: '#94a3b8' }}>Loading progress…</div>;
  if (!data) return <div style={{ padding: 40, textAlign: 'center', color: '#94a3b8' }}>Offering not found.</div>;

  const barColor = (p: number) => (p >= 75 ? '#10b981' : p >= 40 ? '#f59e0b' : '#ef4444');

  return (
    <div style={{ padding: 24, maxWidth: 1100, margin: '0 auto' }}>
      <button onClick={() => navigate('/batch-offerings')} style={{ background: 'none', border: '1.5px solid #e2e8f0', borderRadius: 7, padding: '6px 12px', cursor: 'pointer', fontSize: 13, color: '#475569', marginBottom: 16 }}>← Batch Offerings</button>

      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 6, flexWrap: 'wrap' }}>
        <h2 style={{ margin: 0, fontSize: 20, fontWeight: 700, color: '#0f172a' }}>{data.offering.curriculumTitle}</h2>
        <span style={{ background: '#eef2ff', color: '#4338ca', borderRadius: 6, padding: '3px 10px', fontSize: 12, fontWeight: 600 }}>👥 {data.offering.batchName}</span>
        <span style={{ color: '#64748b', fontSize: 13 }}>starts {fmtDate(data.offering.startDate)}</span>
      </div>

      {/* Summary */}
      <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', marginBottom: 20 }}>
        {[
          { label: 'Students', value: data.summary.students },
          { label: 'Active', value: data.summary.active },
          { label: 'Avg. completion', value: `${data.summary.avgPercent}%` },
          { label: 'Total days', value: data.totalDays },
        ].map(s => (
          <div key={s.label} style={{ flex: 1, minWidth: 140, background: '#fff', border: '1.5px solid #e2e8f0', borderRadius: 12, padding: '14px 16px' }}>
            <div style={{ fontSize: 12, color: '#94a3b8', fontWeight: 600 }}>{s.label}</div>
            <div style={{ fontSize: 22, fontWeight: 800, color: '#0f172a', marginTop: 2 }}>{s.value}</div>
          </div>
        ))}
      </div>

      {/* Student rows */}
      {data.students.length === 0 ? (
        <div style={{ textAlign: 'center', padding: 50, color: '#94a3b8', background: '#f8fafc', borderRadius: 12, border: '1.5px dashed #e2e8f0' }}>
          No students enrolled in this offering yet. Use “Enroll this batch” on the offering.
        </div>
      ) : (
        <div style={{ background: '#fff', border: '1.5px solid #e2e8f0', borderRadius: 12, overflow: 'hidden' }}>
          <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr 90px 90px 110px', gap: 10, padding: '10px 16px', background: '#f8fafc', fontSize: 11, fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '.03em' }}>
            <span>Student</span><span>Progress</span><span>Day</span><span>Done</span><span>Last active</span>
          </div>
          {data.students.map(s => (
            <div key={s.studentId} style={{ display: 'grid', gridTemplateColumns: '2fr 1fr 90px 90px 110px', gap: 10, padding: '12px 16px', borderTop: '1px solid #f1f5f9', alignItems: 'center', fontSize: 13 }}>
              <div style={{ minWidth: 0 }}>
                <div style={{ fontWeight: 600, color: '#0f172a', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{s.name}</div>
                <div style={{ fontSize: 11, color: '#94a3b8', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{s.email}</div>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <div style={{ flex: 1, height: 7, background: '#f1f5f9', borderRadius: 999, overflow: 'hidden' }}>
                  <div style={{ width: `${s.percent}%`, height: '100%', background: barColor(s.percent), borderRadius: 999 }} />
                </div>
                <span style={{ fontSize: 11, color: '#64748b', fontWeight: 600, width: 34, textAlign: 'right' }}>{s.percent}%</span>
              </div>
              <span style={{ color: '#475569' }}>{s.currentDay}</span>
              <span style={{ color: '#475569' }}>{s.completedCount}/{data.totalDays}</span>
              <span style={{ color: '#94a3b8', fontSize: 12 }}>{fmtAgo(s.lastActivityAt)}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
