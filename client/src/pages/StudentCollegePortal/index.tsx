import React, { useEffect, useState } from 'react';
import { collegeMembershipApi, placementDriveApi } from '../../api';
import './StudentCollegePortal.css';

interface Membership {
  _id: string;
  collegeRole: string;
  departmentId?: { _id: string; name: string; code: string } | null;
  yearOfStudy?: number;
  rollNumber?: string;
  academicYear?: string;
  division?: string;
  cgpa?: number;
  backlogs?: number;
  semesterGrades?: { semester: number; sgpa: number }[];
  isActive: boolean;
}

interface Drive {
  _id: string;
  companyName: string;
  role: string;
  ctcMin?: number;
  ctcMax?: number;
  location?: string;
  driveType: string;
  status: string;
  applyDeadline?: string;
  driveDate?: string;
  eligibility: {
    minCgpa?: number;
    allowedBranches?: string[];
    allowedYears?: number[];
    maxBacklogs?: number;
  };
  applicants: string[];
  applicantStatuses?: Record<string, string>;
}

const ROLE_ICON: Record<string, string> = {
  STUDENT: 'bi-mortarboard',
  DEPT_HEAD: 'bi-person-badge',
  PLACEMENT_OFFICER: 'bi-briefcase',
  CRT_TRAINER: 'bi-person-video3',
  COLLEGE_ADMIN: 'bi-shield-check',
};

