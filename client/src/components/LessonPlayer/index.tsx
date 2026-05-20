import React, { useState, useEffect, useCallback } from 'react';
import axios from 'axios';
import { enrollmentPlanApi } from '../../api/enrollmentPlanApi';

// ─── Types ────────────────────────────────────────────────────────────────────

interface CpOption  { text: string; isCorrect: boolean; }
interface Checkpoint { question: string; options: CpOption[]; explanation: string; }
interface Slide {
  _id: string;
  type: 'narration' | 'animation' | 'code_reveal' | 'analogy';
  text?: string; avatarEmoji?: string;
  animationPreset?: string; lottieUrl?: string; caption?: string;
  code?: string; language?: string; lineCommentary?: string; speed?: string;
  leftLabel?: string; rightLabel?: string; imageUrl?: string; connectingText?: string;
  hasCheckpoint: boolean; checkpoint?: Checkpoint;
}
interface FTQuestion {
  _id: string; type: 'mcq' | 'coding' | 'theory';
  title: string; description: string;
  options?: CpOption[]; explanation?: string;
  marks: number;
}
interface FinalTask { type: string; title?: string; description?: string; passingScore?: number; questions?: FTQuestion[]; }
interface Lesson    { slides: Slide[]; finalTask: FinalTask; }

const authHeader = () => {
  const token    = localStorage.getItem('token');
  const tenantId = localStorage.getItem('tenantId');
  return {
    ...(token    && { Authorization: `Bearer ${token}` }),
    ...(tenantId && { 'X-Tenant-Id': tenantId }),
  };
};

// ─── DSA Animations ───────────────────────────────────────────────────────────

const QUEUE_ITEMS = ['A', 'B', 'C', 'D', 'E'];
const STACK_ITEMS = ['A', 'B', 'C', 'D'];
const ARRAY_SIZE  = 8;

function QueueAnimation() {
  const [highlighted, setHighlighted] = useState<number | null>(null);
  useEffect(() => {
    let i = 0;
    const iv = setInterval(() => { setHighlighted(i % QUEUE_ITEMS.length); i++; }, 900);
    return () => clearInterval(iv);
  }, []);
  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '12px' }}>
      <div style={{ fontSize: '12px', color: '#64748b', fontWeight: 600 }}>← DEQUEUE &nbsp;&nbsp;&nbsp; ENQUEUE →</div>
      <div style={{ display: 'flex', gap: '6px' }}>
        {QUEUE_ITEMS.map((c, i) => (
          <div key={i} style={{
            width: '52px', height: '52px', borderRadius: '10px', display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontWeight: 800, fontSize: '18px',
            background: highlighted === i ? '#3b82f6' : '#dbeafe',
            color: highlighted === i ? '#fff' : '#1d4ed8',
            transform: highlighted === i ? 'translateY(-6px)' : 'none',
            transition: 'all 0.3s ease',
            boxShadow: highlighted === i ? '0 4px 12px rgba(59,130,246,0.4)' : 'none',
          }}>{c}</div>
        ))}
      </div>
      <div style={{ fontSize: '12px', color: '#94a3b8' }}>First In, First Out — highlighted element is next to dequeue</div>
    </div>
  );
}

function StackAnimation() {
  const [highlighted, setHighlighted] = useState<number>(STACK_ITEMS.length - 1);
  useEffect(() => {
    let i = STACK_ITEMS.length - 1; let dir = -1;
    const iv = setInterval(() => {
      i += dir;
      if (i <= 0) dir = 1;
      if (i >= STACK_ITEMS.length - 1) dir = -1;
      setHighlighted(i);
    }, 700);
    return () => clearInterval(iv);
  }, []);
  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '6px' }}>
      <div style={{ fontSize: '12px', color: '#64748b', fontWeight: 600, marginBottom: '4px' }}>↑ PUSH / POP (TOP)</div>
      {[...STACK_ITEMS].reverse().map((c, ri) => {
        const i = STACK_ITEMS.length - 1 - ri;
        return (
          <div key={i} style={{
            width: '120px', height: '44px', borderRadius: '8px', display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontWeight: 800, fontSize: '16px',
            background: highlighted === i ? '#7c3aed' : '#ede9fe',
            color: highlighted === i ? '#fff' : '#5b21b6',
            transform: highlighted === i ? 'scale(1.06)' : 'scale(1)',
            transition: 'all 0.3s ease',
            boxShadow: highlighted === i ? '0 4px 12px rgba(124,58,237,0.35)' : 'none',
          }}>{c} {i === STACK_ITEMS.length - 1 ? '← TOP' : ''}</div>
        );
      })}
      <div style={{ fontSize: '12px', color: '#94a3b8', marginTop: '4px' }}>Last In, First Out — only TOP is accessible</div>
    </div>
  );
}

