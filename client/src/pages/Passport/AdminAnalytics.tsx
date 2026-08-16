import React, { useCallback, useEffect, useState } from 'react';
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, Cell as BarCell,
} from 'recharts';
import passportApi, {
  AnalyticsEnvelope, ConfigHealthView, LaunchReadinessView, HealthFindingView,
} from '../../api/passportApi';
import {
  Cell, figure, countCell, percentCell, unavailableCell, coverageOf, reasonOf,
  SEVERITY, AREA_STATUS, LAUNCH_STATUS, RANGES, rangeParams,
} from './analyticsPresenters';

/**
 * CareerPilot analytics, for the admin.
 *
 * IT RENDERS; IT DOES NOT CALCULATE. Every figure on this screen was produced by the
 * server. Nothing here averages, classifies or derives a readiness — a percentage
 * recomputed in React would be a second opinion that disagrees with the API the first time
 * either changes, and the student-facing screens would then disagree with the admin's.
 *
 * FIVE STATES, NOT FOUR. Loading, error, unavailable, no-data and zero are different facts.
 * "0% improvement" and "nobody has reassessed yet" point at opposite decisions, so they
 * never share a rendering.
 *
 * TABS FETCH THEMSELVES. Opening the page loads the overview and nothing else; each tab
 * fetches once and is remembered, so switching back and forth costs no requests.
 */

type TabKey = 'overview' | 'students' | 'skills' | 'engagement' | 'placement' | 'rewards' | 'health';

const TABS: [TabKey, string][] = [
  ['overview', 'Overview'],
  ['students', 'Students'],
  ['skills', 'Skills'],
  ['engagement', 'Engagement'],
  ['placement', 'Placement readiness'],
  ['rewards', 'Rewards'],
  ['health', 'System health'],
];

/** Which API section each tab needs. `health` uses the two health endpoints instead. */
const SECTION: Partial<Record<TabKey, 'overview' | 'skills' | 'progress' | 'engagement' | 'economy' | 'placement'>> = {
  overview: 'overview',
  students: 'overview',
  skills: 'skills',
  engagement: 'engagement',
  placement: 'placement',
  rewards: 'economy',
};

const box: React.CSSProperties = {
  background: '#fff', border: '1px solid #eef0f7', borderRadius: 12, padding: 18, marginBottom: 16,
};

const TONE: Record<string, { fg: string; bg: string }> = {
  ok:   { fg: '#166534', bg: '#dcfce7' },
  warn: { fg: '#92400e', bg: '#fef3c7' },
  err:  { fg: '#991b1b', bg: '#fee2e2' },
  info: { fg: '#3730a3', bg: '#e0e7ff' },
};

/**
 * One figure.
 *
 * An unavailable or absent value renders as words plus its reason — never as a number, and
 * never as a dash a reader could mistake for zero.
 */
const Stat: React.FC<{ label: string; cell: Cell; hint?: string }> = ({ label, cell, hint }) => (
  <div style={{ flex: '1 1 170px', minWidth: 170 }}>
    <div style={{ fontSize: 11, fontWeight: 800, color: '#64748b', textTransform: 'uppercase', letterSpacing: '.06em' }}>
      {label}
    </div>
    <div
      style={{
        fontSize: cell.state === 'value' || cell.state === 'zero' ? 28 : 15,
        fontWeight: cell.state === 'value' || cell.state === 'zero' ? 800 : 600,
        color: cell.state === 'value' || cell.state === 'zero' ? '#0f172a' : '#64748b',
        lineHeight: 1.2, marginTop: 2,
      }}
    >
      {cell.display}
    </div>
    {(cell.note || hint) && (
      <div style={{ fontSize: 11.5, color: '#94a3b8', marginTop: 2 }}>{cell.note || hint}</div>
    )}
  </div>
);

