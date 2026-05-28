import React, { useState, useEffect, useCallback, useRef } from 'react';
import { CircularProgressbar, buildStyles } from 'react-circular-progressbar';
import 'react-circular-progressbar/dist/styles.css';
import { resumeApi, emptySections, ResumeData, ResumeSections, ResumeExperience, ResumeEducation, ResumeProject, ResumeSkillGroup, ResumeCertification } from '../../api/resumeApi';
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
  contact: { label: 'Contact', max: 10 },
  summary: { label: 'Summary', max: 15 },
  experience: { label: 'Experience', max: 20 },
  education: { label: 'Education', max: 15 },
  skills: { label: 'Skills', max: 20 },
  projects: { label: 'Projects', max: 10 },
  ats: { label: 'ATS', max: 10 },
};

// ── Score Panel ───────────────────────────────────────────────────────────────

const ScorePanel: React.FC<{ resume: ResumeData | null; scoring: boolean }> = ({ resume, scoring }) => {
  const score = resume?.score;

  if (scoring) return (
    <div className="rb-no-score">
      <div className="rb-spinner"><div className="spinner-ring" /><span>Analysing resume…</span></div>
    </div>
  );

  if (!score) return (
    <div className="rb-no-score">
      <div className="ns-icon">📊</div>
      <p>Fill in your resume and click<br /><strong>"Analyse Resume"</strong> to get your score.</p>
    </div>
  );

  const { total, breakdown, suggestions, atsWarnings, keywordsFound, keywordsMissing } = score;
  const grade = scoreGrade(total);

  return (
    <>
      <div className="rb-score-card">
        <div className="rb-score-ring">
          <CircularProgressbar
            value={total}
            text={`${total}`}
            styles={buildStyles({
              textSize: '28px',
              pathColor: scoreColor(total),
              textColor: scoreColor(total),
              trailColor: '#e2e8f0',
            })}
          />
        </div>
        <div className="rb-score-label">Resume Score</div>
        <div className={`rb-score-grade ${grade.cls}`}>{grade.label}</div>
      </div>

      <div className="rb-breakdown">
        <div className="rb-breakdown-title">Score Breakdown</div>
        {Object.entries(BREAKDOWN_LABELS).map(([key, meta]) => {
          const val = (breakdown as any)[key] ?? 0;
          const pct = (val / meta.max) * 100;
          return (
            <div key={key} className="rb-bar-row">
              <span className="rb-bar-label">{meta.label}</span>
              <div className="rb-bar-track">
                <div className="rb-bar-fill" style={{ width: `${pct}%`, background: scoreColor(pct) }} />
              </div>
              <span className="rb-bar-val">{val}/{meta.max}</span>
            </div>
          );
        })}
      </div>

      {suggestions.length > 0 && (
        <>
          <div className="rb-suggestions-title">Suggestions ({suggestions.length})</div>
          {suggestions.map((s, i) => (
            <div key={i} className="rb-suggestion">
              <div className="rb-suggestion-section">{s.section}</div>
              <div className="rb-suggestion-issue">⚠ {s.issue}</div>
              <div className="rb-suggestion-fix">💡 {s.fix}</div>
            </div>
          ))}
        </>
      )}

      {atsWarnings.length > 0 && (
        <>
          <div className="rb-suggestions-title" style={{ marginTop: 16 }}>ATS Warnings</div>
          {atsWarnings.map((w, i) => <div key={i} className="rb-ats-warn">🔒 {w}</div>)}
        </>
      )}

      {(keywordsFound.length > 0 || keywordsMissing.length > 0) && (
        <div style={{ marginTop: 16 }}>
          {keywordsFound.length > 0 && (
            <div className="rb-kw-section">
              <div className="rb-kw-title">✅ Keywords Found</div>
              <div className="rb-kw-chips">{keywordsFound.map(k => <span key={k} className="rb-kw-chip found">{k}</span>)}</div>
            </div>
          )}
          {keywordsMissing.length > 0 && (
            <div className="rb-kw-section">
              <div className="rb-kw-title">❌ Missing Keywords</div>
              <div className="rb-kw-chips">{keywordsMissing.map(k => <span key={k} className="rb-kw-chip missing">{k}</span>)}</div>
            </div>
          )}
        </div>
      )}
    </>
  );
};