function ArrayAnimation() {
  const [cursor, setCursor] = useState(0);
  useEffect(() => {
    const iv = setInterval(() => setCursor(p => (p + 1) % ARRAY_SIZE), 500);
    return () => clearInterval(iv);
  }, []);
  const vals = [12, 45, 7, 23, 89, 3, 56, 34];
  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '8px' }}>
      <div style={{ display: 'flex', gap: '3px' }}>
        {vals.map((v, i) => (
          <div key={i} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '3px' }}>
            <div style={{
              width: '48px', height: '48px', borderRadius: '6px', display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontWeight: 700, fontSize: '14px',
              background: cursor === i ? '#10b981' : '#f1f5f9',
              color: cursor === i ? '#fff' : '#374151',
              border: `2px solid ${cursor === i ? '#10b981' : '#e2e8f0'}`,
              transition: 'all 0.25s ease',
              transform: cursor === i ? 'translateY(-4px)' : 'none',
            }}>{v}</div>
            <div style={{ fontSize: '10px', color: '#94a3b8' }}>[{i}]</div>
          </div>
        ))}
      </div>
      <div style={{ fontSize: '12px', color: '#94a3b8' }}>Cursor at index [{cursor}] — O(1) random access by index</div>
    </div>
  );
}

function LinkedListAnimation() {
  const [activeNode, setActiveNode] = useState(0);
  const nodes = ['10', '25', '8', '42', '17'];
  useEffect(() => {
    const iv = setInterval(() => setActiveNode(p => (p + 1) % nodes.length), 800);
    return () => clearInterval(iv);
  }, []);
  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '12px' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '2px', flexWrap: 'wrap', justifyContent: 'center' }}>
        <div style={{ fontSize: '12px', color: '#64748b', fontWeight: 700, marginRight: '6px' }}>HEAD →</div>
        {nodes.map((v, i) => (
          <React.Fragment key={i}>
            <div style={{
              padding: '6px 14px', borderRadius: '8px', fontWeight: 700, fontSize: '14px',
              background: activeNode === i ? '#f59e0b' : '#fef3c7',
              color: activeNode === i ? '#fff' : '#92400e',
              border: `2px solid ${activeNode === i ? '#f59e0b' : '#fde68a'}`,
              transition: 'all 0.3s ease', transform: activeNode === i ? 'scale(1.08)' : 'scale(1)',
            }}>
              {v} | →
            </div>
            {i < nodes.length - 1 && <span style={{ color: '#f59e0b', fontSize: '18px', fontWeight: 700 }}></span>}
          </React.Fragment>
        ))}
        <div style={{ padding: '6px 10px', borderRadius: '8px', background: '#f1f5f9', color: '#94a3b8', fontSize: '14px', fontWeight: 700 }}>NULL</div>
      </div>
      <div style={{ fontSize: '12px', color: '#94a3b8' }}>Each node holds data + pointer to next — no random access</div>
    </div>
  );
}

function BinaryTreeAnimation() {
  const [active, setActive] = useState(0);
  const nodes = [
    { val: 50, level: 0, x: 50, y: 10 },
    { val: 25, level: 1, x: 25, y: 38 },
    { val: 75, level: 1, x: 75, y: 38 },
    { val: 12, level: 2, x: 12, y: 66 },
    { val: 37, level: 2, x: 38, y: 66 },
    { val: 62, level: 2, x: 62, y: 66 },
    { val: 87, level: 2, x: 88, y: 66 },
  ];
  useEffect(() => {
    const iv = setInterval(() => setActive(p => (p + 1) % nodes.length), 700);
    return () => clearInterval(iv);
  }, []);
  return (
    <div style={{ width: '100%', maxWidth: '300px', margin: '0 auto' }}>
      <svg viewBox="0 0 100 85" style={{ width: '100%', height: '160px' }}>
        {[{f:0,t:1},{f:0,t:2},{f:1,t:3},{f:1,t:4},{f:2,t:5},{f:2,t:6}].map(({f,t}, i) => (
          <line key={i} x1={nodes[f].x} y1={nodes[f].y + 4} x2={nodes[t].x} y2={nodes[t].y - 4} stroke="#cbd5e1" strokeWidth="0.8" />
        ))}
        {nodes.map((n, i) => (
          <g key={i}>
            <circle cx={n.x} cy={n.y} r="7" fill={active === i ? '#3b82f6' : '#dbeafe'} stroke={active === i ? '#2563eb' : '#93c5fd'} strokeWidth="0.8" style={{ transition: 'fill 0.3s' }} />
            <text x={n.x} y={n.y + 1.5} textAnchor="middle" fontSize="4.5" fill={active === i ? '#fff' : '#1d4ed8'} fontWeight="bold">{n.val}</text>
          </g>
        ))}
      </svg>
      <div style={{ fontSize: '12px', color: '#94a3b8', textAlign: 'center' }}>BST: left &lt; parent &lt; right · O(log n) search</div>
    </div>
  );
}

