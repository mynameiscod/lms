import React, { useEffect, useMemo, useRef, useState } from 'react';
import vzSound from '../premium/vzSound';
import './linkedList.css';

/**
 * Linked list, step by step. The Java tracer cannot follow objects created with `new`, so this is an
 * animated diagram of the exact Java in the lesson, not a trace of the student's code — it says so.
 *
 * Every operation is computed up front as frames: which nodes exist, which way each link points,
 * where each reference variable stands, the code line, and one sentence on what changed.
 */

type Op = 'addFirst' | 'addLast' | 'remove' | 'reverse';
type Link = 'fwd' | 'back' | 'none';

interface Frame {
  nodes: { id: number; value: number; state?: 'new' | 'visit' | 'removed' }[];
  /** links[i] joins nodes[i] and nodes[i + 1]. */
  links: Link[];
  /** For the first node after a reverse step: its next is null. */
  headNull?: boolean;
  pointers: Record<string, number | null>;
  line: number;
  say: string;
  tone?: 'compare' | 'write' | 'done';
}

const START = [10, 20, 30, 40];

const CODE: Record<Op, string[]> = {
  addFirst: [
    'Node node = new Node(5);',
    'node.next = head;',
    'head = node;',
  ],
  addLast: [
    'Node node = new Node(50);',
    'Node current = head;',
    'while (current.next != null) {',
    '    current = current.next;',
    '}',
    'current.next = node;',
  ],
  remove: [
    'Node previous = dummy;   // dummy.next = head',
    'while (previous.next != null) {',
    '    if (previous.next.value == 30) {',
    '        previous.next = previous.next.next;',
    '        break;',
    '    }',
    '    previous = previous.next;',
    '}',
  ],
  reverse: [
    'Node previous = null, current = head;',
    'while (current != null) {',
    '    Node nextNode = current.next;',
    '    current.next = previous;',
    '    previous = current;',
    '    current = nextNode;',
    '}',
    'head = previous;',
  ],
};

const LABEL: Record<Op, string> = { addFirst: 'Insert at head', addLast: 'Insert at tail', remove: 'Delete a value', reverse: 'Reverse' };

const base = () => START.map((value, i) => ({ id: i, value }));
const fwd = (n: number): Link[] => Array.from({ length: Math.max(0, n - 1) }, () => 'fwd' as Link);

