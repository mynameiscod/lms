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
import { courseApi, subjectApi, chapterApi, quizApi } from '../../api';
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

  // Course Structure Linking
  const [courses, setCourses] = useState<any[]>([]);
  const [subjects, setSubjects] = useState<any[]>([]);
  const [chapters, setChapters] = useState<any[]>([]);
  const [selectedCourse, setSelectedCourse] = useState<string>('');
  const [selectedSubject, setSelectedSubject] = useState<string>('');
  const [selectedChapter, setSelectedChapter] = useState<string>('');

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

  // AI generation for MCQ
  const [aiMcq, setAiMcq] = useState({ topic: '', difficulty: 'medium', count: 5 });
  const [aiMcqLoading, setAiMcqLoading] = useState(false);
  const [aiMcqError, setAiMcqError] = useState('');
  const [shuffleQuestions, setShuffleQuestions] = useState(true);
  const [shuffleOptions, setShuffleOptions] = useState(true);
  const [showCorrectAnswers, setShowCorrectAnswers] = useState(false);

  // AI generation for Coding assignments
  const [creationMode, setCreationMode] = useState<'manual' | 'ai'>('manual');
  const [aiCoding, setAiCoding] = useState({ concept: '', testCaseCount: 5 });
  const [aiCodingLoading, setAiCodingLoading] = useState(false);
  const [aiCodingError, setAiCodingError] = useState('');

  // Rubric
  const [rubric, setRubric] = useState<RubricItem[]>([]);

  // Settings
  const [startDate, setStartDate] = useState('');
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
  const [enableCamera, setEnableCamera] = useState(false);
  const [enableMicrophone, setEnableMicrophone] = useState(false);

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
    keyboard: {
      bindings: {
        // Shift+Enter exits code-block and inserts a normal paragraph
        exitCodeBlock: {
          key: 13, // Enter
          shiftKey: true,
          handler: function(this: any) {
            const quill = this.quill;
            const range = quill.getSelection();
            if (!range) return true;
            const [line] = quill.getLine(range.index);
            const format = quill.getFormat(range.index);
            if (format['code-block']) {
              const lineEnd = quill.getIndex(line) + line.length();
              quill.insertText(lineEnd, '\n', { 'code-block': false });
              quill.setSelection(lineEnd + 1, 0);
              quill.removeFormat(lineEnd + 1, 1);
              return false;
            }
            return true;
          }
        }
      }
    }
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

  // Load courses on mount
  useEffect(() => {
    const loadCourses = async () => {
      try {
        const response = await courseApi.getCourses();
        setCourses(response.data || []);
      } catch (err) {
        console.error('Failed to load courses:', err);
      }
    };
    loadCourses();
  }, []);

  // Load subjects when course changes
  useEffect(() => {
    if (selectedCourse) {
      const loadSubjects = async () => {
        try {
          const response = await subjectApi.getSubjectsByCourse(selectedCourse);
          console.log('Subjects response:', response);
          // API returns { success, data, message } - data is the array
          const subjectList = response.data || response || [];
          setSubjects(Array.isArray(subjectList) ? subjectList : []);
          setChapters([]);
          // Only reset subject if it doesn't belong to this course
          const subjectExists = subjectList.some((s: any) => s._id === selectedSubject);
          if (!subjectExists) {
            setSelectedSubject('');
            setSelectedChapter('');
          }
        } catch (err) {
          console.error('Failed to load subjects:', err);
          setSubjects([]);
        }
      };
      loadSubjects();
    } else {
      setSubjects([]);
      setChapters([]);
      setSelectedSubject('');
      setSelectedChapter('');
    }
  }, [selectedCourse]);

  // Load chapters when subject changes
  useEffect(() => {
    if (selectedSubject) {
      const loadChapters = async () => {
        try {
          const response = await chapterApi.getChaptersBySubject(selectedSubject);
          console.log('Chapters response:', response);
          // API returns { success, data, message } - data is the array
          const chapterList = response.data || response || [];
          setChapters(Array.isArray(chapterList) ? chapterList : []);
          // Only reset chapter if it doesn't belong to this subject
          const chapterExists = chapterList.some((c: any) => c._id === selectedChapter);
          if (!chapterExists) {
            setSelectedChapter('');
          }
        } catch (err) {
          console.error('Failed to load chapters:', err);
          setChapters([]);
        }
      };
      loadChapters();
    } else {
      setChapters([]);
      setSelectedChapter('');
    }
  }, [selectedSubject]);

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

      // Course structure linking
      if (a.course) {
        const courseId = typeof a.course === 'object' ? a.course._id : a.course;
        setSelectedCourse(courseId);
      }
      if (a.subject) {
        const subjectId = typeof a.subject === 'object' ? a.subject._id : a.subject;
        setSelectedSubject(subjectId);
      }
      if (a.chapter) {
        const chapterId = typeof a.chapter === 'object' ? a.chapter._id : a.chapter;
        setSelectedChapter(chapterId);
      }

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
      if (a.startDate) {
        setStartDate(new Date(a.startDate).toISOString().slice(0, 16));
      }
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
      setEnableCamera(a.enableCamera ?? false);
      setEnableMicrophone(a.enableMicrophone ?? false);
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
        // Course structure linking
        course: selectedCourse || undefined,
        subject: selectedSubject || undefined,
        chapter: selectedChapter || undefined,
        allowedLanguages,
        starterCode,
        testCases,
        timeLimit,
        memoryLimit,
        mcqQuestions,
        rubric,
        startDate: startDate ? new Date(startDate).toISOString() : undefined,
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
        enablePlagiarismCheck,
        enableCamera,
        enableMicrophone
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
    setStarterCode(prev => {
      const exists = prev.find(s => s.language === lang);
      if (exists) {
        return prev.map(s => s.language === lang ? { ...s, code } : s);
      }
      return [...prev, { language: lang, code }];
    });
  };

  const removeStarterCode = (lang: ProgrammingLanguage) => {
    setStarterCode(starterCode.filter(s => s.language !== lang));
  };

  // AI helper for MCQ
  const generateAIMCQQuestions = async () => {
    if (!aiMcq.topic.trim()) return;
    try {
      setAiMcqLoading(true);
      setAiMcqError('');
      const res = await quizApi.generateAIQuestions({
        topic: aiMcq.topic,
        type: 'mcq_single',
        difficulty: aiMcq.difficulty,
        count: aiMcq.count
      });
      const generated: any[] = res.questions || res.data?.questions || [];
      const mapped: MCQQuestion[] = generated.map((q: any) => ({
        question: q.question || '',
        points: q.marks || 10,
        explanation: q.explanation || '',
        options: (q.options || []).map((o: any) => ({
          text: typeof o === 'string' ? o : o.text || '',
          isCorrect: typeof o === 'object' ? Boolean(o.isCorrect) : false
        }))
      }));
      setMcqQuestions(prev => [...prev, ...mapped]);
    } catch (err: any) {
      setAiMcqError(err.message || 'AI generation failed');
    } finally {
      setAiMcqLoading(false);
    }
  };

  // AI helper for Coding assignments
  const generateAICodingAssignment = async () => {
    if (!title.trim() || !aiCoding.concept.trim()) return;
    const primaryLang = allowedLanguages[0];
    if (!primaryLang) {
      setAiCodingError('Please select at least one programming language first.');
      return;
    }
    try {
      setAiCodingLoading(true);
      setAiCodingError('');
      const res = await assignmentApi.generateWithAI({
        title: title.trim(),
        concept: aiCoding.concept.trim(),
        language: primaryLang,
        difficulty,
        testCaseCount: aiCoding.testCaseCount
      });
      const data = res.data.data;
      if (data) {
        if (data.description) setDescription(data.description);
        if (data.instructions) setInstructions(data.instructions);
        if (data.starterCode) {
          setStarterCode([{ language: primaryLang, code: data.starterCode }]);
        }
        if (data.testCases && Array.isArray(data.testCases)) {
          setTestCases(data.testCases.map((tc: any) => ({
            input: tc.input || '',
            expectedOutput: tc.expectedOutput || '',
            description: tc.description || '',
            isHidden: Boolean(tc.isHidden),
            points: tc.points || 10
          })));
        }
        if (data.topics && Array.isArray(data.topics)) {
          setTopics(prev => [...new Set([...prev, ...data.topics])]);
        }
        // Switch to coding tab to show results
        setActiveTab('coding');
      }
    } catch (err: any) {
      setAiCodingError(err.response?.data?.message || err.message || 'AI generation failed');
    } finally {
      setAiCodingLoading(false);
    }
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
        {(type === AssignmentType.CODING || type === AssignmentType.SQL || type === AssignmentType.WEB) && (
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

            {/* Creation Mode Toggle */}
            {(type === AssignmentType.CODING || type === AssignmentType.SQL || type === AssignmentType.WEB) && !isEdit && (
              <div style={{ 
                display: 'flex', 
                gap: '0', 
                marginBottom: '24px',
                background: '#f1f5f9',
                borderRadius: '12px',
                padding: '4px',
                width: 'fit-content'
              }}>
                <button
                  type="button"
                  onClick={() => setCreationMode('manual')}
                  style={{
                    padding: '10px 24px',
                    borderRadius: '10px',
                    border: 'none',
                    cursor: 'pointer',
                    fontWeight: 600,
                    fontSize: '14px',
                    transition: 'all 0.2s',
                    background: creationMode === 'manual' ? '#fff' : 'transparent',
                    color: creationMode === 'manual' ? '#1e293b' : '#64748b',
                    boxShadow: creationMode === 'manual' ? '0 1px 3px rgba(0,0,0,0.1)' : 'none'
                  }}
                >
                  ✏️ Manual
                </button>
                <button
                  type="button"
                  onClick={() => setCreationMode('ai')}
                  style={{
                    padding: '10px 24px',
                    borderRadius: '10px',
                    border: 'none',
                    cursor: 'pointer',
                    fontWeight: 600,
                    fontSize: '14px',
                    transition: 'all 0.2s',
                    background: creationMode === 'ai' ? 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)' : 'transparent',
                    color: creationMode === 'ai' ? '#fff' : '#64748b',
                    boxShadow: creationMode === 'ai' ? '0 2px 8px rgba(102,126,234,0.4)' : 'none'
                  }}
                >
                  ✨ AI Generate
                </button>
              </div>
            )}

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
                  <option value="web">🌐 Web (HTML/CSS/Bootstrap)</option>
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

            {/* AI Generation Panel for Coding */}
            {creationMode === 'ai' && (type === AssignmentType.CODING || type === AssignmentType.SQL || type === AssignmentType.WEB) && !isEdit && (
              <div style={{ 
                marginBottom: '24px', 
                padding: '24px', 
                background: 'linear-gradient(135deg, #f0f4ff 0%, #faf0ff 100%)', 
                borderRadius: '16px', 
                border: '2px solid #c7d2fe'
              }}>
                <h4 style={{ margin: '0 0 4px', color: '#4338ca', fontSize: '1.1rem', display: 'flex', alignItems: 'center', gap: '8px' }}>
                  ✨ AI Assignment Generator
                </h4>
                <p style={{ margin: '0 0 16px', fontSize: '13px', color: '#6366f1' }}>
                  Fill in the title, select language & difficulty above, then describe the concept below. AI will generate description, instructions, starter code, and test cases.
                </p>
                {aiCodingError && <p style={{ color: '#ef4444', fontSize: '0.88rem', marginBottom: '8px', padding: '8px 12px', background: '#fef2f2', borderRadius: '8px' }}>{aiCodingError}</p>}
                
                <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap', alignItems: 'flex-end' }}>
                  <div className="form-group" style={{ flex: 3, minWidth: '220px', marginBottom: 0 }}>
                    <label className="form-label">Concept / Problem Description <span className="text-danger">*</span></label>
                    <textarea
                      className="form-control"
                      placeholder="e.g., Write a program that reads N integers and prints them in sorted order. Include edge cases for empty input and single element."
                      value={aiCoding.concept}
                      onChange={e => setAiCoding({ ...aiCoding, concept: e.target.value })}
                      rows={3}
                      style={{ resize: 'vertical' }}
                    />
                  </div>
                  <div className="form-group" style={{ width: '120px', marginBottom: 0 }}>
                    <label className="form-label">Test Cases</label>
                    <input
                      type="number"
                      className="form-control"
                      min={2}
                      max={15}
                      value={aiCoding.testCaseCount}
                      onChange={e => setAiCoding({ ...aiCoding, testCaseCount: Math.min(15, Math.max(2, Number(e.target.value))) })}
                    />
                  </div>
                  <button
                    type="button"
                    className="btn btn-primary"
                    onClick={generateAICodingAssignment}
                    disabled={aiCodingLoading || !title.trim() || !aiCoding.concept.trim() || allowedLanguages.length === 0}
                    style={{ 
                      marginBottom: 0, 
                      background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                      border: 'none',
                      padding: '10px 28px',
                      fontWeight: 600,
                      opacity: (aiCodingLoading || !title.trim() || !aiCoding.concept.trim() || allowedLanguages.length === 0) ? 0.6 : 1
                    }}
                  >
                    {aiCodingLoading ? '⏳ Generating...' : '✨ Generate Assignment'}
                  </button>
                </div>
                {!title.trim() && (
                  <p style={{ margin: '8px 0 0', fontSize: '12px', color: '#f59e0b' }}>⚠️ Please enter a title first</p>
                )}
                {allowedLanguages.length === 0 && (
                  <p style={{ margin: '4px 0 0', fontSize: '12px', color: '#f59e0b' }}>⚠️ Select at least one language in Coding Settings tab</p>
                )}
              </div>
            )}

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

            {/* Course Structure Linking */}
            <div className="form-section" style={{ marginTop: '24px', marginBottom: '16px' }}>
              <h4 className="section-title" style={{ padding: '12px 16px', margin: 0, borderBottom: '1px solid #e5e7eb', background: '#f9fafb' }}>Link to Course Structure (Optional)</h4>
              <p className="section-description" style={{ padding: '8px 16px 0', margin: 0, fontSize: '13px' }}>Associate this assignment with a specific course, subject, or chapter</p>
              
              <div className="form-row" style={{ padding: '12px 16px' }}>
                <div className="form-group">
                  <label className="form-label">Course</label>
                  <select
                    className="form-control"
                    value={selectedCourse}
                    onChange={(e) => setSelectedCourse(e.target.value)}
                  >
                    <option value="">-- Select Course --</option>
                    {courses.map((course) => (
                      <option key={course._id} value={course._id}>
                        {course.title}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="form-group">
                  <label className="form-label">Subject</label>
                  <select
                    className="form-control"
                    value={selectedSubject}
                    onChange={(e) => setSelectedSubject(e.target.value)}
                    disabled={!selectedCourse || subjects.length === 0}
                  >
                    <option value="">-- Select Subject --</option>
                    {subjects.map((subject) => (
                      <option key={subject._id} value={subject._id}>
                        {subject.name}
                      </option>
                    ))}
                  </select>
                  {selectedCourse && subjects.length === 0 && (
                    <small className="form-hint">No subjects found for this course</small>
                  )}
                </div>

                <div className="form-group">
                  <label className="form-label">Chapter</label>
                  <select
                    className="form-control"
                    value={selectedChapter}
                    onChange={(e) => setSelectedChapter(e.target.value)}
                    disabled={!selectedSubject || chapters.length === 0}
                  >
                    <option value="">-- Select Chapter --</option>
                    {chapters.map((chapter) => (
                      <option key={chapter._id} value={chapter._id}>
                        {chapter.title}
                      </option>
                    ))}
                  </select>
                  {selectedSubject && chapters.length === 0 && (
                    <small className="form-hint">No chapters found for this subject</small>
                  )}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Coding Settings Tab */}
        {activeTab === 'coding' && (type === AssignmentType.CODING || type === AssignmentType.SQL || type === AssignmentType.WEB) && (
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
                      onChange={(e) => updateStarterCode(lang, e.target.value)}
                      placeholder={`// Starter code for ${lang}...`}
                      rows={6}
                      style={{ fontFamily: 'monospace', whiteSpace: 'pre', tabSize: 4 }}
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

            {/* AI Generate MCQ */}
            <div className="ai-generate-section" style={{ marginTop: '24px', padding: '20px', background: '#f0f7ff', borderRadius: '12px', border: '1.5px solid #bfdbfe' }}>
              <h4 style={{ margin: '0 0 12px', color: '#005897', fontSize: '1rem' }}>✨ AI Generate Questions</h4>
              {aiMcqError && <p style={{ color: '#ef4444', fontSize: '0.88rem', marginBottom: '8px' }}>{aiMcqError}</p>}
              <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap', alignItems: 'flex-end' }}>
                <div className="form-group" style={{ flex: 2, minWidth: '180px', marginBottom: 0 }}>
                  <label className="form-label">Topic / Subject</label>
                  <input
                    type="text"
                    className="form-control"
                    placeholder="e.g. Java Loops, React Hooks..."
                    value={aiMcq.topic}
                    onChange={e => setAiMcq({ ...aiMcq, topic: e.target.value })}
                  />
                </div>
                <div className="form-group" style={{ minWidth: '140px', marginBottom: 0 }}>
                  <label className="form-label">Difficulty</label>
                  <select
                    className="form-control"
                    value={aiMcq.difficulty}
                    onChange={e => setAiMcq({ ...aiMcq, difficulty: e.target.value })}
                  >
                    <option value="easy">Easy</option>
                    <option value="medium">Medium</option>
                    <option value="hard">Hard</option>
                  </select>
                </div>
                <div className="form-group" style={{ width: '80px', marginBottom: 0 }}>
                  <label className="form-label">Count</label>
                  <input
                    type="number"
                    className="form-control"
                    min={1}
                    max={20}
                    value={aiMcq.count}
                    onChange={e => setAiMcq({ ...aiMcq, count: Math.min(20, Math.max(1, Number(e.target.value))) })}
                  />
                </div>
                <button
                  type="button"
                  className="btn btn-primary"
                  onClick={generateAIMCQQuestions}
                  disabled={aiMcqLoading || !aiMcq.topic.trim()}
                  style={{ marginBottom: 0 }}
                >
                  {aiMcqLoading ? 'Generating...' : '✨ Generate'}
                </button>
              </div>
            </div>
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
            <p className="section-description">Configure schedule and submission rules</p>

            <div className="form-row">
              <div className="form-group">
                <label className="form-label">Start Date</label>
                <input
                  type="datetime-local"
                  className="form-control"
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                />
                <small className="form-hint">Leave empty to be available immediately</small>
              </div>
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
            </div>

            <div className="form-row">
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

            {(type === AssignmentType.CODING || type === AssignmentType.SQL || type === AssignmentType.WEB) && (
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

                  {/* Enable Camera */}
                  <div style={{ boxSizing: 'border-box', 
                    display: 'flex', 
                    justifyContent: 'space-between', 
                    alignItems: 'center',
                    padding: '16px',
                    backgroundColor: enableCamera ? '#dcfce7' : '#f8fafc',
                    borderRadius: '8px',
                    border: enableCamera ? '1px solid #22c55e' : '1px solid #e2e8f0'
                  }}>
                    <div>
                      <div style={{ fontWeight: 500, marginBottom: '4px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                        <span>📷</span> Enable Camera
                      </div>
                      <div style={{ fontSize: '13px', color: '#64748b' }}>Require webcam access during assignment</div>
                    </div>
                    <label style={{ position: 'relative', display: 'inline-block', width: '48px', height: '26px' }}>
                      <input
                        type="checkbox"
                        checked={enableCamera}
                        onChange={(e) => setEnableCamera(e.target.checked)}
                        style={{ opacity: 0, width: 0, height: 0 }}
                      />
                      <span style={{
                        position: 'absolute',
                        cursor: 'pointer',
                        top: 0, left: 0, right: 0, bottom: 0,
                        backgroundColor: enableCamera ? '#22c55e' : '#cbd5e1',
                        transition: '0.3s',
                        borderRadius: '26px'
                      }}>
                        <span style={{
                          position: 'absolute',
                          height: '20px',
                          width: '20px',
                          left: enableCamera ? '25px' : '3px',
                          bottom: '3px',
                          backgroundColor: 'white',
                          transition: '0.3s',
                          borderRadius: '50%'
                        }}></span>
                      </span>
                    </label>
                  </div>

                  {/* Enable Microphone */}
                  <div style={{ boxSizing: 'border-box', 
                    display: 'flex', 
                    justifyContent: 'space-between', 
                    alignItems: 'center',
                    padding: '16px',
                    backgroundColor: enableMicrophone ? '#dbeafe' : '#f8fafc',
                    borderRadius: '8px',
                    border: enableMicrophone ? '1px solid #3b82f6' : '1px solid #e2e8f0'
                  }}>
                    <div>
                      <div style={{ fontWeight: 500, marginBottom: '4px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                        <span>🎤</span> Enable Microphone
                      </div>
                      <div style={{ fontSize: '13px', color: '#64748b' }}>Require microphone access during assignment</div>
                    </div>
                    <label style={{ position: 'relative', display: 'inline-block', width: '48px', height: '26px' }}>
                      <input
                        type="checkbox"
                        checked={enableMicrophone}
                        onChange={(e) => setEnableMicrophone(e.target.checked)}
                        style={{ opacity: 0, width: 0, height: 0 }}
                      />
                      <span style={{
                        position: 'absolute',
                        cursor: 'pointer',
                        top: 0, left: 0, right: 0, bottom: 0,
                        backgroundColor: enableMicrophone ? '#3b82f6' : '#cbd5e1',
                        transition: '0.3s',
                        borderRadius: '26px'
                      }}>
                        <span style={{
                          position: 'absolute',
                          height: '20px',
                          width: '20px',
                          left: enableMicrophone ? '25px' : '3px',
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

