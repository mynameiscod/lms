import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { topicMasteryApi } from '../../api/topicMasteryApi';
import { batchApi } from '../../api';
import './AdminTopicMastery.css';

type MasteryLevel = 'not_started' | 'weak' | 'developing' | 'strong';

interface TopicCol {
  _id: string;
  title: string;
  order: number;
  chapterId: string;
  subjectName: string;
  hasTaggedQuizzes: boolean;
  interviewQCount: number;
}

interface StudentRow {
  _id: string;
  name: string;
  batchId?: string;
}

interface CellData {
  masteryScore: number;
  masteryLevel: MasteryLevel;
  quizBestScore: number;
  interviewScore: number;
}

interface HeatmapData {
  subject: { _id: string; name: string };
  topics: TopicCol[];
  students: StudentRow[];
  data: Record<string, Record<string, CellData>>;
}

interface SubjectItem {
  _id: string;
  name: string;
  courseId?: { _id: string; title: string };
}

interface BatchItem {
  _id: string;
  name: string;
}

interface StudentDetail {
  studentId: string;
  studentName: string;
  topics: {
    _id: string;
    title: string;
    subjectName: string;
    masteryScore: number;
    masteryLevel: MasteryLevel;
    quizBestScore: number;
    interviewScore: number;
    interviewQTotal: number;
    interviewQConfident: number;
  }[];
  summary: { totalTopics: number; strongCount: number; weakCount: number; avgScore: number };
}

const LEVEL_LABELS: Record<MasteryLevel, string> = {
  not_started: 'Not Started',
  weak: 'Weak',
  developing: 'Developing',
  strong: 'Strong'
};

const TYPE_ICONS: Record<string, string> = {
  notes: '📝',
  interview_qs: '❓',
  practice: '🏋️',
  '1on1': '🎓',
  clarification: '💬'
};