// ── Resume Preview (PDF-style) ─────────────────────────────────────────────────

const ResumePreview: React.FC<{ sections: ResumeSections }> = ({ sections }) => {
  const { contact, summary, experience, education, skills, projects, certifications } = sections;
  return (
    <div className="rb-preview">
      {contact.name && <h2>{contact.name}</h2>}
      <div className="preview-contact">
        {[contact.email, contact.phone, contact.location].filter(Boolean).join(' · ')}
        {contact.linkedin && <> · <a href={contact.linkedin} target="_blank" rel="noopener noreferrer">LinkedIn</a></>}
        {contact.github && <> · <a href={contact.github} target="_blank" rel="noopener noreferrer">GitHub</a></>}
      </div>

      {summary && (
        <div className="preview-section">
          <div className="preview-section-title">Summary</div>
          <p style={{ margin: 0, fontSize: 11 }}>{summary}</p>
        </div>
      )}

      {experience.length > 0 && (
        <div className="preview-section">
          <div className="preview-section-title">Experience</div>
          {experience.map((e, i) => (
            <div key={i} style={{ marginBottom: 8 }}>
              <div className="preview-entry-title">{e.role}{e.company && ` — ${e.company}`}</div>
              <div className="preview-entry-sub">{e.from}{e.to ? ` – ${e.current ? 'Present' : e.to}` : ''}</div>
              {e.bullets.length > 0 && <ul>{e.bullets.filter(Boolean).map((b, j) => <li key={j}>{b}</li>)}</ul>}
            </div>
          ))}
        </div>
      )}

      {education.length > 0 && (
        <div className="preview-section">
          <div className="preview-section-title">Education</div>
          {education.map((e, i) => (
            <div key={i} style={{ marginBottom: 6 }}>
              <div className="preview-entry-title">{e.degree}</div>
              <div className="preview-entry-sub">{e.college}{e.year ? `, ${e.year}` : ''}{e.cgpa ? ` · CGPA: ${e.cgpa}` : ''}</div>
            </div>
          ))}
        </div>
      )}

      {skills.length > 0 && (
        <div className="preview-section">
          <div className="preview-section-title">Skills</div>
          {skills.map((sg, i) => (
            <div key={i} style={{ marginBottom: 4 }}>
              <strong style={{ fontSize: 11 }}>{sg.category}: </strong>
              {sg.items.map(s => <span key={s} className="preview-chip">{s}</span>)}
            </div>
          ))}
        </div>
      )}

      {projects.length > 0 && (
        <div className="preview-section">
          <div className="preview-section-title">Projects</div>
          {projects.map((p, i) => (
            <div key={i} style={{ marginBottom: 8 }}>
              <div className="preview-entry-title">{p.name}{p.link && <> · <a href={p.link} target="_blank" rel="noopener noreferrer" style={{ fontSize: 10 }}>Link</a></>}</div>
              {p.tech.length > 0 && <div className="preview-entry-sub">{p.tech.join(', ')}</div>}
              {p.description && <p style={{ margin: '2px 0 0', fontSize: 11 }}>{p.description}</p>}
            </div>
          ))}
        </div>
      )}

      {certifications.length > 0 && (
        <div className="preview-section">
          <div className="preview-section-title">Certifications</div>
          {certifications.map((c, i) => (
            <div key={i}><span className="preview-entry-title">{c.name}</span> — {c.issuer}{c.year ? `, ${c.year}` : ''}</div>
          ))}
        </div>
      )}
    </div>
  );
};

// ── Upload Tab ────────────────────────────────────────────────────────────────

