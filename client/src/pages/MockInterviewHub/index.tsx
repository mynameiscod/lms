import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import mockInterviewApi, { InterviewCategory, InterviewStats, MockInterview } from '../../api/mockInterviewApi';
import './MockInterviewHub.css';

const MockInterviewHub: React.FC = () => {
  const navigate = useNavigate();
  const [categories, setCategories] = useState<InterviewCategory[]>([]);
  const [stats, setStats] = useState<InterviewStats | null>(null);
  const [recentInterviews, setRecentInterviews] = useState<MockInterview[]>([]);
  const [assignedInterviews, setAssignedInterviews] = useState<MockInterview[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState<InterviewCategory | null>(null);
  const [creating, setCreating] = useState(false);

  // Interview configuration
  const [config, setConfig] = useState({
    subCategory: '',
    targetCompany: '',
    difficulty: 'medium' as 'easy' | 'medium' | 'hard',
    totalQuestions: 10,
    timeLimit: 30
  });

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      setLoading(true);
      const [categoriesData, statsData, interviewsData, assignedData] = await Promise.all([
        mockInterviewApi.getCategories(),
        mockInterviewApi.getMyStats(),
        mockInterviewApi.getMyInterviews({ limit: 5 }),
        mockInterviewApi.getMyAssignedInterviews({ limit: 10 })
      ]);
      setCategories(categoriesData);
      setStats(statsData);
      setRecentInterviews(interviewsData.interviews);
      setAssignedInterviews(assignedData.interviews);
    } catch (error) {
      console.error('Error loading data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleCategorySelect = (category: InterviewCategory) => {
    setSelectedCategory(category);
    setConfig({
      ...config,
      subCategory: category.subCategories[0]?.id || '',
      targetCompany: category.id === 'company-specific' ? category.subCategories[0]?.id || '' : ''
    });
    setShowCreateModal(true);
  };

  const handleStartInterview = async () => {
    if (!selectedCategory) return;

    try {
      setCreating(true);
      const interview = await mockInterviewApi.createInterview({
        category: selectedCategory.id,
        subCategory: config.subCategory || undefined,
        targetCompany: config.targetCompany || undefined,
        difficulty: config.difficulty,
        totalQuestions: config.totalQuestions,
        timeLimit: config.timeLimit
      });
      navigate(`/mock-interviews/${interview._id}/take`);
    } catch (error) {
      console.error('Error creating interview:', error);
      alert('Failed to create interview. Please try again.');
    } finally {
      setCreating(false);
    }
  };

  const getScoreColor = (score: number) => {
    if (score >= 80) return '#10b981';
    if (score >= 60) return '#f59e0b';
    if (score >= 40) return '#f97316';
    return '#ef4444';
  };

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    const now = new Date();
    const diff = now.getTime() - date.getTime();
    const days = Math.floor(diff / (1000 * 60 * 60 * 24));
    
    if (days === 0) return 'Today';
    if (days === 1) return 'Yesterday';
    if (days < 7) return `${days} days ago`;
    return date.toLocaleDateString();
  };

  if (loading) {
    return (
      <div className="mock-interview-hub">
        <div className="loading-state">
          <div className="loading-spinner"></div>
          <p>Loading...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="mock-interview-hub">
      {/* Header */}
      <div className="hub-header">
        <div className="header-content">
          <h1>🎯 Mock Interview Hub</h1>
          <p>Practice interviews with AI and ace your placements</p>
        </div>
        <button className="view-history-btn" onClick={() => navigate('/mock-interviews/history')}>
          📜 View History
        </button>
      </div>

      {/* Stats Section */}
      {stats && (
        <div className="stats-section">
          <div className="stat-card">
            <span className="stat-icon">📊</span>
            <div className="stat-info">
              <span className="stat-value">{stats.completedInterviews}</span>
              <span className="stat-label">Interviews Done</span>
            </div>
          </div>
          <div className="stat-card">
            <span className="stat-icon">⭐</span>
            <div className="stat-info">
              <span className="stat-value" style={{ color: getScoreColor(stats.averageScore) }}>
                {stats.averageScore}%
              </span>
              <span className="stat-label">Average Score</span>
            </div>
          </div>
          <div className="stat-card">
            <span className="stat-icon">🏆</span>
            <div className="stat-info">
              <span className="stat-value" style={{ color: '#10b981' }}>{stats.bestScore}%</span>
              <span className="stat-label">Best Score</span>
            </div>
          </div>
          <div className="stat-card trend-card">
            <span className="stat-icon">📈</span>
            <div className="stat-info">
              <div className="trend-bars">
                {stats.recentTrend.map((score, idx) => (
                  <div 
                    key={idx} 
                    className="trend-bar" 
                    style={{ 
                      height: `${Math.max(score, 10)}%`,
                      backgroundColor: getScoreColor(score)
                    }}
                    title={`${score}%`}
                  ></div>
                ))}
              </div>
              <span className="stat-label">Recent Trend</span>
            </div>
          </div>
        </div>
      )}

      {/* Categories Section */}
      <div className="categories-section">
        <h2>Choose Interview Type</h2>
        <div className="categories-grid">
          {categories.map(category => (
            <div 
              key={category.id} 
              className="category-card"
              onClick={() => handleCategorySelect(category)}
            >
              <span className="category-icon">{category.icon}</span>
              <h3>{category.name}</h3>
              <p>{category.description}</p>
              {category.subCategories.length > 0 && (
                <div className="subcategories">
                  {category.subCategories.slice(0, 3).map(sub => (
                    <span key={sub.id} className="subcategory-tag">{sub.name}</span>
                  ))}
                  {category.subCategories.length > 3 && (
                    <span className="subcategory-tag more">+{category.subCategories.length - 3}</span>
                  )}
                </div>
              )}
              <button className="start-btn">Start Interview →</button>
            </div>
          ))}
        </div>
      </div>

      {/* Assigned Interviews */}
      {assignedInterviews.length > 0 && (
        <div className="assigned-section">
          <h2>📋 Assigned to You</h2>
          <div className="assigned-list">
            {assignedInterviews.map(interview => (
              <div key={interview._id} className="assigned-item">
                <div className="assigned-info">
                  <div className="assigned-header">
                    <span className="assigned-type">
                      {interview.category === 'technical' && '💻'}
                      {interview.category === 'hr' && '👥'}
                      {interview.category === 'company-specific' && '🏢'}
                      {interview.category === 'mixed' && '🎯'}
                      {' '}
                      {interview.subCategory || interview.targetCompany || interview.category}
                    </span>
                    {interview.assignmentPriority && (
                      <span className={`priority-badge priority-${interview.assignmentPriority}`}>
                        {interview.assignmentPriority}
                      </span>
                    )}
                  </div>
                  {interview.assignmentNote && (
                    <p className="assignment-note">{interview.assignmentNote}</p>
                  )}
                  <div className="assigned-meta">
                    {interview.dueDate && (
                      <span className="due-date">
                        📅 Due: {new Date(interview.dueDate).toLocaleDateString()}
                      </span>
                    )}
                    <span className="assigned-date">
                      Assigned: {formatDate(interview.assignedAt || interview.createdAt)}
                    </span>
                  </div>
                </div>
                <div className="assigned-score">
                  {interview.status === 'completed' ? (
                    <span style={{ color: getScoreColor(interview.overallScore || 0) }}>
                      {interview.overallScore}%
                    </span>
                  ) : (
                    <span className={`status-badge ${interview.status}`}>
                      {interview.status}
                    </span>
                  )}
                </div>
                <div className="assigned-actions">
                  {interview.status === 'completed' && (
                    <button onClick={() => navigate(`/mock-interviews/${interview._id}/result`)}>
                      View Result
                    </button>
                  )}
                  {interview.status === 'in-progress' && (
                    <button className="primary-btn" onClick={() => navigate(`/mock-interviews/${interview._id}/take`)}>
                      Continue
                    </button>
                  )}
                  {interview.status === 'scheduled' && (
                    <button className="primary-btn" onClick={() => navigate(`/mock-interviews/${interview._id}/take`)}>
                      Start Now
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Recent Interviews */}
      {recentInterviews.length > 0 && (
        <div className="recent-section">
          <h2>Recent Interviews</h2>
          <div className="recent-list">
            {recentInterviews.map(interview => (
              <div key={interview._id} className="recent-item">
                <div className="recent-info">
                  <span className="recent-type">
                    {interview.category === 'technical' && '💻'}
                    {interview.category === 'hr' && '👥'}
                    {interview.category === 'company-specific' && '🏢'}
                    {interview.category === 'mixed' && '🎯'}
                    {' '}
                    {interview.subCategory || interview.targetCompany || interview.category}
                  </span>
                  <span className="recent-date">{formatDate(interview.createdAt)}</span>
                </div>
                <div className="recent-score">
                  {interview.status === 'completed' ? (
                    <span style={{ color: getScoreColor(interview.overallScore || 0) }}>
                      {interview.overallScore}%
                    </span>
                  ) : (
                    <span className={`status-badge ${interview.status}`}>
                      {interview.status}
                    </span>
                  )}
                </div>
                <div className="recent-actions">
                  {interview.status === 'completed' && (
                    <button onClick={() => navigate(`/mock-interviews/${interview._id}/result`)}>
                      View
                    </button>
                  )}
                  {interview.status === 'in-progress' && (
                    <button onClick={() => navigate(`/mock-interviews/${interview._id}/take`)}>
                      Continue
                    </button>
                  )}
                  {interview.status === 'scheduled' && (
                    <button onClick={() => navigate(`/mock-interviews/${interview._id}/take`)}>
                      Start
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Create Interview Modal */}
      {showCreateModal && selectedCategory && (
        <div className="modal-overlay" onClick={() => setShowCreateModal(false)}>
          <div className="modal-content" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h2>{selectedCategory.icon} {selectedCategory.name}</h2>
              <button className="close-btn" onClick={() => setShowCreateModal(false)}>×</button>
            </div>
            
            <div className="modal-body">
              {/* Sub-category selection */}
              {selectedCategory.subCategories.length > 0 && (
                <div className="form-group">
                  <label>
                    {selectedCategory.id === 'company-specific' ? 'Select Company' : 'Select Topic'}
                  </label>
                  <div className="option-grid">
                    {selectedCategory.subCategories.map(sub => (
                      <button
                        key={sub.id}
                        className={`option-btn ${
                          (selectedCategory.id === 'company-specific' 
                            ? config.targetCompany === sub.id 
                            : config.subCategory === sub.id) 
                            ? 'selected' 
                            : ''
                        }`}
                        onClick={() => {
                          if (selectedCategory.id === 'company-specific') {
                            setConfig({ ...config, targetCompany: sub.id });
                          } else {
                            setConfig({ ...config, subCategory: sub.id });
                          }
                        }}
                      >
                        {sub.name}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* Difficulty */}
              <div className="form-group">
                <label>Difficulty Level</label>
                <div className="option-grid">
                  {(['easy', 'medium', 'hard'] as const).map(level => (
                    <button
                      key={level}
                      className={`option-btn difficulty-${level} ${config.difficulty === level ? 'selected' : ''}`}
                      onClick={() => setConfig({ ...config, difficulty: level })}
                    >
                      {level === 'easy' && '🟢 '}
                      {level === 'medium' && '🟡 '}
                      {level === 'hard' && '🔴 '}
                      {level.charAt(0).toUpperCase() + level.slice(1)}
                    </button>
                  ))}
                </div>
              </div>

              {/* Questions Count */}
              <div className="form-group">
                <label>Number of Questions: {config.totalQuestions}</label>
                <input
                  type="range"
                  min="5"
                  max="20"
                  value={config.totalQuestions}
                  onChange={e => setConfig({ ...config, totalQuestions: parseInt(e.target.value) })}
                />
                <div className="range-labels">
                  <span>5</span>
                  <span>20</span>
                </div>
              </div>

              {/* Time Limit */}
              <div className="form-group">
                <label>Time Limit: {config.timeLimit} minutes</label>
                <input
                  type="range"
                  min="15"
                  max="60"
                  step="5"
                  value={config.timeLimit}
                  onChange={e => setConfig({ ...config, timeLimit: parseInt(e.target.value) })}
                />
                <div className="range-labels">
                  <span>15 min</span>
                  <span>60 min</span>
                </div>
              </div>
            </div>

            <div className="modal-footer">
              <button className="cancel-btn" onClick={() => setShowCreateModal(false)}>
                Cancel
              </button>
              <button 
                className="start-interview-btn" 
                onClick={handleStartInterview}
                disabled={creating}
              >
                {creating ? 'Creating...' : '🚀 Start Interview'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default MockInterviewHub;
