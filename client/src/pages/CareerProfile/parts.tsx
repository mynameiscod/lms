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

function Block({ title, children, copyText, onRegenerate, busy }: { title: string; children: React.ReactNode; copyText?: string; onRegenerate?: () => void; busy?: boolean }) {
  return (
    <div className="blk">
      <div className="blk-title">
        <span>{title}</span>
        <span style={{ display: 'flex', gap: 6 }}>
          {onRegenerate && <button className="cp-copy" onClick={onRegenerate} disabled={busy} title="Regenerate this section with AI">{busy ? '…' : '↻ Redo'}</button>}
          {copyText !== undefined && <button className="cp-copy" onClick={() => copy(copyText)}>Copy</button>}
        </span>
      </div>
      {children}
    </div>
  );
}

/**
 * Renders the AI "improved" object generically — strings, string[], and array of objects.
 * Pass onRegenerate to show a per-section "Redo" button (Phase 2).
 */
export function ImprovedView({ improved, onRegenerate, regenerating }: { improved: any; onRegenerate?: (key: string) => void; regenerating?: string }) {
  if (!improved || (typeof improved === 'object' && Object.keys(improved).length === 0)) {
    return <div style={{ fontSize: 13, color: '#94a3b8' }}>No improved content yet. Run the AI review.</div>;
  }
  const label = (k: string) => k.replace(/([A-Z])/g, ' $1').replace(/^./, c => c.toUpperCase());
  const redo = (k: string) => (onRegenerate ? () => onRegenerate(k) : undefined);
  return (
    <div className="cp-improved">
      {Object.entries(improved).map(([k, v]) => {
        if (v === null || v === undefined || v === '') return null;
        const common = { onRegenerate: redo(k), busy: regenerating === k };
        if (typeof v === 'string') {
          return <Block key={k} title={label(k)} copyText={v} {...common}><div className="txt">{v}</div></Block>;
        }
        if (Array.isArray(v)) {
          if (!v.length) return null;
          if (typeof v[0] === 'object') {
            return (
              <Block key={k} title={label(k)} {...common}>
                <ul>{v.map((o: any, i: number) => <li key={i}>{Object.values(o).filter(Boolean).join(' — ')}</li>)}</ul>
              </Block>
            );
          }
          return (
            <Block key={k} title={label(k)} copyText={(v as string[]).join('\n')} {...common}>
              <ul>{(v as string[]).map((s, i) => <li key={i}>{s}</li>)}</ul>
            </Block>
          );
        }
        return <Block key={k} title={label(k)} copyText={JSON.stringify(v, null, 2)} {...common}><pre>{JSON.stringify(v, null, 2)}</pre></Block>;
      })}
    </div>
  );
}

// ── Phase 2: export improved content to Markdown ──────────────────────────────
const labelize = (k: string) => k.replace(/([A-Z])/g, ' $1').replace(/^./, c => c.toUpperCase());

function improvedToMd(improved: any): string {
  if (!improved || typeof improved !== 'object') return '';
  let out = '';
  for (const [k, v] of Object.entries(improved)) {
    if (v === null || v === undefined || v === '') continue;
    out += `\n### ${labelize(k)}\n\n`;
    if (typeof v === 'string') out += `${v}\n`;
    else if (Array.isArray(v)) {
      out += (v as any[]).map(item => `- ${typeof item === 'object' ? Object.values(item).filter(Boolean).join(' — ') : item}`).join('\n') + '\n';
    } else out += '```\n' + JSON.stringify(v, null, 2) + '\n```\n';
  }
  return out;
}

export function buildMarkdown(p: { studentName?: string; targetRole?: string; resume: PillarReview; github: PillarReview; linkedin: PillarReview }): string {
  let md = `# Career Profile — ${p.studentName || ''}\n\n**Target role:** ${p.targetRole || '—'}\n`;
  const pillars: [string, PillarReview][] = [['Resume', p.resume], ['GitHub', p.github], ['LinkedIn', p.linkedin]];
  for (const [name, pr] of pillars) {
    md += `\n## ${name} (Score: ${pr?.score || 0}/100)\n`;
    md += improvedToMd(pr?.improved);
  }
  return md.trim() + '\n';
}

export function downloadMarkdown(filename: string, md: string) {
  const blob = new Blob([md], { type: 'text/markdown;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url; a.download = filename;
  document.body.appendChild(a); a.click(); a.remove();
  URL.revokeObjectURL(url);
}

export const PILLAR_LABEL: Record<Pillar, string> = { resume: 'Resume', github: 'GitHub', linkedin: 'LinkedIn' };
