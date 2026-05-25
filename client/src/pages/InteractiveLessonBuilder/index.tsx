import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import {
  interactiveLessonApi,
  InteractiveLesson,
  Scene,
  SceneType,
  ProgrammingLanguage,
  Difficulty,
  SCENE_TYPE_LABELS,
  SCENE_TYPE_ICONS,
  LANGUAGE_LABELS,
  DIFFICULTY_COLORS,
} from '../../api/interactiveLessonApi';

// ─── Helpers ──────────────────────────────────────────────────────────────────
const LANGUAGES: ProgrammingLanguage[] = ['java', 'python', 'javascript', 'cpp', 'sql', 'typescript', 'go', 'rust', 'kotlin', 'swift'];
const SCENE_TYPES: SceneType[] = ['story', 'code_demo', 'drag_drop', 'quiz', 'fill_blank', 'code_run', 'summary'];
const DIFFICULTIES: Difficulty[] = ['beginner', 'intermediate', 'advanced'];

function makeId() {
  return Math.random().toString(36).slice(2, 10);
}

function defaultScene(type: SceneType, language: ProgrammingLanguage): Scene {
  const base = { type, title: SCENE_TYPE_LABELS[type], xpReward: 10 };
  switch (type) {
    case 'story':
      return { ...base, story: { avatarEmoji: '👨‍🏫', avatarName: 'Mentor', text: '', animationType: 'fade' } };
    case 'code_demo':
      return { ...base, codeDemo: { language, code: '', lines: [], revealSpeed: 'normal', highlightColor: '#fef08a' } };
    case 'drag_drop':
      return {
        ...base, dragDrop: {
          instruction: '',
          buckets: [{ id: makeId(), label: 'Bucket 1', color: '#3b82f6' }, { id: makeId(), label: 'Bucket 2', color: '#10b981' }],
          items: [{ id: makeId(), label: 'Item 1', targetBucket: '' }],
          explanation: '',
        }
      };
    case 'quiz':
      return {
        ...base, quiz: {
          question: '',
          options: [
            { id: makeId(), text: '', isCorrect: true },
            { id: makeId(), text: '', isCorrect: false },
            { id: makeId(), text: '', isCorrect: false },
            { id: makeId(), text: '', isCorrect: false },
          ],
          explanation: '',
        }
      };
    case 'fill_blank':
      return {
        ...base, fillBlank: {
          templateText: 'int ___ = 10;',
          blanks: [{ index: 0, answer: 'x', hint: '' }],
          explanation: '',
          isCode: true,
          codeLanguage: language,
        }
      };
    case 'code_run':
      return {
        ...base, codeRun: {
          language,
          starterCode: language === 'java'
            ? 'public class Main {\n  public static void main(String[] args) {\n    // Write your code here\n  }\n}'
            : language === 'python'
            ? '# Write your code here\nprint("Hello World")'
            : '// Write your code here\nconsole.log("Hello World")',
          instructions: 'Write a program that...',
          expectedOutput: '',
        }
      };
    case 'summary':
      return {
        ...base, summary: {
          title: 'What you learned',
          points: [{ emoji: '✅', text: '' }],
        }
      };
  }
}

// ─── Scene Editors ────────────────────────────────────────────────────────────

function StoryEditor({ data, onChange }: { data: any; onChange: (d: any) => void }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
      <div style={{ display: 'flex', gap: 12 }}>
        <div style={{ flex: '0 0 80px' }}>
          <label style={labelStyle}>Avatar</label>
          <input value={data.avatarEmoji} onChange={e => onChange({ ...data, avatarEmoji: e.target.value })}
            style={{ ...inputStyle, fontSize: 24, textAlign: 'center' }} maxLength={4} />
        </div>
        <div style={{ flex: 1 }}>
          <label style={labelStyle}>Speaker Name</label>
          <input value={data.avatarName} onChange={e => onChange({ ...data, avatarName: e.target.value })}
            style={inputStyle} placeholder="Mentor" />
        </div>
        <div style={{ flex: '0 0 140px' }}>
          <label style={labelStyle}>Animation</label>
          <select value={data.animationType} onChange={e => onChange({ ...data, animationType: e.target.value })} style={inputStyle}>
            {['fade', 'slide', 'typewriter', 'bounce'].map(a => <option key={a} value={a}>{a}</option>)}
          </select>
        </div>
      </div>
      <div>
        <label style={labelStyle}>Narration Text <span style={{ color: '#94a3b8' }}>(use {'{{name}}'} for student name)</span></label>
        <textarea value={data.text} onChange={e => onChange({ ...data, text: e.target.value })}
          style={{ ...inputStyle, height: 100, resize: 'vertical' }} placeholder="Hello {{name}}! Today we'll learn about variables..." />
      </div>
      <div>
        <label style={labelStyle}>Code Illustration (optional)</label>
        <textarea value={data.codeSnippet || ''} onChange={e => onChange({ ...data, codeSnippet: e.target.value })}
          style={{ ...inputStyle, fontFamily: 'monospace', height: 80, resize: 'vertical' }} placeholder="int x = 10; // example" />
      </div>
    </div>
  );
}

