import React, { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { quizApi } from '../../api';
import { Button, Input, Alert, Spinner, Modal } from '../../components/common';
import { Question } from '../../types';
import './QuestionBuilder.css';

interface QuestionForm {
  questionText: string;
  type: 'short_answer' | 'mcq_single' | 'mcq_multiple' | 'coding';
  marks: number;
  difficulty: 'easy' | 'medium' | 'hard';
  explanation: string;
  options: Array<{ text: string; isCorrect: boolean }>;
  testCases?: Array<{ input: string; output: string }>;
}

const QuestionBuilder: React.FC = () => {
  const { quizId } = useParams<{ quizId: string }>();
  const [questions, setQuestions] = useState<Question[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);

  const [form, setForm] = useState<QuestionForm>({
    questionText: '',
    type: 'mcq_single',
    marks: 1,
    difficulty: 'easy',
    explanation: '',
    options: [
      { text: '', isCorrect: true },
      { text: '', isCorrect: false }
    ],
    testCases: []
  });

  const loadQuestions = async () => {
    try {
      setLoading(true);
      if (!quizId) return;
      const res = await quizApi.getQuestionsWithAnswers(quizId);
      setQuestions(res.data || res || []);
    } catch (err: any) {
      setError(err.message || 'Failed to load questions');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadQuestions();
  }, [quizId]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setForm(prev => ({
      ...prev,
      [name]: name === 'marks' || name === 'difficulty' ? Number(value) : value
    }));
  };

  const handleOptionChange = (index: number, field: 'text' | 'isCorrect', value: any) => {
    let newOptions = [...form.options];
    if (field === 'text') {
      newOptions[index].text = value;
    } else {
      if (form.type === 'mcq_single') {
        newOptions = newOptions.map((opt, i) => ({
          ...opt,
          isCorrect: i === index
        }));
      } else {
        newOptions[index].isCorrect = value;
      }
    }
    setForm(prev => ({ ...prev, options: newOptions }));
  };

  const addOption = () => {
    setForm(prev => ({
      ...prev,
      options: [...prev.options, { text: '', isCorrect: false }]
    }));
  };

  const removeOption = (index: number) => {
    if (form.options.length > 2) {
      setForm(prev => ({
        ...prev,
        options: prev.options.filter((_, i) => i !== index)
      }));
    }
  };

  const handleTestCaseChange = (index: number, field: 'input' | 'output', value: string) => {
    const newTestCases = [...(form.testCases || [])];
    if (!newTestCases[index]) {
      newTestCases[index] = { input: '', output: '' };
    }
    newTestCases[index][field] = value;
    setForm(prev => ({ ...prev, testCases: newTestCases }));
  };

  const addTestCase = () => {
    setForm(prev => ({
      ...prev,
      testCases: [...(prev.testCases || []), { input: '', output: '' }]
    }));
  };

  const removeTestCase = (index: number) => {
    setForm(prev => ({
      ...prev,
      testCases: prev.testCases?.filter((_, i) => i !== index) || []
    }));
  };

  const handleSaveQuestion = async () => {
    try {
      setError('');

      if (!form.questionText.trim()) {
        setError('Question text is required');
        return;
      }

      if (form.type === 'mcq_single' || form.type === 'mcq_multiple') {
        if (form.options.some(opt => !opt.text.trim())) {
          setError('All options must have text');
          return;
        }
        if (!form.options.some(opt => opt.isCorrect)) {
          setError('At least one correct option must be selected');
          return;
        }
      }

      if (form.type === 'coding') {
        if (!form.testCases || form.testCases.length === 0) {
          setError('Coding questions must have at least one test case');
          return;
        }
      }

      if (editingId) {
        await quizApi.updateQuestion(quizId!, editingId, form);
        setSuccess('Question updated successfully');
      } else {
        await quizApi.createQuestion(quizId!, form);
        setSuccess('Question created successfully');
      }

      resetForm();
      setShowModal(false);
      loadQuestions();
    } catch (err: any) {
      setError(err.message || 'Failed to save question');
    }
  };

  const resetForm = () => {
    setForm({
      questionText: '',
      type: 'mcq_single',
      marks: 1,
      difficulty: 'easy',
      explanation: '',
      options: [
        { text: '', isCorrect: true },
        { text: '', isCorrect: false }
      ],
      testCases: []
    });
    setEditingId(null);
  };

  const handleEditQuestion = (question: Question) => {
    setForm({
      questionText: question.questionText,
      type: question.type as any,
      marks: question.marks,
      difficulty: question.difficulty as any,
      explanation: question.explanation || '',
      options: (question.options || []).map(opt => ({
        text: opt.text,
        isCorrect: opt.isCorrect !== undefined ? opt.isCorrect : false
      })),
      testCases: question.testCases as any
    });
    setEditingId(question._id);
    setShowModal(true);
  };

  const handleDeleteQuestion = async (id: string) => {
    if (!window.confirm('Are you sure you want to delete this question?')) return;

    try {
      await quizApi.deleteQuestion(quizId!, id);
      setSuccess('Question deleted successfully');
      loadQuestions();
    } catch (err: any) {
      setError(err.message || 'Failed to delete question');
    }
  };

  if (loading) return <Spinner fullScreen />;

  return (
    <div className="question-builder-page">
      <div className="page-header">
        <h1>❓ Question Builder</h1>
        <Button onClick={() => {
          resetForm();
          setShowModal(true);
        }} className="btn-primary">
          ➕ Add Question
        </Button>
      </div>

      {error && <Alert type="error" message={error} onClose={() => setError('')} />}
      {success && <Alert type="success" message={success} onClose={() => setSuccess('')} />}

      {/* Question Form Modal */}
      <Modal
        isOpen={showModal}
        onClose={() => {
          setShowModal(false);
          resetForm();
        }}
        title={editingId ? 'Edit Question' : 'Create New Question'}
        maxWidth="900px"
      >
        <div className="question-form">
          {/* Basic Information */}
          <div className="form-section">
            <h3>📋 Question Details</h3>

            <div className="form-group full">
              <label>Question Text *</label>
              <textarea
                name="questionText"
                value={form.questionText}
                onChange={handleInputChange}
                placeholder="Enter the question text"
                rows={4}
                className="textarea-input"
              />
            </div>

            <div className="form-grid">
              <div className="form-group">
                <label>Question Type *</label>
                <select
                  name="type"
                  value={form.type}
                  onChange={handleInputChange}
                  className="select-input"
                >
                  <option value="mcq_single">MCQ (Single Answer)</option>
                  <option value="mcq_multiple">MCQ (Multiple Answers)</option>
                  <option value="short_answer">Short Answer</option>
                  <option value="coding">Coding</option>
                </select>
              </div>

              <div className="form-group">
                <label>Marks *</label>
                <Input
                  type="number"
                  name="marks"
                  value={String(form.marks)}
                  onChange={handleInputChange}
                  min="1"
                />
              </div>

              <div className="form-group">
                <label>Difficulty Level</label>
                <select
                  name="difficulty"
                  value={form.difficulty}
                  onChange={handleInputChange}
                  className="select-input"
                >
                  <option value="easy">Easy</option>
                  <option value="medium">Medium</option>
                  <option value="hard">Hard</option>
                </select>
              </div>
            </div>

            <div className="form-group full">
              <label>Explanation</label>
              <textarea
                name="explanation"
                value={form.explanation}
                onChange={handleInputChange}
                placeholder="Explain the answer (optional)"
                rows={3}
                className="textarea-input"
              />
            </div>
          </div>

          {/* MCQ Options */}
          {(form.type === 'mcq_single' || form.type === 'mcq_multiple') && (
            <div className="form-section">
              <h3>
                {form.type === 'mcq_multiple' ? '📝 Options (Multiple Correct)' : '📝 Options'}
              </h3>

              <div className="options-list">
                {form.options.map((option, index) => (
                  <div key={index} className="option-group">
                    <div className="option-content">
                      <input
                        type={form.type === 'mcq_single' ? 'radio' : 'checkbox'}
                        checked={option.isCorrect}
                        onChange={(e) => handleOptionChange(index, 'isCorrect', e.target.checked)}
                        className="option-checkbox"
                      />
                      <input
                        type="text"
                        value={option.text}
                        onChange={(e) => handleOptionChange(index, 'text', e.target.value)}
                        placeholder={`Option ${index + 1}`}
                        className="option-input"
                      />
                    </div>
                    {form.options.length > 2 && (
                      <button
                        onClick={() => removeOption(index)}
                        className="btn-remove"
                      >
                        🗑️
                      </button>
                    )}
                  </div>
                ))}
              </div>

              <Button onClick={addOption} className="btn-secondary btn-sm">
                ➕ Add Option
              </Button>
            </div>
          )}

          {/* Coding Test Cases */}
          {form.type === 'coding' && (
            <div className="form-section">
              <h3>🧪 Test Cases</h3>

              <div className="test-cases-list">
                {form.testCases?.map((testCase, index) => (
                  <div key={index} className="test-case-group">
                    <div className="test-case-item">
                      <label>Input {index + 1}</label>
                      <textarea
                        value={testCase.input}
                        onChange={(e) => handleTestCaseChange(index, 'input', e.target.value)}
                        placeholder="Enter test input"
                        rows={2}
                        className="textarea-input"
                      />
                    </div>

                    <div className="test-case-item">
                      <label>Expected Output {index + 1}</label>
                      <textarea
                        value={testCase.output}
                        onChange={(e) => handleTestCaseChange(index, 'output', e.target.value)}
                        placeholder="Enter expected output"
                        rows={2}
                        className="textarea-input"
                      />
                    </div>

                    {(form.testCases?.length || 0) > 1 && (
                      <button
                        onClick={() => removeTestCase(index)}
                        className="btn-remove-test-case"
                      >
                        🗑️ Remove
                      </button>
                    )}
                  </div>
                ))}
              </div>

              <Button onClick={addTestCase} className="btn-secondary btn-sm">
                ➕ Add Test Case
              </Button>
            </div>
          )}

          <div className="form-actions">
            <Button onClick={() => {
              setShowModal(false);
              resetForm();
            }}>
              Cancel
            </Button>
            <Button onClick={handleSaveQuestion} className="btn-primary">
              {editingId ? '✏️ Update' : '✅ Create'} Question
            </Button>
          </div>
        </div>
      </Modal>

      {/* Questions List */}
      <div className="questions-list">
        {questions.length === 0 ? (
          <div className="empty-state">
            <h3>No questions yet</h3>
            <p>Add your first question to get started</p>
          </div>
        ) : (
          <div className="questions-table">
            <div className="table-header">
              <div className="col-number">No.</div>
              <div className="col-question">Question</div>
              <div className="col-type">Type</div>
              <div className="col-marks">Marks</div>
              <div className="col-difficulty">Difficulty</div>
              <div className="col-actions">Actions</div>
            </div>

            {questions.map((question, index) => (
              <div key={question._id} className="table-row">
                <div className="col-number">{index + 1}</div>
                <div className="col-question">{question.questionText}</div>
                <div className="col-type">
                  <span className={`badge ${question.type}`}>
                    {question.type.replace('_', ' ')}
                  </span>
                </div>
                <div className="col-marks">{question.marks}</div>
                <div className="col-difficulty">
                  <span className={`difficulty-badge ${question.difficulty}`}>
                    {question.difficulty}
                  </span>
                </div>
                <div className="col-actions">
                  <Button
                    onClick={() => handleEditQuestion(question)}
                    className="btn-sm btn-secondary"
                  >
                    ✏️
                  </Button>
                  <Button
                    onClick={() => handleDeleteQuestion(question._id)}
                    className="btn-sm btn-danger"
                  >
                    🗑️
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default QuestionBuilder;
