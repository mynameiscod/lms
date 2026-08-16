import React, { useEffect, useState } from 'react';
import passportApi, {
  CompanyReadinessView, CompanyPreparationView, CompanySkillFitRow, EligibilityCriterionRow,
} from '../../api/passportApi';

/**
 * How ready this member is for this company — and how ready is not the same as allowed.
 *
 * FOUR NUMBERS, SIDE BY SIDE, NEVER ADDED UP. Company readiness, eligibility, role readiness
 * and coverage answer four different questions, and a student who is eligible but not ready
 * needs the opposite advice from one who is ready but not eligible. An average would tell
 * neither of them anything, so this screen shows them apart and says what each one means.
 *
 * NOTHING UNMEASURED IS DRAWN AS A ZERO. A skill this company wants that nobody has ever
 * assessed appears under "Needs validation" with no bar and no number. Rendering it as 0%
 * would put a student's most urgent effort into something they may already be good at, and
 * it is the single easiest mistake for a progress screen to make.
 */

const TONE: Record<string, { fg: string; bg: string; label: string }> = {
  STRONG:           { fg: '#166534', bg: '#dcfce7', label: 'Strong' },
  ON_TRACK:         { fg: '#166534', bg: '#dcfce7', label: 'On track' },
  NEEDS_WORK:       { fg: '#92400e', bg: '#fef3c7', label: 'Needs work' },
  PRIORITY_GAP:     { fg: '#991b1b', bg: '#fee2e2', label: 'Priority gap' },
  LIMITED_EVIDENCE: { fg: '#3730a3', bg: '#e0e7ff', label: 'Limited evidence' },
  NOT_ASSESSED:     { fg: '#475569', bg: '#f1f5f9', label: 'Not assessed' },
};

const VERDICT: Record<string, { fg: string; bg: string; label: string }> = {
  ELIGIBLE:             { fg: '#166534', bg: '#dcfce7', label: 'Eligible' },
  POTENTIALLY_ELIGIBLE: { fg: '#92400e', bg: '#fef3c7', label: 'Potentially eligible' },
  NOT_ELIGIBLE:         { fg: '#991b1b', bg: '#fee2e2', label: 'Not eligible' },
  UNKNOWN:              { fg: '#475569', bg: '#f1f5f9', label: 'Information unavailable' },
};

const CRITERION: Record<string, { icon: string; fg: string }> = {
  MET:     { icon: 'bi-check-circle-fill', fg: '#16a34a' },
  NOT_MET: { icon: 'bi-x-circle-fill', fg: '#dc2626' },
  UNKNOWN: { icon: 'bi-dash-circle', fg: '#94a3b8' },
};

const card: React.CSSProperties = {
  background: '#fff', border: '1px solid #eef0f7', borderRadius: 12, padding: 18, marginBottom: 16,
};

/**
 * One headline figure.
 *
 * `value` of null renders as a dash and a reason, never as 0 — see the note at the top.
 */
const Figure: React.FC<{ title: string; value: number | null | undefined; note: string; tone?: string }> =
  ({ title, value, note, tone }) => (
    <div style={{ flex: '1 1 150px', minWidth: 150 }}>
      <div style={{ fontSize: 11, fontWeight: 800, color: '#64748b', textTransform: 'uppercase', letterSpacing: '.06em' }}>
        {title}
      </div>
      <div style={{ fontSize: 30, fontWeight: 800, color: tone || '#0f172a', lineHeight: 1.15 }}>
        {value === null || value === undefined ? '—' : `${value}%`}
      </div>
      <div style={{ fontSize: 12, color: '#64748b' }}>{note}</div>
    </div>
  );

const SkillRow: React.FC<{ s: CompanySkillFitRow }> = ({ s }) => {
  const tone = TONE[s.status] || TONE.NOT_ASSESSED;
  const measured = s.studentScore !== null && s.countedInFit;
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '10px 0', borderBottom: '1px solid #f1f5f9' }}>
      <div style={{ flex: '1 1 auto', minWidth: 0 }}>
        <div style={{ fontWeight: 700, fontSize: 13.5, color: '#0f172a' }}>
          {s.skillName}
          {s.skillInactive && (
            <span style={{ marginLeft: 6, fontSize: 11, color: '#94a3b8' }}>(retired)</span>
          )}
        </div>
        <div style={{ fontSize: 11.5, color: '#64748b' }}>
          {/* The target is the company's bar, so a student can see what they are aiming at
              rather than assuming it is 100. */}
          Target {s.targetScore}
          {measured ? ` · You ${s.studentScore}` : ' · not measured yet'}
          {s.importance === 'ESSENTIAL' && ' · essential here'}
        </div>
      </div>
      {measured && (
        <div style={{ width: 110, height: 6, background: '#f1f5f9', borderRadius: 4, overflow: 'hidden', flex: '0 0 auto' }}>
          <div style={{
            width: `${Math.min(100, Math.round((s.studentScore! / (s.targetScore || 1)) * 100))}%`,
            height: '100%', background: tone.fg,
          }} />
        </div>
      )}
      <span style={{
        flex: '0 0 auto', fontSize: 11, fontWeight: 800, padding: '3px 8px', borderRadius: 20,
        color: tone.fg, background: tone.bg,
      }}>{tone.label}</span>
    </div>
  );
};

