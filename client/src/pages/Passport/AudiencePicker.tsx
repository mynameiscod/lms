import React from 'react';

/**
 * Who a question is for — role, academic year, and course.
 *
 * EMPTY MEANS EVERYONE, on each axis independently. That is the rule the whole feature
 * rests on: a question with nothing ticked reaches every student, which is how all the
 * questions written before targeting existed continue to behave. Ticking "2nd Year" does
 * not exclude backend students; it excludes everyone who is not in their 2nd year.
 *
 * The three axes are ANDed. A question tagged {roles: [BACKEND], years: [2nd Year]} reaches
 * 2nd-year students aiming at backend, and nobody else — which is a much smaller audience
 * than it looks, and the reason the warning below exists.
 */

export interface Audience {
  audienceRoles: string[];
  audienceYears: string[];
  audienceCourses: string[];
  /**
   * Branch, and the last axis to arrive.
   *
   * Course was doing double duty: the paper builder read `branch || degree` into one
   * `course` value, so a question tagged "B.Tech" never reached a member who had a branch
   * recorded. The two are now separate on both sides.
   */
  audienceBranches: string[];
}

export const EMPTY_AUDIENCE: Audience = { audienceRoles: [], audienceYears: [], audienceCourses: [], audienceBranches: [] };

export const audienceSummary = (a?: Partial<Audience>): string => {
  const parts = [
    a?.audienceRoles?.length ? a.audienceRoles.join(', ') : '',
    a?.audienceYears?.length ? a.audienceYears.join(', ') : '',
    a?.audienceCourses?.length ? a.audienceCourses.join(', ') : '',
    a?.audienceBranches?.length ? a.audienceBranches.join(', ') : '',
  ].filter(Boolean);
  return parts.length ? parts.join(' · ') : 'Everyone';
};

const Row: React.FC<{
  label: string;
  hint: string;
  options: { key: string; label: string }[];
  chosen: string[];
  onToggle: (key: string) => void;
}> = ({ label, hint, options, chosen, onToggle }) => (
  <div className="aud-row">
    <div className="aud-label">
      {label}
      <small>{hint}</small>
    </div>
    <div className="aud-chips">
      {!options.length && <span className="aud-none">None configured</span>}
      {options.map(o => (
        <button
          key={o.key}
          type="button"
          className={`aud-chip${chosen.includes(o.key) ? ' on' : ''}`}
          onClick={() => onToggle(o.key)}
        >
          {o.label}
        </button>
      ))}
    </div>
  </div>
);

const AudiencePicker: React.FC<{
  value: Audience;
  options: { roles: { key: string; label: string }[]; years: string[]; courses: string[]; branches?: string[] };
  onChange: (next: Audience) => void;
  /** Poolsize for the chosen skill, when known — drives the thin-pool warning. */
  poolCount?: number;
}> = ({ value, options, onChange, poolCount }) => {
  const toggle = (field: keyof Audience, key: string) => {
    const cur = value[field] || [];
    onChange({
      ...value,
      [field]: cur.includes(key) ? cur.filter(k => k !== key) : [...cur, key],
    });
  };

  const targeted = !!(value.audienceRoles.length || value.audienceYears.length
    || value.audienceCourses.length || (value.audienceBranches || []).length);

  return (
    <div className="aud">
      <Row
        label="Roles" hint="Leave empty for every role"
        options={options.roles}
        chosen={value.audienceRoles}
        onToggle={k => toggle('audienceRoles', k)}
      />
      <Row
        label="Year" hint="Leave empty for every year"
        options={options.years.map(y => ({ key: y, label: y }))}
        chosen={value.audienceYears}
        onToggle={k => toggle('audienceYears', k)}
      />
      <Row
        label="Course" hint="Leave empty for every course"
        options={options.courses.map(c => ({ key: c, label: c }))}
        chosen={value.audienceCourses}
        onToggle={k => toggle('audienceCourses', k)}
      />

      <Row
        label="Branch" hint="Leave empty for every branch"
        options={(options.branches || []).map(b => ({ key: b, label: b }))}
        chosen={value.audienceBranches || []}
        onToggle={k => toggle('audienceBranches', k)}
      />

      <div className="aud-summary">
        Reaches: <b>{audienceSummary(value)}</b>
        {targeted && (
          <button type="button" className="aud-clear" onClick={() => onChange(EMPTY_AUDIENCE)}>
            Clear targeting
          </button>
        )}
      </div>

      {/*
        The honest caveat. Targeting divides an already-thin pool: aim four questions at
        three audiences and each group sees roughly one, which is the repetition this whole
        area exists to fix. Shown only when it actually applies.
      */}
      {targeted && poolCount !== undefined && poolCount < 12 && (
        <div className="aud-warn">
          This skill has only <b>{poolCount}</b> question{poolCount === 1 ? '' : 's'} in the pool.
          Narrowing them further means the students who match will see the same ones repeatedly —
          worth adding more before targeting these.
        </div>
      )}
    </div>
  );
};

export default AudiencePicker;