function build(op: Op): Frame[] {
  const f: Frame[] = [];
  const nodes = base();
  if (op === 'addFirst') {
    f.push({ nodes, links: fwd(4), pointers: { head: 0 }, line: -1, say: 'The list starts as 10 → 20 → 30 → 40 → null. head points at 10.' });
    const withNew = [{ id: 9, value: 5, state: 'new' as const }, ...nodes];
    f.push({ nodes: withNew, links: ['none', ...fwd(4)], pointers: { node: 0, head: 1 }, line: 0, say: 'Create a new node holding 5. Its next is null for now.', tone: 'write' });
    f.push({ nodes: withNew, links: ['fwd', ...fwd(4)], pointers: { node: 0, head: 1 }, line: 1, say: 'node.next = head: the new node now points at 10. Nothing has moved.', tone: 'write' });
    f.push({ nodes: withNew.map(n => ({ ...n, state: undefined })), links: fwd(5), pointers: { head: 0 }, line: 2, say: 'head = node: the list now starts at 5. Two references changed, so this is O(1).', tone: 'done' });
  }
  if (op === 'addLast') {
    f.push({ nodes, links: fwd(4), pointers: { head: 0 }, line: -1, say: 'Start: 10 → 20 → 30 → 40 → null. We want 50 at the end.' });
    f.push({ nodes, links: fwd(4), pointers: { head: 0 }, line: 0, say: 'Create the node for 50 (shown when it is linked).', tone: 'write' });
    for (let i = 0; i < 4; i++) {
      f.push({ nodes: nodes.map((n, k) => (k === i ? { ...n, state: 'visit' } : n)), links: fwd(4), pointers: { head: 0, current: i }, line: i === 0 ? 1 : 3, say: i === 0 ? 'current starts at head (10).' : `current moves to ${nodes[i].value}.` });
      f.push({ nodes: nodes.map((n, k) => (k === i ? { ...n, state: 'visit' } : n)), links: fwd(4), pointers: { head: 0, current: i }, line: 2, say: i < 3 ? `current.next is ${nodes[i + 1].value}, not null: keep walking.` : 'current.next is null: 40 is the last node.', tone: 'compare' });
    }
    const all = [...nodes, { id: 9, value: 50, state: 'new' as const }];
    f.push({ nodes: all, links: fwd(5), pointers: { head: 0, current: 3, node: 4 }, line: 5, say: 'current.next = node: 40 now points at 50. Walking took n steps, so this is O(n) without a tail reference.', tone: 'done' });
  }
  if (op === 'remove') {
    f.push({ nodes, links: fwd(4), pointers: { head: 0 }, line: -1, say: 'Start: 10 → 20 → 30 → 40 → null. Delete the node holding 30.' });
    f.push({ nodes, links: fwd(4), pointers: { head: 0, 'previous (dummy)': -1 }, line: 0, say: 'previous starts at a dummy node placed before head, so deleting the first node needs no special case.' });
    let prev = -1;
    for (let k = 0; k < 4; k++) {
      const next = prev + 1;
      const hit = nodes[next].value === 30;
      f.push({ nodes: nodes.map((n, i) => (i === next ? { ...n, state: 'visit' } : n)), links: fwd(4), pointers: { head: 0, previous: prev }, line: 2, say: `Is previous.next.value (${nodes[next].value}) equal to 30? ${hit ? 'Yes.' : 'No.'}`, tone: 'compare' });
      if (hit) {
        const marked = nodes.map((n, i) => (i === next ? { ...n, state: 'removed' as const } : n));
        f.push({ nodes: marked, links: fwd(4), pointers: { head: 0, previous: prev }, line: 3, say: 'previous.next = previous.next.next: 20 now points past 30, straight at 40. Nothing references 30 any more.', tone: 'write' });
        const rest = nodes.filter((_, i) => i !== next);
        f.push({ nodes: rest, links: fwd(3), pointers: { head: 0 }, line: 4, say: '30 is unreachable, so Java\'s garbage collector will free it. The list is 10 → 20 → 40.', tone: 'done' });
        break;
      }
      prev = next;
      f.push({ nodes, links: fwd(4), pointers: { head: 0, previous: prev }, line: 6, say: `Move previous to ${nodes[prev].value}.` });
    }
  }
  if (op === 'reverse') {
    const links = fwd(4);
    f.push({ nodes, links: [...links], pointers: { head: 0 }, line: -1, say: 'Start: 10 → 20 → 30 → 40 → null. Reverse by turning every next reference around.' });
    f.push({ nodes, links: [...links], pointers: { current: 0, head: 0 }, line: 0, say: 'previous = null, current = head (10).' });
    let headNull = false;
    for (let c = 0; c < 4; c++) {
      f.push({ nodes, links: [...links], headNull, pointers: { previous: c - 1 >= 0 ? c - 1 : null, current: c, nextNode: c + 1 < 4 ? c + 1 : null }, line: 2, say: `Save nextNode = current.next (${c + 1 < 4 ? nodes[c + 1].value : 'null'}) before breaking the link.`, tone: 'compare' });
      if (c === 0) headNull = true; else links[c - 1] = 'back';
      if (c < 3) links[c] = 'none';
      f.push({ nodes, links: [...links], headNull, pointers: { previous: c - 1 >= 0 ? c - 1 : null, current: c, nextNode: c + 1 < 4 ? c + 1 : null }, line: 3, say: `current.next = previous: ${nodes[c].value} now points ${c === 0 ? 'at null' : `back at ${nodes[c - 1].value}`}.`, tone: 'write' });
      f.push({ nodes, links: [...links], headNull, pointers: { previous: c, current: c + 1 < 4 ? c + 1 : null }, line: 5, say: `Move previous to ${nodes[c].value} and current to ${c + 1 < 4 ? nodes[c + 1].value : 'null'}.` });
    }
    f.push({ nodes, links: [...links], headNull: true, pointers: { head: 3 }, line: 7, say: 'current is null, so the loop ends. head = previous: the list is 40 → 30 → 20 → 10 → null. One pass, O(n) time, O(1) space.', tone: 'done' });
  }
  return f;
}

const SPEEDS = [1200, 750, 400];

