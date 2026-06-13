import React, { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { interviewTemplateApi, interviewQuestionBankApi } from '../../api/interviewModuleApi';
import './InterviewTemplateCreate.css';

type InterviewCategory = 'communication' | 'hr' | 'technical';
type InterviewDifficulty = 'easy' | 'medium' | 'hard' | 'mixed';
type ISectionDefinitionShared = { sectionOrder: number; sectionTitle: string; sectionType: string; isMandatory: boolean; questionSource: string; questionOrder: string; questionIds: string[]; randomQuestionCount: number; sectionTimeLimit: number; perQuestionTimeLimit: number; scoringPattern: string; maxScore: number; passingThreshold: number; canBeSkipped: boolean; answerMode: string; instructions: string; [key: string]: any; };
type IInterviewTemplateShared = { _id?: string; title: string; description?: string; targetAudience?: string; interviewCategories: InterviewCategory[]; totalDuration?: number; difficultyLevel?: InterviewDifficulty; experienceLevel?: string; interviewMode?: string; sections?: ISectionDefinitionShared[]; sectionNavigationMode?: string; scheduleType?: string; scheduledStartDate?: string; scheduledEndDate?: string; expiryDate?: string; maxAttempts?: number; reattemptCooldownHours?: number; allowResume?: boolean; resumeWindowMinutes?: number; autoSubmitOnExpiry?: boolean; showResultImmediately?: boolean; requireReviewBeforePublish?: boolean; randomizeSections?: boolean; blockMultipleTabs?: boolean; requireMicrophone?: boolean; microphoneFallback?: string; enableCodeEditor?: boolean; [key: string]: any; };

const EMPTY_SECTION: ISectionDefinitionShared = {
  sectionOrder: 1,
  sectionTitle: '',
  sectionType: 'communication',
  isMandatory: true,
  questionSource: 'question_bank',
  questionOrder: 'fixed',
  questionIds: [],
  randomQuestionCount: 5,
  sectionTimeLimit: 0,
  perQuestionTimeLimit: 0,
  scoringPattern: 'equal',
  maxScore: 100,
  passingThreshold: 50,
  canBeSkipped: false,
  answerMode: 'text',
  instructions: '',
};

const InterviewTemplateCreate: React.FC = () => {
  const navigate = useNavigate();
  const { templateId } = useParams<{ templateId: string }>();
  const isEditing = !!templateId;

  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(false);
  const [availableQuestions, setAvailableQuestions] = useState<any[]>([]);
  const [questionSearchCategory, setQuestionSearchCategory] = useState<string>('');

  // AI question generation panel (per section)
  const [aiPanelSection, setAiPanelSection] = useState<number | null>(null);
  const [aiSpec, setAiSpec] = useState({ topic: '', difficulty: 'medium', answerMode: 'text', count: 5 });
  const [aiGenerating, setAiGenerating] = useState(false);
  const [aiMsg, setAiMsg] = useState('');

  const [form, setForm] = useState<Partial<IInterviewTemplateShared>>({
    title: '',
    description: '',
    targetAudience: '',
    interviewCategories: [],
    totalDuration: 60,
    difficultyLevel: 'medium',
    experienceLevel: 'fresher',
    interviewMode: 'practice',
    sections: [],
    sectionNavigationMode: 'sequential',
    scheduleType: 'immediate',
    maxAttempts: 1,
    reattemptCooldownHours: 0,
    allowResume: true,
    resumeWindowMinutes: 30,
    autoSubmitOnExpiry: true,
    showResultImmediately: false,
    requireReviewBeforePublish: false,
    randomizeSections: false,
    blockMultipleTabs: false,
    requireMicrophone: false,
    microphoneFallback: 'text_fallback',
    enableCodeEditor: false,
    recordVideo: false,
    videoFallback: 'allow_text',
  });

  useEffect(() => {
    if (isEditing) {
      setLoading(true);
      interviewTemplateApi.getById(templateId!).then(res => {
        setForm(res.data);
      }).catch(err => {
        console.error(err);
        alert('Failed to load template');
      }).finally(() => setLoading(false));
    }
  }, [templateId, isEditing]);

  const updateForm = (key: string, value: any) => {
    setForm(prev => ({ ...prev, [key]: value }));
  };

  const toggleCategory = (cat: InterviewCategory) => {
    const cats = form.interviewCategories || [];
    if (cats.includes(cat)) {
      updateForm('interviewCategories', cats.filter(c => c !== cat));
    } else {
      updateForm('interviewCategories', [...cats, cat]);
    }
  };

  // ── Section Management ───────────────────────────────────────────────

  const addSection = () => {
    const sections = form.sections || [];
    const newSection = {
      ...EMPTY_SECTION,
      sectionOrder: sections.length + 1,
      sectionTitle: `Section ${sections.length + 1}`,
    };
    updateForm('sections', [...sections, newSection]);
  };

  const updateSection = (index: number, key: string, value: any) => {
    const sections = [...(form.sections || [])];
    (sections[index] as any)[key] = value;
    updateForm('sections', sections);
  };

  const removeSection = (index: number) => {
    const sections = (form.sections || []).filter((_, i) => i !== index);
    sections.forEach((s, i) => { s.sectionOrder = i + 1; });
    updateForm('sections', sections);
  };

  const moveSection = (index: number, direction: 'up' | 'down') => {
    const sections = [...(form.sections || [])];
    const targetIndex = direction === 'up' ? index - 1 : index + 1;
    if (targetIndex < 0 || targetIndex >= sections.length) return;
    [sections[index], sections[targetIndex]] = [sections[targetIndex], sections[index]];
    sections.forEach((s, i) => { s.sectionOrder = i + 1; });
    updateForm('sections', sections);
  };

  // ── Load Questions for Selection ─────────────────────────────────────

  const loadQuestions = async (category: string) => {
    try {
      setQuestionSearchCategory(category);
      const res = await interviewQuestionBankApi.getAll({
        interviewCategory: category,
        isActive: true,
        limit: 100,
      });
      setAvailableQuestions(res.questions || []);
    } catch (err) {
      console.error(err);
    }
  };

  // ── AI Question Generation ───────────────────────────────────────────

  const handleAiGenerate = async (sectionIndex: number) => {
    const section = (form.sections || [])[sectionIndex];
    if (!section) return;
    if (!aiSpec.topic.trim()) { setAiMsg('Please enter a topic first.'); return; }
    try {
      setAiGenerating(true);
      setAiMsg('');
      const res = await interviewQuestionBankApi.aiGenerate({
        interviewCategory: section.sectionType,
        topic: aiSpec.topic.trim(),
        difficulty: aiSpec.difficulty,
        answerMode: aiSpec.answerMode,
        count: aiSpec.count,
        roleTarget: form.targetAudience || undefined,
        experienceLevel: form.experienceLevel || undefined,
      });
      const created: any[] = res.data || [];
      if (!created.length) { setAiMsg('No questions were generated — try a different topic or run again.'); return; }

      // Add the new questions to this section and ensure source uses the bank
      const sections = [...(form.sections || [])];
      const ids = new Set(sections[sectionIndex].questionIds || []);
      created.forEach(q => ids.add(q._id));
      sections[sectionIndex].questionIds = Array.from(ids);
      sections[sectionIndex].questionSource = 'question_bank';
      updateForm('sections', sections);

      // Surface them in the selectable list (checked)
      setQuestionSearchCategory(section.sectionType);
      setAvailableQuestions(prev => {
        const seen = new Set(prev.map((p: any) => p._id));
        return [...created.filter(q => !seen.has(q._id)), ...prev];
      });
      setAiMsg(`✅ Generated and added ${created.length} question${created.length > 1 ? 's' : ''}.`);
    } catch (err: any) {
      setAiMsg(err.message || 'Generation failed. Make sure AI is configured on the server.');
    } finally {
      setAiGenerating(false);
    }
  };

  const handleAvatarUpload = async (sectionIndex: number, file: File) => {
    try {
      const res = await interviewTemplateApi.uploadAvatar(file);
      updateSection(sectionIndex, 'avatarImageUrl', res.data.url);
    } catch (e: any) {
      alert(e.message || 'Avatar upload failed');
    }
  };

  const toggleQuestionInSection = (sectionIndex: number, questionId: string) => {
    const sections = [...(form.sections || [])];
    const section = sections[sectionIndex];
    const ids = section.questionIds || [];
    if (ids.includes(questionId)) {
      section.questionIds = ids.filter(id => id !== questionId);
    } else {
      section.questionIds = [...ids, questionId];
    }
    updateForm('sections', sections);
  };

  // ── Save ─────────────────────────────────────────────────────────────

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.title) { alert('Title is required'); return; }
    if (!form.interviewCategories?.length) { alert('Select at least one interview category'); return; }

    try {
      setSaving(true);
      if (isEditing) {
        await interviewTemplateApi.update(templateId!, form);
      } else {
        await interviewTemplateApi.create(form);
      }
      navigate('/admin/interviews/templates');
    } catch (err: any) {
      alert(err.message || 'Failed to save template');
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <div className="itc-loading">Loading template...</div>;

  return (
    <div className="itc-container">
      <div className="itc-header">
        <button className="itc-back-btn" onClick={() => navigate('/admin/interviews/templates')}>&larr; Back</button>
        <h1>{isEditing ? 'Edit Interview Template' : 'Create Interview Template'}</h1>
      </div>

      <form onSubmit={handleSave} className="itc-form">
        {/* ── Basic Info ─────────────────────────────────────── */}
        <section className="itc-section">
          <h2>Basic Information</h2>
          <div className="itc-field">
            <label>Title *</label>
            <input type="text" value={form.title || ''} onChange={e => updateForm('title', e.target.value)} required />
          </div>
          <div className="itc-field">
            <label>Description</label>
            <textarea value={form.description || ''} onChange={e => updateForm('description', e.target.value)} rows={3} />
          </div>
          <div className="itc-row">
            <div className="itc-field">
              <label>Target Audience</label>
              <input type="text" value={form.targetAudience || ''} onChange={e => updateForm('targetAudience', e.target.value)} placeholder="e.g., CS Final Year Students" />
            </div>
            <div className="itc-field">
              <label>Interview Mode</label>
              <select value={form.interviewMode} onChange={e => updateForm('interviewMode', e.target.value)}>
                <option value="practice">Practice</option>
                <option value="assessment">Assessment</option>
                <option value="placement">Placement</option>
              </select>
            </div>
          </div>
        </section>

        {/* ── Categories ─────────────────────────────────────── */}
        <section className="itc-section">
          <h2>Interview Categories *</h2>
          <p className="itc-hint">Select one or more categories. Combined interviews will have separate rounds.</p>
          <div className="itc-categories">
            {(['communication', 'hr', 'technical'] as InterviewCategory[]).map(cat => (
              <label key={cat} className={`itc-cat-option ${form.interviewCategories?.includes(cat) ? 'selected' : ''}`}>
                <input
                  type="checkbox"
                  checked={form.interviewCategories?.includes(cat) || false}
                  onChange={() => toggleCategory(cat)}
                />
                <span className="itc-cat-label">
                  {cat === 'communication' ? '🗣️ Communication Interview' :
                   cat === 'hr' ? '👔 HR Interview' : '💻 Technical Interview'}
                </span>
              </label>
            ))}
          </div>
        </section>

        {/* ── Configuration ──────────────────────────────────── */}
        <section className="itc-section">
          <h2>Configuration</h2>
          <div className="itc-row">
            <div className="itc-field">
              <label>Total Duration (minutes)</label>
              <input type="number" value={form.totalDuration} onChange={e => updateForm('totalDuration', parseInt(e.target.value) || 0)} min={10} max={300} />
            </div>
            <div className="itc-field">
              <label>Difficulty Level</label>
              <select value={form.difficultyLevel} onChange={e => updateForm('difficultyLevel', e.target.value)}>
                <option value="easy">Easy</option>
                <option value="medium">Medium</option>
                <option value="hard">Hard</option>
                <option value="mixed">Mixed</option>
              </select>
            </div>
            <div className="itc-field">
              <label>Experience Level</label>
              <select value={form.experienceLevel} onChange={e => updateForm('experienceLevel', e.target.value)}>
                <option value="fresher">Fresher</option>
                <option value="junior">Junior (1-2 yrs)</option>
                <option value="mid">Mid-Level (3-5 yrs)</option>
                <option value="senior">Senior (5+ yrs)</option>
                <option value="custom">Custom</option>
              </select>
            </div>
          </div>
        </section>

        {/* ── Attempt & Resume Rules ─────────────────────────── */}
        <section className="itc-section">
          <h2>Attempt & Resume Rules</h2>
          <div className="itc-row">
            <div className="itc-field">
              <label>Max Attempts</label>
              <input type="number" value={form.maxAttempts} onChange={e => updateForm('maxAttempts', parseInt(e.target.value) || 1)} min={1} max={10} />
            </div>
            <div className="itc-field">
              <label>Section Navigation</label>
              <select value={form.sectionNavigationMode} onChange={e => updateForm('sectionNavigationMode', e.target.value)}>
                <option value="sequential">Sequential (must complete in order)</option>
                <option value="free">Free Navigation</option>
              </select>
            </div>
          </div>
          <div className="itc-row">
            <div className="itc-field itc-checkbox">
              <label><input type="checkbox" checked={form.allowResume || false} onChange={e => updateForm('allowResume', e.target.checked)} /> Allow Resume on Disconnect</label>
            </div>
            <div className="itc-field itc-checkbox">
              <label><input type="checkbox" checked={form.autoSubmitOnExpiry || false} onChange={e => updateForm('autoSubmitOnExpiry', e.target.checked)} /> Auto-Submit on Expiry</label>
            </div>
            <div className="itc-field itc-checkbox">
              <label><input type="checkbox" checked={form.showResultImmediately || false} onChange={e => updateForm('showResultImmediately', e.target.checked)} /> Show Result Immediately</label>
            </div>
            <div className="itc-field itc-checkbox">
              <label><input type="checkbox" checked={form.requireReviewBeforePublish || false} onChange={e => updateForm('requireReviewBeforePublish', e.target.checked)} /> Require Manual Review</label>
            </div>
          </div>
          <div className="itc-row">
            <div className="itc-field itc-checkbox">
              <label><input type="checkbox" checked={form.blockMultipleTabs || false} onChange={e => updateForm('blockMultipleTabs', e.target.checked)} /> Block Multiple Tabs</label>
            </div>
            <div className="itc-field itc-checkbox">
              <label><input type="checkbox" checked={form.requireMicrophone || false} onChange={e => updateForm('requireMicrophone', e.target.checked)} /> Require Microphone</label>
            </div>
            <div className="itc-field itc-checkbox">
              <label><input type="checkbox" checked={form.enableCodeEditor || false} onChange={e => updateForm('enableCodeEditor', e.target.checked)} /> Enable Code Editor</label>
            </div>
          </div>
          <div className="itc-row">
            <div className="itc-field itc-checkbox">
              <label><input type="checkbox" checked={form.recordVideo || false} onChange={e => updateForm('recordVideo', e.target.checked)} /> 🎥 Record as Video Interview</label>
            </div>
            {form.recordVideo && (
              <div className="itc-field">
                <label>If camera/mic is denied</label>
                <select value={form.videoFallback || 'allow_text'} onChange={e => updateForm('videoFallback', e.target.value)}>
                  <option value="allow_text">Allow continue without video</option>
                  <option value="block">Block until camera is allowed</option>
                </select>
              </div>
            )}
          </div>
          {form.recordVideo && <p className="itc-hint">The whole interview is recorded (webcam + mic) and saved to Bunny. Upload a per-section interviewer avatar below for a real-interview feel.</p>}
        </section>

        {/* ── Schedule ───────────────────────────────────────── */}
        <section className="itc-section">
          <h2>Schedule</h2>
          <div className="itc-row">
            <div className="itc-field">
              <label>Schedule Type</label>
              <select value={form.scheduleType} onChange={e => updateForm('scheduleType', e.target.value)}>
                <option value="immediate">Immediate (available now)</option>
                <option value="scheduled">Scheduled (future date)</option>
              </select>
            </div>
            {form.scheduleType === 'scheduled' && (
              <>
                <div className="itc-field">
                  <label>Start Date</label>
                  <input type="datetime-local" value={form.scheduledStartDate || ''} onChange={e => updateForm('scheduledStartDate', e.target.value)} />
                </div>
                <div className="itc-field">
                  <label>End Date</label>
                  <input type="datetime-local" value={form.scheduledEndDate || ''} onChange={e => updateForm('scheduledEndDate', e.target.value)} />
                </div>
              </>
            )}
            <div className="itc-field">
              <label>Expiry Date</label>
              <input type="datetime-local" value={form.expiryDate || ''} onChange={e => updateForm('expiryDate', e.target.value)} />
            </div>
          </div>
        </section>

        {/* ── Sections ───────────────────────────────────────── */}
        <section className="itc-section">
          <div className="itc-section-header">
            <h2>Interview Sections</h2>
            <button type="button" className="itc-btn-secondary" onClick={addSection}>+ Add Section</button>
          </div>
          <p className="itc-hint">Define sections for each round of the interview. Each section can be a different type.</p>

          {(form.sections || []).length === 0 && (
            <div className="itc-empty-sections">
              No sections added yet. Click "Add Section" to create interview rounds.
            </div>
          )}

          {(form.sections || []).map((section, idx) => (
            <div key={idx} className="itc-section-card">
              <div className="itc-section-card-header">
                <h3>Section {idx + 1}: {section.sectionTitle || 'Untitled'}</h3>
                <div className="itc-section-card-actions">
                  <button type="button" onClick={() => moveSection(idx, 'up')} disabled={idx === 0}>↑</button>
                  <button type="button" onClick={() => moveSection(idx, 'down')} disabled={idx === (form.sections?.length || 0) - 1}>↓</button>
                  <button type="button" className="itc-btn-danger-sm" onClick={() => removeSection(idx)}>Remove</button>
                </div>
              </div>

              <div className="itc-row">
                <div className="itc-field">
                  <label>Section Title</label>
                  <input type="text" value={section.sectionTitle} onChange={e => updateSection(idx, 'sectionTitle', e.target.value)} />
                </div>
                <div className="itc-field">
                  <label>Section Type</label>
                  <select value={section.sectionType} onChange={e => updateSection(idx, 'sectionType', e.target.value)}>
                    <option value="communication">Communication</option>
                    <option value="hr">HR</option>
                    <option value="technical">Technical</option>
                  </select>
                </div>
                <div className="itc-field">
                  <label>Answer Mode</label>
                  <select value={section.answerMode} onChange={e => updateSection(idx, 'answerMode', e.target.value)}>
                    <option value="text">Text</option>
                    <option value="audio">Audio</option>
                    <option value="mcq">MCQ</option>
                    <option value="code">Code</option>
                    <option value="mixed">Mixed</option>
                  </select>
                </div>
              </div>

              <div className="itc-row">
                <div className="itc-field">
                  <label>Question Source</label>
                  <select value={section.questionSource} onChange={e => updateSection(idx, 'questionSource', e.target.value)}>
                    <option value="question_bank">From Question Bank</option>
                    <option value="random">Random (auto-pick)</option>
                  </select>
                </div>
                <div className="itc-field">
                  <label>Question Order</label>
                  <select value={section.questionOrder} onChange={e => updateSection(idx, 'questionOrder', e.target.value)}>
                    <option value="fixed">Fixed</option>
                    <option value="random">Random</option>
                  </select>
                </div>
                <div className="itc-field">
                  <label>Section Time Limit (min, 0=none)</label>
                  <input type="number" value={section.sectionTimeLimit || 0} onChange={e => updateSection(idx, 'sectionTimeLimit', parseInt(e.target.value) || 0)} min={0} />
                </div>
              </div>

              <div className="itc-row">
                <div className="itc-field">
                  <label>Per-Question Time (sec, 0=none)</label>
                  <input type="number" value={section.perQuestionTimeLimit || 0} onChange={e => updateSection(idx, 'perQuestionTimeLimit', parseInt(e.target.value) || 0)} min={0} />
                </div>
                <div className="itc-field">
                  <label>Max Score</label>
                  <input type="number" value={section.maxScore} onChange={e => updateSection(idx, 'maxScore', parseInt(e.target.value) || 100)} min={1} />
                </div>
                <div className="itc-field">
                  <label>Passing Threshold (%)</label>
                  <input type="number" value={section.passingThreshold} onChange={e => updateSection(idx, 'passingThreshold', parseInt(e.target.value) || 0)} min={0} max={100} />
                </div>
              </div>

              <div className="itc-row">
                <div className="itc-field itc-checkbox">
                  <label><input type="checkbox" checked={section.isMandatory} onChange={e => updateSection(idx, 'isMandatory', e.target.checked)} /> Mandatory</label>
                </div>
                <div className="itc-field itc-checkbox">
                  <label><input type="checkbox" checked={section.canBeSkipped} onChange={e => updateSection(idx, 'canBeSkipped', e.target.checked)} /> Can Be Skipped</label>
                </div>
              </div>

              {section.questionSource === 'random' && (
                <div className="itc-field">
                  <label>Number of Random Questions</label>
                  <input type="number" value={section.randomQuestionCount || 5} onChange={e => updateSection(idx, 'randomQuestionCount', parseInt(e.target.value) || 5)} min={1} max={50} />
                </div>
              )}

              {section.questionSource === 'question_bank' && (
                <div className="itc-question-selector">
                  <div className="itc-question-selector-header">
                    <strong>Questions ({section.questionIds?.length || 0} selected)</strong>
                    <div className="itc-qs-actions">
                      <button type="button" className="itc-btn-sm" onClick={() => loadQuestions(section.sectionType)}>
                        Load Questions
                      </button>
                      <button
                        type="button"
                        className="itc-btn-sm itc-btn-ai"
                        onClick={() => { setAiPanelSection(aiPanelSection === idx ? null : idx); setAiMsg(''); }}
                      >
                        ✨ AI Generate
                      </button>
                    </div>
                  </div>

                  {aiPanelSection === idx && (
                    <div className="itc-ai-panel">
                      <p className="itc-hint">Claude writes interview questions for this <strong>{section.sectionType}</strong> section and adds them to the bank.</p>
                      <div className="itc-row">
                        <div className="itc-field">
                          <label>Topic</label>
                          <input
                            type="text"
                            value={aiSpec.topic}
                            onChange={e => setAiSpec({ ...aiSpec, topic: e.target.value })}
                            placeholder={
                              section.sectionType === 'technical' ? 'e.g., Java, Aptitude, Logical Reasoning, SQL' :
                              section.sectionType === 'hr' ? 'e.g., Behavioral, Teamwork, Conflict' :
                              'e.g., Self Introduction, Fluency'
                            }
                          />
                        </div>
                        <div className="itc-field">
                          <label>Format</label>
                          <select value={aiSpec.answerMode} onChange={e => setAiSpec({ ...aiSpec, answerMode: e.target.value })}>
                            <option value="text">Open-ended (AI-graded)</option>
                            <option value="mcq">Multiple choice (auto-graded)</option>
                          </select>
                        </div>
                        <div className="itc-field">
                          <label>Difficulty</label>
                          <select value={aiSpec.difficulty} onChange={e => setAiSpec({ ...aiSpec, difficulty: e.target.value })}>
                            <option value="easy">Easy</option>
                            <option value="medium">Medium</option>
                            <option value="hard">Hard</option>
                          </select>
                        </div>
                        <div className="itc-field">
                          <label>How many</label>
                          <input type="number" min={1} max={15} value={aiSpec.count} onChange={e => setAiSpec({ ...aiSpec, count: parseInt(e.target.value) || 5 })} />
                        </div>
                      </div>
                      <div className="itc-ai-panel-actions">
                        <button type="button" className="itc-btn-save" disabled={aiGenerating} onClick={() => handleAiGenerate(idx)}>
                          {aiGenerating ? 'Generating… (~15s)' : '✨ Generate & Add'}
                        </button>
                        {aiMsg && <span className="itc-ai-msg">{aiMsg}</span>}
                      </div>
                    </div>
                  )}
                  {questionSearchCategory === section.sectionType && availableQuestions.length > 0 && (
                    <div className="itc-question-list">
                      {availableQuestions.map(q => (
                        <label key={q._id} className="itc-question-item">
                          <input
                            type="checkbox"
                            checked={section.questionIds?.includes(q._id) || false}
                            onChange={() => toggleQuestionInSection(idx, q._id)}
                          />
                          <span>
                            <strong>[{q.difficulty}]</strong> {q.questionText.substring(0, 120)}
                            {q.topic && <em> — {q.topic}</em>}
                          </span>
                        </label>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {form.recordVideo && (
                <div className="itc-field">
                  <label>Interviewer Avatar (shown to the student during this section)</label>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                    {section.avatarImageUrl && (
                      <img src={section.avatarImageUrl} alt="avatar" style={{ width: 56, height: 56, borderRadius: '50%', objectFit: 'cover', border: '1px solid #e5e7eb' }} />
                    )}
                    <input type="file" accept="image/*" onChange={e => { const f = e.target.files?.[0]; if (f) handleAvatarUpload(idx, f); }} />
                    {section.avatarImageUrl && (
                      <button type="button" className="itc-btn-sm" onClick={() => updateSection(idx, 'avatarImageUrl', '')}>Remove</button>
                    )}
                  </div>
                </div>
              )}

              <div className="itc-field">
                <label>Section Instructions</label>
                <textarea value={section.instructions || ''} onChange={e => updateSection(idx, 'instructions', e.target.value)} rows={2} placeholder="Instructions shown to students before this section..." />
              </div>
            </div>
          ))}
        </section>

        {/* ── Submit ─────────────────────────────────────────── */}
        <div className="itc-form-actions">
          <button type="button" className="itc-btn-cancel" onClick={() => navigate('/admin/interviews/templates')}>Cancel</button>
          <button type="submit" className="itc-btn-save" disabled={saving}>
            {saving ? 'Saving...' : isEditing ? 'Update Template' : 'Create Template'}
          </button>
        </div>
      </form>
    </div>
  );
};

export default InterviewTemplateCreate;