const UploadTab: React.FC<{ onUploaded: (data: ResumeData) => void }> = ({ onUploaded }) => {
  const [dragging, setDragging] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);

  const handleFile = async (file: File) => {
    const ext = file.name.split('.').pop()?.toLowerCase();
    if (!['pdf', 'doc', 'docx'].includes(ext || '')) {
      setError('Only PDF or DOCX files are supported.');
      return;
    }
    try {
      setUploading(true);
      setError('');
      const res = await resumeApi.upload(file);
      onUploaded(res.data.data);
    } catch (err: any) {
      setError(err.response?.data?.message || 'Upload failed. Try again.');
    } finally {
      setUploading(false);
    }
  };

  const onDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragging(false);
    if (e.dataTransfer.files[0]) handleFile(e.dataTransfer.files[0]);
  };

  return (
    <div>
      <div
        className={`rb-upload-zone ${dragging ? 'drag' : ''}`}
        onDragOver={e => { e.preventDefault(); setDragging(true); }}
        onDragLeave={() => setDragging(false)}
        onDrop={onDrop}
        onClick={() => inputRef.current?.click()}
      >
        <input ref={inputRef} type="file" accept=".pdf,.doc,.docx" style={{ display: 'none' }} onChange={e => e.target.files?.[0] && handleFile(e.target.files[0])} />
        <div className="upload-icon">{uploading ? '⏳' : '📄'}</div>
        <h3>{uploading ? 'Uploading & Analysing…' : 'Upload Your Resume'}</h3>
        <p>{uploading ? 'AI is parsing and scoring your resume, please wait…' : 'Drag & drop or click — PDF or DOCX, max 10 MB'}</p>
      </div>

      {error && <div style={{ background: '#fef2f2', border: '1px solid #fecaca', borderRadius: 8, padding: '10px 14px', color: '#dc2626', fontSize: 13, marginBottom: 16 }}>{error}</div>}

      <div style={{ background: '#f0fdf4', border: '1.5px solid #bbf7d0', borderRadius: 12, padding: '14px 18px' }}>
        <div style={{ fontWeight: 700, color: '#166534', marginBottom: 8 }}>✅ What happens after upload</div>
        <ul style={{ margin: 0, paddingLeft: 18, color: '#166534', fontSize: 13, lineHeight: 1.8 }}>
          <li>AI extracts all sections from your resume</li>
          <li>Every section gets scored out of 100</li>
          <li>You get specific suggestions to improve each section</li>
          <li>ATS compatibility is checked</li>
          <li>Missing keywords are identified</li>
        </ul>
      </div>
    </div>
  );
};

// ── Builder Tab ───────────────────────────────────────────────────────────────

