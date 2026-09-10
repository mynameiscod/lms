import React, { useState, useEffect, useRef } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import ReactQuill from 'react-quill';
import SlideBuilder from '../../components/SlideBuilder';
import 'react-quill/dist/quill.snow.css';
import {
  learningContentLibraryApi,
  ContentLibraryItem,
  ContentLibraryType,
  QAItem,
  PracticeQuestion,
  SkillOptions,
  CONTENT_TYPE_LABELS,
  CONTENT_TYPE_ICONS,
} from '../../api/learningContentLibraryApi';

const TYPE_OPTIONS: { value: ContentLibraryType; label: string; icon: string; desc: string }[] = [
  { value: 'video',            icon: '🎬', label: 'Video',            desc: 'Upload a video file or paste a YouTube/Vimeo link' },
  { value: 'notes',            icon: '📄', label: 'Notes',            desc: 'Upload a PDF or write rich-text notes' },
  { value: 'tech_qa',          icon: '💻', label: 'Tech Q&A',         desc: 'Technical interview questions with answers' },
  { value: 'behavioral_qa',    icon: '🤝', label: 'Behavioral Q&A',   desc: 'HR/behavioral questions with sample answers' },
  { value: 'practice_coding',  icon: '⌨️', label: 'Practice Coding',  desc: 'Coding problems with test cases (auto-graded)' },
  { value: 'practice_theory',  icon: '📝', label: 'Practice Theory',  desc: 'Written/MCQ practice with self-rating or auto-grade' },
  { value: 'aptitude',         icon: '🧠', label: 'Aptitude',         desc: 'MCQ aptitude questions with timer support' },
  { value: 'interactive_activity', icon: '🧩', label: 'Interactive Activity', desc: 'A self-contained step-by-step HTML activity (e.g. "Build your LinkedIn") — reusable on any day' },
];

const LANGUAGES = ['javascript', 'typescript', 'java', 'python', 'cpp', 'c', 'sql', 'html', 'css'];

/**
 * What each depth means to the person choosing one.
 *
 * Depth is not difficulty, and the two get confused constantly. Difficulty describes the
 * CONTENT; depth describes the STUDENT it suits — the same skill needs a slow build for
 * somebody meeting it and a one-page recap for somebody proving they still have it. Spelling
 * that out here is cheaper than an author picking CHALLENGE because it sounded impressive.
 */
const DEPTH_OPTIONS: { value: string; label: string; hint: string }[] = [
  { value: 'FOUNDATION', label: 'Foundation', hint: 'Meeting this for the first time — build it from nothing' },
  { value: 'GUIDED',     label: 'Guided',     hint: 'Has the idea, needs worked examples alongside' },
  { value: 'STANDARD',   label: 'Standard',   hint: 'The normal teaching pass' },
  { value: 'REVISION',   label: 'Revision',   hint: 'Knows it — a recap of what people forget' },
  { value: 'CHALLENGE',  label: 'Challenge',  hint: 'Already strong — stretch work beyond the requirement' },
];

const blankQA  = (): QAItem => ({ question: '', answer: '', tips: '', order: 0 });
const blankPQ  = (): PracticeQuestion => ({
  type: 'coding', title: '', description: '', difficulty: 'medium',
  marks: 1, gradingMode: 'auto',
  starterCode: {}, allowedLanguages: ['java'], testCases: [],
  options: [], explanation: '',
});

type FormState = Partial<ContentLibraryItem> & {
  topicTagsInput?: string;
  courseTagsInput?: string;
};

