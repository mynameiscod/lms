import React from 'react';
import { Candidate, PROFILE_SECTIONS } from '../../api/talentPoolApi';

/** One candidate's full profile — the same layout for the admin and for a placement office. */
const CandidateProfile: React.FC<{ c: Candidate }> = ({ c }) => {
  const show = (k: keyof Candidate, v: any) => (v == null || v === '' ? '—' : String(k).endsWith('Percent') ? `${v}%` : String(v));
  return (
    <div className="tp-profile">
      <div className="tp-links">
        {c.resumeUrl ? <a className="tp-btn primary" href={c.resumeUrl} target="_blank" rel="noreferrer"><i className="fa-solid fa-file-arrow-down" /> Resume</a> : <span className="tp-pill grey">No resume</span>}
        {c.linkedInUrl && <a className="tp-btn" href={c.linkedInUrl} target="_blank" rel="noreferrer"><i className="fa-brands fa-linkedin" /> LinkedIn</a>}
        {c.githubUrl && <a className="tp-btn" href={c.githubUrl} target="_blank" rel="noreferrer"><i className="fa-brands fa-github" /> GitHub</a>}
        {c.portfolioUrl && <a className="tp-btn" href={c.portfolioUrl} target="_blank" rel="noreferrer"><i className="fa-solid fa-globe" /> Portfolio</a>}
      </div>
      {PROFILE_SECTIONS.map(s => (
        <div key={s.title} className="tp-sec">
          <h5>{s.title}</h5>
          <dl>{s.fields.map(([k, label]) => <React.Fragment key={k}><dt>{label}</dt><dd>{show(k, c[k])}</dd></React.Fragment>)}</dl>
        </div>
      ))}
    </div>
  );
};

export default CandidateProfile;
