import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { curriculumApi, Curriculum, CurriculumTemplate } from '../../api/curriculumApi';

export default function CurriculumList() {
  const navigate = useNavigate();
  const [view, setView]           = useState<'mine' | 'library'>('mine');
  const [curricula, setCurricula] = useState<Curriculum[]>([]);
  const [total, setTotal]         = useState(0);
  const [loading, setLoading]     = useState(true);
  const [search, setSearch]       = useState('');
  const [deleting, setDeleting]   = useState<string | null>(null);
  const [cloning, setCloning]     = useState<string | null>(null);
  const [toggling, setToggling]   = useState<string | null>(null);
  const [sharing, setSharing]     = useState<string | null>(null);
  const [templates, setTemplates] = useState<CurriculumTemplate[]>([]);
  const [tplLoading, setTplLoading] = useState(false);
  const [importing, setImporting] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await curriculumApi.list({ search: search || undefined });
      setCurricula(res.curricula);
      setTotal(res.total);
    } catch {
      // ignore
    } finally {
      setLoading(false);
    }
  }, [search]);

  useEffect(() => { load(); }, [load]);

  const handleDelete = async (c: Curriculum) => {
    if (!window.confirm(`Delete "${c.title}"? This cannot be undone.`)) return;
    setDeleting(c._id);
    try {
      await curriculumApi.delete(c._id);
      setCurricula(prev => prev.filter(x => x._id !== c._id));
      setTotal(prev => prev - 1);
    } catch (e: any) {
      alert(e?.response?.data?.message || 'Failed to delete');
    } finally {
      setDeleting(null);
    }
  };

  const handleClone = async (c: Curriculum) => {
    const newTitle = window.prompt('New curriculum name:', `${c.title} (Copy)`);
    if (!newTitle) return;
    setCloning(c._id);
    try {
      const cloned = await curriculumApi.clone(c._id, newTitle);
      setCurricula(prev => [cloned, ...prev]);
      setTotal(prev => prev + 1);
    } catch (e: any) {
      alert(e?.response?.data?.message || 'Failed to clone');
    } finally {
      setCloning(null);
    }
  };

  const handleTogglePublish = async (c: Curriculum) => {
    setToggling(c._id);
    try {
      const res = await curriculumApi.togglePublish(c._id);
      setCurricula(prev => prev.map(x => x._id === c._id ? { ...x, isPublished: res.isPublished } : x));
    } catch {
      alert('Failed to update publish status');
    } finally {
      setToggling(null);
    }
  };

  const handleShare = async (c: Curriculum) => {
    setSharing(c._id);
    try {
      const res = await curriculumApi.share(c._id, !c.shared);
      setCurricula(prev => prev.map(x => x._id === c._id ? { ...x, shared: res.shared } : x));
    } catch {
      alert('Failed to update sharing');
    } finally {
      setSharing(null);
    }
  };

  const loadTemplates = useCallback(async () => {
    setTplLoading(true);
    try { setTemplates(await curriculumApi.listTemplates(search || undefined)); }
    catch { /* ignore */ }
    finally { setTplLoading(false); }
  }, [search]);

  useEffect(() => { if (view === 'library') loadTemplates(); }, [view, loadTemplates]);

  const handleImport = async (t: CurriculumTemplate) => {
    const title = window.prompt('Import as (name in your tenant):', `${t.title}`);
    if (!title) return;
    setImporting(t._id);
    try {
      const r = await curriculumApi.cloneTemplate(t._id, title);
      const note = `Imported "${title}".\n${r.copiedContent} content item(s) copied.` +
        (r.skippedModules > 0 ? `\n${r.skippedModules} module activity(ies) skipped — re-add your own quizzes/assignments in the builder.` : '');
      alert(note);
      setView('mine');
      load();
      navigate(`/curriculum-builder/${r.curriculum._id}`);
    } catch (e: any) {
      alert(e?.response?.data?.message || 'Failed to import template');
    } finally {
      setImporting(null);
    }
  };

  const pct = (c: Curriculum) =>
    c.totalDays > 0 ? Math.round(((c.plannedDays || 0) / c.totalDays) * 100) : 0;

  return (
    <div style={{ padding: '24px', maxWidth: '1400px', margin: '0 auto' }}>

      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '24px', flexWrap: 'wrap', gap: '12px' }}>
        <div>
          <h2 style={{ margin: 0, fontSize: '24px', fontWeight: 700, color: '#0f172a' }}>
            📅 Curriculum Builder
          </h2>
          <p style={{ margin: '4px 0 0', color: '#64748b', fontSize: '14px' }}>
            Build structured 145-day learning plans from your content library
          </p>
        </div>
        <button
          onClick={() => navigate('/curriculum-builder/create')}
          style={{
            background: '#0f172a', color: '#fff', border: 'none',
            borderRadius: '8px', padding: '10px 20px',
            fontWeight: 600, fontSize: '14px', cursor: 'pointer',
          }}
        >
          + New Curriculum
        </button>
      </div>

      {/* View tabs */}
      <div style={{ display: 'flex', gap: '4px', borderBottom: '2px solid #e2e8f0', marginBottom: '20px' }}>
        {([['mine', '📚 My Curricula'], ['library', '🌐 Template Library']] as const).map(([k, label]) => (
          <button key={k} onClick={() => setView(k)} style={{
            padding: '10px 18px', border: 'none', background: 'none', cursor: 'pointer',
            fontWeight: 600, fontSize: '14px', color: view === k ? '#0f172a' : '#64748b',
            borderBottom: view === k ? '2px solid #0f172a' : '2px solid transparent', marginBottom: '-2px',
          }}>{label}</button>
        ))}
      </div>

      {/* Search */}
      <div style={{ marginBottom: '24px' }}>
        <input
          type="text"
          placeholder={view === 'mine' ? 'Search curricula...' : 'Search shared templates...'}
          value={search}
          onChange={e => setSearch(e.target.value)}
          style={{
            width: '100%', maxWidth: '400px', padding: '9px 14px',
            border: '1.5px solid #e2e8f0', borderRadius: '8px',
            fontSize: '14px', outline: 'none', boxSizing: 'border-box',
          }}
        />
      </div>

      {/* Stats row */}
      {view === 'mine' && !loading && (
        <div style={{ marginBottom: '20px', color: '#64748b', fontSize: '14px' }}>
          {total} curriculum{total !== 1 ? 'a' : ''}
          {curricula.filter(c => c.isPublished).length > 0 && (
            <span style={{ marginLeft: '12px', color: '#16a34a' }}>
              ● {curricula.filter(c => c.isPublished).length} published
            </span>
          )}
        </div>
      )}

      {view === 'mine' && (loading ? (
        <div style={{ textAlign: 'center', padding: '60px', color: '#94a3b8' }}>
          Loading curricula...
        </div>
      ) : curricula.length === 0 ? (
        <div style={{
          textAlign: 'center', padding: '80px 24px',
          background: '#f8fafc', borderRadius: '12px',
          border: '1.5px dashed #e2e8f0',
        }}>
          <div style={{ fontSize: '48px', marginBottom: '16px' }}>📭</div>
          <h3 style={{ color: '#0f172a', margin: '0 0 8px' }}>No curricula yet</h3>
          <p style={{ color: '#64748b', margin: '0 0 20px' }}>
            Create your first 145-day learning curriculum.
          </p>
          <button
            onClick={() => navigate('/curriculum-builder/create')}
            style={{
              background: '#0f172a', color: '#fff', border: 'none',
              borderRadius: '8px', padding: '10px 20px',
              fontWeight: 600, fontSize: '14px', cursor: 'pointer',
            }}
          >
            + New Curriculum
          </button>
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(340px, 1fr))', gap: '16px' }}>
          {curricula.map(c => {
            const progress = pct(c);
            return (
              <div key={c._id} style={{
                background: '#fff', borderRadius: '12px',
                border: '1.5px solid #e2e8f0', overflow: 'hidden',
                boxShadow: '0 1px 4px rgba(0,0,0,0.04)',
              }}>
                {/* Progress bar */}
                <div style={{ height: '4px', background: '#f1f5f9' }}>
                  <div style={{ height: '4px', background: '#0f172a', width: `${progress}%`, transition: 'width 0.3s' }} />
                </div>

                <div style={{ padding: '16px' }}>
                  {/* Title + publish */}
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '8px', marginBottom: '10px' }}>
                    <h3 style={{ margin: 0, fontSize: '16px', fontWeight: 700, color: '#0f172a', lineHeight: 1.3 }}>
                      {c.title}
                    </h3>
                    <button
                      onClick={() => handleTogglePublish(c)}
                      disabled={toggling === c._id}
                      style={{
                        flexShrink: 0,
                        background: c.isPublished ? '#dcfce7' : '#f1f5f9',
                        color: c.isPublished ? '#16a34a' : '#94a3b8',
                        border: 'none', borderRadius: '12px',
                        padding: '3px 10px', fontSize: '12px', fontWeight: 600,
                        cursor: 'pointer', whiteSpace: 'nowrap',
                      }}
                    >
                      {toggling === c._id ? '...' : c.isPublished ? '● Published' : '○ Draft'}
                    </button>
                  </div>

                  {/* Description */}
                  {c.description && (
                    <p style={{ margin: '0 0 10px', fontSize: '13px', color: '#64748b', lineHeight: 1.5 }}>
                      {c.description}
                    </p>
                  )}

                  {/* Meta badges */}
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px', marginBottom: '12px' }}>
                    {c.targetCourse && (
                      <span style={{ background: '#eff6ff', color: '#2563eb', borderRadius: '6px', padding: '2px 8px', fontSize: '12px', fontWeight: 500 }}>
                        {c.targetCourse}
                      </span>
                    )}
                    <span style={{ background: '#f8fafc', color: '#475569', borderRadius: '6px', padding: '2px 8px', fontSize: '12px' }}>
                      📅 {c.totalDays} days
                    </span>
                    <span style={{ background: '#f8fafc', color: '#475569', borderRadius: '6px', padding: '2px 8px', fontSize: '12px' }}>
                      📋 {c.plannedDays || 0} planned
                    </span>
                    {c.enrollmentCount > 0 && (
                      <span style={{ background: '#f0fdf4', color: '#15803d', borderRadius: '6px', padding: '2px 8px', fontSize: '12px' }}>
                        👥 {c.enrollmentCount} enrolled
                      </span>
                    )}
                  </div>

                  {/* Progress text */}
                  <div style={{ fontSize: '12px', color: '#94a3b8', marginBottom: '12px' }}>
                    {progress}% planned ({c.plannedDays || 0}/{c.totalDays} days have content)
                  </div>

                  {/* Actions */}
                  <div style={{ display: 'flex', gap: '8px' }}>
                    <button
                      onClick={() => navigate(`/curriculum-builder/${c._id}`)}
                      style={{
                        flex: 1, padding: '8px', border: '1.5px solid #0f172a',
                        borderRadius: '7px', background: '#0f172a', color: '#fff',
                        fontSize: '13px', fontWeight: 600, cursor: 'pointer',
                      }}
                    >
                      🏗 Open Builder
                    </button>
                    <button
                      onClick={() => handleShare(c)}
                      disabled={sharing === c._id}
                      title={c.shared ? 'Shared as template — click to unshare' : 'Share as cross-tenant template'}
                      style={{
                        padding: '8px 12px', border: `1.5px solid ${c.shared ? '#c7d2fe' : '#e2e8f0'}`,
                        borderRadius: '7px', background: c.shared ? '#eef2ff' : '#fff',
                        color: c.shared ? '#4338ca' : '#374151', fontSize: '13px', cursor: 'pointer',
                      }}
                    >
                      {sharing === c._id ? '...' : (c.shared ? '🌐 Shared' : '🌐')}
                    </button>
                    <button
                      onClick={() => handleClone(c)}
                      disabled={cloning === c._id}
                      title="Clone curriculum"
                      style={{
                        padding: '8px 12px', border: '1.5px solid #e2e8f0',
                        borderRadius: '7px', background: '#fff', color: '#374151',
                        fontSize: '13px', cursor: 'pointer',
                      }}
                    >
                      {cloning === c._id ? '...' : '📋'}
                    </button>
                    <button
                      onClick={() => handleDelete(c)}
                      disabled={deleting === c._id}
                      title="Delete curriculum"
                      style={{
                        padding: '8px 12px', border: '1.5px solid #fecaca',
                        borderRadius: '7px', background: '#fff', color: '#dc2626',
                        fontSize: '13px', cursor: 'pointer',
                      }}
                    >
                      {deleting === c._id ? '...' : '🗑'}
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      ))}

      {/* Template Library (cross-tenant) */}
      {view === 'library' && (
        tplLoading ? (
          <div style={{ textAlign: 'center', padding: '60px', color: '#94a3b8' }}>Loading templates...</div>
        ) : templates.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '80px 24px', background: '#f8fafc', borderRadius: '12px', border: '1.5px dashed #e2e8f0' }}>
            <div style={{ fontSize: '48px', marginBottom: '16px' }}>🌐</div>
            <h3 style={{ color: '#0f172a', margin: '0 0 8px' }}>No shared templates</h3>
            <p style={{ color: '#64748b', margin: 0 }}>Publish a curriculum as a template (Share) to make it importable across tenants.</p>
          </div>
        ) : (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(340px, 1fr))', gap: '16px' }}>
            {templates.map(t => (
              <div key={t._id} style={{ background: '#fff', borderRadius: '12px', border: '1.5px solid #e2e8f0', padding: '16px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '8px', marginBottom: '8px' }}>
                  <h3 style={{ margin: 0, fontSize: '16px', fontWeight: 700, color: '#0f172a', lineHeight: 1.3 }}>{t.title}</h3>
                  {t.isOwn && <span style={{ flexShrink: 0, background: '#eef2ff', color: '#4338ca', borderRadius: '12px', padding: '3px 10px', fontSize: '12px', fontWeight: 600 }}>Yours</span>}
                </div>
                {t.description && <p style={{ margin: '0 0 10px', fontSize: '13px', color: '#64748b', lineHeight: 1.5 }}>{t.description}</p>}
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px', marginBottom: '14px' }}>
                  {t.targetCourse && <span style={{ background: '#eff6ff', color: '#2563eb', borderRadius: '6px', padding: '2px 8px', fontSize: '12px', fontWeight: 500 }}>{t.targetCourse}</span>}
                  <span style={{ background: '#f8fafc', color: '#475569', borderRadius: '6px', padding: '2px 8px', fontSize: '12px' }}>📅 {t.totalDays} days</span>
                  <span style={{ background: '#f8fafc', color: '#475569', borderRadius: '6px', padding: '2px 8px', fontSize: '12px' }}>📚 {t.topicCount} topics</span>
                </div>
                <button onClick={() => handleImport(t)} disabled={importing === t._id} style={{
                  width: '100%', padding: '9px', border: 'none', borderRadius: '8px',
                  background: '#0f172a', color: '#fff', fontSize: '13px', fontWeight: 600, cursor: 'pointer',
                }}>
                  {importing === t._id ? 'Importing…' : '⬇ Import to my tenant'}
                </button>
              </div>
            ))}
          </div>
        )
      )}
    </div>
  );
}
