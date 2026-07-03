import React, { useState, useEffect, useRef } from 'react';
import { CircularProgressbar, buildStyles } from 'react-circular-progressbar';
import 'react-circular-progressbar/dist/styles.css';
import {
  resumeApi, emptySections, ResumeData, ResumeSections, ResumeExperience,
  ResumeEducation, ResumeProject, ResumeCertification, ResumeTemplate, ResumeDesign,
} from '../../api/resumeApi';
import { ResumeDocument, TEMPLATES, FONT_OPTIONS } from './templates';
import './ResumeBuilder.css';

// ── Helpers ───────────────────────────────────────────────────────────────────

function scoreColor(n: number) {
  if (n >= 75) return '#16a34a';
  if (n >= 50) return '#d97706';
  return '#dc2626';
}
function scoreGrade(n: number) {
  if (n >= 80) return { label: 'Excellent', cls: 'green' };
  if (n >= 65) return { label: 'Good', cls: 'green' };
  if (n >= 50) return { label: 'Average', cls: 'amber' };
  return { label: 'Needs Work', cls: 'red' };
}

const BREAKDOWN_LABELS: Record<string, { label: string; max: number }> = {
  contact: { label: 'Content', max: 10 },
  summary: { label: 'Summary', max: 15 },
  experience: { label: 'Experience', max: 20 },
  education: { label: 'Education', max: 15 },
  skills: { label: 'Skills', max: 20 },
  projects: { label: 'Projects', max: 10 },
  ats: { label: 'ATS Friendliness', max: 10 },
};

// Section anchor used for "jump & highlight" from tips / suggestions
const SECTION_ANCHOR: Record<string, string> = {
  contact: 'rb-sec-contact',
  summary: 'rb-sec-summary',
  experience: 'rb-sec-experience',
  education: 'rb-sec-education',
  skills: 'rb-sec-skills',
  projects: 'rb-sec-projects',
  certifications: 'rb-sec-certifications',
  ats: 'rb-sec-contact',
};

function jumpTo(anchorId: string) {
  const el = document.getElementById(anchorId);
  if (!el) return;
  el.scrollIntoView({ behavior: 'smooth', block: 'center' });
  el.classList.add('rb-flash');
  setTimeout(() => el.classList.remove('rb-flash'), 1400);
}

function anchorForSuggestion(section: string): string {
  const k = (section || '').toLowerCase();
  const match = Object.keys(SECTION_ANCHOR).find(key => k.includes(key));
  return SECTION_ANCHOR[match || 'contact'];
}

// ── Score Panel (with clickable suggestions) ───────────────────────────────────

const ScorePanel: React.FC<{
  resume: ResumeData | null;
  scoring: boolean;
  onApplySuggestion: (section: string) => void;
}> = ({ resume, scoring, onApplySuggestion }) => {
  const score = resume?.score;

  if (scoring) return (
    <div className="rb-card rb-no-score">
      <div className="rb-spinner"><div className="spinner-ring" /><span>Analysing resume…</span></div>
    </div>
  );

  if (!score) return (
    <div className="rb-card rb-no-score">
      <div className="ns-icon">📊</div>
      <p>Fill in your resume and click<br /><strong>"Analyse Resume"</strong> to get your score.</p>
    </div>
  );

  const { total, breakdown, suggestions, atsWarnings, keywordsMissing } = score;
  const grade = scoreGrade(total);

  return (
    <div className="rb-card">
      <div className="rb-score-head">
        <span className="rb-score-title">Resume Score</span>
        <span className="rb-beta">Beta</span>
      </div>

      <div className="rb-score-row">
        <div className="rb-score-ring">
          <CircularProgressbar
            value={total}
            text={`${total}`}
            styles={buildStyles({
              textSize: '30px',
              pathColor: scoreColor(total),
              textColor: '#0f172a',
              trailColor: '#e2e8f0',
              strokeLinecap: 'round',
            })}
          />
        </div>
        <div className="rb-score-meta">
          <div className={`rb-score-grade ${grade.cls}`}>{grade.label}</div>
          <div className="rb-score-note">
            {total >= 65 ? 'Your resume is good, but can be improved even more.'
              : total >= 50 ? 'Decent start — apply the tips below to boost it.'
              : 'Needs work — follow the suggestions to improve fast.'}
          </div>
        </div>
      </div>

      <div className="rb-breakdown">
        <div className="rb-breakdown-title">Score Breakdown</div>
        {Object.entries(BREAKDOWN_LABELS).map(([key, meta]) => {
          const val = (breakdown as any)[key] ?? 0;
          const pct = Math.round((val / meta.max) * 100);
          return (
            <div key={key} className="rb-bar-row">
              <span className="rb-bar-label">{meta.label}</span>
              <div className="rb-bar-track">
                <div className="rb-bar-fill" style={{ width: `${pct}%`, background: scoreColor(pct) }} />
              </div>
              <span className="rb-bar-val">{pct}%</span>
            </div>
          );
        })}
      </div>

      {suggestions.length > 0 && (
        <div className="rb-suggestions" id="rb-suggestions">
          <div className="rb-suggestions-title">Suggestions ({suggestions.length})</div>
          {suggestions.map((s, i) => (
            <div key={i} className="rb-suggestion">
              <div className="rb-suggestion-body">
                <div className="rb-suggestion-section">{s.section}</div>
                <div className="rb-suggestion-issue">⚠ {s.issue}</div>
                <div className="rb-suggestion-fix">💡 {s.fix}</div>
              </div>
              <button className="rb-suggestion-apply" onClick={() => onApplySuggestion(s.section)}>
                Fix it →
              </button>
            </div>
          ))}
        </div>
      )}

      {atsWarnings.length > 0 && (
        <div className="rb-suggestions">
          <div className="rb-suggestions-title">ATS Warnings</div>
          {atsWarnings.map((w, i) => <div key={i} className="rb-ats-warn">🔒 {w}</div>)}
        </div>
      )}

      {keywordsMissing.length > 0 && (
        <div className="rb-kw-section">
          <div className="rb-kw-title">❌ Missing Keywords</div>
          <div className="rb-kw-chips">{keywordsMissing.map(k => <span key={k} className="rb-kw-chip missing">{k}</span>)}</div>
        </div>
      )}
    </div>
  );
};