const LinkedListWidget: React.FC = () => {
  const [op, setOp] = useState<Op>('reverse');
  const frames = useMemo(() => build(op), [op]);
  const [pos, setPos] = useState(0);
  const [playing, setPlaying] = useState(false);
  const [speed, setSpeed] = useState(1);
  const rootRef = useRef<HTMLDivElement>(null);
  const last = frames.length - 1;
  const f = frames[Math.min(pos, last)];

  useEffect(() => { setPos(0); setPlaying(false); }, [op]);
  useEffect(() => {
    if (!playing) return;
    if (pos >= last) { setPlaying(false); return; }
    const t = window.setTimeout(() => setPos(p => Math.min(last, p + 1)), SPEEDS[speed]);
    return () => window.clearTimeout(t);
  }, [playing, pos, last, speed]);

  /* Sound follows the frame shown, only on the LMS Visualizer page (which carries .vzp). */
  const prevPos = useRef(0);
  useEffect(() => {
    const was = prevPos.current; prevPos.current = pos;
    if (was === pos || !rootRef.current?.closest('.vzp')) return;
    if (pos === 0) vzSound.play('reset');
    else if (f.tone === 'done') vzSound.play('complete');
    else if (f.tone === 'write') vzSound.play('swap');
    else if (f.tone === 'compare') vzSound.play('compare');
    else vzSound.play('step');
  }, [pos, f.tone]);

  const go = (p: number) => { setPlaying(false); setPos(Math.max(0, Math.min(last, p))); };
  const pointerAt = (i: number) => Object.entries(f.pointers).filter(([, v]) => v === i).map(([k]) => k);
  const before = Object.entries(f.pointers).filter(([, v]) => v === -1).map(([k]) => k);

  return (
    <div className="vz-concept vz-ll" ref={rootRef}>
      <section className="vz-card">
        <h3>Linked list, one reference at a time</h3>
        <p className="vz-muted vz-ll-note">An animated diagram of the Java on the right. The tracer cannot follow objects created with <code>new</code> yet, so this shows the lesson's code rather than yours.</p>
        <div className="vz-seg" role="group" aria-label="Operation">
          {(Object.keys(LABEL) as Op[]).map(k => (
            <button key={k} type="button" className={`vz-seg-btn${op === k ? ' on' : ''}`} aria-pressed={op === k} onClick={() => setOp(k)}>{LABEL[k]}</button>
          ))}
        </div>

        <div className="vz-ll-layout">
          <div className="vz-ll-stage">
            <div className="vz-ll-row" aria-label="List diagram">
              {before.length > 0 && <div className="vz-ll-ghost"><span className="vz-ll-ptr">{before.join(', ')}</span><div className="vz-ll-node dummy"><b>·</b></div></div>}
              {f.headNull && <span className="vz-ll-null left">null ←</span>}
              {f.nodes.map((n, i) => (
                <React.Fragment key={n.id}>
                  <div className={`vz-ll-cell${n.state ? ` is-${n.state}` : ''}`}>
                    <div className="vz-ll-node" aria-label={`Node ${n.value}`}>
                      <b>{n.value}</b><span className="vz-ll-next" aria-hidden="true">next</span>
                    </div>
                    <div className="vz-ll-ptrs">{pointerAt(i).map(p => <span key={p} className="vz-ll-ptr">{p}</span>)}</div>
                  </div>
                  {i < f.nodes.length - 1 && (
                    <span className={`vz-ll-link ${f.links[i] || 'none'}`} aria-label={f.links[i] === 'fwd' ? 'points right' : f.links[i] === 'back' ? 'points left' : 'no link'}>
                      {f.links[i] === 'fwd' ? '→' : f.links[i] === 'back' ? '←' : ''}
                    </span>
                  )}
                </React.Fragment>
              ))}
              {f.links[f.links.length - 1] !== 'back' && <span className="vz-ll-null">→ null</span>}
            </div>
            <div className={`vz-narration ${f.tone === 'compare' ? 'no' : f.tone === 'write' ? 'write' : f.tone === 'done' ? 'yes' : ''}`} aria-live="polite">
              <span className="vz-line-chip">{f.line >= 0 ? `Line ${f.line + 1}` : 'Start'}</span>
              <span className="vz-narr-text">{f.say}</span>
            </div>
            <div className="vz-controls">
              <button type="button" className="vz-sq-btn" onClick={() => go(0)} aria-label="First step">⏮</button>
              <button type="button" className="vz-sq-btn" onClick={() => go(pos - 1)} aria-label="Previous step">◀</button>
              <button type="button" className="vz-play" onClick={() => { if (pos >= last) setPos(0); setPlaying(p => !p); }}>
                {playing ? 'Pause' : pos >= last ? 'Replay' : 'Play'}
              </button>
              <button type="button" className="vz-sq-btn" onClick={() => go(pos + 1)} aria-label="Next step">▶</button>
              <button type="button" className="vz-sq-btn" onClick={() => go(last)} aria-label="Last step">⏭</button>
              <span className="vz-step-count">Step {pos + 1} / {frames.length}</span>
              <label className="vz-speed">
                <select value={speed} onChange={e => setSpeed(Number(e.target.value))} aria-label="Playback speed">
                  <option value={0}>Slow</option><option value={1}>Normal</option><option value={2}>Fast</option>
                </select>
              </label>
            </div>
          </div>
          <pre className="vz-ll-code" aria-label="Java code">
            {CODE[op].map((l, i) => <div key={i} className={i === f.line ? 'on' : ''}><span className="ln">{i + 1}</span>{l}</div>)}
          </pre>
        </div>
      </section>
    </div>
  );
};

export default LinkedListWidget;
