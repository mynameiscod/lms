import React, { useEffect, useState, useCallback } from 'react';
import { curriculumApi, departmentApi } from '../../api';

/* ── types ─────────────────────────────────────────────────────────────────── */
interface Department { _id: string; name: string; code: string }

interface CurriculumSubject {
  _id?: string;
  name: string;
  code: string;
  credits: number;
  type: 'theory' | 'lab' | 'elective' | 'project';
  description: string;
}

interface CurriculumSemester {
  semesterNumber: number;
  subjects: CurriculumSubject[];
}

interface Curriculum {
  _id: string;
  departmentId: Department | string;
  yearOfStudy: 1 | 2 | 3 | 4;
  academicYear?: string;
  semesters: CurriculumSemester[];
  isActive: boolean;
}

const YEARS = [1, 2, 3, 4] as const;
const SUBJECT_TYPES = ['theory', 'lab', 'elective', 'project'] as const;

const emptySubject = (): CurriculumSubject => ({
  name: '', code: '', credits: 3, type: 'theory', description: ''
});

const emptySemesters = (year: number): CurriculumSemester[] => [
  { semesterNumber: (year - 1) * 2 + 1, subjects: [] },
  { semesterNumber: (year - 1) * 2 + 2, subjects: [] }
];

/* ── component ─────────────────────────────────────────────────────────────── */
const CollegeCurriculumPage: React.FC = () => {
  const [departments, setDepartments] = useState<Department[]>([]);
  const [curricula, setCurricula] = useState<Curriculum[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  /* filters */
  const [filterDept, setFilterDept] = useState('');
  const [filterYear, setFilterYear] = useState('');

  /* modal state */
  const [showModal, setShowModal] = useState(false);
  const [editing, setEditing] = useState<Curriculum | null>(null);
  const [formDept, setFormDept] = useState('');
  const [formYear, setFormYear] = useState<number>(1);
  const [formAcadYear, setFormAcadYear] = useState('');
  const [formSemesters, setFormSemesters] = useState<CurriculumSemester[]>(emptySemesters(1));
  const [submitting, setSubmitting] = useState(false);

  /* ── fetch ──────────────────────────────────────────────────────────────── */
  const fetchAll = useCallback(async () => {
    try {
      setLoading(true);
      const [deptRes, currRes] = await Promise.all([
        departmentApi.list(),
        curriculumApi.list({ departmentId: filterDept || undefined, yearOfStudy: filterYear ? Number(filterYear) : undefined })
      ]);
      setDepartments(deptRes.data || []);
      setCurricula(currRes.data || []);
    } catch (e: any) {
      setError(e.message || 'Failed to load data');
    } finally {
      setLoading(false);
    }
  }, [filterDept, filterYear]);

  useEffect(() => { fetchAll(); }, [fetchAll]);

  /* ── modal helpers ──────────────────────────────────────────────────────── */
  const openCreate = () => {
    setEditing(null);
    setFormDept(departments[0]?._id || '');
    setFormYear(1);
    setFormAcadYear('');
    setFormSemesters(emptySemesters(1));
    setError('');
    setShowModal(true);
  };

  const openEdit = (c: Curriculum) => {
    setEditing(c);
    const deptId = typeof c.departmentId === 'string' ? c.departmentId : c.departmentId._id;
    setFormDept(deptId);
    setFormYear(c.yearOfStudy);
    setFormAcadYear(c.academicYear || '');
    setFormSemesters(c.semesters.length ? c.semesters : emptySemesters(c.yearOfStudy));
    setError('');
    setShowModal(true);
  };

  const handleYearChange = (y: number) => {
    setFormYear(y);
    setFormSemesters(emptySemesters(y));
  };

  /* ── subject helpers ────────────────────────────────────────────────────── */
  const addSubject = (semIdx: number) => {
    setFormSemesters(prev => {
      const updated = prev.map((s, i) =>
        i === semIdx ? { ...s, subjects: [...s.subjects, emptySubject()] } : s
      );
      return updated;
    });
  };

  const removeSubject = (semIdx: number, subIdx: number) => {
    setFormSemesters(prev =>
      prev.map((s, i) =>
        i === semIdx ? { ...s, subjects: s.subjects.filter((_, j) => j !== subIdx) } : s
      )
    );
  };

  const updateSubject = (semIdx: number, subIdx: number, field: keyof CurriculumSubject, value: any) => {
    setFormSemesters(prev =>
      prev.map((s, i) =>
        i === semIdx
          ? { ...s, subjects: s.subjects.map((sub, j) => j === subIdx ? { ...sub, [field]: value } : sub) }
          : s
      )
    );
  };

  /* ── submit ─────────────────────────────────────────────────────────────── */
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formDept) { setError('Please select a department.'); return; }
    try {
      setSubmitting(true);
      setError('');
      const payload = {
        departmentId: formDept,
        yearOfStudy: formYear,
        academicYear: formAcadYear || undefined,
        semesters: formSemesters
      };
      if (editing) {
        await curriculumApi.update(editing._id, payload);
        setSuccess('Curriculum updated.');
      } else {
        await curriculumApi.create(payload);
        setSuccess('Curriculum created.');
      }
      setShowModal(false);
      fetchAll();
    } catch (e: any) {
      setError(e.message || 'Failed to save');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (c: Curriculum) => {
    if (!window.confirm(`Delete curriculum for Year ${c.yearOfStudy}? This cannot be undone.`)) return;
    try {
      await curriculumApi.remove(c._id);
      setSuccess('Curriculum deleted.');
      fetchAll();
    } catch (e: any) {
      setError(e.message || 'Failed to delete');
    }
  };

  /* ── render ─────────────────────────────────────────────────────────────── */
  const deptName = (c: Curriculum) =>
    typeof c.departmentId === 'string'
      ? departments.find(d => d._id === c.departmentId)?.name || c.departmentId
      : c.departmentId.name;

  return (
    <div className="container-fluid py-4">
      {/* Header */}
      <div className="d-flex justify-content-between align-items-center mb-4">
        <div>
          <h4 className="fw-bold mb-0">Year-wise Curriculum</h4>
          <p className="text-muted small mb-0">Define semester subjects for each department and year</p>
        </div>
        <button className="btn btn-primary" onClick={openCreate}>
          <i className="bi bi-plus-lg me-1" /> Add Curriculum
        </button>
      </div>

      {/* Alerts */}
      {error && <div className="alert alert-danger py-2">{error}</div>}
      {success && <div className="alert alert-success py-2">{success}</div>}

      {/* Filters */}
      <div className="card mb-4 border-0 shadow-sm">
        <div className="card-body py-3">
          <div className="row g-3">
            <div className="col-md-4">
              <label className="form-label small fw-semibold">Department</label>
              <select className="form-select form-select-sm" value={filterDept} onChange={e => setFilterDept(e.target.value)}>
                <option value="">All Departments</option>
                {departments.map(d => <option key={d._id} value={d._id}>{d.name} ({d.code})</option>)}
              </select>
            </div>
            <div className="col-md-3">
              <label className="form-label small fw-semibold">Year</label>
              <select className="form-select form-select-sm" value={filterYear} onChange={e => setFilterYear(e.target.value)}>
                <option value="">All Years</option>
                {YEARS.map(y => <option key={y} value={y}>Year {y}</option>)}
              </select>
            </div>
          </div>
        </div>
      </div>

      {/* Table */}
      {loading ? (
        <div className="text-center py-5"><div className="spinner-border text-primary" /></div>
      ) : curricula.length === 0 ? (
        <div className="text-center py-5 text-muted">
          <i className="bi bi-journal-text fs-1 d-block mb-2" />
          No curriculum defined yet. Click <strong>Add Curriculum</strong> to start.
        </div>
      ) : (
        <div className="row g-3">
          {curricula.map(c => (
            <div className="col-12" key={c._id}>
              <div className="card border-0 shadow-sm">
                <div className="card-body">
                  <div className="d-flex justify-content-between align-items-start mb-3">
                    <div>
                      <h6 className="fw-bold mb-0">
                        {deptName(c)}
                        <span className="badge bg-primary ms-2">Year {c.yearOfStudy}</span>
                        {c.academicYear && <span className="badge bg-secondary ms-1">{c.academicYear}</span>}
                        {!c.isActive && <span className="badge bg-danger ms-1">Inactive</span>}
                      </h6>
                      <small className="text-muted">
                        {c.semesters.reduce((n, s) => n + s.subjects.length, 0)} subjects across {c.semesters.length} semester(s)
                      </small>
                    </div>
                    <div className="d-flex gap-2">
                      <button className="btn btn-sm btn-outline-primary" onClick={() => openEdit(c)}>
                        <i className="bi bi-pencil" />
                      </button>
                      <button className="btn btn-sm btn-outline-danger" onClick={() => handleDelete(c)}>
                        <i className="bi bi-trash" />
                      </button>
                    </div>
                  </div>
                  <div className="row g-3">
                    {c.semesters.map(sem => (
                      <div className="col-md-6" key={sem.semesterNumber}>
                        <div className="border rounded p-3 bg-light">
                          <h6 className="text-primary mb-2">Semester {sem.semesterNumber}</h6>
                          {sem.subjects.length === 0 ? (
                            <p className="text-muted small mb-0">No subjects added</p>
                          ) : (
                            <table className="table table-sm mb-0">
                              <thead>
                                <tr>
                                  <th>Subject</th>
                                  <th>Code</th>
                                  <th>Credits</th>
                                  <th>Type</th>
                                </tr>
                              </thead>
                              <tbody>
                                {sem.subjects.map((sub, i) => (
                                  <tr key={i}>
                                    <td>{sub.name}</td>
                                    <td><code>{sub.code || '—'}</code></td>
                                    <td>{sub.credits}</td>
                                    <td><span className="badge bg-secondary">{sub.type}</span></td>
                                  </tr>
                                ))}
                              </tbody>
                            </table>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Modal */}
      {showModal && (
        <div className="modal show d-block" style={{ background: 'rgba(0,0,0,0.5)' }}>
          <div className="modal-dialog modal-xl modal-dialog-scrollable">
            <div className="modal-content">
              <div className="modal-header">
                <h5 className="modal-title">{editing ? 'Edit Curriculum' : 'Add Curriculum'}</h5>
                <button type="button" className="btn-close" onClick={() => setShowModal(false)} />
              </div>
              <form onSubmit={handleSubmit}>
                <div className="modal-body">
                  {error && <div className="alert alert-danger py-2">{error}</div>}

                  {/* Dept / Year / AcadYear */}
                  <div className="row g-3 mb-4">
                    <div className="col-md-5">
                      <label className="form-label fw-semibold">Department <span className="text-danger">*</span></label>
                      <select
                        className="form-select"
                        value={formDept}
                        onChange={e => setFormDept(e.target.value)}
                        disabled={!!editing}
                        required
                      >
                        <option value="">Select department</option>
                        {departments.map(d => <option key={d._id} value={d._id}>{d.name} ({d.code})</option>)}
                      </select>
                    </div>
                    <div className="col-md-3">
                      <label className="form-label fw-semibold">Year of Study <span className="text-danger">*</span></label>
                      <select
                        className="form-select"
                        value={formYear}
                        onChange={e => handleYearChange(Number(e.target.value))}
                        disabled={!!editing}
                        required
                      >
                        {YEARS.map(y => <option key={y} value={y}>Year {y}</option>)}
                      </select>
                    </div>
                    <div className="col-md-4">
                      <label className="form-label fw-semibold">Academic Year</label>
                      <input
                        type="text"
                        className="form-control"
                        placeholder="e.g. 2024-25"
                        value={formAcadYear}
                        onChange={e => setFormAcadYear(e.target.value)}
                      />
                    </div>
                  </div>

                  {/* Semesters */}
                  {formSemesters.map((sem, semIdx) => (
                    <div key={sem.semesterNumber} className="mb-4 border rounded p-3">
                      <div className="d-flex justify-content-between align-items-center mb-3">
                        <h6 className="fw-bold text-primary mb-0">Semester {sem.semesterNumber}</h6>
                        <button type="button" className="btn btn-sm btn-outline-success" onClick={() => addSubject(semIdx)}>
                          <i className="bi bi-plus-lg me-1" /> Add Subject
                        </button>
                      </div>
                      {sem.subjects.length === 0 ? (
                        <p className="text-muted small">No subjects added. Click "Add Subject" to begin.</p>
                      ) : (
                        <div className="table-responsive">
                          <table className="table table-sm align-middle">
                            <thead className="table-light">
                              <tr>
                                <th style={{ minWidth: 200 }}>Subject Name *</th>
                                <th style={{ minWidth: 100 }}>Code</th>
                                <th style={{ minWidth: 80 }}>Credits</th>
                                <th style={{ minWidth: 110 }}>Type</th>
                                <th style={{ minWidth: 160 }}>Description</th>
                                <th></th>
                              </tr>
                            </thead>
                            <tbody>
                              {sem.subjects.map((sub, subIdx) => (
                                <tr key={subIdx}>
                                  <td>
                                    <input
                                      type="text"
                                      className="form-control form-control-sm"
                                      placeholder="e.g. Data Structures"
                                      value={sub.name}
                                      onChange={e => updateSubject(semIdx, subIdx, 'name', e.target.value)}
                                      required
                                    />
                                  </td>
                                  <td>
                                    <input
                                      type="text"
                                      className="form-control form-control-sm"
                                      placeholder="CS301"
                                      value={sub.code}
                                      onChange={e => updateSubject(semIdx, subIdx, 'code', e.target.value)}
                                    />
                                  </td>
                                  <td>
                                    <input
                                      type="number"
                                      className="form-control form-control-sm"
                                      min={0} max={10}
                                      value={sub.credits}
                                      onChange={e => updateSubject(semIdx, subIdx, 'credits', Number(e.target.value))}
                                    />
                                  </td>
                                  <td>
                                    <select
                                      className="form-select form-select-sm"
                                      value={sub.type}
                                      onChange={e => updateSubject(semIdx, subIdx, 'type', e.target.value)}
                                    >
                                      {SUBJECT_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
                                    </select>
                                  </td>
                                  <td>
                                    <input
                                      type="text"
                                      className="form-control form-control-sm"
                                      placeholder="Optional"
                                      value={sub.description}
                                      onChange={e => updateSubject(semIdx, subIdx, 'description', e.target.value)}
                                    />
                                  </td>
                                  <td>
                                    <button
                                      type="button"
                                      className="btn btn-sm btn-outline-danger"
                                      onClick={() => removeSubject(semIdx, subIdx)}
                                    >
                                      <i className="bi bi-trash" />
                                    </button>
                                  </td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
                <div className="modal-footer">
                  <button type="button" className="btn btn-secondary" onClick={() => setShowModal(false)}>Cancel</button>
                  <button type="submit" className="btn btn-primary" disabled={submitting}>
                    {submitting ? 'Saving…' : editing ? 'Update Curriculum' : 'Create Curriculum'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default CollegeCurriculumPage;