export default function CreateEditContent() {
  const navigate   = useNavigate();
  const { id }     = useParams<{ id?: string }>();
  const isEdit     = !!id;

  const [step,        setStep]        = useState<'type' | 'form'>(isEdit ? 'form' : 'type');
  const [activeTab,   setActiveTab]   = useState<'content' | 'lesson'>('content');
  const [saving,      setSaving]      = useState(false);
  const [loading,     setLoading]     = useState(isEdit);
  const [videoFile,   setVideoFile]   = useState<File | null>(null);
  const [notesFile,   setNotesFile]   = useState<File | null>(null);
  const [thumbFile,   setThumbFile]   = useState<File | null>(null);
  const [uploadPct,   setUploadPct]   = useState(0);
  const [skillOpts,   setSkillOpts]   = useState<SkillOptions | null>(null);
  const [skillOptsErr, setSkillOptsErr] = useState('');
  const [skillSearch, setSkillSearch] = useState('');
  const videoRef = useRef<HTMLInputElement>(null);
  const notesRef = useRef<HTMLInputElement>(null);
  const thumbRef = useRef<HTMLInputElement>(null);

  const [form, setForm] = useState<FormState>({
    type:              'video',
    title:             '',
    description:       '',
    topicTags:         [],
    courseTags:        [],
    topicTagsInput:    '',
    courseTagsInput:   '',
    difficulty:        undefined,
    estimatedDuration: 0,
    isPublished:       false,
    skillKeys:         [],
    applicableDirections: [],
    careerContexts:    [],
    videoSource:       'upload',
    videoUrl:          '',
    completionThreshold: 80,
    notesSource:       'upload',
    notesContent:      '',
    qaItems:           [blankQA()],
    practiceQuestions: [blankPQ()],
  });

  // Load existing item for edit
  useEffect(() => {
    if (!isEdit || !id) return;
    learningContentLibraryApi.getById(id)
      .then(item => {
        setForm({
          ...item,
          topicTagsInput:  '',
          courseTagsInput: '',
          qaItems:         item.qaItems?.length   ? item.qaItems   : [blankQA()],
          practiceQuestions: item.practiceQuestions?.length ? item.practiceQuestions : [blankPQ()],
        });
      })
      .catch(() => alert('Failed to load content'))
      .finally(() => setLoading(false));
  }, [id, isEdit]);

  /**
   * The skill picker's options.
   *
   * A FAILED FETCH AND AN EMPTY TAXONOMY ARE REPORTED DIFFERENTLY, because they need different
   * people to fix them and an author cannot tell them apart from an empty list. Swallowing the
   * error into "no skills" is how somebody concludes there is nothing to map to and saves
   * content the adaptive plan will never find — the exact failure this change exists to end.
   */
  useEffect(() => {
    learningContentLibraryApi.getSkillOptions()
      .then(opts => { setSkillOpts(opts); setSkillOptsErr(''); })
      .catch(e => {
        setSkillOpts({ skills: [], depths: [], directions: [] });
        setSkillOptsErr(e?.response?.data?.message || 'The skill list could not be loaded.');
      });
  }, []);

  const set = (field: keyof FormState, value: any) =>
    setForm(prev => ({ ...prev, [field]: value }));

  const addTag = (field: 'topicTags' | 'courseTags', inputField: 'topicTagsInput' | 'courseTagsInput') => {
    const val = (form[inputField] || '').trim();
    if (!val) return;
    const existing = form[field] || [];
    if (!existing.includes(val)) set(field, [...existing, val]);
    set(inputField, '');
  };

  const removeTag = (field: 'topicTags' | 'courseTags', tag: string) =>
    set(field, (form[field] || []).filter((t: string) => t !== tag));

  // ── Adaptive helpers ────────────────────────────────────────────────────────
  const toggleIn = (field: 'skillKeys' | 'applicableDirections' | 'careerContexts', value: string) =>
    setForm(prev => {
      const list = (prev[field] || []) as string[];
      return {
        ...prev,
        [field]: list.includes(value) ? list.filter(v => v !== value) : [...list, value],
      };
    });

  const skillName = (key: string) =>
    skillOpts?.skills.find(s => s.key === key)?.name || key;

  const visibleSkills = (skillOpts?.skills || []).filter(s => {
    if (!skillSearch.trim()) return true;
    const hay = `${s.name} ${s.key}`.toLowerCase();
    return hay.includes(skillSearch.trim().toLowerCase());
  });

  // ── Q&A helpers ─────────────────────────────────────────────────────────────
  const setQA = (idx: number, field: keyof QAItem, val: string) =>
    setForm(prev => {
      const items = [...(prev.qaItems || [])];
      items[idx] = { ...items[idx], [field]: val };
      return { ...prev, qaItems: items };
    });
  const addQA    = () => setForm(prev => ({ ...prev, qaItems: [...(prev.qaItems || []), blankQA()] }));
  const removeQA = (idx: number) =>
    setForm(prev => ({ ...prev, qaItems: (prev.qaItems || []).filter((_, i) => i !== idx) }));

  // ── Practice question helpers ─────────────────────────────────────────────
  const setPQ = (idx: number, field: keyof PracticeQuestion, val: any) =>
    setForm(prev => {
      const qs = [...(prev.practiceQuestions || [])];
      qs[idx] = { ...qs[idx], [field]: val };
      return { ...prev, practiceQuestions: qs };
    });
  const addPQ    = () => setForm(prev => ({ ...prev, practiceQuestions: [...(prev.practiceQuestions || []), blankPQ()] }));
  const removePQ = (idx: number) =>
    setForm(prev => ({ ...prev, practiceQuestions: (prev.practiceQuestions || []).filter((_, i) => i !== idx) }));

  const addTestCase = (qIdx: number) =>
    setPQ(qIdx, 'testCases', [...(form.practiceQuestions?.[qIdx]?.testCases || []), { input: '', expectedOutput: '', isHidden: false }]);
  const setTestCase = (qIdx: number, tcIdx: number, field: string, val: any) =>
    setForm(prev => {
      const qs = [...(prev.practiceQuestions || [])];
      const tcs = [...(qs[qIdx]?.testCases || [])];
      tcs[tcIdx] = { ...tcs[tcIdx], [field]: val };
      qs[qIdx] = { ...qs[qIdx], testCases: tcs };
      return { ...prev, practiceQuestions: qs };
    });
  const removeTestCase = (qIdx: number, tcIdx: number) =>
    setForm(prev => {
      const qs = [...(prev.practiceQuestions || [])];
      qs[qIdx] = { ...qs[qIdx], testCases: (qs[qIdx]?.testCases || []).filter((_, i) => i !== tcIdx) };
      return { ...prev, practiceQuestions: qs };
    });

  const addOption = (qIdx: number) =>
    setPQ(qIdx, 'options', [...(form.practiceQuestions?.[qIdx]?.options || []), { text: '', isCorrect: false }]);
  const setOption = (qIdx: number, oIdx: number, field: string, val: any) =>
    setForm(prev => {
      const qs = [...(prev.practiceQuestions || [])];
      const opts = [...(qs[qIdx]?.options || [])];
      opts[oIdx] = { ...opts[oIdx], [field]: val };
      qs[qIdx] = { ...qs[qIdx], options: opts };
      return { ...prev, practiceQuestions: qs };
    });
  const removeOption = (qIdx: number, oIdx: number) =>
    setForm(prev => {
      const qs = [...(prev.practiceQuestions || [])];
      qs[qIdx] = { ...qs[qIdx], options: (qs[qIdx]?.options || []).filter((_, i) => i !== oIdx) };
      return { ...prev, practiceQuestions: qs };
    });

  // ── Save ──────────────────────────────────────────────────────────────────
  const handleSave = async () => {
    if (!form.title?.trim()) { alert('Title is required'); return; }
    if (!form.type)           { alert('Type is required'); return; }
    setSaving(true);
    setUploadPct(0);
    try {
      const needsFile = (form.type === 'video' && (videoFile || thumbFile)) ||
                        (form.type === 'notes' && form.notesSource === 'upload' && notesFile);

      let result: ContentLibraryItem;

      if (needsFile) {
        const fd = new FormData();
        fd.append('type',              form.type!);
        fd.append('title',             form.title!);
        fd.append('description',       form.description || '');
        fd.append('topicTags',         JSON.stringify(form.topicTags || []));
        fd.append('courseTags',        JSON.stringify(form.courseTags || []));
        fd.append('difficulty',        form.difficulty || '');
        fd.append('estimatedDuration', String(form.estimatedDuration || 0));
        fd.append('isPublished',       String(form.isPublished || false));
        fd.append('videoSource',       form.videoSource || '');
        fd.append('videoUrl',          form.videoUrl || '');
        fd.append('videoThumbnail',    form.videoThumbnail || '');
        fd.append('completionThreshold', String(form.completionThreshold || 0));
        fd.append('notesSource',       form.notesSource || '');
        // Adaptive fields. Arrays go as JSON because multipart has no array type, and the
        // server parses them back — the same convention topicTags already uses above.
        fd.append('skillKeys',            JSON.stringify(form.skillKeys || []));
        fd.append('learningDepth',        form.learningDepth || '');
        fd.append('difficultyLevel',      form.difficultyLevel ? String(form.difficultyLevel) : '');
        fd.append('canonical',            String(!!form.canonical));
        fd.append('applicableDirections', JSON.stringify(form.applicableDirections || []));
        fd.append('careerContexts',       JSON.stringify(form.careerContexts || []));
        if (videoFile) fd.append('videoFile', videoFile);
        if (thumbFile) fd.append('thumbnailFile', thumbFile);
        if (notesFile) fd.append('notesFile', notesFile);

        result = isEdit
          ? await learningContentLibraryApi.update(id!, fd, form.type)
          : await learningContentLibraryApi.create(fd, form.type);
      } else {
        const body: Partial<ContentLibraryItem> = {
          type:              form.type,
          title:             form.title,
          description:       form.description,
          topicTags:         form.topicTags || [],
          courseTags:        form.courseTags || [],
          difficulty:        form.difficulty,
          estimatedDuration: form.estimatedDuration || 0,
          isPublished:       form.isPublished || false,
          videoSource:       form.videoSource,
          videoUrl:          form.videoUrl,
          videoThumbnail:    form.videoThumbnail,
          completionThreshold: form.completionThreshold || 0,
          notesSource:       form.notesSource,
          notesContent:      form.notesContent,
          htmlContent:       form.htmlContent,
          activitySteps:     form.activitySteps,
          qaItems:           (form.qaItems || []).filter(q => q.question.trim()),
          practiceQuestions: (form.practiceQuestions || []).filter(q => q.title.trim()),
        };

        /**
         * Adaptive curriculum — what lets a measured skill gap find this row at all.
         *
         * Kept out of the typed body and sent loosely, because CLEARING a depth or a
         * difficulty means sending '' — the server reads an empty string as "unset this"
         * and a missing key as "leave it alone". The item type quite correctly does not
         * allow '' as a depth, but the wire has to carry a value the type cannot hold,
         * and a value you cannot remove is one you have to fix in the database.
         */
        const adaptive: Record<string, any> = {
          skillKeys:            form.skillKeys || [],
          learningDepth:        form.learningDepth || '',
          difficultyLevel:      form.difficultyLevel || '',
          canonical:            !!form.canonical,
          applicableDirections: form.applicableDirections || [],
          careerContexts:       form.careerContexts || [],
        };

        result = isEdit
          ? await learningContentLibraryApi.updateJson(id!, { ...body, ...adaptive })
          : await learningContentLibraryApi.createJson({ ...body, ...adaptive });
      }

      navigate('/learning-library');
    } catch (e: any) {
      alert(e?.response?.data?.message || 'Save failed');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return <div style={{ padding: '40px', textAlign: 'center', color: '#94a3b8' }}>Loading...</div>;
  }

  // ── Step 1: choose type (create only) ────────────────────────────────────
  if (step === 'type') {
    return (
      <div style={{ padding: '32px', maxWidth: '800px', margin: '0 auto' }}>
        <button onClick={() => navigate('/learning-library')} style={backBtnStyle}>← Back</button>
        <h2 style={{ margin: '16px 0 8px', fontWeight: 700, fontSize: '22px', color: '#0f172a' }}>
          Add Content — Choose Type
        </h2>
        <p style={{ color: '#64748b', marginBottom: '24px' }}>
          What kind of content are you adding?
        </p>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill,minmax(220px,1fr))', gap: '14px' }}>
          {TYPE_OPTIONS.map(opt => (
            <button
              key={opt.value}
              onClick={() => { set('type', opt.value); setStep('form'); }}
              style={{
                textAlign: 'left', padding: '18px', border: '1.5px solid #e2e8f0',
                borderRadius: '12px', background: '#fff', cursor: 'pointer',
                transition: 'all 0.15s',
              }}
              onMouseEnter={e => { (e.currentTarget as any).style.borderColor = '#0f172a'; (e.currentTarget as any).style.boxShadow = '0 4px 12px rgba(0,0,0,0.08)'; }}
              onMouseLeave={e => { (e.currentTarget as any).style.borderColor = '#e2e8f0'; (e.currentTarget as any).style.boxShadow = 'none'; }}
            >
              <div style={{ fontSize: '28px', marginBottom: '8px' }}>{opt.icon}</div>
              <div style={{ fontWeight: 700, fontSize: '15px', color: '#0f172a', marginBottom: '4px' }}>{opt.label}</div>
              <div style={{ fontSize: '12px', color: '#64748b', lineHeight: 1.4 }}>{opt.desc}</div>
            </button>
          ))}
        </div>
      </div>
    );
  }

  // ── Step 2: Form ──────────────────────────────────────────────────────────
  const type = form.type!;

  return (
    <div style={{ padding: '24px', maxWidth: '900px', margin: '0 auto' }}>
      <button onClick={() => isEdit ? navigate('/learning-library') : setStep('type')} style={backBtnStyle}>
        ← {isEdit ? 'Back to Library' : 'Change Type'}
      </button>

      {/* Tab header (edit mode only) */}
      {isEdit && (
        <div style={{ display: 'flex', gap: '0', borderBottom: '2px solid #e2e8f0', margin: '16px 0 0' }}>
          {[
            { key: 'content', label: '📄 Content' },
            { key: 'lesson',  label: '🎬 Interactive Lesson' },
          ].map(tab => (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key as 'content' | 'lesson')}
              style={{
                padding: '10px 20px', border: 'none', background: 'none', cursor: 'pointer',
                fontWeight: 700, fontSize: '14px',
                color: activeTab === tab.key ? '#0f172a' : '#64748b',
                borderBottom: activeTab === tab.key ? '2px solid #0f172a' : '2px solid transparent',
                marginBottom: '-2px',
              }}
            >
              {tab.label}
            </button>
          ))}
        </div>
      )}

      {/* Interactive Lesson tab */}
      {isEdit && activeTab === 'lesson' && (
        <div style={{ paddingTop: '24px' }}>
          <SlideBuilder contentId={id!} />
        </div>
      )}

      {/* Content tab (hidden when on lesson tab) */}
      {activeTab === 'content' && (
        <div>

      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', margin: '16px 0 24px' }}>
        <div>
          <h2 style={{ margin: 0, fontWeight: 700, fontSize: '22px', color: '#0f172a' }}>
            {CONTENT_TYPE_ICONS[type]} {isEdit ? 'Edit' : 'Add'} — {CONTENT_TYPE_LABELS[type]}
          </h2>
        </div>
        <div style={{ display: 'flex', gap: '10px' }}>
          <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', fontSize: '14px', color: '#374151' }}>
            <input
              type="checkbox"
              checked={!!form.isPublished}
              onChange={e => set('isPublished', e.target.checked)}
            />
            Publish immediately
          </label>
          <button onClick={handleSave} disabled={saving} style={saveBtnStyle}>
            {saving ? 'Saving...' : '💾 Save'}
          </button>
        </div>
      </div>

      {/* ── Basic Info ── */}
      <Section title="Basic Info">
        <Field label="Title *">
          <input
            value={form.title || ''}
            onChange={e => set('title', e.target.value)}
            placeholder="e.g. Introduction to OOP in Java"
            style={inputStyle}
          />
        </Field>
        <Field label="Description">
          <textarea
            value={form.description || ''}
            onChange={e => set('description', e.target.value)}
            placeholder="Brief description of this content item..."
            rows={2}
            style={{ ...inputStyle, resize: 'vertical' }}
          />
        </Field>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
          <Field label="Difficulty">
            <select value={form.difficulty || ''} onChange={e => set('difficulty', e.target.value || undefined)} style={inputStyle}>
              <option value="">— Not set —</option>
              <option value="beginner">🟢 Beginner</option>
              <option value="intermediate">🟡 Intermediate</option>
              <option value="advanced">🔴 Advanced</option>
            </select>
          </Field>
          <Field label="Estimated Duration (minutes)">
            <input
              type="number" min={0}
              value={form.estimatedDuration || ''}
              onChange={e => set('estimatedDuration', Number(e.target.value))}
              placeholder="e.g. 30"
              style={inputStyle}
            />
          </Field>
        </div>
        <TagInput
          label="Topic Tags"
          tags={form.topicTags || []}
          inputVal={form.topicTagsInput || ''}
          onInputChange={v => set('topicTagsInput', v)}
          onAdd={() => addTag('topicTags', 'topicTagsInput')}
          onRemove={t => removeTag('topicTags', t)}
          placeholder="e.g. Core Java, OOP — press Enter"
        />
        <TagInput
          label="Course Tags"
          tags={form.courseTags || []}
          inputVal={form.courseTagsInput || ''}
          onInputChange={v => set('courseTagsInput', v)}
          onAdd={() => addTag('courseTags', 'courseTagsInput')}
          onRemove={t => removeTag('courseTags', t)}
          placeholder="e.g. Java Fullstack — press Enter"
        />
      </Section>

      {/* ── Adaptive learning ──
        * The section that decides whether CareerPilot can ever serve this content.
        * Everything above is descriptive; a plan built from a student's measured scores
        * resolves material by canonical skill, so a row with no skills here is reachable
        * only by keyword search. */}
      <Section title="Adaptive Learning (CareerPilot)">
        {!(form.skillKeys || []).length && (
          <div style={warnBoxStyle}>
            <b>Not mapped to any skill.</b> CareerPilot's adaptive plan finds material by
            canonical skill — until you pick at least one below, this content will not be
            served to any student automatically. It stays fully usable in day plans and
            manual curricula.
          </div>
        )}

        {/* Not marked required: recordings and legacy content save without it, and an asterisk
          * on a field the save does not enforce is a lie the author learns to ignore. The
          * banner above says what leaving it empty costs. */}
        <Field label="Skills this content teaches">
          {(form.skillKeys || []).length > 0 && (
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px', marginBottom: '8px' }}>
              {(form.skillKeys || []).map(key => (
                <span key={key} style={{
                  background: '#dcfce7', color: '#166534', borderRadius: '6px',
                  padding: '3px 10px', fontSize: '12px', fontWeight: 600,
                  display: 'flex', alignItems: 'center', gap: '6px',
                }}>
                  {skillName(key)}
                  <button
                    onClick={() => toggleIn('skillKeys', key)}
                    style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#166534', fontSize: '13px', padding: 0, lineHeight: 1 }}
                  >×</button>
                </span>
              ))}
            </div>
          )}

          {skillOpts === null ? (
            <div style={{ fontSize: '13px', color: '#94a3b8' }}>Loading skills…</div>
          ) : skillOptsErr ? (
            <div style={warnBoxStyle}>
              <b>{skillOptsErr}</b> Mapping is unavailable until it loads — saving now will
              leave this content unmapped. Reload the page to try again.
            </div>
          ) : skillOpts.skills.length === 0 ? (
            <div style={warnBoxStyle}>
              The canonical skill taxonomy is empty for this environment, so there is nothing
              to map to yet. It has to be seeded before adaptive content can be authored.
            </div>
          ) : (
            <>
              <input
                value={skillSearch}
                onChange={e => setSkillSearch(e.target.value)}
                placeholder="Search skills — e.g. loops, SQL, Git"
                style={{ ...inputStyle, marginBottom: '8px' }}
              />
              <div style={{
                maxHeight: '190px', overflowY: 'auto', border: '1.5px solid #e2e8f0',
                borderRadius: '7px', padding: '6px', background: '#fff',
              }}>
                {visibleSkills.length === 0 && (
                  <div style={{ fontSize: '13px', color: '#94a3b8', padding: '8px' }}>
                    Nothing matches “{skillSearch}”.
                  </div>
                )}
                {visibleSkills.map(s => {
                  const on = (form.skillKeys || []).includes(s.key);
                  return (
                    <label
                      key={s.key}
                      style={{
                        display: 'flex', alignItems: 'center', gap: '8px', padding: '5px 8px',
                        borderRadius: '6px', cursor: 'pointer', fontSize: '13px',
                        background: on ? '#f0fdf4' : 'transparent',
                      }}
                    >
                      <input type="checkbox" checked={on} onChange={() => toggleIn('skillKeys', s.key)} />
                      <span style={{ fontWeight: on ? 600 : 500, color: '#0f172a' }}>{s.name}</span>
                      <code style={{ color: '#94a3b8', fontSize: '11px' }}>{s.key}</code>
                      {!s.assessable && (
                        <span
                          title="No paper can ask about this skill, so a plan can teach it but never measure it."
                          style={{ color: '#b45309', fontSize: '11px', fontWeight: 600 }}
                        >not assessable</span>
                      )}
                    </label>
                  );
                })}
              </div>
            </>
          )}
        </Field>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
          <Field label="Learning depth — who this version is pitched at">
            <select
              value={form.learningDepth || ''}
              onChange={e => set('learningDepth', e.target.value || undefined)}
              style={inputStyle}
            >
              <option value="">— Not set (serves any depth) —</option>
              {DEPTH_OPTIONS.map(d => (
                <option key={d.value} value={d.value}>{d.label} — {d.hint}</option>
              ))}
            </select>
          </Field>

          <Field label="Practice difficulty (1–4, planner scale)">
            <select
              value={form.difficultyLevel ? String(form.difficultyLevel) : ''}
              onChange={e => set('difficultyLevel', e.target.value ? Number(e.target.value) : undefined)}
              style={inputStyle}
            >
              <option value="">— Not set —</option>
              <option value="1">1 — Easiest</option>
              <option value="2">2 — Easy/medium</option>
              <option value="3">3 — Medium</option>
              <option value="4">4 — Hard</option>
            </select>
          </Field>
        </div>

        <Field label="Directions this content serves">
          <DirectionChips
            options={skillOpts?.directions || []}
            selected={form.applicableDirections || []}
            onToggle={k => toggleIn('applicableDirections', k)}
            emptyHint="None selected = served to every direction."
          />
        </Field>

        <Field label="Worked examples drawn from">
          <DirectionChips
            options={skillOpts?.directions || []}
            selected={form.careerContexts || []}
            onToggle={k => toggleIn('careerContexts', k)}
            emptyHint="The same skill can be taught with a shopping-cart example or a dataset one. Tagging it here lets a student get the version from their own field."
          />
        </Field>

        <label style={{ display: 'flex', alignItems: 'flex-start', gap: '8px', cursor: 'pointer', fontSize: '13px', color: '#374151', marginTop: '4px' }}>
          <input
            type="checkbox"
            checked={!!form.canonical}
            onChange={e => set('canonical', e.target.checked)}
            style={{ marginTop: '2px' }}
          />
          <span>
            <b>Preferred version</b> — pick this first when several pieces teach the same skill
            at the same depth. Without it the tie-break falls to insertion order.
          </span>
        </label>
      </Section>

      {/* ── Type-specific content ── */}
      {type === 'video' && (
        <Section title="Video Content">
          <Field label="Source">
            <div style={{ display: 'flex', gap: '12px' }}>
              {(['upload', 'youtube', 'vimeo'] as const).map(src => (
                <label key={src} style={{ display: 'flex', alignItems: 'center', gap: '6px', cursor: 'pointer', fontSize: '14px' }}>
                  <input type="radio" checked={form.videoSource === src} onChange={() => set('videoSource', src)} />
                  {src === 'upload' ? '⬆️ Upload' : src === 'youtube' ? '▶️ YouTube' : '🎥 Vimeo'}
                </label>
              ))}
            </div>
          </Field>

          {form.videoSource === 'upload' ? (
            <Field label="Video File (MP4, WebM — max 500 MB)">
              <input ref={videoRef} type="file" accept="video/*" onChange={e => setVideoFile(e.target.files?.[0] || null)} style={{ display: 'none' }} />
              <div
                onClick={() => videoRef.current?.click()}
                style={{
                  border: '2px dashed #cbd5e1', borderRadius: '10px', padding: '32px',
                  textAlign: 'center', cursor: 'pointer', background: '#f8fafc',
                }}
              >
                {videoFile ? (
                  <div>
                    <div style={{ fontSize: '24px' }}>🎬</div>
                    <div style={{ fontWeight: 600, color: '#0f172a', marginTop: '8px' }}>{videoFile.name}</div>
                    <div style={{ color: '#64748b', fontSize: '13px' }}>
                      {(videoFile.size / (1024 * 1024)).toFixed(1)} MB
                    </div>
                  </div>
                ) : (
                  <div>
                    <div style={{ fontSize: '32px', marginBottom: '8px' }}>⬆️</div>
                    <div style={{ color: '#374151', fontWeight: 600 }}>Click to choose video</div>
                    <div style={{ color: '#94a3b8', fontSize: '13px', marginTop: '4px' }}>MP4, WebM, MOV up to 500 MB</div>
                    {form.videoFilePath && (
                      <div style={{ color: '#10b981', fontSize: '12px', marginTop: '8px' }}>
                        ✓ Current file saved on server
                      </div>
                    )}
                  </div>
                )}
              </div>
            </Field>
          ) : (
            <Field label={`${form.videoSource === 'youtube' ? 'YouTube' : 'Vimeo'} URL`}>
              <input
                value={form.videoUrl || ''}
                onChange={e => set('videoUrl', e.target.value)}
                placeholder={form.videoSource === 'youtube' ? 'https://www.youtube.com/watch?v=...' : 'https://vimeo.com/...'}
                style={inputStyle}
              />
            </Field>
          )}

          <Field label="Completion Threshold (% watched to mark as complete)">
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
              <input
                type="range" min={0} max={100} step={5}
                value={form.completionThreshold ?? 80}
                onChange={e => set('completionThreshold', Number(e.target.value))}
                style={{ flex: 1 }}
              />
              <span style={{ fontWeight: 700, minWidth: '50px', color: '#0f172a' }}>
                {form.completionThreshold === 0 ? 'Just open' : `${form.completionThreshold}%`}
              </span>
            </div>
          </Field>

          <Field label="Thumbnail (optional — shown in the library)">
            <input ref={thumbRef} type="file" accept="image/*" style={{ display: 'none' }} onChange={e => setThumbFile(e.target.files?.[0] || null)} />
            <div style={{ display: 'flex', gap: '14px', alignItems: 'center' }}>
              <div
                onClick={() => thumbRef.current?.click()}
                style={{ width: '160px', height: '90px', borderRadius: '10px', border: '2px dashed #cbd5e1', background: '#f8fafc', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', overflow: 'hidden', flexShrink: 0 }}
              >
                {thumbFile ? (
                  <img src={URL.createObjectURL(thumbFile)} alt="thumb" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                ) : form.videoThumbnail ? (
                  <img src={form.videoThumbnail} alt="thumb" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                ) : (
                  <span style={{ fontSize: '26px' }}>🖼️</span>
                )}
              </div>
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: '13px', color: '#475569', marginBottom: '6px' }}>Click the box to upload an image, or paste an image URL:</div>
                <input
                  value={form.videoThumbnail || ''}
                  onChange={e => set('videoThumbnail', e.target.value)}
                  placeholder="https://… .jpg  (optional)"
                  style={inputStyle}
                />
                {thumbFile && <div style={{ fontSize: '12px', color: '#10b981', marginTop: '6px' }}>✓ New thumbnail selected — saved on submit</div>}
              </div>
            </div>
          </Field>
        </Section>
      )}

      {type === 'interactive_activity' && (
        <Section title="Interactive Activity (self-contained HTML)">
          <p style={{ margin: '0 0 12px', fontSize: 13, color: '#64748b', lineHeight: 1.6 }}>
            Paste a complete, self-contained HTML page (inline CSS + vanilla JS). It runs in a sandboxed frame in the student's day plan.
            To auto-track progress, the page can optionally post messages to the parent:
            <code style={{ display: 'block', marginTop: 6, background: '#0f172a', color: '#a5f3fc', padding: '8px 10px', borderRadius: 6, fontSize: 12, whiteSpace: 'pre-wrap' }}>
{`parent.postMessage({ type:'cb-activity', done, total, complete:true }, '*');
parent.postMessage({ type:'cb-activity-height', height }, '*');`}
            </code>
            If it doesn't post messages, students simply tap "I've completed this activity".
          </p>
          <div style={{ marginBottom: 14 }}>
            <label style={{ display: 'block', fontSize: 13, fontWeight: 600, color: '#374151', marginBottom: 6 }}>Total steps (optional, for the progress bar)</label>
            <input type="number" min={0} value={form.activitySteps ?? ''} onChange={e => set('activitySteps', e.target.value === '' ? undefined : Number(e.target.value))} style={{ ...inputStyle, maxWidth: 160 }} placeholder="e.g. 9" />
          </div>
          <label style={{ display: 'block', fontSize: 13, fontWeight: 600, color: '#374151', marginBottom: 6 }}>HTML content *</label>
          <textarea
            value={form.htmlContent || ''}
            onChange={e => set('htmlContent', e.target.value)}
            placeholder="<!doctype html><html>… your self-contained activity …</html>"
            rows={16}
            style={{ ...inputStyle, fontFamily: 'monospace', fontSize: 12.5, lineHeight: 1.5, resize: 'vertical' }}
          />
        </Section>
      )}

      {type === 'notes' && (
        <Section title="Notes Content">
          <Field label="Source">
            <div style={{ display: 'flex', gap: '12px' }}>
              {(['upload', 'richtext'] as const).map(src => (
                <label key={src} style={{ display: 'flex', alignItems: 'center', gap: '6px', cursor: 'pointer', fontSize: '14px' }}>
                  <input type="radio" checked={form.notesSource === src} onChange={() => set('notesSource', src)} />
                  {src === 'upload' ? '⬆️ Upload PDF' : '✏️ Write Rich Text'}
                </label>
              ))}
            </div>
          </Field>

          {form.notesSource === 'upload' ? (
            <Field label="PDF / PPTX File (max 50 MB)">
              <input ref={notesRef} type="file" accept=".pdf,.doc,.docx,.ppt,.pptx" onChange={e => setNotesFile(e.target.files?.[0] || null)} style={{ display: 'none' }} />
              <div
                onClick={() => notesRef.current?.click()}
                style={{
                  border: '2px dashed #cbd5e1', borderRadius: '10px', padding: '32px',
                  textAlign: 'center', cursor: 'pointer', background: '#f8fafc',
                }}
              >
                {notesFile ? (
                  <div>
                    <div style={{ fontSize: '24px' }}>📄</div>
                    <div style={{ fontWeight: 600, color: '#0f172a', marginTop: '8px' }}>{notesFile.name}</div>
                    <div style={{ color: '#64748b', fontSize: '13px' }}>
                      {(notesFile.size / (1024 * 1024)).toFixed(2)} MB
                    </div>
                  </div>
                ) : (
                  <div>
                    <div style={{ fontSize: '32px', marginBottom: '8px' }}>📎</div>
                    <div style={{ color: '#374151', fontWeight: 600 }}>Click to choose file</div>
                    <div style={{ color: '#94a3b8', fontSize: '13px', marginTop: '4px' }}>PDF, Word, PowerPoint up to 50 MB</div>
                    {form.notesFilePath && (
                      <div style={{ color: '#10b981', fontSize: '12px', marginTop: '8px' }}>✓ File already saved on server</div>
                    )}
                  </div>
                )}
              </div>
            </Field>
          ) : (
            <Field label="Content">
              <div style={{ border: '1.5px solid #e2e8f0', borderRadius: '8px', overflow: 'hidden' }}>
                <ReactQuill
                  value={form.notesContent || ''}
                  onChange={v => set('notesContent', v)}
                  theme="snow"
                  style={{ minHeight: '300px' }}
                  modules={{
                    toolbar: [
                      [{ header: [1, 2, 3, false] }],
                      ['bold', 'italic', 'underline', 'strike'],
                      [{ color: [] }, { background: [] }],
                      [{ list: 'ordered' }, { list: 'bullet' }],
                      ['blockquote', 'code-block'],
                      ['link'],
                      ['clean'],
                    ],
                  }}
                />
              </div>
            </Field>
          )}
        </Section>
      )}

      {(type === 'tech_qa' || type === 'behavioral_qa') && (
        <Section title={type === 'tech_qa' ? 'Technical Q&A Bank' : 'Behavioral Q&A Bank'}>
          <p style={{ color: '#64748b', fontSize: '13px', margin: '0 0 16px' }}>
            Add question-answer pairs. These appear as flip cards for students.
          </p>
          {(form.qaItems || []).map((qa, idx) => (
            <div key={idx} style={{
              border: '1.5px solid #e2e8f0', borderRadius: '10px', padding: '16px',
              marginBottom: '12px', background: '#fafafa',
            }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '10px' }}>
                <span style={{ fontWeight: 600, fontSize: '13px', color: '#64748b' }}>Q{idx + 1}</span>
                {(form.qaItems || []).length > 1 && (
                  <button onClick={() => removeQA(idx)} style={removeBtnStyle}>✕ Remove</button>
                )}
              </div>
              <Field label="Question">
                <textarea
                  value={qa.question}
                  onChange={e => setQA(idx, 'question', e.target.value)}
                  placeholder="e.g. What is polymorphism in Java?"
                  rows={2} style={{ ...inputStyle, resize: 'vertical' }}
                />
              </Field>
              <Field label="Answer">
                <textarea
                  value={qa.answer}
                  onChange={e => setQA(idx, 'answer', e.target.value)}
                  placeholder="Detailed answer..."
                  rows={3} style={{ ...inputStyle, resize: 'vertical' }}
                />
              </Field>
              <Field label="Tips (optional)">
                <input
                  value={qa.tips || ''}
                  onChange={e => setQA(idx, 'tips', e.target.value)}
                  placeholder="Interview tip or additional note..."
                  style={inputStyle}
                />
              </Field>
            </div>
          ))}
          <button onClick={addQA} style={addItemBtnStyle}>+ Add Q&A Pair</button>
        </Section>
      )}

      {(type === 'practice_coding' || type === 'practice_theory' || type === 'aptitude') && (
        <Section title="Practice Questions">
          {(form.practiceQuestions || []).map((pq, idx) => (
            <div key={idx} style={{
              border: '1.5px solid #e2e8f0', borderRadius: '12px', padding: '18px',
              marginBottom: '16px', background: '#fafafa',
            }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '12px' }}>
                <span style={{ fontWeight: 700, fontSize: '14px', color: '#0f172a' }}>Question {idx + 1}</span>
                {(form.practiceQuestions || []).length > 1 && (
                  <button onClick={() => removePQ(idx)} style={removeBtnStyle}>✕ Remove</button>
                )}
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '12px', marginBottom: '12px' }}>
                <Field label="Type">
                  <select
                    value={pq.type}
                    onChange={e => setPQ(idx, 'type', e.target.value)}
                    style={inputStyle}
                  >
                    {type === 'aptitude' ? (
                      <option value="mcq">MCQ</option>
                    ) : type === 'practice_coding' ? (
                      <option value="coding">Coding</option>
                    ) : (
                      <>
                        <option value="theory">Theory (written)</option>
                        <option value="mcq">MCQ</option>
                      </>
                    )}
                  </select>
                </Field>
                <Field label="Difficulty">
                  <select value={pq.difficulty} onChange={e => setPQ(idx, 'difficulty', e.target.value)} style={inputStyle}>
                    <option value="easy">Easy</option>
                    <option value="medium">Medium</option>
                    <option value="hard">Hard</option>
                  </select>
                </Field>
                <Field label="Marks">
                  <input type="number" min={1} value={pq.marks} onChange={e => setPQ(idx, 'marks', Number(e.target.value))} style={inputStyle} />
                </Field>
              </div>

              <Field label="Title">
                <input value={pq.title} onChange={e => setPQ(idx, 'title', e.target.value)} placeholder="e.g. Reverse a linked list" style={inputStyle} />
              </Field>
              <Field label="Description / Problem Statement">
                <textarea
                  value={pq.description}
                  onChange={e => setPQ(idx, 'description', e.target.value)}
                  placeholder="Full problem description..."
                  rows={3} style={{ ...inputStyle, resize: 'vertical' }}
                />
              </Field>

              {pq.type === 'coding' && (
                <>
                  <Field label="Allowed Languages">
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
                      {LANGUAGES.map(lang => (
                        <label key={lang} style={{ display: 'flex', alignItems: 'center', gap: '5px', fontSize: '13px', cursor: 'pointer' }}>
                          <input
                            type="checkbox"
                            checked={(pq.allowedLanguages || []).includes(lang)}
                            onChange={e => {
                              const langs = pq.allowedLanguages || [];
                              setPQ(idx, 'allowedLanguages', e.target.checked ? [...langs, lang] : langs.filter(l => l !== lang));
                            }}
                          />
                          {lang}
                        </label>
                      ))}
                    </div>
                  </Field>
                  <Field label="Test Cases">
                    {(pq.testCases || []).map((tc, tcIdx) => (
                      <div key={tcIdx} style={{ display: 'grid', gridTemplateColumns: '1fr 1fr auto auto', gap: '8px', marginBottom: '8px', alignItems: 'center' }}>
                        <input value={tc.input} onChange={e => setTestCase(idx, tcIdx, 'input', e.target.value)} placeholder="Input" style={{ ...inputStyle, fontSize: '12px' }} />
                        <input value={tc.expectedOutput} onChange={e => setTestCase(idx, tcIdx, 'expectedOutput', e.target.value)} placeholder="Expected Output" style={{ ...inputStyle, fontSize: '12px' }} />
                        <label style={{ display: 'flex', alignItems: 'center', gap: '4px', fontSize: '12px', whiteSpace: 'nowrap' }}>
                          <input type="checkbox" checked={tc.isHidden} onChange={e => setTestCase(idx, tcIdx, 'isHidden', e.target.checked)} />
                          Hidden
                        </label>
                        <button onClick={() => removeTestCase(idx, tcIdx)} style={{ ...removeBtnStyle, padding: '4px 8px' }}>✕</button>
                      </div>
                    ))}
                    <button onClick={() => addTestCase(idx)} style={{ ...addItemBtnStyle, fontSize: '12px', padding: '5px 12px' }}>
                      + Add Test Case
                    </button>
                  </Field>
                  <Field label="Grading">
                    <select value={pq.gradingMode} onChange={e => setPQ(idx, 'gradingMode', e.target.value)} style={inputStyle}>
                      <option value="auto">Auto-grade (Piston runner)</option>
                      <option value="self">Self-rated by student</option>
                    </select>
                  </Field>
                </>
              )}

              {(pq.type === 'mcq') && (
                <>
                  <Field label="Options">
                    {(pq.options || []).map((opt, oIdx) => (
                      <div key={oIdx} style={{ display: 'flex', gap: '8px', marginBottom: '8px', alignItems: 'center' }}>
                        <input
                          type="radio"
                          name={`correct-${idx}`}
                          checked={opt.isCorrect}
                          onChange={() => {
                            const opts = (pq.options || []).map((o, i) => ({ ...o, isCorrect: i === oIdx }));
                            setPQ(idx, 'options', opts);
                          }}
                          title="Mark as correct answer"
                        />
                        <input
                          value={opt.text}
                          onChange={e => setOption(idx, oIdx, 'text', e.target.value)}
                          placeholder={`Option ${oIdx + 1}`}
                          style={{ ...inputStyle, flex: 1 }}
                        />
                        {(pq.options || []).length > 2 && (
                          <button onClick={() => removeOption(idx, oIdx)} style={{ ...removeBtnStyle, padding: '4px 8px' }}>✕</button>
                        )}
                      </div>
                    ))}
                    {(pq.options || []).length < 6 && (
                      <button onClick={() => addOption(idx)} style={{ ...addItemBtnStyle, fontSize: '12px', padding: '5px 12px' }}>
                        + Add Option
                      </button>
                    )}
                  </Field>
                  <Field label="Explanation (shown after answer)">
                    <textarea
                      value={pq.explanation || ''}
                      onChange={e => setPQ(idx, 'explanation', e.target.value)}
                      placeholder="Explain why the correct answer is correct..."
                      rows={2} style={{ ...inputStyle, resize: 'vertical' }}
                    />
                  </Field>
                </>
              )}

              {pq.type === 'theory' && (
                <Field label="Model Answer (shown after student submits)">
                  <textarea
                    value={pq.explanation || ''}
                    onChange={e => setPQ(idx, 'explanation', e.target.value)}
                    placeholder="Model answer or key points to cover..."
                    rows={3} style={{ ...inputStyle, resize: 'vertical' }}
                  />
                </Field>
              )}
            </div>
          ))}
          <button onClick={addPQ} style={addItemBtnStyle}>+ Add Question</button>
        </Section>
      )}

      {/* Save button at bottom */}
      <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px', marginTop: '32px' }}>
        <button onClick={() => navigate('/learning-library')} style={cancelBtnStyle}>Cancel</button>
        <button onClick={handleSave} disabled={saving} style={saveBtnStyle}>
          {saving ? 'Saving...' : '💾 Save Content'}
        </button>
      </div>

        </div>
      )}

    </div>
  );
}

