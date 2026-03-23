import React, { useState, useEffect, useRef } from 'react';
import { studentProfileAPI, INTERESTED_COURSES } from '../../api/studentProfileAPI';
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
  const [profiles, setProfiles] = useState<ProfileSummary[]>([]);
  const [stats, setStats] = useState<Stats>({ total: 0, complete: 0, withResume: 0, averageCompletion: 0 });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [search, setSearch] = useState('');
  const [filterCourse, setFilterCourse] = useState('');
  const [filterExp, setFilterExp] = useState('');
  const [filterStatus, setFilterStatus] = useState('');
  const [filterComplete, setFilterComplete] = useState<'all' | 'complete' | 'incomplete'>('all');
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [detailProfile, setDetailProfile] = useState<ProfileSummary | null>(null);
  const [showEmailModal, setShowEmailModal] = useState(false);
  const searchTimeout = useRef<any>(null);

  useEffect(() => {
    fetchStats();
  }, []);

  useEffect(() => {
    clearTimeout(searchTimeout.current);
    searchTimeout.current = setTimeout(() => fetchProfiles(1), 400);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [search, filterCourse, filterExp, filterStatus, filterComplete]);

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
      if (filterComplete === 'complete') params.isComplete = true;
      if (filterComplete === 'incomplete') params.isComplete = false;
      const res = await studentProfileAPI.getAllProfiles(params);
      const data = res.data || res;
      setProfiles(Array.isArray(data) ? data : (data.profiles || []));
      setTotalPages(data.totalPages || 1);
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

  const handleViewProfile = async (p: ProfileSummary) => {
    try {
      const res = await studentProfileAPI.getProfileByUserId(p.userId || p._id);
      setDetailProfile(res.data || res || p);
    } catch {
      setDetailProfile(p);
    }
  };

  const openAllResumes = () => {
    selectedWithResume.forEach(p => {
      if (p.professionalProfiles?.resumeUrl) {
        window.open(p.professionalProfiles.resumeUrl, '_blank', 'noopener,noreferrer');
      }
    });
  };

  if (!loading && profiles.length === 0 && !error && !search && !filterCourse && !filterExp && !filterStatus && filterComplete === 'all') {
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
          {totalPages > 1 && (
            <div className="asp-pagination">
              <button disabled={page <= 1} onClick={() => fetchProfiles(page - 1)} className="asp-page-btn">‹ Prev</button>
              <span className="asp-page-info">Page {page} of {totalPages}</span>
              <button disabled={page >= totalPages} onClick={() => fetchProfiles(page + 1)} className="asp-page-btn">Next ›</button>
            </div>
          )}
        </>
      )}

      {/* Profile Detail Modal */}
      {detailProfile && (
        <div className="asp-modal-overlay" onClick={() => setDetailProfile(null)}>
          <div className="asp-modal" onClick={e => e.stopPropagation()}>
            <button className="asp-modal-close" onClick={() => setDetailProfile(null)}>✕</button>

            {/* Modal Header */}
            <div className="asp-modal-header">
              {detailProfile.personalInfo.profilePhoto ? (
                <img src={detailProfile.personalInfo.profilePhoto} alt="" className="asp-modal-photo" />
              ) : (
                <div className="asp-modal-avatar" style={{ background: avatarColor(detailProfile.personalInfo.firstName) }}>
                  {initials(detailProfile)}
                </div>
              )}
              <div className="asp-modal-identity">
                <h2>{detailProfile.personalInfo.firstName} {detailProfile.personalInfo.middleName || ''} {detailProfile.personalInfo.surname}</h2>
                <p>{detailProfile.personalInfo.email}</p>
                {detailProfile.personalInfo.mobileNumber && <p>📞 {detailProfile.personalInfo.mobileNumber}</p>}
                {detailProfile.personalInfo.city && <p>📍 {detailProfile.personalInfo.city}, {detailProfile.personalInfo.state}</p>}
              </div>
              {(() => {
                const pct = detailProfile.profileCompletionPercentage;
                const rg = ring(pct, 80);
                return (
                  <div className="asp-modal-ring">
                    <svg width={rg.size} height={rg.size}>
                      <circle cx={rg.cx} cy={rg.cy} r={rg.r} fill="none" stroke="#e2e8f0" strokeWidth="7" />
                      <circle cx={rg.cx} cy={rg.cy} r={rg.r} fill="none" stroke={rg.color} strokeWidth="7"
                        strokeLinecap="round" strokeDasharray={rg.circ} strokeDashoffset={rg.offset}
                        transform={`rotate(-90 ${rg.cx} ${rg.cy})`} />
                    </svg>
                    <div className="asp-modal-ring-label">
                      <span style={{ color: rg.color, fontSize: '1.2rem', fontWeight: 800 }}>{pct}%</span>
                      <span style={{ fontSize: '0.7rem', color: '#64748b' }}>Complete</span>
                    </div>
                  </div>
                );
              })()}
            </div>

            {/* Modal Body */}
            <div className="asp-modal-body">
              {/* Education */}
              {detailProfile.education && (
                <div className="asp-modal-section">
                  <h3>🎓 Education</h3>
                  <div className="asp-modal-grid">
                    {detailProfile.education.highestQualification && <div><label>Qualification</label><span>{detailProfile.education.highestQualification}</span></div>}
                    {detailProfile.education.degree?.name && <div><label>Degree</label><span>{detailProfile.education.degree.name} — {detailProfile.education.degree.branch}</span></div>}
                    {detailProfile.education.degree?.college && <div><label>College</label><span>{detailProfile.education.degree.college}</span></div>}
                    {detailProfile.education.degree?.percentage !== undefined && <div><label>Degree %</label><span>{detailProfile.education.degree.percentage}%</span></div>}
                    {detailProfile.education.degree?.graduationYear && <div><label>Graduation Year</label><span>{detailProfile.education.degree.graduationYear}</span></div>}
                    {detailProfile.education.intermediate?.percentage !== undefined && <div><label>Intermediate %</label><span>{detailProfile.education.intermediate.percentage}%</span></div>}
                    {detailProfile.education.tenthClass?.percentage !== undefined && <div><label>10th %</label><span>{detailProfile.education.tenthClass.percentage}%</span></div>}
                    {detailProfile.education.currentStatus && <div><label>Current Status</label><span>{detailProfile.education.currentStatus}</span></div>}
                  </div>
                </div>
              )}

              {/* Technical */}
              {detailProfile.technicalBackground && (
                <div className="asp-modal-section">
                  <h3>💻 Technical Background</h3>
                  <div className="asp-modal-grid">
                    {detailProfile.technicalBackground.experienceLevel && <div><label>Experience</label><span>{detailProfile.technicalBackground.experienceLevel}</span></div>}
                    {detailProfile.technicalBackground.programmingLanguages?.length ? (
                      <div className="full"><label>Languages</label>
                        <div className="asp-tags">
                          {detailProfile.technicalBackground.programmingLanguages.map(l => <span key={l} className="asp-tag">{l}</span>)}
                        </div>
                      </div>
                    ) : null}
                    {detailProfile.technicalBackground.technologies?.length ? (
                      <div className="full"><label>Technologies</label>
                        <div className="asp-tags">
                          {detailProfile.technicalBackground.technologies.map(t => <span key={t} className="asp-tag blue">{t}</span>)}
                        </div>
                      </div>
                    ) : null}
                  </div>
                </div>
              )}

              {/* Course Interest */}
              {detailProfile.courseInterest?.interestedCourse && (
                <div className="asp-modal-section">
                  <h3>📚 Course Interest</h3>
                  <div className="asp-modal-grid">
                    <div><label>Interested Course</label><span>{detailProfile.courseInterest.interestedCourse}</span></div>
                    {detailProfile.courseInterest.preferredLearningMode && <div><label>Learning Mode</label><span>{detailProfile.courseInterest.preferredLearningMode}</span></div>}
                  </div>
                </div>
              )}

              {/* Professional Links */}
              {detailProfile.professionalProfiles && (
                <div className="asp-modal-section">
                  <h3>🔗 Professional Profiles</h3>
                  <div className="asp-modal-links">
                    {detailProfile.professionalProfiles.resumeUrl && (
                      <a href={detailProfile.professionalProfiles.resumeUrl} target="_blank" rel="noopener noreferrer" className="asp-link-btn resume">
                        📄 Download Resume
                      </a>
                    )}
                    {detailProfile.professionalProfiles.linkedInUrl && (
                      <a href={detailProfile.professionalProfiles.linkedInUrl} target="_blank" rel="noopener noreferrer" className="asp-link-btn linkedin">
                        🔗 LinkedIn
                      </a>
                    )}
                    {detailProfile.professionalProfiles.githubUrl && (
                      <a href={detailProfile.professionalProfiles.githubUrl} target="_blank" rel="noopener noreferrer" className="asp-link-btn github">
                        🐙 GitHub
                      </a>
                    )}
                    {detailProfile.professionalProfiles.portfolioUrl && (
                      <a href={detailProfile.professionalProfiles.portfolioUrl} target="_blank" rel="noopener noreferrer" className="asp-link-btn portfolio">
                        🌐 Portfolio
                      </a>
                    )}
                    {!detailProfile.professionalProfiles.resumeUrl && !detailProfile.professionalProfiles.linkedInUrl && !detailProfile.professionalProfiles.githubUrl && (
                      <p style={{ color: '#94a3b8', fontSize: '0.9rem' }}>No professional links provided</p>
                    )}
                  </div>
                </div>
              )}

              {detailProfile.additionalInfo?.careerGoal && (
                <div className="asp-modal-section">
                  <h3>🎯 Career Goal</h3>
                  <p className="asp-career-goal">{detailProfile.additionalInfo.careerGoal}</p>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

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