const Criterion: React.FC<{ c: EligibilityCriterionRow }> = ({ c }) => {
  const t = CRITERION[c.status] || CRITERION.UNKNOWN;
  return (
    <div style={{ display: 'flex', gap: 10, padding: '8px 0', borderBottom: '1px solid #f1f5f9' }}>
      <i className={`bi ${t.icon}`} style={{ color: t.fg, fontSize: 15, marginTop: 1 }} />
      <div style={{ minWidth: 0 }}>
        <div style={{ fontSize: 13, fontWeight: 700, color: '#0f172a' }}>
          {c.label} <span style={{ fontWeight: 500, color: '#64748b' }}>· {c.required}</span>
        </div>
        {/* The reason is never hidden, including when the reason is that we do not know. */}
        <div style={{ fontSize: 12, color: '#64748b' }}>{c.detail}</div>
      </div>
    </div>
  );
};

const CompanyReadinessTab: React.FC<{ slug: string }> = ({ slug }) => {
  const [r, setR] = useState<CompanyReadinessView | null>(null);
  const [prep, setPrep] = useState<CompanyPreparationView | null>(null);
  const [err, setErr] = useState('');
  const [busy, setBusy] = useState(true);

  useEffect(() => {
    let alive = true;
    setBusy(true); setErr('');
    Promise.all([passportApi.companyReadiness(slug), passportApi.companyPreparation(slug)])
      .then(([a, b]) => { if (alive) { setR(a); setPrep(b); } })
      .catch(e => { if (alive) setErr(e?.response?.data?.message || 'Could not load your readiness for this company.'); })
      .finally(() => { if (alive) setBusy(false); });
    return () => { alive = false; };
  }, [slug]);

  if (busy) return <div style={{ ...card, color: '#64748b' }}>Working out where you stand…</div>;
  if (err) return <div style={{ ...card, color: '#991b1b' }}>{err}</div>;
  if (!r) return null;

  const fit = r.fit;
  const el = r.eligibility;
  const verdict = VERDICT[el.verdict] || VERDICT.UNKNOWN;
  const role = r.roleReadiness;

  return (
    <div>
      {/* ── The four figures ── */}
      <div style={card}>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 18 }}>
          <Figure
            title={`${r.company.name} readiness`}
            value={fit.available ? fit.readiness : null}
            note={fit.available
              ? (fit.readiness === null
                  ? 'Nothing measured against this company yet'
                  : `${fit.classificationLabel} · ${fit.confidence?.toLowerCase()} confidence`)
              : 'Not configured yet'}
            tone="#2563eb"
          />
          <Figure
            title="Measured"
            value={fit.available ? (fit.coverage ?? null) : null}
            note="of what this company asks for"
          />
          <Figure
            title="Role readiness"
            value={role.available ? (role.readiness ?? null) : null}
            note={role.available ? (role.role?.name || 'Your target role') : 'Choose a target role'}
          />
          <div style={{ flex: '1 1 150px', minWidth: 150 }}>
            <div style={{ fontSize: 11, fontWeight: 800, color: '#64748b', textTransform: 'uppercase', letterSpacing: '.06em' }}>
              Eligibility
            </div>
            <span style={{
              display: 'inline-block', marginTop: 6, fontSize: 12.5, fontWeight: 800,
              padding: '5px 10px', borderRadius: 20, color: verdict.fg, background: verdict.bg,
            }}>{verdict.label}</span>
            <div style={{ fontSize: 12, color: '#64748b', marginTop: 4 }}>{el.message}</div>
          </div>
        </div>

        {/* Said plainly, because these two get confused constantly and the consequences of
            confusing them run in both directions. */}
        <p style={{ margin: '14px 0 0', fontSize: 12, color: '#94a3b8' }}>
          Readiness and eligibility are separate. Meeting the criteria does not mean you are prepared,
          and being well prepared does not override a published cut-off.
        </p>
      </div>

      {/* ── Why this number ── */}
      {fit.available && !!fit.skills?.length && (
        <div style={card}>
          <h3 style={{ margin: '0 0 4px', fontSize: 15, fontWeight: 800 }}>
            What {r.company.name} asks for
          </h3>
          <p style={{ margin: '0 0 10px', fontSize: 12, color: '#64748b' }}>
            Your measured level against this company's own target for each skill
            {fit.profileVersion ? ` · profile v${fit.profileVersion}` : ''}
            {fit.role && !fit.role.matched ? ' · general guidance, not role-specific' : ''}
          </p>
          {fit.skills.map(s => <SkillRow key={s.skillKey} s={s} />)}
        </div>
      )}

      {!fit.available && (
        <div style={card}>
          <h3 style={{ margin: '0 0 6px', fontSize: 15, fontWeight: 800 }}>Not configured yet</h3>
          {/* No fabricated 0%. The honest answer is that nobody has said what this company
              expects for this role. */}
          <p style={{ margin: 0, fontSize: 13, color: '#64748b' }}>{fit.message}</p>
        </div>
      )}

      {/* ── What to do next ── */}
      {prep?.available && (!!prep.focus.length || !!prep.validate.length) && (
        <div style={card}>
          <h3 style={{ margin: '0 0 4px', fontSize: 15, fontWeight: 800 }}>
            {prep.horizon === 'LONG_TERM' ? 'Building towards this' : 'Focus for this company'}
          </h3>
          <p style={{ margin: '0 0 12px', fontSize: 12, color: '#64748b' }}>
            {prep.horizon === 'LONG_TERM'
              ? 'You have time before placements. These are the foundations this company builds on.'
              : 'Most urgent first, based on how far each is from this company\'s target.'}
          </p>

          {prep.focus.map((f, i) => (
            <div key={f.skillKey} style={{ display: 'flex', gap: 10, padding: '8px 0', borderBottom: '1px solid #f1f5f9' }}>
              <span style={{
                flex: '0 0 22px', height: 22, borderRadius: 6, background: '#eff6ff', color: '#2563eb',
                fontSize: 12, fontWeight: 800, display: 'grid', placeItems: 'center',
              }}>{i + 1}</span>
              <div>
                <div style={{ fontSize: 13.5, fontWeight: 700 }}>{f.skillName}</div>
                <div style={{ fontSize: 12, color: '#64748b' }}>
                  You {f.current} · target {f.target}
                  {f.gap ? ` · ${f.gap} points to close` : ''}
                </div>
              </div>
            </div>
          ))}

          {!!prep.validate.length && (
            <div style={{ marginTop: 14 }}>
              <div style={{ fontSize: 12, fontWeight: 800, color: '#475569', marginBottom: 6 }}>
                Needs validation
              </div>
              {/* Deliberately a separate heading. These are unknowns, not weaknesses — telling
                  a student to "improve" something nobody has measured would be a guess. */}
              <p style={{ margin: '0 0 8px', fontSize: 12, color: '#64748b' }}>
                This company asks for these and we have not measured them yet. Take an assessment
                or a mock interview covering them to find out where you stand.
              </p>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                {prep.validate.map(v => (
                  <span key={v.skillKey} style={{
                    fontSize: 12, fontWeight: 700, padding: '4px 9px', borderRadius: 20,
                    background: '#f1f5f9', color: '#475569',
                  }}>{v.skillName}</span>
                ))}
              </div>
            </div>
          )}

          {!!prep.notes && (
            <p style={{ margin: '14px 0 0', fontSize: 13, color: '#334155' }}>{prep.notes}</p>
          )}
        </div>
      )}

      {/* ── Eligibility detail ── */}
      {!!el.criteria.length && (
        <div style={card}>
          <h3 style={{ margin: '0 0 10px', fontSize: 15, fontWeight: 800 }}>Eligibility criteria</h3>
          {el.criteria.map(c => <Criterion key={c.key} c={c} />)}
          {el.verdict === 'POTENTIALLY_ELIGIBLE' && (
            <p style={{ margin: '12px 0 0', fontSize: 12, color: '#64748b' }}>
              We could not check everything from your profile. That is not a rejection — confirm
              the unchecked items with your placement office before you apply.
            </p>
          )}
        </div>
      )}
    </div>
  );
};

export default CompanyReadinessTab;