// ── Reusable sub-components ──────────────────────────────────────────────────

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div style={{ background: '#fff', border: '1.5px solid #e2e8f0', borderRadius: '12px', padding: '20px', marginBottom: '20px' }}>
      <h3 style={{ margin: '0 0 16px', fontSize: '15px', fontWeight: 700, color: '#0f172a', borderBottom: '1px solid #f1f5f9', paddingBottom: '10px' }}>
        {title}
      </h3>
      {children}
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div style={{ marginBottom: '14px' }}>
      <label style={{ display: 'block', fontWeight: 600, fontSize: '13px', color: '#374151', marginBottom: '6px' }}>
        {label}
      </label>
      {children}
    </div>
  );
}

/**
 * Toggle chips over the career directions.
 *
 * A checkbox list would read as "tick everything that could possibly apply", which is how
 * direction filtering stops filtering. Chips make the selected set visible at a glance, and
 * the hint says what selecting nothing means — because for both of these fields, empty is a
 * real and usually correct answer rather than an unfinished one.
 */
function DirectionChips({ options, selected, onToggle, emptyHint }: {
  options: { key: string; name: string }[];
  selected: string[];
  onToggle: (key: string) => void;
  emptyHint: string;
}) {
  if (!options.length) {
    return <div style={{ fontSize: '13px', color: '#94a3b8' }}>Directions unavailable.</div>;
  }
  return (
    <div>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
        {options.map(d => {
          const on = selected.includes(d.key);
          return (
            <button
              key={d.key}
              type="button"
              onClick={() => onToggle(d.key)}
              style={{
                border: `1.5px solid ${on ? '#0369a1' : '#e2e8f0'}`,
                background: on ? '#e0f2fe' : '#fff',
                color: on ? '#0369a1' : '#64748b',
                borderRadius: '999px', padding: '4px 12px',
                fontSize: '12px', fontWeight: 600, cursor: 'pointer',
              }}
            >
              {d.name}
            </button>
          );
        })}
      </div>
      {selected.length === 0 && (
        <div style={{ fontSize: '12px', color: '#94a3b8', marginTop: '6px' }}>{emptyHint}</div>
      )}
    </div>
  );
}