// ── Live Resume Preview ─────────────────────────────────────────────────────

const ResumePreview: React.FC<{ sections: ResumeSections; template: ResumeTemplate; design?: ResumeDesign }> = ({ sections, template, design }) => (
  <div className="resume-print-area"><ResumeDocument sections={sections} template={template} design={design} /></div>
);

// ── Upload modal ────────────────────────────────────────────────────────────

const UploadModal: React.FC<{ onUploaded: (data: ResumeData) => void; onClose: () => void }> = ({ onUploaded, onClose }) => {
  const [dragging, setDragging] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);

  const handleFile = async (file: File) => {
    const ext = file.name.split('.').pop()?.toLowerCase();
    if (!['pdf', 'doc', 'docx'].includes(ext || '')) { setError('Only PDF or DOCX files are supported.'); return; }
    try {
      setUploading(true); setError('');
      const res = await resumeApi.upload(file);
      onUploaded(res.data.data);
    } catch (err: any) {
      setError(err.response?.data?.message || 'Upload failed. Try again.');
    } finally { setUploading(false); }
  };

  return (
    <div className="rb-modal-overlay" onClick={onClose}>
      <div className="rb-modal" onClick={e => e.stopPropagation()}>
        <div className="rb-modal-head">
          <h3>Upload existing resume</h3>
          <button className="rb-modal-close" onClick={onClose}>×</button>
        </div>
        <div
          className={`rb-upload-zone ${dragging ? 'drag' : ''}`}
          onDragOver={e => { e.preventDefault(); setDragging(true); }}
          onDragLeave={() => setDragging(false)}
          onDrop={e => { e.preventDefault(); setDragging(false); if (e.dataTransfer.files[0]) handleFile(e.dataTransfer.files[0]); }}
          onClick={() => inputRef.current?.click()}
        >
          <input ref={inputRef} type="file" accept=".pdf,.doc,.docx" style={{ display: 'none' }} onChange={e => e.target.files?.[0] && handleFile(e.target.files[0])} />
          <div className="upload-icon">{uploading ? '⏳' : '📄'}</div>
          <h3>{uploading ? 'Uploading & Analysing…' : 'Upload Your Resume'}</h3>
          <p>{uploading ? 'AI is parsing and scoring your resume…' : 'Drag & drop or click — PDF or DOCX, max 10 MB'}</p>
        </div>
        {error && <div className="rb-modal-error">{error}</div>}
        <p className="rb-modal-note">AI extracts your sections, scores each one, and gives improvement tips you can apply with one click.</p>
      </div>
    </div>
  );
};

// ── Section header with icon badge ────────────────────────────────────────────

const SectionHead: React.FC<{ icon: string; color: string; title: string; sub: string; right?: React.ReactNode }> =
  ({ icon, color, title, sub, right }) => (
    <div className="rb-sec-head">
      <span className="rb-sec-badge" style={{ background: color }}>{icon}</span>
      <div className="rb-sec-headtext">
        <div className="rb-sec-title">{title}</div>
        <div className="rb-sec-sub">{sub}</div>
      </div>
      {right && <div className="rb-sec-right">{right}</div>}
    </div>
  );

// ── Builder Form ──────────────────────────────────────────────────────────────

