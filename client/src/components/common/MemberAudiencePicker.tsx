import React, { useEffect, useState } from 'react';
import passportApi, { AudienceOptions } from '../../api/passportApi';

/**
 * Who a piece of content is for.
 *
 * One component for the Thinking Lab bank and the Communication Lab, because "who sees
 * this" is the same question in both and an admin should not have to learn it twice.
 *
 * KNOWN VALUES ARE OFFERED AS CHIPS, drawn from what members actually hold plus the
 * configured onboarding choices. A typo here does not error — it silently narrows the
 * audience to nobody, and nobody reports content they were never shown.
 *
 * FREE TEXT STAYS AVAILABLE for a value no member has yet, which is a legitimate thing to
 * target ahead of a new intake.
 */

export interface MemberAudience {
  years: string[];
  courses: string[];
  branches: string[];
  roles: string[];
  stages: string[];
}

export const emptyMemberAudience = (): MemberAudience => ({
  years: [], courses: [], branches: [], roles: [], stages: [],
});

export const audienceIsOpen = (a?: MemberAudience | null): boolean =>
  !a || (!a.years?.length && !a.courses?.length && !a.branches?.length
    && !a.roles?.length && !a.stages?.length);

/** One line describing the reach, for a list row. */
export const audienceSummary = (a?: MemberAudience | null): string => {
  if (audienceIsOpen(a)) return 'Everyone';
  const bits: string[] = [];
  const add = (label: string, list?: string[]) => { if (list?.length) bits.push(`${label}: ${list.join(', ')}`); };
  add('Year', a!.years); add('Course', a!.courses); add('Branch', a!.branches);
  add('Role', a!.roles); add('Stage', a!.stages);
  return bits.join('  ·  ');
};

const AXES: { key: keyof MemberAudience; label: string; opt: keyof AudienceOptions }[] = [
  { key: 'years',    label: 'Year of study', opt: 'years' },
  { key: 'courses',  label: 'Course',        opt: 'courses' },
  { key: 'branches', label: 'Branch',        opt: 'branches' },
  { key: 'roles',    label: 'Target role',   opt: 'roles' },
  { key: 'stages',   label: 'Career stage',  opt: 'stages' },
];

const Axis: React.FC<{
  label: string; values: string[]; options?: string[]; onChange: (v: string[]) => void;
}> = ({ label, values, options, onChange }) => {
  const [text, setText] = useState('');
  const toggle = (v: string) =>
    onChange(values.includes(v) ? values.filter(x => x !== v) : [...values, v]);
  const addFree = () => {
    const v = text.trim();
    if (!v) return;
    if (!values.some(x => x.toLowerCase() === v.toLowerCase())) onChange([...values, v]);
    setText('');
  };
  const extras = values.filter(v => !(options || []).some(o => o.toLowerCase() === v.toLowerCase()));

  return (
    <div style={{ marginBottom: 13 }}>
      <span style={{ display: 'block', fontSize: 11, fontWeight: 800, color: '#64748b', marginBottom: 6 }}>
        {label}
        {!values.length && (
          <em style={{ fontStyle: 'normal', marginLeft: 8, fontSize: 10, fontWeight: 700, color: '#0f6f4d', background: '#e9f8f2', borderRadius: 99, padding: '2px 8px' }}>
            everyone
          </em>
        )}
      </span>
      <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
        {(options || []).map(o => (
          <button
            key={o} type="button" onClick={() => toggle(o)}
            style={{
              border: '1px solid ' + (values.includes(o) ? '#051d64' : '#dce4ef'),
              background: values.includes(o) ? '#051d64' : '#fff',
              color: values.includes(o) ? '#fff' : '#53637a',
              borderRadius: 99, padding: '5px 12px', fontSize: 11.5, fontWeight: 600, cursor: 'pointer',
            }}>
            {o}
          </button>
        ))}
        {extras.map(o => (
          <button
            key={o} type="button" onClick={() => toggle(o)} title="Not held by any member yet"
            style={{ border: '1px solid #237f91', background: '#237f91', color: '#fff', borderRadius: 99, padding: '5px 12px', fontSize: 11.5, fontWeight: 600, cursor: 'pointer' }}>
            {o}
          </button>
        ))}
      </div>
      <div style={{ display: 'flex', gap: 6, marginTop: 6, maxWidth: 320 }}>
        <input
          value={text} placeholder="Add another…" onChange={e => setText(e.target.value)}
          onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); addFree(); } }}
          style={{ flex: 1, border: '1px solid #dce4ef', borderRadius: 8, padding: '6px 9px', fontSize: 11.5 }} />
        <button type="button" onClick={addFree}
          style={{ border: '1px solid #dce4ef', background: '#fff', borderRadius: 8, padding: '0 12px', fontSize: 11.5, fontWeight: 700, color: '#051d64', cursor: 'pointer' }}>
          Add
        </button>
      </div>
    </div>
  );
};

const MemberAudiencePicker: React.FC<{
  value: MemberAudience;
  onChange: (a: MemberAudience) => void;
}> = ({ value, onChange }) => {
  const [options, setOptions] = useState<AudienceOptions | null>(null);

  useEffect(() => {
    // A convenience, not a requirement: free text still works if this fails, so a lookup
    // problem must not take the form down with it.
    passportApi.audienceOptions().then(setOptions).catch(() => setOptions(null));
  }, []);

  const a = { ...emptyMemberAudience(), ...(value || {}) };

  return (
    <div style={{ border: '1px solid #cde7eb', background: '#f9fdff', borderRadius: 12, padding: 14 }}>
      <b style={{ fontSize: 13, color: '#051d64' }}>Who gets this?</b>
      <p style={{ fontSize: 11.5, color: '#64748b', margin: '5px 0 12px', lineHeight: 1.55 }}>
        Leave an axis empty and it does not narrow anything. Values within one axis are OR&rsquo;d;
        different axes are AND&rsquo;d — so Year <i>2nd</i> plus Branch <i>CSE</i> means
        second-year CSE members only.
      </p>
      {AXES.map(ax => (
        <Axis
          key={ax.key}
          label={ax.label}
          values={a[ax.key] || []}
          options={options?.[ax.opt]}
          onChange={v => onChange({ ...a, [ax.key]: v })} />
      ))}
    </div>
  );
};

export default MemberAudiencePicker;