const BuilderTab: React.FC<{ sections: ResumeSections; onChange: (s: ResumeSections) => void }> = ({ sections, onChange }) => {
  const upd = (patch: Partial<ResumeSections>) => onChange({ ...sections, ...patch });

  // Contact
  const setContact = (key: string, val: string) => upd({ contact: { ...sections.contact, [key]: val } });

  // Experience
  const addExp = () => upd({ experience: [...sections.experience, { company: '', role: '', from: '', to: '', current: false, bullets: [''] }] });
  const setExp = (i: number, patch: Partial<ResumeExperience>) => {
    const exp = [...sections.experience];
    exp[i] = { ...exp[i], ...patch };
    upd({ experience: exp });
  };
  const removeExp = (i: number) => upd({ experience: sections.experience.filter((_, j) => j !== i) });
  const addBullet = (i: number) => setExp(i, { bullets: [...sections.experience[i].bullets, ''] });
  const setBullet = (ei: number, bi: number, val: string) => {
    const bullets = [...sections.experience[ei].bullets];
    bullets[bi] = val;
    setExp(ei, { bullets });
  };
  const removeBullet = (ei: number, bi: number) => setExp(ei, { bullets: sections.experience[ei].bullets.filter((_, j) => j !== bi) });

  // Education
  const addEdu = () => upd({ education: [...sections.education, { degree: '', college: '', university: '', year: '', cgpa: '' }] });
  const setEdu = (i: number, patch: Partial<ResumeEducation>) => {
    const edu = [...sections.education];
    edu[i] = { ...edu[i], ...patch };
    upd({ education: edu });
  };
  const removeEdu = (i: number) => upd({ education: sections.education.filter((_, j) => j !== i) });

  // Skills
  const [newSkillCat, setNewSkillCat] = useState('');
  const [newSkillItem, setNewSkillItem] = useState<Record<number, string>>({});
  const addSkillGroup = () => {
    if (!newSkillCat.trim()) return;
    upd({ skills: [...sections.skills, { category: newSkillCat.trim(), items: [] }] });
    setNewSkillCat('');
  };
  const removeSkillGroup = (i: number) => upd({ skills: sections.skills.filter((_, j) => j !== i) });
  const addSkillItem = (i: number) => {
    const val = (newSkillItem[i] || '').trim();
    if (!val) return;
    const skills = [...sections.skills];
    skills[i] = { ...skills[i], items: [...skills[i].items, val] };
    upd({ skills });
    setNewSkillItem(p => ({ ...p, [i]: '' }));
  };
  const removeSkillItem = (gi: number, si: number) => {
    const skills = [...sections.skills];
    skills[gi] = { ...skills[gi], items: skills[gi].items.filter((_, j) => j !== si) };
    upd({ skills });
  };

  // Projects
  const addProject = () => upd({ projects: [...sections.projects, { name: '', tech: [], description: '', link: '' }] });
  const setProject = (i: number, patch: Partial<ResumeProject>) => {
    const p = [...sections.projects];
    p[i] = { ...p[i], ...patch };
    upd({ projects: p });
  };
  const removeProject = (i: number) => upd({ projects: sections.projects.filter((_, j) => j !== i) });

  // Certifications
  const addCert = () => upd({ certifications: [...sections.certifications, { name: '', issuer: '', year: '' }] });
  const setCert = (i: number, patch: Partial<ResumeCertification>) => {
    const c = [...sections.certifications];
    c[i] = { ...c[i], ...patch };
    upd({ certifications: c });
  };
  const removeCert = (i: number) => upd({ certifications: sections.certifications.filter((_, j) => j !== i) });

  return (
    <div>
      {/* Contact */}
      <div className="rb-section">
        <div className="rb-section-header"><span className="rb-section-title">👤 Contact Information</span></div>
        <div className="rb-grid-2">
          <div className="rb-field"><label className="rb-label">Full Name</label><input className="rb-input" value={sections.contact.name} onChange={e => setContact('name', e.target.value)} placeholder="John Doe" /></div>
          <div className="rb-field"><label className="rb-label">Email</label><input className="rb-input" value={sections.contact.email} onChange={e => setContact('email', e.target.value)} placeholder="john@example.com" /></div>
          <div className="rb-field"><label className="rb-label">Phone</label><input className="rb-input" value={sections.contact.phone} onChange={e => setContact('phone', e.target.value)} placeholder="+91 9999999999" /></div>
          <div className="rb-field"><label className="rb-label">Location</label><input className="rb-input" value={sections.contact.location} onChange={e => setContact('location', e.target.value)} placeholder="Hyderabad, India" /></div>
          <div className="rb-field"><label className="rb-label">LinkedIn URL</label><input className="rb-input" value={sections.contact.linkedin} onChange={e => setContact('linkedin', e.target.value)} placeholder="https://linkedin.com/in/..." /></div>
          <div className="rb-field"><label className="rb-label">GitHub URL</label><input className="rb-input" value={sections.contact.github} onChange={e => setContact('github', e.target.value)} placeholder="https://github.com/..." /></div>
        </div>
        <div className="rb-field"><label className="rb-label">Portfolio / Website</label><input className="rb-input" value={sections.contact.portfolio} onChange={e => setContact('portfolio', e.target.value)} placeholder="https://yoursite.com" /></div>
      </div>

      {/* Summary */}
      <div className="rb-section">
        <div className="rb-section-header"><span className="rb-section-title">📝 Professional Summary</span></div>
        <div className="rb-field">
          <textarea className="rb-textarea" value={sections.summary} onChange={e => upd({ summary: e.target.value })} placeholder="2-3 lines: your role, years of experience, top skills and what you bring to a team…" rows={3} />
        </div>
      </div>

      {/* Experience */}
      <div className="rb-section">
        <div className="rb-section-header">
          <span className="rb-section-title">💼 Work Experience</span>
          <button className="rb-add-btn" onClick={addExp}>+ Add</button>
        </div>
        {sections.experience.map((exp, i) => (
          <div key={i} className="rb-entry">
            <div className="rb-grid-2">
              <div className="rb-field"><label className="rb-label">Job Title</label><input className="rb-input" value={exp.role} onChange={e => setExp(i, { role: e.target.value })} placeholder="Frontend Developer" /></div>
              <div className="rb-field"><label className="rb-label">Company</label><input className="rb-input" value={exp.company} onChange={e => setExp(i, { company: e.target.value })} placeholder="Acme Corp" /></div>
              <div className="rb-field"><label className="rb-label">From</label><input className="rb-input" value={exp.from} onChange={e => setExp(i, { from: e.target.value })} placeholder="Jan 2022" /></div>
              <div className="rb-field">
                <label className="rb-label">To</label>
                <input className="rb-input" value={exp.current ? 'Present' : exp.to} disabled={exp.current} onChange={e => setExp(i, { to: e.target.value })} placeholder="Dec 2023" />
                <label style={{ display: 'flex', alignItems: 'center', gap: 6, marginTop: 6, fontSize: 12, color: '#475569', cursor: 'pointer' }}>
                  <input type="checkbox" checked={exp.current} onChange={e => setExp(i, { current: e.target.checked, to: '' })} />
                  Currently working here
                </label>
              </div>
            </div>
            <div className="rb-field" style={{ marginTop: 8 }}>
              <label className="rb-label">Achievements / Responsibilities (add numbers & impact!)</label>
              {exp.bullets.map((b, bi) => (
                <div key={bi} className="rb-bullet-row">
                  <input className="rb-input" value={b} onChange={e => setBullet(i, bi, e.target.value)} placeholder="e.g. Reduced load time by 40% using lazy loading" />
                  <button className="rb-bullet-del" onClick={() => removeBullet(i, bi)}>×</button>
                </div>
              ))}
              <button className="rb-add-btn" style={{ marginTop: 4 }} onClick={() => addBullet(i)}>+ Add bullet</button>
            </div>
            <div className="rb-entry-actions"><button className="rb-remove-btn" onClick={() => removeExp(i)}>Remove</button></div>
          </div>
        ))}
        {sections.experience.length === 0 && <p style={{ color: '#94a3b8', fontSize: 13, margin: 0 }}>No experience added yet. Click "+ Add" above.</p>}
      </div>

      {/* Education */}
      <div className="rb-section">
        <div className="rb-section-header">
          <span className="rb-section-title">🎓 Education</span>
          <button className="rb-add-btn" onClick={addEdu}>+ Add</button>
        </div>
        {sections.education.map((edu, i) => (
          <div key={i} className="rb-entry">
            <div className="rb-grid-2">
              <div className="rb-field"><label className="rb-label">Degree / Qualification</label><input className="rb-input" value={edu.degree} onChange={e => setEdu(i, { degree: e.target.value })} placeholder="B.Tech Computer Science" /></div>
              <div className="rb-field"><label className="rb-label">College</label><input className="rb-input" value={edu.college} onChange={e => setEdu(i, { college: e.target.value })} placeholder="XYZ College of Engineering" /></div>
              <div className="rb-field"><label className="rb-label">University</label><input className="rb-input" value={edu.university} onChange={e => setEdu(i, { university: e.target.value })} placeholder="Osmania University" /></div>
              <div className="rb-field"><label className="rb-label">Year of Graduation</label><input className="rb-input" value={edu.year} onChange={e => setEdu(i, { year: e.target.value })} placeholder="2024" /></div>
              <div className="rb-field"><label className="rb-label">CGPA / Percentage</label><input className="rb-input" value={edu.cgpa} onChange={e => setEdu(i, { cgpa: e.target.value })} placeholder="8.5 / 85%" /></div>
            </div>
            <div className="rb-entry-actions"><button className="rb-remove-btn" onClick={() => removeEdu(i)}>Remove</button></div>
          </div>
        ))}
      </div>

      {/* Skills */}
      <div className="rb-section">
        <div className="rb-section-header"><span className="rb-section-title">🛠 Skills</span></div>
        {sections.skills.map((sg, i) => (
          <div key={i} className="rb-entry">
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
              <strong style={{ fontSize: 13, color: '#0f172a' }}>{sg.category}</strong>
              <button className="rb-remove-btn" onClick={() => removeSkillGroup(i)}>Remove group</button>
            </div>
            <div className="rb-skill-chips">
              {sg.items.map((item, si) => (
                <span key={si} className="rb-chip">{item}<button onClick={() => removeSkillItem(i, si)}>×</button></span>
              ))}
            </div>
            <div style={{ display: 'flex', gap: 8 }}>
              <input className="rb-input" style={{ flex: 1 }} value={newSkillItem[i] || ''} onChange={e => setNewSkillItem(p => ({ ...p, [i]: e.target.value }))} onKeyDown={e => e.key === 'Enter' && addSkillItem(i)} placeholder="Type skill and press Enter or Add" />
              <button className="rb-add-btn" onClick={() => addSkillItem(i)}>Add</button>
            </div>
          </div>
        ))}
        <div style={{ display: 'flex', gap: 8, marginTop: 8 }}>
          <input className="rb-input" value={newSkillCat} onChange={e => setNewSkillCat(e.target.value)} onKeyDown={e => e.key === 'Enter' && addSkillGroup()} placeholder="Group name: Languages / Frameworks / Tools…" />
          <button className="rb-add-btn" onClick={addSkillGroup}>+ Group</button>
        </div>
      </div>

      {/* Projects */}
      <div className="rb-section">
        <div className="rb-section-header">
          <span className="rb-section-title">🚀 Projects</span>
          <button className="rb-add-btn" onClick={addProject}>+ Add</button>
        </div>
        {sections.projects.map((proj, i) => (
          <div key={i} className="rb-entry">
            <div className="rb-grid-2">
              <div className="rb-field"><label className="rb-label">Project Name</label><input className="rb-input" value={proj.name} onChange={e => setProject(i, { name: e.target.value })} placeholder="LMS SaaS Platform" /></div>
              <div className="rb-field"><label className="rb-label">Live / GitHub Link</label><input className="rb-input" value={proj.link} onChange={e => setProject(i, { link: e.target.value })} placeholder="https://github.com/..." /></div>
            </div>
            <div className="rb-field"><label className="rb-label">Technologies Used (comma-separated)</label><input className="rb-input" value={proj.tech.join(', ')} onChange={e => setProject(i, { tech: e.target.value.split(',').map(t => t.trim()).filter(Boolean) })} placeholder="React, Node.js, MongoDB" /></div>
            <div className="rb-field"><label className="rb-label">Description (mention impact!)</label><textarea className="rb-textarea" rows={2} value={proj.description} onChange={e => setProject(i, { description: e.target.value })} placeholder="What it does and why it matters — e.g. 'Built an LMS used by 500+ students…'" /></div>
            <div className="rb-entry-actions"><button className="rb-remove-btn" onClick={() => removeProject(i)}>Remove</button></div>
          </div>
        ))}
      </div>

      {/* Certifications */}
      <div className="rb-section">
        <div className="rb-section-header">
          <span className="rb-section-title">🏅 Certifications</span>
          <button className="rb-add-btn" onClick={addCert}>+ Add</button>
        </div>
        {sections.certifications.map((cert, i) => (
          <div key={i} className="rb-entry">
            <div className="rb-grid-2">
              <div className="rb-field"><label className="rb-label">Certification Name</label><input className="rb-input" value={cert.name} onChange={e => setCert(i, { name: e.target.value })} placeholder="AWS Solutions Architect" /></div>
              <div className="rb-field"><label className="rb-label">Issuer</label><input className="rb-input" value={cert.issuer} onChange={e => setCert(i, { issuer: e.target.value })} placeholder="Amazon Web Services" /></div>
              <div className="rb-field"><label className="rb-label">Year</label><input className="rb-input" value={cert.year} onChange={e => setCert(i, { year: e.target.value })} placeholder="2024" /></div>
            </div>
            <div className="rb-entry-actions"><button className="rb-remove-btn" onClick={() => removeCert(i)}>Remove</button></div>
          </div>
        ))}
      </div>
    </div>
  );
};