/** A bar chart that is never the only representation — the table below carries the values. */
const Chart: React.FC<{ rows: { name: string; value: number }[]; colour?: string }> = ({ rows, colour }) => {
  if (!rows.length) return null;
  return (
    <div style={{ width: '100%', height: 220 }} aria-hidden="true">
      <ResponsiveContainer>
        <BarChart data={rows} margin={{ top: 8, right: 8, left: 0, bottom: 8 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#eef2f7" />
          <XAxis dataKey="name" tick={{ fontSize: 11 }} interval={0} angle={-18} textAnchor="end" height={54} />
          <YAxis tick={{ fontSize: 11 }} allowDecimals={false} />
          <Tooltip />
          <Bar dataKey="value" radius={[4, 4, 0, 0]}>
            {rows.map((_, i) => <BarCell key={i} fill={colour || '#2563eb'} />)}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
};

/** The table that makes a chart accessible, and readable on a phone. */
const Table: React.FC<{ head: string[]; rows: (string | number)[][]; empty: string }> =
  ({ head, rows, empty }) => {
    if (!rows.length) return <p style={{ fontSize: 13, color: '#64748b', margin: 0 }}>{empty}</p>;
    return (
      <div style={{ overflowX: 'auto' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13.5, minWidth: 340 }}>
          <thead>
            <tr>
              {head.map(h => (
                <th key={h} style={{ textAlign: 'left', fontSize: 11, textTransform: 'uppercase', letterSpacing: '.06em', color: '#64748b', borderBottom: '1px solid #e2e8f0', padding: '0 10px 6px 0' }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map((r, i) => (
              <tr key={i}>
                {r.map((c, j) => (
                  <td key={j} style={{ padding: '7px 10px 7px 0', borderBottom: '1px solid #f1f5f9', fontVariantNumeric: 'tabular-nums' }}>{c}</td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    );
  };

/** A metric the server cannot produce. Says so, says why, and shows no number. */
const Unavailable: React.FC<{ title: string; reason?: string }> = ({ title, reason }) => (
  <div style={{ ...box, borderStyle: 'dashed', background: '#f8fafc' }}>
    <div style={{ fontSize: 13.5, fontWeight: 800, color: '#475569' }}>{title}</div>
    <div style={{ fontSize: 13, fontWeight: 700, color: '#64748b', margin: '4px 0' }}>
      Not available for cohort analytics yet.
    </div>
    {reason && <p style={{ fontSize: 12.5, color: '#94a3b8', margin: 0 }}>{reason}</p>}
  </div>
);

const Pill: React.FC<{ tone: string; icon: string; label: string }> = ({ tone, icon, label }) => {
  const t = TONE[tone] || TONE.info;
  return (
    <span style={{
      display: 'inline-flex', alignItems: 'center', gap: 5, fontSize: 11.5, fontWeight: 800,
      padding: '3px 9px', borderRadius: 20, color: t.fg, background: t.bg, whiteSpace: 'nowrap',
    }}>
      {/* The word carries the meaning; the icon and colour only reinforce it. */}
      <i className={`bi ${icon}`} aria-hidden="true" />{label}
    </span>
  );
};

const AdminAnalytics: React.FC = () => {
  const [tab, setTab] = useState<TabKey>('overview');
  const [rangeKey, setRangeKey] = useState('30d');
  const [cache, setCache] = useState<Record<string, AnalyticsEnvelope>>({});
  const [health, setHealth] = useState<{ config: ConfigHealthView; launch: LaunchReadinessView } | null>(null);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState('');

  const days = RANGES.find(r => r.key === rangeKey)!.days;
  const section = SECTION[tab];
  const cacheKey = section ? `${section}:${rangeKey}` : 'health';

  const load = useCallback(async () => {
    setErr('');
    if (tab === 'health') {
      if (health) return;
      setBusy(true);
      try {
        const [config, launch] = await Promise.all([passportApi.configHealth(), passportApi.launchReadiness()]);
        setHealth({ config, launch });
      } catch (e: any) {
        setErr(e?.response?.data?.message || 'Could not load system health.');
      }
      setBusy(false);
      return;
    }
    if (!section || cache[cacheKey]) return;
    setBusy(true);
    try {
      // The range comes from the server's own bounded presets — the client never asks for a
      // window the API would refuse.
      const env = await passportApi.analytics(section, rangeParams(days));
      setCache(c => ({ ...c, [cacheKey]: env }));
    } catch (e: any) {
      setErr(e?.response?.data?.message || 'Could not load analytics.');
    }
    setBusy(false);
  }, [tab, section, cacheKey, cache, health, days]);

  useEffect(() => { load(); }, [load]);

  const env = section ? cache[cacheKey] : undefined;
  const d = env?.data;

  const stage = (key: string) => d?.stages?.find((s: any) => s.key === key);

  return (
    <div data-testid="cp-analytics">
      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center', marginBottom: 14 }}>
        <h2 style={{ fontSize: 18, fontWeight: 900, margin: 0, flex: '1 1 auto' }}>CareerPilot analytics</h2>
        <div role="group" aria-label="Date range" style={{ display: 'flex', gap: 6 }}>
          {RANGES.map(r => (
            <button
              key={r.key}
              className={`pm-btn${rangeKey === r.key ? ' primary' : ' ghost'}`}
              aria-pressed={rangeKey === r.key}
              onClick={() => setRangeKey(r.key)}
            >{r.label}</button>
          ))}
        </div>
      </div>

      <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginBottom: 16 }} role="tablist">
        {TABS.map(([k, label]) => (
          <button
            key={k} role="tab" aria-selected={tab === k}
            className={`pm-btn${tab === k ? ' primary' : ' ghost'}`}
            onClick={() => setTab(k)}
          >{label}</button>
        ))}
      </div>

      {busy && <div style={box} role="status">Loading…</div>}
      {!!err && <div style={{ ...box, color: '#991b1b' }} role="alert" data-testid="analytics-error">{err}</div>}

      {!busy && !err && env && (
        <p style={{ fontSize: 11.5, color: '#94a3b8', margin: '0 0 12px' }}>
          {new Date(env.range.from).toLocaleDateString('en-IN')} – {new Date(env.range.to).toLocaleDateString('en-IN')}
          {' · '}{env.range.timezone}{' · generated '}{new Date(env.generatedAt).toLocaleTimeString('en-IN')}
        </p>
      )}

      {/* ── Overview ── */}
      {!busy && !err && tab === 'overview' && d && (
        <>
          <div style={box}>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 18 }}>
              <Stat label="CareerPilot members" cell={countCell(d.cohorts?.members)} />
              <Stat label="Active members" cell={countCell(d.cohorts?.active)} hint="Entitlement live now" />
              <Stat label="Onboarding completion" cell={percentCell(d.metrics?.find((m: any) => m.key === 'onboarding_completion')?.value, { denominator: d.cohorts?.members })} />
              <Stat label="Assessment completion" cell={percentCell(d.metrics?.find((m: any) => m.key === 'assessment_completion')?.value, { denominator: d.cohorts?.members })} />
              <Stat label="Roadmap adoption" cell={percentCell(d.metrics?.find((m: any) => m.key === 'roadmap_adoption')?.value, { denominator: d.cohorts?.members })} />
              <Stat label="Active last 7 days" cell={percentCell(d.metrics?.find((m: any) => m.key === 'active_7d')?.value, { denominator: d.cohorts?.members })} hint="Rolling 7 days, not the range" />
              <Stat
                label="Reassessment participation"
                cell={percentCell(d.metrics?.find((m: any) => m.key === 'reassessment_participation')?.value,
                  { emptyNote: 'Nobody has completed a first assessment yet.' })}
              />
            </div>
          </div>

          <div style={box}>
            <h3 style={{ fontSize: 15, fontWeight: 800, margin: '0 0 4px' }}>Learning funnel</h3>
            <p style={{ fontSize: 12, color: '#64748b', margin: '0 0 12px' }}>
              Counts, and each as a share of all CareerPilot members — never of the stage above.
            </p>
            <Chart rows={(d.stages || []).map((s: any) => ({ name: s.label, value: s.count }))} />
            <Table
              head={['Stage', 'Members', 'Share of members', 'Source']}
              rows={(d.stages || []).map((s: any) => [
                s.label,
                countCell(s.count).display,
                percentCell(s.shareOfMembers, { denominator: d.cohorts?.members }).display,
                s.source,
              ])}
              empty="No members yet, so there is nothing to measure."
            />
          </div>
        </>
      )}

      {/* ── Students ── */}
      {!busy && !err && tab === 'students' && d && (
        <div style={box}>
          <h3 style={{ fontSize: 15, fontWeight: 800, margin: '0 0 10px' }}>Member cohorts</h3>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 18, marginBottom: 14 }}>
            <Stat label="Members" cell={countCell(d.cohorts?.members)} />
            <Stat label="Active" cell={countCell(d.cohorts?.active)} hint="Entitlement live now" />
            <Stat label="Free" cell={countCell(d.cohorts?.free)} hint="Never activated a membership" />
            <Stat label="Expired" cell={countCell(d.cohorts?.expired)} hint="Was entitled, no longer" />
            <Stat label="Onboarded" cell={countCell(d.cohorts?.onboarded)} hint="Finished career context" />
          </div>
          <Table
            head={['Cohort', 'Members', 'Meaning']}
            rows={[
              ['Member', countCell(d.cohorts?.members).display, 'Ever enrolled, free or paid'],
              ['Active', countCell(d.cohorts?.active).display, 'Membership entitlement is live'],
              ['Free', countCell(d.cohorts?.free).display, 'Enrolled, never activated a membership'],
              ['Expired', countCell(d.cohorts?.expired).display, 'Was entitled, is not now'],
              ['Onboarded', countCell(d.cohorts?.onboarded).display, 'Completed CareerPilot career context'],
            ]}
            empty="No members yet."
          />
          <p style={{ fontSize: 12, color: '#94a3b8', marginTop: 12 }}>
            Career stage and role distribution are not exposed by the analytics API yet.
          </p>
        </div>
      )}

      {/* ── Skills ── */}
      {!busy && !err && tab === 'skills' && d && (
        <>
          <div style={box}>
            <h3 style={{ fontSize: 15, fontWeight: 800, margin: '0 0 10px' }}>Blueprint coverage</h3>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 18 }}>
              <Stat label="Roles offered" cell={countCell(d.blueprints?.selectableRoles)} />
              <Stat
                label="Effective blueprint"
                cell={countCell(d.blueprints?.effectiveBlueprintAvailable)}
                hint="Resolves at runtime, possibly from a default"
              />
              <Stat
                label="Tenant-authored"
                cell={countCell(d.blueprints?.tenantAuthoredBlueprint)}
                hint="Your own stored blueprint"
              />
            </div>
          </div>

          <div style={box}>
            <h3 style={{ fontSize: 15, fontWeight: 800, margin: '0 0 4px' }}>Top skill gaps</h3>
            <p style={{ fontSize: 12, color: '#64748b', margin: '0 0 12px' }}>
              Members measured below the strictest target any offered role sets for that skill.
            </p>
            <Chart rows={(d.topGaps || []).map((s: any) => ({ name: s.skillName, value: s.gapCount }))} colour="#dc2626" />
            <Table
              head={['Skill', 'Members with a gap', 'Average (assessed only)', 'Target']}
              rows={(d.topGaps || []).map((s: any) => [
                s.skillName, s.gapCount,
                // Null means nobody is sufficiently assessed — never rendered as 0.
                percentCell(s.averageScore).state === 'no-data' ? 'Not assessed' : String(s.averageScore),
                s.targetScore,
              ])}
              empty="No measured gaps in this cohort."
            />
          </div>

          <div style={box}>
            <h3 style={{ fontSize: 15, fontWeight: 800, margin: '0 0 10px' }}>Evidence we do not have</h3>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 18 }}>
              <Stat label="Not assessed" cell={countCell(d.unknownEvidence?.notAssessed)} hint="Never measured — not a weakness" />
              <Stat label="Limited evidence" cell={countCell(d.unknownEvidence?.limitedEvidence)} hint="Measured, not yet conclusive" />
            </div>
          </div>

          <Unavailable
            title="Current Role Readiness distribution"
            reason={reasonOf(env?.coverage?.currentRoleReadinessDistribution)}
          />
        </>
      )}

      {/* ── Engagement ── */}
      {!busy && !err && tab === 'engagement' && d && (
        <>
          <div style={box}>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 18 }}>
              <Stat label="Active today" cell={countCell(d.activeToday)} />
              <Stat label="Active 7 days" cell={countCell(d.active7d)} />
              <Stat label="Active 30 days" cell={countCell(d.active30d)} />
              <Stat label="Missions completed" cell={countCell(d.missionsCompleted)} hint="In the selected range" />
              <Stat label="XP issued" cell={countCell(d.xpIssued)} />
            </div>
          </div>
          <div style={box}>
            <h3 style={{ fontSize: 15, fontWeight: 800, margin: '0 0 10px' }}>XP by event</h3>
            <Chart rows={(d.xpByEvent || []).map((e: any) => ({ name: e.eventKey, value: e.amount }))} colour="#7c3aed" />
            <Table
              head={['Event', 'XP', 'Awards']}
              rows={(d.xpByEvent || []).map((e: any) => [e.eventKey, e.amount, e.events])}
              empty="No XP was issued in this period."
            />
          </div>
        </>
      )}

      {/* ── Placement readiness ── */}
      {!busy && !err && tab === 'placement' && d && (
        <>
          <div style={box}>
            <h3 style={{ fontSize: 15, fontWeight: 800, margin: '0 0 4px' }}>Interview evaluation distribution</h3>
            {/* ATTEMPT-LEVEL. One member with three graded sittings contributes three scores,
                so this is deliberately not called a student readiness distribution. */}
            <p style={{ fontSize: 12, color: '#64748b', margin: '0 0 12px' }}>
              Scores of graded interview <strong>attempts</strong>, not one value per student.
            </p>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 18, marginBottom: 12 }}>
              <Stat label="Started" cell={countCell(d.interview?.started)} />
              <Stat label="Completed" cell={countCell(d.interview?.completed)} />
              <Stat label="Abandoned" cell={countCell(d.interview?.abandoned)} />
              <Stat label="Completion rate" cell={percentCell(d.interview?.completionRate, { emptyNote: 'No interviews were started in this period.' })} />
              <Stat label="Average score" cell={countCell(d.interview?.interviewEvaluationScoreDistribution?.average)} hint="Across attempts" />
            </div>
            <Table
              head={['Score band', 'Attempts']}
              rows={Object.entries(d.interview?.interviewEvaluationScoreDistribution?.buckets || {}).map(([k, v]) => [k, v as number])}
              empty="No interviews were graded in this period."
            />
          </div>

          <div style={box}>
            <h3 style={{ fontSize: 15, fontWeight: 800, margin: '0 0 4px' }}>Legacy resume score</h3>
            <p style={{ fontSize: 12, color: '#64748b', margin: '0 0 12px' }}>
              The older stored resume score. This is <strong>not</strong> Resume Readiness.
            </p>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 18 }}>
              <Stat label="Members with a resume" cell={countCell(d.resume?.membersWithResume)} />
              <Stat label="Scored" cell={countCell(d.resume?.legacyResumeScoreDistribution?.scored)} />
              <Stat label="Average" cell={countCell(d.resume?.legacyResumeScoreDistribution?.average)} />
            </div>
          </div>

          <div style={box}>
            <h3 style={{ fontSize: 15, fontWeight: 800, margin: '0 0 10px' }}>Company targets</h3>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 18, marginBottom: 12 }}>
              <Stat label="Members with a target" cell={countCell(d.companies?.membersWithTarget)} />
              <Stat label="Mock tests completed" cell={countCell(d.companies?.mockTestsCompleted)} />
            </div>
            <Table
              head={['Company', 'Members targeting', 'Primary for']}
              rows={(d.companies?.topTargets || []).map((t: any) => [t.companySlug, t.members, t.primaryFor])}
              empty="No member has chosen a target company yet."
            />
          </div>

          <Unavailable title="Current Resume Readiness distribution" reason={reasonOf(env?.coverage?.currentResumeReadinessDistribution)} />
          <Unavailable title="Current Interview Readiness distribution" reason={reasonOf(env?.coverage?.currentInterviewReadinessDistribution)} />
          <Unavailable title="Current Company Readiness distribution" reason={reasonOf(env?.coverage?.currentCompanyReadinessDistribution)} />
        </>
      )}

      {/* ── Rewards ── */}
      {!busy && !err && tab === 'rewards' && d && (
        <>
          <div style={box}>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 18 }}>
              <Stat label="Coins issued" cell={countCell(d.coinsIssued)} />
              <Stat label="Coins spent" cell={countCell(d.coinsSpent)} />
              <Stat label="Outstanding" cell={countCell(d.coinsOutstanding)} hint="Still held by members" />
              <Stat
                label="Budget utilisation"
                cell={coverageOf(d.budget?.coverage) === 'unavailable'
                  ? unavailableCell(d.budget?.reason)
                  : percentCell(d.budget?.utilisationPercent, { emptyNote: 'No budget is set for this period.' })}
              />
            </div>
          </div>
          <div style={box}>
            <h3 style={{ fontSize: 15, fontWeight: 800, margin: '0 0 10px' }}>Redemptions</h3>
            <Table
              head={['State', 'Count']}
              rows={Object.entries(d.redemptions || {}).map(([k, v]) => [k, v as number])}
              empty="No redemptions yet."
            />
          </div>
        </>
      )}

      {/* ── System health ── */}
      {!busy && !err && tab === 'health' && health && (
        <>
          <div style={box}>
            <div style={{ display: 'flex', gap: 10, alignItems: 'center', flexWrap: 'wrap' }}>
              <h3 style={{ fontSize: 15, fontWeight: 800, margin: 0 }}>Launch readiness</h3>
              <Pill
                tone={LAUNCH_STATUS[health.launch.status].tone}
                icon={AREA_STATUS[health.launch.status === 'READY' ? 'PASS' : health.launch.status === 'NOT_READY' ? 'FAIL' : 'WARNING'].icon}
                label={LAUNCH_STATUS[health.launch.status].label}
              />
            </div>
            <p style={{ fontSize: 13, color: '#475569', margin: '8px 0 0' }}>
              {LAUNCH_STATUS[health.launch.status].blurb}
            </p>
            <p style={{ fontSize: 12, color: '#94a3b8', margin: '6px 0 12px' }}>{health.launch.disclaimer}</p>
            <Table
              head={['Area', 'Status', 'Errors', 'Warnings']}
              rows={health.launch.areas.map(a => [a.label, AREA_STATUS[a.status].label, a.errors, a.warnings])}
              empty="Nothing to report."
            />
          </div>

          <div style={box}>
            <h3 style={{ fontSize: 15, fontWeight: 800, margin: '0 0 4px' }}>Configuration health</h3>
            <p style={{ fontSize: 12, color: '#64748b', margin: '0 0 12px' }}>
              {health.config.counts.error} error(s), {health.config.counts.warning} warning(s),
              {' '}{health.config.counts.info} note(s).
            </p>
            {!health.config.findings.length && (
              <p style={{ fontSize: 13, color: '#64748b', margin: 0 }}>Nothing to report.</p>
            )}
            {health.config.findings.map((f: HealthFindingView) => (
              <div key={f.code + f.message} style={{ display: 'flex', gap: 10, padding: '10px 0', borderBottom: '1px solid #f1f5f9' }}>
                <div style={{ flex: '0 0 auto' }}>
                  <Pill tone={SEVERITY[f.severity].tone} icon={SEVERITY[f.severity].icon} label={SEVERITY[f.severity].label} />
                </div>
                <div style={{ minWidth: 0 }}>
                  <div style={{ fontSize: 13.5, fontWeight: 700, color: '#0f172a' }}>{f.message}</div>
                  <div style={{ fontSize: 12.5, color: '#64748b' }}>{f.action}</div>
                </div>
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  );
};

export default AdminAnalytics;
