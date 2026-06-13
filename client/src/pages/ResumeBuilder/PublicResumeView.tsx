import React, { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { resumeApi, ResumeSections, ResumeTemplate, ResumeDesign } from '../../api/resumeApi';
import { ResumeDocument } from './templates';
import './ResumeBuilder.css';

const PublicResumeView: React.FC = () => {
  const { token } = useParams<{ token: string }>();
  const [sections, setSections] = useState<ResumeSections | null>(null);
  const [template, setTemplate] = useState<ResumeTemplate>('classic');
  const [design, setDesign] = useState<ResumeDesign>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!token) { setLoading(false); return; }
    resumeApi.getPublic(token)
      .then(res => {
        setSections(res.data.data.sections);
        setTemplate(res.data.data.template || 'classic');
        setDesign(res.data.data.design || {});
      })
      .catch(() => setError('This resume link is invalid or no longer available.'))
      .finally(() => setLoading(false));
  }, [token]);

  if (loading) {
    return (
      <div className="rb-public-page">
        <div className="rb-spinner" style={{ justifyContent: 'center', padding: 60 }}>
          <div className="spinner-ring" /><span>Loading resume…</span>
        </div>
      </div>
    );
  }

  if (error || !sections) {
    return (
      <div className="rb-public-page">
        <div className="rb-public-error">{error || 'Resume not found'}</div>
      </div>
    );
  }

  return (
    <div className="rb-public-page">
      <div className="rb-public-bar">
        <span>📄 Shared Resume</span>
        <button className="rb-btn-primary sm" onClick={() => window.print()}>⬇️ Download PDF</button>
      </div>
      <div className="resume-print-area rb-public-doc">
        <ResumeDocument sections={sections} template={template} design={design} />
      </div>
    </div>
  );
};

export default PublicResumeView;