const BuilderForm: React.FC<{ sections: ResumeSections; onChange: (s: ResumeSections) => void }> = ({ sections, onChange }) => {
  const upd = (patch: Partial<ResumeSections>) => onChange({ ...sections, ...patch });
  const setContact = (key: string, val: string) => upd({ contact: { ...sections.contact, [key]: val } });

  const addExp = () => upd({ experience: [...sections.experience, { company: '', role: '', from: '', to: '', current: false, bullets: [''] }] });
  const setExp = (i: number, patch: Partial<ResumeExperience>) => { const e = [...sections.experience]; e[i] = { ...e[i], ...patch }; upd({ experience: e }); };
  const removeExp = (i: number) => upd({ experience: sections.experience.filter((_, j) => j !== i) });
  const addBullet = (i: number) => setExp(i, { bullets: [...sections.experience[i].bullets, ''] });
  const setBullet = (ei: number, bi: number, val: string) => { const b = [...sections.experience[ei].bullets]; b[bi] = val; setExp(ei, { bullets: b }); };
  const removeBullet = (ei: number, bi: number) => setExp(ei, { bullets: sections.experience[ei].bullets.filter((_, j) => j !== bi) });

  const addEdu = () => upd({ education: [...sections.education, { degree: '', college: '', university: '', year: '', cgpa: '' }] });
  const setEdu = (i: number, patch: Partial<ResumeEducation>) => { const e = [...sections.education]; e[i] = { ...e[i], ...patch }; upd({ education: e }); };
  const removeEdu = (i: number) => upd({ education: sections.education.filter((_, j) => j !== i) });

  const [newSkillCat, setNewSkillCat] = useState('');
  const [newSkillItem, setNewSkillItem] = useState<Record<number, string>>({});
  const addSkillGroup = () => { if (!newSkillCat.trim()) return; upd({ skills: [...sections.skills, { category: newSkillCat.trim(), items: [] }] }); setNewSkillCat(''); };
  const removeSkillGroup = (i: number) => upd({ skills: sections.skills.filter((_, j) => j !== i) });
  const addSkillItem = (i: number) => {
    const val = (newSkillItem[i] || '').trim(); if (!val) return;
    const s = [...sections.skills]; s[i] = { ...s[i], items: [...s[i].items, val] }; upd({ skills: s });
    setNewSkillItem(p => ({ ...p, [i]: '' }));
  };
  const removeSkillItem = (gi: number, si: number) => { const s = [...sections.skills]; s[gi] = { ...s[gi], items: s[gi].items.filter((_, j) => j !== si) }; upd({ skills: s }); };

  const addProject = () => upd({ projects: [...sections.projects, { name: '', tech: [], description: '', link: '' }] });
  const setProject = (i: number, patch: Partial<ResumeProject>) => { const p = [...sections.projects]; p[i] = { ...p[i], ...patch }; upd({ projects: p }); };
  const removeProject = (i: number) => upd({ projects: sections.projects.filter((_, j) => j !== i) });

  // Raw draft for the comma-separated tech field so typing "React, Node" keeps the
  // space after the comma (we only split→trim→dedupe when the field loses focus).
  const [techDraft, setTechDraft] = useState<Record<number, string>>({});
  const commitTech = (i: number) => {
    const raw = techDraft[i];
    if (raw === undefined) return;
    setProject(i, { tech: raw.split(',').map(t => t.trim()).filter(Boolean) });
    setTechDraft(d => { const n = { ...d }; delete n[i]; return n; });
  };

  const addCert = () => upd({ certifications: [...sections.certifications, { name: '', issuer: '', year: '' }] });
  const setCert = (i: number, patch: Partial<ResumeCertification>) => { const c = [...sections.certifications]; c[i] = { ...c[i], ...patch }; upd({ certifications: c }); };
  const removeCert = (i: number) => upd({ certifications: sections.certifications.filter((_, j) => j !== i) });

  return (
    <div className="rb-form">
      {/* Contact */}
      <div className="rb-card" id="rb-sec-contact">
        <SectionHead icon="👤" color="#dbeafe" title="Contact Information" sub="Add your personal and contact details" />
        <div className="rb-grid-2">
          <div className="rb-field"><label className="rb-label">Full Name</label><div className="rb-input-ic"><span>👤</span><input className="rb-input" value={sections.contact.name} onChange={e => setContact('name', e.target.value)} placeholder="John Doe" /></div></div>
          <div className="rb-field"><label className="rb-label">Email</label><div className="rb-input-ic"><span>✉️</span><input className="rb-input" value={sections.contact.email} onChange={e => setContact('email', e.target.value)} placeholder="john@example.com" /></div></div>
          <div className="rb-field"><label className="rb-label">Phone</label><div className="rb-input-ic"><span>📞</span><input className="rb-input" value={sections.contact.phone} onChange={e => setContact('phone', e.target.value)} placeholder="+91 99999 99999" /></div></div>
          <div className="rb-field"><label className="rb-label">Location</label><div className="rb-input-ic"><span>📍</span><input className="rb-input" value={sections.contact.location} onChange={e => setContact('location', e.target.value)} placeholder="Hyderabad, India" /></div></div>
          <div className="rb-field"><label className="rb-label">LinkedIn Profile</label><div className="rb-input-ic"><span>in</span><input className="rb-input" value={sections.contact.linkedin} onChange={e => setContact('linkedin', e.target.value)} placeholder="linkedin.com/in/…" /></div></div>
          <div className="rb-field"><label className="rb-label">GitHub Profile</label><div className="rb-input-ic"><span>🐙</span><input className="rb-input" value={sections.contact.github} onChange={e => setContact('github', e.target.value)} placeholder="github.com/…" /></div></div>
          <div className="rb-field"><label className="rb-label">Portfolio / Website</label><div className="rb-input-ic"><span>🌐</span><input className="rb-input" value={sections.contact.portfolio} onChange={e => setContact('portfolio', e.target.value)} placeholder="yoursite.dev" /></div></div>
          <div className="rb-field"><label className="rb-label">Professional Title</label><div className="rb-input-ic"><span>💼</span><input className="rb-input" value={sections.contact.title || ''} onChange={e => setContact('title', e.target.value)} placeholder="Full Stack Developer" /></div></div>
        </div>
      </div>

      {/* Summary */}
      <div className="rb-card" id="rb-sec-summary">
        <SectionHead icon="💬" color="#ede9fe" title="Professional Summary" sub="Write a brief summary about yourself" />
        <div className="rb-field">
          <textarea
            className="rb-textarea" rows={4} maxLength={500}
            value={sections.summary}
            onChange={e => upd({ summary: e.target.value })}
            placeholder="2–3 lines: your role, top skills, and what you bring to a team…"
          />
          <div className="rb-counter">{sections.summary.length} / 500</div>
        </div>
      </div>

      {/* Experience */}
      <div className="rb-card" id="rb-sec-experience">
        <SectionHead icon="💼" color="#dcfce7" title="Work Experience" sub="Add your work experience and responsibilities"
          right={<button className="rb-add-pill" onClick={addExp}>+ Add Experience</button>} />
        {sections.experience.map((exp, i) => (
          <div key={i} className="rb-entry">
            <div className="rb-entry-tools">
              <button className="rb-icon-btn danger" onClick={() => removeExp(i)} title="Delete">🗑</button>
            </div>
            <div className="rb-grid-2">
              <div className="rb-field"><label className="rb-label">Job Title</label><input className="rb-input" value={exp.role} onChange={e => setExp(i, { role: e.target.value })} placeholder="Frontend Developer" /></div>
              <div className="rb-field"><label className="rb-label">Company</label><div className="rb-input-ic"><span>🏢</span><input className="rb-input" value={exp.company} onChange={e => setExp(i, { company: e.target.value })} placeholder="Acme Corp" /></div></div>
              <div className="rb-field"><label className="rb-label">From</label><div className="rb-input-ic"><span>📅</span><input className="rb-input" value={exp.from} onChange={e => setExp(i, { from: e.target.value })} placeholder="Jan 2022" /></div></div>
              <div className="rb-field">
                <label className="rb-label">To</label>
                <div className="rb-input-ic"><span>📅</span><input className="rb-input" value={exp.current ? 'Present' : exp.to} disabled={exp.current} onChange={e => setExp(i, { to: e.target.value })} placeholder="Dec 2023" /></div>
                <label className="rb-check"><input type="checkbox" checked={exp.current} onChange={e => setExp(i, { current: e.target.checked, to: '' })} /> Currently working here</label>
              </div>
            </div>
            <div className="rb-field" style={{ marginTop: 8 }}>
              <label className="rb-label">Key Achievements / Responsibilities</label>
              {exp.bullets.map((b, bi) => (
                <div key={bi} className="rb-bullet-row">
                  <span className="rb-bullet-dot">•</span>
                  <input className="rb-input" value={b} onChange={e => setBullet(i, bi, e.target.value)} placeholder="e.g. Reduced load time by 40% using lazy loading" />
                  <button className="rb-bullet-del" onClick={() => removeBullet(i, bi)}>×</button>
                </div>
              ))}
              <button className="rb-add-text" onClick={() => addBullet(i)}>+ Add bullet</button>
            </div>
          </div>
        ))}
        {sections.experience.length === 0 && <p className="rb-empty-hint">No experience added yet. Click <b>+ Add Experience</b>.</p>}
      </div>

      {/* Education */}
      <div className="rb-card" id="rb-sec-education">
        <SectionHead icon="🎓" color="#fef3c7" title="Education" sub="Add your academic background"
          right={<button className="rb-add-pill" onClick={addEdu}>+ Add Education</button>} />
        {sections.education.map((edu, i) => (
          <div key={i} className="rb-entry">
            <div className="rb-entry-tools"><button className="rb-icon-btn danger" onClick={() => removeEdu(i)} title="Delete">🗑</button></div>
            <div className="rb-grid-2">
              <div className="rb-field"><label className="rb-label">Degree / Qualification</label><input className="rb-input" value={edu.degree} onChange={e => setEdu(i, { degree: e.target.value })} placeholder="B.Tech Computer Science" /></div>
              <div className="rb-field"><label className="rb-label">College</label><input className="rb-input" value={edu.college} onChange={e => setEdu(i, { college: e.target.value })} placeholder="XYZ College of Engineering" /></div>
              <div className="rb-field"><label className="rb-label">University</label><input className="rb-input" value={edu.university} onChange={e => setEdu(i, { university: e.target.value })} placeholder="Osmania University" /></div>
              <div className="rb-field"><label className="rb-label">Year of Graduation</label><input className="rb-input" value={edu.year} onChange={e => setEdu(i, { year: e.target.value })} placeholder="2024" /></div>
              <div className="rb-field"><label className="rb-label">CGPA / Percentage</label><input className="rb-input" value={edu.cgpa} onChange={e => setEdu(i, { cgpa: e.target.value })} placeholder="8.5 / 85%" /></div>
            </div>
          </div>
        ))}
        {sections.education.length === 0 && <p className="rb-empty-hint">No education added. Click <b>+ Add Education</b>.</p>}
      </div>

      {/* Skills */}
      <div className="rb-card" id="rb-sec-skills">
        <SectionHead icon="🛠" color="#cffafe" title="Skills" sub="Group your skills by category" />
        {sections.skills.map((sg, i) => (
          <div key={i} className="rb-entry">
            <div className="rb-skill-head"><strong>{sg.category}</strong><button className="rb-remove-text" onClick={() => removeSkillGroup(i)}>Remove group</button></div>
            <div className="rb-skill-chips">
              {sg.items.map((item, si) => <span key={si} className="rb-chip">{item}<button onClick={() => removeSkillItem(i, si)}>×</button></span>)}
            </div>
            <div className="rb-inline-add">
              <input className="rb-input" value={newSkillItem[i] || ''} onChange={e => setNewSkillItem(p => ({ ...p, [i]: e.target.value }))} onKeyDown={e => e.key === 'Enter' && addSkillItem(i)} placeholder="Type a skill and press Enter" />
              <button className="rb-add-pill" onClick={() => addSkillItem(i)}>Add</button>
            </div>
          </div>
        ))}
        <div className="rb-inline-add">
          <input className="rb-input" value={newSkillCat} onChange={e => setNewSkillCat(e.target.value)} onKeyDown={e => e.key === 'Enter' && addSkillGroup()} placeholder="Group name: Languages / Frameworks / Tools…" />
          <button className="rb-add-pill" onClick={addSkillGroup}>+ Group</button>
        </div>
      </div>

      {/* Projects */}
      <div className="rb-card" id="rb-sec-projects">
        <SectionHead icon="🚀" color="#fce7f3" title="Projects" sub="Showcase what you've built"
          right={<button className="rb-add-pill" onClick={addProject}>+ Add Project</button>} />
        {sections.projects.map((proj, i) => (
          <div key={i} className="rb-entry">
            <div className="rb-entry-tools"><button className="rb-icon-btn danger" onClick={() => removeProject(i)} title="Delete">🗑</button></div>
            <div className="rb-grid-2">
              <div className="rb-field"><label className="rb-label">Project Name</label><input className="rb-input" value={proj.name} onChange={e => setProject(i, { name: e.target.value })} placeholder="LMS SaaS Platform" /></div>
              <div className="rb-field"><label className="rb-label">Live / GitHub Link</label><input className="rb-input" value={proj.link} onChange={e => setProject(i, { link: e.target.value })} placeholder="https://github.com/…" /></div>
            </div>
            <div className="rb-field"><label className="rb-label">Technologies Used (comma-separated)</label><input className="rb-input" value={techDraft[i] ?? proj.tech.join(', ')} onChange={e => setTechDraft(d => ({ ...d, [i]: e.target.value }))} onBlur={() => commitTech(i)} placeholder="React, Node.js, MongoDB" /></div>
            <div className="rb-field"><label className="rb-label">Description (mention impact!)</label><textarea className="rb-textarea" rows={2} value={proj.description} onChange={e => setProject(i, { description: e.target.value })} placeholder="What it does and why it matters — e.g. 'Built an LMS used by 500+ students…'" /></div>
          </div>
        ))}
        {sections.projects.length === 0 && <p className="rb-empty-hint">No projects yet. Click <b>+ Add Project</b>.</p>}
      </div>

      {/* Certifications */}
      <div className="rb-card" id="rb-sec-certifications">
        <SectionHead icon="🏅" color="#ffedd5" title="Certifications" sub="Add certifications and credentials"
          right={<button className="rb-add-pill" onClick={addCert}>+ Add Certification</button>} />
        {sections.certifications.map((cert, i) => (
          <div key={i} className="rb-entry">
            <div className="rb-entry-tools"><button className="rb-icon-btn danger" onClick={() => removeCert(i)} title="Delete">🗑</button></div>
            <div className="rb-grid-2">
              <div className="rb-field"><label className="rb-label">Certification Name</label><input className="rb-input" value={cert.name} onChange={e => setCert(i, { name: e.target.value })} placeholder="AWS Solutions Architect" /></div>
              <div className="rb-field"><label className="rb-label">Issuer</label><input className="rb-input" value={cert.issuer} onChange={e => setCert(i, { issuer: e.target.value })} placeholder="Amazon Web Services" /></div>
              <div className="rb-field"><label className="rb-label">Year</label><input className="rb-input" value={cert.year} onChange={e => setCert(i, { year: e.target.value })} placeholder="2024" /></div>
            </div>
          </div>
        ))}
        {sections.certifications.length === 0 && <p className="rb-empty-hint">No certifications yet. Click <b>+ Add Certification</b>.</p>}
      </div>
    </div>
  );
};