function BubbleSortAnimation() {
  const orig = [5, 2, 8, 1, 9, 3];
  const [arr, setArr] = useState([...orig]);
  const [swapping, setSwapping] = useState<[number, number] | null>(null);
  useEffect(() => {
    let a = [...orig]; let i = 0; let j = 0;
    const iv = setInterval(() => {
      if (i >= a.length - 1) { a = [...orig]; i = 0; j = 0; setArr([...a]); return; }
      if (j < a.length - 1 - i) {
        if (a[j] > a[j + 1]) {
          setSwapping([j, j + 1]);
          setTimeout(() => { [a[j], a[j + 1]] = [a[j + 1], a[j]]; setArr([...a]); setSwapping(null); }, 350);
        }
        j++;
      } else { i++; j = 0; }
    }, 700);
    return () => clearInterval(iv);
  }, []);
  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '10px' }}>
      <div style={{ display: 'flex', gap: '6px' }}>
        {arr.map((v, i) => {
          const isSwapping = swapping && (swapping[0] === i || swapping[1] === i);
          return (
            <div key={i} style={{
              width: '44px', height: '44px', borderRadius: '8px', display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontWeight: 800, fontSize: '16px',
              background: isSwapping ? '#ef4444' : '#fce7f3',
              color: isSwapping ? '#fff' : '#be185d',
              transform: isSwapping ? 'translateY(-8px)' : 'none',
              transition: 'all 0.3s ease',
            }}>{v}</div>
          );
        })}
      </div>
      <div style={{ fontSize: '12px', color: '#94a3b8' }}>Comparing adjacent pairs, swapping if out of order — O(n²)</div>
    </div>
  );
}

function BinarySearchAnimation() {
  const arr = [2, 5, 8, 12, 16, 23, 38, 56, 72, 91];
  const target = 23; const targetIdx = 5;
  const [step, setStep] = useState(0);
  const steps = [
    { lo: 0, hi: 9, mid: 4 },
    { lo: 5, hi: 9, mid: 7 },
    { lo: 5, hi: 6, mid: 5 },
  ];
  useEffect(() => {
    const iv = setInterval(() => setStep(p => (p + 1) % (steps.length + 2)), 900);
    return () => clearInterval(iv);
  }, []);
  const cur = step < steps.length ? steps[step] : null;
  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '10px' }}>
      <div style={{ fontSize: '12px', color: '#64748b', fontWeight: 600 }}>Searching for {target}</div>
      <div style={{ display: 'flex', gap: '3px' }}>
        {arr.map((v, i) => {
          const inRange = cur && i >= cur.lo && i <= cur.hi;
          const isMid   = cur && i === cur.mid;
          const found   = step >= steps.length && i === targetIdx;
          return (
            <div key={i} style={{
              width: '36px', height: '36px', borderRadius: '6px', display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontWeight: 700, fontSize: '12px',
              background: found ? '#10b981' : isMid ? '#f59e0b' : inRange ? '#dbeafe' : '#f1f5f9',
              color: found ? '#fff' : isMid ? '#fff' : inRange ? '#1d4ed8' : '#94a3b8',
              transition: 'all 0.3s',
            }}>{v}</div>
          );
        })}
      </div>
      <div style={{ fontSize: '12px', color: '#94a3b8' }}>
        {cur ? `Mid = ${arr[cur.mid]} — searching ${arr[cur.mid] < target ? 'right' : 'left'} half` : `Found ${target}! O(log n)`}
      </div>
    </div>
  );
}

function HashMapAnimation() {
  const pairs = [['name', 'Alice'], ['age', '25'], ['city', 'Delhi'], ['role', 'Dev']];
  const [active, setActive] = useState(0);
  useEffect(() => {
    const iv = setInterval(() => setActive(p => (p + 1) % pairs.length), 800);
    return () => clearInterval(iv);
  }, []);
  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '6px' }}>
      <div style={{ fontSize: '12px', color: '#64748b', fontWeight: 600, marginBottom: '4px' }}>KEY → VALUE (O(1) lookup)</div>
      {pairs.map(([k, v], i) => (
        <div key={i} style={{ display: 'flex', alignItems: 'center', gap: '8px', transition: 'all 0.3s' }}>
          <div style={{
            padding: '6px 14px', borderRadius: '6px', fontWeight: 700, fontSize: '13px',
            background: active === i ? '#7c3aed' : '#ede9fe', color: active === i ? '#fff' : '#5b21b6',
            transition: 'all 0.3s',
          }}>{k}</div>
          <span style={{ color: '#94a3b8', fontSize: '18px' }}>→</span>
          <div style={{
            padding: '6px 14px', borderRadius: '6px', fontWeight: 600, fontSize: '13px',
            background: active === i ? '#10b981' : '#f0fdf4', color: active === i ? '#fff' : '#15803d',
            transition: 'all 0.3s',
          }}>{v}</div>
        </div>
      ))}
    </div>
  );
}

function DSAAnimation({ preset, lottieUrl }: { preset: string; lottieUrl?: string }) {
  if (preset === 'custom' && lottieUrl) {
    return (
      <div style={{ width: '100%', maxWidth: '400px', margin: '0 auto' }}>
        <iframe src={lottieUrl} style={{ width: '100%', height: '280px', border: 'none', borderRadius: '10px' }} title="animation" />
      </div>
    );
  }
  const map: Record<string, React.ReactNode> = {
    queue:         <QueueAnimation />,
    stack:         <StackAnimation />,
    array:         <ArrayAnimation />,
    linked_list:   <LinkedListAnimation />,
    binary_tree:   <BinaryTreeAnimation />,
    bubble_sort:   <BubbleSortAnimation />,
    binary_search: <BinarySearchAnimation />,
    hashmap:       <HashMapAnimation />,
  };
  return <div style={{ padding: '24px', display: 'flex', justifyContent: 'center' }}>{map[preset] || null}</div>;
}

