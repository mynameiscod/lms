import React, { useEffect, useState, useCallback } from 'react';
import { alumniApi } from '../../api';
import { Spinner, Alert } from '../../components/common';
import './AlumniDirectory.css';

interface AlumniProfile {
  _id: string;
  firstName: string;
  lastName: string;
  email?: string;
  graduationYear: number;
  department?: string;
  currentCompany?: string;
  currentRole?: string;
  currentLocation?: string;
  ctcPackage?: number;
  linkedInUrl?: string;
  testimonial?: string;
  isAvailableForMentoring: boolean;
}

interface MentoringRequestForm {
  alumniId: string;
  alumniName: string;
  message: string;
}

const AlumniDirectoryPage: React.FC = () => {
  const [alumni, setAlumni] = useState<AlumniProfile[]>([]);
  const [filtered, setFiltered] = useState<AlumniProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  // Filters
  const [search, setSearch] = useState('');
  const [yearFilter, setYearFilter] = useState('');
  const [deptFilter, setDeptFilter] = useState('');
  const [mentorOnly, setMentorOnly] = useState(false);

  // Mentoring request modal
  const [requestForm, setRequestForm] = useState<MentoringRequestForm | null>(null);
  const [requestMsg, setRequestMsg] = useState('');
  const [submittingRequest, setSubmittingRequest] = useState(false);

  // Referrals + success stories
  const [referrals, setReferrals] = useState<any[]>([]);
  const [stories, setStories] = useState<any[]>([]);
  const [interested, setInterested] = useState<Record<string, boolean>>({});

  const loadAlumni = useCallback(async () => {
    try {
      setLoading(true);
      const res = await alumniApi.list();
      if (res.success) {
        setAlumni(res.data || []);
        setFiltered(res.data || []);
      }
    } catch {
      setError('Failed to load alumni directory');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { loadAlumni(); }, [loadAlumni]);

  useEffect(() => {
    (alumniApi as any).listReferrals().then((r: any) => { if (r.success) setReferrals(r.data || []); }).catch(() => {});
    (alumniApi as any).getSuccessStories().then((r: any) => { if (r.success) setStories(r.data || []); }).catch(() => {});
  }, []);

  const expressInterest = async (id: string) => {
    try { const r = await (alumniApi as any).expressInterest(id); if (r.success) { setInterested(m => ({ ...m, [id]: true })); setSuccess('Interest registered — the placement team will be in touch.'); } }
    catch { setError('Could not register interest.'); }
  };

  useEffect(() => {
    let list = [...alumni];
    if (search.trim()) {
      const q = search.toLowerCase();
      list = list.filter(a =>
        `${a.firstName} ${a.lastName}`.toLowerCase().includes(q) ||
        (a.currentCompany || '').toLowerCase().includes(q) ||
        (a.currentRole || '').toLowerCase().includes(q) ||
        (a.department || '').toLowerCase().includes(q)
      );
    }
    if (yearFilter) list = list.filter(a => String(a.graduationYear) === yearFilter);
    if (deptFilter) list = list.filter(a => (a.department || '') === deptFilter);
    if (mentorOnly) list = list.filter(a => a.isAvailableForMentoring);
    setFiltered(list);
  }, [search, yearFilter, deptFilter, mentorOnly, alumni]);

  const uniqueYears = [...new Set(alumni.map(a => a.graduationYear))].sort((a, b) => b - a);
  const uniqueDepts = [...new Set(alumni.map(a => a.department || '').filter(Boolean))].sort();

  const openRequest = (a: AlumniProfile) => {
    setRequestForm({ alumniId: a._id, alumniName: `${a.firstName} ${a.lastName}`, message: '' });
    setRequestMsg('');
  };

  const submitRequest = async () => {
    if (!requestForm || !requestMsg.trim()) return;
    try {
      setSubmittingRequest(true);
      const res = await alumniApi.requestMentoring(requestForm.alumniId, requestMsg.trim());
      if (res.success) {
        setSuccess(`Mentoring request sent to ${requestForm.alumniName}!`);
        setRequestForm(null);
        setTimeout(() => setSuccess(''), 4000);
      } else {
        setError(res.message || 'Failed to send request');
      }
    } catch (e: any) {
      setError(e.message || 'Failed to send request');
    } finally {
      setSubmittingRequest(false);
    }
  };

  if (loading) return <Spinner fullScreen />;

  return (
    <div className="alumni-dir">
      <div className="alumni-dir-header">
        <h1><i className="fa-solid fa-graduation-cap" /> Alumni Directory</h1>
        <p>Connect with our alumni network and request mentoring from industry professionals.</p>
      </div>

      {error && <Alert type="error" message={error} onClose={() => setError('')} />}
      {success && <Alert type="success" message={success} />}

      {/* Success Stories strip */}
      {stories.length > 0 && (
        <div style={{ background: '#fff', border: '1px solid #e6e8f0', borderRadius: 14, padding: 16, marginBottom: 16 }}>
          <div style={{ fontSize: 14, fontWeight: 800, color: '#0f172a', marginBottom: 10 }}>🌟 Success Stories</div>
          <div style={{ display: 'flex', gap: 12, overflowX: 'auto', paddingBottom: 4 }}>
            {stories.map((s: any) => (
              <div key={s._id} style={{ minWidth: 250, maxWidth: 250, background: '#f8fafc', border: '1px solid #eef1f6', borderRadius: 12, padding: 14, flexShrink: 0 }}>
                <div style={{ fontWeight: 700, color: '#0f172a', fontSize: 14 }}>{s.firstName} {s.lastName}{s.featured && <span style={{ color: '#d97706' }}> ★</span>}</div>
                <div style={{ fontSize: 12.5, color: '#334155', marginTop: 2 }}>{s.currentRole ? `${s.currentRole} · ` : ''}<b>{s.currentCompany || '—'}</b>{s.ctcPackage ? ` · ₹${s.ctcPackage} LPA` : ''}</div>
                <div style={{ fontSize: 11.5, color: '#94a3b8', marginTop: 2 }}>{s.department ? `${s.department} · ` : ''}Batch of {s.graduationYear}</div>
                {(s.story || s.testimonial) && <div style={{ fontSize: 12.5, color: '#475569', marginTop: 8, fontStyle: 'italic', display: '-webkit-box', WebkitLineClamp: 4, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>"{s.story || s.testimonial}"</div>}
                {s.linkedInUrl && <a href={s.linkedInUrl} target="_blank" rel="noreferrer" style={{ fontSize: 12, color: '#2563eb', fontWeight: 600, marginTop: 6, display: 'inline-block' }}>LinkedIn ↗</a>}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Alumni referrals */}
      {referrals.length > 0 && (
        <div style={{ background: '#fff', border: '1px solid #e6e8f0', borderRadius: 14, padding: 16, marginBottom: 16 }}>
          <div style={{ fontSize: 14, fontWeight: 800, color: '#0f172a', marginBottom: 10 }}>💼 Job referrals from our alumni</div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill,minmax(280px,1fr))', gap: 12 }}>
            {referrals.map((r: any) => (
              <div key={r._id} style={{ border: '1px solid #eef1f6', borderRadius: 12, padding: 14, background: '#f8fafc' }}>
                <div style={{ fontWeight: 700, color: '#0f172a', fontSize: 14 }}>{r.role}</div>
                <div style={{ fontSize: 13, color: '#334155' }}><b>{r.company}</b>{r.location ? ` · ${r.location}` : ''}{r.workMode ? ` · ${r.workMode}` : ''}{r.ctc ? ` · ${r.ctc}` : ''}</div>
                {r.alumniName && <div style={{ fontSize: 11.5, color: '#94a3b8', marginTop: 2 }}>Referred by {r.alumniName}</div>}
                {r.description && <div style={{ fontSize: 12.5, color: '#475569', marginTop: 6 }}>{r.description}</div>}
                {r.skills?.length > 0 && <div style={{ display: 'flex', gap: 5, flexWrap: 'wrap', marginTop: 8 }}>{r.skills.map((sk: string) => <span key={sk} style={{ fontSize: 11, background: '#eef2ff', color: '#4338ca', borderRadius: 12, padding: '2px 9px' }}>{sk}</span>)}</div>}
                {r.deadline && <div style={{ fontSize: 11.5, color: '#b45309', fontWeight: 600, marginTop: 6 }}>Apply by {new Date(r.deadline).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}</div>}
                <div style={{ display: 'flex', gap: 8, marginTop: 10 }}>
                  <button onClick={() => expressInterest(r._id)} disabled={interested[r._id]} style={{ flex: 1, background: interested[r._id] ? '#dcfce7' : '#2563eb', color: interested[r._id] ? '#15803d' : '#fff', border: 'none', borderRadius: 8, padding: '8px', fontWeight: 700, fontSize: 12.5, cursor: interested[r._id] ? 'default' : 'pointer' }}>{interested[r._id] ? '✓ Interested' : "I'm interested"}</button>
                  {r.applyUrl && <a href={r.applyUrl} target="_blank" rel="noreferrer" style={{ border: '1px solid #cbd5e1', borderRadius: 8, padding: '8px 12px', fontSize: 12.5, fontWeight: 700, color: '#475569', textDecoration: 'none' }}>Apply ↗</a>}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Filters */}
      <div className="alumni-dir-filters">
        <input
          className="alumni-dir-search"
          type="text"
          placeholder="Search by name, company, role, department..."
          value={search}
          onChange={e => setSearch(e.target.value)}
        />
        <select className="alumni-dir-select" value={yearFilter} onChange={e => setYearFilter(e.target.value)}>
          <option value="">All Years</option>
          {uniqueYears.map(y => <option key={y} value={y}>{y}</option>)}
        </select>
        <select className="alumni-dir-select" value={deptFilter} onChange={e => setDeptFilter(e.target.value)}>
          <option value="">All Departments</option>
          {uniqueDepts.map(d => <option key={d} value={d}>{d}</option>)}
        </select>
        <label className="alumni-dir-mentor-toggle">
          <input type="checkbox" checked={mentorOnly} onChange={e => setMentorOnly(e.target.checked)} />
          <span>Mentors only</span>
        </label>
      </div>

      <div className="alumni-dir-count">{filtered.length} alumni found</div>

      {/* Grid */}
      <div className="alumni-dir-grid">
        {filtered.length === 0 ? (
          <div className="alumni-dir-empty">No alumni match your filters.</div>
        ) : filtered.map(a => (
          <div key={a._id} className="alumni-card">
            <div className="alumni-card-top">
              <div className="alumni-avatar">
                {a.firstName.charAt(0)}{a.lastName.charAt(0)}
              </div>
              <div className="alumni-card-info">
                <h3>{a.firstName} {a.lastName}</h3>
                <p className="alumni-card-role">{a.currentRole || 'Professional'}{a.currentCompany ? ` @ ${a.currentCompany}` : ''}</p>
                <p className="alumni-card-year">Batch of {a.graduationYear}</p>
              </div>
            </div>

            <div className="alumni-card-details">
              {a.department && (
                <span className="alumni-tag"><i className="fa-solid fa-building-columns" /> {a.department}</span>
              )}
              {a.currentLocation && (
                <span className="alumni-tag"><i className="fa-solid fa-location-dot" /> {a.currentLocation}</span>
              )}
              {a.ctcPackage && (
                <span className="alumni-tag alumni-tag-green"><i className="fa-solid fa-indian-rupee-sign" /> {a.ctcPackage} LPA</span>
              )}
              {a.isAvailableForMentoring && (
                <span className="alumni-tag alumni-tag-primary"><i className="fa-solid fa-handshake" /> Mentor</span>
              )}
            </div>

            {a.testimonial && (
              <p className="alumni-card-testimonial">"{a.testimonial}"</p>
            )}

            <div className="alumni-card-actions">
              {a.linkedInUrl && (
                <a href={a.linkedInUrl} target="_blank" rel="noopener noreferrer" className="alumni-btn alumni-btn-outline">
                  <i className="fa-brands fa-linkedin" /> LinkedIn
                </a>
              )}
              {a.isAvailableForMentoring && (
                <button className="alumni-btn alumni-btn-primary" onClick={() => openRequest(a)}>
                  <i className="fa-solid fa-paper-plane" /> Request Mentoring
                </button>
              )}
            </div>
          </div>
        ))}
      </div>

      {/* Mentoring Request Modal */}
      {requestForm && (
        <div className="alumni-modal-overlay" onClick={() => setRequestForm(null)}>
          <div className="alumni-modal" onClick={e => e.stopPropagation()}>
            <div className="alumni-modal-header">
              <h2>Request Mentoring</h2>
              <button className="alumni-modal-close" onClick={() => setRequestForm(null)}>
                <i className="fa-solid fa-xmark" />
              </button>
            </div>
            <p className="alumni-modal-sub">Sending request to <strong>{requestForm.alumniName}</strong></p>
            <textarea
              className="alumni-modal-textarea"
              placeholder="Introduce yourself and explain what guidance you're looking for..."
              value={requestMsg}
              onChange={e => setRequestMsg(e.target.value)}
              rows={5}
              maxLength={1000}
            />
            <div className="alumni-modal-footer">
              <button className="alumni-btn alumni-btn-outline" onClick={() => setRequestForm(null)}>Cancel</button>
              <button
                className="alumni-btn alumni-btn-primary"
                onClick={submitRequest}
                disabled={submittingRequest || !requestMsg.trim()}
              >
                {submittingRequest ? 'Sending...' : 'Send Request'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AlumniDirectoryPage;