interface TagInputProps {
  label: string; tags: string[]; inputVal: string;
  onInputChange: (v: string) => void; onAdd: () => void;
  onRemove: (t: string) => void; placeholder?: string;
}
function TagInput({ label, tags, inputVal, onInputChange, onAdd, onRemove, placeholder }: TagInputProps) {
  return (
    <Field label={label}>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px', marginBottom: '6px' }}>
        {tags.map(tag => (
          <span key={tag} style={{
            background: '#e0f2fe', color: '#0369a1', borderRadius: '6px',
            padding: '3px 10px', fontSize: '12px', fontWeight: 600,
            display: 'flex', alignItems: 'center', gap: '6px',
          }}>
            {tag}
            <button onClick={() => onRemove(tag)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#0369a1', fontSize: '13px', padding: 0, lineHeight: 1 }}>×</button>
          </span>
        ))}
      </div>
      <div style={{ display: 'flex', gap: '8px' }}>
        <input
          value={inputVal}
          onChange={e => onInputChange(e.target.value)}
          onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); onAdd(); } }}
          placeholder={placeholder}
          style={{ ...inputStyle, flex: 1 }}
        />
        <button onClick={onAdd} style={{ padding: '8px 14px', background: '#f1f5f9', border: '1.5px solid #e2e8f0', borderRadius: '7px', fontSize: '13px', cursor: 'pointer', fontWeight: 600 }}>
          Add
        </button>
      </div>
    </Field>
  );
}

