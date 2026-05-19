import React, { useState, useEffect } from 'react';
import axios from 'axios';

// ─── Types ────────────────────────────────────────────────────────────────────

type SlideType     = 'narration' | 'animation' | 'code_reveal' | 'analogy';
type FinalTaskType = 'none' | 'quiz' | 'coding' | 'assignment';
type Speed         = 'slow' | 'normal' | 'fast';

interface CpOption  { text: string; isCorrect: boolean; }
interface Checkpoint { question: string; options: CpOption[]; explanation: string; }

interface Slide {
  id: string;
  type: SlideType;
  text: string;
  avatarEmoji: string;
  animationPreset: string;
  lottieUrl: string;
  caption: string;
  code: string;
  language: string;
  lineCommentary: string;
  speed: Speed;
  leftLabel: string;
  rightLabel: string;
  imageUrl: string;
  connectingText: string;
  hasCheckpoint: boolean;
  checkpoint: Checkpoint;
}

interface FTQuestion {
  id: string;
  type: 'mcq' | 'coding' | 'theory';
  title: string;
  description: string;
  options: CpOption[];
  explanation: string;
  starterCode: Record<string, string>;
  allowedLanguages: string[];
  testCases: Array<{ input: string; expectedOutput: string; isHidden: boolean }>;
  marks: number;
}

interface FinalTask {
  type: FinalTaskType;
  title: string;
  description: string;
  passingScore: number;
  questions: FTQuestion[];
}

// ─── Constants ────────────────────────────────────────────────────────────────

const AVATARS = ['👨‍🏫', '👩‍🏫', '🤖', '🧑‍💻', '🧙', '🦉'];

const ANIMATION_PRESETS = [
  { value: 'queue',         label: 'Queue (FIFO)',         icon: '📤' },
  { value: 'stack',         label: 'Stack (LIFO)',         icon: '📚' },
  { value: 'array',         label: 'Array Traversal',     icon: '🔢' },
  { value: 'linked_list',   label: 'Linked List',         icon: '🔗' },
  { value: 'binary_tree',   label: 'Binary Tree',         icon: '🌳' },
  { value: 'bubble_sort',   label: 'Bubble Sort',         icon: '🫧' },
  { value: 'binary_search', label: 'Binary Search',       icon: '🔍' },
  { value: 'hashmap',       label: 'HashMap',             icon: '🗺️' },
  { value: 'custom',        label: 'Custom (Lottie URL)', icon: '✨' },
];

const LANGUAGES = ['java', 'python', 'javascript', 'typescript', 'cpp', 'c', 'sql', 'html', 'css', 'bash'];

const SLIDE_META: Record<SlideType, { icon: string; label: string; bg: string }> = {
  narration:   { icon: '👨‍🏫', label: 'Narration',   bg: '#dbeafe' },
  animation:   { icon: '🎬', label: 'Animation',   bg: '#fce7f3' },
  code_reveal: { icon: '💻', label: 'Code Reveal', bg: '#d1fae5' },
  analogy:     { icon: '🔁', label: 'Analogy',     bg: '#fef3c7' },
};

// ─── Helpers ──────────────────────────────────────────────────────────────────

const uid = () => Math.random().toString(36).slice(2, 9);

const blankCheckpoint = (): Checkpoint => ({
  question: '',
  options:  [{ text: '', isCorrect: true }, { text: '', isCorrect: false }],
  explanation: '',
});

const blankSlide = (type: SlideType): Slide => ({
  id: uid(), type,
  text: '', avatarEmoji: '👨‍🏫',
  animationPreset: 'queue', lottieUrl: '', caption: '',
  code: '', language: 'java', lineCommentary: '', speed: 'normal',
  leftLabel: '', rightLabel: '', imageUrl: '', connectingText: 'works exactly like',
  hasCheckpoint: false, checkpoint: blankCheckpoint(),
});

const blankFTQ = (type: FTQuestion['type'] = 'mcq'): FTQuestion => ({
  id: uid(), type, title: '', description: '',
  options: type === 'mcq' ? [{ text: '', isCorrect: true }, { text: '', isCorrect: false }] : [],
  explanation: '', starterCode: {}, allowedLanguages: ['java'], testCases: [], marks: 1,
});

const authHeader = () => {
  const token    = localStorage.getItem('token');
  const tenantId = localStorage.getItem('tenantId');
  return {
    ...(token    && { Authorization: `Bearer ${token}` }),
    ...(tenantId && { 'X-Tenant-Id': tenantId }),
  };
};

// ─── Shared micro-styles ─────────────────────────────────────────────────────

const inp: React.CSSProperties = {
  width: '100%', padding: '8px 11px', border: '1.5px solid #e2e8f0',
  borderRadius: '7px', fontSize: '13px', outline: 'none',
  background: '#fff', boxSizing: 'border-box',
};
const lbl: React.CSSProperties = {
  display: 'block', fontWeight: 600, fontSize: '12px',
  color: '#374151', marginBottom: '5px',
};

// ─── SlideBuilder (main export) ───────────────────────────────────────────────

