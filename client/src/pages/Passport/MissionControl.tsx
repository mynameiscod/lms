import React, { useCallback, useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import passportApi, { AssessResult, TodayMissions } from '../../api/passportApi';

/**
 * Mission Control — the Passport student's home ("Today"). Completely separate from the
 * normal LMS dashboard. Free: shows the Career Score + a ₹499 unlock CTA. Member: shows
 * today's personalized missions, streak/XP, and the shareable Career Passport link.
 */
const CAT_ICON: Record<string, string> = {
  career_clarity: '🎯', aptitude: '🔢', logical_reasoning: '🧩',
  technical: '💻', communication: '🗣️', employability: '💼',
};

const MissionControl: React.FC = () => {
  const nav = useNavigate();
  const [status, setStatus] = useState<any>(null);
  const [result, setResult] = useState<AssessResult | null>(null);
  const [today, setToday] = useState<TodayMissions | null>(null);
  const [loading, setLoading] = useState(true);
  const [paying, setPaying] = useState(false);
  const [payMsg, setPayMsg] = useState('');
  const [copied, setCopied] = useState(false);

  const load = useCallback(async () => {
    try {
      const [s, r] = await Promise.all([
        passportApi.me().catch(() => null),
        passportApi.getResult().catch(() => ({ result: null })),
      ]);
      setStatus(s); setResult(r?.result || null);
      if (s?.active) { try { setToday(await passportApi.getToday()); } catch { /* */ } }
    } catch { /* ignore */ }
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  const unlock = async () => {
    setPaying(true); setPayMsg('');
    const res = await passportApi.membershipCheckout();
    setPaying(false);
    if (res.ok) { setPayMsg(''); setLoading(true); await load(); }
    else setPayMsg(res.message || 'Payment did not complete.');
  };

  const toggleMission = async (key: string) => {
    setToday(t => t && ({ ...t, missions: t.missions?.map(m => m.key === key ? { ...m, done: true } : m) }));
    try {
      const r = await passportApi.completeMission(key);
      setToday(t => t && ({ ...t, xp: r.xp, streak: r.streak, longestStreak: r.longestStreak, allDone: r.allDone }));
    } catch { load(); }
  };

  const share = async () => {
    const slug = status?.shareSlug;
    if (!slug) return;
    const url = `${window.location.origin}/passport/card/${slug}`;
    try { await navigator.clipboard.writeText(url); setCopied(true); setTimeout(() => setCopied(false), 2000); }
    catch { window.prompt('Copy your Career Passport link:', url); }
  };

  if (loading) return <div style={{ padding: 40, textAlign: 'center', color: '#64748b' }}>Loading your Career Passport…</div>;

  const active = !!status?.active;
  const hasScore = !!result;
  const price = status?.priceInr ?? 499;

  return (
    <div style={{ minHeight: '100%', background: 'linear-gradient(180deg,#f5f3ff,#f6f7f9)', padding: '28px 24px' }}>
      <div style={{ maxWidth: 1040, margin: '0 auto' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 10, marginBottom: 6 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <span style={{ fontSize: 26 }}>🎫</span>
            <h1 style={{ fontSize: 26, fontWeight: 800, color: '#0f172a', margin: 0 }}>Mission Control</h1>
          </div>
          {active && status?.shareSlug && (
            <button onClick={share} style={{ background: '#fff', border: '1px solid #e0e7ff', borderRadius: 10, padding: '9px 16px', fontWeight: 700, fontSize: 13, color: '#6650d8', cursor: 'pointer' }}>
              {copied ? '✓ Link copied' : '🔗 Share my Passport'}
            </button>
          )}
        </div>
        <p style={{ color: '#64748b', fontSize: 14, margin: '0 0 22px' }}>Your CodeBegun Career Passport — one place that tells you what to do next.</p>

        {/* ── Score / stats row ── */}
        {hasScore && (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(170px,1fr))', gap: 14, marginBottom: 18 }}>
            <Stat label="Career Score" big={String(result!.careerScore)} hint={result!.level} />
            <Stat label="Pathway" big={result!.pathwayLabel} />
            <Stat label="Streak" big={`${active ? (today?.streak ?? 0) : 0}d`} hint={active ? 'Keep it alive' : 'Unlock to start'} />
            <Stat label="XP" big={active ? String(today?.xp ?? 0) : '—'} hint={active ? 'Earned' : 'Unlock to earn'} />
          </div>
        )}

        {/* ── Not a member yet ── */}
        {!active && (
          !hasScore ? (
            <div style={cardCta}>
              <div style={{ fontSize: 40, marginBottom: 8 }}>🚀</div>
              <div style={{ fontSize: 18, fontWeight: 800, color: '#0f172a' }}>Discover your Career Score</div>
              <p style={{ color: '#64748b', fontSize: 14, maxWidth: 480, margin: '8px auto 16px' }}>
                Take the free Career Readiness Assessment, get your Career Score, and unlock your personalized 90-day journey.
              </p>
              <button onClick={() => nav('/passport/assessment')} style={btnPrimary}>Start free assessment</button>
              <div style={{ fontSize: 12, color: '#94a3b8', marginTop: 10 }}>Takes about 5 minutes · No payment needed.</div>
            </div>
          ) : (
            <div style={{ ...cardCta, background: 'linear-gradient(120deg,#1e1b4b,#0f766e)', color: '#fff', border: 'none' }}>
              <div style={{ fontSize: 19, fontWeight: 800 }}>Unlock your full 90-day journey</div>
              <p style={{ opacity: 0.85, fontSize: 13.5, maxWidth: 480, margin: '8px auto 16px' }}>
                Daily missions, verified practice, mock interviews, resume &amp; the shareable Career Passport — personalized to your score.
              </p>
              {status?.paymentAvailable === false ? (
                <div style={{ fontSize: 13.5, opacity: 0.9 }}>Online payment isn’t enabled yet — please contact your mentor to activate.</div>
              ) : (
                <button onClick={unlock} disabled={paying} style={{ ...btnLight, opacity: paying ? 0.6 : 1 }}>
                  {paying ? 'Opening payment…' : `Unlock for ₹${price}`}
                </button>
              )}
              {payMsg && <div style={{ marginTop: 12, fontSize: 13, background: 'rgba(255,255,255,.12)', borderRadius: 8, padding: '8px 12px' }}>{payMsg}</div>}
              <div style={{ marginTop: 10 }}>
                <button onClick={() => nav('/passport/assessment')} style={{ background: 'none', border: 'none', color: '#c7d2fe', fontSize: 12.5, cursor: 'pointer' }}>View my full result →</button>
              </div>
            </div>
          )
        )}

        {/* ── Member: today's missions ── */}
        {active && (
          <>
            <div style={{ background: '#fff', border: '1px solid #eef1f6', borderRadius: 16, padding: '22px 24px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
                <div style={{ fontSize: 15, fontWeight: 800, color: '#0f172a' }}>Today’s Missions{today?.day ? ` · Day ${today.day}` : ''}</div>
                {today?.allDone && <span style={{ fontSize: 12.5, fontWeight: 800, color: '#14a89c', background: '#e7f8f5', padding: '4px 10px', borderRadius: 99 }}>✓ All done — see you tomorrow!</span>}
              </div>

              {today?.needsAssessment ? (
                <div style={{ color: '#64748b', fontSize: 14 }}>Take the <button onClick={() => nav('/passport/assessment')} style={linkBtn}>Career Readiness Assessment</button> first to personalize your missions.</div>
              ) : !today?.missions?.length ? (
                <div style={{ color: '#94a3b8', fontSize: 14 }}>No missions for today. Check back tomorrow.</div>
              ) : (
                <div style={{ display: 'grid', gap: 10 }}>
                  {today.missions.map(m => (
                    <div key={m.key} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '13px 15px', border: '1px solid #eef1f6', borderRadius: 12, background: m.done ? '#f6fbf9' : '#fff' }}>
                      <button onClick={() => !m.done && toggleMission(m.key)} disabled={m.done}
                        style={{ width: 24, height: 24, borderRadius: 7, border: m.done ? 'none' : '2px solid #cbd5e1', background: m.done ? '#14a89c' : '#fff', color: '#fff', cursor: m.done ? 'default' : 'pointer', flexShrink: 0, fontWeight: 800 }}>
                        {m.done ? '✓' : ''}
                      </button>
                      <div style={{ flex: 1 }}>
                        <div style={{ fontSize: 14.5, fontWeight: 700, color: '#0f172a', textDecoration: m.done ? 'line-through' : 'none', opacity: m.done ? 0.6 : 1 }}>{CAT_ICON[m.category] || '•'} {m.title}</div>
                        <div style={{ fontSize: 12.5, color: '#64748b' }}>{m.detail}</div>
                      </div>
                      {m.link && !m.done && <button onClick={() => nav(m.link!)} style={{ ...linkBtn, whiteSpace: 'nowrap' }}>Open →</button>}
                      <span style={{ fontSize: 12, fontWeight: 800, color: '#6650d8', background: '#f4f2ff', padding: '3px 8px', borderRadius: 99 }}>+{m.xp}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(220px,1fr))', gap: 14, marginTop: 14 }}>
              <QuickCard title="📊 My assessment result" onClick={() => nav('/passport/assessment')} sub="Score, breakdown & pathway" />
              <QuickCard title="🎫 My Career Passport" onClick={share} sub={copied ? 'Link copied!' : 'Share your verified card'} />
            </div>
          </>
        )}
      </div>
    </div>
  );
};

const Stat: React.FC<{ label: string; big: string; hint?: string }> = ({ label, big, hint }) => (
  <div style={{ background: '#fff', border: '1px solid #eef1f6', borderRadius: 14, padding: '16px 18px' }}>
    <div style={{ fontSize: 12.5, color: '#64748b', fontWeight: 600 }}>{label}</div>
    <div style={{ fontSize: 20, fontWeight: 800, color: '#0f172a', lineHeight: 1.2, marginTop: 2 }}>{big}</div>
    {hint && <div style={{ fontSize: 12, color: '#94a3b8', marginTop: 2 }}>{hint}</div>}
  </div>
);

const QuickCard: React.FC<{ title: string; sub: string; onClick: () => void }> = ({ title, sub, onClick }) => (
  <button onClick={onClick} style={{ textAlign: 'left', background: '#fff', border: '1px solid #eef1f6', borderRadius: 14, padding: '16px 18px', cursor: 'pointer' }}>
    <div style={{ fontSize: 14.5, fontWeight: 800, color: '#0f172a' }}>{title}</div>
    <div style={{ fontSize: 12.5, color: '#94a3b8', marginTop: 2 }}>{sub}</div>
  </button>
);

const cardCta: React.CSSProperties = { background: '#fff', border: '1px solid #e0e7ff', borderRadius: 16, padding: '28px 24px', textAlign: 'center' };
const btnPrimary: React.CSSProperties = { background: 'linear-gradient(90deg,#6650d8,#14a89c)', color: '#fff', border: 'none', borderRadius: 10, padding: '12px 26px', fontWeight: 800, fontSize: 15, cursor: 'pointer' };
const btnLight: React.CSSProperties = { background: '#fff', color: '#1e1b4b', border: 'none', borderRadius: 10, padding: '12px 28px', fontWeight: 800, fontSize: 15, cursor: 'pointer' };
const linkBtn: React.CSSProperties = { background: 'none', border: 'none', color: '#6650d8', fontWeight: 700, fontSize: 13, cursor: 'pointer', padding: 0 };

export default MissionControl;