function CodeDemoEditor({ data, onChange }: { data: any; onChange: (d: any) => void }) {
  const addLine = () => {
    const lineNum = (data.lines || []).length + 1;
    onChange({ ...data, lines: [...(data.lines || []), { lineNumber: lineNum, commentary: '' }] });
  };
  const updateLine = (i: number, field: string, val: any) => {
    const lines = [...data.lines];
    lines[i] = { ...lines[i], [field]: val };
    onChange({ ...data, lines });
  };
  const removeLine = (i: number) => {
    onChange({ ...data, lines: data.lines.filter((_: any, idx: number) => idx !== i) });
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
      <div style={{ display: 'flex', gap: 12 }}>
        <div style={{ flex: 1 }}>
          <label style={labelStyle}>Language</label>
          <select value={data.language} onChange={e => onChange({ ...data, language: e.target.value })} style={inputStyle}>
            {LANGUAGES.map(l => <option key={l} value={l}>{LANGUAGE_LABELS[l]}</option>)}
          </select>
        </div>
        <div style={{ flex: '0 0 120px' }}>
          <label style={labelStyle}>Reveal Speed</label>
          <select value={data.revealSpeed} onChange={e => onChange({ ...data, revealSpeed: e.target.value })} style={inputStyle}>
            <option value="slow">Slow</option>
            <option value="normal">Normal</option>
            <option value="fast">Fast</option>
          </select>
        </div>
      </div>
      <div>
        <label style={labelStyle}>Code</label>
        <textarea value={data.code} onChange={e => onChange({ ...data, code: e.target.value })}
          style={{ ...inputStyle, fontFamily: 'monospace', height: 140, resize: 'vertical' }} />
      </div>
      <div>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
          <label style={labelStyle}>Line Commentaries</label>
          <button onClick={addLine} style={miniBtn}>+ Add Line</button>
        </div>
        {(data.lines || []).map((line: any, i: number) => (
          <div key={i} style={{ display: 'flex', gap: 8, marginBottom: 6 }}>
            <input type="number" value={line.lineNumber} onChange={e => updateLine(i, 'lineNumber', +e.target.value)}
              style={{ ...inputStyle, width: 60 }} placeholder="Line#" />
            <input value={line.commentary} onChange={e => updateLine(i, 'commentary', e.target.value)}
              style={{ ...inputStyle, flex: 1 }} placeholder="Explanation for this line..." />
            <button onClick={() => removeLine(i)} style={{ ...miniBtn, background: '#fee2e2', color: '#dc2626' }}>✕</button>
          </div>
        ))}
      </div>
    </div>
  );
}

function DragDropEditor({ data, onChange }: { data: any; onChange: (d: any) => void }) {
  const addBucket = () => onChange({ ...data, buckets: [...data.buckets, { id: makeId(), label: 'New Bucket', color: '#8b5cf6' }] });
  const addItem = () => onChange({ ...data, items: [...data.items, { id: makeId(), label: 'New Item', targetBucket: '', isDecoy: false }] });
  const updateBucket = (i: number, field: string, val: any) => {
    const buckets = [...data.buckets]; buckets[i] = { ...buckets[i], [field]: val }; onChange({ ...data, buckets });
  };
  const updateItem = (i: number, field: string, val: any) => {
    const items = [...data.items]; items[i] = { ...items[i], [field]: val }; onChange({ ...data, items });
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
      <div>
        <label style={labelStyle}>Instruction</label>
        <input value={data.instruction} onChange={e => onChange({ ...data, instruction: e.target.value })}
          style={inputStyle} placeholder="Drag each item to the correct category" />
      </div>
      <div>
        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
          <label style={labelStyle}>Buckets (Drop Targets)</label>
          <button onClick={addBucket} style={miniBtn}>+ Add</button>
        </div>
        {data.buckets.map((b: any, i: number) => (
          <div key={b.id} style={{ display: 'flex', gap: 8, marginBottom: 6 }}>
            <input value={b.label} onChange={e => updateBucket(i, 'label', e.target.value)}
              style={{ ...inputStyle, flex: 1 }} placeholder="Bucket label" />
            <input type="color" value={b.color || '#3b82f6'} onChange={e => updateBucket(i, 'color', e.target.value)}
              style={{ width: 40, height: 36, border: 'none', cursor: 'pointer' }} />
            <button onClick={() => onChange({ ...data, buckets: data.buckets.filter((_: any, j: number) => j !== i) })}
              style={{ ...miniBtn, background: '#fee2e2', color: '#dc2626' }}>✕</button>
          </div>
        ))}
      </div>
      <div>
        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
          <label style={labelStyle}>Items to Drag</label>
          <button onClick={addItem} style={miniBtn}>+ Add</button>
        </div>
        {data.items.map((item: any, i: number) => (
          <div key={item.id} style={{ display: 'flex', gap: 8, marginBottom: 6, alignItems: 'center' }}>
            <input value={item.label} onChange={e => updateItem(i, 'label', e.target.value)}
              style={{ ...inputStyle, flex: 1 }} placeholder="Item text" />
            <select value={item.targetBucket} onChange={e => updateItem(i, 'targetBucket', e.target.value)} style={{ ...inputStyle, flex: 1 }}>
              <option value="">-- Select bucket --</option>
              {data.buckets.map((b: any) => <option key={b.id} value={b.id}>{b.label}</option>)}
            </select>
            <label style={{ fontSize: 12, color: '#64748b', whiteSpace: 'nowrap' }}>
              <input type="checkbox" checked={item.isDecoy || false} onChange={e => updateItem(i, 'isDecoy', e.target.checked)} /> Decoy
            </label>
            <button onClick={() => onChange({ ...data, items: data.items.filter((_: any, j: number) => j !== i) })}
              style={{ ...miniBtn, background: '#fee2e2', color: '#dc2626' }}>✕</button>
          </div>
        ))}
      </div>
      <div>
        <label style={labelStyle}>Explanation (shown after completion)</label>
        <textarea value={data.explanation} onChange={e => onChange({ ...data, explanation: e.target.value })}
          style={{ ...inputStyle, height: 70, resize: 'vertical' }} />
      </div>
    </div>
  );
}

function QuizEditor({ data, onChange }: { data: any; onChange: (d: any) => void }) {
  const updateOption = (i: number, field: string, val: any) => {
    const options = [...data.options];
    if (field === 'isCorrect' && val) options.forEach((o: any, j: number) => { o.isCorrect = j === i; });
    else options[i] = { ...options[i], [field]: val };
    onChange({ ...data, options });
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
      <div>
        <label style={labelStyle}>Question</label>
        <textarea value={data.question} onChange={e => onChange({ ...data, question: e.target.value })}
          style={{ ...inputStyle, height: 70, resize: 'vertical' }} placeholder="What is the correct way to declare a variable in Java?" />
      </div>
      <div>
        <label style={labelStyle}>Options <span style={{ color: '#94a3b8' }}>(click radio to mark correct)</span></label>
        {data.options.map((opt: any, i: number) => (
          <div key={opt.id} style={{ display: 'flex', gap: 8, marginBottom: 8, alignItems: 'center' }}>
            <input type="radio" checked={opt.isCorrect} onChange={() => updateOption(i, 'isCorrect', true)}
              style={{ width: 18, height: 18, cursor: 'pointer' }} />
            <input value={opt.text} onChange={e => updateOption(i, 'text', e.target.value)}
              style={{ ...inputStyle, flex: 1, borderColor: opt.isCorrect ? '#10b981' : '#e2e8f0' }} placeholder={`Option ${i + 1}`} />
          </div>
        ))}
        <button onClick={() => onChange({ ...data, options: [...data.options, { id: makeId(), text: '', isCorrect: false }] })}
          style={miniBtn}>+ Add Option</button>
      </div>
      <div>
        <label style={labelStyle}>Hint (optional)</label>
        <input value={data.hint || ''} onChange={e => onChange({ ...data, hint: e.target.value })} style={inputStyle} />
      </div>
      <div>
        <label style={labelStyle}>Explanation (shown after answer)</label>
        <textarea value={data.explanation} onChange={e => onChange({ ...data, explanation: e.target.value })}
          style={{ ...inputStyle, height: 70, resize: 'vertical' }} />
      </div>
    </div>
  );
}