export default function SlideBuilder({ contentId }: { contentId: string }) {
  const [slides,    setSlides]    = useState<Slide[]>([]);
  const [selIdx,    setSelIdx]    = useState(0);
  const [finalTask, setFinalTask] = useState<FinalTask>({
    type: 'none', title: '', description: '', passingScore: 60, questions: [],
  });
  const [loading,  setLoading]  = useState(true);
  const [saving,   setSaving]   = useState(false);
  const [saveTick, setSaveTick] = useState(false);

  // Load existing lesson
  useEffect(() => {
    axios.get(`/api/v1/concept-lessons/by-content/${contentId}`, { headers: authHeader() })
      .then(({ data }) => {
        const raw: Slide[] = (data.slides || []).map((s: any) => ({
          ...blankSlide(s.type as SlideType),
          ...s,
          id: String(s._id || uid()),
          checkpoint: s.checkpoint ?? blankCheckpoint(),
        }));
        setSlides(raw);
        if (data.finalTask) {
          const ft = data.finalTask;
          setFinalTask({
            type: ft.type || 'none',
            title: ft.title || '',
            description: ft.description || '',
            passingScore: ft.passingScore ?? 60,
            questions: (ft.questions || []).map((q: any) => ({
              ...blankFTQ(q.type), ...q, id: String(q._id || uid()),
            })),
          });
        }
      })
      .catch(() => { /* no lesson yet — start blank */ })
      .finally(() => setLoading(false));
  }, [contentId]);

  const updSlide = (idx: number, patch: Partial<Slide>) =>
    setSlides(prev => prev.map((s, i) => i === idx ? { ...s, ...patch } : s));

  const addSlide = (type: SlideType) => {
    setSlides(prev => { setSelIdx(prev.length); return [...prev, blankSlide(type)]; });
  };

  const moveSlide = (idx: number, dir: 'up' | 'down') => {
    const next = dir === 'up' ? idx - 1 : idx + 1;
    if (next < 0 || next >= slides.length) return;
    setSlides(prev => {
      const a = [...prev];
      [a[idx], a[next]] = [a[next], a[idx]];
      return a;
    });
    setSelIdx(next);
  };

  const removeSlide = (idx: number) => {
    setSlides(prev => prev.filter((_, i) => i !== idx));
    setSelIdx(Math.max(0, idx - 1));
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      await axios.put(
        `/api/v1/concept-lessons/by-content/${contentId}`,
        { slides, finalTask },
        { headers: authHeader() }
      );
      setSaveTick(true);
      setTimeout(() => setSaveTick(false), 2000);
    } catch {
      alert('Failed to save lesson');
    } finally {
      setSaving(false);
    }
  };

  if (loading) return (
    <div style={{ padding: '60px', textAlign: 'center', color: '#94a3b8', fontSize: '14px' }}>
      Loading lesson...
    </div>
  );

  const sel = slides[selIdx] ?? null;

  return (
    <div>
      {/* ── Toolbar ── */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <span style={{ fontWeight: 700, fontSize: '14px', color: '#0f172a' }}>Slide Builder</span>
          <span style={{ fontSize: '12px', color: '#94a3b8' }}>
            {slides.length} slide{slides.length !== 1 ? 's' : ''}
          </span>
        </div>
        <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
          {saveTick && <span style={{ fontSize: '12px', color: '#10b981', fontWeight: 600 }}>✓ Saved</span>}
          <button
            onClick={handleSave}
            disabled={saving}
            style={{ background: '#0f172a', color: '#fff', border: 'none', borderRadius: '7px', padding: '8px 18px', fontWeight: 600, fontSize: '13px', cursor: saving ? 'not-allowed' : 'pointer', opacity: saving ? 0.7 : 1 }}
          >
            {saving ? 'Saving...' : '💾 Save Lesson'}
          </button>
        </div>
      </div>

      {/* ── Split pane ── */}
      <div style={{ display: 'flex', border: '1.5px solid #e2e8f0', borderRadius: '12px', overflow: 'hidden', minHeight: '540px' }}>

        {/* Left: slide list */}
        <div style={{ width: '230px', minWidth: '230px', borderRight: '1.5px solid #e2e8f0', background: '#f8fafc', display: 'flex', flexDirection: 'column' }}>
          <div style={{ padding: '10px', borderBottom: '1px solid #e2e8f0' }}>
            <AddSlideButtons onAdd={addSlide} />
          </div>
          <div style={{ flex: 1, overflowY: 'auto', padding: '8px', display: 'flex', flexDirection: 'column', gap: '4px' }}>
            {slides.length === 0 ? (
              <div style={{ padding: '24px 8px', textAlign: 'center', color: '#94a3b8', fontSize: '12px', lineHeight: 1.6 }}>
                No slides yet.<br />Add one above.
              </div>
            ) : slides.map((slide, idx) => (
              <SlideCard
                key={slide.id}
                slide={slide}
                index={idx}
                total={slides.length}
                isSelected={idx === selIdx}
                onSelect={() => setSelIdx(idx)}
                onMove={dir => moveSlide(idx, dir)}
                onRemove={() => removeSlide(idx)}
              />
            ))}
          </div>
        </div>

        {/* Right: editor */}
        <div style={{ flex: 1, overflowY: 'auto', padding: '20px' }}>
          {slides.length === 0 ? (
            <EmptyState onAdd={addSlide} />
          ) : sel ? (
            <SlideEditor
              slide={sel}
              onChange={patch => updSlide(selIdx, patch)}
            />
          ) : null}
        </div>
      </div>

      {/* ── Final Task ── */}
      <div style={{ marginTop: '16px' }}>
        <FinalTaskEditor finalTask={finalTask} onChange={setFinalTask} />
      </div>
    </div>
  );
}

