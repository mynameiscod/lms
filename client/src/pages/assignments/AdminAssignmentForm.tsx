import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import ReactQuill from 'react-quill';
import 'react-quill/dist/quill.snow.css';
import {
  assignmentApi,
  AssignmentType,
  DifficultyLevel,
  ProgrammingLanguage,
  TestCase,
  StarterCode,
  RubricItem,
  MCQQuestion
} from '../../api/assignmentApi';
import './assignments.css';

type ActiveTab = 'basic' | 'coding' | 'mcq' | 'rubric' | 'settings';

const AdminAssignmentForm: React.FC = () => {
  const navigate = useNavigate();
  const { id } = useParams<{ id: string }>();
  const isEdit = Boolean(id);

  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<ActiveTab>('basic');

  // Basic Info
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [instructions, setInstructions] = useState('');
  const [type, setType] = useState<AssignmentType>(AssignmentType.CODING);
  const [difficulty, setDifficulty] = useState<DifficultyLevel>(DifficultyLevel.MEDIUM);
  const [totalPoints, setTotalPoints] = useState(100);
  const [topics, setTopics] = useState<string[]>([]);
  const [topicInput, setTopicInput] = useState('');

  // Coding Settings
  const [allowedLanguages, setAllowedLanguages] = useState<ProgrammingLanguage[]>([
    ProgrammingLanguage.JAVASCRIPT,
    ProgrammingLanguage.PYTHON,
    ProgrammingLanguage.JAVA
  ]);
  const [starterCode, setStarterCode] = useState<StarterCode[]>([]);
  const [testCases, setTestCases] = useState<TestCase[]>([]);
  const [timeLimit, setTimeLimit] = useState(5000);
  const [memoryLimit, setMemoryLimit] = useState(256);

  // MCQ
  const [mcqQuestions, setMcqQuestions] = useState<MCQQuestion[]>([]);
  const [shuffleQuestions, setShuffleQuestions] = useState(true);
  const [shuffleOptions, setShuffleOptions] = useState(true);
  const [showCorrectAnswers, setShowCorrectAnswers] = useState(false);

  // Rubric
  const [rubric, setRubric] = useState<RubricItem[]>([]);

  // Settings
  const [dueDate, setDueDate] = useState('');
  const [timeLimitMinutes, setTimeLimitMinutes] = useState(0);
  const [maxAttempts, setMaxAttempts] = useState(0);
  const [allowLateSubmission, setAllowLateSubmission] = useState(false);
  const [latePenaltyPercent, setLatePenaltyPercent] = useState(10);
  const [publishImmediately, setPublishImmediately] = useState(true);
  
  // Code Execution Settings
  const [showSyntaxErrors, setShowSyntaxErrors] = useState(true);
  const [showTestCaseResults, setShowTestCaseResults] = useState(true);
  const [showExpectedOutput, setShowExpectedOutput] = useState(true);
  const [enablePlagiarismCheck, setEnablePlagiarismCheck] = useState(false);

  // Rich text editor configuration
  const quillModules = useMemo(() => ({
    toolbar: [
      [{ 'header': [1, 2, 3, false] }],
      ['bold', 'italic', 'underline', 'strike'],
      [{ 'color': [] }, { 'background': [] }],
      [{ 'list': 'ordered' }, { 'list': 'bullet' }],
      [{ 'indent': '-1' }, { 'indent': '+1' }],
      ['blockquote', 'code-block'],
      ['link', 'image'],
      ['clean']
    ],
  }), []);

  const quillFormats = [
    'header',
    'bold', 'italic', 'underline', 'strike',
    'color', 'background',
    'list', 'bullet', 'indent',
    'blockquote', 'code-block',
    'link', 'image'
  ];

  // Load existing assignment if editing
  useEffect(() => {
    if (id) {
      loadAssignment();
    }
  }, [id]);

  const loadAssignment = async () => {
    try {
      setLoading(true);
      const response = await assignmentApi.getById(id!);
      const a = response.data.data;

      setTitle(a.title);
      setDescription(a.description);
      setInstructions(a.instructions || '');
      setType(a.type);
      setDifficulty(a.difficulty);
      setTotalPoints(a.totalPoints);
      setTopics(a.topics);

      // Coding settings
      setAllowedLanguages(a.allowedLanguages);
      setStarterCode(a.starterCode);
      setTestCases(a.testCases);
      setTimeLimit(a.timeLimit || 5000);
      setMemoryLimit(a.memoryLimit || 256);

      // MCQ
      setMcqQuestions(a.mcqQuestions);
      setShuffleQuestions(a.settings?.shuffleQuestions ?? true);
      setShuffleOptions(a.settings?.shuffleOptions ?? true);
      setShowCorrectAnswers(a.settings?.showCorrectAnswers ?? false);

      // Rubric
      setRubric(a.rubric);

      // Settings
      if (a.dueDate) {
        setDueDate(new Date(a.dueDate).toISOString().slice(0, 16));
      }
      setTimeLimitMinutes(a.settings?.timeLimitMinutes || 0);
      setMaxAttempts(a.settings?.maxAttempts || 0);
      setAllowLateSubmission(a.settings?.allowLateSubmission ?? false);
      setLatePenaltyPercent(a.settings?.latePenaltyPercent || 10);
      
      // Code execution settings
      setShowSyntaxErrors(a.showSyntaxErrors ?? true);
      setShowTestCaseResults(a.showTestCaseResults ?? true);
      setShowExpectedOutput(a.showExpectedOutput ?? true);
      setEnablePlagiarismCheck(a.enablePlagiarismCheck ?? false);
    } catch (err) {
      setError('Failed to load assignment');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) {
      setError('Please enter a title');
      return;
    }

    try {
      setSaving(true);
      setError(null);

      const data: any = {
        title,
        description,
        instructions,
        type,
        difficulty,
        totalPoints,
        topics,
        allowedLanguages,
        starterCode,
        testCases,
        timeLimit,
        memoryLimit,
        mcqQuestions,
        rubric,
        dueDate: dueDate ? new Date(dueDate).toISOString() : undefined,
        settings: {
          shuffleQuestions,
          shuffleOptions,
          showCorrectAnswers,
          timeLimitMinutes: timeLimitMinutes || undefined,
          maxAttempts: maxAttempts || undefined,
          allowLateSubmission,
          latePenaltyPercent
        },
        showSyntaxErrors,
        showTestCaseResults,
        showExpectedOutput,
        enablePlagiarismCheck
      };

      if (isEdit) {
        await assignmentApi.update(id!, data);
      } else {
        const response = await assignmentApi.create(data);
        // Publish immediately if checkbox is checked
        if (publishImmediately && response.data.data?._id) {
          await assignmentApi.publish(response.data.data._id);
        }
      }

      navigate('/admin/assignments');
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to save assignment');
    } finally {
      setSaving(false);
    }
  };

  // Topics helpers
  const addTopic = () => {
    if (topicInput.trim() && !topics.includes(topicInput.trim())) {
      setTopics([...topics, topicInput.trim()]);
      setTopicInput('');
    }
  };

  const removeTopic = (index: number) => {
    setTopics(topics.filter((_, i) => i !== index));
  };

  // Test Cases helpers
  const addTestCase = () => {
    setTestCases([
      ...testCases,
      {
        input: '',
        expectedOutput: '',
        isHidden: false,
        points: 10,
        description: ''
      }
    ]);
  };

  const updateTestCase = (index: number, field: keyof TestCase, value: any) => {
    const updated = [...testCases];
    updated[index] = { ...updated[index], [field]: value };
    setTestCases(updated);
  };

  const removeTestCase = (index: number) => {
    setTestCases(testCases.filter((_, i) => i !== index));
  };

  // Starter Code helpers
  const addStarterCode = (lang: ProgrammingLanguage) => {
    if (!starterCode.find(s => s.language === lang)) {
      setStarterCode([...starterCode, { language: lang, code: '' }]);
    }
  };

  const updateStarterCode = (lang: ProgrammingLanguage, code: string) => {
    setStarterCode(starterCode.map(s => s.language === lang ? { ...s, code } : s));
  };

  const removeStarterCode = (lang: ProgrammingLanguage) => {
    setStarterCode(starterCode.filter(s => s.language !== lang));
  };

  // MCQ helpers
  const addMCQQuestion = () => {
    setMcqQuestions([
      ...mcqQuestions,
      {
        question: '',
        options: [
          { text: '', isCorrect: true },
          { text: '', isCorrect: false },
          { text: '', isCorrect: false },
          { text: '', isCorrect: false }
        ],
        points: 10,
        explanation: ''
      }
    ]);
  };

  const updateMCQQuestion = (index: number, field: string, value: any) => {
    const updated = [...mcqQuestions];
    updated[index] = { ...updated[index], [field]: value };
    setMcqQuestions(updated);
  };

  const updateMCQOption = (qIndex: number, oIndex: number, field: string, value: any) => {
    const updated = [...mcqQuestions];
    if (field === 'isCorrect' && value === true) {
      // Only one correct answer
      updated[qIndex].options = updated[qIndex].options.map((o, i) => ({
        ...o,
        isCorrect: i === oIndex
      }));
    } else {
      updated[qIndex].options[oIndex] = { ...updated[qIndex].options[oIndex], [field]: value };
    }
    setMcqQuestions(updated);
  };

  const removeMCQQuestion = (index: number) => {
    setMcqQuestions(mcqQuestions.filter((_, i) => i !== index));
  };

  // Rubric helpers
  const addRubricItem = () => {
    setRubric([
      ...rubric,
      {
        criterion: '',
        description: '',
        maxPoints: 10
      }
    ]);
  };

  const updateRubricItem = (index: number, field: keyof RubricItem, value: any) => {
    const updated = [...rubric];
    updated[index] = { ...updated[index], [field]: value };
    setRubric(updated);
  };

  const removeRubricItem = (index: number) => {
    setRubric(rubric.filter((_, i) => i !== index));
  };

  // Toggle language
  const toggleLanguage = (lang: ProgrammingLanguage) => {
    if (allowedLanguages.includes(lang)) {
      setAllowedLanguages(allowedLanguages.filter(l => l !== lang));
      removeStarterCode(lang);
    } else {
      setAllowedLanguages([...allowedLanguages, lang]);
    }
  };

  if (loading) {
    return (
      <div className="assignment-page">
        <div className="loading-spinner">
          <div className="spinner"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="assignment-page">
      {/* Header */}
      <div className="page-header">
        <div>
          <h1>{isEdit ? '✏️ Edit Assignment' : '➕ Create Assignment'}</h1>
          <p>{isEdit ? 'Update assignment details' : 'Create a new assignment for your students'}</p>
        </div>
        <div style={{ display: 'flex', gap: '12px' }}>
          <button 
            className="btn btn-secondary"
            onClick={() => navigate('/admin/assignments')}
          >
            Cancel
          </button>
          <button 
            className="btn btn-primary"
            onClick={handleSubmit}
            disabled={saving}
          >
            {saving ? 'Saving...' : (isEdit ? 'Update' : 'Create')}
          </button>
        </div>
      </div>

      {/* Error Alert */}
      {error && (
        <div className="alert alert-error">
          <i className="bi bi-exclamation-triangle"></i>
          {error}
          <button 
            style={{ marginLeft: 'auto', background: 'none', border: 'none', cursor: 'pointer' }}
            onClick={() => setError(null)}
          >
            ✕
          </button>
        </div>
      )}

      {/* Tabs */}
      <div className="tabs">
        <button 
          className={`tab ${activeTab === 'basic' ? 'active' : ''}`}
          onClick={() => setActiveTab('basic')}
        >
          📝 Basic Info
        </button>
        {(type === AssignmentType.CODING || type === AssignmentType.SQL) && (
          <button 
            className={`tab ${activeTab === 'coding' ? 'active' : ''}`}
            onClick={() => setActiveTab('coding')}
          >
            💻 Coding Settings
          </button>
        )}
        {type === AssignmentType.MCQ && (
          <button 
            className={`tab ${activeTab === 'mcq' ? 'active' : ''}`}
            onClick={() => setActiveTab('mcq')}
          >
            📋 MCQ Questions
          </button>
        )}
        {(type === AssignmentType.PROJECT || type === AssignmentType.THEORY) && (
          <button 
            className={`tab ${activeTab === 'rubric' ? 'active' : ''}`}
            onClick={() => setActiveTab('rubric')}
          >
            📊 Rubric
          </button>
        )}
        <button 
          className={`tab ${activeTab === 'settings' ? 'active' : ''}`}
          onClick={() => setActiveTab('settings')}
        >
          ⚙️ Settings
        </button>
      </div>

      <form onSubmit={handleSubmit}>
        {/* Basic Info Tab */}
        {activeTab === 'basic' && (
          <div className="form-section">
            <h3 className="section-title">Basic Information</h3>
            <p className="section-description">Enter the basic details of your assignment</p>

            <div className="form-group">
              <label className="form-label">
                Title <span className="text-danger">*</span>
              </label>
              <input
                type="text"
                className="form-control"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="e.g., Build a REST API with Express.js"
                required
              />
            </div>

            <div className="form-row">
              <div className="form-group">
                <label className="form-label">Assignment Type</label>
                <select
                  className="form-control"
                  value={type}
                  onChange={(e) => setType(e.target.value as AssignmentType)}
                >
                  <option value="coding">💻 Coding Challenge</option>
                  <option value="mcq">📋 Multiple Choice Quiz</option>
                  <option value="theory">📝 Theory / Essay</option>
                  <option value="project">🚀 Project</option>
                  <option value="file_upload">📎 File Upload</option>
                  <option value="sql">🗄️ SQL Challenge</option>
                </select>
              </div>

              <div className="form-group">
                <label className="form-label">Difficulty Level</label>
                <select
                  className="form-control"
                  value={difficulty}
                  onChange={(e) => setDifficulty(e.target.value as DifficultyLevel)}
                >
                  <option value="beginner">🌱 Beginner</option>
                  <option value="easy">😊 Easy</option>
                  <option value="medium">🔥 Medium</option>
                  <option value="hard">💪 Hard</option>
                  <option value="expert">🏆 Expert</option>
                </select>
              </div>

              <div className="form-group">
                <label className="form-label">Total Points</label>
                <input
                  type="number"
                  className="form-control"
                  value={totalPoints}
                  onChange={(e) => setTotalPoints(Number(e.target.value))}
                  min={1}
                />
              </div>
            </div>

            <div className="form-group">
              <label className="form-label">Description</label>
              <ReactQuill
                theme="snow"
                value={description}
                onChange={setDescription}
                modules={quillModules}
                formats={quillFormats}
                placeholder="Brief description of what this assignment is about..."
                className="quill-editor quill-description"
              />
            </div>

            <div className="form-group">
              <label className="form-label">Instructions</label>
              <ReactQuill
                theme="snow"
                value={instructions}
                onChange={setInstructions}
                modules={quillModules}
                formats={quillFormats}
                placeholder="Detailed instructions for completing this assignment..."
                className="quill-editor quill-instructions"
              />
              <small className="form-hint">Use the toolbar for rich text formatting, code blocks, and lists</small>
            </div>

            <div className="form-group">
              <label className="form-label">Topics / Tags</label>
              <div style={{ display: 'flex', gap: '8px', marginBottom: '8px' }}>
                <input
                  type="text"
                  className="form-control"
                  value={topicInput}
                  onChange={(e) => setTopicInput(e.target.value)}
                  placeholder="Add a topic..."
                  onKeyPress={(e) => e.key === 'Enter' && (e.preventDefault(), addTopic())}
                />
                <button type="button" className="btn btn-secondary" onClick={addTopic}>
                  Add
                </button>
              </div>
              <div className="language-pills">
                {topics.map((topic, index) => (
                  <span key={index} className="language-pill">
                    {topic}
                    <button 
                      type="button"
                      style={{ marginLeft: '4px', background: 'none', border: 'none', cursor: 'pointer' }}
                      onClick={() => removeTopic(index)}
                    >
                      ×
                    </button>
                  </span>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Coding Settings Tab */}
        {activeTab === 'coding' && (type === AssignmentType.CODING || type === AssignmentType.SQL) && (
          <>
            <div className="form-section">
              <h3 className="section-title">Programming Languages</h3>
              <p className="section-description">Select which languages students can use</p>

              <div className="language-pills">
                {Object.values(ProgrammingLanguage).map((lang) => (
                  <button
                    key={lang}
                    type="button"
                    className={`language-pill ${allowedLanguages.includes(lang) ? 'active' : ''}`}
                    onClick={() => toggleLanguage(lang)}
                  >
                    {lang}
                  </button>
                ))}
              </div>
            </div>

            <div className="form-section">
              <h3 className="section-title">Starter Code</h3>
              <p className="section-description">Provide starter code template for each language</p>

              {allowedLanguages.map((lang) => {
                const sc = starterCode.find(s => s.language === lang);
                return (
                  <div key={lang} className="form-group">
                    <label className="form-label">{lang}</label>
                    <textarea
                      className="form-control"
                      value={sc?.code || ''}
                      onChange={(e) => {
                        if (!sc) addStarterCode(lang);
                        updateStarterCode(lang, e.target.value);
                      }}
                      placeholder={`// Starter code for ${lang}...`}
                      rows={6}
                      style={{ fontFamily: 'monospace' }}
                    />
                  </div>
                );
              })}
            </div>

            <div className="form-section">
              <h3 className="section-title">Test Cases</h3>
              <p className="section-description">Define test cases to validate student solutions</p>

              {testCases.map((tc, index) => (
                <div key={index} className="test-case-card">
                  <div className="test-case-header">
                    <span>Test Case #{index + 1}</span>
                    <div>
                      <label style={{ marginRight: '12px', fontSize: '14px' }}>
                        <input
                          type="checkbox"
                          checked={tc.isHidden}
                          onChange={(e) => updateTestCase(index, 'isHidden', e.target.checked)}
                          style={{ marginRight: '4px' }}
                        />
                        Hidden
                      </label>
                      <button
                        type="button"
                        className="btn btn-icon btn-danger btn-sm"
                        onClick={() => removeTestCase(index)}
                      >
                        <i className="bi bi-trash"></i>
                      </button>
                    </div>
                  </div>
                  <div className="test-case-content">
                    <div className="form-row">
                      <div className="form-group">
                        <label className="form-label">Description</label>
                        <input
                          type="text"
                          className="form-control"
                          value={tc.description || ''}
                          onChange={(e) => updateTestCase(index, 'description', e.target.value)}
                          placeholder="e.g., Tests basic functionality"
                        />
                      </div>
                      <div className="form-group" style={{ maxWidth: '120px' }}>
                        <label className="form-label">Points</label>
                        <input
                          type="number"
                          className="form-control"
                          value={tc.points}
                          onChange={(e) => updateTestCase(index, 'points', Number(e.target.value))}
                          min={0}
                        />
                      </div>
                    </div>
                    <div className="form-row">
                      <div className="form-group">
                        <label className="form-label">Input</label>
                        <textarea
                          className="form-control"
                          value={tc.input}
                          onChange={(e) => updateTestCase(index, 'input', e.target.value)}
                          placeholder="Input for the test..."
                          rows={3}
                          style={{ fontFamily: 'monospace' }}
                        />
                      </div>
                      <div className="form-group">
                        <label className="form-label">Expected Output</label>
                        <textarea
                          className="form-control"
                          value={tc.expectedOutput}
                          onChange={(e) => updateTestCase(index, 'expectedOutput', e.target.value)}
                          placeholder="Expected output..."
                          rows={3}
                          style={{ fontFamily: 'monospace' }}
                        />
                      </div>
                    </div>
                  </div>
                </div>
              ))}

              <button type="button" className="btn btn-secondary" onClick={addTestCase}>
                <i className="bi bi-plus"></i> Add Test Case
              </button>
            </div>

            <div className="form-section">
              <h3 className="section-title">Execution Limits</h3>
              <div className="form-row">
                <div className="form-group">
                  <label className="form-label">Time Limit (ms)</label>
                  <input
                    type="number"
                    className="form-control"
                    value={timeLimit}
                    onChange={(e) => setTimeLimit(Number(e.target.value))}
                    min={1000}
                    max={30000}
                  />
                  <small className="form-hint">Maximum execution time per test case</small>
                </div>
                <div className="form-group">
                  <label className="form-label">Memory Limit (MB)</label>
                  <input
                    type="number"
                    className="form-control"
                    value={memoryLimit}
                    onChange={(e) => setMemoryLimit(Number(e.target.value))}
                    min={16}
                    max={512}
                  />
                  <small className="form-hint">Maximum memory usage</small>
                </div>
              </div>
            </div>
          </>
        )}

        {/* MCQ Tab */}
        {activeTab === 'mcq' && type === AssignmentType.MCQ && (
          <div className="form-section">
            <h3 className="section-title">Multiple Choice Questions</h3>
            <p className="section-description">Create questions with multiple choice answers</p>

            {mcqQuestions.map((q, qIndex) => (
              <div key={qIndex} className="mcq-card">
                <div className="mcq-header">
                  <span>Question #{qIndex + 1}</span>
                  <button
                    type="button"
                    className="btn btn-icon btn-danger btn-sm"
                    onClick={() => removeMCQQuestion(qIndex)}
                  >
                    <i className="bi bi-trash"></i>
                  </button>
                </div>
                <div className="mcq-content">
                  <div className="form-row">
                    <div className="form-group" style={{ flex: 3 }}>
                      <label className="form-label">Question</label>
                      <textarea
                        className="form-control"
                        value={q.question}
                        onChange={(e) => updateMCQQuestion(qIndex, 'question', e.target.value)}
                        placeholder="Enter your question..."
                        rows={2}
                      />
                    </div>
                    <div className="form-group" style={{ maxWidth: '100px' }}>
                      <label className="form-label">Points</label>
                      <input
                        type="number"
                        className="form-control"
                        value={q.points}
                        onChange={(e) => updateMCQQuestion(qIndex, 'points', Number(e.target.value))}
                        min={1}
                      />
                    </div>
                  </div>

                  <div className="mcq-options">
                    <label className="form-label">Options (select the correct answer)</label>
                    {q.options.map((opt, oIndex) => (
                      <div key={oIndex} className={`mcq-option ${opt.isCorrect ? 'correct' : ''}`}>
                        <input
                          type="radio"
                          name={`q${qIndex}-correct`}
                          checked={opt.isCorrect}
                          onChange={() => updateMCQOption(qIndex, oIndex, 'isCorrect', true)}
                        />
                        <input
                          type="text"
                          className="form-control"
                          value={opt.text}
                          onChange={(e) => updateMCQOption(qIndex, oIndex, 'text', e.target.value)}
                          placeholder={`Option ${String.fromCharCode(65 + oIndex)}`}
                        />
                      </div>
                    ))}
                  </div>

                  <div className="form-group" style={{ marginTop: '12px' }}>
                    <label className="form-label">Explanation (shown after submission)</label>
                    <textarea
                      className="form-control"
                      value={q.explanation || ''}
                      onChange={(e) => updateMCQQuestion(qIndex, 'explanation', e.target.value)}
                      placeholder="Explain why the correct answer is correct..."
                      rows={2}
                    />
                  </div>
                </div>
              </div>
            ))}

            <button type="button" className="btn btn-secondary" onClick={addMCQQuestion}>
              <i className="bi bi-plus"></i> Add Question
            </button>
          </div>
        )}

        {/* Rubric Tab */}
        {activeTab === 'rubric' && (type === AssignmentType.PROJECT || type === AssignmentType.THEORY) && (
          <div className="form-section">
            <h3 className="section-title">Grading Rubric</h3>
            <p className="section-description">Define criteria for grading submissions</p>

            {rubric.map((item, index) => (
              <div key={index} className="rubric-item">
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '12px' }}>
                  <span style={{ fontWeight: 500 }}>Criterion #{index + 1}</span>
                  <button
                    type="button"
                    className="btn btn-icon btn-danger btn-sm"
                    onClick={() => removeRubricItem(index)}
                  >
                    <i className="bi bi-trash"></i>
                  </button>
                </div>
                <div className="form-row">
                  <div className="form-group" style={{ flex: 2 }}>
                    <label className="form-label">Criterion Name</label>
                    <input
                      type="text"
                      className="form-control"
                      value={item.criterion}
                      onChange={(e) => updateRubricItem(index, 'criterion', e.target.value)}
                      placeholder="e.g., Code Quality"
                    />
                  </div>
                  <div className="form-group" style={{ maxWidth: '120px' }}>
                    <label className="form-label">Max Points</label>
                    <input
                      type="number"
                      className="form-control"
                      value={item.maxPoints}
                      onChange={(e) => updateRubricItem(index, 'maxPoints', Number(e.target.value))}
                      min={1}
                    />
                  </div>
                </div>
                <div className="form-group">
                  <label className="form-label">Description</label>
                  <textarea
                    className="form-control"
                    value={item.description || ''}
                    onChange={(e) => updateRubricItem(index, 'description', e.target.value)}
                    placeholder="What does excellent, good, poor look like for this criterion?"
                    rows={2}
                  />
                </div>
              </div>
            ))}

            <button type="button" className="btn btn-secondary" onClick={addRubricItem}>
              <i className="bi bi-plus"></i> Add Criterion
            </button>
          </div>
        )}

        {/* Settings Tab */}
        {activeTab === 'settings' && (
          <div className="form-section" style={{ padding: '24px' }}>
            <h3 className="section-title" style={{ marginTop: 0 }}>Assignment Settings</h3>
            <p className="section-description">Configure deadline and submission rules</p>

            <div className="form-row">
              <div className="form-group">
                <label className="form-label">Due Date</label>
                <input
                  type="datetime-local"
                  className="form-control"
                  value={dueDate}
                  onChange={(e) => setDueDate(e.target.value)}
                />
                <small className="form-hint">Leave empty for no deadline</small>
              </div>
              <div className="form-group">
                <label className="form-label">Time Limit (minutes)</label>
                <input
                  type="number"
                  className="form-control"
                  value={timeLimitMinutes}
                  onChange={(e) => setTimeLimitMinutes(Number(e.target.value))}
                  min={0}
                />
                <small className="form-hint">0 = no time limit</small>
              </div>
              <div className="form-group">
                <label className="form-label">Max Attempts</label>
                <input
                  type="number"
                  className="form-control"
                  value={maxAttempts}
                  onChange={(e) => setMaxAttempts(Number(e.target.value))}
                  min={0}
                />
                <small className="form-hint">0 = unlimited</small>
              </div>
            </div>

            <div className="form-group">
              <div style={{ boxSizing: 'border-box', 
                display: 'flex', 
                justifyContent: 'space-between', 
                alignItems: 'center',
                padding: '16px',
                backgroundColor: '#f8fafc',
                borderRadius: '8px',
                border: '1px solid #e2e8f0'
              }}>
                <div>
                  <div style={{ fontWeight: 500, marginBottom: '4px' }}>Allow Late Submissions</div>
                  <div style={{ fontSize: '13px', color: '#64748b' }}>Students can submit after the deadline</div>
                </div>
                <label className="toggle-switch" style={{ position: 'relative', display: 'inline-block', width: '48px', height: '26px' }}>
                  <input
                    type="checkbox"
                    checked={allowLateSubmission}
                    onChange={(e) => setAllowLateSubmission(e.target.checked)}
                    style={{ opacity: 0, width: 0, height: 0 }}
                  />
                  <span style={{
                    position: 'absolute',
                    cursor: 'pointer',
                    top: 0, left: 0, right: 0, bottom: 0,
                    backgroundColor: allowLateSubmission ? '#3b82f6' : '#cbd5e1',
                    transition: '0.3s',
                    borderRadius: '26px'
                  }}>
                    <span style={{
                      position: 'absolute',
                      content: '""',
                      height: '20px',
                      width: '20px',
                      left: allowLateSubmission ? '25px' : '3px',
                      bottom: '3px',
                      backgroundColor: 'white',
                      transition: '0.3s',
                      borderRadius: '50%'
                    }}></span>
                  </span>
                </label>
              </div>
            </div>

            {allowLateSubmission && (
              <div className="form-group" style={{ maxWidth: '200px', marginLeft: '16px' }}>
                <label className="form-label">Late Penalty (%)</label>
                <input
                  type="number"
                  className="form-control"
                  value={latePenaltyPercent}
                  onChange={(e) => setLatePenaltyPercent(Number(e.target.value))}
                  min={0}
                  max={100}
                />
                <small className="form-hint">Points deducted for late submission</small>
              </div>
            )}

            {(type === AssignmentType.CODING || type === AssignmentType.SQL) && (
              <>
                <hr style={{ margin: '24px 0', border: 'none', borderTop: '1px solid #e5e7eb' }} />
                <h4 style={{ marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <span style={{ fontSize: '20px' }}>⚙️</span> Code Execution Settings
                </h4>
                
                <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                  {/* Show Syntax Errors */}
                  <div style={{ boxSizing: 'border-box', 
                    display: 'flex', 
                    justifyContent: 'space-between', 
                    alignItems: 'center',
                    padding: '16px',
                    backgroundColor: '#f8fafc',
                    borderRadius: '8px',
                    border: '1px solid #e2e8f0'
                  }}>
                    <div>
                      <div style={{ fontWeight: 500, marginBottom: '4px' }}>Show Syntax Errors</div>
                      <div style={{ fontSize: '13px', color: '#64748b' }}>Students see detailed compilation/syntax error messages</div>
                    </div>
                    <label style={{ position: 'relative', display: 'inline-block', width: '48px', height: '26px' }}>
                      <input
                        type="checkbox"
                        checked={showSyntaxErrors}
                        onChange={(e) => setShowSyntaxErrors(e.target.checked)}
                        style={{ opacity: 0, width: 0, height: 0 }}
                      />
                      <span style={{
                        position: 'absolute',
                        cursor: 'pointer',
                        top: 0, left: 0, right: 0, bottom: 0,
                        backgroundColor: showSyntaxErrors ? '#3b82f6' : '#cbd5e1',
                        transition: '0.3s',
                        borderRadius: '26px'
                      }}>
                        <span style={{
                          position: 'absolute',
                          height: '20px',
                          width: '20px',
                          left: showSyntaxErrors ? '25px' : '3px',
                          bottom: '3px',
                          backgroundColor: 'white',
                          transition: '0.3s',
                          borderRadius: '50%'
                        }}></span>
                      </span>
                    </label>
                  </div>

                  {/* Show Test Case Results */}
                  <div style={{ boxSizing: 'border-box', 
                    display: 'flex', 
                    justifyContent: 'space-between', 
                    alignItems: 'center',
                    padding: '16px',
                    backgroundColor: '#f8fafc',
                    borderRadius: '8px',
                    border: '1px solid #e2e8f0'
                  }}>
                    <div>
                      <div style={{ fontWeight: 500, marginBottom: '4px' }}>Show Test Case Results</div>
                      <div style={{ fontSize: '13px', color: '#64748b' }}>Students see which test cases passed or failed</div>
                    </div>
                    <label style={{ position: 'relative', display: 'inline-block', width: '48px', height: '26px' }}>
                      <input
                        type="checkbox"
                        checked={showTestCaseResults}
                        onChange={(e) => setShowTestCaseResults(e.target.checked)}
                        style={{ opacity: 0, width: 0, height: 0 }}
                      />
                      <span style={{
                        position: 'absolute',
                        cursor: 'pointer',
                        top: 0, left: 0, right: 0, bottom: 0,
                        backgroundColor: showTestCaseResults ? '#3b82f6' : '#cbd5e1',
                        transition: '0.3s',
                        borderRadius: '26px'
                      }}>
                        <span style={{
                          position: 'absolute',
                          height: '20px',
                          width: '20px',
                          left: showTestCaseResults ? '25px' : '3px',
                          bottom: '3px',
                          backgroundColor: 'white',
                          transition: '0.3s',
                          borderRadius: '50%'
                        }}></span>
                      </span>
                    </label>
                  </div>

                  {/* Show Expected Output */}
                  <div style={{ boxSizing: 'border-box', 
                    display: 'flex', 
                    justifyContent: 'space-between', 
                    alignItems: 'center',
                    padding: '16px',
                    backgroundColor: '#f8fafc',
                    borderRadius: '8px',
                    border: '1px solid #e2e8f0'
                  }}>
                    <div>
                      <div style={{ fontWeight: 500, marginBottom: '4px' }}>Show Expected Output</div>
                      <div style={{ fontSize: '13px', color: '#64748b' }}>Students see what the expected output should be</div>
                    </div>
                    <label style={{ position: 'relative', display: 'inline-block', width: '48px', height: '26px' }}>
                      <input
                        type="checkbox"
                        checked={showExpectedOutput}
                        onChange={(e) => setShowExpectedOutput(e.target.checked)}
                        style={{ opacity: 0, width: 0, height: 0 }}
                      />
                      <span style={{
                        position: 'absolute',
                        cursor: 'pointer',
                        top: 0, left: 0, right: 0, bottom: 0,
                        backgroundColor: showExpectedOutput ? '#3b82f6' : '#cbd5e1',
                        transition: '0.3s',
                        borderRadius: '26px'
                      }}>
                        <span style={{
                          position: 'absolute',
                          height: '20px',
                          width: '20px',
                          left: showExpectedOutput ? '25px' : '3px',
                          bottom: '3px',
                          backgroundColor: 'white',
                          transition: '0.3s',
                          borderRadius: '50%'
                        }}></span>
                      </span>
                    </label>
                  </div>

                  {/* Enable Plagiarism Check */}
                  <div style={{ boxSizing: 'border-box', 
                    display: 'flex', 
                    justifyContent: 'space-between', 
                    alignItems: 'center',
                    padding: '16px',
                    backgroundColor: enablePlagiarismCheck ? '#fef3c7' : '#f8fafc',
                    borderRadius: '8px',
                    border: enablePlagiarismCheck ? '1px solid #f59e0b' : '1px solid #e2e8f0'
                  }}>
                    <div>
                      <div style={{ fontWeight: 500, marginBottom: '4px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                        <span>🔍</span> Enable Plagiarism Check
                      </div>
                      <div style={{ fontSize: '13px', color: '#64748b' }}>Check code similarity between student submissions</div>
                    </div>
                    <label style={{ position: 'relative', display: 'inline-block', width: '48px', height: '26px' }}>
                      <input
                        type="checkbox"
                        checked={enablePlagiarismCheck}
                        onChange={(e) => setEnablePlagiarismCheck(e.target.checked)}
                        style={{ opacity: 0, width: 0, height: 0 }}
                      />
                      <span style={{
                        position: 'absolute',
                        cursor: 'pointer',
                        top: 0, left: 0, right: 0, bottom: 0,
                        backgroundColor: enablePlagiarismCheck ? '#f59e0b' : '#cbd5e1',
                        transition: '0.3s',
                        borderRadius: '26px'
                      }}>
                        <span style={{
                          position: 'absolute',
                          height: '20px',
                          width: '20px',
                          left: enablePlagiarismCheck ? '25px' : '3px',
                          bottom: '3px',
                          backgroundColor: 'white',
                          transition: '0.3s',
                          borderRadius: '50%'
                        }}></span>
                      </span>
                    </label>
                  </div>
                </div>
              </>
            )}

            {type === AssignmentType.MCQ && (
              <>
                <hr style={{ margin: '24px 0', border: 'none', borderTop: '1px solid #e5e7eb' }} />
                <h4 style={{ marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <span style={{ fontSize: '20px' }}>📝</span> Quiz Settings
                </h4>
                
                <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                  {/* Shuffle Questions */}
                  <div style={{ boxSizing: 'border-box', 
                    display: 'flex', 
                    justifyContent: 'space-between', 
                    alignItems: 'center',
                    padding: '16px',
                    backgroundColor: '#f8fafc',
                    borderRadius: '8px',
                    border: '1px solid #e2e8f0'
                  }}>
                    <div>
                      <div style={{ fontWeight: 500, marginBottom: '4px' }}>Shuffle Questions</div>
                      <div style={{ fontSize: '13px', color: '#64748b' }}>Randomize the order of questions for each student</div>
                    </div>
                    <label style={{ position: 'relative', display: 'inline-block', width: '48px', height: '26px' }}>
                      <input
                        type="checkbox"
                        checked={shuffleQuestions}
                        onChange={(e) => setShuffleQuestions(e.target.checked)}
                        style={{ opacity: 0, width: 0, height: 0 }}
                      />
                      <span style={{
                        position: 'absolute',
                        cursor: 'pointer',
                        top: 0, left: 0, right: 0, bottom: 0,
                        backgroundColor: shuffleQuestions ? '#3b82f6' : '#cbd5e1',
                        transition: '0.3s',
                        borderRadius: '26px'
                      }}>
                        <span style={{
                          position: 'absolute',
                          height: '20px',
                          width: '20px',
                          left: shuffleQuestions ? '25px' : '3px',
                          bottom: '3px',
                          backgroundColor: 'white',
                          transition: '0.3s',
                          borderRadius: '50%'
                        }}></span>
                      </span>
                    </label>
                  </div>

                  {/* Shuffle Options */}
                  <div style={{ boxSizing: 'border-box', 
                    display: 'flex', 
                    justifyContent: 'space-between', 
                    alignItems: 'center',
                    padding: '16px',
                    backgroundColor: '#f8fafc',
                    borderRadius: '8px',
                    border: '1px solid #e2e8f0'
                  }}>
                    <div>
                      <div style={{ fontWeight: 500, marginBottom: '4px' }}>Shuffle Answer Options</div>
                      <div style={{ fontSize: '13px', color: '#64748b' }}>Randomize the order of answer choices</div>
                    </div>
                    <label style={{ position: 'relative', display: 'inline-block', width: '48px', height: '26px' }}>
                      <input
                        type="checkbox"
                        checked={shuffleOptions}
                        onChange={(e) => setShuffleOptions(e.target.checked)}
                        style={{ opacity: 0, width: 0, height: 0 }}
                      />
                      <span style={{
                        position: 'absolute',
                        cursor: 'pointer',
                        top: 0, left: 0, right: 0, bottom: 0,
                        backgroundColor: shuffleOptions ? '#3b82f6' : '#cbd5e1',
                        transition: '0.3s',
                        borderRadius: '26px'
                      }}>
                        <span style={{
                          position: 'absolute',
                          height: '20px',
                          width: '20px',
                          left: shuffleOptions ? '25px' : '3px',
                          bottom: '3px',
                          backgroundColor: 'white',
                          transition: '0.3s',
                          borderRadius: '50%'
                        }}></span>
                      </span>
                    </label>
                  </div>

                  {/* Show Correct Answers */}
                  <div style={{ boxSizing: 'border-box', 
                    display: 'flex', 
                    justifyContent: 'space-between', 
                    alignItems: 'center',
                    padding: '16px',
                    backgroundColor: '#f8fafc',
                    borderRadius: '8px',
                    border: '1px solid #e2e8f0'
                  }}>
                    <div>
                      <div style={{ fontWeight: 500, marginBottom: '4px' }}>Show Correct Answers</div>
                      <div style={{ fontSize: '13px', color: '#64748b' }}>Display correct answers after submission</div>
                    </div>
                    <label style={{ position: 'relative', display: 'inline-block', width: '48px', height: '26px' }}>
                      <input
                        type="checkbox"
                        checked={showCorrectAnswers}
                        onChange={(e) => setShowCorrectAnswers(e.target.checked)}
                        style={{ opacity: 0, width: 0, height: 0 }}
                      />
                      <span style={{
                        position: 'absolute',
                        cursor: 'pointer',
                        top: 0, left: 0, right: 0, bottom: 0,
                        backgroundColor: showCorrectAnswers ? '#3b82f6' : '#cbd5e1',
                        transition: '0.3s',
                        borderRadius: '26px'
                      }}>
                        <span style={{
                          position: 'absolute',
                          height: '20px',
                          width: '20px',
                          left: showCorrectAnswers ? '25px' : '3px',
                          bottom: '3px',
                          backgroundColor: 'white',
                          transition: '0.3s',
                          borderRadius: '50%'
                        }}></span>
                      </span>
                    </label>
                  </div>
                </div>
              </>
            )}

            {/* Publish Option (only for new assignments) */}
            {!isEdit && (
              <>
                <hr style={{ margin: '24px 0', border: 'none', borderTop: '1px solid #e5e7eb' }} />
                <h4 style={{ marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <span style={{ fontSize: '20px' }}>📢</span> Publishing
                </h4>
                
                <div style={{ 
                  display: 'flex', 
                  justifyContent: 'space-between', 
                  alignItems: 'center',
                  padding: '16px',
                  backgroundColor: publishImmediately ? '#dcfce7' : '#f8fafc',
                  borderRadius: '8px',
                  border: publishImmediately ? '2px solid #22c55e' : '1px solid #e2e8f0',
                  boxSizing: 'border-box'
                }}>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontWeight: 500, marginBottom: '4px' }}>Publish Immediately</div>
                    <div style={{ fontSize: '13px', color: '#64748b' }}>
                      {publishImmediately 
                        ? 'Assignment will be visible to students right away' 
                        : 'Assignment will be saved as draft (students won\'t see it)'}
                    </div>
                  </div>
                  <label style={{ position: 'relative', display: 'inline-block', width: '48px', height: '26px', flexShrink: 0 }}>
                    <input
                      type="checkbox"
                      checked={publishImmediately}
                      onChange={(e) => setPublishImmediately(e.target.checked)}
                      style={{ opacity: 0, width: 0, height: 0 }}
                    />
                    <span style={{
                      position: 'absolute',
                      cursor: 'pointer',
                      top: 0, left: 0, right: 0, bottom: 0,
                      backgroundColor: publishImmediately ? '#22c55e' : '#cbd5e1',
                      transition: '0.3s',
                      borderRadius: '26px'
                    }}>
                      <span style={{
                        position: 'absolute',
                        height: '20px',
                        width: '20px',
                        left: publishImmediately ? '25px' : '3px',
                        bottom: '3px',
                        backgroundColor: 'white',
                        transition: '0.3s',
                        borderRadius: '50%'
                      }}></span>
                    </span>
                  </label>
                </div>
              </>
            )}
          </div>
        )}
      </form>
    </div>
  );
};

export default AdminAssignmentForm;

