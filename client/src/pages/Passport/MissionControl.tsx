import React, { useEffect, useState } from 'react';
import passportApi from '../../api/passportApi';

/**
 * Mission Control — the Passport student's home ("Today"). Completely separate from
 * the normal LMS student dashboard. Step 1 = shell; the real missions/score/roadmap
 * land in later steps. If the student isn't an active Passport member, we prompt.
 */
const MissionControl: React.FC = () => {
  const [status, setStatus] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => { (async () => { try { setStatus(await passportApi.me()); } catch { /* ignore */ } setLoading(false); })(); }, []);

  if (loading) return <div style={{ padding: 40, textAlign: 'center', color: '#64748b' }}>Loading your Career Passport…</div>;

  const active = status?.active;

  return (
    <div style={{ minHeight: '100%', background: 'linear-gradient(180deg,#f5f3ff,#f6f7f9)', padding: '28px 24px' }}>
      <div style={{ maxWidth: 1040, margin: '0 auto' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 6 }}>
          <span style={{ fontSize: 26 }}>🎫</span>
          <h1 style={{ fontSize: 26, fontWeight: 800, color: '#0f172a', margin: 0 }}>Mission Control</h1>
        </div>
        <p style={{ color: '#64748b', fontSize: 14, margin: '0 0 22px' }}>Your CodeBegun Career Passport — one place that tells you what to do next.</p>

        {!active ? (
          <div style={{ background: '#fff', border: '1px solid #e0e7ff', borderRadius: 16, padding: '28px 24px', textAlign: 'center' }}>
            <div style={{ fontSize: 40, marginBottom: 8 }}>🚀</div>
            <div style={{ fontSize: 18, fontWeight: 800, color: '#0f172a' }}>Activate your Career Passport</div>
            <p style={{ color: '#64748b', fontSize: 14, maxWidth: 480, margin: '8px auto 16px' }}>
              Take the free Career Readiness Assessment, get your Career Score, and unlock your personalized 90-day journey.
            </p>
            <button style={{ background: 'linear-gradient(90deg,#6650d8,#14a89c)', color: '#fff', border: 'none', borderRadius: 10, padding: '12px 26px', fontWeight: 800, fontSize: 15, cursor: 'pointer' }}>
              Start free assessment
            </button>
            <div style={{ fontSize: 12, color: '#94a3b8', marginTop: 10 }}>(Assessment & activation land in the next steps.)</div>
          </div>
        ) : (
          <>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(180px,1fr))', gap: 14, marginBottom: 18 }}>
              {[
                { label: 'Career Score', value: '—', hint: 'Take the assessment' },
                { label: 'Level', value: '—', hint: '' },
                { label: 'Streak', value: '0d', hint: '' },
                { label: 'Today', value: '—', hint: 'Missions coming soon' },
              ].map(c => (
                <div key={c.label} style={{ background: '#fff', border: '1px solid #eef1f6', borderRadius: 14, padding: '16px 18px' }}>
                  <div style={{ fontSize: 12.5, color: '#64748b', fontWeight: 600 }}>{c.label}</div>
                  <div style={{ fontSize: 26, fontWeight: 800, color: '#0f172a' }}>{c.value}</div>
                  <div style={{ fontSize: 12, color: '#94a3b8' }}>{c.hint}</div>
                </div>
              ))}
            </div>
            <div style={{ background: '#fff', border: '1px solid #eef1f6', borderRadius: 16, padding: '22px 24px' }}>
              <div style={{ fontSize: 15, fontWeight: 800, color: '#0f172a', marginBottom: 6 }}>Today’s Missions</div>
              <div style={{ color: '#94a3b8', fontSize: 14 }}>Your personalized daily missions appear here once the assessment + roadmap are live (next steps).</div>
            </div>
          </>
        )}
      </div>
    </div>
  );
};

export default MissionControl;
