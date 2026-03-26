import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { studentProfileAPI, INTERESTED_COURSES } from '../../api/studentProfileAPI';
import { batchApi } from '../../api';
import { Spinner, Alert } from '../../components/common';
import './AdminStudentProfiles.css';

interface ProfileSummary {
  _id: string;
  userId: string;
  personalInfo: {
    firstName: string;
    middleName?: string;
    surname: string;
    email: string;
    mobileNumber?: string;
    city?: string;
    state?: string;
    gender?: string;
    dateOfBirth?: string;
    profilePhoto?: string;
  };
  education?: {
    highestQualification?: string;
    degree?: { name?: string; branch?: string; college?: string; percentage?: number; graduationYear?: number };
    intermediate?: { college?: string; group?: string; percentage?: number; yearOfPassing?: number };
    tenthClass?: { schoolName?: string; percentage?: number; yearOfPassing?: number };
    currentStatus?: string;
  };
  professionalProfiles?: {
    resumeUrl?: string;
    resumeName?: string;
    linkedInUrl?: string;
    githubUrl?: string;
    portfolioUrl?: string;
  };
  technicalBackground?: {
    programmingLanguages?: string[];
    technologies?: string[];
    experienceLevel?: string;
  };
  courseInterest?: {
    interestedCourse?: string;
    preferredLearningMode?: string;
  };
  additionalInfo?: { careerGoal?: string };
  profileCompletionPercentage: number;
  isProfileComplete: boolean;
  createdAt?: string;
}

interface Stats {
  total: number;
  complete: number;
  withResume: number;
  averageCompletion: number;
}

const EXPERIENCE_LEVELS = ['Beginner', 'Intermediate', 'Advanced'];
const CURRENT_STATUSES = ['Fresher', 'Working Professional', 'Student', 'Freelancer'];

const initials = (p: ProfileSummary) =>
  `${p.personalInfo.firstName?.[0] ?? ''}${p.personalInfo.surname?.[0] ?? ''}`.toUpperCase();

const avatarColor = (name: string) => {
  const colors = ['#005897', '#10b981', '#f59e0b', '#8b5cf6', '#ef4444', '#0ea5e9', '#ec4899'];
  return colors[(name.charCodeAt(0) || 0) % colors.length];
};

const ring = (pct: number, size = 52) => {
  const r = size * 0.38;
  const circ = 2 * Math.PI * r;
  const offset = circ - (pct / 100) * circ;
  const color = pct >= 80 ? '#22c55e' : pct >= 60 ? '#f59e0b' : '#ef4444';
  return { r, circ, offset, color, cx: size / 2, cy: size / 2, size };
};