function FillBlankEditor({ data, onChange }: { data: any; onChange: (d: any) => void }) {
  const updateBlank = (i: number, field: string, val: any) => {
    const blanks = [...data.blanks]; blanks[i] = { ...blanks[i], [field]: val }; onChange({ ...data, blanks });
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
      <div style={{ display: 'flex', gap: 12 }}>
        <div style={{ flex: 1 }}>
          <label style={labelStyle}>Mode</label>
          <select value={data.isCode ? 'code' : 'text'} onChange={e => onChange({ ...data, isCode: e.target.value === 'code' })} style={inputStyle}>
            <option value="code">Code</option>
            <option value="text">Text / Sentence</option>
          </select>
        </div>
        {data.isCode && (
          <div style={{ flex: 1 }}>
            <label style={labelStyle}>Language</label>
            <select value={data.codeLanguage || ''} onChange={e => onChange({ ...data, codeLanguage: e.target.value })} style={inputStyle}>
              {LANGUAGES.map(l => <option key={l} value={l}>{LANGUAGE_LABELS[l]}</option>)}
            </select>
          </div>
        )}
      </div>
      <div>
        <label style={labelStyle}>Template <span style={{ color: '#94a3b8' }}>(use ___ for each blank)</span></label>
        <textarea value={data.templateText} onChange={e => onChange({ ...data, templateText: e.target.value })}
          style={{ ...inputStyle, fontFamily: data.isCode ? 'monospace' : 'inherit', height: 90, resize: 'vertical' }}
          placeholder="int ___ = 10;" />
      </div>
      <div>
        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
          <label style={labelStyle}>Blank Answers</label>
          <button onClick={() => onChange({ ...data, blanks: [...data.blanks, { index: data.blanks.length, answer: '', hint: '' }] })}
            style={miniBtn}>+ Add Blank</button>
        </div>
        {data.blanks.map((b: any, i: number) => (
          <div key={i} style={{ display: 'flex', gap: 8, marginBottom: 6 }}>
            <input type="number" value={b.index} onChange={e => updateBlank(i, 'index', +e.target.value)}
              style={{ ...inputStyle, width: 60 }} />
            <input value={b.answer} onChange={e => updateBlank(i, 'answer', e.target.value)}
              style={{ ...inputStyle, flex: 1 }} placeholder="Correct answer" />
            <input value={b.hint || ''} onChange={e => updateBlank(i, 'hint', e.target.value)}
              style={{ ...inputStyle, flex: 1 }} placeholder="Hint (optional)" />
          </div>
        ))}
      </div>
      <div>
        <label style={labelStyle}>Explanation</label>
        <textarea value={data.explanation} onChange={e => onChange({ ...data, explanation: e.target.value })}
          style={{ ...inputStyle, height: 70, resize: 'vertical' }} />
      </div>
    </div>
  );
}

