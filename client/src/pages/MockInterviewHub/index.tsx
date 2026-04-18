import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Container, Row, Col, Card, Button, Badge, Modal, Form, Spinner } from 'react-bootstrap';
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
    if (score >= 80) return 'success';
    if (score >= 60) return 'warning';
    if (score >= 40) return 'orange';
    return 'danger';
  };

  const getScoreHex = (score: number) => {
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
      <Container className="py-5 text-center">
        <Spinner animation="border" variant="primary" />
        <p className="mt-3 text-muted">Loading...</p>
      </Container>
    );
  }

  return (
    <Container fluid className="mock-interview-hub px-3 px-md-4 py-4">
      {/* Header */}
      <Row className="align-items-center mb-4">
        <Col xs={12} md={8}>
          <h1 className="h3 fw-bold text-dark mb-1">🎯 Mock Interview Hub</h1>
          <p className="text-muted mb-0">Practice interviews with AI and ace your placements</p>
        </Col>
        <Col xs={12} md={4} className="text-md-end mt-3 mt-md-0">
          <Button variant="outline-secondary" onClick={() => navigate('/mock-interviews/history')}>
            📜 View History
          </Button>
        </Col>
      </Row>

      {/* Stats Section */}
      {stats && (
        <Row className="g-3 mb-4">
          <Col xs={6} lg={3}>
            <Card className="h-100 border-0 shadow-sm">
              <Card.Body className="d-flex align-items-center gap-3">
                <span className="stat-icon-bs">📊</span>
                <div>
                  <div className="fs-4 fw-bold text-dark">{stats.completedInterviews}</div>
                  <small className="text-muted text-uppercase" style={{ letterSpacing: '0.5px', fontSize: '0.7rem' }}>Interviews Done</small>
                </div>
              </Card.Body>
            </Card>
          </Col>
          <Col xs={6} lg={3}>
            <Card className="h-100 border-0 shadow-sm">
              <Card.Body className="d-flex align-items-center gap-3">
                <span className="stat-icon-bs">⭐</span>
                <div>
                  <div className="fs-4 fw-bold" style={{ color: getScoreHex(stats.averageScore) }}>{stats.averageScore}%</div>
                  <small className="text-muted text-uppercase" style={{ letterSpacing: '0.5px', fontSize: '0.7rem' }}>Average Score</small>
                </div>
              </Card.Body>
            </Card>
          </Col>
          <Col xs={6} lg={3}>
            <Card className="h-100 border-0 shadow-sm">
              <Card.Body className="d-flex align-items-center gap-3">
                <span className="stat-icon-bs">🏆</span>
                <div>
                  <div className="fs-4 fw-bold text-success">{stats.bestScore}%</div>
                  <small className="text-muted text-uppercase" style={{ letterSpacing: '0.5px', fontSize: '0.7rem' }}>Best Score</small>
                </div>
              </Card.Body>
            </Card>
          </Col>
          <Col xs={6} lg={3}>
            <Card className="h-100 border-0 shadow-sm">
              <Card.Body className="d-flex align-items-center gap-3">
                <span className="stat-icon-bs">📈</span>
                <div className="flex-grow-1">
                  <div className="d-flex align-items-end gap-1 mb-1" style={{ height: '40px' }}>
                    {stats.recentTrend.map((score, idx) => (
                      <div
                        key={idx}
                        className="rounded-top"
                        style={{
                          width: '16px',
                          height: `${Math.max(score, 10)}%`,
                          backgroundColor: getScoreHex(score),
                          minHeight: '4px'
                        }}
                        title={`${score}%`}
                      />
                    ))}
                  </div>
                  <small className="text-muted text-uppercase" style={{ letterSpacing: '0.5px', fontSize: '0.7rem' }}>Recent Trend</small>
                </div>
              </Card.Body>
            </Card>
          </Col>
        </Row>
      )}

      {/* Categories Section */}
      <div className="mb-4">
        <h2 className="h5 fw-semibold text-dark mb-3">Choose Interview Type</h2>
        <Row className="g-3">
          {categories.map(category => (
            <Col key={category.id} xs={12} sm={6} lg={3}>
              <Card
                className="h-100 border-0 shadow-sm category-card-bs"
                role="button"
                onClick={() => handleCategorySelect(category)}
              >
                <Card.Body className="d-flex flex-column">
                  <span className="category-icon-bs mb-2">{category.icon}</span>
                  <Card.Title className="h6 fw-bold text-dark">{category.name}</Card.Title>
                  <Card.Text className="text-muted small flex-grow-1">{category.description}</Card.Text>
                  {category.subCategories.length > 0 && (
                    <div className="d-flex flex-wrap gap-1 mb-3">
                      {category.subCategories.slice(0, 3).map(sub => (
                        <Badge key={sub.id} bg="light" text="dark" className="fw-normal border">{sub.name}</Badge>
                      ))}
                      {category.subCategories.length > 3 && (
                        <Badge bg="secondary" className="fw-normal">+{category.subCategories.length - 3}</Badge>
                      )}
                    </div>
                  )}
                  <Button variant="primary" className="w-100 fw-semibold">
                    Start Interview →
                  </Button>
                </Card.Body>
              </Card>
            </Col>
          ))}
        </Row>
      </div>

      {/* Assigned Interviews */}
      {assignedInterviews.length > 0 && (
        <Card className="border-warning bg-warning-subtle mb-4 shadow-sm">
          <Card.Body>
            <h2 className="h5 fw-semibold mb-3" style={{ color: '#92400e' }}>📋 Assigned to You</h2>
            <div className="d-flex flex-column gap-2">
              {assignedInterviews.map(interview => (
                <Card key={interview._id} className="border-warning-subtle">
                  <Card.Body className="py-2 px-3">
                    <Row className="align-items-center g-2">
                      <Col xs={12} md={5}>
                        <div className="d-flex align-items-center gap-2 mb-1">
                          <span className="fw-semibold text-capitalize">
                            {interview.category === 'technical' && '💻'}
                            {interview.category === 'hr' && '👥'}
                            {interview.category === 'company-specific' && '🏢'}
                            {interview.category === 'mixed' && '🎯'}
                            {' '}{interview.subCategory || interview.targetCompany || interview.category}
                          </span>
                          {interview.assignmentPriority && (
                            <Badge bg={
                              interview.assignmentPriority === 'high' ? 'danger' :
                              interview.assignmentPriority === 'medium' ? 'warning' : 'success'
                            } className="text-uppercase" style={{ fontSize: '0.65rem' }}>
                              {interview.assignmentPriority}
                            </Badge>
                          )}
                        </div>
                        {interview.assignmentNote && (
                          <p className="text-muted small fst-italic mb-1">{interview.assignmentNote}</p>
                        )}
                        <div className="d-flex gap-3 small text-muted">
                          {interview.dueDate && (
                            <span style={{ color: '#b45309' }} className="fw-medium">
                              📅 Due: {new Date(interview.dueDate).toLocaleDateString()}
                            </span>
                          )}
                          <span>Assigned: {formatDate(interview.assignedAt || interview.createdAt)}</span>
                        </div>
                      </Col>
                      <Col xs={6} md={3} className="text-center">
                        {interview.status === 'completed' ? (
                          <span className="fs-5 fw-bold" style={{ color: getScoreHex(interview.overallScore || 0) }}>
                            {interview.overallScore}%
                          </span>
                        ) : (
                          <Badge bg={
                            interview.status === 'scheduled' ? 'primary' :
                            interview.status === 'in-progress' ? 'warning' : 'secondary'
                          }>{interview.status}</Badge>
                        )}
                      </Col>
                      <Col xs={6} md={4} className="text-end">
                        {interview.status === 'completed' && (
                          <Button size="sm" variant="outline-primary" onClick={() => navigate(`/mock-interviews/${interview._id}/result`)}>
                            View Result
                          </Button>
                        )}
                        {interview.status === 'in-progress' && (
                          <Button size="sm" variant="success" onClick={() => navigate(`/mock-interviews/${interview._id}/take`)}>
                            Continue
                          </Button>
                        )}
                        {interview.status === 'scheduled' && (
                          <Button size="sm" variant="primary" onClick={() => navigate(`/mock-interviews/${interview._id}/take`)}>
                            Start Now
                          </Button>
                        )}
                      </Col>
                    </Row>
                  </Card.Body>
                </Card>
              ))}
            </div>
          </Card.Body>
        </Card>
      )}

      {/* Recent Interviews */}
      {recentInterviews.length > 0 && (
        <Card className="border-0 shadow-sm">
          <Card.Body>
            <h2 className="h5 fw-semibold text-dark mb-3">Recent Interviews</h2>
            <div className="d-flex flex-column gap-2">
              {recentInterviews.map(interview => (
                <div key={interview._id} className="d-flex align-items-center gap-3 p-2 rounded bg-light">
                  <Row className="w-100 align-items-center g-2">
                    <Col xs={12} sm={5}>
                      <span className="fw-medium text-dark text-capitalize">
                        {interview.category === 'technical' && '💻'}
                        {interview.category === 'hr' && '👥'}
                        {interview.category === 'company-specific' && '🏢'}
                        {interview.category === 'mixed' && '🎯'}
                        {' '}{interview.subCategory || interview.targetCompany || interview.category}
                      </span>
                      <br />
                      <small className="text-muted">{formatDate(interview.createdAt)}</small>
                    </Col>
                    <Col xs={6} sm={3} className="text-center">
                      {interview.status === 'completed' ? (
                        <span className="fs-6 fw-bold" style={{ color: getScoreHex(interview.overallScore || 0) }}>
                          {interview.overallScore}%
                        </span>
                      ) : (
                        <Badge bg={
                          interview.status === 'scheduled' ? 'primary' :
                          interview.status === 'in-progress' ? 'warning' : 'secondary'
                        }>{interview.status}</Badge>
                      )}
                    </Col>
                    <Col xs={6} sm={4} className="text-end">
                      {interview.status === 'completed' && (
                        <Button size="sm" variant="outline-secondary" onClick={() => navigate(`/mock-interviews/${interview._id}/result`)}>
                          View
                        </Button>
                      )}
                      {interview.status === 'in-progress' && (
                        <Button size="sm" variant="outline-primary" onClick={() => navigate(`/mock-interviews/${interview._id}/take`)}>
                          Continue
                        </Button>
                      )}
                      {interview.status === 'scheduled' && (
                        <Button size="sm" variant="outline-primary" onClick={() => navigate(`/mock-interviews/${interview._id}/take`)}>
                          Start
                        </Button>
                      )}
                    </Col>
                  </Row>
                </div>
              ))}
            </div>
          </Card.Body>
        </Card>
      )}

      {/* Create Interview Modal */}
      <Modal show={showCreateModal} onHide={() => setShowCreateModal(false)} centered>
        <Modal.Header closeButton>
          <Modal.Title className="h5">
            {selectedCategory?.icon} {selectedCategory?.name}
          </Modal.Title>
        </Modal.Header>
        <Modal.Body>
          {selectedCategory && selectedCategory.subCategories.length > 0 && (
            <Form.Group className="mb-4">
              <Form.Label className="fw-semibold">
                {selectedCategory.id === 'company-specific' ? 'Select Company' : 'Select Topic'}
              </Form.Label>
              <div className="d-flex flex-wrap gap-2">
                {selectedCategory.subCategories.map(sub => (
                  <Button
                    key={sub.id}
                    size="sm"
                    variant={
                      (selectedCategory.id === 'company-specific'
                        ? config.targetCompany === sub.id
                        : config.subCategory === sub.id)
                        ? 'primary' : 'outline-secondary'
                    }
                    onClick={() => {
                      if (selectedCategory.id === 'company-specific') {
                        setConfig({ ...config, targetCompany: sub.id });
                      } else {
                        setConfig({ ...config, subCategory: sub.id });
                      }
                    }}
                  >
                    {sub.name}
                  </Button>
                ))}
              </div>
            </Form.Group>
          )}

          <Form.Group className="mb-4">
            <Form.Label className="fw-semibold">Difficulty Level</Form.Label>
            <div className="d-flex flex-wrap gap-2">
              {(['easy', 'medium', 'hard'] as const).map(level => (
                <Button
                  key={level}
                  size="sm"
                  variant={config.difficulty === level
                    ? (level === 'easy' ? 'success' : level === 'medium' ? 'warning' : 'danger')
                    : 'outline-secondary'
                  }
                  onClick={() => setConfig({ ...config, difficulty: level })}
                >
                  {level === 'easy' && '🟢 '}
                  {level === 'medium' && '🟡 '}
                  {level === 'hard' && '🔴 '}
                  {level.charAt(0).toUpperCase() + level.slice(1)}
                </Button>
              ))}
            </div>
          </Form.Group>

          <Form.Group className="mb-4">
            <Form.Label className="fw-semibold">
              Number of Questions: <strong>{config.totalQuestions}</strong>
            </Form.Label>
            <Form.Range
              min={5} max={20}
              value={config.totalQuestions}
              onChange={e => setConfig({ ...config, totalQuestions: parseInt(e.target.value) })}
            />
            <div className="d-flex justify-content-between small text-muted">
              <span>5</span><span>20</span>
            </div>
          </Form.Group>

          <Form.Group className="mb-3">
            <Form.Label className="fw-semibold">
              Time Limit: <strong>{config.timeLimit} minutes</strong>
            </Form.Label>
            <Form.Range
              min={15} max={60} step={5}
              value={config.timeLimit}
              onChange={e => setConfig({ ...config, timeLimit: parseInt(e.target.value) })}
            />
            <div className="d-flex justify-content-between small text-muted">
              <span>15 min</span><span>60 min</span>
            </div>
          </Form.Group>
        </Modal.Body>
        <Modal.Footer>
          <Button variant="secondary" onClick={() => setShowCreateModal(false)}>
            Cancel
          </Button>
          <Button variant="primary" onClick={handleStartInterview} disabled={creating}>
            {creating ? (
              <><Spinner size="sm" animation="border" className="me-2" />Creating...</>
            ) : '🚀 Start Interview'}
          </Button>
        </Modal.Footer>
      </Modal>
    </Container>
  );
};

export default MockInterviewHub;