const StudentCollegePortal: React.FC = () => {
  const [membership, setMembership]   = useState<Membership | null>(null);
  const [drives, setDrives]           = useState<Drive[]>([]);
  const [loadingMe, setLoadingMe]     = useState(true);
  const [loadingDrives, setLoadingDrives] = useState(true);
  const [error, setError]             = useState('');
  const [applyingId, setApplyingId]   = useState<string | null>(null);
  const [appliedIds, setAppliedIds]   = useState<Set<string>>(new Set());
  const [certLoading, setCertLoading] = useState<string | null>(null);
  const [success, setSuccess]         = useState('');
  const userId = localStorage.getItem('userId') || '';

  // ── Fetch membership ─────────────────────────────────────────────────────────
  useEffect(() => {
    collegeMembershipApi.getMe()
      .then((res: any) => {
        const m = res.data || null;
        setMembership(m);
        // Pre-mark drives the student already applied to (will cross-check below)
      })
      .catch(() => setMembership(null))
      .finally(() => setLoadingMe(false));
  }, []);

  // ── Fetch open drives ────────────────────────────────────────────────────────
  useEffect(() => {
    setLoadingDrives(true);
    Promise.all([
      placementDriveApi.list('upcoming'),
      placementDriveApi.list('ongoing'),
    ])
      .then(([upcomingRes, ongoingRes]: any[]) => {
        const all: Drive[] = [...(upcomingRes.data || []), ...(ongoingRes.data || [])];
        setDrives(all);
        // Mark already-applied drives
        const alreadyApplied = new Set<string>(
          all.filter(d => d.applicants?.includes(userId)).map(d => d._id)
        );
        setAppliedIds(alreadyApplied);
      })
      .catch((e: any) => setError(e.message || 'Failed to load drives'))
      .finally(() => setLoadingDrives(false));
  }, [userId]);

  // ── Apply / Withdraw ─────────────────────────────────────────────────────────
  const handleApply = async (driveId: string, companyName: string) => {
    const already = appliedIds.has(driveId);
    try {
      setApplyingId(driveId);
      if (already) {
        await placementDriveApi.withdraw(driveId);
        setAppliedIds(prev => { const s = new Set(prev); s.delete(driveId); return s; });
        setSuccess(`Withdrawn from ${companyName}.`);
      } else {
        await placementDriveApi.apply(driveId);
        setAppliedIds(prev => new Set(prev).add(driveId));
        setSuccess(`Applied to ${companyName}!`);
      }
    } catch (e: any) {
      setError(e.message || 'Action failed');
    } finally {
      setApplyingId(null);
    }
  };

  // ── Download certificate ─────────────────────────────────────────────────────
  const handleDownloadCert = async (driveId: string) => {
    try {
      setCertLoading(driveId);
      const url = await placementDriveApi.downloadCertificate(driveId, userId);
      const a = document.createElement('a');
      a.href = url;
      a.download = `placement-certificate-${driveId}.pdf`;
      a.click();
      URL.revokeObjectURL(url);
    } catch {
      setError('Failed to download certificate.');
    } finally {
      setCertLoading(null);
    }
  };

  // ── helpers ──────────────────────────────────────────────────────────────────
  const ctcLabel = (d: Drive) => {
    if (d.ctcMin && d.ctcMax) return `${d.ctcMin}–${d.ctcMax} LPA`;
    if (d.ctcMin) return `${d.ctcMin}+ LPA`;
    if (d.ctcMax) return `upto ${d.ctcMax} LPA`;
    return 'Not disclosed';
  };

  const isEligible = (d: Drive) => {
    if (!membership) return true; // can't check — show all
    const { allowedBranches, allowedYears } = d.eligibility || {};
    const deptCode = membership.departmentId?.code;
    const year = membership.yearOfStudy;
    if (allowedBranches?.length && deptCode && !allowedBranches.includes(deptCode)) return false;
    if (allowedYears?.length && year && !allowedYears.includes(year)) return false;
    return true;
  };

  // ── render ───────────────────────────────────────────────────────────────────
  return (
    <div className="scp-page container-fluid py-4">
      <div className="mb-4">
        <h4 className="fw-bold mb-0">College Portal</h4>
        <p className="text-muted small mb-0">Your college profile and placement opportunities</p>
      </div>

      {error   && <div className="alert alert-danger alert-dismissible">{error}<button className="btn-close" onClick={() => setError('')} /></div>}
      {success && <div className="alert alert-success alert-dismissible">{success}<button className="btn-close" onClick={() => setSuccess('')} /></div>}

      {/* ── Membership Card ─────────────────────────────────────────────── */}
      <div className="scp-card-wrap mb-4">
        {loadingMe ? (
          <div className="card border-0 shadow-sm p-4 text-center">
            <div className="spinner-border text-primary spinner-border-sm" />
          </div>
        ) : membership ? (
          <div className="card border-0 shadow-sm scp-membership-card">
            <div className="card-body">
              <div className="d-flex align-items-center gap-3 mb-3">
                <div className="scp-avatar d-flex align-items-center justify-content-center rounded-circle bg-primary text-white fs-4">
                  <i className={`bi ${ROLE_ICON[membership.collegeRole] || 'bi-person'}`} />
                </div>
                <div>
                  <h6 className="fw-bold mb-0">My College Profile</h6>
                  <span className="badge text-bg-primary">{membership.collegeRole}</span>
                </div>
              </div>
              <div className="row g-2">
                <div className="col-6 col-md-3">
                  <div className="scp-stat-box p-2 rounded bg-light text-center">
                    <div className="small text-muted">Department</div>
                    <div className="fw-semibold">{membership.departmentId?.code || '—'}</div>
                  </div>
                </div>
                <div className="col-6 col-md-3">
                  <div className="scp-stat-box p-2 rounded bg-light text-center">
                    <div className="small text-muted">Year</div>
                    <div className="fw-semibold">{membership.yearOfStudy ? `Year ${membership.yearOfStudy}` : '—'}</div>
                  </div>
                </div>
                <div className="col-6 col-md-3">
                  <div className="scp-stat-box p-2 rounded bg-light text-center">
                    <div className="small text-muted">Roll No.</div>
                    <div className="fw-semibold">{membership.rollNumber || '—'}</div>
                  </div>
                </div>
                <div className="col-6 col-md-3">
                  <div className="scp-stat-box p-2 rounded bg-light text-center">
                    <div className="small text-muted">Academic Year</div>
                    <div className="fw-semibold">{membership.academicYear || '—'}</div>
                  </div>
                </div>
                <div className="col-6 col-md-3">
                  <div className="scp-stat-box p-2 rounded bg-light text-center">
                    <div className="small text-muted">CGPA</div>
                    <div className="fw-semibold text-primary">{membership.cgpa != null ? membership.cgpa.toFixed(2) : '—'}</div>
                  </div>
                </div>
                <div className="col-6 col-md-3">
                  <div className="scp-stat-box p-2 rounded bg-light text-center">
                    <div className="small text-muted">Backlogs</div>
                    <div className={`fw-semibold ${membership.backlogs ? 'text-warning' : 'text-success'}`}>{membership.backlogs ?? '—'}</div>
                  </div>
                </div>
              </div>
              {membership.semesterGrades && membership.semesterGrades.length > 0 && (
                <div className="mt-3">
                  <p className="fw-semibold small mb-2 text-muted text-uppercase">Semester Grades</p>
                  <div className="d-flex flex-wrap gap-2">
                    {membership.semesterGrades.map(sg => (
                      <span key={sg.semester} className="badge bg-light text-dark border">
                        Sem {sg.semester}: <strong>{sg.sgpa.toFixed(2)}</strong>
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        ) : (
          <div className="card border-0 shadow-sm p-4 text-center text-muted">
            <i className="bi bi-person-x fs-2 d-block mb-1" />
            No college profile found. Contact your administrator.
          </div>
        )}
      </div>

      {/* ── Placement Drives ────────────────────────────────────────────── */}
      <div className="d-flex align-items-center justify-content-between mb-3">
        <h5 className="fw-bold mb-0">
          <i className="bi bi-briefcase me-2 text-primary" />Open Placement Drives
        </h5>
        <span className="badge text-bg-light border">{drives.length} drives</span>
      </div>

      {loadingDrives ? (
        <div className="text-center py-4"><div className="spinner-border text-primary" /></div>
      ) : drives.length === 0 ? (
        <div className="text-center py-5 text-muted">
          <i className="bi bi-briefcase fs-1 d-block mb-2" />
          No open drives right now. Check back later!
        </div>
      ) : (
        <div className="row g-3">
          {drives.map(d => {
            const eligible = isEligible(d);
            const applied  = appliedIds.has(d._id);
            return (
              <div key={d._id} className="col-md-6 col-xl-4">
                <div className={`card border-0 shadow-sm h-100 scp-drive-card ${!eligible ? 'scp-ineligible' : ''}`}>
                  <div className="card-body">
                    <div className="d-flex justify-content-between align-items-start mb-2">
                      <div>
                        <h6 className="fw-bold mb-0">{d.companyName}</h6>
                        <div className="text-muted small">{d.role}</div>
                      </div>
                      <span className={`badge ${d.status === 'ongoing' ? 'text-bg-success' : 'text-bg-primary'}`}>
                        {d.status}
                      </span>
                    </div>

                    <div className="row g-1 my-2 small">
                      <div className="col-6"><i className="bi bi-currency-rupee text-muted me-1" />{ctcLabel(d)}</div>
                      <div className="col-6"><i className="bi bi-geo-alt text-muted me-1" />{d.location || '—'}</div>
                      <div className="col-6"><i className="bi bi-building text-muted me-1" />{d.driveType}</div>
                      <div className="col-6"><i className="bi bi-people text-muted me-1" />{d.applicants?.length || 0} applied</div>
                      {d.applyDeadline && (
                        <div className="col-12">
                          <i className="bi bi-calendar-x text-muted me-1" />
                          Deadline: <strong>{new Date(d.applyDeadline).toLocaleDateString()}</strong>
                        </div>
                      )}
                    </div>

                    {/* Eligibility tags */}
                    <div className="d-flex flex-wrap gap-1 mb-2">
                      {d.eligibility?.allowedBranches?.map(b => (
                        <span key={b} className="badge text-bg-light border">{b}</span>
                      ))}
                      {d.eligibility?.allowedYears?.map(y => (
                        <span key={y} className="badge text-bg-light border">Year {y}</span>
                      ))}
                      {d.eligibility?.minCgpa && (
                        <span className="badge text-bg-light border">CGPA ≥ {d.eligibility.minCgpa}</span>
                      )}
                    </div>

                    {!eligible && (
                      <div className="scp-ineligible-banner small text-warning mb-2">
                        <i className="bi bi-exclamation-triangle me-1" />You may not meet eligibility criteria
                      </div>
                    )}
                  </div>

                  <div className="card-footer bg-white border-top-0 pt-0">
                    <button
                      className={`btn btn-sm w-100 ${applied ? 'btn-outline-danger' : 'btn-primary'}`}
                      disabled={applyingId === d._id}
                      onClick={() => handleApply(d._id, d.companyName)}
                    >
                      {applyingId === d._id
                        ? <span className="spinner-border spinner-border-sm" />
                        : applied
                          ? <><i className="bi bi-x-circle me-1" />Withdraw Application</>
                          : <><i className="bi bi-send me-1" />Apply Now</>
                      }
                    </button>
                    {d.applicantStatuses?.[userId] === 'placed' && (
                      <button
                        className="btn btn-sm btn-success w-100 mt-1"
                        disabled={certLoading === d._id}
                        onClick={() => handleDownloadCert(d._id)}
                      >
                        {certLoading === d._id
                          ? <span className="spinner-border spinner-border-sm" />
                          : <><i className="bi bi-file-earmark-pdf me-1" />Download Certificate</>
                        }
                      </button>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default StudentCollegePortal;