// ─── Slide Renderers ──────────────────────────────────────────────────────────

function NarrationSlide({ slide }: { slide: Slide }) {
  const [shown, setShown] = useState(0);
  const text = slide.text || '';
  useEffect(() => {
    setShown(0);
    let i = 0;
    const iv = setInterval(() => {
      i += 3; // reveal 3 chars at a time for snappy feel
      setShown(Math.min(i, text.length));
      if (i >= text.length) clearInterval(iv);
    }, 20);
    return () => clearInterval(iv);
  }, [text]);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '24px', padding: '20px 0' }}>
      <div style={{ fontSize: '72px', lineHeight: 1, filter: 'drop-shadow(0 4px 8px rgba(0,0,0,0.1))' }}>
        {slide.avatarEmoji || '👨‍🏫'}
      </div>
      <div style={{
        maxWidth: '680px', width: '100%',
        background: '#f8fafc', borderRadius: '16px', padding: '24px 28px',
        border: '1.5px solid #e2e8f0',
        fontSize: '18px', lineHeight: 1.8, color: '#1e293b',
        position: 'relative',
      }}>
        {/* Speech bubble tail */}
        <div style={{
          position: 'absolute', top: '-10px', left: '50%', transform: 'translateX(-50%)',
          width: 0, height: 0,
          borderLeft: '10px solid transparent', borderRight: '10px solid transparent',
          borderBottom: '10px solid #e2e8f0',
        }} />
        <div style={{
          position: 'absolute', top: '-8px', left: '50%', transform: 'translateX(-50%)',
          width: 0, height: 0,
          borderLeft: '9px solid transparent', borderRight: '9px solid transparent',
          borderBottom: '9px solid #f8fafc',
        }} />
        {text.slice(0, shown)}
        {shown < text.length && <span style={{ opacity: 0.6, animation: 'blink 1s step-end infinite' }}>|</span>}
      </div>
      <button
        onClick={() => setShown(text.length)}
        style={{ fontSize: '12px', color: '#94a3b8', background: 'none', border: 'none', cursor: 'pointer', textDecoration: 'underline' }}
      >
        Skip to end
      </button>
    </div>
  );
}

function AnimationSlide({ slide }: { slide: Slide }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '20px', padding: '20px 0' }}>
      <div style={{
        background: '#f8fafc', border: '1.5px solid #e2e8f0', borderRadius: '16px',
        padding: '32px 24px', width: '100%', maxWidth: '640px',
      }}>
        <DSAAnimation preset={slide.animationPreset || 'queue'} lottieUrl={slide.lottieUrl} />
      </div>
      {slide.caption && (
        <div style={{ maxWidth: '580px', textAlign: 'center', fontSize: '15px', color: '#475569', lineHeight: 1.7 }}>
          {slide.caption}
        </div>
      )}
    </div>
  );
}

function CodeRevealSlide({ slide }: { slide: Slide }) {
  const lines = (slide.code || '').split('\n');
  const speedMs = slide.speed === 'slow' ? 600 : slide.speed === 'fast' ? 150 : 300;
  const [visibleLines, setVisibleLines] = useState(0);

  useEffect(() => {
    setVisibleLines(0);
    let i = 0;
    const iv = setInterval(() => {
      i++;
      setVisibleLines(i);
      if (i >= lines.length) clearInterval(iv);
    }, speedMs);
    return () => clearInterval(iv);
  }, [slide.code, speedMs]);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', width: '100%', maxWidth: '720px', margin: '0 auto' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
        <span style={{ background: '#0f172a', color: '#e2e8f0', borderRadius: '6px', padding: '3px 10px', fontSize: '12px', fontWeight: 600 }}>
          💻 {slide.language || 'code'}
        </span>
        <button
          onClick={() => setVisibleLines(lines.length)}
          style={{ fontSize: '12px', color: '#94a3b8', background: 'none', border: 'none', cursor: 'pointer', textDecoration: 'underline' }}
        >
          Show all
        </button>
      </div>
      <div style={{ background: '#0f172a', borderRadius: '12px', padding: '20px 24px', overflowX: 'auto' }}>
        <pre style={{ margin: 0, fontFamily: 'monospace', fontSize: '14px', lineHeight: 1.7 }}>
          {lines.slice(0, visibleLines).map((line, i) => (
            <div
              key={i}
              style={{
                display: 'flex', gap: '16px',
                animation: i === visibleLines - 1 ? 'fadeSlideIn 0.3s ease' : 'none',
              }}
            >
              <span style={{ color: '#475569', userSelect: 'none', minWidth: '24px', textAlign: 'right', flexShrink: 0 }}>{i + 1}</span>
              <span style={{ color: '#e2e8f0' }}>{line || ' '}</span>
            </div>
          ))}
          {visibleLines < lines.length && (
            <div style={{ color: '#475569', marginTop: '4px' }}>▌</div>
          )}
        </pre>
      </div>
      {slide.lineCommentary && visibleLines >= lines.length && (
        <div style={{ background: '#fef3c7', borderRadius: '10px', padding: '14px 16px', fontSize: '14px', color: '#92400e', lineHeight: 1.7 }}>
          💡 {slide.lineCommentary}
        </div>
      )}
    </div>
  );
}

