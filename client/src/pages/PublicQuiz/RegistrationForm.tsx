import React, { useState } from 'react';
import { publicQuizApi } from '../../api';

interface Field {
  id: string;
  label: string;
  type: string;
  placeholder?: string;
  required?: boolean;
  options?: string[];
  eligibilityRule?: { operator: string; value: string };
}

interface Props {
  title: string;
  quizInfo?: any;
  form?: { fields: Field[] };
  primaryColor: string;
  slug: string;
  onRegistered: (submissionId: string, canTakeQuiz: boolean) => void;
  backToHomeUrl?: string;
}

const RegistrationForm: React.FC<Props> = ({ title, quizInfo, form, primaryColor, slug, onRegistered, backToHomeUrl }) => {
  const fields = form?.fields || [];
  const [values, setValues] = useState<Record<string, any>>({});
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [submitting, setSubmitting] = useState(false);
  const [apiError, setApiError] = useState('');

  const setValue = (id: string, val: any) => {
    setValues(prev => ({ ...prev, [id]: val }));
    if (errors[id]) setErrors(prev => { const n = { ...prev }; delete n[id]; return n; });
  };

  const validate = () => {
    const errs: Record<string, string> = {};
    fields.forEach(f => {
      if (f.required) {
        const v = values[f.id];
        if (!v || (typeof v === 'string' && !v.trim())) {
          errs[f.id] = `${f.label} is required`;
        }
      }
      if (f.type === 'email' && values[f.id]) {
        if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(values[f.id])) {
          errs[f.id] = 'Enter a valid email address';
        }
      }
    });
    return errs;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const errs = validate();
    if (Object.keys(errs).length) { setErrors(errs); return; }
    setSubmitting(true);
    setApiError('');
    try {
      const res = await publicQuizApi.register(slug, values);
      if (res.submissionId) {
        onRegistered(res.submissionId, res.canTakeQuiz !== false);
      } else {
        setApiError(res.message || 'Registration failed. Please try again.');
      }
    } catch (e: any) {
      setApiError(e.message);
    }
    setSubmitting(false);
  };

  return (
    <div className="pq-regform-page">
      <div className="pq-regform-card">
        {/* Header */}
        <div className="pq-regform-header" style={{ background: primaryColor }}>
          <h2>{title}</h2>
          {quizInfo && (
            <div className="pq-regform-meta">
              <span>📝 {quizInfo.totalQuestions} Questions</span>
              <span>⏱ {quizInfo.totalTime} Minutes</span>
              <span>⭐ {quizInfo.totalMarks} Marks</span>
            </div>
          )}
          <p>Fill in your details below to access the quiz</p>
        </div>

        <form onSubmit={handleSubmit} className="pq-regform-body">
          {apiError && <div className="alert alert-danger">{apiError}</div>}

          {fields.length === 0 ? (
            <div className="text-center text-muted py-4">No registration form configured.</div>
          ) : (
            fields.map(field => (
              <FieldInput
                key={field.id}
                field={field}
                value={values[field.id] ?? ''}
                onChange={val => setValue(field.id, val)}
                error={errors[field.id]}
              />
            ))
          )}

          <button
            type="submit"
            className="btn w-100 pq-regform-submit mt-2"
            style={{ background: primaryColor }}
            disabled={submitting}
          >
            {submitting ? 'Submitting...' : 'Continue to Quiz →'}
          </button>

          {backToHomeUrl && (
            <div className="text-center mt-3">
              <a href={backToHomeUrl} className="pq-regform-back-link">← Back to Home</a>
            </div>
          )}
        </form>
      </div>
    </div>
  );
};

interface FieldInputProps {
  field: Field;
  value: any;
  onChange: (val: any) => void;
  error?: string;
}

const FieldInput: React.FC<FieldInputProps> = ({ field, value, onChange, error }) => {
  const sharedProps = {
    className: `form-control${error ? ' is-invalid' : ''}`,
    placeholder: field.placeholder,
  };

  return (
    <div className="mb-3">
      <label className="form-label">
        {field.label}
        {field.required && <span className="text-danger ms-1">*</span>}
      </label>
      {(field.type === 'text' || field.type === 'email' || field.type === 'phone' || field.type === 'date') && (
        <input
          {...sharedProps}
          type={field.type === 'phone' ? 'tel' : field.type}
          value={value}
          onChange={e => onChange(e.target.value)}
        />
      )}
      {field.type === 'number' && (
        <input {...sharedProps} type="number" value={value} onChange={e => onChange(e.target.value)} />
      )}
      {field.type === 'textarea' && (
        <textarea {...sharedProps} rows={3} value={value} onChange={e => onChange(e.target.value)} />
      )}
      {field.type === 'upload' && (
        <input
          type="file"
          className={`form-control${error ? ' is-invalid' : ''}`}
          accept=".pdf,.doc,.docx,.jpg,.jpeg,.png"
          onChange={e => onChange(e.target.files?.[0] || null)}
        />
      )}
      {field.type === 'select' && (
        <select className={`form-select${error ? ' is-invalid' : ''}`} value={value} onChange={e => onChange(e.target.value)}>
          <option value="">— Select —</option>
          {(field.options || []).map(opt => <option key={opt} value={opt}>{opt}</option>)}
        </select>
      )}
      {field.type === 'radio' && (
        <div>
          {(field.options || []).map(opt => (
            <div key={opt} className="form-check">
              <input className="form-check-input" type="radio" name={field.id} value={opt} checked={value === opt} onChange={() => onChange(opt)} />
              <label className="form-check-label">{opt}</label>
            </div>
          ))}
        </div>
      )}
      {field.type === 'checkbox' && (
        <div>
          {(field.options || []).map(opt => (
            <div key={opt} className="form-check">
              <input
                className="form-check-input"
                type="checkbox"
                checked={Array.isArray(value) ? value.includes(opt) : false}
                onChange={e => {
                  const arr: string[] = Array.isArray(value) ? [...value] : [];
                  onChange(e.target.checked ? [...arr, opt] : arr.filter(v => v !== opt));
                }}
              />
              <label className="form-check-label">{opt}</label>
            </div>
          ))}
        </div>
      )}
      {error && <div className="invalid-feedback">{error}</div>}
    </div>
  );
};

export default RegistrationForm;