// ─── Add Slide Buttons ────────────────────────────────────────────────────────

function AddSlideButtons({ onAdd }: { onAdd: (t: SlideType) => void }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
      <span style={{ fontSize: '10px', fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: '2px' }}>
        + Add Slide
      </span>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '4px' }}>
        {(Object.keys(SLIDE_META) as SlideType[]).map(t => (
          <button
            key={t}
            onClick={() => onAdd(t)}
            title={SLIDE_META[t].label}
            style={{
              padding: '5px 4px', border: '1.5px solid #e2e8f0', borderRadius: '6px',
              background: SLIDE_META[t].bg, cursor: 'pointer', fontSize: '11px',
              fontWeight: 600, color: '#374151', textAlign: 'center',
            }}
          >
            {SLIDE_META[t].icon} {SLIDE_META[t].label}
          </button>
        ))}
      </div>
    </div>
  );
}

// ─── Slide Card (list item) ───────────────────────────────────────────────────

function SlideCard({ slide, index, total, isSelected, onSelect, onMove, onRemove }: {
  slide: Slide; index: number; total: number; isSelected: boolean;
  onSelect: () => void; onMove: (d: 'up' | 'down') => void; onRemove: () => void;
}) {
  const meta = SLIDE_META[slide.type];
  const preview =
    slide.type === 'narration'   ? (slide.text?.slice(0, 40) || 'Empty narration') :
    slide.type === 'animation'   ? (ANIMATION_PRESETS.find(p => p.value === slide.animationPreset)?.label || slide.animationPreset) :
    slide.type === 'code_reveal' ? (slide.code?.split('\n')[0]?.slice(0, 40) || 'Empty code') :
    `${slide.leftLabel || '...'} → ${slide.rightLabel || '...'}`;

  return (
    <div
      onClick={onSelect}
      style={{
        border: `1.5px solid ${isSelected ? '#0f172a' : '#e2e8f0'}`,
        borderRadius: '8px',
        background: isSelected ? '#f0f4ff' : '#fff',
        padding: '8px',
        cursor: 'pointer',
        position: 'relative',
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '4px' }}>
        <span style={{ fontSize: '10px', background: meta.bg, borderRadius: '4px', padding: '1px 5px', fontWeight: 700, color: '#374151' }}>
          {index + 1}
        </span>
        <span style={{ fontSize: '11px', fontWeight: 700, color: '#0f172a' }}>{meta.icon} {meta.label}</span>
        {slide.hasCheckpoint && (
          <span title="Has checkpoint" style={{ fontSize: '10px', marginLeft: 'auto', color: '#7c3aed' }}>✔</span>
        )}
      </div>
      <div style={{ fontSize: '11px', color: '#64748b', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
        {preview}
      </div>
      <div style={{ display: 'flex', gap: '3px', marginTop: '6px' }}>
        <button onClick={e => { e.stopPropagation(); onMove('up'); }} disabled={index === 0}
          style={{ flex: 1, padding: '2px', fontSize: '10px', border: '1px solid #e2e8f0', borderRadius: '4px', background: '#f8fafc', cursor: index === 0 ? 'not-allowed' : 'pointer', opacity: index === 0 ? 0.4 : 1 }}>
          ↑
        </button>
        <button onClick={e => { e.stopPropagation(); onMove('down'); }} disabled={index === total - 1}
          style={{ flex: 1, padding: '2px', fontSize: '10px', border: '1px solid #e2e8f0', borderRadius: '4px', background: '#f8fafc', cursor: index === total - 1 ? 'not-allowed' : 'pointer', opacity: index === total - 1 ? 0.4 : 1 }}>
          ↓
        </button>
        <button onClick={e => { e.stopPropagation(); if (window.confirm('Remove slide?')) onRemove(); }}
          style={{ flex: 1, padding: '2px', fontSize: '10px', border: '1px solid #fecaca', borderRadius: '4px', background: '#fff', color: '#dc2626', cursor: 'pointer' }}>
          ✕
        </button>
      </div>
    </div>
  );
}

// ─── Empty state ──────────────────────────────────────────────────────────────

function EmptyState({ onAdd }: { onAdd: (t: SlideType) => void }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100%', gap: '16px', color: '#94a3b8', padding: '40px' }}>
      <div style={{ fontSize: '48px' }}>🎬</div>
      <div style={{ fontWeight: 700, fontSize: '16px', color: '#374151' }}>Start building your interactive lesson</div>
      <div style={{ fontSize: '13px', textAlign: 'center', lineHeight: 1.6 }}>
        Add slides to explain concepts in a story-telling format.<br />
        Use narration, animations, code reveals, and analogies.
      </div>
      <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', justifyContent: 'center' }}>
        {(Object.keys(SLIDE_META) as SlideType[]).map(t => (
          <button
            key={t}
            onClick={() => onAdd(t)}
            style={{
              padding: '8px 14px', border: '1.5px solid #e2e8f0', borderRadius: '8px',
              background: SLIDE_META[t].bg, cursor: 'pointer', fontSize: '13px',
              fontWeight: 600, color: '#374151',
            }}
          >
            {SLIDE_META[t].icon} {SLIDE_META[t].label}
          </button>
        ))}
      </div>
    </div>
  );
}

// ─── Slide Editor ─────────────────────────────────────────────────────────────

function SlideEditor({ slide, onChange }: { slide: Slide; onChange: (p: Partial<Slide>) => void }) {
  const meta = SLIDE_META[slide.type];

  const changeType = (type: SlideType) => {
    // preserve checkpoint, reset type-specific fields
    onChange({
      type,
      text: '', avatarEmoji: '👨‍🏫',
      animationPreset: 'queue', lottieUrl: '', caption: '',
      code: '', language: 'java', lineCommentary: '', speed: 'normal',
      leftLabel: '', rightLabel: '', imageUrl: '', connectingText: 'works exactly like',
    });
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>

      {/* Type selector */}
      <div>
        <label style={lbl}>Slide Type</label>
        <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
          {(Object.keys(SLIDE_META) as SlideType[]).map(t => (
            <button
              key={t}
              onClick={() => changeType(t)}
              style={{
                padding: '6px 12px', border: `1.5px solid ${slide.type === t ? '#0f172a' : '#e2e8f0'}`,
                borderRadius: '7px', background: slide.type === t ? SLIDE_META[t].bg : '#fff',
                cursor: 'pointer', fontSize: '12px', fontWeight: 600, color: '#374151',
              }}
            >
              {SLIDE_META[t].icon} {SLIDE_META[t].label}
            </button>
          ))}
        </div>
      </div>

      {/* Narration editor */}
      {slide.type === 'narration' && (
        <Section title={`${meta.icon} Narration`} bg={meta.bg}>
          <div style={{ marginBottom: '12px' }}>
            <label style={lbl}>Teacher Avatar</label>
            <div style={{ display: 'flex', gap: '8px' }}>
              {AVATARS.map(a => (
                <button
                  key={a}
                  onClick={() => onChange({ avatarEmoji: a })}
                  style={{
                    width: '38px', height: '38px', fontSize: '22px',
                    border: `2px solid ${slide.avatarEmoji === a ? '#0f172a' : '#e2e8f0'}`,
                    borderRadius: '8px', background: slide.avatarEmoji === a ? '#f0f4ff' : '#fff',
                    cursor: 'pointer',
                  }}
                >
                  {a}
                </button>
              ))}
            </div>
          </div>
          <div>
            <label style={lbl}>Story Text</label>
            <textarea
              value={slide.text}
              onChange={e => onChange({ text: e.target.value })}
              placeholder="Tell the concept like a story... e.g. 'Imagine you're at a restaurant and the waiter takes orders one by one — that's exactly how a Queue works!'"
              rows={7}
              style={{ ...inp, resize: 'vertical', fontFamily: 'inherit', lineHeight: 1.6 }}
            />
            <span style={{ fontSize: '11px', color: '#94a3b8' }}>
              {slide.text.length} chars · Use plain conversational language, not formal definitions.
            </span>
          </div>
        </Section>
      )}

      {/* Animation editor */}
      {slide.type === 'animation' && (
        <Section title={`${meta.icon} Animation`} bg={meta.bg}>
          <div style={{ marginBottom: '12px' }}>
            <label style={lbl}>Animation Preset</label>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(150px, 1fr))', gap: '6px' }}>
              {ANIMATION_PRESETS.map(p => (
                <button
                  key={p.value}
                  onClick={() => onChange({ animationPreset: p.value })}
                  style={{
                    padding: '8px 10px', border: `1.5px solid ${slide.animationPreset === p.value ? '#0f172a' : '#e2e8f0'}`,
                    borderRadius: '7px', background: slide.animationPreset === p.value ? '#f0f4ff' : '#fff',
                    cursor: 'pointer', fontSize: '12px', fontWeight: 600, color: '#374151', textAlign: 'left',
                  }}
                >
                  {p.icon} {p.label}
                </button>
              ))}
            </div>
          </div>

          {slide.animationPreset === 'custom' && (
            <div style={{ marginBottom: '12px' }}>
              <label style={lbl}>Lottie Animation URL</label>
              <input
                value={slide.lottieUrl}
                onChange={e => onChange({ lottieUrl: e.target.value })}
                placeholder="https://assets.lottiefiles.com/..."
                style={inp}
              />
              <span style={{ fontSize: '11px', color: '#94a3b8' }}>Paste a .json Lottie URL from lottiefiles.com</span>
            </div>
          )}

          {slide.animationPreset !== 'custom' && (
            <div style={{ marginBottom: '12px', padding: '14px', background: '#fff', borderRadius: '8px', border: '1px solid #e2e8f0', textAlign: 'center' }}>
              <div style={{ fontSize: '32px', marginBottom: '6px' }}>
                {ANIMATION_PRESETS.find(p => p.value === slide.animationPreset)?.icon || '🎬'}
              </div>
              <div style={{ fontSize: '12px', color: '#64748b' }}>
                <strong>{ANIMATION_PRESETS.find(p => p.value === slide.animationPreset)?.label}</strong> animation will play here in student view
              </div>
            </div>
          )}

          <div>
            <label style={lbl}>Caption (shown below animation)</label>
            <input
              value={slide.caption}
              onChange={e => onChange({ caption: e.target.value })}
              placeholder="e.g. Notice how elements are added at the rear and removed from the front"
              style={inp}
            />
          </div>
        </Section>
      )}

      {/* Code Reveal editor */}
      {slide.type === 'code_reveal' && (
        <Section title={`${meta.icon} Code Reveal`} bg={meta.bg}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '12px' }}>
            <div>
              <label style={lbl}>Language</label>
              <select value={slide.language} onChange={e => onChange({ language: e.target.value })} style={inp}>
                {LANGUAGES.map(l => <option key={l} value={l}>{l}</option>)}
              </select>
            </div>
            <div>
              <label style={lbl}>Reveal Speed</label>
              <select value={slide.speed} onChange={e => onChange({ speed: e.target.value as Speed })} style={inp}>
                <option value="slow">Slow</option>
                <option value="normal">Normal</option>
                <option value="fast">Fast</option>
              </select>
            </div>
          </div>
          <div style={{ marginBottom: '12px' }}>
            <label style={lbl}>Code</label>
            <textarea
              value={slide.code}
              onChange={e => onChange({ code: e.target.value })}
              placeholder={`// Write the code to reveal line-by-line\npublic class Queue {\n    private int[] arr;\n    // ...\n}`}
              rows={10}
              style={{ ...inp, fontFamily: 'monospace', fontSize: '13px', resize: 'vertical', lineHeight: 1.5 }}
            />
          </div>
          <div>
            <label style={lbl}>Teacher Commentary (optional)</label>
            <textarea
              value={slide.lineCommentary}
              onChange={e => onChange({ lineCommentary: e.target.value })}
              placeholder="Add notes that appear as the code reveals — e.g. 'Line 1: We declare our Queue class...' 'Line 5: The enqueue method adds to the rear...'"
              rows={4}
              style={{ ...inp, resize: 'vertical', fontFamily: 'inherit' }}
            />
          </div>
        </Section>
      )}

      {/* Analogy editor */}
      {slide.type === 'analogy' && (
        <Section title={`${meta.icon} Analogy Card`} bg={meta.bg}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr auto 1fr', gap: '12px', alignItems: 'end', marginBottom: '12px' }}>
            <div>
              <label style={lbl}>Real World (Left)</label>
              <input
                value={slide.leftLabel}
                onChange={e => onChange({ leftLabel: e.target.value })}
                placeholder="e.g. Restaurant queue"
                style={inp}
              />
            </div>
            <div style={{ textAlign: 'center', paddingBottom: '8px' }}>
              <div>
                <label style={lbl}>Connecting Text</label>
                <input
                  value={slide.connectingText}
                  onChange={e => onChange({ connectingText: e.target.value })}
                  placeholder="works exactly like"
                  style={{ ...inp, textAlign: 'center', width: '130px' }}
                />
              </div>
            </div>
            <div>
              <label style={lbl}>Concept (Right)</label>
              <input
                value={slide.rightLabel}
                onChange={e => onChange({ rightLabel: e.target.value })}
                placeholder="e.g. Queue data structure"
                style={inp}
              />
            </div>
          </div>

          {/* Preview card */}
          <div style={{ background: '#fff', border: '1.5px solid #e2e8f0', borderRadius: '10px', padding: '16px', textAlign: 'center', marginBottom: '12px' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '12px', flexWrap: 'wrap' }}>
              <div style={{ background: '#fef3c7', borderRadius: '8px', padding: '10px 16px', fontWeight: 700, fontSize: '14px', color: '#92400e' }}>
                {slide.leftLabel || 'Real World Concept'}
              </div>
              <div style={{ fontSize: '12px', color: '#94a3b8', fontStyle: 'italic' }}>
                {slide.connectingText || '≈'}
              </div>
              <div style={{ background: '#dbeafe', borderRadius: '8px', padding: '10px 16px', fontWeight: 700, fontSize: '14px', color: '#1e40af' }}>
                {slide.rightLabel || 'CS Concept'}
              </div>
            </div>
          </div>

          <div>
            <label style={lbl}>Illustration Image URL (optional)</label>
            <input
              value={slide.imageUrl}
              onChange={e => onChange({ imageUrl: e.target.value })}
              placeholder="https://... (paste any image URL)"
              style={inp}
            />
            {slide.imageUrl && (
              <img
                src={slide.imageUrl}
                alt="analogy"
                style={{ marginTop: '8px', maxHeight: '160px', borderRadius: '8px', border: '1px solid #e2e8f0', objectFit: 'contain' }}
                onError={e => { (e.target as HTMLImageElement).style.display = 'none'; }}
              />
            )}
          </div>
        </Section>
      )}

      {/* Checkpoint */}
      <CheckpointSection
        hasCheckpoint={slide.hasCheckpoint}
        checkpoint={slide.checkpoint}
        onChange={(patch) => onChange(patch)}
      />
    </div>
  );
}