function AnalogySlide({ slide }: { slide: Slide }) {
  const [revealed, setRevealed] = useState(false);
  useEffect(() => { const t = setTimeout(() => setRevealed(true), 600); return () => clearTimeout(t); }, []);
  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '24px', padding: '20px 0' }}>
      {slide.imageUrl && (
        <img
          src={slide.imageUrl}
          alt="analogy"
          style={{ maxHeight: '180px', borderRadius: '12px', border: '1px solid #e2e8f0', objectFit: 'contain' }}
          onError={e => { (e.target as HTMLImageElement).style.display = 'none'; }}
        />
      )}
      <div style={{ display: 'flex', alignItems: 'center', gap: '20px', flexWrap: 'wrap', justifyContent: 'center' }}>
        <div style={{
          padding: '20px 28px', borderRadius: '14px', textAlign: 'center',
          background: '#fef3c7', border: '2px solid #fde68a',
          transform: revealed ? 'scale(1)' : 'scale(0.85)', opacity: revealed ? 1 : 0,
          transition: 'all 0.5s cubic-bezier(0.34,1.56,0.64,1)',
        }}>
          <div style={{ fontSize: '32px', marginBottom: '8px' }}>🌍</div>
          <div style={{ fontWeight: 700, fontSize: '16px', color: '#92400e' }}>
            {slide.leftLabel || 'Real World'}
          </div>
        </div>

        <div style={{ textAlign: 'center', opacity: revealed ? 1 : 0, transition: 'opacity 0.5s 0.3s' }}>
          <div style={{ fontSize: '28px' }}>≈</div>
          <div style={{ fontSize: '12px', color: '#94a3b8', fontStyle: 'italic', maxWidth: '100px' }}>
            {slide.connectingText || 'works like'}
          </div>
        </div>

        <div style={{
          padding: '20px 28px', borderRadius: '14px', textAlign: 'center',
          background: '#dbeafe', border: '2px solid #93c5fd',
          transform: revealed ? 'scale(1)' : 'scale(0.85)', opacity: revealed ? 1 : 0,
          transition: 'all 0.5s 0.2s cubic-bezier(0.34,1.56,0.64,1)',
        }}>
          <div style={{ fontSize: '32px', marginBottom: '8px' }}>💻</div>
          <div style={{ fontWeight: 700, fontSize: '16px', color: '#1e40af' }}>
            {slide.rightLabel || 'CS Concept'}
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── Checkpoint View ──────────────────────────────────────────────────────────

