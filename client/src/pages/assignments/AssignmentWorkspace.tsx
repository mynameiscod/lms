import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import Editor from '@monaco-editor/react';
import {
  assignmentApi,
  submissionApi,
  Assignment,
  Submission,
  SubmissionStatus,
  AssignmentType,
  ProgrammingLanguage,
  TestResult
} from '../../api/assignmentApi';
import ShareOnLinkedIn from '../../components/common/ShareOnLinkedIn';
import './assignments.css';

const AssignmentWorkspace: React.FC = () => {
  const navigate = useNavigate();
  const { assignmentId } = useParams<{ assignmentId: string }>();
  const editorRef = useRef<any>(null);
  
  const [assignment, setAssignment] = useState<Assignment | null>(null);
  const [submission, setSubmission] = useState<Submission | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  // Workspace state
  const [selectedLanguage, setSelectedLanguage] = useState<ProgrammingLanguage>(ProgrammingLanguage.JAVASCRIPT);
  const [code, setCode] = useState('');
  // Stores code per language so switching tabs preserves what student typed
  const [codePerLanguage, setCodePerLanguage] = useState<Record<string, string>>({});
  const [theoryAnswer, setTheoryAnswer] = useState('');
  const [mcqAnswers, setMcqAnswers] = useState<Record<number, number>>({});
  
  // Execution state
  const [running, setRunning] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [testResults, setTestResults] = useState<TestResult[]>([]);
  const [output, setOutput] = useState('');
  // Raw program output (stdout) shown in a console panel for all languages
  const [consoleOutput, setConsoleOutput] = useState<string | null>(null);
  const [runtimeError, setRuntimeError] = useState<string | null>(null);
  // Live HTML preview for `web` assignments
  const [webPreview, setWebPreview] = useState<string | null>(null);
  
  // UI state
  const [activeTab, setActiveTab] = useState<'instructions' | 'output'>('instructions');
  const [saving, setSaving] = useState(false);
  const [lastSaved, setLastSaved] = useState<Date | null>(null);
  const [showInstructionsPage, setShowInstructionsPage] = useState(true);
  const [starting, setStarting] = useState(false);

  // Timer for timed assignments
  const [timeRemaining, setTimeRemaining] = useState<number | null>(null);

  // Initialize workspace state from a submission object
  const initWorkspaceFromSubmission = useCallback((sub: Submission, asgn: Assignment) => {
    setSubmission(sub);
    // Default to assignment's first allowed language
    const defaultLang = asgn.allowedLanguages?.[0] || ProgrammingLanguage.JAVASCRIPT;
    if (sub.code) {
      setCode(sub.code);
      setSelectedLanguage(sub.language || defaultLang);
    } else if (asgn.starterCode.length > 0) {
      const starter = asgn.starterCode.find(s => s.language === defaultLang);
      setCode(starter?.code || '');
      setSelectedLanguage(defaultLang);
    } else {
      setSelectedLanguage(defaultLang);
    }
    if (sub.theoryAnswer) setTheoryAnswer(sub.theoryAnswer);
    if (sub.mcqAnswers) {
      const answers: Record<number, number> = {};
      sub.mcqAnswers.forEach(a => { answers[a.questionIndex] = a.selectedOption; });
      setMcqAnswers(answers);
    }
    if (sub.testResults) setTestResults(sub.testResults);
    if (asgn.settings?.timeLimitMinutes && sub.startedAt) {
      const started = new Date(sub.startedAt).getTime();
      const limit = asgn.settings.timeLimitMinutes * 60 * 1000;
      const remaining = Math.max(0, limit - (Date.now() - started));
      setTimeRemaining(remaining);
    }
  }, []);

  // Load assignment details + check for an existing in-progress submission (for resume)
  const loadAssignment = useCallback(async () => {
    if (!assignmentId) return;
    try {
      setLoading(true);
      const assignmentRes = await assignmentApi.getById(assignmentId);
      const asgn = assignmentRes.data.data;
      setAssignment(asgn);

      // Check if student already has an in-progress or submitted submission
      try {
        const existingRes = await submissionApi.getMySubmission(assignmentId);
        const existing = existingRes.data.data;
        if (existing && (existing.status === SubmissionStatus.IN_PROGRESS || existing.status === SubmissionStatus.SUBMITTED || existing.status === SubmissionStatus.GRADED)) {
          initWorkspaceFromSubmission(existing, asgn);
          setShowInstructionsPage(false); // Resume directly — no need to show instructions again
        }
      } catch {
        // No existing submission → show instructions page (expected for new attempt)
      }
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to load assignment');
    } finally {
      setLoading(false);
    }
  }, [assignmentId, initWorkspaceFromSubmission]);

  // Called when student clicks "Start Assignment"
  const handleStartAssignment = async () => {
    if (!assignment || !assignmentId) return;
    try {
      setStarting(true);
      const submissionRes = await submissionApi.startSubmission(assignmentId);
      const sub = submissionRes.data.data;
      initWorkspaceFromSubmission(sub, assignment);
      setShowInstructionsPage(false);
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to start assignment');
    } finally {
      setStarting(false);
    }
  };

  useEffect(() => {
    loadAssignment();
  }, [loadAssignment]);

  // Timer countdown
  useEffect(() => {
    if (timeRemaining === null || timeRemaining <= 0) return;
    
    const interval = setInterval(() => {
      setTimeRemaining(prev => {
        if (prev === null || prev <= 0) {
          clearInterval(interval);
          return 0;
        }
        return prev - 1000;
      });
    }, 1000);
    
    return () => clearInterval(interval);
  }, [timeRemaining]);

  // Auto-save for coding assignments
  useEffect(() => {
    if (!submission || (assignment?.type !== AssignmentType.CODING && assignment?.type !== AssignmentType.WEB)) return;
    
    const saveInterval = setInterval(() => {
      handleSave(true);
    }, 30000); // Auto-save every 30 seconds
    
    return () => clearInterval(saveInterval);
  }, [submission, code, selectedLanguage]);

  const handleSave = async (silent = false) => {
    if (!submission || (assignment?.type !== AssignmentType.CODING && assignment?.type !== AssignmentType.SQL && assignment?.type !== AssignmentType.WEB)) return;
    
    try {
      if (!silent) setSaving(true);
      await submissionApi.saveCode(submission._id, {
        code,
        language: selectedLanguage
      });
      setLastSaved(new Date());
    } catch (err) {
      if (!silent) setError('Failed to save');
    } finally {
      if (!silent) setSaving(false);
    }
  };

  // For `web` assignments HTML and CSS live in separate language tabs, so the
  // raw HTML (with an external <link href="style.css">) renders unstyled in the
  // iframe. Merge them: inline the CSS and replace the external stylesheet link.
  const buildWebPreview = (): string => {
    const codeFor = (lang: ProgrammingLanguage) =>
      selectedLanguage === lang
        ? code
        : (codePerLanguage[lang] ?? assignment?.starterCode.find(s => s.language === lang)?.code ?? '');

    let html = codeFor(ProgrammingLanguage.HTML) || code || '';
    const css = codeFor(ProgrammingLanguage.CSS);

    if (css && css.trim()) {
      const styleTag = `<style>\n${css}\n</style>`;
      if (/<link\b[^>]*stylesheet[^>]*>/i.test(html)) {
        html = html.replace(/<link\b[^>]*stylesheet[^>]*>/i, styleTag);
      } else if (/<\/head>/i.test(html)) {
        html = html.replace(/<\/head>/i, `${styleTag}\n</head>`);
      } else {
        html = `${styleTag}\n${html}`;
      }
    }
    return html;
  };

  const handleRun = async () => {
    if (!submission) return;

    // Web assignments: render a live HTML/CSS preview instead of stdout
    if (assignment?.type === AssignmentType.WEB) {
      setActiveTab('output');
      setOutput('');
      setConsoleOutput(null);
      setRuntimeError(null);
      setTestResults([]);
      setWebPreview(buildWebPreview());
      return;
    }

    try {
      setRunning(true);
      setActiveTab('output');
      setOutput('Running code...');
      setConsoleOutput(null);
      setRuntimeError(null);
      setWebPreview(null);

      const response = await submissionApi.runCode(submission._id, {
        code,
        language: selectedLanguage
      });

      const data = response.data.data;
      const results = data?.results || [];
      setTestResults(results);

      // Always surface the program's raw output in the console panel
      setConsoleOutput(data?.stdout ?? '');
      setRuntimeError(data?.runtimeError || null);

      // Check for compilation error
      if (data?.compilationError) {
        setOutput(`Compilation Error:\n\n${data.compilationError}`);
      } else {
        // Don't set text output - we'll render the console + test cards instead
        setOutput('');
      }
    } catch (err: any) {
      setTestResults([]);
      setConsoleOutput(null);
      setOutput(`Error: ${err.response?.data?.message || 'Failed to run code'}`);
    } finally {
      setRunning(false);
    }
  };

  const handleSubmit = async () => {
    if (!submission || !assignment) return;
    
    if (!window.confirm('Are you sure you want to submit? You may not be able to modify your answer after submission.')) {
      return;
    }
    
    try {
      setSubmitting(true);
      
      if (assignment.type === AssignmentType.CODING || assignment.type === AssignmentType.SQL || assignment.type === AssignmentType.WEB) {
        await submissionApi.submitCoding(submission._id, {
          code,
          language: selectedLanguage
        });
      } else if (assignment.type === AssignmentType.MCQ) {
        const answers = Object.entries(mcqAnswers).map(([qi, si]) => ({
          questionIndex: Number(qi),
          selectedOption: si
        }));
        await submissionApi.submitMCQ(submission._id, answers);
      } else if (assignment.type === AssignmentType.THEORY) {
        await submissionApi.submitTheory(submission._id, theoryAnswer);
      }
      
      navigate(`/assignments/${assignmentId}/result`);
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to submit');
    } finally {
      setSubmitting(false);
    }
  };

  const handleLanguageChange = (lang: ProgrammingLanguage) => {
    // Save current code for the language we're leaving
    setCodePerLanguage(prev => ({ ...prev, [selectedLanguage]: code }));
    handleSave(true);
    setSelectedLanguage(lang);
    // Restore previously typed code for this language, or fall back to starter/empty
    const saved = codePerLanguage[lang];
    if (saved !== undefined) {
      setCode(saved);
    } else {
      const starter = assignment?.starterCode.find(s => s.language === lang);
      setCode(starter?.code || '');
    }
  };

  const formatTime = (ms: number) => {
    const minutes = Math.floor(ms / 60000);
    const seconds = Math.floor((ms % 60000) / 1000);
    return `${minutes}:${seconds.toString().padStart(2, '0')}`;
  };

  const getLanguageForMonaco = (lang: ProgrammingLanguage) => {
    const map: Record<ProgrammingLanguage, string> = {
      [ProgrammingLanguage.JAVASCRIPT]: 'javascript',
      [ProgrammingLanguage.TYPESCRIPT]: 'typescript',
      [ProgrammingLanguage.PYTHON]: 'python',
      [ProgrammingLanguage.JAVA]: 'java',
      [ProgrammingLanguage.CPP]: 'cpp',
      [ProgrammingLanguage.C]: 'c',
      [ProgrammingLanguage.CSHARP]: 'csharp',
      [ProgrammingLanguage.GO]: 'go',
      [ProgrammingLanguage.RUST]: 'rust',
      [ProgrammingLanguage.SQL]: 'sql',
      [ProgrammingLanguage.HTML]: 'html',
      [ProgrammingLanguage.CSS]: 'css'
    };
    return map[lang] || 'plaintext';
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

  if (!assignment) {
    return (
      <div className="assignment-page">
        <div className="alert alert-error">Assignment not found</div>
      </div>
    );
  }

  // Already submitted
  if (submission && (submission.status === SubmissionStatus.SUBMITTED || submission.status === SubmissionStatus.GRADED)) {
    return (
      <div className="assignment-page">
        <div className="empty-state">
          <div className="empty-state-icon">✅</div>
          <h3>Already Submitted</h3>
          <p>You have already submitted this assignment.</p>
          <button 
            className="btn btn-primary"
            onClick={() => navigate(`/assignments/${assignmentId}/result`)}
          >
            View Results
          </button>
          {submission.shareToken && assignment && (
            <div style={{ marginTop: '16px' }}>
              <ShareOnLinkedIn
                shareToken={submission.shareToken}
                title={assignment.title}
                type="assignment"
                percentage={submission.percentage}
              />
            </div>
          )}
        </div>
      </div>
    );
  }

  // Show instructions page before starting
  if (showInstructionsPage) {
    return (
      <div className="assignment-page">
        <div className="instructions-page">
          <div className="instructions-header">
            <button 
              className="btn btn-secondary"
              onClick={() => navigate('/assignments')}
              style={{ marginBottom: '16px' }}
            >
              ← Back to Assignments
            </button>
            <h1>{assignment.title}</h1>
            <div className="assignment-meta">
              <span className="meta-badge">🏆 {assignment.totalPoints} Points</span>
              <span className="meta-badge">📊 {assignment.difficulty}</span>
              <span className="meta-badge">📝 {assignment.type}</span>
              {assignment.settings?.timeLimitMinutes && (
                <span className="meta-badge">⏱️ {assignment.settings.timeLimitMinutes} Minutes</span>
              )}
            </div>
          </div>
          
          <div className="instructions-content">
            <div className="instructions-section">
              <h3>📋 Description</h3>
              <div 
                className="description-text"
                dangerouslySetInnerHTML={{ __html: assignment.description || 'No description provided.' }}
              />
            </div>
            
            {assignment.instructions && (
              <div className="instructions-section">
                <h3>📖 Instructions</h3>
                <div 
                  className="instructions-text"
                  dangerouslySetInnerHTML={{ __html: assignment.instructions }}
                />
              </div>
            )}
            
            <div className="instructions-section">
              <h3>⚠️ Important Notes</h3>
              <ul className="notes-list">
                <li>Make sure you understand the requirements before starting</li>
                <li>Your progress will be auto-saved every 30 seconds</li>
                {assignment.settings?.timeLimitMinutes && (
                  <li>This assignment has a time limit of {assignment.settings.timeLimitMinutes} minutes</li>
                )}
                {assignment.settings?.maxAttempts && assignment.settings.maxAttempts > 0 && (
                  <li>You have {assignment.settings.maxAttempts} attempt(s) for this assignment</li>
                )}
                <li>Click Submit when you're ready to finalize your work</li>
              </ul>
            </div>
          </div>
          
          <div className="instructions-actions">
            <button 
              className="btn btn-primary btn-lg"
              onClick={handleStartAssignment}
              disabled={starting}
            >
              {starting ? '⏳ Starting…' : '▶️ Start Assignment'}
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="workspace-container">
      {/* Header */}
      <div className="workspace-header">
        <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
          <button 
            className="btn btn-secondary btn-sm"
            onClick={() => navigate('/assignments')}
            style={{ background: 'rgba(255,255,255,0.1)', border: 'none', color: '#e5e7eb' }}
          >
            ← Back
          </button>
          <div>
            <h2 style={{ margin: 0, fontSize: '18px', color: 'white' }}>{assignment.title}</h2>
            <span style={{ color: '#9ca3af', fontSize: '14px' }}>
              🏆 {assignment.totalPoints} pts • 📊 {assignment.difficulty}
            </span>
          </div>
        </div>
        
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          {timeRemaining !== null && (
            <div style={{
              padding: '8px 16px',
              background: timeRemaining < 300000 ? 'rgba(239, 68, 68, 0.2)' : 'rgba(255,255,255,0.1)',
              color: timeRemaining < 300000 ? '#fca5a5' : '#e5e7eb',
              borderRadius: '8px',
              fontWeight: 600,
              fontFamily: "'Fira Code', monospace",
              border: timeRemaining < 300000 ? '1px solid rgba(239, 68, 68, 0.3)' : '1px solid rgba(255,255,255,0.1)'
            }}>
              ⏱️ {formatTime(timeRemaining)}
            </div>
          )}
          
          {lastSaved && (
            <span style={{ color: '#9ca3af', fontSize: '13px' }}>
              ✓ Saved {lastSaved.toLocaleTimeString()}
            </span>
          )}
          
          {(assignment.type === AssignmentType.CODING || assignment.type === AssignmentType.SQL || assignment.type === AssignmentType.WEB) && (
            <button 
              className="btn"
              onClick={() => handleSave(false)}
              disabled={saving}
              style={{ 
                background: 'rgba(255,255,255,0.1)', 
                border: '1px solid rgba(255,255,255,0.2)',
                color: '#e5e7eb'
              }}
            >
              {saving ? '⏳ Saving...' : '💾 Save'}
            </button>
          )}
          
          {(assignment.type === AssignmentType.CODING || assignment.type === AssignmentType.SQL || assignment.type === AssignmentType.WEB) && (
            <button 
              className="btn"
              onClick={handleRun}
              disabled={running}
              style={{ 
                background: '#059669', 
                border: 'none',
                color: 'white'
              }}
            >
              {running ? '⏳ Running...' : '▶️ Run'}
            </button>
          )}
          
          <button 
            className="btn"
            onClick={handleSubmit}
            disabled={submitting}
            style={{ 
              background: 'linear-gradient(135deg, #005897 0%, #0077cc 100%)', 
              border: 'none',
              color: 'white',
              fontWeight: 600
            }}
          >
            {submitting ? '⏳ Submitting...' : '📤 Submit'}
          </button>
        </div>
      </div>

      {/* Error Alert */}
      {error && (
        <div className="alert alert-error" style={{ margin: '0 16px' }}>
          {error}
          <button 
            style={{ marginLeft: 'auto', background: 'none', border: 'none', cursor: 'pointer' }}
            onClick={() => setError(null)}
          >
            ✕
          </button>
        </div>
      )}

      {/* Workspace */}
      <div className="workspace-layout">
        {/* Left Panel - Problem/Instructions */}
        <div className="workspace-problem">
          <div className="tabs" style={{ borderBottom: '1px solid #e5e7eb', padding: '0 16px' }}>
            <button 
              className={`tab ${activeTab === 'instructions' ? 'active' : ''}`}
              onClick={() => setActiveTab('instructions')}
            >
              📋 Instructions
            </button>
            <button 
              className={`tab ${activeTab === 'output' ? 'active' : ''}`}
              onClick={() => setActiveTab('output')}
            >
              📤 Output {testResults && testResults.length > 0 && `(${testResults.filter(r => r.passed).length}/${testResults.length})`}
            </button>
          </div>
          
          <div style={{ padding: '16px', overflow: 'auto', flex: 1 }}>
            {activeTab === 'instructions' ? (
              <>
                <div style={{ marginBottom: '20px' }}>
                  <h3 style={{ marginBottom: '8px' }}>📖 Problem Description</h3>
                  <div 
                    style={{ 
                      background: '#f9fafb', 
                      padding: '16px', 
                      borderRadius: '8px',
                      lineHeight: 1.6
                    }}
                    className="rich-content"
                    dangerouslySetInnerHTML={{ __html: assignment.description }}
                  />
                </div>
                
                {assignment.instructions && (
                  <div style={{ marginBottom: '20px' }}>
                    <h3 style={{ marginBottom: '8px' }}>📝 Instructions</h3>
                    <div 
                      style={{ 
                        background: '#f9fafb', 
                        padding: '16px', 
                        borderRadius: '8px',
                        lineHeight: 1.6
                      }}
                      className="rich-content"
                      dangerouslySetInnerHTML={{ __html: assignment.instructions }}
                    />
                  </div>
                )}
                
                {/* Test Cases (visible ones) */}
                {(assignment.type === AssignmentType.CODING || assignment.type === AssignmentType.SQL || assignment.type === AssignmentType.WEB) && (
                  <div>
                    <h3 style={{ marginBottom: '8px' }}>🧪 Test Cases</h3>
                    {assignment.testCases.filter(tc => !tc.isHidden).map((tc, index) => (
                      <div key={index} className="test-case-card" style={{ marginBottom: '12px' }}>
                        <div className="test-case-header">
                          <span>Example {index + 1}</span>
                          {tc.description && <span style={{ color: '#6b7280' }}>{tc.description}</span>}
                        </div>
                        <div className="test-case-content">
                          <div style={{ marginBottom: '8px' }}>
                            <strong>Input:</strong>
                            <pre style={{ 
                              background: '#f3f4f6', 
                              padding: '8px', 
                              borderRadius: '4px',
                              margin: '4px 0 0',
                              fontSize: '14px',
                              fontFamily: 'monospace'
                            }}>
                              {tc.input || '(no input)'}
                            </pre>
                          </div>
                          <div>
                            <strong>Expected Output:</strong>
                            <pre style={{ 
                              background: '#f3f4f6', 
                              padding: '8px', 
                              borderRadius: '4px',
                              margin: '4px 0 0',
                              fontSize: '14px',
                              fontFamily: 'monospace'
                            }}>
                              {tc.expectedOutput}
                            </pre>
                          </div>
                        </div>
                      </div>
                    ))}
                    {assignment.testCases.some(tc => tc.isHidden) && (
                      <div style={{ 
                        padding: '12px', 
                        background: '#fef3c7', 
                        borderRadius: '8px',
                        color: '#92400e',
                        fontSize: '14px'
                      }}>
                        🔒 {assignment.testCases.filter(tc => tc.isHidden).length} hidden test case(s) will be run on submission
                      </div>
                    )}
                  </div>
                )}
              </>
            ) : (
              <div className="test-results">
                {webPreview !== null ? (
                  <div style={{ padding: '16px' }}>
                    <div style={{ fontSize: '12px', fontWeight: 600, color: '#6b7280', marginBottom: '8px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                      🌐 Live Preview
                    </div>
                    <iframe
                      title="Web Preview"
                      srcDoc={webPreview}
                      sandbox="allow-scripts allow-modals"
                      style={{ width: '100%', height: '440px', border: '1px solid #e5e7eb', borderRadius: '8px', background: '#fff' }}
                    />
                  </div>
                ) : running ? (
                  <div className="empty-state" style={{ padding: '40px 0' }}>
                    <div className="empty-state-icon" style={{ fontSize: '48px' }}>⏳</div>
                    <h3>Running your code...</h3>
                    <p>Please wait while we execute your solution</p>
                  </div>
                ) : (
                <>
                {/* Console Output — raw program stdout, shown for all languages */}
                {consoleOutput !== null && (
                  <div style={{ padding: '16px 16px 0' }}>
                    <div style={{ fontSize: '12px', fontWeight: 600, color: '#6b7280', marginBottom: '6px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                      🖥️ Console Output
                    </div>
                    <pre style={{ background: '#0f172a', color: '#e2e8f0', padding: '14px 16px', borderRadius: '8px', margin: 0, fontSize: '13px', fontFamily: "'Fira Code', monospace", whiteSpace: 'pre-wrap', wordBreak: 'break-word', maxHeight: '260px', overflow: 'auto' }}>
                      {consoleOutput.trim() ? consoleOutput : '(no output)'}
                    </pre>
                    {runtimeError && (
                      <pre style={{ background: '#fef2f2', color: '#dc2626', padding: '10px 12px', borderRadius: '6px', margin: '8px 0 0', fontSize: '13px', fontFamily: "'Fira Code', monospace", whiteSpace: 'pre-wrap', wordBreak: 'break-word', border: '1px solid #fecaca' }}>
                        ⚠️ {runtimeError}
                      </pre>
                    )}
                  </div>
                )}
                {output ? (
                  <div style={{ padding: '16px' }}>
                    <div style={{ 
                      padding: '16px', 
                      background: output.startsWith('Compilation Error') ? '#fef3cd' : '#fef2f2', 
                      borderRadius: '8px',
                      border: output.startsWith('Compilation Error') ? '1px solid #ffc107' : '1px solid #fecaca',
                      color: output.startsWith('Compilation Error') ? '#856404' : '#dc2626'
                    }}>
                      {output.startsWith('Compilation Error') ? (
                        <>
                          <strong>🔧 Compilation Error</strong>
                          <pre style={{ 
                            margin: '12px 0 0', 
                            padding: '12px',
                            background: 'rgba(0,0,0,0.05)',
                            borderRadius: '4px',
                            whiteSpace: 'pre-wrap',
                            fontFamily: 'monospace',
                            fontSize: '13px',
                            color: '#c53030'
                          }}>
                            {output.replace('Compilation Error:\n\n', '')}
                          </pre>
                          <p style={{ margin: '12px 0 0', fontSize: '13px', color: '#6b7280' }}>
                            💡 Tip: Check your code for syntax errors like missing semicolons, unmatched brackets, or typos.
                          </p>
                        </>
                      ) : (
                        <>
                          <strong>⚠️ Error:</strong> {output.replace('Error: ', '')}
                        </>
                      )}
                    </div>
                  </div>
                ) : testResults && testResults.length > 0 ? (
                  <div style={{ padding: '16px' }}>
                    {/* Summary */}
                    <div style={{ 
                      display: 'flex', 
                      alignItems: 'center', 
                      justifyContent: 'space-between',
                      marginBottom: '20px',
                      padding: '16px',
                      background: testResults.every(r => r.passed) ? '#ecfdf5' : '#fef2f2',
                      borderRadius: '10px',
                      border: `1px solid ${testResults.every(r => r.passed) ? '#a7f3d0' : '#fecaca'}`
                    }}>
                      <div>
                        <h3 style={{ 
                          margin: 0, 
                          color: testResults.every(r => r.passed) ? '#059669' : '#dc2626',
                          fontSize: '18px'
                        }}>
                          {testResults.every(r => r.passed) ? '🎉 All Tests Passed!' : '❌ Some Tests Failed'}
                        </h3>
                        <p style={{ margin: '4px 0 0', color: '#6b7280', fontSize: '14px' }}>
                          {testResults.filter(r => r.passed).length} of {testResults.length} test cases passed
                        </p>
                      </div>
                      <div style={{ 
                        fontSize: '32px', 
                        fontWeight: 700,
                        color: testResults.every(r => r.passed) ? '#059669' : '#dc2626'
                      }}>
                        {testResults.filter(r => r.passed).length}/{testResults.length}
                      </div>
                    </div>

                    {/* Individual Test Results */}
                    {testResults.map((result, index) => (
                      <div 
                        key={index}
                        className={`test-result-card ${result.passed ? 'passed' : 'failed'}`}
                        style={{ 
                          background: 'white',
                          border: `1px solid ${result.passed ? '#a7f3d0' : '#fecaca'}`,
                          borderRadius: '10px',
                          marginBottom: '12px',
                          overflow: 'hidden'
                        }}
                      >
                        {/* Header */}
                        <div style={{ 
                          display: 'flex',
                          justifyContent: 'space-between',
                          alignItems: 'center',
                          padding: '12px 16px',
                          background: result.passed ? '#ecfdf5' : '#fef2f2',
                          borderBottom: `1px solid ${result.passed ? '#a7f3d0' : '#fecaca'}`
                        }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                            <span style={{ fontSize: '20px' }}>{result.passed ? '✅' : '❌'}</span>
                            <span style={{ fontWeight: 600, color: result.passed ? '#059669' : '#dc2626' }}>
                              Test Case #{index + 1}
                            </span>
                          </div>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '12px', fontSize: '13px', color: '#6b7280' }}>
                            <span>⏱️ {result.executionTime}ms</span>
                            {result.memoryUsed > 0 && <span>💾 {result.memoryUsed}MB</span>}
                          </div>
                        </div>

                        {/* Body */}
                        <div style={{ padding: '16px' }}>
                          {/* Input */}
                          {result.input && (
                            <div style={{ marginBottom: '12px' }}>
                              <div style={{ 
                                fontSize: '12px', 
                                fontWeight: 600, 
                                color: '#6b7280', 
                                marginBottom: '6px',
                                textTransform: 'uppercase',
                                letterSpacing: '0.5px'
                              }}>
                                📥 Input
                              </div>
                              <pre style={{ 
                                background: '#f3f4f6', 
                                padding: '10px 12px', 
                                borderRadius: '6px',
                                margin: 0,
                                fontSize: '13px',
                                fontFamily: "'Fira Code', monospace",
                                whiteSpace: 'pre-wrap',
                                wordBreak: 'break-all'
                              }}>
                                {result.input || '(no input)'}
                              </pre>
                            </div>
                          )}

                          {/* Expected vs Actual - Side by side */}
                          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                            {/* Expected Output */}
                            <div>
                              <div style={{ 
                                fontSize: '12px', 
                                fontWeight: 600, 
                                color: '#059669', 
                                marginBottom: '6px',
                                textTransform: 'uppercase',
                                letterSpacing: '0.5px'
                              }}>
                                ✓ Expected Output
                              </div>
                              <pre style={{ 
                                background: '#ecfdf5', 
                                padding: '10px 12px', 
                                borderRadius: '6px',
                                margin: 0,
                                fontSize: '13px',
                                fontFamily: "'Fira Code', monospace",
                                whiteSpace: 'pre-wrap',
                                wordBreak: 'break-all',
                                border: '1px solid #a7f3d0'
                              }}>
                                {result.expectedOutput || '(empty)'}
                              </pre>
                            </div>

                            {/* Actual Output */}
                            <div>
                              <div style={{ 
                                fontSize: '12px', 
                                fontWeight: 600, 
                                color: result.passed ? '#059669' : '#dc2626', 
                                marginBottom: '6px',
                                textTransform: 'uppercase',
                                letterSpacing: '0.5px'
                              }}>
                                {result.passed ? '✓' : '✗'} Your Output
                              </div>
                              <pre style={{ 
                                background: result.passed ? '#ecfdf5' : '#fef2f2', 
                                padding: '10px 12px', 
                                borderRadius: '6px',
                                margin: 0,
                                fontSize: '13px',
                                fontFamily: "'Fira Code', monospace",
                                whiteSpace: 'pre-wrap',
                                wordBreak: 'break-all',
                                border: `1px solid ${result.passed ? '#a7f3d0' : '#fecaca'}`
                              }}>
                                {result.actualOutput || '(no output)'}
                              </pre>
                            </div>
                          </div>

                          {/* Error Message */}
                          {result.error && (
                            <div style={{ marginTop: '12px' }}>
                              <div style={{ 
                                fontSize: '12px', 
                                fontWeight: 600, 
                                color: '#dc2626', 
                                marginBottom: '6px',
                                textTransform: 'uppercase',
                                letterSpacing: '0.5px'
                              }}>
                                ⚠️ Error
                              </div>
                              <pre style={{ 
                                background: '#fef2f2', 
                                padding: '10px 12px', 
                                borderRadius: '6px',
                                margin: 0,
                                fontSize: '13px',
                                fontFamily: "'Fira Code', monospace",
                                whiteSpace: 'pre-wrap',
                                wordBreak: 'break-all',
                                border: '1px solid #fecaca',
                                color: '#dc2626'
                              }}>
                                {result.error}
                              </pre>
                            </div>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                ) : consoleOutput === null ? (
                  <div className="empty-state" style={{ padding: '40px 0' }}>
                    <div className="empty-state-icon">▶️</div>
                    <h3>No Output Yet</h3>
                    <p>Click "Run" to execute your code and see output</p>
                  </div>
                ) : null}
                </>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Right Panel - Editor/Input */}
        <div className="workspace-editor">
          {/* Coding Assignment */}
          {(assignment.type === AssignmentType.CODING || assignment.type === AssignmentType.SQL || assignment.type === AssignmentType.WEB) && (
            <>
              <div className="language-pills" style={{ display: 'flex' }}>
                {assignment.allowedLanguages.map(lang => (
                  <button
                    key={lang}
                    className={`language-pill ${selectedLanguage === lang ? 'active' : ''}`}
                    onClick={() => handleLanguageChange(lang)}
                  >
                    {lang === 'javascript' && '🟨 JavaScript'}
                    {lang === 'python' && '🐍 Python'}
                    {lang === 'java' && '☕ Java'}
                    {lang === 'cpp' && '⚡ C++'}
                    {lang === 'c' && '🔧 C'}
                    {lang === 'typescript' && '🔵 TypeScript'}
                    {lang === 'csharp' && '🔷 C#'}
                    {lang === 'go' && '🐹 Go'}
                    {lang === 'rust' && '🦀 Rust'}
                    {lang === 'sql' && '🗄️ SQL'}
                    {lang === 'html' && '🌐 HTML'}
                    {lang === 'css' && '🎨 CSS'}
                    {!['javascript', 'python', 'java', 'cpp', 'c', 'typescript', 'csharp', 'go', 'rust', 'sql', 'html', 'css'].includes(lang) && lang}
                  </button>
                ))}
              </div>
              
              <div className="code-editor-container">
                <Editor
                  key={selectedLanguage}
                  height="100%"
                  language={getLanguageForMonaco(selectedLanguage)}
                  value={code}
                  onChange={(value) => setCode(value || '')}
                  theme="vs-dark"
                  onMount={(editor, monaco) => {
                    editorRef.current = editor;
                    // Disable built-in JS/TS diagnostics for non-JS/TS languages to avoid false errors
                    const ts = (monaco.languages as any).typescript;
                    if (ts) {
                      ts.javascriptDefaults?.setDiagnosticsOptions({
                        noSemanticValidation: true,
                        noSyntaxValidation: true,
                      });
                      ts.typescriptDefaults?.setDiagnosticsOptions({
                        noSemanticValidation: true,
                        noSyntaxValidation: true,
                      });
                    }
                  }}
                  options={{
                    minimap: { enabled: false },
                    fontSize: 14,
                    lineNumbers: 'on',
                    scrollBeyondLastLine: false,
                    automaticLayout: true,
                    tabSize: 2,
                    wordWrap: 'on',
                    padding: { top: 16, bottom: 16 },
                    fontFamily: "'Fira Code', 'Consolas', 'Monaco', monospace",
                    fontLigatures: true,
                    cursorBlinking: 'smooth',
                    smoothScrolling: true,
                    renderLineHighlight: 'all',
                    suggestOnTriggerCharacters: true,
                    quickSuggestions: { other: true, comments: false, strings: true },
                    acceptSuggestionOnEnter: 'on',
                    snippetSuggestions: 'inline',
                    wordBasedSuggestions: 'currentDocument',
                    parameterHints: { enabled: true },
                    bracketPairColorization: { enabled: true },
                    autoClosingBrackets: 'always',
                    autoClosingQuotes: 'always',
                    autoIndent: 'full',
                    formatOnPaste: true,
                    formatOnType: true,
                  }}
                />
              </div>
            </>
          )}

          {/* MCQ Assignment */}
          {assignment.type === AssignmentType.MCQ && (
            <div style={{ padding: '24px', overflow: 'auto', background: '#f9fafb', height: '100%' }}>
              <h3 style={{ marginBottom: '20px', color: '#1a1a2e' }}>📋 Questions</h3>
              {assignment.mcqQuestions.map((q, qIndex) => (
                <div key={qIndex} className="mcq-card">
                  <div className="mcq-header">
                    <span>Question {qIndex + 1} of {assignment.mcqQuestions.length}</span>
                    <span style={{ color: '#005897', fontWeight: 600 }}>{q.points} pts</span>
                  </div>
                  <div className="mcq-content">
                    <p style={{ fontWeight: 600, marginBottom: '20px', fontSize: '16px', lineHeight: 1.5 }}>
                      {q.question}
                    </p>
                    <div className="mcq-options">
                      {q.options.map((opt, oIndex) => (
                        <div 
                          key={oIndex}
                          className={`mcq-option ${mcqAnswers[qIndex] === oIndex ? 'selected' : ''}`}
                          onClick={() => setMcqAnswers({ ...mcqAnswers, [qIndex]: oIndex })}
                        >
                          <span className="option-marker">
                            {String.fromCharCode(65 + oIndex)}
                          </span>
                          <span style={{ flex: 1 }}>{opt.text}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              ))}
              
              <div style={{ 
                background: 'white', 
                padding: '20px', 
                borderRadius: '12px',
                border: '1px solid #e5e7eb',
                position: 'sticky',
                bottom: 0
              }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
                  <h4 style={{ margin: 0 }}>Progress</h4>
                  <span style={{ fontWeight: 600, color: '#005897' }}>
                    {Object.keys(mcqAnswers).length}/{assignment.mcqQuestions.length}
                  </span>
                </div>
                <div style={{ 
                  background: '#e5e7eb', 
                  borderRadius: '6px', 
                  height: '10px',
                  overflow: 'hidden'
                }}>
                  <div style={{
                    width: `${(Object.keys(mcqAnswers).length / assignment.mcqQuestions.length) * 100}%`,
                    height: '100%',
                    background: 'linear-gradient(90deg, #005897 0%, #0077cc 100%)',
                    transition: 'width 0.3s',
                    borderRadius: '6px'
                  }} />
                </div>
              </div>
            </div>
          )}

          {/* Theory Assignment */}
          {assignment.type === AssignmentType.THEORY && (
            <div className="theory-editor">
              <h3 style={{ marginBottom: '16px', color: '#1a1a2e' }}>📝 Your Answer</h3>
              <textarea
                value={theoryAnswer}
                onChange={(e) => setTheoryAnswer(e.target.value)}
                placeholder="Write your detailed answer here..."
              />
              <div style={{ 
                marginTop: '12px', 
                display: 'flex',
                justifyContent: 'space-between',
                color: '#6b7280',
                fontSize: '13px'
              }}>
                <span>💡 Supports rich text formatting</span>
                <span>{theoryAnswer.length} characters</span>
              </div>
            </div>
          )}

          {/* Project/File Upload Assignment */}
          {(assignment.type === AssignmentType.PROJECT || assignment.type === AssignmentType.FILE_UPLOAD) && (
            <div style={{ padding: '40px', display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%', background: '#f9fafb' }}>
              <div style={{ textAlign: 'center', maxWidth: '400px' }}>
                <div style={{ fontSize: '64px', marginBottom: '20px' }}>📁</div>
                <h3 style={{ marginBottom: '8px', color: '#1a1a2e' }}>Upload Your Files</h3>
                <p style={{ color: '#6b7280', marginBottom: '24px' }}>
                  Drag and drop your project files here, or click to browse
                </p>
                <input
                  type="file"
                  multiple
                  style={{ display: 'none' }}
                  id="file-upload"
                />
                <label htmlFor="file-upload" className="btn btn-primary" style={{ padding: '14px 32px', fontSize: '15px' }}>
                  📎 Choose Files
                </label>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default AssignmentWorkspace;
