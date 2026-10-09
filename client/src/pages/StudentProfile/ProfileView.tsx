import React from 'react';
import { StudentProfileData } from '../../api/studentProfileAPI';
import './ProfileView.css';

/**
 * The saved profile, read-only.
 *
 * After saving, a student used to land back in the same six-step form they had just filled
 * in, with no way to see what they had actually saved short of stepping through it again.
 * This is that answer: every saved field, grouped as the form groups it, with an Edit Profile
 * button, and an Edit link per section that opens the form on that step. An empty field is
 * an "Add" link to the step that fills it, so the page is also the way to finish the profile.
 *
 * It renders only what the server returned, so it is always the persisted state — the parent
 * refreshes it from the save response and reloads it from the API on every visit.
 */

interface Props {
  profile: StudentProfileData;
  photoUrl: string | null;
  /** Opens the form, on `step` when given (1–6, the form's own numbering). */
  onEdit: (step?: number) => void;
  message?: string | null;
}

const hasValue = (v: unknown) => !(v === undefined || v === null || v === '' || (Array.isArray(v) && v.length === 0));

const date = (v?: string) => {
  if (!v) return '';
  const d = new Date(v);
  return Number.isNaN(d.getTime()) ? v : d.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
};
const pct = (v?: number) => (v === undefined || v === null ? '' : `${v}%`);
const host = (href: string) => href.replace(/^https?:\/\/(www\.)?/, '').replace(/\/$/, '');

/** One field. Empty, it offers to fill itself in rather than saying "no". */
const Field: React.FC<{ label: string; value: React.ReactNode; step: number; onEdit: (s: number) => void; wide?: boolean }> =
  ({ label, value, step, onEdit, wide }) => (
    <div className={`spv-field${wide ? ' wide' : ''}`}>
      <span className="spv-label">{label}</span>
      {hasValue(value)
        ? <span className="spv-value">{value}</span>
        : <button type="button" className="spv-add" onClick={() => onEdit(step)}><i className="bi bi-plus-circle" /> Add</button>}
    </div>
  );

const Section: React.FC<{ title: string; sub: string; icon: string; tone: string; step: number; onEdit: (s: number) => void; children: React.ReactNode }> =
  ({ title, sub, icon, tone, step, onEdit, children }) => (
    <section className={`spv-card tone-${tone}`}>
      <header className="spv-card-hd">
        <span className="spv-card-ic"><i className={`bi ${icon}`} /></span>
        <div className="spv-card-t"><h3>{title}</h3><small>{sub}</small></div>
        <button type="button" className="spv-edit-link" onClick={() => onEdit(step)} aria-label={`Edit ${title}`}>
          <i className="bi bi-pencil" /> <span>Edit</span>
        </button>
      </header>
      <div className="spv-fields">{children}</div>
    </section>
  );

const Chips: React.FC<{ items: string[]; tone?: string }> = ({ items, tone = 'navy' }) =>
  <div className={`spv-chips ${tone}`}>{items.map(i => <span key={i}>{i}</span>)}</div>;