function CheckpointView({ checkpoint, onPass }: { checkpoint: Checkpoint; onPass: () => void }) {
  const [selected, setSelected] = useState<number | null>(null);
  const [checked,  setChecked]  = useState(false);
  const [shake,    setShake]    = useState(false);

  const check = () => {
    if (selected === null) return;
    setChecked(true);
    const correct = checkpoint.options[selected]?.isCorrect;
    if (correct) {
      setTimeout(onPass, 1200);
    } else {
      setShake(true);
      setTimeout(() => { setShake(false); setChecked(false); setSelected(null); }, 1000);
    }
  };

  const correct = checked && selected !== null && checkpoint.options[selected]?.isCorrect;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '20px', padding: '20px 0', maxWidth: '620px', margin: '0 auto', width: '100%' }}>
      <div style={{ background: '#7c3aed', borderRadius: '12px', padding: '6px 16px', fontSize: '13px', fontWeight: 700, color: '#fff' }}>
        ✔ Quick Check
      </div>
      <div style={{ fontSize: '20px', fontWeight: 700, color: '#0f172a', textAlign: 'center', lineHeight: 1.5 }}>
        {checkpoint.question}
      </div>
      <div style={{
        display: 'flex', flexDirection: 'column', gap: '10px', width: '100%',
        animation: shake ? 'shake 0.4s ease' : 'none',
      }}>
        {checkpoint.options.map((opt, i) => {
          let bg = '#f8fafc', border = '#e2e8f0', color = '#374151';
          if (checked) {
            if (opt.isCorrect)                    { bg = '#dcfce7'; border = '#86efac'; color = '#15803d'; }
            else if (selected === i && !opt.isCorrect) { bg = '#fee2e2'; border = '#fca5a5'; color = '#dc2626'; }
          } else if (selected === i) {
            bg = '#eff6ff'; border = '#93c5fd'; color = '#1d4ed8';
          }
          return (
            <div
              key={i}
              onClick={() => !checked && setSelected(i)}
              style={{
                padding: '14px 18px', borderRadius: '10px', cursor: checked ? 'default' : 'pointer',
                background: bg, border: `2px solid ${border}`, color, fontSize: '15px', fontWeight: 600,
                display: 'flex', alignItems: 'center', gap: '10px', transition: 'all 0.2s',
              }}
            >
              <span style={{ width: '28px', height: '28px', borderRadius: '50%', background: `${border}40`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '13px', flexShrink: 0 }}>
                {String.fromCharCode(65 + i)}
              </span>
              {opt.text}
              {checked && opt.isCorrect && <span style={{ marginLeft: 'auto' }}>✓</span>}
              {checked && selected === i && !opt.isCorrect && <span style={{ marginLeft: 'auto' }}>✗</span>}
            </div>
          );
        })}
      </div>

      {!checked && (
        <button
          onClick={check}
          disabled={selected === null}
          style={{
            padding: '12px 32px', background: selected !== null ? '#7c3aed' : '#e2e8f0',
            color: selected !== null ? '#fff' : '#94a3b8', border: 'none',
            borderRadius: '10px', fontWeight: 700, fontSize: '15px',
            cursor: selected !== null ? 'pointer' : 'not-allowed', transition: 'all 0.2s',
          }}
        >
          Check Answer
        </button>
      )}

      {correct && (
        <div style={{ background: '#dcfce7', borderRadius: '10px', padding: '14px 20px', color: '#15803d', fontWeight: 700, fontSize: '15px', textAlign: 'center', width: '100%' }}>
          🎉 Correct! Moving on...
          {checkpoint.explanation && (
            <div style={{ fontWeight: 400, fontSize: '13px', marginTop: '6px', color: '#166534' }}>
              {checkpoint.explanation}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ─── Final Task View ──────────────────────────────────────────────────────────

function FinalTaskView({ finalTask, onComplete }: { finalTask: FinalTask; onComplete: () => void }) {
  const [answers, setAnswers]   = useState<Record<number, number | null>>({});
  const [submitted, setSubmit]  = useState(false);
  const [score, setScore]       = useState(0);
  const questions = finalTask.questions || [];
  const passing   = finalTask.passingScore ?? 60;

  const submit = () => {
    let earned = 0; let total = 0;
    questions.forEach((q, i) => {
      if (q.type === 'mcq' && q.options) {
        const selIdx = answers[i];
        if (selIdx !== null && selIdx !== undefined && q.options[selIdx]?.isCorrect) earned += q.marks;
        total += q.marks;
      }
    });
    const pct = total > 0 ? Math.round((earned / total) * 100) : 100;
    setScore(pct);
    setSubmit(true);
    if (pct >= passing) setTimeout(onComplete, 2000);
  };

  if (finalTask.type === 'assignment') {
    return (
      <div style={{ maxWidth: '640px', margin: '0 auto', display: 'flex', flexDirection: 'column', gap: '20px' }}>
        <div style={{ background: '#f0f9ff', border: '1.5px solid #bae6fd', borderRadius: '12px', padding: '20px' }}>
          <div style={{ fontWeight: 700, fontSize: '18px', color: '#0f172a', marginBottom: '12px' }}>
            📋 {finalTask.title || 'Assignment'}
          </div>
          <div style={{ fontSize: '15px', color: '#374151', lineHeight: 1.8, whiteSpace: 'pre-wrap' }}>
            {finalTask.description}
          </div>
        </div>
        <button
          onClick={onComplete}
          style={{ padding: '14px', background: '#0f172a', color: '#fff', border: 'none', borderRadius: '10px', fontWeight: 700, fontSize: '15px', cursor: 'pointer' }}
        >
          ✓ Got it — Mark Complete
        </button>
      </div>
    );
  }

  return (
    <div style={{ maxWidth: '680px', margin: '0 auto', width: '100%', display: 'flex', flexDirection: 'column', gap: '16px' }}>
      <div style={{ fontWeight: 700, fontSize: '18px', color: '#0f172a' }}>
        {finalTask.type === 'coding' ? '⌨️' : '📝'} {finalTask.title || 'Final Quiz'}
        <span style={{ fontSize: '13px', color: '#94a3b8', fontWeight: 400, marginLeft: '10px' }}>Pass: {passing}%</span>
      </div>

      {submitted ? (
        <div style={{
          textAlign: 'center', padding: '32px',
          background: score >= passing ? '#f0fdf4' : '#fff7ed',
          borderRadius: '16px', border: `2px solid ${score >= passing ? '#86efac' : '#fed7aa'}`,
        }}>
          <div style={{ fontSize: '48px', marginBottom: '12px' }}>{score >= passing ? '🎉' : '😅'}</div>
          <div style={{ fontSize: '32px', fontWeight: 800, color: score >= passing ? '#15803d' : '#c2410c' }}>
            {score}%
          </div>
          <div style={{ fontSize: '15px', color: '#374151', marginTop: '8px' }}>
            {score >= passing
              ? 'Well done! Marking lesson as complete...'
              : `Need ${passing}% to pass. Review the slides and try again.`}
          </div>
          {score < passing && (
            <button
              onClick={() => { setSubmit(false); setAnswers({}); }}
              style={{ marginTop: '16px', padding: '10px 24px', background: '#0f172a', color: '#fff', border: 'none', borderRadius: '8px', fontWeight: 700, fontSize: '14px', cursor: 'pointer' }}
            >
              Try Again
            </button>
          )}
        </div>
      ) : (
        <>
          {questions.map((q, qi) => (
            <div key={qi} style={{ border: '1.5px solid #e2e8f0', borderRadius: '12px', padding: '16px 18px', background: '#fff' }}>
              <div style={{ fontWeight: 700, fontSize: '15px', color: '#0f172a', marginBottom: '8px' }}>
                Q{qi + 1}. {q.title}
              </div>
              {q.description && (
                <div style={{ fontSize: '13px', color: '#475569', lineHeight: 1.6, marginBottom: '12px', whiteSpace: 'pre-wrap' }}>
                  {q.description}
                </div>
              )}
              {q.type === 'mcq' && q.options && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '7px' }}>
                  {q.options.map((opt, oi) => (
                    <div
                      key={oi}
                      onClick={() => setAnswers(p => ({ ...p, [qi]: oi }))}
                      style={{
                        padding: '10px 14px', borderRadius: '8px', cursor: 'pointer',
                        background: answers[qi] === oi ? '#eff6ff' : '#f8fafc',
                        border: `1.5px solid ${answers[qi] === oi ? '#93c5fd' : '#e2e8f0'}`,
                        fontSize: '14px', color: '#374151',
                        display: 'flex', alignItems: 'center', gap: '8px',
                        transition: 'all 0.15s',
                      }}
                    >
                      <span style={{ fontWeight: 700, color: '#64748b', minWidth: '20px' }}>{String.fromCharCode(65 + oi)}.</span>
                      {opt.text}
                    </div>
                  ))}
                </div>
              )}
              {q.type === 'coding' && (
                <div style={{ background: '#0f172a', borderRadius: '8px', padding: '14px', fontSize: '13px', color: '#94a3b8', fontFamily: 'monospace' }}>
                  Write your solution — submission tracked by instructor
                </div>
              )}
            </div>
          ))}
          <button
            onClick={submit}
            style={{ padding: '14px', background: '#0f172a', color: '#fff', border: 'none', borderRadius: '10px', fontWeight: 700, fontSize: '15px', cursor: 'pointer' }}
          >
            Submit →
          </button>
        </>
      )}
    </div>
  );
}

// ─── Progress dots ────────────────────────────────────────────────────────────

function ProgressDots({ total, current }: { total: number; current: number }) {
  const maxDots = 12;
  if (total <= maxDots) {
    return (
      <div style={{ display: 'flex', gap: '5px', alignItems: 'center' }}>
        {Array.from({ length: total }).map((_, i) => (
          <div key={i} style={{
            width: i === current ? '18px' : '7px', height: '7px',
            borderRadius: '4px', transition: 'all 0.3s',
            background: i < current ? '#10b981' : i === current ? '#3b82f6' : '#e2e8f0',
          }} />
        ))}
      </div>
    );
  }
  return <span style={{ fontSize: '13px', color: '#64748b', fontWeight: 600 }}>{current + 1} / {total}</span>;
}

// ─── Main LessonPlayer ────────────────────────────────────────────────────────

interface Props {
  contentId:    string;
  contentTitle: string;
  enrollmentId: string;
  dayNumber:    number;
  onClose:   () => void;
  onComplete: () => void;
}

type Phase = 'slide' | 'checkpoint' | 'final_task' | 'done';

export default function LessonPlayer({ contentId, contentTitle, enrollmentId, dayNumber, onClose, onComplete }: Props) {
  const [lesson,   setLesson]   = useState<Lesson | null>(null);
  const [loading,  setLoading]  = useState(true);
  const [slideIdx, setSlideIdx] = useState(0);
  const [phase,    setPhase]    = useState<Phase>('slide');

  useEffect(() => {
    axios.get(`/api/v1/concept-lessons/by-content/${contentId}`, { headers: authHeader() })
      .then(({ data }) => setLesson(data))
      .catch(() => setLesson(null))
      .finally(() => setLoading(false));
  }, [contentId]);

  const handleComplete = useCallback(async () => {
    try {
      await enrollmentPlanApi.markContentComplete(enrollmentId, contentId, dayNumber);
    } catch { /* best-effort */ }
    setPhase('done');
    onComplete();
  }, [enrollmentId, contentId, dayNumber, onComplete]);

  if (loading) return (
    <Overlay onClose={onClose}>
      <div style={{ color: '#fff', fontSize: '16px', textAlign: 'center' }}>Loading lesson...</div>
    </Overlay>
  );

  if (!lesson || lesson.slides.length === 0) {
    onClose(); return null;
  }

  const slides     = lesson.slides;
  const totalSlides = slides.length;
  const cur        = slides[slideIdx];
  const isLast     = slideIdx === totalSlides - 1;
  const hasFT      = lesson.finalTask?.type && lesson.finalTask.type !== 'none';

  const goNext = () => {
    if (cur.hasCheckpoint && phase === 'slide') {
      setPhase('checkpoint');
      return;
    }
    if (isLast) {
      if (hasFT) setPhase('final_task');
      else handleComplete();
    } else {
      setSlideIdx(p => p + 1);
      setPhase('slide');
    }
  };

  const goPrev = () => {
    if (slideIdx > 0) { setSlideIdx(p => p - 1); setPhase('slide'); }
  };

  const onCheckpointPass = () => {
    if (isLast) {
      if (hasFT) setPhase('final_task');
      else handleComplete();
    } else {
      setSlideIdx(p => p + 1);
      setPhase('slide');
    }
  };

  return (
    <Overlay onClose={onClose}>
      {/* Modal box */}
      <div
        onClick={e => e.stopPropagation()}
        style={{
          background: '#fff', borderRadius: '20px', width: '90vw', maxWidth: '800px',
          maxHeight: '92vh', display: 'flex', flexDirection: 'column',
          boxShadow: '0 24px 80px rgba(0,0,0,0.35)',
          overflow: 'hidden',
        }}
      >
        {/* Header */}
        <div style={{ padding: '16px 20px', borderBottom: '1px solid #f1f5f9', display: 'flex', alignItems: 'center', gap: '16px', flexShrink: 0 }}>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontSize: '13px', color: '#94a3b8', fontWeight: 600, marginBottom: '6px' }}>{contentTitle}</div>
            <ProgressDots total={totalSlides} current={slideIdx} />
          </div>
          <div style={{ fontSize: '13px', color: '#64748b', flexShrink: 0 }}>
            {phase === 'final_task' ? 'Final Task' : phase === 'done' ? 'Complete!' : `Slide ${slideIdx + 1} of ${totalSlides}`}
          </div>
          <button
            onClick={onClose}
            style={{ width: '32px', height: '32px', borderRadius: '50%', border: '1.5px solid #e2e8f0', background: '#f8fafc', cursor: 'pointer', fontSize: '16px', flexShrink: 0 }}
          >
            ×
          </button>
        </div>

        {/* Slide type label */}
        {phase === 'slide' && (
          <div style={{ padding: '8px 20px', background: '#f8fafc', borderBottom: '1px solid #f1f5f9', flexShrink: 0 }}>
            <span style={{
              fontSize: '11px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em',
              color: { narration: '#2563eb', animation: '#db2777', code_reveal: '#059669', analogy: '#d97706' }[cur.type] || '#64748b',
            }}>
              {{ narration: '👨‍🏫 Narration', animation: '🎬 Animation', code_reveal: '💻 Code Reveal', analogy: '🔁 Analogy' }[cur.type]}
            </span>
          </div>
        )}

        {/* Content */}
        <div style={{ flex: 1, overflowY: 'auto', padding: '24px 28px' }}>
          {phase === 'done' ? (
            <div style={{ textAlign: 'center', padding: '40px 0' }}>
              <div style={{ fontSize: '60px', marginBottom: '16px' }}>🎉</div>
              <div style={{ fontSize: '22px', fontWeight: 800, color: '#0f172a', marginBottom: '8px' }}>Lesson Complete!</div>
              <div style={{ fontSize: '14px', color: '#64748b' }}>Great job. This content is now marked as done.</div>
            </div>
          ) : phase === 'slide' ? (
            { narration: <NarrationSlide slide={cur} />, animation: <AnimationSlide slide={cur} />, code_reveal: <CodeRevealSlide slide={cur} />, analogy: <AnalogySlide slide={cur} /> }[cur.type] || null
          ) : phase === 'checkpoint' ? (
            <CheckpointView checkpoint={cur.checkpoint!} onPass={onCheckpointPass} />
          ) : (
            <FinalTaskView finalTask={lesson.finalTask} onComplete={handleComplete} />
          )}
        </div>

        {/* Footer nav */}
        {(phase === 'slide') && (
          <div style={{ padding: '16px 24px', borderTop: '1px solid #f1f5f9', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexShrink: 0 }}>
            <button
              onClick={goPrev}
              disabled={slideIdx === 0}
              style={{
                padding: '10px 20px', border: '1.5px solid #e2e8f0', borderRadius: '9px',
                background: '#fff', color: slideIdx === 0 ? '#cbd5e1' : '#374151',
                fontWeight: 600, fontSize: '14px', cursor: slideIdx === 0 ? 'not-allowed' : 'pointer',
              }}
            >
              ← Back
            </button>
            <button
              onClick={goNext}
              style={{
                padding: '10px 28px', border: 'none', borderRadius: '9px',
                background: '#0f172a', color: '#fff', fontWeight: 700, fontSize: '14px', cursor: 'pointer',
              }}
            >
              {cur.hasCheckpoint ? 'Check Understanding →' : isLast ? (hasFT ? 'Final Task →' : 'Complete ✓') : 'Next →'}
            </button>
          </div>
        )}
      </div>

      {/* Keyframe styles */}
      <style>{`
        @keyframes shake {
          0%,100% { transform: translateX(0); }
          20% { transform: translateX(-8px); }
          40% { transform: translateX(8px); }
          60% { transform: translateX(-6px); }
          80% { transform: translateX(6px); }
        }
        @keyframes fadeSlideIn {
          from { opacity: 0; transform: translateY(6px); }
          to   { opacity: 1; transform: translateY(0); }
        }
        @keyframes blink {
          0%,100% { opacity: 1; } 50% { opacity: 0; }
        }
      `}</style>
    </Overlay>
  );
}

function Overlay({ onClose, children }: { onClose: () => void; children: React.ReactNode }) {
  return (
    <div
      onClick={onClose}
      style={{
        position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.7)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        zIndex: 2000, padding: '16px',
      }}
    >
      {children}
    </div>
  );
}
