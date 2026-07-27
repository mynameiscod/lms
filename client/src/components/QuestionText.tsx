import React from 'react';

/**
 * Renders a quiz/interview question that may contain code. Supports triple-backtick
 * fences (```lang ... ```) and also auto-detects raw code blocks (consecutive code-looking
 * lines) so pasted snippets show in a monospace code box instead of flat text.
 */
const codeStyle: React.CSSProperties = {
  background: '#0f172a', color: '#e2e8f0', padding: '14px 16px', borderRadius: 10,
  overflowX: 'auto', fontSize: 13.5, fontFamily: "'Fira Code', Consolas, 'Courier New', monospace",
  lineHeight: 1.55, margin: '10px 0', whiteSpace: 'pre', tabSize: 2,
};
const proseStyle: React.CSSProperties = { whiteSpace: 'pre-wrap', margin: '4px 0' };

const CODE_RE = /[{};]|=>|::|^\s{2,}\S|\b(public|private|protected|class|interface|void|static|final|int|long|double|float|char|boolean|String|for|while|do|switch|case|return|import|package|def|lambda|print|println|printf|echo|console\.|System\.|#include|std::|function|func|var|let|const|SELECT|FROM|WHERE|INSERT|UPDATE)\b/;

function looksLikeCode(line: string): boolean {
  if (!line.trim()) return false;
  return CODE_RE.test(line);
}

const QuestionText: React.FC<{ text?: string }> = ({ text }) => {
  const raw = String(text || '');

  // 1) Explicit triple-backtick fences.
  if (raw.includes('```')) {
    const segs = raw.split(/```[a-zA-Z0-9]*\n?/);
    return (
      <>
        {segs.map((s, i) =>
          i % 2 === 1
            ? <pre key={i} style={codeStyle}><code>{s.replace(/\n+$/, '')}</code></pre>
            : (s.trim() ? <div key={i} style={proseStyle}>{s.trim()}</div> : null)
        )}
      </>
    );
  }

  // 2) Heuristic: group consecutive code-looking lines into a code box.
  const lines = raw.split('\n');
  const blocks: { code: boolean; lines: string[] }[] = [];
  for (const ln of lines) {
    const code = looksLikeCode(ln);
    const last = blocks[blocks.length - 1];
    // Keep blank lines within an existing code block (so the snippet stays intact).
    if (last && (last.code === code || (last.code && !ln.trim()))) last.lines.push(ln);
    else blocks.push({ code, lines: [ln] });
  }
  const totalCodeLines = blocks.filter(b => b.code).reduce((s, b) => s + b.lines.filter(l => l.trim()).length, 0);

  // Not enough code signal → render as plain text (preserving line breaks).
  if (totalCodeLines < 2) return <div style={proseStyle}>{raw}</div>;

  return (
    <>
      {blocks.map((b, i) => {
        const content = b.lines.join('\n').replace(/^\n+|\n+$/g, '');
        if (!content.trim()) return null;
        return b.code
          ? <pre key={i} style={codeStyle}><code>{content}</code></pre>
          : <div key={i} style={proseStyle}>{content}</div>;
      })}
    </>
  );
};

export default QuestionText;
