import React from 'react';
import { CareerIssue, PillarReview, Pillar } from '../../api/careerProfileApi';

export const scoreColor = (n: number) => (n >= 75 ? '#16a34a' : n >= 50 ? '#d97706' : '#dc2626');

export function ScoreCards({ resume, github, linkedin }: { resume: PillarReview; github: PillarReview; linkedin: PillarReview }) {
  const items: { lbl: string; v: number }[] = [
    { lbl: 'Resume', v: resume?.score || 0 },
    { lbl: 'GitHub', v: github?.score || 0 },
    { lbl: 'LinkedIn', v: linkedin?.score || 0 },
  ];
  return (
    <div className="cp-scores">
      {items.map(it => (
        <div className="cp-score" key={it.lbl}>
          <div className="lbl">{it.lbl}</div>
          <div className="num" style={{ color: scoreColor(it.v) }}>{it.v}<span style={{ fontSize: 16, color: '#94a3b8' }}>/100</span></div>
          <div className="bar"><span style={{ width: `${Math.min(100, it.v)}%`, background: scoreColor(it.v) }} /></div>
        </div>
      ))}
    </div>
  );
}

export function IssuesList({ issues }: { issues: CareerIssue[] }) {
  if (!issues || !issues.length) return <div style={{ fontSize: 13, color: '#94a3b8' }}>No issues found 🎉</div>;
  return (
    <>
      {issues.map((is, i) => (
        <div className={`cp-issue ${is.severity === 'high' ? 'high' : ''}`} key={i}>
          <div className="area">{is.area || 'General'}{is.severity ? ` · ${is.severity}` : ''}</div>
          <div className="prob">{is.problem}</div>
          {is.fix && <div className="fix"><b>Fix:</b> {is.fix}</div>}
        </div>
      ))}
    </>
  );
}

function copy(text: string) {
  navigator.clipboard?.writeText(text).catch(() => {});
}

function Block({ title, children, copyText }: { title: string; children: React.ReactNode; copyText?: string }) {
  return (
    <div className="blk">
      <div className="blk-title">
        <span>{title}</span>
        {copyText !== undefined && <button className="cp-copy" onClick={() => copy(copyText)}>Copy</button>}
      </div>
      {children}
    </div>
  );
}

/** Renders the AI "improved" object generically — strings, string[], and array of objects. */
export function ImprovedView({ improved }: { improved: any }) {
  if (!improved || (typeof improved === 'object' && Object.keys(improved).length === 0)) {
    return <div style={{ fontSize: 13, color: '#94a3b8' }}>No improved content yet. Run the AI review.</div>;
  }
  const label = (k: string) => k.replace(/([A-Z])/g, ' $1').replace(/^./, c => c.toUpperCase());
  return (
    <div className="cp-improved">
      {Object.entries(improved).map(([k, v]) => {
        if (v === null || v === undefined || v === '') return null;
        if (typeof v === 'string') {
          return <Block key={k} title={label(k)} copyText={v}><div className="txt">{v}</div></Block>;
        }
        if (Array.isArray(v)) {
          if (!v.length) return null;
          if (typeof v[0] === 'object') {
            return (
              <Block key={k} title={label(k)}>
                <ul>{v.map((o: any, i: number) => <li key={i}>{Object.values(o).filter(Boolean).join(' — ')}</li>)}</ul>
              </Block>
            );
          }
          return (
            <Block key={k} title={label(k)} copyText={(v as string[]).join('\n')}>
              <ul>{(v as string[]).map((s, i) => <li key={i}>{s}</li>)}</ul>
            </Block>
          );
        }
        return <Block key={k} title={label(k)} copyText={JSON.stringify(v, null, 2)}><pre>{JSON.stringify(v, null, 2)}</pre></Block>;
      })}
    </div>
  );
}

export const PILLAR_LABEL: Record<Pillar, string> = { resume: 'Resume', github: 'GitHub', linkedin: 'LinkedIn' };
