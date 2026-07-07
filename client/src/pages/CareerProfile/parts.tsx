import React from 'react';
import { CareerIssue, PillarReview, Pillar, GithubCheck } from '../../api/careerProfileApi';

export const scoreColor = (n: number) => (n >= 75 ? '#16a34a' : n >= 50 ? '#d97706' : '#dc2626');

const CHECK_UI: Record<GithubCheck['status'], { icon: string; color: string; bg: string }> = {
  pass: { icon: '✓', color: '#16a34a', bg: '#f0fdf4' },
  warn: { icon: '!', color: '#d97706', bg: '#fffbeb' },
  fail: { icon: '✕', color: '#dc2626', bg: '#fef2f2' },
};

// Health checklist — recruiter-facing signals with pass/warn/fail (GitHub + LinkedIn).
export function GithubChecklist({ checklist, title = 'GitHub health checklist' }: { checklist?: GithubCheck[]; title?: string }) {
  if (!checklist || !checklist.length) return null;
  const passed = checklist.filter(c => c.status === 'pass').length;
  return (
    <div style={{ margin: '4px 0 18px' }}>
      <p className="cp-subhead">{title} — {passed}/{checklist.length} passing</p>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(230px, 1fr))', gap: 8 }}>
        {checklist.map((c, i) => {
          const ui = CHECK_UI[c.status] || CHECK_UI.warn;
          return (
            <div key={i} title={c.hint} style={{ display: 'flex', gap: 8, alignItems: 'flex-start', padding: '9px 11px', borderRadius: 8, background: ui.bg, border: `1px solid ${ui.color}22` }}>
              <span style={{ flex: '0 0 18px', width: 18, height: 18, borderRadius: '50%', background: ui.color, color: '#fff', fontSize: 11, fontWeight: 700, display: 'flex', alignItems: 'center', justifyContent: 'center', marginTop: 1 }}>{ui.icon}</span>
              <div style={{ minWidth: 0 }}>
                <div style={{ fontSize: 13, fontWeight: 600, color: '#0f172a' }}>{c.label}</div>
                {c.status !== 'pass' && <div style={{ fontSize: 12, color: '#64748b', lineHeight: 1.35, marginTop: 2 }}>{c.hint}</div>}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

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
