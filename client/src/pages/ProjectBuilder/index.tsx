import React, { useEffect, useState } from 'react';
import { projectApi, PROJECT_ROLES, ProjectPlan } from '../../api/projectApi';

const PURPLE = '#6366f1', TEAL = '#14a89c', INK = '#0f172a', MUTED = '#64748b';
const card: React.CSSProperties = { background: '#fff', border: '1px solid #eef1f6', borderRadius: 14, boxShadow: '0 1px 3px rgba(16,24,40,.05)' };
const DIFF_COLORS: Record<string, { bg: string; fg: string }> = {
  Beginner: { bg: '#dcfce7', fg: '#15803d' }, Intermediate: { bg: '#fef3c7', fg: '#b45309' }, Advanced: { bg: '#fee2e2', fg: '#b91c1c' },
};
const pct = (p: ProjectPlan) => (p.tasks?.length ? Math.round((p.tasks.filter(t => t.done).length / p.tasks.length) * 100) : 0);
const chip = (t: string, i: number) => <span key={i} style={{ fontSize: 11.5, background: '#eef2ff', color: '#4338ca', borderRadius: 12, padding: '2px 9px', fontWeight: 600 }}>{t}</span>;

const ProjectBuilder: React.FC = () => {
  const [role, setRole] = useState('');
  const [recs, setRecs] = useState<any[]>([]);
  const [recLoading, setRecLoading] = useState(false);
  const [projects, setProjects] = useState<ProjectPlan[]>([]);
  const [starting, setStarting] = useState<string | null>(null);
  const [sel, setSel] = useState<ProjectPlan | null>(null);
  const [tab, setTab] = useState<'overview' | 'schema' | 'api' | 'screens' | 'readme' | 'deploy' | 'tasks'>('overview');

  const loadProjects = () => projectApi.list().then(setProjects).catch(() => {});
  useEffect(() => { loadProjects(); }, []);

  const generate = async () => {
    setRecLoading(true); setRecs([]);
    try { const r = await projectApi.recommend(role || undefined); setRecs(r.projects || []); if (!role) setRole(r.role); }
    catch { /* ignore */ } finally { setRecLoading(false); }
  };

  const start = async (rec: any) => {
    setStarting(rec.title);
    try { await projectApi.create({ ...rec, targetRole: role }); await loadProjects(); }
    catch { /* ignore */ } finally { setStarting(null); }
  };

  const open = async (p: ProjectPlan) => { try { setSel(await projectApi.get(p._id!)); setTab('overview'); } catch { /* ignore */ } };

  const toggle = async (idx: number, done: boolean) => {
    if (!sel?._id) return;
    const updated = await projectApi.toggleTask(sel._id, idx, done);
    setSel(updated); setProjects(prev => prev.map(p => (p._id === updated._id ? updated : p)));
  };

  const del = async (id: string) => { if (!window.confirm('Delete this project?')) return; await projectApi.remove(id); setSel(null); loadProjects(); };

  return (
    <div style={{ padding: '20px 24px 60px', background: '#f6f7fb', minHeight: '100vh' }}>
      <div style={{ maxWidth: 1100, margin: '0 auto' }}>
        <h1 style={{ fontSize: 24, fontWeight: 800, color: INK, margin: '0 0 4px' }}>🚀 AI Project Builder</h1>
        <p style={{ color: MUTED, margin: '0 0 20px' }}>Portfolio-worthy projects tailored to your target role — with schema, APIs, README, deploy steps and a build checklist.</p>

        {/* Generate */}
        <div style={{ ...card, padding: 18, marginBottom: 22, display: 'flex', gap: 12, alignItems: 'center', flexWrap: 'wrap' }}>
          <label style={{ fontSize: 13.5, fontWeight: 600, color: '#475569' }}>Target role</label>
          <select value={role} onChange={e => setRole(e.target.value)} style={{ padding: '9px 12px', border: '1px solid #cbd5e1', borderRadius: 8, fontSize: 14, minWidth: 220 }}>
            <option value="">Auto (from my profile)</option>
            {PROJECT_ROLES.map(r => <option key={r} value={r}>{r}</option>)}
          </select>
          <button onClick={generate} disabled={recLoading} style={{ background: `linear-gradient(90deg,${PURPLE},${TEAL})`, color: '#fff', border: 'none', borderRadius: 9, padding: '10px 20px', fontWeight: 700, fontSize: 14, cursor: recLoading ? 'default' : 'pointer', opacity: recLoading ? 0.8 : 1 }}>
            {recLoading ? '✨ Generating…' : '✨ Recommend projects'}
          </button>
        </div>

        {/* Recommendations */}
        {recs.length > 0 && (
          <>
            <h3 style={{ fontSize: 16, fontWeight: 800, color: INK, margin: '0 0 12px' }}>Recommended for {role || 'you'}</h3>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: 16, marginBottom: 30 }}>
              {recs.map((r, i) => {
                const dc = DIFF_COLORS[r.difficulty] || DIFF_COLORS.Intermediate;
                return (
                  <div key={i} style={{ ...card, padding: 18, display: 'flex', flexDirection: 'column' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 8 }}>
                      <b style={{ fontSize: 15.5, color: INK }}>{r.title}</b>
                      <span style={{ fontSize: 10.5, fontWeight: 700, background: dc.bg, color: dc.fg, borderRadius: 10, padding: '2px 9px', whiteSpace: 'nowrap' }}>{r.difficulty}</span>
                    </div>
                    <p style={{ fontSize: 13, color: '#475569', lineHeight: 1.55, margin: '8px 0 12px', flex: 1 }}>{r.description}</p>
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginBottom: 14 }}>{(r.techStack || []).slice(0, 6).map(chip)}</div>
                    <button onClick={() => start(r)} disabled={starting === r.title} style={{ background: PURPLE, color: '#fff', border: 'none', borderRadius: 8, padding: '9px', fontWeight: 700, fontSize: 13.5, cursor: 'pointer' }}>
                      {starting === r.title ? 'Adding…' : '+ Start this project'}
                    </button>
                  </div>
                );
              })}
            </div>
          </>
        )}

        {/* My projects */}
        <h3 style={{ fontSize: 16, fontWeight: 800, color: INK, margin: '0 0 12px' }}>My Projects ({projects.length})</h3>
        {projects.length === 0 ? (
          <div style={{ ...card, padding: 30, textAlign: 'center', color: MUTED }}>No projects yet — generate recommendations above and start one.</div>
        ) : (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: 16 }}>
            {projects.map(p => {
              const prog = pct(p);
              return (
                <div key={p._id} onClick={() => open(p)} style={{ ...card, padding: 18, cursor: 'pointer' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 8 }}>
                    <b style={{ fontSize: 15, color: INK }}>{p.title}</b>
                    <span style={{ fontSize: 10.5, fontWeight: 700, color: prog === 100 ? '#15803d' : '#4338ca' }}>{prog === 100 ? '✓ Done' : `${prog}%`}</span>
                  </div>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, margin: '10px 0 12px' }}>{(p.techStack || []).slice(0, 5).map(chip)}</div>
                  <div style={{ height: 7, background: '#eef1f6', borderRadius: 6, overflow: 'hidden' }}><div style={{ width: `${prog}%`, height: '100%', background: `linear-gradient(90deg,${PURPLE},${TEAL})` }} /></div>
                  <div style={{ fontSize: 11.5, color: MUTED, marginTop: 6 }}>{p.tasks?.filter(t => t.done).length || 0}/{p.tasks?.length || 0} tasks</div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Detail modal */}
      {sel && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(15,23,42,.55)', zIndex: 5000, display: 'grid', placeItems: 'center', padding: 20 }} onClick={() => setSel(null)}>
          <div style={{ background: '#fff', borderRadius: 16, width: 'min(820px, 96vw)', maxHeight: '92vh', overflow: 'auto' }} onClick={e => e.stopPropagation()}>
            <div style={{ position: 'sticky', top: 0, background: '#fff', borderBottom: '1px solid #eef1f6', padding: '16px 22px', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', zIndex: 2 }}>
              <div>
                <div style={{ fontSize: 12, color: '#94a3b8', fontWeight: 700 }}>{sel.difficulty} · {sel.targetRole || 'Project'}</div>
                <div style={{ fontSize: 20, fontWeight: 800, color: INK }}>{sel.title}</div>
              </div>
              <div style={{ display: 'flex', gap: 8 }}>
                <button onClick={() => del(sel._id!)} title="Delete" style={{ border: '1px solid #fecaca', color: '#dc2626', background: '#fff', borderRadius: 8, width: 34, height: 34, cursor: 'pointer' }}>🗑</button>
                <button onClick={() => setSel(null)} style={{ border: 'none', background: '#f1f5f9', borderRadius: 8, width: 34, height: 34, cursor: 'pointer', fontSize: 16, color: '#475569' }}>✕</button>
              </div>
            </div>

            <div style={{ display: 'flex', gap: 2, borderBottom: '1px solid #eef1f6', padding: '0 22px', overflowX: 'auto' }}>
              {(['overview', 'schema', 'api', 'screens', 'readme', 'deploy', 'tasks'] as const).map(t => (
                <button key={t} onClick={() => setTab(t)} style={{ padding: '11px 14px', border: 'none', background: 'none', cursor: 'pointer', fontSize: 13.5, fontWeight: 700, whiteSpace: 'nowrap', textTransform: 'capitalize', color: tab === t ? PURPLE : '#64748b', borderBottom: tab === t ? `2px solid ${PURPLE}` : '2px solid transparent' }}>
                  {t === 'api' ? 'APIs' : t}{t === 'tasks' ? ` (${sel.tasks?.filter(x => x.done).length || 0}/${sel.tasks?.length || 0})` : ''}
                </button>
              ))}
            </div>

            <div style={{ padding: '18px 22px 26px', fontSize: 14, color: '#334155', lineHeight: 1.6 }}>
              {tab === 'overview' && (
                <>
                  <p style={{ marginTop: 0 }}>{sel.description}</p>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, margin: '10px 0 16px' }}>{(sel.techStack || []).map(chip)}</div>
                  <b style={{ color: INK }}>Features</b>
                  <ul style={{ margin: '6px 0 0', paddingLeft: 20 }}>{(sel.features || []).map((f, i) => <li key={i}>{f}</li>)}</ul>
                </>
              )}
              {tab === 'schema' && <pre style={{ background: '#0f172a', color: '#e2e8f0', padding: 16, borderRadius: 10, overflow: 'auto', fontSize: 12.5, whiteSpace: 'pre-wrap' }}>{sel.dbSchema || 'No schema provided.'}</pre>}
              {tab === 'api' && (<ul style={{ margin: 0, paddingLeft: 18 }}>{(sel.apiList || []).map((a, i) => <li key={i} style={{ fontFamily: 'monospace', fontSize: 12.8, marginBottom: 5 }}>{a}</li>)}</ul>)}
              {tab === 'screens' && (<ul style={{ margin: 0, paddingLeft: 18 }}>{(sel.frontendScreens || []).map((s, i) => <li key={i}>{s}</li>)}</ul>)}
              {tab === 'readme' && (
                <div>
                  <button onClick={() => { navigator.clipboard?.writeText(sel.readme || ''); }} style={{ marginBottom: 10, border: '1px solid #e2e8f0', background: '#fff', borderRadius: 8, padding: '6px 12px', fontSize: 12.5, fontWeight: 600, cursor: 'pointer', color: '#475569' }}>📋 Copy README</button>
                  <pre style={{ background: '#f8fafc', border: '1px solid #eef1f6', padding: 16, borderRadius: 10, overflow: 'auto', fontSize: 12.8, whiteSpace: 'pre-wrap' }}>{sel.readme || 'No README.'}</pre>
                </div>
              )}
              {tab === 'deploy' && (<ol style={{ margin: 0, paddingLeft: 20 }}>{(sel.deploymentSteps || []).map((s, i) => <li key={i} style={{ marginBottom: 5 }}>{s}</li>)}</ol>)}
              {tab === 'tasks' && (
                <div>
                  <div style={{ height: 8, background: '#eef1f6', borderRadius: 6, overflow: 'hidden', marginBottom: 14 }}><div style={{ width: `${pct(sel)}%`, height: '100%', background: `linear-gradient(90deg,${PURPLE},${TEAL})` }} /></div>
                  {(sel.tasks || []).map((t, i) => (
                    <label key={i} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '8px 0', borderBottom: '1px solid #f1f5f9', cursor: 'pointer' }}>
                      <input type="checkbox" checked={t.done} onChange={e => toggle(i, e.target.checked)} />
                      <span style={{ textDecoration: t.done ? 'line-through' : 'none', color: t.done ? '#94a3b8' : '#334155' }}>{t.title}</span>
                    </label>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ProjectBuilder;