// ─── Checkpoint Section ───────────────────────────────────────────────────────

function CheckpointSection({ hasCheckpoint, checkpoint, onChange }: {
  hasCheckpoint: boolean;
  checkpoint: Checkpoint;
  onChange: (p: Partial<Slide>) => void;
}) {
  const updCp = (patch: Partial<Checkpoint>) =>
    onChange({ checkpoint: { ...checkpoint, ...patch } });

  const setOpt = (idx: number, field: keyof CpOption, val: any) => {
    const opts = checkpoint.options.map((o, i) => {
      if (i !== idx) return field === 'isCorrect' ? { ...o, isCorrect: false } : o;
      return { ...o, [field]: val };
    });
    updCp({ options: opts });
  };

  const addOpt = () => updCp({ options: [...checkpoint.options, { text: '', isCorrect: false }] });
  const rmOpt  = (idx: number) => updCp({ options: checkpoint.options.filter((_, i) => i !== idx) });

  return (
    <div style={{ border: `1.5px solid ${hasCheckpoint ? '#7c3aed' : '#e2e8f0'}`, borderRadius: '10px', padding: '14px' }}>
      <label style={{ display: 'flex', alignItems: 'center', gap: '10px', cursor: 'pointer', marginBottom: hasCheckpoint ? '14px' : 0 }}>
        <input
          type="checkbox"
          checked={hasCheckpoint}
          onChange={e => onChange({ hasCheckpoint: e.target.checked })}
        />
        <span style={{ fontWeight: 700, fontSize: '13px', color: hasCheckpoint ? '#7c3aed' : '#374151' }}>
          ✔ Add checkpoint after this slide
        </span>
        <span style={{ fontSize: '11px', color: '#94a3b8', fontWeight: 400 }}>
          Student must answer correctly to continue
        </span>
      </label>

      {hasCheckpoint && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
          <div>
            <label style={lbl}>Checkpoint Question</label>
            <textarea
              value={checkpoint.question}
              onChange={e => updCp({ question: e.target.value })}
              placeholder="e.g. In a Queue, which end do new elements get added to?"
              rows={2}
              style={{ ...inp, resize: 'vertical' }}
            />
          </div>

          <div>
            <label style={lbl}>Options (select the correct answer)</label>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
              {checkpoint.options.map((opt, idx) => (
                <div key={idx} style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                  <input
                    type="radio"
                    name={`cp-correct-${checkpoint.question}`}
                    checked={opt.isCorrect}
                    onChange={() => setOpt(idx, 'isCorrect', true)}
                    title="Mark as correct"
                  />
                  <input
                    value={opt.text}
                    onChange={e => setOpt(idx, 'text', e.target.value)}
                    placeholder={`Option ${idx + 1}`}
                    style={{ ...inp, flex: 1 }}
                  />
                  {checkpoint.options.length > 2 && (
                    <button onClick={() => rmOpt(idx)} style={{ padding: '4px 8px', border: '1px solid #fecaca', borderRadius: '5px', background: '#fff', color: '#dc2626', cursor: 'pointer', fontSize: '11px' }}>✕</button>
                  )}
                </div>
              ))}
              {checkpoint.options.length < 4 && (
                <button onClick={addOpt} style={{ padding: '5px 12px', border: '1.5px dashed #cbd5e1', borderRadius: '6px', background: '#f8fafc', color: '#374151', cursor: 'pointer', fontSize: '12px', fontWeight: 600, textAlign: 'left' }}>
                  + Add Option
                </button>
              )}
            </div>
          </div>

          <div>
            <label style={lbl}>Explanation (shown after student answers)</label>
            <textarea
              value={checkpoint.explanation}
              onChange={e => updCp({ explanation: e.target.value })}
              placeholder="Explain why the correct answer is correct..."
              rows={2}
              style={{ ...inp, resize: 'vertical' }}
            />
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Final Task Editor ────────────────────────────────────────────────────────

function FinalTaskEditor({ finalTask, onChange }: { finalTask: FinalTask; onChange: (ft: FinalTask) => void }) {
  const set = (patch: Partial<FinalTask>) => onChange({ ...finalTask, ...patch });

  const addQ = (type: FTQuestion['type']) =>
    set({ questions: [...finalTask.questions, blankFTQ(type)] });

  const updQ = (idx: number, patch: Partial<FTQuestion>) =>
    set({ questions: finalTask.questions.map((q, i) => i === idx ? { ...q, ...patch } : q) });

  const rmQ = (idx: number) =>
    set({ questions: finalTask.questions.filter((_, i) => i !== idx) });

  const setOpt = (qIdx: number, oIdx: number, field: keyof CpOption, val: any) => {
    const opts = finalTask.questions[qIdx].options.map((o, i) => {
      if (field === 'isCorrect') return { ...o, isCorrect: i === oIdx ? val : false };
      return i === oIdx ? { ...o, [field]: val } : o;
    });
    updQ(qIdx, { options: opts });
  };

  const addOpt = (qIdx: number) => updQ(qIdx, { options: [...finalTask.questions[qIdx].options, { text: '', isCorrect: false }] });
  const rmOpt  = (qIdx: number, oIdx: number) => updQ(qIdx, { options: finalTask.questions[qIdx].options.filter((_, i) => i !== oIdx) });

  const addTC = (qIdx: number) => updQ(qIdx, { testCases: [...finalTask.questions[qIdx].testCases, { input: '', expectedOutput: '', isHidden: false }] });
  const updTC = (qIdx: number, tIdx: number, field: string, val: any) => {
    const tcs = finalTask.questions[qIdx].testCases.map((t, i) => i === tIdx ? { ...t, [field]: val } : t);
    updQ(qIdx, { testCases: tcs });
  };
  const rmTC = (qIdx: number, tIdx: number) => updQ(qIdx, { testCases: finalTask.questions[qIdx].testCases.filter((_, i) => i !== tIdx) });

  const TASK_TYPES: { value: FinalTaskType; label: string; icon: string }[] = [
    { value: 'none',       label: 'None',       icon: '—' },
    { value: 'quiz',       label: 'Quiz',        icon: '📝' },
    { value: 'coding',     label: 'Coding',      icon: '⌨️' },
    { value: 'assignment', label: 'Assignment',  icon: '📋' },
  ];

  return (
    <div style={{ border: '1.5px solid #e2e8f0', borderRadius: '12px', padding: '18px', background: '#fff' }}>
      <h4 style={{ margin: '0 0 14px', fontSize: '14px', fontWeight: 700, color: '#0f172a' }}>
        Final Task <span style={{ fontSize: '12px', color: '#94a3b8', fontWeight: 400 }}>— Student must complete this to finish the lesson</span>
      </h4>

      {/* Task type toggle */}
      <div style={{ display: 'flex', gap: '6px', marginBottom: '16px', flexWrap: 'wrap' }}>
        {TASK_TYPES.map(t => (
          <button
            key={t.value}
            onClick={() => set({ type: t.value, questions: finalTask.questions })}
            style={{
              padding: '7px 14px', border: `1.5px solid ${finalTask.type === t.value ? '#0f172a' : '#e2e8f0'}`,
              borderRadius: '7px', background: finalTask.type === t.value ? '#0f172a' : '#fff',
              color: finalTask.type === t.value ? '#fff' : '#374151',
              cursor: 'pointer', fontSize: '13px', fontWeight: 600,
            }}
          >
            {t.icon} {t.label}
          </button>
        ))}
      </div>

      {finalTask.type === 'none' && (
        <div style={{ color: '#94a3b8', fontSize: '13px', padding: '12px 0' }}>
          No final task — lesson ends at the last slide.
        </div>
      )}

      {(finalTask.type === 'quiz' || finalTask.type === 'coding') && (
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '16px', marginBottom: '14px', flexWrap: 'wrap' }}>
            <div style={{ flex: 1, minWidth: '200px' }}>
              <label style={lbl}>Task Title</label>
              <input value={finalTask.title} onChange={e => set({ title: e.target.value })} placeholder="e.g. Queue Concept Quiz" style={inp} />
            </div>
            <div style={{ minWidth: '140px' }}>
              <label style={lbl}>Passing Score (%)</label>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <input
                  type="range" min={0} max={100} step={5}
                  value={finalTask.passingScore}
                  onChange={e => set({ passingScore: Number(e.target.value) })}
                  style={{ flex: 1 }}
                />
                <span style={{ fontWeight: 700, fontSize: '14px', color: '#0f172a', minWidth: '32px' }}>{finalTask.passingScore}%</span>
              </div>
            </div>
          </div>

          {/* Questions */}
          {finalTask.questions.map((q, qIdx) => (
            <div key={q.id} style={{ border: '1.5px solid #e2e8f0', borderRadius: '10px', padding: '14px', marginBottom: '10px', background: '#f8fafc' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
                <span style={{ fontWeight: 700, fontSize: '13px', color: '#0f172a' }}>
                  {finalTask.type === 'quiz' ? `Q${qIdx + 1} — MCQ` : `Problem ${qIdx + 1}`}
                </span>
                <button onClick={() => rmQ(qIdx)} style={{ padding: '3px 8px', border: '1px solid #fecaca', borderRadius: '5px', background: '#fff', color: '#dc2626', cursor: 'pointer', fontSize: '11px' }}>
                  ✕ Remove
                </button>
              </div>

              <div style={{ marginBottom: '8px' }}>
                <label style={lbl}>Title</label>
                <input value={q.title} onChange={e => updQ(qIdx, { title: e.target.value })} placeholder="Question title" style={inp} />
              </div>
              <div style={{ marginBottom: '8px' }}>
                <label style={lbl}>{q.type === 'coding' ? 'Problem Statement' : 'Question'}</label>
                <textarea value={q.description} onChange={e => updQ(qIdx, { description: e.target.value })} rows={3} style={{ ...inp, resize: 'vertical' }} placeholder="Full description..." />
              </div>

              {q.type === 'mcq' && (
                <div style={{ marginBottom: '8px' }}>
                  <label style={lbl}>Options</label>
                  {q.options.map((opt, oIdx) => (
                    <div key={oIdx} style={{ display: 'flex', gap: '6px', marginBottom: '5px', alignItems: 'center' }}>
                      <input type="radio" name={`ft-correct-${q.id}`} checked={opt.isCorrect} onChange={() => setOpt(qIdx, oIdx, 'isCorrect', true)} title="Correct answer" />
                      <input value={opt.text} onChange={e => setOpt(qIdx, oIdx, 'text', e.target.value)} placeholder={`Option ${oIdx + 1}`} style={{ ...inp, flex: 1 }} />
                      {q.options.length > 2 && <button onClick={() => rmOpt(qIdx, oIdx)} style={{ padding: '3px 7px', border: '1px solid #fecaca', borderRadius: '4px', background: '#fff', color: '#dc2626', cursor: 'pointer', fontSize: '11px' }}>✕</button>}
                    </div>
                  ))}
                  {q.options.length < 5 && <button onClick={() => addOpt(qIdx)} style={{ padding: '4px 10px', border: '1.5px dashed #cbd5e1', borderRadius: '5px', background: '#f8fafc', color: '#374151', cursor: 'pointer', fontSize: '12px', fontWeight: 600 }}>+ Option</button>}
                  <div style={{ marginTop: '8px' }}>
                    <label style={lbl}>Explanation</label>
                    <textarea value={q.explanation} onChange={e => updQ(qIdx, { explanation: e.target.value })} rows={2} placeholder="Why is the correct answer correct?" style={{ ...inp, resize: 'vertical' }} />
                  </div>
                </div>
              )}

              {q.type === 'coding' && (
                <div>
                  <div style={{ marginBottom: '8px' }}>
                    <label style={lbl}>Allowed Languages</label>
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
                      {LANGUAGES.map(lang => (
                        <label key={lang} style={{ display: 'flex', alignItems: 'center', gap: '4px', fontSize: '12px', cursor: 'pointer' }}>
                          <input
                            type="checkbox"
                            checked={q.allowedLanguages.includes(lang)}
                            onChange={e => updQ(qIdx, { allowedLanguages: e.target.checked ? [...q.allowedLanguages, lang] : q.allowedLanguages.filter(l => l !== lang) })}
                          />
                          {lang}
                        </label>
                      ))}
                    </div>
                  </div>
                  <div>
                    <label style={lbl}>Test Cases</label>
                    {q.testCases.map((tc, tIdx) => (
                      <div key={tIdx} style={{ display: 'grid', gridTemplateColumns: '1fr 1fr auto auto', gap: '6px', marginBottom: '5px', alignItems: 'center' }}>
                        <input value={tc.input} onChange={e => updTC(qIdx, tIdx, 'input', e.target.value)} placeholder="Input" style={{ ...inp, fontSize: '12px' }} />
                        <input value={tc.expectedOutput} onChange={e => updTC(qIdx, tIdx, 'expectedOutput', e.target.value)} placeholder="Expected Output" style={{ ...inp, fontSize: '12px' }} />
                        <label style={{ display: 'flex', alignItems: 'center', gap: '3px', fontSize: '11px', whiteSpace: 'nowrap' }}>
                          <input type="checkbox" checked={tc.isHidden} onChange={e => updTC(qIdx, tIdx, 'isHidden', e.target.checked)} /> Hidden
                        </label>
                        <button onClick={() => rmTC(qIdx, tIdx)} style={{ padding: '3px 6px', border: '1px solid #fecaca', borderRadius: '4px', background: '#fff', color: '#dc2626', cursor: 'pointer', fontSize: '11px' }}>✕</button>
                      </div>
                    ))}
                    <button onClick={() => addTC(qIdx)} style={{ padding: '4px 10px', border: '1.5px dashed #cbd5e1', borderRadius: '5px', background: '#f8fafc', color: '#374151', cursor: 'pointer', fontSize: '12px', fontWeight: 600 }}>+ Test Case</button>
                  </div>
                </div>
              )}
            </div>
          ))}

          <button
            onClick={() => addQ(finalTask.type === 'coding' ? 'coding' : 'mcq')}
            style={{ width: '100%', padding: '8px', border: '1.5px dashed #cbd5e1', borderRadius: '8px', background: '#f8fafc', color: '#374151', cursor: 'pointer', fontSize: '13px', fontWeight: 600 }}
          >
            + Add {finalTask.type === 'coding' ? 'Coding Problem' : 'Question'}
          </button>
        </div>
      )}

      {finalTask.type === 'assignment' && (
        <div>
          <div style={{ marginBottom: '10px' }}>
            <label style={lbl}>Assignment Title</label>
            <input value={finalTask.title} onChange={e => set({ title: e.target.value })} placeholder="e.g. Implement a Queue using arrays" style={inp} />
          </div>
          <div>
            <label style={lbl}>Instructions</label>
            <textarea
              value={finalTask.description}
              onChange={e => set({ description: e.target.value })}
              rows={5}
              placeholder="Describe what the student needs to do, what to submit, and how it will be graded..."
              style={{ ...inp, resize: 'vertical', fontFamily: 'inherit' }}
            />
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Section wrapper ──────────────────────────────────────────────────────────

function Section({ title, bg, children }: { title: string; bg: string; children: React.ReactNode }) {
  return (
    <div style={{ border: '1.5px solid #e2e8f0', borderRadius: '10px', overflow: 'hidden' }}>
      <div style={{ background: bg, padding: '8px 14px', fontWeight: 700, fontSize: '13px', color: '#374151', borderBottom: '1px solid #e2e8f0' }}>
        {title}
      </div>
      <div style={{ padding: '14px', background: '#fff' }}>
        {children}
      </div>
    </div>
  );
}