const ProfileView: React.FC<Props> = ({ profile, photoUrl, onEdit, message }) => {
  const p: any = profile.personalInfo || {};
  const pro: any = profile.professionalProfiles || {};
  const ed: any = profile.education || {};
  const tech: any = profile.technicalBackground || {};
  const course: any = profile.courseInterest || {};
  const extra: any = profile.additionalInfo || {};

  const last = p.surname || p.lastName || '';
  const name = [p.firstName, p.middleName, last].filter(v => v && v !== '-').join(' ') || 'Your profile';
  const initials = (`${p.firstName?.[0] || ''}${(last && last !== '-' ? last : '')[0] || ''}`).toUpperCase() || 'U';
  const where = [p.city, p.state, p.country].filter(Boolean).join(', ');
  const completion = Math.max(0, Math.min(100, profile.profileCompletionPercentage || 0));
  const showInter = !!ed.highestQualification && ed.highestQualification !== '10th Standard';
  const headline = [ed.degree?.name || ed.highestQualification, ed.degree?.branch].filter(Boolean).join(' · ');

  const skills: string[] = [...(tech.programmingLanguages || []), ...(tech.technologies || [])];
  const links = [
    { key: 'linkedin', href: pro.linkedInUrl, icon: 'bi-linkedin', label: 'LinkedIn' },
    { key: 'github', href: pro.githubUrl, icon: 'bi-github', label: 'GitHub' },
    { key: 'portfolio', href: pro.portfolioUrl, icon: 'bi-globe2', label: 'Portfolio' },
  ];
  const linkCount = links.filter(l => l.href).length;

  // Completion ring
  const r = 30, circ = 2 * Math.PI * r, dash = circ - (completion / 100) * circ;
  const ringTone = completion >= 80 ? 'good' : completion >= 50 ? 'mid' : 'low';

  return (
    <div className="spv">
      {message && <div className="spv-saved" role="status"><i className="bi bi-check-circle-fill" /> {message}</div>}

      {/* ── Cover + identity ─────────────────────────────────────────── */}
      <section className="spv-hero">
        <div className="spv-cover" aria-hidden="true"><i /><i /><i /></div>
        <div className="spv-hero-body">
          <div className="spv-avatar">
            {photoUrl ? <img src={photoUrl} alt={name} /> : <span>{initials}</span>}
          </div>
          <div className="spv-id">
            <h1>{name}</h1>
            {headline && <p className="spv-headline">{headline}</p>}
            <div className="spv-meta">
              {p.email && <span><i className="bi bi-envelope" /> {p.email}</span>}
              {p.mobileNumber && <span><i className="bi bi-telephone" /> {p.mobileNumber}</span>}
              {where && <span><i className="bi bi-geo-alt" /> {where}</span>}
            </div>
          </div>
          <div className="spv-hero-side">
            <div className={`spv-ring ${ringTone}`} role="img" aria-label={`Profile ${completion}% complete`}>
              <svg viewBox="0 0 72 72" width="72" height="72">
                <circle cx="36" cy="36" r={r} className="track" />
                <circle cx="36" cy="36" r={r} className="fill" strokeDasharray={circ} strokeDashoffset={dash} transform="rotate(-90 36 36)" />
              </svg>
              <b>{completion}%</b>
            </div>
            <button type="button" className="spv-edit-btn" onClick={() => onEdit()}>
              <i className="bi bi-pencil-square" /> Edit Profile
            </button>
          </div>
        </div>
      </section>

      {/* ── At a glance ──────────────────────────────────────────────── */}
      <div className="spv-stats">
        <div className="spv-stat t-teal"><i className="bi bi-person-check" /><div><b>{completion}%</b><span>Profile complete</span></div></div>
        <div className="spv-stat t-violet"><i className="bi bi-code-slash" /><div><b>{skills.length}</b><span>Skills listed</span></div></div>
        <div className="spv-stat t-blue"><i className="bi bi-link-45deg" /><div><b>{linkCount}/3</b><span>Links connected</span></div></div>
        <div className={`spv-stat ${pro.resumeUrl ? 't-green' : 't-amber'}`}><i className="bi bi-file-earmark-person" /><div><b>{pro.resumeUrl ? 'Added' : 'Missing'}</b><span>Resume</span></div></div>
      </div>

      {completion < 80 && (
        <div className="spv-nudge">
          <i className="bi bi-stars" />
          <div><b>{80 - completion}% more and recruiters can find you</b><span>Fill in the fields marked “Add” — each one opens the right step.</span></div>
          <button type="button" onClick={() => onEdit()}>Finish profile <i className="bi bi-arrow-right" /></button>
        </div>
      )}

      <div className="spv-grid">
        <Section title="Personal information" sub="Who you are and how to reach you" icon="bi-person-vcard" tone="teal" step={1} onEdit={onEdit}>
          <Field label="Full name" value={name === 'Your profile' ? '' : name} step={1} onEdit={onEdit} />
          <Field label="Gender" value={p.gender} step={1} onEdit={onEdit} />
          <Field label="Date of birth" value={date(p.dateOfBirth)} step={1} onEdit={onEdit} />
          <Field label="Mobile" value={p.mobileNumber} step={1} onEdit={onEdit} />
          <Field label="Email" value={p.email} step={1} onEdit={onEdit} wide />
          <Field label="Location" value={where} step={1} onEdit={onEdit} />
          <Field label="Address" value={p.address} step={1} onEdit={onEdit} />
        </Section>

        <Section title="Professional profiles" sub="Where recruiters can see your work" icon="bi-briefcase" tone="blue" step={2} onEdit={onEdit}>
          <div className="spv-links wide">
            {links.map(l => l.href
              ? <a key={l.key} className={`spv-link ${l.key}`} href={l.href} target="_blank" rel="noopener noreferrer"><i className={`bi ${l.icon}`} /><span><b>{l.label}</b><small>{host(l.href)}</small></span><i className="bi bi-box-arrow-up-right go" /></a>
              : <button key={l.key} type="button" className={`spv-link empty ${l.key}`} onClick={() => onEdit(2)}><i className={`bi ${l.icon}`} /><span><b>{l.label}</b><small>Add your {l.label} link</small></span><i className="bi bi-plus-lg go" /></button>)}
          </div>
          <Field label="Resume" step={2} onEdit={onEdit} wide
                 value={pro.resumeUrl ? <a href={pro.resumeUrl} target="_blank" rel="noopener noreferrer" className="spv-resume"><i className="bi bi-file-earmark-pdf" /> View resume</a> : ''} />
        </Section>

        <Section title="Education" sub="Your qualifications" icon="bi-mortarboard" tone="violet" step={3} onEdit={onEdit}>
          <Field label="Highest qualification" value={ed.highestQualification} step={3} onEdit={onEdit} />
          <Field label="Current status" value={ed.currentStatus} step={3} onEdit={onEdit} />
          <Field label="Degree" value={[ed.degree?.name, ed.degree?.branch].filter(Boolean).join(' · ')} step={3} onEdit={onEdit} wide />
          <Field label="College" value={ed.degree?.college} step={3} onEdit={onEdit} />
          <Field label="University" value={ed.degree?.university} step={3} onEdit={onEdit} />
          <Field label="Percentage / CGPA" value={pct(ed.degree?.percentage)} step={3} onEdit={onEdit} />
          <Field label="Graduation year" value={ed.degree?.graduationYear} step={3} onEdit={onEdit} />
          {showInter && <Field label="Intermediate" wide step={3} onEdit={onEdit}
            value={[ed.intermediate?.college, ed.intermediate?.group, pct(ed.intermediate?.percentage), ed.intermediate?.yearOfPassing].filter(Boolean).join(' · ')} />}
          <Field label="10th class" wide step={3} onEdit={onEdit}
            value={[ed.tenthClass?.schoolName, pct(ed.tenthClass?.percentage), ed.tenthClass?.yearOfPassing].filter(Boolean).join(' · ')} />
        </Section>

        <Section title="Technical background" sub="What you can already build with" icon="bi-cpu" tone="navy" step={4} onEdit={onEdit}>
          <Field label="Experience level" value={tech.experienceLevel ? <span className="spv-level">{tech.experienceLevel}</span> : ''} step={4} onEdit={onEdit} />
          <Field label="Languages" wide step={4} onEdit={onEdit} value={tech.programmingLanguages?.length ? <Chips items={tech.programmingLanguages} tone="navy" /> : ''} />
          <Field label="Technologies" wide step={4} onEdit={onEdit} value={tech.technologies?.length ? <Chips items={tech.technologies} tone="teal" /> : ''} />
          <Field label="Previous courses" wide step={4} onEdit={onEdit} value={tech.previousCourses?.length ? <Chips items={tech.previousCourses} tone="violet" /> : ''} />
        </Section>

        <Section title="Course interest" sub="How you like to learn" icon="bi-bookmark-star" tone="amber" step={5} onEdit={onEdit}>
          <Field label="Interested course" value={course.interestedCourse} step={5} onEdit={onEdit} wide />
          <Field label="Learning mode" value={course.preferredLearningMode} step={5} onEdit={onEdit} />
          <Field label="Batch time" value={course.preferredBatchTime} step={5} onEdit={onEdit} />
        </Section>

        <Section title="Additional information" sub="A little more about your goals" icon="bi-flag" tone="green" step={6} onEdit={onEdit}>
          <Field label="Heard about us" step={6} onEdit={onEdit}
                 value={extra.howDidYouHear === 'Other' && extra.howDidYouHearOther ? `Other — ${extra.howDidYouHearOther}` : extra.howDidYouHear} />
          <Field label="Career goal" value={extra.careerGoal} step={6} onEdit={onEdit} wide />
        </Section>
      </div>
    </div>
  );
};

export default ProfileView;