const AdminTopicMastery: React.FC = () => {
  const navigate = useNavigate();

  const [subjects, setSubjects]     = useState<SubjectItem[]>([]);
  const [batches, setBatches]       = useState<BatchItem[]>([]);
  const [selectedSubject, setSelectedSubject] = useState('');
  const [selectedBatch, setSelectedBatch]     = useState('');

  const [heatmap, setHeatmap]       = useState<HeatmapData | null>(null);
  const [loading, setLoading]       = useState(false);
  const [error, setError]           = useState('');

  const [studentDetail, setStudentDetail] = useState<StudentDetail | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [showStudentModal, setShowStudentModal] = useState(false);

  const [topicDetail, setTopicDetail]   = useState<any | null>(null);
  const [topicLoading, setTopicLoading] = useState(false);
  const [showTopicModal, setShowTopicModal] = useState(false);

  const [tooltip, setTooltip] = useState<{ x: number; y: number; cell: CellData; student: string; topic: string } | null>(null);
  const [sortBy, setSortBy] = useState<'name' | 'avg'>('name');

  // Load filters on mount
  useEffect(() => {
    Promise.all([
      topicMasteryApi.getSubjects(),
      batchApi.getBatches()
    ]).then(([subRes, batchRes]) => {
      setSubjects(subRes.data || []);
      setBatches(batchRes.data || batchRes || []);
    }).catch(console.error);
  }, []);

  const loadHeatmap = useCallback(async () => {
    if (!selectedSubject) return;
    setLoading(true);
    setError('');
    try {
      const res = await topicMasteryApi.getHeatmap(selectedSubject, selectedBatch || undefined);
      setHeatmap(res.data);
    } catch (e: any) {
      setError(e.message || 'Failed to load heatmap');
    } finally {
      setLoading(false);
    }
  }, [selectedSubject, selectedBatch]);

  useEffect(() => { loadHeatmap(); }, [loadHeatmap]);

  const openStudentDetail = async (student: StudentRow) => {
    setShowStudentModal(true);
    setDetailLoading(true);
    try {
      const res = await topicMasteryApi.getStudentMastery(student._id);
      setStudentDetail({ ...res.data, studentId: student._id, studentName: student.name });
    } catch (e: any) {
      setError(e.message);
    } finally {
      setDetailLoading(false);
    }
  };

  const openTopicDetail = async (topic: TopicCol) => {
    setShowTopicModal(true);
    setTopicLoading(true);
    try {
      const res = await topicMasteryApi.getTopicBreakdown(topic._id, selectedBatch || undefined);
      setTopicDetail({ ...res.data, topicTitle: topic.title });
    } catch (e: any) {
      setError(e.message);
    } finally {
      setTopicLoading(false);
    }
  };

  // Sort students
  const sortedStudents = heatmap
    ? [...heatmap.students].sort((a, b) => {
        if (sortBy === 'name') return a.name.localeCompare(b.name);
        const avgA = heatmap.topics.reduce((s, t) => s + (heatmap.data[a._id]?.[t._id]?.masteryScore || 0), 0) / (heatmap.topics.length || 1);
        const avgB = heatmap.topics.reduce((s, t) => s + (heatmap.data[b._id]?.[t._id]?.masteryScore || 0), 0) / (heatmap.topics.length || 1);
        return avgA - avgB;
      })
    : [];

  // Aggregate stats
  const stats = heatmap ? (() => {
    let totalCells = 0, strong = 0, developing = 0, weak = 0, notStarted = 0;
    heatmap.students.forEach(s => {
      heatmap.topics.forEach(t => {
        const cell = heatmap.data[s._id]?.[t._id];
        totalCells++;
        if (!cell || cell.masteryLevel === 'not_started') notStarted++;
        else if (cell.masteryLevel === 'strong') strong++;
        else if (cell.masteryLevel === 'developing') developing++;
        else weak++;
      });
    });
    return { totalCells, strong, developing, weak, notStarted };
  })() : null;

  return (
    <div className="atm-page">
      {/* Header */}
      <div className="atm-header">
        <div className="atm-title-row">
          <div>
            <h1 className="atm-title">📊 Topic Mastery</h1>
            <p className="atm-subtitle">Monitor student progress per topic across your cohort</p>
          </div>
        </div>

        {/* Filters */}
        <div className="atm-filters">
          <div className="atm-filter-group">
            <label>Subject</label>
            <select value={selectedSubject} onChange={e => setSelectedSubject(e.target.value)}>
              <option value="">— Select Subject —</option>
              {subjects.map(s => (
                <option key={s._id} value={s._id}>
                  {s.courseId?.title ? `${s.courseId.title} › ` : ''}{s.name}
                </option>
              ))}
            </select>
          </div>
          <div className="atm-filter-group">
            <label>Batch (optional)</label>
            <select value={selectedBatch} onChange={e => setSelectedBatch(e.target.value)}>
              <option value="">All Batches</option>
              {batches.map((b: BatchItem) => (
                <option key={b._id} value={b._id}>{b.name}</option>
              ))}
            </select>
          </div>
          <div className="atm-filter-group">
            <label>Sort Students</label>
            <select value={sortBy} onChange={e => setSortBy(e.target.value as 'name' | 'avg')}>
              <option value="name">By Name</option>
              <option value="avg">By Avg Score (Weakest First)</option>
            </select>
          </div>
        </div>
      </div>

      {/* Stats cards */}
      {stats && (
        <div className="atm-stats-row">
          <div className="atm-stat-card atm-stat-strong">
            <span className="atm-stat-num">{stats.strong}</span>
            <span className="atm-stat-label">Strong</span>
          </div>
          <div className="atm-stat-card atm-stat-developing">
            <span className="atm-stat-num">{stats.developing}</span>
            <span className="atm-stat-label">Developing</span>
          </div>
          <div className="atm-stat-card atm-stat-weak">
            <span className="atm-stat-num">{stats.weak}</span>
            <span className="atm-stat-label">Weak</span>
          </div>
          <div className="atm-stat-card atm-stat-notstarted">
            <span className="atm-stat-num">{stats.notStarted}</span>
            <span className="atm-stat-label">Not Started</span>
          </div>
          <div className="atm-stat-card atm-stat-total">
            <span className="atm-stat-num">{heatmap?.students.length || 0}</span>
            <span className="atm-stat-label">Students</span>
          </div>
          <div className="atm-stat-card atm-stat-total">
            <span className="atm-stat-num">{heatmap?.topics.length || 0}</span>
            <span className="atm-stat-label">Topics</span>
          </div>
        </div>
      )}

      {/* Legend */}
      <div className="atm-legend">
        <span className="atm-legend-label">Mastery:</span>
        <span className="atm-legend-item atm-cell-not_started">Not Started</span>
        <span className="atm-legend-item atm-cell-weak">Weak (&lt;40%)</span>
        <span className="atm-legend-item atm-cell-developing">Developing (40–74%)</span>
        <span className="atm-legend-item atm-cell-strong">Strong (≥75%)</span>
      </div>

      {error && <div className="atm-alert atm-alert-error">{error}</div>}

      {!selectedSubject && (
        <div className="atm-empty">
          <div className="atm-empty-icon">📊</div>
          <p>Select a subject above to view the heatmap</p>
        </div>
      )}

      {loading && (
        <div className="atm-loading">
          <div className="atm-spinner" />
          <p>Loading heatmap data…</p>
        </div>
      )}

      {/* Heatmap */}
      {!loading && heatmap && (
        <div className="atm-heatmap-section">
          {heatmap.students.length === 0 ? (
            <div className="atm-empty">
              <div className="atm-empty-icon">👥</div>
              <p>No enrolled students found for this selection</p>
            </div>
          ) : heatmap.topics.length === 0 ? (
            <div className="atm-empty">
              <div className="atm-empty-icon">📚</div>
              <p>No topics found for this subject</p>
            </div>
          ) : (
            <div className="atm-heatmap-wrapper">
              <table className="atm-heatmap-table">
                <thead>
                  <tr>
                    <th className="atm-th-student">Student</th>
                    {heatmap.topics.map(t => (
                      <th key={t._id} className="atm-th-topic" title={t.title}>
                        <button className="atm-topic-header-btn" onClick={() => openTopicDetail(t)}>
                          <span className="atm-topic-title">{t.title}</span>
                          {t.hasTaggedQuizzes && <span className="atm-topic-badge quiz" title="Has quiz">Q</span>}
                          {t.interviewQCount > 0 && <span className="atm-topic-badge iq" title={`${t.interviewQCount} interview questions`}>{t.interviewQCount}</span>}
                        </button>
                      </th>
                    ))}
                    <th className="atm-th-avg">Avg</th>
                  </tr>
                </thead>
                <tbody>
                  {sortedStudents.map(student => {
                    const row = heatmap.data[student._id] || {};
                    const avgScore = heatmap.topics.length
                      ? Math.round(heatmap.topics.reduce((s, t) => s + (row[t._id]?.masteryScore || 0), 0) / heatmap.topics.length)
                      : 0;
                    return (
                      <tr key={student._id} className="atm-row">
                        <td className="atm-td-student">
                          <button className="atm-student-btn" onClick={() => openStudentDetail(student)}>
                            <span className="atm-student-avatar">{student.name.charAt(0).toUpperCase()}</span>
                            <span className="atm-student-name">{student.name}</span>
                          </button>
                        </td>
                        {heatmap.topics.map(topic => {
                          const cell = row[topic._id];
                          const level = cell?.masteryLevel || 'not_started';
                          const score = cell?.masteryScore || 0;
                          return (
                            <td
                              key={topic._id}
                              className={`atm-cell atm-cell-${level}`}
                              onMouseEnter={e => setTooltip({
                                x: (e.target as HTMLElement).getBoundingClientRect().left,
                                y: (e.target as HTMLElement).getBoundingClientRect().top,
                                cell: cell || { masteryScore: 0, masteryLevel: 'not_started', quizBestScore: 0, interviewScore: 0 },
                                student: student.name,
                                topic: topic.title
                              })}
                              onMouseLeave={() => setTooltip(null)}
                            >
                              <span className="atm-cell-score">{score > 0 ? `${score}%` : '—'}</span>
                            </td>
                          );
                        })}
                        <td className={`atm-cell-avg atm-cell-${avgScore >= 75 ? 'strong' : avgScore >= 45 ? 'developing' : avgScore >= 10 ? 'weak' : 'not_started'}`}>
                          {avgScore}%
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* Tooltip */}
      {tooltip && (
        <div className="atm-tooltip" style={{ top: tooltip.y - 120, left: tooltip.x }}>
          <div className="atm-tooltip-header">
            <strong>{tooltip.student}</strong>
            <span className="atm-tooltip-topic">on {tooltip.topic}</span>
          </div>
          <div className="atm-tooltip-row">
            <span>Mastery</span>
            <span className={`atm-tooltip-badge atm-cell-${tooltip.cell.masteryLevel}`}>
              {LEVEL_LABELS[tooltip.cell.masteryLevel]} ({tooltip.cell.masteryScore}%)
            </span>
          </div>
          <div className="atm-tooltip-row">
            <span>Best Quiz</span>
            <span>{tooltip.cell.quizBestScore > 0 ? `${tooltip.cell.quizBestScore}%` : 'No quiz'}</span>
          </div>
          <div className="atm-tooltip-row">
            <span>Interview Qs</span>
            <span>{tooltip.cell.interviewScore}%</span>
          </div>
        </div>
      )}

      {/* Student Detail Modal */}
      {showStudentModal && (
        <div className="atm-modal-overlay" onClick={() => setShowStudentModal(false)}>
          <div className="atm-modal" onClick={e => e.stopPropagation()}>
            <div className="atm-modal-header">
              <h2>{studentDetail?.studentName || 'Student'} — Topic Mastery</h2>
              <button className="atm-modal-close" onClick={() => setShowStudentModal(false)}>✕</button>
            </div>
            {detailLoading ? (
              <div className="atm-modal-loading"><div className="atm-spinner" /></div>
            ) : studentDetail ? (
              <div className="atm-modal-body">
                <div className="atm-student-summary">
                  <div className={`atm-sum-card atm-cell-strong`}>
                    <span>{studentDetail.summary.strongCount}</span>
                    <small>Strong</small>
                  </div>
                  <div className={`atm-sum-card atm-cell-weak`}>
                    <span>{studentDetail.summary.weakCount}</span>
                    <small>Need Work</small>
                  </div>
                  <div className="atm-sum-card atm-sum-avg">
                    <span>{studentDetail.summary.avgScore}%</span>
                    <small>Avg Score</small>
                  </div>
                </div>

                <div className="atm-topic-list">
                  {studentDetail.topics.map(t => (
                    <div key={t._id} className={`atm-topic-row atm-border-${t.masteryLevel}`}>
                      <div className="atm-topic-row-left">
                        <span className={`atm-level-dot atm-cell-${t.masteryLevel}`} />
                        <div>
                          <div className="atm-topic-row-name">{t.title}</div>
                          <div className="atm-topic-row-subject">{t.subjectName}</div>
                        </div>
                      </div>
                      <div className="atm-topic-row-scores">
                        <div className="atm-score-pill">
                          <span className="atm-score-label">Mastery</span>
                          <span className={`atm-score-val atm-score-${t.masteryLevel}`}>{t.masteryScore}%</span>
                        </div>
                        {t.quizBestScore > 0 && (
                          <div className="atm-score-pill">
                            <span className="atm-score-label">Quiz</span>
                            <span className="atm-score-val">{t.quizBestScore}%</span>
                          </div>
                        )}
                        {t.interviewQTotal > 0 && (
                          <div className="atm-score-pill">
                            <span className="atm-score-label">IQ {t.interviewQConfident}/{t.interviewQTotal}</span>
                            <span className="atm-score-val">{t.interviewScore}%</span>
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ) : null}
          </div>
        </div>
      )}

      {/* Topic Detail Modal */}
      {showTopicModal && (
        <div className="atm-modal-overlay" onClick={() => setShowTopicModal(false)}>
          <div className="atm-modal" onClick={e => e.stopPropagation()}>
            <div className="atm-modal-header">
              <h2>📌 {topicDetail?.topicTitle || 'Topic'} — All Students</h2>
              <button className="atm-modal-close" onClick={() => setShowTopicModal(false)}>✕</button>
            </div>
            {topicLoading ? (
              <div className="atm-modal-loading"><div className="atm-spinner" /></div>
            ) : topicDetail ? (
              <div className="atm-modal-body">
                <div className="atm-student-summary">
                  <div className={`atm-sum-card atm-cell-strong`}>
                    <span>{topicDetail.distribution?.strong || 0}</span>
                    <small>Strong</small>
                  </div>
                  <div className="atm-sum-card atm-cell-developing">
                    <span>{topicDetail.distribution?.developing || 0}</span>
                    <small>Developing</small>
                  </div>
                  <div className="atm-sum-card atm-cell-weak">
                    <span>{topicDetail.distribution?.weak || 0}</span>
                    <small>Weak</small>
                  </div>
                  <div className="atm-sum-card atm-sum-avg">
                    <span>{topicDetail.avgMastery}%</span>
                    <small>Avg Score</small>
                  </div>
                </div>

                <div className="atm-topic-list">
                  {(topicDetail.students || []).map((s: any) => (
                    <div key={s._id} className={`atm-topic-row atm-border-${s.masteryLevel}`}>
                      <div className="atm-topic-row-left">
                        <span className={`atm-level-dot atm-cell-${s.masteryLevel}`} />
                        <span className="atm-topic-row-name">{s.name}</span>
                      </div>
                      <div className="atm-topic-row-scores">
                        <span className={`atm-level-badge atm-cell-${s.masteryLevel}`}>{LEVEL_LABELS[s.masteryLevel as MasteryLevel]}</span>
                        <span className="atm-score-pill"><span className="atm-score-val">{s.masteryScore}%</span></span>
                        {s.quizBestScore > 0 && <span className="atm-score-pill small">Quiz: {s.quizBestScore}%</span>}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ) : null}
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminTopicMastery;