// ── Main Page ─────────────────────────────────────────────────────────────────

const ResumeBuilder: React.FC = () => {
  const [step, setStep] = useState<'build' | 'preview'>('build');
  const [resume, setResume] = useState<ResumeData | null>(null);
  const [sections, setSections] = useState<ResumeSections>(emptySections());
  const [loading, setLoading] = useState(true);
  const [saveStatus, setSaveStatus] = useState<'saved' | 'saving' | 'dirty'>('saved');
  const [scoring, setScoring] = useState(false);
  const [improving, setImproving] = useState(false);
  const [toast, setToast] = useState('');
  const [template, setTemplate] = useState<ResumeTemplate>('classic');
  const [design, setDesign] = useState<ResumeDesign>({});
  const [sharing, setSharing] = useState(false);
  const [device, setDevice] = useState<'desktop' | 'mobile'>('desktop');
  const [menuOpen, setMenuOpen] = useState(false);
  const [showUpload, setShowUpload] = useState(false);

  const loadedRef = useRef(false);
  const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const showToast = (msg: string) => { setToast(msg); setTimeout(() => setToast(''), 3000); };

  useEffect(() => {
    resumeApi.getMy()
      .then(res => {
        if (res.data.data) {
          const r: ResumeData = res.data.data;
          setResume(r);
          setSections(r.sections);
          setTemplate(r.template || 'classic');
          setDesign(r.design || {});
        }
      })
      .catch(() => {})
      .finally(() => { setLoading(false); setTimeout(() => { loadedRef.current = true; }, 300); });
  }, []);

  // Debounced auto-save → drives the "All changes saved" indicator
  useEffect(() => {
    if (!loadedRef.current) return;
    setSaveStatus('dirty');
    if (saveTimer.current) clearTimeout(saveTimer.current);
    saveTimer.current = setTimeout(async () => {
      try {
        setSaveStatus('saving');
        const res = await resumeApi.saveSections(sections, template, design);
        setResume(res.data.data);
        setSaveStatus('saved');
      } catch { setSaveStatus('dirty'); }
    }, 1200);
    return () => { if (saveTimer.current) clearTimeout(saveTimer.current); };
  }, [sections, template, design]);

  const handleSelectTemplate = (t: ResumeTemplate) => setTemplate(t);
  const handleDownload = () => window.print();

  // Design panel styles
  const dLbl: React.CSSProperties = { fontSize: 12.5, fontWeight: 600, color: '#475569', display: 'block', marginBottom: 6 };
  const dRow: React.CSSProperties = { display: 'flex', gap: 6, flexWrap: 'wrap' };
  const dSel: React.CSSProperties = { width: '100%', border: '1px solid #cbd5e1', borderRadius: 8, padding: '9px 11px', fontSize: 13, marginTop: 6 };
  const dChip = (on: boolean): React.CSSProperties => ({ border: on ? '1.5px solid #4f46e5' : '1.5px solid #e2e8f0', background: on ? '#eef2ff' : '#fff', color: on ? '#4f46e5' : '#334155', borderRadius: 8, padding: '7px 12px', fontWeight: 700, fontSize: 12.5, cursor: 'pointer' });
  const setD = (patch: Partial<ResumeDesign>) => setDesign(d => ({ ...d, ...patch }));

  const handleSaveNow = async () => {
    try {
      setSaveStatus('saving');
      const res = await resumeApi.saveSections(sections, template, design);
      setResume(res.data.data);
      setSaveStatus('saved');
      showToast('✅ Draft saved');
    } catch { setSaveStatus('dirty'); showToast('❌ Save failed'); }
  };

  const handleShare = async () => {
    try {
      setSharing(true);
      await resumeApi.saveSections(sections, template, design);
      const res = await resumeApi.share();
      const url = `${window.location.origin}/resume/view/${res.data.data.shareToken}`;
      try { await navigator.clipboard.writeText(url); showToast('🔗 Share link copied!'); }
      catch { window.prompt('Copy your resume share link:', url); }
    } catch { showToast('❌ Could not create link.'); }
    finally { setSharing(false); setMenuOpen(false); }
  };

  const handleUploaded = (data: ResumeData) => {
    setResume(data); setSections(data.sections); setShowUpload(false); setStep('build');
    showToast('✅ Resume uploaded and scored!');
  };

  const handleScore = async () => {
    try {
      await resumeApi.saveSections(sections, template, design);
      setScoring(true);
      const scoreRes = await resumeApi.score();
      setResume(prev => prev ? { ...prev, score: scoreRes.data.data.score, scoredAt: new Date().toISOString() } : prev);
      showToast('✅ Resume analysed!');
      setTimeout(() => jumpTo('rb-suggestions'), 200);
    } catch { showToast('❌ Scoring failed. Try again.'); }
    finally { setScoring(false); }
  };

  // AI auto-fix — rewrites weak sections (summary, bullets, projects, skills), then re-scores.
  const handleImprove = async () => {
    if (improving) return;
    try {
      await resumeApi.saveSections(sections, template, design);
      setImproving(true);
      showToast('✨ AI is improving your resume…');
      const res = await resumeApi.improve();
      const improved = res.data.data.sections as ResumeSections;
      setSections(improved);
      setResume(prev => prev ? { ...prev, sections: improved, score: res.data.data.score, scoredAt: new Date().toISOString() } : prev);
      showToast('✨ Resume improved by AI — review the changes!');
      setTimeout(() => jumpTo('rb-suggestions'), 200);
    } catch { showToast('❌ Auto-fix failed. Try again.'); }
    finally { setImproving(false); }
  };

  // ── Actionable tips (click → apply & jump) ──────────────────────────────────
  const totalSkills = sections.skills.reduce((n, g) => n + g.items.length, 0);
  const tips: { id: string; label: string; done: boolean; action: () => void }[] = [
    {
      id: 'project', label: 'Add at least one project',
      done: sections.projects.length > 0,
      action: () => { setSections(s => ({ ...s, projects: [...s.projects, { name: '', tech: [], description: '', link: '' }] })); setStep('build'); setTimeout(() => jumpTo('rb-sec-projects'), 80); },
    },
    {
      id: 'cert', label: 'Include certifications',
      done: sections.certifications.length > 0,
      action: () => { setSections(s => ({ ...s, certifications: [...s.certifications, { name: '', issuer: '', year: '' }] })); setStep('build'); setTimeout(() => jumpTo('rb-sec-certifications'), 80); },
    },
    {
      id: 'skills', label: 'Add more skills',
      done: totalSkills >= 5,
      action: () => { setSections(s => (s.skills.length ? s : { ...s, skills: [{ category: 'Skills', items: [] }] })); setStep('build'); setTimeout(() => jumpTo('rb-sec-skills'), 80); },
    },
    {
      id: 'summary', label: 'Write a stronger summary',
      done: sections.summary.trim().length >= 120,
      action: () => { setStep('build'); setTimeout(() => jumpTo('rb-sec-summary'), 80); },
    },
    {
      id: 'experience', label: 'Add work experience',
      done: sections.experience.length > 0,
      action: () => { setSections(s => ({ ...s, experience: [...s.experience, { company: '', role: '', from: '', to: '', current: false, bullets: [''] }] })); setStep('build'); setTimeout(() => jumpTo('rb-sec-experience'), 80); },
    },
  ];
  const tipsRemaining = tips.filter(t => !t.done).length;

  // Apply an AI suggestion: add an entry if the section is empty, then jump+highlight
  const applySuggestion = (section: string) => {
    const k = (section || '').toLowerCase();
    setStep('build');
    if (k.includes('project') && sections.projects.length === 0)
      setSections(s => ({ ...s, projects: [...s.projects, { name: '', tech: [], description: '', link: '' }] }));
    else if (k.includes('cert') && sections.certifications.length === 0)
      setSections(s => ({ ...s, certifications: [...s.certifications, { name: '', issuer: '', year: '' }] }));
    else if (k.includes('experience') && sections.experience.length === 0)
      setSections(s => ({ ...s, experience: [...s.experience, { company: '', role: '', from: '', to: '', current: false, bullets: [''] }] }));
    else if (k.includes('education') && sections.education.length === 0)
      setSections(s => ({ ...s, education: [...s.education, { degree: '', college: '', university: '', year: '', cgpa: '' }] }));
    else if (k.includes('skill') && sections.skills.length === 0)
      setSections(s => ({ ...s, skills: [{ category: 'Skills', items: [] }] }));
    setTimeout(() => jumpTo(anchorForSuggestion(section)), 120);
  };

  if (loading) return (
    <div className="rb-page"><div className="rb-spinner center"><div className="spinner-ring" /><span>Loading your resume…</span></div></div>
  );

  const saveText = saveStatus === 'saving' ? 'Saving…' : saveStatus === 'dirty' ? 'Unsaved changes' : 'All changes saved';

  return (
    <div className="rb-page">
      {toast && <div className="rb-toast">{toast}</div>}
      {showUpload && <UploadModal onUploaded={handleUploaded} onClose={() => setShowUpload(false)} />}

      {/* Top bar */}
      <div className="rb-topbar">
        <div className="rb-steps">
          <button className={`rb-step ${step === 'build' ? 'active' : ''}`} onClick={() => setStep('build')}>
            <span className="rb-step-num">1</span> Build Resume
          </button>
          <button className={`rb-step ${step === 'preview' ? 'active' : ''}`} onClick={() => setStep('preview')}>
            <span className="rb-step-num">2</span> Preview &amp; Download
          </button>
        </div>
        <div className="rb-topactions">
          <span className={`rb-savestate ${saveStatus}`}>{saveStatus === 'saved' ? '✓ ' : ''}{saveText}</span>
          <button className="rb-tb-btn" onClick={handleSaveNow}>🖫 Save Draft</button>
          <button className="rb-tb-btn primary" onClick={handleDownload}>⬇ Download PDF</button>
          <div className="rb-menu">
            <button className="rb-tb-btn icon" onClick={() => setMenuOpen(o => !o)}>⋮</button>
            {menuOpen && (
              <div className="rb-menu-pop" onMouseLeave={() => setMenuOpen(false)}>
                <button onClick={() => { setShowUpload(true); setMenuOpen(false); }}>📤 Upload existing resume</button>
                <button onClick={handleShare} disabled={sharing}>{sharing ? '…' : '🔗 Copy share link'}</button>
                <button onClick={() => { setStep('preview'); setMenuOpen(false); }}>🎨 Choose template</button>
              </div>
            )}
          </div>
        </div>
      </div>

      {step === 'build' ? (
        <>
          <div className="rb-grid">
            {/* Left: form */}
            <div className="rb-col-left"><BuilderForm sections={sections} onChange={setSections} /></div>

            {/* Right: score + preview */}
            <div className="rb-col-right">
              <ScorePanel resume={resume} scoring={scoring} onApplySuggestion={applySuggestion} />
              {!resume?.score && (
                <button className="rb-analyse-btn" onClick={handleScore} disabled={scoring}>
                  {scoring ? '⏳ Analysing…' : '🔍 Analyse Resume'}
                </button>
              )}
              {resume?.score && (
                <button className="rb-analyse-btn ghost" onClick={handleScore} disabled={scoring}>
                  {scoring ? '⏳ Analysing…' : '🔄 Re-analyse Resume'}
                </button>
              )}
              <button
                className="rb-analyse-btn"
                onClick={handleImprove}
                disabled={improving || scoring}
                style={{ background: 'linear-gradient(90deg,#7c3aed,#4f46e5)' }}
                title="Let AI rewrite your summary, bullet points, project descriptions and skills to be ATS-optimised"
              >
                {improving ? '✨ Improving your resume…' : '✨ Auto-fix with AI'}
              </button>

              <div className="rb-card rb-preview-card">
                <div className="rb-preview-head">
                  <span className="rb-preview-title">Resume Preview</span>
                  <div className="rb-device-toggle">
                    <button className={device === 'desktop' ? 'active' : ''} onClick={() => setDevice('desktop')} title="Desktop">🖥</button>
                    <button className={device === 'mobile' ? 'active' : ''} onClick={() => setDevice('mobile')} title="Mobile">📱</button>
                  </div>
                </div>
                <div className={`rb-preview-frame ${device}`}>
                  <ResumePreview sections={sections} template={template} design={design} />
                </div>
              </div>
            </div>
          </div>

          {/* Bottom: clickable tips */}
          <div className="rb-tipsbar">
            <span className="rb-tips-title">💡 Tips to improve your resume</span>
            <div className="rb-tips-list">
              {tips.map(t => (
                <button key={t.id} className={`rb-tip ${t.done ? 'done' : ''}`} onClick={t.done ? undefined : t.action} disabled={t.done}>
                  <span className="rb-tip-check">{t.done ? '✓' : '+'}</span> {t.label}
                </button>
              ))}
            </div>
            <button className="rb-tips-cta" onClick={() => resume?.score ? jumpTo('rb-suggestions') : handleScore()}>
              ✦ {resume?.score ? 'View Suggestions' : 'Analyse Resume'}
            </button>
          </div>
        </>
      ) : (
        // ── Preview & Download step ──
        <div className="rb-preview-step">
          <div className="rb-card rb-template-picker">
            <div className="rb-block-label">Choose a Template</div>
            <div className="rb-template-grid">
              {TEMPLATES.map(t => (
                <button key={t.id} type="button" className={`rb-template-card ${template === t.id ? 'active' : ''}`} onClick={() => handleSelectTemplate(t.id)} title={t.blurb}>
                  <span className="rb-template-swatch" style={{ background: t.accent }} />
                  <span className="rb-template-name">{t.name}</span>
                  <span className="rb-template-blurb">{t.blurb}</span>
                </button>
              ))}
            </div>

            {/* Design customization */}
            <div style={{ marginTop: 18, borderTop: '1px solid #eef2f7', paddingTop: 14 }}>
              <div className="rb-block-label">Customize Design</div>
              <div style={{ display: 'grid', gap: 14, marginTop: 8 }}>
                <label>
                  <span style={dLbl}>Font style</span>
                  <select value={design.fontFamily || ''} onChange={e => setD({ fontFamily: e.target.value || undefined })} style={dSel}>
                    {FONT_OPTIONS.map(o => <option key={o.label} value={o.value}>{o.label}</option>)}
                  </select>
                </label>
                <div>
                  <span style={dLbl}>Font size</span>
                  <div style={dRow}>
                    {([['Small', 0.9], ['Normal', 1], ['Large', 1.12]] as [string, number][]).map(([t, v]) => (
                      <button key={t} type="button" style={dChip((design.scale || 1) === v)} onClick={() => setD({ scale: v })}>{t}</button>
                    ))}
                  </div>
                </div>
                <div>
                  <span style={dLbl}>Line spacing</span>
                  <div style={dRow}>
                    {([['Compact', 1.35], ['Normal', 1.5], ['Relaxed', 1.7]] as [string, number][]).map(([t, v]) => (
                      <button key={t} type="button" style={dChip(design.lineHeight === v)} onClick={() => setD({ lineHeight: v })}>{t}</button>
                    ))}
                  </div>
                </div>
                <div>
                  <span style={dLbl}>Header alignment</span>
                  <div style={dRow}>
                    {([['Left', 'left'], ['Center', 'center']] as [string, 'left' | 'center'][]).map(([t, v]) => (
                      <button key={t} type="button" style={dChip(design.align === v)} onClick={() => setD({ align: v })}>{t}</button>
                    ))}
                  </div>
                </div>
                <div>
                  <span style={dLbl}>LinkedIn / GitHub display</span>
                  <div style={dRow}>
                    <button type="button" style={dChip(design.showLinkUrls !== false)} onClick={() => setD({ showLinkUrls: true })}>Full links</button>
                    <button type="button" style={dChip(design.showLinkUrls === false)} onClick={() => setD({ showLinkUrls: false })}>Short labels</button>
                  </div>
                </div>
                <label style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  <span style={{ ...dLbl, marginBottom: 0 }}>Accent colour</span>
                  <input type="color" value={design.accent || '#1e3a5f'} onChange={e => setD({ accent: e.target.value })} style={{ width: 46, height: 32, border: '1px solid #cbd5e1', borderRadius: 8, cursor: 'pointer', padding: 2 }} />
                </label>
                <button type="button" style={{ ...dChip(false), alignSelf: 'flex-start' }} onClick={() => setDesign({})}>↺ Reset to template default</button>
              </div>
            </div>

            <div className="rb-preview-step-actions">
              <button className="rb-tb-btn" onClick={handleShare} disabled={sharing}>{sharing ? '…' : '🔗 Share Link'}</button>
              <button className="rb-tb-btn primary" onClick={handleDownload}>⬇ Download PDF</button>
            </div>
          </div>
          <div className="rb-card rb-bigpreview">
            <ResumePreview sections={sections} template={template} design={design} />
          </div>
        </div>
      )}
    </div>
  );
};

export default ResumeBuilder;