// ── Shared styles ────────────────────────────────────────────────────────────
const inputStyle: React.CSSProperties = {
  width: '100%', padding: '9px 12px', border: '1.5px solid #e2e8f0',
  borderRadius: '7px', fontSize: '14px', outline: 'none',
  background: '#fff', boxSizing: 'border-box',
};
const backBtnStyle: React.CSSProperties = {
  background: 'none', border: 'none', color: '#64748b',
  fontSize: '14px', cursor: 'pointer', padding: '0', fontWeight: 600,
};
const saveBtnStyle: React.CSSProperties = {
  background: '#0f172a', color: '#fff', border: 'none',
  borderRadius: '8px', padding: '10px 24px',
  fontWeight: 600, fontSize: '14px', cursor: 'pointer',
};
const cancelBtnStyle: React.CSSProperties = {
  background: '#fff', color: '#374151',
  border: '1.5px solid #e2e8f0',
  borderRadius: '8px', padding: '10px 20px',
  fontWeight: 600, fontSize: '14px', cursor: 'pointer',
};
const warnBoxStyle: React.CSSProperties = {
  background: '#fffbeb', border: '1.5px solid #fde68a', color: '#92400e',
  borderRadius: '8px', padding: '10px 12px', fontSize: '13px',
  lineHeight: 1.5, marginBottom: '14px',
};
const removeBtnStyle: React.CSSProperties = {
  background: '#fff', color: '#dc2626', border: '1px solid #fecaca',
  borderRadius: '6px', padding: '3px 10px', fontSize: '12px',
  cursor: 'pointer', fontWeight: 600,
};
const addItemBtnStyle: React.CSSProperties = {
  background: '#f8fafc', color: '#374151',
  border: '1.5px dashed #cbd5e1', borderRadius: '8px',
  padding: '9px 18px', fontSize: '13px', cursor: 'pointer',
  fontWeight: 600, width: '100%', marginTop: '4px',
};