// ── Main Page ─────────────────────────────────────────────────────────────────

const ResumeBuilder: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'upload' | 'build'>('upload');
  const [resume, setResume] = useState<ResumeData | null>(null);
  const [sections, setSections] = useState<ResumeSections>(emptySections());
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [scoring, setScoring] = useState(false);
  const [toast, setToast] = useState('');

  const showToast = (msg: string) => { setToast(msg); setTimeout(() => setToast(''), 3000); };

  useEffect(() => {
    resumeApi.getMy()
      .then(res => {
        if (res.data.data) {
          const r: ResumeData = res.data.data;
          setResume(r);
          setSections(r.sections);
          setActiveTab(r.mode === 'uploaded' ? 'upload' : 'build');
        }
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const handleUploaded = (data: ResumeData) => {
    setResume(data);
    setSections(data.sections);
    setActiveTab('build');
    showToast('✅ Resume uploaded and scored!');
  };

  const handleSave = async () => {
    try {
      setSaving(true);
      const res = await resumeApi.saveSections(sections);
      setResume(res.data.data);
      showToast('✅ Saved!');
    } catch { showToast('❌ Save failed'); }
    finally { setSaving(false); }
  };

  const handleScore = async () => {
    try {
      setSaving(true);
      const saveRes = await resumeApi.saveSections(sections);
      setResume(saveRes.data.data);
      setSaving(false);
      setScoring(true);
      const scoreRes = await resumeApi.score();
      setResume(prev => prev ? { ...prev, score: scoreRes.data.data.score, scoredAt: new Date().toISOString() } : prev);
      showToast('✅ Resume analysed!');
    } catch { showToast('❌ Scoring failed. Try again.'); }
    finally { setSaving(false); setScoring(false); }
  };

  if (loading) return (
    <div className="rb-page">
      <div className="rb-spinner" style={{ justifyContent: 'center', minHeight: '60vh' }}>
        <div className="spinner-ring" /><span>Loading your resume…</span>
      </div>
    </div>
  );

  return (
    <div className="rb-page">
      {/* Toast */}
      {toast && (
        <div style={{ position: 'fixed', top: 20, right: 24, background: '#1e3a5f', color: '#fff', padding: '12px 20px', borderRadius: 10, fontWeight: 600, fontSize: 14, zIndex: 9999, boxShadow: '0 4px 20px rgba(0,0,0,0.2)' }}>
          {toast}
        </div>
      )}

      <div className="rb-header">
        <h1>📄 Resume Builder</h1>
        <p>Upload your existing resume or build one from scratch — get an AI score and suggestions</p>
        {resume?.score && (
          <div style={{ marginTop: 10, fontSize: 13, opacity: 0.9 }}>
            Current score: <strong style={{ fontSize: 16, color: scoreColor(resume.score.total) }}>{resume.score.total}/100</strong>
            {resume.scoredAt && <> · Last scored {new Date(resume.scoredAt).toLocaleDateString()}</>}
            {` · v${resume.version}`}
          </div>
        )}
      </div>

      <div className="rb-tabs">
        <button className={`rb-tab ${activeTab === 'upload' ? 'active' : ''}`} onClick={() => setActiveTab('upload')}>📤 Upload Resume</button>
        <button className={`rb-tab ${activeTab === 'build' ? 'active' : ''}`} onClick={() => setActiveTab('build')}>🔨 Build Resume</button>
      </div>

      <div className="rb-body">
        {/* Left: form/upload */}
        <div className="rb-left">
          {activeTab === 'upload' ? (
            <UploadTab onUploaded={handleUploaded} />
          ) : (
            <>
              <BuilderTab sections={sections} onChange={setSections} />
              <div className="rb-actions">
                <button className="rb-btn-primary" onClick={handleScore} disabled={saving || scoring}>
                  {scoring ? '⏳ Analysing…' : saving ? '⏳ Saving…' : '🔍 Analyse Resume'}
                </button>
                <button className="rb-btn-secondary" onClick={handleSave} disabled={saving || scoring}>
                  {saving ? 'Saving…' : '💾 Save Draft'}
                </button>
              </div>
            </>
          )}
        </div>

        {/* Right: score + preview */}
        <div className="rb-right">
          <ScorePanel resume={resume} scoring={scoring} />
          <div style={{ marginTop: 20 }}>
            <div style={{ fontSize: 13, fontWeight: 700, color: '#475569', textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 10 }}>Preview</div>
            <ResumePreview sections={sections} />
          </div>
        </div>
      </div>
    </div>
  );
};

export default ResumeBuilder;