const AdminStudentProfilesPage: React.FC = () => {
  const navigate = useNavigate();
  const [profiles, setProfiles] = useState<ProfileSummary[]>([]);
  const [stats, setStats] = useState<Stats>({ total: 0, complete: 0, withResume: 0, averageCompletion: 0 });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [search, setSearch] = useState('');
  const [filterCourse, setFilterCourse] = useState('');
  const [filterExp, setFilterExp] = useState('');
  const [filterStatus, setFilterStatus] = useState('');
  const [filterComplete, setFilterComplete] = useState<'all' | 'complete' | 'incomplete'>('all');
  const [filterBatch, setFilterBatch] = useState('');
  const [batches, setBatches] = useState<{ _id: string; name: string }[]>([]);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalCount, setTotalCount] = useState(0);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [detailProfile, setDetailProfile] = useState<ProfileSummary | null>(null);
  const [showEmailModal, setShowEmailModal] = useState(false);
  const searchTimeout = useRef<any>(null);

  useEffect(() => {
    fetchStats();
    batchApi.getBatches().then((res: any) => {
      setBatches(res.data || []);
    }).catch(() => {});
  }, []);

  useEffect(() => {
    clearTimeout(searchTimeout.current);
    searchTimeout.current = setTimeout(() => fetchProfiles(1), 400);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [search, filterCourse, filterExp, filterStatus, filterComplete, filterBatch]);

  const fetchStats = async () => {
    try {
      const res = await studentProfileAPI.getProfileStats();
      if (res.success && res.data) {
        setStats({
          total: res.data.total || 0,
          complete: res.data.complete || 0,
          withResume: res.data.withResume || 0,
          averageCompletion: Math.round(res.data.averageCompletion || 0),
        });
      }
    } catch { /* stats optional */ }
  };

  const fetchProfiles = async (pg: number) => {
    try {
      setLoading(true);
      const params: any = { page: pg, limit: 12, search: search || undefined };
      if (filterCourse) params.interestedCourse = filterCourse;
      if (filterExp) params.experienceLevel = filterExp;
      if (filterStatus) params.currentStatus = filterStatus;
      if (filterBatch) params.batchId = filterBatch;
      if (filterComplete === 'complete') params.isComplete = true;
      if (filterComplete === 'incomplete') params.isComplete = false;
      const res = await studentProfileAPI.getAllProfiles(params);
      const data = res.data || res;
      setProfiles(Array.isArray(data) ? data : (data.profiles || []));
      // Server returns data.pagination.pages and data.pagination.total
      const pagination = data.pagination || {};
      setTotalPages(pagination.pages || data.totalPages || 1);
      setTotalCount(pagination.total || data.total || 0);
      setPage(pg);
    } catch (e: any) {
      setError(e.message || 'Failed to load profiles');
    } finally {
      setLoading(false);
    }
  };

  const toggleSelect = (id: string) => {
    setSelectedIds(prev => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  };

  const selectAll = () => setSelectedIds(new Set(profiles.map(p => p._id)));
  const clearSelection = () => setSelectedIds(new Set());

  const selectedProfiles = profiles.filter(p => selectedIds.has(p._id));
  const selectedWithResume = selectedProfiles.filter(p => p.professionalProfiles?.resumeUrl);

  const handleViewProfile = (p: ProfileSummary) => {
    navigate(`/admin/student-profiles/${p.userId || p._id}`);
  };

  const openAllResumes = () => {
    selectedWithResume.forEach(p => {
      if (p.professionalProfiles?.resumeUrl) {
        window.open(p.professionalProfiles.resumeUrl, '_blank', 'noopener,noreferrer');
      }
    });
  };

  if (!loading && profiles.length === 0 && !error && !search && !filterCourse && !filterExp && !filterStatus && !filterBatch && filterComplete === 'all' && totalCount === 0) {
    return (
      <div className="asp-page">
        <div className="asp-header">
          <h1>Student Profiles</h1>
          <p>No student profiles have been submitted yet.</p>
        </div>
      </div>
    );
  }

  const rg = ring(stats.averageCompletion);

  return (
    <div className="asp-page">
      {/* Page Header */}
      <div className="asp-header">
        <div className="asp-header-left">
          <h1>Student Profiles</h1>
          <p>View, filter, and manage student profile submissions</p>
        </div>
        {selectedIds.size > 0 && (
          <div className="asp-bulk-bar">
            <span className="bulk-count">{selectedIds.size} selected</span>
            {selectedWithResume.length > 0 && (
              <button className="bulk-btn resume" onClick={openAllResumes}>
                📄 Open {selectedWithResume.length} Resume{selectedWithResume.length > 1 ? 's' : ''}
              </button>
            )}
            <button className="bulk-btn email" onClick={() => setShowEmailModal(true)}>
              ✉️ View Contacts
            </button>
            <button className="bulk-btn clear" onClick={clearSelection}>✕ Clear</button>
          </div>
        )}
      </div>

      {/* Stats Row */}
      <div className="asp-stats-row">
        <div className="asp-stat-card">
          <span className="asp-stat-icon">👥</span>
          <div>
            <div className="asp-stat-val">{stats.total}</div>
            <div className="asp-stat-lbl">Total Profiles</div>
          </div>
        </div>
        <div className="asp-stat-card">
          <span className="asp-stat-icon">✅</span>
          <div>
            <div className="asp-stat-val">{stats.complete}</div>
            <div className="asp-stat-lbl">Complete (&ge;80%)</div>
          </div>
        </div>
        <div className="asp-stat-card">
          <span className="asp-stat-icon">📄</span>
          <div>
            <div className="asp-stat-val">{stats.withResume}</div>
            <div className="asp-stat-lbl">Have Resume</div>
          </div>
        </div>
        <div className="asp-stat-card asp-stat-ring">
          <div className="asp-ring-wrap">
            <svg width={rg.size} height={rg.size}>
              <circle cx={rg.cx} cy={rg.cy} r={rg.r} fill="none" stroke="#e2e8f0" strokeWidth="5" />
              <circle cx={rg.cx} cy={rg.cy} r={rg.r} fill="none" stroke={rg.color} strokeWidth="5"
                strokeLinecap="round" strokeDasharray={rg.circ} strokeDashoffset={rg.offset}
                transform={`rotate(-90 ${rg.cx} ${rg.cy})`} />
            </svg>
            <span className="asp-ring-val" style={{ color: rg.color }}>{stats.averageCompletion}%</span>
          </div>
          <div>
            <div className="asp-stat-val">{stats.averageCompletion}%</div>
            <div className="asp-stat-lbl">Avg Completion</div>
          </div>
        </div>
      </div>

      {error && <Alert type="error" message={error} onClose={() => setError('')} />}

      {/* Filters */}
      <div className="asp-filters">
        <input
          className="asp-search"
          placeholder="🔍 Search by name or email…"
          value={search}
          onChange={e => setSearch(e.target.value)}
        />
        <select className="asp-select" value={filterCourse} onChange={e => setFilterCourse(e.target.value)}>
          <option value="">All Courses</option>
          {INTERESTED_COURSES.map(c => <option key={c.value} value={c.value}>{c.label}</option>)}
        </select>
        <select className="asp-select" value={filterExp} onChange={e => setFilterExp(e.target.value)}>
          <option value="">All Experience</option>
          {EXPERIENCE_LEVELS.map(e => <option key={e} value={e}>{e}</option>)}
        </select>
        <select className="asp-select" value={filterStatus} onChange={e => setFilterStatus(e.target.value)}>
          <option value="">All Status</option>
          {CURRENT_STATUSES.map(s => <option key={s} value={s}>{s}</option>)}
        </select>
        <select className="asp-select" value={filterBatch} onChange={e => setFilterBatch(e.target.value)}>
          <option value="">All Batches</option>
          {batches.map(b => <option key={b._id} value={b._id}>{b.name}</option>)}
        </select>
        <select className="asp-select" value={filterComplete} onChange={e => setFilterComplete(e.target.value as any)}>
          <option value="all">All Completion</option>
          <option value="complete">Complete (&ge;80%)</option>
          <option value="incomplete">Incomplete</option>
        </select>
        <div className="asp-sel-btns">
          <button className="asp-sel-btn" onClick={selectAll}>Select All</button>
          {selectedIds.size > 0 && <button className="asp-sel-btn clear" onClick={clearSelection}>Deselect</button>}
        </div>
      </div>

      {/* Profile Grid */}
      {loading ? (
        <div className="asp-loading"><Spinner /></div>
      ) : (
        <>
          <div className="asp-grid">
            {profiles.map(p => {
              const pct = p.profileCompletionPercentage;
              const rg = ring(pct);
              const selected = selectedIds.has(p._id);
              const hasResume = !!p.professionalProfiles?.resumeUrl;
              const fullName = `${p.personalInfo.firstName} ${p.personalInfo.surname}`;
              return (
                <div key={p._id} className={`asp-card ${selected ? 'selected' : ''}`} onClick={() => toggleSelect(p._id)}>
                  <input type="checkbox" className="asp-checkbox" checked={selected} onChange={() => toggleSelect(p._id)} onClick={e => e.stopPropagation()} />

                  {/* Avatar */}
                  <div className="asp-card-top">
                    {p.personalInfo.profilePhoto ? (
                      <img src={p.personalInfo.profilePhoto} alt={fullName} className="asp-avatar-img" />
                    ) : (
                      <div className="asp-avatar-initials" style={{ background: avatarColor(p.personalInfo.firstName) }}>
                        {initials(p)}
                      </div>
                    )}
                    <div className="asp-card-ring">
                      <svg width={rg.size} height={rg.size}>
                        <circle cx={rg.cx} cy={rg.cy} r={rg.r} fill="none" stroke="#e2e8f0" strokeWidth="5" />
                        <circle cx={rg.cx} cy={rg.cy} r={rg.r} fill="none" stroke={rg.color} strokeWidth="5"
                          strokeLinecap="round" strokeDasharray={rg.circ} strokeDashoffset={rg.offset}
                          transform={`rotate(-90 ${rg.cx} ${rg.cy})`} />
                      </svg>
                      <span className="asp-card-ring-val" style={{ color: rg.color }}>{pct}%</span>
                    </div>
                  </div>

                  {/* Info */}
                  <div className="asp-card-name">{fullName}</div>
                  <div className="asp-card-email">{p.personalInfo.email}</div>
                  {p.personalInfo.city && <div className="asp-card-location">📍 {p.personalInfo.city}{p.personalInfo.state ? `, ${p.personalInfo.state}` : ''}</div>}

                  {/* Badges */}
                  <div className="asp-card-badges">
                    {p.courseInterest?.interestedCourse && (
                      <span className="asp-badge course">{p.courseInterest.interestedCourse}</span>
                    )}
                    {p.technicalBackground?.experienceLevel && (
                      <span className="asp-badge exp">{p.technicalBackground.experienceLevel}</span>
                    )}
                    {p.education?.currentStatus && (
                      <span className="asp-badge status">{p.education.currentStatus}</span>
                    )}
                  </div>

                  {/* Resume / Skills */}
                  <div className="asp-card-tags">
                    {p.technicalBackground?.programmingLanguages?.slice(0, 3).map(l => (
                      <span key={l} className="asp-tag">{l}</span>
                    ))}
                  </div>

                  {/* Actions */}
                  <div className="asp-card-actions" onClick={e => e.stopPropagation()}>
                    <button className="asp-action-btn view" onClick={() => handleViewProfile(p)}>
                      👁 View Profile
                    </button>
                    {hasResume ? (
                      <a
                        className="asp-action-btn resume"
                        href={p.professionalProfiles!.resumeUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                      >
                        📄 Resume
                      </a>
                    ) : (
                      <span className="asp-action-btn no-resume">No Resume</span>
                    )}
                  </div>
                </div>
              );
            })}
          </div>

          {/* Pagination */}
          {(totalPages > 1 || totalCount > 0) && (
            <div className="asp-pagination">
              <span className="asp-page-count">
                {totalCount > 0 && (
                  <>Showing {Math.min((page - 1) * 12 + 1, totalCount)}–{Math.min(page * 12, totalCount)} of <strong>{totalCount}</strong> profiles</>
                )}
              </span>
              <div className="asp-page-controls">
                <button disabled={page <= 1} onClick={() => fetchProfiles(page - 1)} className="asp-page-btn">‹ Prev</button>
                {Array.from({ length: totalPages }, (_, i) => i + 1)
                  .filter(p => p === 1 || p === totalPages || Math.abs(p - page) <= 2)
                  .reduce<(number | '...')[]>((acc, p, idx, arr) => {
                    if (idx > 0 && p - (arr[idx - 1] as number) > 1) acc.push('...');
                    acc.push(p);
                    return acc;
                  }, [])
                  .map((p, i) =>
                    p === '...'
                      ? <span key={`ellipsis-${i}`} className="asp-page-ellipsis">…</span>
                      : <button
                          key={p}
                          onClick={() => fetchProfiles(p as number)}
                          className={`asp-page-btn ${page === p ? 'active' : ''}`}
                        >{p}</button>
                  )}
                <button disabled={page >= totalPages} onClick={() => fetchProfiles(page + 1)} className="asp-page-btn">Next ›</button>
              </div>
            </div>
          )}
        </>
      )}

      {/* Profile Detail is now a dedicated page — see /admin/student-profiles/:userId */}

      {/* Email / Contact Modal */}
      {showEmailModal && (
        <div className="asp-modal-overlay" onClick={() => setShowEmailModal(false)}>
          <div className="asp-modal small" onClick={e => e.stopPropagation()}>
            <button className="asp-modal-close" onClick={() => setShowEmailModal(false)}>✕</button>
            <h2 style={{ marginTop: 0 }}>Selected Student Contacts</h2>
            <p style={{ color: '#64748b', fontSize: '0.9rem' }}>{selectedProfiles.length} students selected · {selectedWithResume.length} have resumes</p>
            <div className="asp-email-list">
              {selectedProfiles.map(p => (
                <div key={p._id} className="asp-email-row">
                  <div className="asp-avatar-initials small" style={{ background: avatarColor(p.personalInfo.firstName) }}>
                    {initials(p)}
                  </div>
                  <div>
                    <div className="asp-email-name">{p.personalInfo.firstName} {p.personalInfo.surname}</div>
                    <div className="asp-email-addr">{p.personalInfo.email}</div>
                    {p.personalInfo.mobileNumber && <div className="asp-email-phone">📞 {p.personalInfo.mobileNumber}</div>}
                  </div>
                  {p.professionalProfiles?.resumeUrl && (
                    <a href={p.professionalProfiles.resumeUrl} target="_blank" rel="noopener noreferrer" className="asp-action-btn resume small">
                      📄
                    </a>
                  )}
                </div>
              ))}
            </div>
            {selectedWithResume.length > 0 && (
              <button className="bulk-btn resume" style={{ marginTop: '16px', width: '100%' }} onClick={openAllResumes}>
                📄 Open All {selectedWithResume.length} Resumes
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminStudentProfilesPage;