function CodeRunEditor({ data, onChange }: { data: any; onChange: (d: any) => void }) {
  const addTestCase = () => onChange({ ...data, testCases: [...(data.testCases || []), { input: '', expectedOutput: '' }] });

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
      <div>
        <label style={labelStyle}>Language</label>
        <select value={data.language} onChange={e => onChange({ ...data, language: e.target.value })} style={{ ...inputStyle, maxWidth: 200 }}>
          {LANGUAGES.filter(l => l !== 'sql').map(l => <option key={l} value={l}>{LANGUAGE_LABELS[l]}</option>)}
        </select>
      </div>
      <div>
        <label style={labelStyle}>Instructions</label>
        <textarea value={data.instructions} onChange={e => onChange({ ...data, instructions: e.target.value })}
          style={{ ...inputStyle, height: 70, resize: 'vertical' }} placeholder="Write a program that prints 'Hello World'" />
      </div>
      <div>
        <label style={labelStyle}>Starter Code</label>
        <textarea value={data.starterCode} onChange={e => onChange({ ...data, starterCode: e.target.value })}
          style={{ ...inputStyle, fontFamily: 'monospace', height: 120, resize: 'vertical' }} />
      </div>
      <div>
        <label style={labelStyle}>Expected Output (optional)</label>
        <input value={data.expectedOutput || ''} onChange={e => onChange({ ...data, expectedOutput: e.target.value })}
          style={{ ...inputStyle, fontFamily: 'monospace' }} placeholder="Hello World" />
      </div>
      <div>
        <label style={labelStyle}>Hint (optional)</label>
        <input value={data.hint || ''} onChange={e => onChange({ ...data, hint: e.target.value })} style={inputStyle} />
      </div>
      <div>
        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
          <label style={labelStyle}>Test Cases (optional)</label>
          <button onClick={addTestCase} style={miniBtn}>+ Add Test Case</button>
        </div>
        {(data.testCases || []).map((tc: any, i: number) => {
          const updateTC = (field: string, val: string) => {
            const tcs = [...data.testCases]; tcs[i] = { ...tcs[i], [field]: val }; onChange({ ...data, testCases: tcs });
          };
          return (
            <div key={i} style={{ display: 'flex', gap: 8, marginBottom: 6 }}>
              <input value={tc.input} onChange={e => updateTC('input', e.target.value)}
                style={{ ...inputStyle, flex: 1, fontFamily: 'monospace' }} placeholder="Input" />
              <input value={tc.expectedOutput} onChange={e => updateTC('expectedOutput', e.target.value)}
                style={{ ...inputStyle, flex: 1, fontFamily: 'monospace' }} placeholder="Expected output" />
              <button onClick={() => onChange({ ...data, testCases: data.testCases.filter((_: any, j: number) => j !== i) })}
                style={{ ...miniBtn, background: '#fee2e2', color: '#dc2626' }}>✕</button>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function SummaryEditor({ data, onChange }: { data: any; onChange: (d: any) => void }) {
  const updatePoint = (i: number, field: string, val: string) => {
    const points = [...data.points]; points[i] = { ...points[i], [field]: val }; onChange({ ...data, points });
  };
  const addConceptItem = () => onChange({ ...data, conceptMapItems: [...(data.conceptMapItems || []), { term: '', definition: '' }] });

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
      <div>
        <label style={labelStyle}>Section Title</label>
        <input value={data.title} onChange={e => onChange({ ...data, title: e.target.value })} style={inputStyle} placeholder="What you learned" />
      </div>
      <div>
        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
          <label style={labelStyle}>Key Points</label>
          <button onClick={() => onChange({ ...data, points: [...data.points, { emoji: '✅', text: '' }] })} style={miniBtn}>+ Add</button>
        </div>
        {data.points.map((pt: any, i: number) => (
          <div key={i} style={{ display: 'flex', gap: 8, marginBottom: 6 }}>
            <input value={pt.emoji || ''} onChange={e => updatePoint(i, 'emoji', e.target.value)}
              style={{ ...inputStyle, width: 50, textAlign: 'center', fontSize: 18 }} maxLength={4} />
            <input value={pt.text} onChange={e => updatePoint(i, 'text', e.target.value)}
              style={{ ...inputStyle, flex: 1 }} placeholder="Key takeaway..." />
            <button onClick={() => onChange({ ...data, points: data.points.filter((_: any, j: number) => j !== i) })}
              style={{ ...miniBtn, background: '#fee2e2', color: '#dc2626' }}>✕</button>
          </div>
        ))}
      </div>
      <div>
        <label style={labelStyle}>Code Recap (optional)</label>
        <textarea value={data.codeRecap || ''} onChange={e => onChange({ ...data, codeRecap: e.target.value })}
          style={{ ...inputStyle, fontFamily: 'monospace', height: 80, resize: 'vertical' }} />
      </div>
      <div>
        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
          <label style={labelStyle}>Concept Map (term → definition)</label>
          <button onClick={addConceptItem} style={miniBtn}>+ Add</button>
        </div>
        {(data.conceptMapItems || []).map((cm: any, i: number) => {
          const updateCM = (field: string, val: string) => {
            const items = [...data.conceptMapItems]; items[i] = { ...items[i], [field]: val }; onChange({ ...data, conceptMapItems: items });
          };
          return (
            <div key={i} style={{ display: 'flex', gap: 8, marginBottom: 6 }}>
              <input value={cm.term} onChange={e => updateCM('term', e.target.value)} style={{ ...inputStyle, flex: 1 }} placeholder="Term" />
              <input value={cm.definition} onChange={e => updateCM('definition', e.target.value)} style={{ ...inputStyle, flex: 2 }} placeholder="Definition" />
              <button onClick={() => onChange({ ...data, conceptMapItems: data.conceptMapItems.filter((_: any, j: number) => j !== i) })}
                style={{ ...miniBtn, background: '#fee2e2', color: '#dc2626' }}>✕</button>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ─── Scene Editor Dispatcher ──────────────────────────────────────────────────
function SceneEditor({ scene, onChange }: { scene: Scene; onChange: (s: Scene) => void }) {
  const updatePayload = (payload: any) => onChange({ ...scene, [scene.type === 'code_demo' ? 'codeDemo' : scene.type === 'drag_drop' ? 'dragDrop' : scene.type === 'fill_blank' ? 'fillBlank' : scene.type === 'code_run' ? 'codeRun' : scene.type]: payload });
  const data = scene.type === 'code_demo' ? scene.codeDemo
    : scene.type === 'drag_drop' ? scene.dragDrop
    : scene.type === 'fill_blank' ? scene.fillBlank
    : scene.type === 'code_run' ? scene.codeRun
    : (scene as any)[scene.type];

  return (
    <div>
      <div style={{ display: 'flex', gap: 12, marginBottom: 14 }}>
        <div style={{ flex: 2 }}>
          <label style={labelStyle}>Scene Title</label>
          <input value={scene.title || ''} onChange={e => onChange({ ...scene, title: e.target.value })}
            style={inputStyle} placeholder="Describe this scene briefly" />
        </div>
        <div style={{ flex: '0 0 100px' }}>
          <label style={labelStyle}>XP Reward</label>
          <input type="number" value={scene.xpReward} onChange={e => onChange({ ...scene, xpReward: +e.target.value })}
            style={inputStyle} min={0} max={100} />
        </div>
      </div>
      {scene.type === 'story' && data && <StoryEditor data={data} onChange={updatePayload} />}
      {scene.type === 'code_demo' && data && <CodeDemoEditor data={data} onChange={updatePayload} />}
      {scene.type === 'drag_drop' && data && <DragDropEditor data={data} onChange={updatePayload} />}
      {scene.type === 'quiz' && data && <QuizEditor data={data} onChange={updatePayload} />}
      {scene.type === 'fill_blank' && data && <FillBlankEditor data={data} onChange={updatePayload} />}
      {scene.type === 'code_run' && data && <CodeRunEditor data={data} onChange={updatePayload} />}
      {scene.type === 'summary' && data && <SummaryEditor data={data} onChange={updatePayload} />}
    </div>
  );
}

// ─── AI Generate Modal ────────────────────────────────────────────────────────
interface AIGenerateModalProps {
  defaultLanguage: ProgrammingLanguage;
  defaultDifficulty: Difficulty;
  onGenerated: (data: { title: string; description: string; tags: string[]; scenes: Scene[] }) => void;
  onClose: () => void;
}

const AI_MODELS = [
  { id: 'claude-sonnet-4-6',        label: 'Sonnet 4.6', badge: 'Recommended', badgeColor: '#6366f1', desc: 'Best balance of quality & cost (~$0.01/call)' },
  { id: 'claude-haiku-4-5-20251001',label: 'Haiku 4.5',  badge: 'Fastest',     badgeColor: '#10b981', desc: 'Cheapest option, good for simple topics (~$0.003/call)' },
  { id: 'claude-opus-4-7',          label: 'Opus 4.7',   badge: 'Best Quality',badgeColor: '#f59e0b', desc: 'Highest quality, higher cost (~$0.07/call)' },
];

function AIGenerateModal({ defaultLanguage, defaultDifficulty, onGenerated, onClose }: AIGenerateModalProps) {
  const [concept, setConcept] = useState('');
  const [language, setLanguage] = useState<ProgrammingLanguage>(defaultLanguage);
  const [difficulty, setDifficulty] = useState<Difficulty>(defaultDifficulty);
  const [notes, setNotes] = useState('');
  const [aiModel, setAiModel] = useState('claude-sonnet-4-6');
  const [generating, setGenerating] = useState(false);
  const [error, setError] = useState('');
  const [progress, setProgress] = useState('');

  const CONCEPTS = [
    'Variables & Data Types', 'Loops (for, while)', 'Functions / Methods',
    'Arrays / Lists', 'Strings', 'Conditionals (if/else)',
    'OOP - Classes & Objects', 'OOP - Inheritance', 'OOP - Polymorphism',
    'Exception Handling', 'File I/O', 'Recursion',
    'HashMap / Dictionary', 'Sorting Algorithms', 'SQL SELECT Queries',
    'SQL JOINs', 'SQL Aggregates',
  ];

  const handleGenerate = async () => {
    if (!concept.trim()) { setError('Enter a concept first'); return; }
    setGenerating(true);
    setError('');
    setProgress('Connecting to Claude AI...');

    const steps = [
      'Designing lesson structure...',
      'Writing story narration...',
      'Generating code examples...',
      'Creating quiz questions...',
      'Building drag & drop exercise...',
      'Writing code challenge...',
      'Finalising summary...',
    ];
    let stepIdx = 0;
    const progressTimer = setInterval(() => {
      if (stepIdx < steps.length) {
        setProgress(steps[stepIdx++]);
      }
    }, 2500);

    try {
      const result = await interactiveLessonApi.generateWithAI({ concept, language, difficulty, additionalNotes: notes, model: aiModel });
      clearInterval(progressTimer);
      setProgress('Done!');
      setTimeout(() => onGenerated(result), 300);
    } catch (err: any) {
      clearInterval(progressTimer);
      setError(err.message || 'Generation failed — check ANTHROPIC_API_KEY on server');
      setProgress('');
    } finally {
      setGenerating(false);
    }
  };

  return (
    <div style={{
      position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)',
      display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 2000,
    }} onClick={e => { if (e.target === e.currentTarget && !generating) onClose(); }}>
      <div style={{
        background: '#fff', borderRadius: 16, width: 520, padding: 32,
        boxShadow: '0 24px 80px rgba(0,0,0,0.25)',
        backgroundImage: generating ? 'none' : 'linear-gradient(135deg, #faf5ff 0%, #fff 100%)',
      }}>
        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 24 }}>
          <div style={{ fontSize: 36 }}>✨</div>
          <div>
            <h2 style={{ margin: 0, fontSize: 20, fontWeight: 800, color: '#1e293b' }}>Generate with Claude AI</h2>
            <p style={{ margin: 0, fontSize: 13, color: '#64748b' }}>
              Claude will auto-create all 7 scenes for your interactive lesson
            </p>
          </div>
          {!generating && (
            <button onClick={onClose} style={{ marginLeft: 'auto', background: 'none', border: 'none', cursor: 'pointer', fontSize: 22, color: '#94a3b8' }}>×</button>
          )}
        </div>

        {/* Generating animation */}
        {generating ? (
          <div style={{ textAlign: 'center', padding: '32px 0' }}>
            <div style={{ fontSize: 56, marginBottom: 16, animation: 'spin 2s linear infinite', display: 'inline-block' }}>⚙️</div>
            <div style={{ fontSize: 16, fontWeight: 700, color: '#6366f1', marginBottom: 8 }}>{progress}</div>
            <div style={{ fontSize: 13, color: '#94a3b8' }}>This takes 15–30 seconds...</div>
            <div style={{ marginTop: 20, height: 4, background: '#e2e8f0', borderRadius: 2, overflow: 'hidden' }}>
              <div style={{ height: '100%', background: 'linear-gradient(90deg, #6366f1, #ec4899)', borderRadius: 2, animation: 'progressBar 18s ease-out forwards' }} />
            </div>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            {/* Concept */}
            <div>
              <label style={labelStyle}>Concept *</label>
              <input
                value={concept}
                onChange={e => setConcept(e.target.value)}
                list="concept-suggestions"
                style={{ ...inputStyle, fontSize: 15 }}
                placeholder="e.g. Variables, Loops, OOP Classes..."
                autoFocus
              />
              <datalist id="concept-suggestions">
                {CONCEPTS.map(c => <option key={c} value={c} />)}
              </datalist>
            </div>

            {/* Language + Difficulty row */}
            <div style={{ display: 'flex', gap: 12 }}>
              <div style={{ flex: 1 }}>
                <label style={labelStyle}>Language *</label>
                <select value={language} onChange={e => setLanguage(e.target.value as ProgrammingLanguage)} style={inputStyle}>
                  {LANGUAGES.map(l => <option key={l} value={l}>{LANGUAGE_LABELS[l]}</option>)}
                </select>
              </div>
              <div style={{ flex: 1 }}>
                <label style={labelStyle}>Difficulty</label>
                <select value={difficulty} onChange={e => setDifficulty(e.target.value as Difficulty)} style={inputStyle}>
                  {(['beginner', 'intermediate', 'advanced'] as Difficulty[]).map(d => (
                    <option key={d} value={d} style={{ color: DIFFICULTY_COLORS[d] }}>
                      {d.charAt(0).toUpperCase() + d.slice(1)}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* Additional notes */}
            <div>
              <label style={labelStyle}>Additional notes (optional)</label>
              <textarea
                value={notes}
                onChange={e => setNotes(e.target.value)}
                style={{ ...inputStyle, height: 70, resize: 'vertical' }}
                placeholder="e.g. Focus on int/String types only, use real-world salary example..."
              />
            </div>

            {/* AI Model selector */}
            <div>
              <label style={labelStyle}>AI Model</label>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                {AI_MODELS.map(m => (
                  <label key={m.id} style={{
                    display: 'flex', alignItems: 'center', gap: 10, padding: '10px 12px',
                    border: `1.5px solid ${aiModel === m.id ? '#6366f1' : '#e2e8f0'}`,
                    borderRadius: 8, cursor: 'pointer',
                    background: aiModel === m.id ? '#eef2ff' : '#fff',
                  }}>
                    <input type="radio" name="aiModel" value={m.id} checked={aiModel === m.id}
                      onChange={() => setAiModel(m.id)} style={{ accentColor: '#6366f1' }} />
                    <div style={{ flex: 1 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        <span style={{ fontSize: 13, fontWeight: 600, color: '#1e293b' }}>{m.label}</span>
                        <span style={{ fontSize: 10, fontWeight: 700, padding: '2px 7px', borderRadius: 20, background: m.badgeColor, color: '#fff' }}>{m.badge}</span>
                      </div>
                      <div style={{ fontSize: 11, color: '#64748b', marginTop: 1 }}>{m.desc}</div>
                    </div>
                  </label>
                ))}
              </div>
            </div>

            {error && (
              <div style={{ padding: '10px 14px', background: '#fee2e2', color: '#dc2626', borderRadius: 8, fontSize: 13 }}>
                ❌ {error}
              </div>
            )}

            {/* What it generates */}
            <div style={{ background: '#f8fafc', borderRadius: 10, padding: '12px 14px' }}>
              <div style={{ fontSize: 12, fontWeight: 700, color: '#64748b', marginBottom: 8, textTransform: 'uppercase' }}>
                Claude will generate:
              </div>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                {(['📖 Story narration', '💻 Code demo', '🧩 Drag & Drop', '❓ Quiz', '✏️ Fill blank', '▶️ Code challenge', '📋 Summary'] as const).map(s => (
                  <span key={s} style={{ fontSize: 12, background: '#eef2ff', color: '#4338ca', padding: '3px 10px', borderRadius: 20, fontWeight: 500 }}>{s}</span>
                ))}
              </div>
            </div>

            {/* Generate button */}
            <button
              onClick={handleGenerate}
              disabled={!concept.trim()}
              style={{
                padding: '14px', background: 'linear-gradient(135deg, #6366f1, #8b5cf6)',
                color: '#fff', border: 'none', borderRadius: 10,
                fontWeight: 800, fontSize: 16, cursor: concept.trim() ? 'pointer' : 'not-allowed',
                opacity: concept.trim() ? 1 : 0.5,
                boxShadow: concept.trim() ? '0 4px 20px rgba(99,102,241,0.4)' : 'none',
              }}
            >
              ✨ Generate Lesson with Claude AI
            </button>
          </div>
        )}

        <style>{`
          @keyframes spin { from{transform:rotate(0deg)} to{transform:rotate(360deg)} }
          @keyframes progressBar { from{width:0%} to{width:95%} }
        `}</style>
      </div>
    </div>
  );
}

// ─── Main Builder Page ─────────────────────────────────────────────────────────
export default function InteractiveLessonBuilderPage() {
  const navigate = useNavigate();
  const { id } = useParams<{ id?: string }>();
  const isEdit = !!id;

  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  // Lesson meta
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [language, setLanguage] = useState<ProgrammingLanguage>('java');
  const [concept, setConcept] = useState('');
  const [difficulty, setDifficulty] = useState<Difficulty>('beginner');
  const [passingScore, setPassingScore] = useState(60);
  const [tags, setTags] = useState('');
  const [isPublished, setIsPublished] = useState(false);
  const [createLibraryEntry, setCreateLibraryEntry] = useState(true);

  // Scenes
  const [scenes, setScenes] = useState<Scene[]>([]);
  const [activeSceneIdx, setActiveSceneIdx] = useState(0);

  // Templates
  const [templates, setTemplates] = useState<any[]>([]);
  const [showTemplates, setShowTemplates] = useState(false);
  const [showAIModal, setShowAIModal] = useState(false);

  useEffect(() => {
    if (isEdit && id) {
      setLoading(true);
      interactiveLessonApi.getById(id)
        .then((lesson: InteractiveLesson) => {
          setTitle(lesson.title);
          setDescription(lesson.description || '');
          setLanguage(lesson.language);
          setConcept(lesson.concept);
          setDifficulty(lesson.difficulty);
          setPassingScore(lesson.passingScore);
          setTags(lesson.tags.join(', '));
          setIsPublished(lesson.isPublished);
          setScenes(lesson.scenes);
          setCreateLibraryEntry(false);
        })
        .catch(() => setError('Failed to load lesson'))
        .finally(() => setLoading(false));
    }
    interactiveLessonApi.getTemplates().then((r: any) => setTemplates(r.templates || []));
  }, [id, isEdit]);

  const handleAIGenerated = (data: { title: string; description: string; tags: string[]; scenes: Scene[] }) => {
    if (!title) setTitle(data.title);
    if (!description) setDescription(data.description);
    if (!tags) setTags(data.tags.join(', '));
    setScenes(data.scenes);
    setActiveSceneIdx(0);
    setShowAIModal(false);
  };

  const addScene = (type: SceneType) => {
    const s = defaultScene(type, language);
    setScenes(prev => [...prev, s]);
    setActiveSceneIdx(scenes.length);
  };

  const updateScene = useCallback((idx: number, updated: Scene) => {
    setScenes(prev => prev.map((s, i) => i === idx ? updated : s));
  }, []);

  const removeScene = (idx: number) => {
    setScenes(prev => prev.filter((_, i) => i !== idx));
    setActiveSceneIdx(prev => Math.max(0, prev - 1));
  };

  const moveScene = (idx: number, dir: -1 | 1) => {
    const newIdx = idx + dir;
    if (newIdx < 0 || newIdx >= scenes.length) return;
    const arr = [...scenes];
    [arr[idx], arr[newIdx]] = [arr[newIdx], arr[idx]];
    setScenes(arr);
    setActiveSceneIdx(newIdx);
  };

  const handleSave = async () => {
    if (!title || !concept || !language) { setError('Title, concept and language are required'); return; }
    setSaving(true);
    setError('');
    try {
      const payload = {
        title, description, language, concept, difficulty,
        scenes, passingScore, tags: tags.split(',').map(t => t.trim()).filter(Boolean),
        isPublished, createLibraryEntry,
      };
      if (isEdit && id) {
        await interactiveLessonApi.update(id, payload);
      } else {
        await interactiveLessonApi.create(payload);
      }
      navigate('/learning-library');
    } catch (err: any) {
      setError(err.message || 'Save failed');
    } finally {
      setSaving(false);
    }
  };

  if (loading) return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: 300, color: '#64748b' }}>
      Loading lesson...
    </div>
  );

  const totalXp = scenes.reduce((s, sc) => s + (sc.xpReward || 0), 0);

  return (
    <div style={{ minHeight: '100vh', background: '#f8fafc', padding: '20px' }}>
      {/* Header */}
      <div style={{ background: '#fff', borderRadius: 12, padding: '16px 20px', marginBottom: 20, boxShadow: '0 1px 4px rgba(0,0,0,0.06)', display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
        <button onClick={() => navigate('/learning-library')} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#64748b', fontSize: 20 }}>←</button>
        <h1 style={{ margin: 0, fontSize: '1.25rem', fontWeight: 700, flex: 1 }}>
          {isEdit ? 'Edit Interactive Lesson' : 'New Interactive Lesson'}
        </h1>
        <span style={{ fontSize: 13, color: '#64748b' }}>{scenes.length} scenes · {totalXp} XP</span>
        <button
          onClick={() => setIsPublished(p => !p)}
          style={{
            padding: '8px 16px', border: '1.5px solid', borderRadius: 8, cursor: 'pointer', fontSize: 13, fontWeight: 600,
            borderColor: isPublished ? '#16a34a' : '#d1d5db',
            background: isPublished ? '#dcfce7' : '#f9fafb',
            color: isPublished ? '#16a34a' : '#6b7280',
          }}>
          {isPublished ? '● Published' : '○ Draft'}
        </button>
        <button
          onClick={() => setShowAIModal(true)}
          style={{
            padding: '8px 18px', border: 'none', borderRadius: 8, cursor: 'pointer', fontSize: 13, fontWeight: 700,
            background: 'linear-gradient(135deg, #6366f1, #8b5cf6)', color: '#fff',
            boxShadow: '0 2px 10px rgba(99,102,241,0.35)',
          }}>
          ✨ Generate with AI
        </button>
        <button onClick={handleSave} disabled={saving}
          style={{ padding: '8px 20px', background: '#6366f1', color: '#fff', border: 'none', borderRadius: 8, cursor: 'pointer', fontWeight: 600, fontSize: 13 }}>
          {saving ? 'Saving...' : isEdit ? 'Save Changes' : 'Create Lesson'}
        </button>
      </div>

      {error && (
        <div style={{ background: '#fee2e2', color: '#dc2626', padding: '10px 16px', borderRadius: 8, marginBottom: 16 }}>{error}</div>
      )}

      <div style={{ display: 'flex', gap: 20, alignItems: 'flex-start' }}>
        {/* Left: Meta + Scene List */}
        <div style={{ width: 280, flexShrink: 0, display: 'flex', flexDirection: 'column', gap: 16 }}>

          {/* Lesson Meta */}
          <div style={cardStyle}>
            <h3 style={sectionTitle}>Lesson Settings</h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              <div>
                <label style={labelStyle}>Title *</label>
                <input value={title} onChange={e => setTitle(e.target.value)} style={inputStyle} placeholder="Java: Variables" />
              </div>
              <div>
                <label style={labelStyle}>Concept *</label>
                <input value={concept} onChange={e => setConcept(e.target.value)} style={inputStyle} placeholder="Variables" />
              </div>
              <div>
                <label style={labelStyle}>Language *</label>
                <select value={language} onChange={e => setLanguage(e.target.value as ProgrammingLanguage)} style={inputStyle}>
                  {LANGUAGES.map(l => <option key={l} value={l}>{LANGUAGE_LABELS[l]}</option>)}
                </select>
              </div>
              <div>
                <label style={labelStyle}>Difficulty</label>
                <select value={difficulty} onChange={e => setDifficulty(e.target.value as Difficulty)} style={inputStyle}>
                  {DIFFICULTIES.map(d => <option key={d} value={d}>{d.charAt(0).toUpperCase() + d.slice(1)}</option>)}
                </select>
              </div>
              <div>
                <label style={labelStyle}>Description</label>
                <textarea value={description} onChange={e => setDescription(e.target.value)}
                  style={{ ...inputStyle, height: 60, resize: 'vertical' }} />
              </div>
              <div>
                <label style={labelStyle}>Tags (comma-separated)</label>
                <input value={tags} onChange={e => setTags(e.target.value)} style={inputStyle} placeholder="oop, beginner" />
              </div>
              <div>
                <label style={labelStyle}>Passing Score (%)</label>
                <input type="number" value={passingScore} onChange={e => setPassingScore(+e.target.value)}
                  style={inputStyle} min={0} max={100} />
              </div>
              <label style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13, cursor: 'pointer' }}>
                <input type="checkbox" checked={isPublished} onChange={e => setIsPublished(e.target.checked)} />
                Published (visible to students)
              </label>
              {!isEdit && (
                <label style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13, cursor: 'pointer' }}>
                  <input type="checkbox" checked={createLibraryEntry} onChange={e => setCreateLibraryEntry(e.target.checked)} />
                  Add to Content Library
                </label>
              )}
            </div>
          </div>

          {/* Template Picker */}
          <div style={cardStyle}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
              <h3 style={{ ...sectionTitle, margin: 0 }}>Templates</h3>
              <button onClick={() => setShowTemplates(!showTemplates)} style={miniBtn}>{showTemplates ? 'Hide' : 'Browse'}</button>
            </div>
            {showTemplates && (
              <div style={{ maxHeight: 220, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 6 }}>
                {templates.map((t: any) => (
                  <div key={t.id} style={{ padding: '8px 10px', border: '1px solid #e2e8f0', borderRadius: 6, cursor: 'pointer', background: '#f8fafc' }}
                    onClick={() => {
                      setTitle(t.title); setConcept(t.concept); setLanguage(t.language); setDifficulty(t.difficulty);
                      setDescription(t.description); setShowTemplates(false);
                    }}>
                    <div style={{ fontSize: 12, fontWeight: 600 }}>{t.title}</div>
                    <div style={{ fontSize: 11, color: '#64748b' }}>{t.sceneSummary.join(' → ')}</div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Middle: Scene List */}
        <div style={{ width: 220, flexShrink: 0, display: 'flex', flexDirection: 'column', gap: 10 }}>
          <div style={cardStyle}>
            <h3 style={sectionTitle}>Scenes ({scenes.length})</h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6, maxHeight: 460, overflowY: 'auto' }}>
              {scenes.map((scene, idx) => (
                <div key={idx} onClick={() => setActiveSceneIdx(idx)}
                  style={{
                    padding: '8px 10px', borderRadius: 8, cursor: 'pointer', border: '1px solid',
                    borderColor: activeSceneIdx === idx ? '#6366f1' : '#e2e8f0',
                    background: activeSceneIdx === idx ? '#eef2ff' : '#fff',
                    display: 'flex', alignItems: 'center', gap: 8,
                  }}>
                  <span style={{ fontSize: 16 }}>{SCENE_TYPE_ICONS[scene.type]}</span>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: 12, fontWeight: 600, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                      {scene.title || SCENE_TYPE_LABELS[scene.type]}
                    </div>
                    <div style={{ fontSize: 11, color: '#64748b' }}>{scene.xpReward} XP</div>
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                    <button onClick={e => { e.stopPropagation(); moveScene(idx, -1); }}
                      style={{ ...miniBtn, padding: '1px 6px', lineHeight: 1 }} disabled={idx === 0}>↑</button>
                    <button onClick={e => { e.stopPropagation(); moveScene(idx, 1); }}
                      style={{ ...miniBtn, padding: '1px 6px', lineHeight: 1 }} disabled={idx === scenes.length - 1}>↓</button>
                  </div>
                  <button onClick={e => { e.stopPropagation(); removeScene(idx); }}
                    style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#94a3b8', fontSize: 14 }}>✕</button>
                </div>
              ))}
            </div>

            {/* Add Scene Buttons */}
            <div style={{ marginTop: 12 }}>
              <div style={{ fontSize: 12, color: '#64748b', marginBottom: 6, fontWeight: 600 }}>Add Scene:</div>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4 }}>
                {SCENE_TYPES.map(type => (
                  <button key={type} onClick={() => addScene(type)}
                    style={{ padding: '4px 8px', fontSize: 11, border: '1px solid #e2e8f0', borderRadius: 6, background: '#f8fafc', cursor: 'pointer' }}>
                    {SCENE_TYPE_ICONS[type]} {type.replace('_', ' ')}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* Right: Active Scene Editor */}
        <div style={{ flex: 1 }}>
          {scenes.length === 0 ? (
            <div style={{ ...cardStyle, textAlign: 'center', padding: 40, color: '#64748b' }}>
              <div style={{ fontSize: 48, marginBottom: 12 }}>📭</div>
              <div style={{ fontSize: 16, fontWeight: 600, marginBottom: 8 }}>No scenes yet</div>
              <div style={{ fontSize: 14, marginBottom: 20 }}>Add your first scene from the panel on the left</div>
              <div style={{ display: 'flex', gap: 8, justifyContent: 'center', flexWrap: 'wrap' }}>
                {SCENE_TYPES.map(type => (
                  <button key={type} onClick={() => addScene(type)}
                    style={{ padding: '8px 14px', fontSize: 13, border: '1px solid #e2e8f0', borderRadius: 8, background: '#fff', cursor: 'pointer' }}>
                    {SCENE_TYPE_ICONS[type]} {SCENE_TYPE_LABELS[type]}
                  </button>
                ))}
              </div>
            </div>
          ) : scenes[activeSceneIdx] ? (
            <div style={cardStyle}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 16 }}>
                <span style={{ fontSize: 24 }}>{SCENE_TYPE_ICONS[scenes[activeSceneIdx].type]}</span>
                <div>
                  <div style={{ fontSize: 11, color: '#64748b', textTransform: 'uppercase', letterSpacing: 0.5 }}>
                    Scene {activeSceneIdx + 1} of {scenes.length}
                  </div>
                  <div style={{ fontSize: 15, fontWeight: 700 }}>{SCENE_TYPE_LABELS[scenes[activeSceneIdx].type]}</div>
                </div>
              </div>
              <SceneEditor
                scene={scenes[activeSceneIdx]}
                onChange={(updated) => updateScene(activeSceneIdx, updated)}
              />
            </div>
          ) : null}
        </div>
      </div>

      {/* AI Generate Modal */}
      {showAIModal && (
        <AIGenerateModal
          defaultLanguage={language}
          defaultDifficulty={difficulty}
          onGenerated={handleAIGenerated}
          onClose={() => setShowAIModal(false)}
        />
      )}
    </div>
  );
}

// ─── Shared Styles ────────────────────────────────────────────────────────────
const cardStyle: React.CSSProperties = {
  background: '#fff',
  borderRadius: 12,
  padding: 16,
  boxShadow: '0 1px 4px rgba(0,0,0,0.06)',
};
const sectionTitle: React.CSSProperties = {
  margin: '0 0 12px',
  fontSize: 13,
  fontWeight: 700,
  color: '#1e293b',
  textTransform: 'uppercase',
  letterSpacing: 0.5,
};
const labelStyle: React.CSSProperties = {
  display: 'block',
  fontSize: 12,
  fontWeight: 600,
  color: '#64748b',
  marginBottom: 4,
  textTransform: 'uppercase',
  letterSpacing: 0.3,
};
const inputStyle: React.CSSProperties = {
  width: '100%',
  padding: '8px 10px',
  border: '1px solid #e2e8f0',
  borderRadius: 8,
  fontSize: 13,
  outline: 'none',
  boxSizing: 'border-box',
  background: '#fff',
};
const miniBtn: React.CSSProperties = {
  padding: '4px 10px',
  fontSize: 12,
  border: '1px solid #e2e8f0',
  borderRadius: 6,
  background: '#f8fafc',
  cursor: 'pointer',
  fontWeight: 500,
};
