import React, { useState, useEffect, useRef } from 'react';
import { courseApi, subjectApi, chapterApi, topicApi, subTopicApi, userApi } from '../../api';
import { Spinner, Alert } from '../../components/common';
import './CourseManagement.css';

// ─── Interfaces ───────────────────────────────────────────────────────────────

interface Course {
  _id: string; title: string; code: string; description: string;
  category: string; level: string;
  instructor: { _id: string; firstName: string; lastName: string };
  duration: { value: number; unit: string };
  isPublished: boolean; isActive: boolean;
  subjectCount: number; enrollmentCount: number;
}
interface Subject {
  _id: string; courseId: { _id: string; title: string; code: string };
  name: string; code: string; description: string; order: number;
  chapterCount: number; isPublished: boolean; isActive: boolean;
}
interface EstimatedDuration { months: number; weeks: number; days: number; hours: number; minutes: number; }
interface Chapter {
  _id: string; subjectId: { _id: string; name: string; code: string };
  courseId: { _id: string; title: string; code: string };
  title: string; description: string; order: number;
  videos: Array<{ title: string; url: string; duration: number }>;
  notes: Array<{ title: string; content: string }>;
  estimatedDuration?: EstimatedDuration; isPublished: boolean; isActive: boolean;
}
interface Topic {
  _id: string; chapterId: { _id: string; title: string };
  subjectId: { _id: string; name: string; code: string };
  courseId: { _id: string; title: string; code: string };
  title: string; description: string; order: number; subTopicCount: number;
  estimatedDuration?: EstimatedDuration; isPublished: boolean; isActive: boolean;
}
interface SubTopicItem {
  _id: string; topicId: { _id: string; title: string };
  chapterId: { _id: string; title: string };
  subjectId: { _id: string; name: string; code: string };
  courseId: { _id: string; title: string; code: string };
  title: string; description: string; order: number;
  estimatedDuration?: EstimatedDuration;
  scheduledDay: number | null; scheduledDate: string | null;
  startTime: string | null; endTime: string | null; durationMinutes: number | null;
  isPublished: boolean; isActive: boolean;
}
interface User { _id: string; firstName: string; lastName: string; email: string; }

type NodeType = 'course' | 'subject' | 'chapter' | 'topic' | 'subtopic';
type AnyItem = Course | Subject | Chapter | Topic | SubTopicItem;

// ─── Helpers ──────────────────────────────────────────────────────────────────

const fmtDur = (d?: EstimatedDuration) => {
  if (!d) return '';
  const p: string[] = [];
  if (d.months) p.push(`${d.months}mo`);
  if (d.weeks) p.push(`${d.weeks}w`);
  if (d.days) p.push(`${d.days}d`);
  if (d.hours) p.push(`${d.hours}h`);
  if (d.minutes) p.push(`${d.minutes}m`);
  return p.join(' ') || '';
};

const NODE_COLORS: Record<NodeType, string> = {
  course: '#6650d8', subject: '#0ea5e9', chapter: '#8b5cf6',
  topic: '#10b981', subtopic: '#f59e0b',
};

const NODE_LABELS: Record<NodeType, string> = {
  course: 'COURSE', subject: 'SUBJECT', chapter: 'CHAPTER',
  topic: 'TOPIC', subtopic: 'SUB-TOPIC',
};

// ─── Form sub-components ──────────────────────────────────────────────────────

const FLabel: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <label className="cm-form-label">{children}</label>
);

const FormActions: React.FC<{ onCancel: () => void; saving: boolean; isEdit: boolean }> = ({ onCancel, saving, isEdit }) => (
  <div className="cm-form-actions">
    <button type="submit" className="cm-btn-primary" disabled={saving}>
      {saving ? 'Saving...' : isEdit ? 'Save changes' : 'Create'}
    </button>
    <button type="button" className="cm-btn-ghost" onClick={onCancel}>Cancel</button>
  </div>
);

const DurFields: React.FC<{ form: any; setForm: any }> = ({ form, setForm }) => (
  <>
    <div className="cm-ep-section-label" style={{ marginTop: 12 }}>Estimated Duration</div>
    <div className="cm-form-row-5">
      {(['durationMonths','durationWeeks','durationDays','durationHours','durationMinutes'] as const).map((k, i) => (
        <div key={k} className="cm-form-group">
          <FLabel>{['Months','Weeks','Days','Hours','Minutes'][i]}</FLabel>
          <input className="cm-input" type="number" min={0} placeholder="0" value={form[k]} onChange={(e: React.ChangeEvent<HTMLInputElement>) => setForm({ ...form, [k]: e.target.value })} />
        </div>
      ))}
    </div>
  </>
);

const CourseForm: React.FC<{ form: any; setForm: any; instructors: User[]; onSubmit: any; onCancel: any; saving: boolean; isEdit: boolean }> = ({ form, setForm, instructors, onSubmit, onCancel, saving, isEdit }) => (
  <form onSubmit={onSubmit}>
    <div className="cm-form-row-2">
      <div className="cm-form-group"><FLabel>Course Code *</FLabel><input className="cm-input" required value={form.code} onChange={(e: React.ChangeEvent<HTMLInputElement>) => setForm({ ...form, code: e.target.value.toUpperCase() })} placeholder="e.g., JAVA-FS" /></div>
      <div className="cm-form-group"><FLabel>Title *</FLabel><input className="cm-input" required value={form.title} onChange={(e: React.ChangeEvent<HTMLInputElement>) => setForm({ ...form, title: e.target.value })} placeholder="Java Fullstack" /></div>
    </div>
    <div className="cm-form-group"><FLabel>Description *</FLabel><textarea className="cm-textarea" required rows={3} value={form.description} onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => setForm({ ...form, description: e.target.value })} /></div>
    <div className="cm-form-row-2">
      <div className="cm-form-group"><FLabel>Category *</FLabel><input className="cm-input" required value={form.category} onChange={(e: React.ChangeEvent<HTMLInputElement>) => setForm({ ...form, category: e.target.value })} placeholder="Web Development" /></div>
      <div className="cm-form-group"><FLabel>Level *</FLabel>
        <select className="cm-select" value={form.level} onChange={(e: React.ChangeEvent<HTMLSelectElement>) => setForm({ ...form, level: e.target.value })}>
          <option value="beginner">Beginner</option><option value="intermediate">Intermediate</option><option value="advanced">Advanced</option>
        </select>
      </div>
    </div>
    <div className="cm-form-row-2">
      <div className="cm-form-group"><FLabel>Instructor *</FLabel>
        <select className="cm-select" required value={form.instructor} onChange={(e: React.ChangeEvent<HTMLSelectElement>) => setForm({ ...form, instructor: e.target.value })}>
          <option value="">Select Instructor</option>
          {instructors.map((i: User) => <option key={i._id} value={i._id}>{i.firstName} {i.lastName}</option>)}
        </select>
      </div>
      <div className="cm-form-group"><FLabel>Duration</FLabel>
        <div style={{ display: 'flex', gap: 8 }}>
          <input className="cm-input" type="number" min={1} style={{ width: 80 }} value={form.durationValue} onChange={(e: React.ChangeEvent<HTMLInputElement>) => setForm({ ...form, durationValue: parseInt(e.target.value) })} />
          <select className="cm-select" value={form.durationUnit} onChange={(e: React.ChangeEvent<HTMLSelectElement>) => setForm({ ...form, durationUnit: e.target.value })} style={{ flex: 1 }}>
            <option value="days">Days</option><option value="weeks">Weeks</option><option value="months">Months</option>
          </select>
        </div>
      </div>
    </div>
    <FormActions onCancel={onCancel} saving={saving} isEdit={isEdit} />
  </form>
);

const SubjectForm: React.FC<{ form: any; setForm: any; courses: Course[]; onSubmit: any; onCancel: any; saving: boolean; isEdit: boolean }> = ({ form, setForm, courses, onSubmit, onCancel, saving, isEdit }) => (
  <form onSubmit={onSubmit}>
    <div className="cm-form-group"><FLabel>Course *</FLabel>
      <select className="cm-select" required value={form.courseId} onChange={(e: React.ChangeEvent<HTMLSelectElement>) => setForm({ ...form, courseId: e.target.value })}>
        <option value="">Select Course</option>
        {courses.map((c: Course) => <option key={c._id} value={c._id}>{c.code} – {c.title}</option>)}
      </select>
    </div>
    <div className="cm-form-row-2">
      <div className="cm-form-group"><FLabel>Subject Code *</FLabel><input className="cm-input" required value={form.code} onChange={(e: React.ChangeEvent<HTMLInputElement>) => setForm({ ...form, code: e.target.value.toUpperCase() })} placeholder="CORE-JAVA" /></div>
      <div className="cm-form-group"><FLabel>Name *</FLabel><input className="cm-input" required value={form.name} onChange={(e: React.ChangeEvent<HTMLInputElement>) => setForm({ ...form, name: e.target.value })} placeholder="Core Java" /></div>
    </div>
    <div className="cm-form-group"><FLabel>Description</FLabel><textarea className="cm-textarea" rows={3} value={form.description} onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => setForm({ ...form, description: e.target.value })} /></div>
    <div className="cm-form-group"><FLabel>Duration</FLabel>
      <div style={{ display: 'flex', gap: 8 }}>
        <input className="cm-input" type="number" min={1} style={{ width: 80 }} value={form.durationValue} onChange={(e: React.ChangeEvent<HTMLInputElement>) => setForm({ ...form, durationValue: parseInt(e.target.value) })} />
        <select className="cm-select" value={form.durationUnit} onChange={(e: React.ChangeEvent<HTMLSelectElement>) => setForm({ ...form, durationUnit: e.target.value })} style={{ flex: 1 }}>
          <option value="days">Days</option><option value="weeks">Weeks</option><option value="months">Months</option>
        </select>
      </div>
    </div>
    <FormActions onCancel={onCancel} saving={saving} isEdit={isEdit} />
  </form>
);

const ChapterForm: React.FC<{ form: any; setForm: any; courses: Course[]; subjects: Subject[]; onSubmit: any; onCancel: any; saving: boolean; isEdit: boolean }> = ({ form, setForm, courses, subjects, onSubmit, onCancel, saving, isEdit }) => (
  <form onSubmit={onSubmit}>
    <div className="cm-form-row-2">
      <div className="cm-form-group"><FLabel>Course *</FLabel>
        <select className="cm-select" required value={form.courseId} onChange={(e: React.ChangeEvent<HTMLSelectElement>) => setForm({ ...form, courseId: e.target.value, subjectId: '' })}>
          <option value="">Select Course</option>
          {courses.map((c: Course) => <option key={c._id} value={c._id}>{c.code} – {c.title}</option>)}
        </select>
      </div>
      <div className="cm-form-group"><FLabel>Subject *</FLabel>
        <select className="cm-select" required value={form.subjectId} onChange={(e: React.ChangeEvent<HTMLSelectElement>) => setForm({ ...form, subjectId: e.target.value })} disabled={!form.courseId}>
          <option value="">Select Subject</option>
          {subjects.filter((s: Subject) => s.courseId._id === form.courseId).map((s: Subject) => <option key={s._id} value={s._id}>{s.code} – {s.name}</option>)}
        </select>
      </div>
    </div>
    <div className="cm-form-group"><FLabel>Title *</FLabel><input className="cm-input" required value={form.title} onChange={(e: React.ChangeEvent<HTMLInputElement>) => setForm({ ...form, title: e.target.value })} placeholder="Data Types and Variables" /></div>
    <div className="cm-form-group"><FLabel>Description</FLabel><textarea className="cm-textarea" rows={3} value={form.description} onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => setForm({ ...form, description: e.target.value })} /></div>
    <DurFields form={form} setForm={setForm} />
    <FormActions onCancel={onCancel} saving={saving} isEdit={isEdit} />
  </form>
);

const TopicForm: React.FC<{ form: any; setForm: any; courses: Course[]; subjects: Subject[]; chapters: Chapter[]; onSubmit: any; onCancel: any; saving: boolean; isEdit: boolean }> = ({ form, setForm, courses, subjects, chapters, onSubmit, onCancel, saving, isEdit }) => (
  <form onSubmit={onSubmit}>
    <div className="cm-form-row-2">
      <div className="cm-form-group"><FLabel>Course *</FLabel>
        <select className="cm-select" required value={form.courseId} onChange={(e: React.ChangeEvent<HTMLSelectElement>) => setForm({ ...form, courseId: e.target.value, subjectId: '', chapterId: '' })}>
          <option value="">Select Course</option>
          {courses.map((c: Course) => <option key={c._id} value={c._id}>{c.code} – {c.title}</option>)}
        </select>
      </div>
      <div className="cm-form-group"><FLabel>Subject *</FLabel>
        <select className="cm-select" required value={form.subjectId} onChange={(e: React.ChangeEvent<HTMLSelectElement>) => setForm({ ...form, subjectId: e.target.value, chapterId: '' })} disabled={!form.courseId}>
          <option value="">Select Subject</option>
          {subjects.filter((s: Subject) => s.courseId._id === form.courseId).map((s: Subject) => <option key={s._id} value={s._id}>{s.code} – {s.name}</option>)}
        </select>
      </div>
    </div>
    <div className="cm-form-group"><FLabel>Chapter *</FLabel>
      <select className="cm-select" required value={form.chapterId} onChange={(e: React.ChangeEvent<HTMLSelectElement>) => setForm({ ...form, chapterId: e.target.value })} disabled={!form.subjectId}>
        <option value="">Select Chapter</option>
        {chapters.filter((ch: Chapter) => ch.subjectId._id === form.subjectId).map((ch: Chapter) => <option key={ch._id} value={ch._id}>{ch.title}</option>)}
      </select>
    </div>
    <div className="cm-form-group"><FLabel>Title *</FLabel><input className="cm-input" required value={form.title} onChange={(e: React.ChangeEvent<HTMLInputElement>) => setForm({ ...form, title: e.target.value })} placeholder="Introduction to Data Types" /></div>
    <div className="cm-form-group"><FLabel>Description</FLabel><textarea className="cm-textarea" rows={3} value={form.description} onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => setForm({ ...form, description: e.target.value })} /></div>
    <DurFields form={form} setForm={setForm} />
    <FormActions onCancel={onCancel} saving={saving} isEdit={isEdit} />
  </form>
);

const SubTopicForm: React.FC<{ form: any; setForm: any; courses: Course[]; subjects: Subject[]; chapters: Chapter[]; topics: Topic[]; onSubmit: any; onCancel: any; saving: boolean; isEdit: boolean }> = ({ form, setForm, courses, subjects, chapters, topics, onSubmit, onCancel, saving, isEdit }) => (
  <form onSubmit={onSubmit}>
    <div className="cm-form-row-2">
      <div className="cm-form-group"><FLabel>Course *</FLabel>
        <select className="cm-select" required value={form.courseId} onChange={(e: React.ChangeEvent<HTMLSelectElement>) => setForm({ ...form, courseId: e.target.value, subjectId: '', chapterId: '', topicId: '' })}>
          <option value="">Select Course</option>
          {courses.map((c: Course) => <option key={c._id} value={c._id}>{c.code} – {c.title}</option>)}
        </select>
      </div>
      <div className="cm-form-group"><FLabel>Subject *</FLabel>
        <select className="cm-select" required value={form.subjectId} onChange={(e: React.ChangeEvent<HTMLSelectElement>) => setForm({ ...form, subjectId: e.target.value, chapterId: '', topicId: '' })} disabled={!form.courseId}>
          <option value="">Select Subject</option>
          {subjects.filter((s: Subject) => s.courseId._id === form.courseId).map((s: Subject) => <option key={s._id} value={s._id}>{s.code} – {s.name}</option>)}
        </select>
      </div>
    </div>
    <div className="cm-form-row-2">
      <div className="cm-form-group"><FLabel>Chapter *</FLabel>
        <select className="cm-select" required value={form.chapterId} onChange={(e: React.ChangeEvent<HTMLSelectElement>) => setForm({ ...form, chapterId: e.target.value, topicId: '' })} disabled={!form.subjectId}>
          <option value="">Select Chapter</option>
          {chapters.filter((ch: Chapter) => ch.subjectId._id === form.subjectId).map((ch: Chapter) => <option key={ch._id} value={ch._id}>{ch.title}</option>)}
        </select>
      </div>
      <div className="cm-form-group"><FLabel>Topic *</FLabel>
        <select className="cm-select" required value={form.topicId} onChange={(e: React.ChangeEvent<HTMLSelectElement>) => setForm({ ...form, topicId: e.target.value })} disabled={!form.chapterId}>
          <option value="">Select Topic</option>
          {topics.filter((t: Topic) => t.chapterId._id === form.chapterId).map((t: Topic) => <option key={t._id} value={t._id}>{t.title}</option>)}
        </select>
      </div>
    </div>
    <div className="cm-form-group"><FLabel>Title *</FLabel><input className="cm-input" required value={form.title} onChange={(e: React.ChangeEvent<HTMLInputElement>) => setForm({ ...form, title: e.target.value })} placeholder="Primitive vs Reference Types" /></div>
    <div className="cm-form-group"><FLabel>Description</FLabel><textarea className="cm-textarea" rows={2} value={form.description} onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => setForm({ ...form, description: e.target.value })} /></div>
    <DurFields form={form} setForm={setForm} />
    <div className="cm-ep-section-label" style={{ marginTop: 12 }}>Schedule <span style={{ fontWeight: 400, color: '#94a3b8' }}>(optional)</span></div>
    <div className="cm-form-row-2">
      <div className="cm-form-group"><FLabel>Day Number</FLabel><input className="cm-input" type="number" min={1} placeholder="1" value={form.scheduledDay} onChange={(e: React.ChangeEvent<HTMLInputElement>) => setForm({ ...form, scheduledDay: e.target.value })} /></div>
      <div className="cm-form-group"><FLabel>Start Time</FLabel><input className="cm-input" type="time" value={form.startTime} onChange={(e: React.ChangeEvent<HTMLInputElement>) => setForm({ ...form, startTime: e.target.value })} /></div>
    </div>
    <div className="cm-form-row-2">
      <div className="cm-form-group"><FLabel>End Time</FLabel><input className="cm-input" type="time" value={form.endTime} onChange={(e: React.ChangeEvent<HTMLInputElement>) => setForm({ ...form, endTime: e.target.value })} /></div>
      <div className="cm-form-group"><FLabel>Duration (min)</FLabel><input className="cm-input" type="number" min={1} placeholder="45" value={form.scheduleDurationMinutes} onChange={(e: React.ChangeEvent<HTMLInputElement>) => setForm({ ...form, scheduleDurationMinutes: e.target.value })} /></div>
    </div>
    <FormActions onCancel={onCancel} saving={saving} isEdit={isEdit} />
  </form>
);

// ─── Edit Panel ───────────────────────────────────────────────────────────────

interface EditPanelProps {
  type: NodeType; item: AnyItem;
  courses: Course[]; subjects: Subject[]; chapters: Chapter[]; topics: Topic[]; instructors: User[];
  courseForm: any; setCourseForm: any;
  subjectForm: any; setSubjectForm: any;
  chapterForm: any; setChapterForm: any;
  topicForm: any; setTopicForm: any;
  subTopicForm: any; setSubTopicForm: any;
  onSaveCourse: (e: React.FormEvent) => void;
  onSaveSubject: (e: React.FormEvent) => void;
  onSaveChapter: (e: React.FormEvent) => void;
  onSaveTopic: (e: React.FormEvent) => void;
  onSaveSubTopic: (e: React.FormEvent) => void;
  onDelete: () => void; onClose: () => void; saving: boolean;
  handleToggleCourseStatus: (c: Course, f: 'isActive' | 'isPublished') => void;
}

const EditPanel: React.FC<EditPanelProps> = ({
  type, item, courses, subjects, chapters, topics, instructors,
  courseForm, setCourseForm, subjectForm, setSubjectForm,
  chapterForm, setChapterForm, topicForm, setTopicForm,
  subTopicForm, setSubTopicForm,
  onSaveCourse, onSaveSubject, onSaveChapter, onSaveTopic, onSaveSubTopic,
  onDelete, onClose, saving, handleToggleCourseStatus
}) => {
  const color = NODE_COLORS[type];

  const getTitle = () => {
    if (type === 'course') return (item as Course).title;
    if (type === 'subject') return (item as Subject).name;
    if (type === 'chapter') return (item as Chapter).title;
    if (type === 'topic') return (item as Topic).title;
    return (item as SubTopicItem).title;
  };

  const getContains = () => {
    if (type === 'course') {
      const c = item as Course;
      return [{ label: 'Subjects', value: subjects.filter(s => s.courseId._id === c._id).length }];
    }
    if (type === 'subject') {
      const s = item as Subject;
      return [{ label: 'Chapters', value: chapters.filter(ch => ch.subjectId._id === s._id).length }];
    }
    if (type === 'chapter') {
      const ch = item as Chapter;
      return [
        { label: 'Topics', value: topics.filter(t => t.chapterId._id === ch._id).length },
        { label: 'Videos', value: ch.videos?.length || 0 },
      ];
    }
    if (type === 'topic') {
      const t = item as Topic;
      return [{ label: 'Sub-topics', value: t.subTopicCount || 0 }];
    }
    return [];
  };

  const getDuration = () => {
    if (type === 'chapter') return fmtDur((item as Chapter).estimatedDuration) || '-';
    if (type === 'topic') return fmtDur((item as Topic).estimatedDuration) || '-';
    if (type === 'subtopic') {
      const st = item as SubTopicItem;
      return st.durationMinutes ? `${st.durationMinutes} min` : fmtDur(st.estimatedDuration) || '-';
    }
    return null;
  };

  const duration = getDuration();
  const contains = getContains();
  const lastUpdated = (item as any).updatedAt ? new Date((item as any).updatedAt).toLocaleDateString() : '-';

  return (
    <div className="cm-ep">
      <div className="cm-ep-header">
        <div>
          <span style={{ fontSize: 12, color: '#64748b' }}>Editing {type}</span>
          <div style={{ fontSize: 15, color: '#0b1437', fontWeight: 600, marginTop: 2 }}>{getTitle()}</div>
        </div>
        <span className="cm-node-badge" style={{ background: color }}>{NODE_LABELS[type]}</span>
      </div>

      <div className="cm-ep-form">
        {type === 'course' && <CourseForm form={courseForm} setForm={setCourseForm} instructors={instructors} onSubmit={onSaveCourse} onCancel={onClose} saving={saving} isEdit />}
        {type === 'subject' && <SubjectForm form={subjectForm} setForm={setSubjectForm} courses={courses} onSubmit={onSaveSubject} onCancel={onClose} saving={saving} isEdit />}
        {type === 'chapter' && <ChapterForm form={chapterForm} setForm={setChapterForm} courses={courses} subjects={subjects} onSubmit={onSaveChapter} onCancel={onClose} saving={saving} isEdit />}
        {type === 'topic' && <TopicForm form={topicForm} setForm={setTopicForm} courses={courses} subjects={subjects} chapters={chapters} onSubmit={onSaveTopic} onCancel={onClose} saving={saving} isEdit />}
        {type === 'subtopic' && <SubTopicForm form={subTopicForm} setForm={setSubTopicForm} courses={courses} subjects={subjects} chapters={chapters} topics={topics} onSubmit={onSaveSubTopic} onCancel={onClose} saving={saving} isEdit />}
      </div>

      {(contains.length > 0 || duration) && (
        <div className="cm-ep-contains">
          <div className="cm-ep-section-label">CONTAINS</div>
          {contains.map(c => (
            <div key={c.label} className="cm-ep-stat-row">
              <span>{c.label}</span><span>{c.value}</span>
            </div>
          ))}
          {duration && (
            <div className="cm-ep-stat-row"><span>Total duration</span><span>{duration}</span></div>
          )}
          <div className="cm-ep-stat-row"><span>Last updated</span><span>{lastUpdated}</span></div>
        </div>
      )}

      <div className="cm-ep-contains" style={{ marginTop: 12 }}>
        <div className="cm-ep-section-label">QUICK ACTIONS</div>
        <div className="cm-ep-quick-grid">
          {type === 'course' && <>
            <button className="cm-ep-quick-btn" onClick={() => handleToggleCourseStatus(item as Course, 'isPublished')}>
              {(item as Course).isPublished ? 'Unpublish' : 'Publish'}
            </button>
            <button className="cm-ep-quick-btn" onClick={() => handleToggleCourseStatus(item as Course, 'isActive')}>
              {(item as Course).isActive ? 'Deactivate' : 'Activate'}
            </button>
          </>}
          <button className="cm-ep-quick-btn cm-ep-delete" onClick={onDelete}>Delete</button>
        </div>
      </div>
    </div>
  );
};

// ─── Main Component ───────────────────────────────────────────────────────────

const CourseManagement: React.FC = () => {
  const [courses, setCourses] = useState<Course[]>([]);
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [chapters, setChapters] = useState<Chapter[]>([]);
  const [topics, setTopics] = useState<Topic[]>([]);
  const [subTopics, setSubTopics] = useState<SubTopicItem[]>([]);
  const [instructors, setInstructors] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const [searchQ, setSearchQ] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'draft'>('all');
  const [expanded, setExpanded] = useState<Set<string>>(new Set());
  const [selected, setSelected] = useState<{ type: NodeType; id: string } | null>(null);
  const [openMenu, setOpenMenu] = useState<string | null>(null);
  const menuRef = useRef<HTMLDivElement | null>(null);
  const [addModal, setAddModal] = useState<{ type: NodeType; parentId?: string; parentType?: NodeType } | null>(null);
  const [saving, setSaving] = useState(false);

  const [courseForm, setCourseForm] = useState({ title: '', code: '', description: '', category: '', level: 'beginner', instructor: '', durationValue: 3, durationUnit: 'months' });
  const [subjectForm, setSubjectForm] = useState({ courseId: '', name: '', code: '', description: '', durationValue: 2, durationUnit: 'weeks' });
  const [chapterForm, setChapterForm] = useState({ courseId: '', subjectId: '', title: '', description: '', durationMonths: '', durationWeeks: '', durationDays: '', durationHours: '', durationMinutes: '' });
  const [topicForm, setTopicForm] = useState({ courseId: '', subjectId: '', chapterId: '', title: '', description: '', durationMonths: '', durationWeeks: '', durationDays: '', durationHours: '', durationMinutes: '' });
  const [subTopicForm, setSubTopicForm] = useState({ courseId: '', subjectId: '', chapterId: '', topicId: '', title: '', description: '', durationMonths: '', durationWeeks: '', durationDays: '', durationHours: '', durationMinutes: '', scheduledDay: '', scheduledDate: '', startTime: '', endTime: '', scheduleDurationMinutes: '' });

  const fetchData = async () => {
    try {
      setLoading(true);
      const [cR, sR, chR, tR, stR, uR] = await Promise.all([
        courseApi.getCourses(), subjectApi.getSubjects(), chapterApi.getChapters(),
        topicApi.getTopics(), subTopicApi.getSubTopics(), userApi.getUsers()
      ]);
      setCourses(cR.data || []);
      setSubjects(sR.data || []);
      setChapters(chR.data || []);
      setTopics(tR.data || []);
      setSubTopics(stR.data || []);
      setInstructors(uR.data?.filter((u: any) => u.role?.name !== 'Student') || []);
    } catch (err: any) {
      setError(err.message || 'Failed to fetch data');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchData(); }, []);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) setOpenMenu(null);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  // Populate edit form on selection
  useEffect(() => {
    if (!selected) return;
    if (selected.type === 'course') {
      const c = courses.find(x => x._id === selected.id);
      if (c) setCourseForm({ title: c.title, code: c.code, description: c.description, category: c.category, level: c.level, instructor: c.instructor._id, durationValue: c.duration?.value || 3, durationUnit: c.duration?.unit || 'months' });
    } else if (selected.type === 'subject') {
      const s = subjects.find(x => x._id === selected.id);
      if (s) setSubjectForm({ courseId: s.courseId._id, name: s.name, code: s.code, description: s.description || '', durationValue: 2, durationUnit: 'weeks' });
    } else if (selected.type === 'chapter') {
      const ch = chapters.find(x => x._id === selected.id);
      if (ch) setChapterForm({ courseId: ch.courseId._id, subjectId: ch.subjectId._id, title: ch.title, description: ch.description || '', durationMonths: ch.estimatedDuration?.months ? String(ch.estimatedDuration.months) : '', durationWeeks: ch.estimatedDuration?.weeks ? String(ch.estimatedDuration.weeks) : '', durationDays: ch.estimatedDuration?.days ? String(ch.estimatedDuration.days) : '', durationHours: ch.estimatedDuration?.hours ? String(ch.estimatedDuration.hours) : '', durationMinutes: ch.estimatedDuration?.minutes ? String(ch.estimatedDuration.minutes) : '' });
    } else if (selected.type === 'topic') {
      const t = topics.find(x => x._id === selected.id);
      if (t) setTopicForm({ courseId: t.courseId._id, subjectId: t.subjectId._id, chapterId: t.chapterId._id, title: t.title, description: t.description || '', durationMonths: t.estimatedDuration?.months ? String(t.estimatedDuration.months) : '', durationWeeks: t.estimatedDuration?.weeks ? String(t.estimatedDuration.weeks) : '', durationDays: t.estimatedDuration?.days ? String(t.estimatedDuration.days) : '', durationHours: t.estimatedDuration?.hours ? String(t.estimatedDuration.hours) : '', durationMinutes: t.estimatedDuration?.minutes ? String(t.estimatedDuration.minutes) : '' });
    } else if (selected.type === 'subtopic') {
      const st = subTopics.find(x => x._id === selected.id);
      if (st) setSubTopicForm({ courseId: st.courseId._id, subjectId: st.subjectId._id, chapterId: st.chapterId._id, topicId: st.topicId._id, title: st.title, description: st.description || '', durationMonths: st.estimatedDuration?.months ? String(st.estimatedDuration.months) : '', durationWeeks: st.estimatedDuration?.weeks ? String(st.estimatedDuration.weeks) : '', durationDays: st.estimatedDuration?.days ? String(st.estimatedDuration.days) : '', durationHours: st.estimatedDuration?.hours ? String(st.estimatedDuration.hours) : '', durationMinutes: st.estimatedDuration?.minutes ? String(st.estimatedDuration.minutes) : '', scheduledDay: st.scheduledDay != null ? String(st.scheduledDay) : '', scheduledDate: st.scheduledDate ? st.scheduledDate.substring(0, 10) : '', startTime: st.startTime || '', endTime: st.endTime || '', scheduleDurationMinutes: st.durationMinutes != null ? String(st.durationMinutes) : '' });
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selected]);

  const selectedItem: AnyItem | null = (() => {
    if (!selected) return null;
    if (selected.type === 'course') return courses.find(c => c._id === selected.id) || null;
    if (selected.type === 'subject') return subjects.find(s => s._id === selected.id) || null;
    if (selected.type === 'chapter') return chapters.find(c => c._id === selected.id) || null;
    if (selected.type === 'topic') return topics.find(t => t._id === selected.id) || null;
    return subTopics.find(st => st._id === selected.id) || null;
  })();

  // ── CRUD handlers

  const handleSaveCourse = async (e: React.FormEvent) => {
    e.preventDefault(); setSaving(true);
    try {
      const data = { title: courseForm.title, code: courseForm.code, description: courseForm.description, category: courseForm.category, level: courseForm.level, instructor: courseForm.instructor, duration: { value: courseForm.durationValue, unit: courseForm.durationUnit } };
      if (selected?.type === 'course') { await courseApi.updateCourse(selected.id, data); setSuccess('Course updated'); }
      else { await courseApi.createCourse(data); setSuccess('Course created'); setAddModal(null); }
      fetchData();
    } catch (err: any) { setError(err.message || 'Failed'); } finally { setSaving(false); }
  };

  const handleSaveSubject = async (e: React.FormEvent) => {
    e.preventDefault(); setSaving(true);
    try {
      const data = { courseId: subjectForm.courseId, name: subjectForm.name, code: subjectForm.code, description: subjectForm.description, duration: { value: subjectForm.durationValue, unit: subjectForm.durationUnit } };
      if (selected?.type === 'subject') { await subjectApi.updateSubject(selected.id, data); setSuccess('Subject updated'); }
      else { await subjectApi.createSubject(data); setSuccess('Subject created'); setAddModal(null); }
      fetchData();
    } catch (err: any) { setError(err.message || 'Failed'); } finally { setSaving(false); }
  };

  const handleSaveChapter = async (e: React.FormEvent) => {
    e.preventDefault(); setSaving(true);
    try {
      const data = { courseId: chapterForm.courseId, subjectId: chapterForm.subjectId, title: chapterForm.title, description: chapterForm.description, estimatedDuration: { months: parseInt(chapterForm.durationMonths) || 0, weeks: parseInt(chapterForm.durationWeeks) || 0, days: parseInt(chapterForm.durationDays) || 0, hours: parseInt(chapterForm.durationHours) || 0, minutes: parseInt(chapterForm.durationMinutes) || 0 } };
      if (selected?.type === 'chapter') { await chapterApi.updateChapter(selected.id, data); setSuccess('Chapter updated'); }
      else { await chapterApi.createChapter(data); setSuccess('Chapter created'); setAddModal(null); }
      fetchData();
    } catch (err: any) { setError(err.message || 'Failed'); } finally { setSaving(false); }
  };

  const handleSaveTopic = async (e: React.FormEvent) => {
    e.preventDefault(); setSaving(true);
    try {
      const data = { courseId: topicForm.courseId, subjectId: topicForm.subjectId, chapterId: topicForm.chapterId, title: topicForm.title, description: topicForm.description, estimatedDuration: { months: parseInt(topicForm.durationMonths) || 0, weeks: parseInt(topicForm.durationWeeks) || 0, days: parseInt(topicForm.durationDays) || 0, hours: parseInt(topicForm.durationHours) || 0, minutes: parseInt(topicForm.durationMinutes) || 0 } };
      if (selected?.type === 'topic') { await topicApi.updateTopic(selected.id, data); setSuccess('Topic updated'); }
      else { await topicApi.createTopic(data); setSuccess('Topic created'); setAddModal(null); }
      fetchData();
    } catch (err: any) { setError(err.message || 'Failed'); } finally { setSaving(false); }
  };

  const handleSaveSubTopic = async (e: React.FormEvent) => {
    e.preventDefault(); setSaving(true);
    try {
      const data: any = { courseId: subTopicForm.courseId, subjectId: subTopicForm.subjectId, chapterId: subTopicForm.chapterId, topicId: subTopicForm.topicId, title: subTopicForm.title, description: subTopicForm.description, estimatedDuration: { months: parseInt(subTopicForm.durationMonths) || 0, weeks: parseInt(subTopicForm.durationWeeks) || 0, days: parseInt(subTopicForm.durationDays) || 0, hours: parseInt(subTopicForm.durationHours) || 0, minutes: parseInt(subTopicForm.durationMinutes) || 0 } };
      if (subTopicForm.scheduledDay) data.scheduledDay = parseInt(subTopicForm.scheduledDay);
      if (subTopicForm.scheduledDate) data.scheduledDate = subTopicForm.scheduledDate;
      if (subTopicForm.startTime) data.startTime = subTopicForm.startTime;
      if (subTopicForm.endTime) data.endTime = subTopicForm.endTime;
      if (subTopicForm.scheduleDurationMinutes) data.durationMinutes = parseInt(subTopicForm.scheduleDurationMinutes);
      if (selected?.type === 'subtopic') { await subTopicApi.updateSubTopic(selected.id, data); setSuccess('Sub-topic updated'); }
      else { await subTopicApi.createSubTopic(data); setSuccess('Sub-topic created'); setAddModal(null); }
      fetchData();
    } catch (err: any) { setError(err.message || 'Failed'); } finally { setSaving(false); }
  };

  const handleDelete = async (type: NodeType, id: string) => {
    if (!window.confirm('Delete this item? This cannot be undone.')) return;
    try {
      if (type === 'course') await courseApi.deleteCourse(id);
      else if (type === 'subject') await subjectApi.deleteSubject(id);
      else if (type === 'chapter') await chapterApi.deleteChapter(id);
      else if (type === 'topic') await topicApi.deleteTopic(id);
      else await subTopicApi.deleteSubTopic(id);
      setSuccess('Deleted');
      if (selected?.id === id) setSelected(null);
      fetchData();
    } catch (err: any) { setError(err.message || 'Failed to delete'); }
  };

  const handleToggleCourseStatus = async (course: Course, field: 'isActive' | 'isPublished') => {
    try {
      await courseApi.toggleCourseStatus(course._id, { [field]: !course[field] });
      setSuccess('Status updated'); fetchData();
    } catch (err: any) { setError(err.message || 'Failed'); }
  };

  // ── Tree

  const toggle = (id: string) => setExpanded(prev => {
    const n = new Set(prev); n.has(id) ? n.delete(id) : n.add(id); return n;
  });

  const expandAll = () => setExpanded(new Set([
    ...courses.map(c => c._id), ...subjects.map(s => s._id),
    ...chapters.map(c => c._id), ...topics.map(t => t._id),
  ]));

  const collapseAll = () => setExpanded(new Set());

  const q = searchQ.toLowerCase();
  const statusOk = (item: { isActive: boolean; isPublished: boolean }) => {
    if (statusFilter === 'active') return item.isActive;
    if (statusFilter === 'draft') return !item.isPublished;
    return true;
  };
  const visibleCourses = courses.filter(c => (!q || c.title.toLowerCase().includes(q) || c.code.toLowerCase().includes(q)) && statusOk(c));

  const openAdd = (type: NodeType, parentId?: string, parentType?: NodeType) => {
    if (type === 'course') setCourseForm({ title: '', code: '', description: '', category: '', level: 'beginner', instructor: '', durationValue: 3, durationUnit: 'months' });
    if (type === 'subject' && parentId) setSubjectForm(f => ({ ...f, courseId: parentId }));
    if (type === 'chapter' && parentId && parentType === 'subject') {
      const sub = subjects.find(s => s._id === parentId);
      setChapterForm(f => ({ ...f, subjectId: parentId, courseId: sub?.courseId._id || '' }));
    }
    if (type === 'topic' && parentId && parentType === 'chapter') {
      const ch = chapters.find(c => c._id === parentId);
      setTopicForm(f => ({ ...f, chapterId: parentId, subjectId: ch?.subjectId._id || '', courseId: ch?.courseId._id || '' }));
    }
    if (type === 'subtopic' && parentId && parentType === 'topic') {
      const t = topics.find(tp => tp._id === parentId);
      setSubTopicForm(f => ({ ...f, topicId: parentId, chapterId: t?.chapterId._id || '', subjectId: t?.subjectId._id || '', courseId: t?.courseId._id || '' }));
    }
    setSelected(null);
    setAddModal({ type, parentId, parentType });
  };

  if (loading) return <Spinner fullScreen />;

  return (
    <div className="cm-page">
      <div className="cm-header">
        <div>
          <div className="cm-breadcrumb">Admin / Course management</div>
          <h1 className="cm-title">Course management</h1>
          <p className="cm-sub">Build courses, subjects, chapters, topics and sub-topics in one tree.</p>
        </div>
        <button className="cm-btn-outline" onClick={() => openAdd('course')}>+ New course</button>
      </div>

      <div className="cm-stats">
        {[{ label: 'COURSES', value: courses.length }, { label: 'SUBJECTS', value: subjects.length }, { label: 'CHAPTERS', value: chapters.length }, { label: 'SUB-TOPICS', value: subTopics.length }].map(s => (
          <div key={s.label} className="cm-stat">
            <div className="cm-stat-label">{s.label}</div>
            <div className="cm-stat-value">{s.value}</div>
          </div>
        ))}
      </div>

      {error && <Alert type="error" message={error} onClose={() => setError('')} />}
      {success && <Alert type="success" message={success} onClose={() => setSuccess('')} />}

      <div className="cm-split">
        {/* ── Left tree panel ── */}
        <div className="cm-tree-panel">
          <div className="cm-search-row">
            <div className="cm-search-wrap">
              <span className="cm-search-icon">&#128269;</span>
              <input className="cm-search" placeholder="Search..." value={searchQ} onChange={e => setSearchQ(e.target.value)} />
            </div>
          </div>
          <select className="cm-status-select" value={statusFilter} onChange={e => setStatusFilter(e.target.value as any)}>
            <option value="all">All status</option>
            <option value="active">Active</option>
            <option value="draft">Draft</option>
          </select>
          <div className="cm-tree-actions">
            <button className="cm-tree-action-btn" onClick={expandAll}>Expand all</button>
            <button className="cm-tree-action-btn" onClick={collapseAll}>Collapse</button>
          </div>

          <div className="cm-tree">
            {visibleCourses.length === 0 && (
              <div className="cm-empty-tree">
                <div>No courses found</div>
                <button className="cm-btn-primary" style={{ marginTop: 12 }} onClick={() => openAdd('course')}>+ New course</button>
              </div>
            )}

            {visibleCourses.map(course => {
              const courseSubjects = subjects.filter(s => s.courseId._id === course._id);
              const isExp = expanded.has(course._id);
              const isSel = selected?.id === course._id;
              return (
                <div key={course._id} className="cm-tree-group">
                  <div className={`cm-tree-row cm-level-0${isSel ? ' cm-selected' : ''}`} onClick={() => { setSelected({ type: 'course', id: course._id }); setAddModal(null); }}>
                    <span className="cm-drag-handle">::</span>
                    <button className="cm-toggle" onClick={e => { e.stopPropagation(); toggle(course._id); }}>{isExp ? '▾' : '▸'}</button>
                    <span className="cm-node-badge" style={{ background: NODE_COLORS.course }}>COURSE · {course.code}</span>
                    <span className="cm-node-title">{course.title}</span>
                    <span className={`cm-status-pill${course.isActive ? ' active' : ' draft'}`}>{course.isActive ? 'Active' : 'Draft'}</span>
                    <span className="cm-node-meta">{courseSubjects.length} subjects</span>
                    <div className="cm-row-menu-wrap" ref={openMenu === course._id ? menuRef : null}>
                      <button className="cm-row-menu-btn" onClick={e => { e.stopPropagation(); setOpenMenu(openMenu === course._id ? null : course._id); }}>···</button>
                      {openMenu === course._id && (
                        <div className="cm-context-menu">
                          <button onClick={() => { setSelected({ type: 'course', id: course._id }); setOpenMenu(null); setAddModal(null); }}>Edit</button>
                          <button onClick={() => { handleToggleCourseStatus(course, 'isActive'); setOpenMenu(null); }}>{course.isActive ? 'Deactivate' : 'Activate'}</button>
                          <button onClick={() => { handleToggleCourseStatus(course, 'isPublished'); setOpenMenu(null); }}>{course.isPublished ? 'Unpublish' : 'Publish'}</button>
                          <button className="cm-danger" onClick={() => { handleDelete('course', course._id); setOpenMenu(null); }}>Delete</button>
                        </div>
                      )}
                    </div>
                  </div>

                  {isExp && (
                    <>
                      {courseSubjects.map(sub => {
                        const subChapters = chapters.filter(ch => ch.subjectId._id === sub._id);
                        const subExp = expanded.has(sub._id);
                        const subSel = selected?.id === sub._id;
                        return (
                          <div key={sub._id} className="cm-tree-group">
                            <div className={`cm-tree-row cm-level-1${subSel ? ' cm-selected' : ''}`} onClick={() => { setSelected({ type: 'subject', id: sub._id }); setAddModal(null); }}>
                              <span className="cm-drag-handle">::</span>
                              <button className="cm-toggle" onClick={e => { e.stopPropagation(); toggle(sub._id); }}>{subExp ? '▾' : '▸'}</button>
                              <span className="cm-node-badge" style={{ background: NODE_COLORS.subject }}>SUBJECT · {sub.code}</span>
                              <span className="cm-node-title">{sub.name}</span>
                              <span className="cm-node-meta">{subChapters.length} chapters</span>
                              <div className="cm-row-menu-wrap" ref={openMenu === sub._id ? menuRef : null}>
                                <button className="cm-row-menu-btn" onClick={e => { e.stopPropagation(); setOpenMenu(openMenu === sub._id ? null : sub._id); }}>···</button>
                                {openMenu === sub._id && (
                                  <div className="cm-context-menu">
                                    <button onClick={() => { setSelected({ type: 'subject', id: sub._id }); setOpenMenu(null); setAddModal(null); }}>Edit</button>
                                    <button onClick={() => { openAdd('chapter', sub._id, 'subject'); setOpenMenu(null); }}>+ Add chapter</button>
                                    <button className="cm-danger" onClick={() => { handleDelete('subject', sub._id); setOpenMenu(null); }}>Delete</button>
                                  </div>
                                )}
                              </div>
                            </div>

                            {subExp && (
                              <>
                                {subChapters.map(ch => {
                                  const chTopics = topics.filter(t => t.chapterId._id === ch._id);
                                  const chExp = expanded.has(ch._id);
                                  const chSel = selected?.id === ch._id;
                                  return (
                                    <div key={ch._id} className="cm-tree-group">
                                      <div className={`cm-tree-row cm-level-2${chSel ? ' cm-selected' : ''}`} onClick={() => { setSelected({ type: 'chapter', id: ch._id }); setAddModal(null); }}>
                                        <span className="cm-drag-handle">::</span>
                                        <button className="cm-toggle" onClick={e => { e.stopPropagation(); toggle(ch._id); }}>{chExp ? '▾' : '▸'}</button>
                                        <span className="cm-node-badge" style={{ background: NODE_COLORS.chapter }}>CHAPTER</span>
                                        <span className="cm-node-title">{ch.title}</span>
                                        <span className="cm-node-meta-row">
                                          {ch.videos?.length > 0 && <span>{ch.videos.length} videos</span>}
                                          {fmtDur(ch.estimatedDuration) && <span>{fmtDur(ch.estimatedDuration)}</span>}
                                        </span>
                                        <div className="cm-row-menu-wrap" ref={openMenu === ch._id ? menuRef : null}>
                                          <button className="cm-row-menu-btn" onClick={e => { e.stopPropagation(); setOpenMenu(openMenu === ch._id ? null : ch._id); }}>···</button>
                                          {openMenu === ch._id && (
                                            <div className="cm-context-menu">
                                              <button onClick={() => { setSelected({ type: 'chapter', id: ch._id }); setOpenMenu(null); setAddModal(null); }}>Edit</button>
                                              <button onClick={() => { openAdd('topic', ch._id, 'chapter'); setOpenMenu(null); }}>+ Add topic</button>
                                              <button className="cm-danger" onClick={() => { handleDelete('chapter', ch._id); setOpenMenu(null); }}>Delete</button>
                                            </div>
                                          )}
                                        </div>
                                      </div>

                                      {chExp && (
                                        <>
                                          {chTopics.map(tp => {
                                            const tpSubTopics = subTopics.filter(st => st.topicId._id === tp._id);
                                            const tpExp = expanded.has(tp._id);
                                            const tpSel = selected?.id === tp._id;
                                            return (
                                              <div key={tp._id} className="cm-tree-group">
                                                <div className={`cm-tree-row cm-level-3${tpSel ? ' cm-selected' : ''}`} onClick={() => { setSelected({ type: 'topic', id: tp._id }); setAddModal(null); }}>
                                                  <span className="cm-drag-handle">::</span>
                                                  <button className="cm-toggle" onClick={e => { e.stopPropagation(); toggle(tp._id); }}>{tpExp ? '▾' : '▸'}</button>
                                                  <span className="cm-node-badge" style={{ background: NODE_COLORS.topic }}>TOPIC</span>
                                                  <span className="cm-node-title">{tp.title}</span>
                                                  <span className="cm-node-meta">{tpSubTopics.length} sub-topics</span>
                                                  <div className="cm-row-menu-wrap" ref={openMenu === tp._id ? menuRef : null}>
                                                    <button className="cm-row-menu-btn" onClick={e => { e.stopPropagation(); setOpenMenu(openMenu === tp._id ? null : tp._id); }}>···</button>
                                                    {openMenu === tp._id && (
                                                      <div className="cm-context-menu">
                                                        <button onClick={() => { setSelected({ type: 'topic', id: tp._id }); setOpenMenu(null); setAddModal(null); }}>Edit</button>
                                                        <button onClick={() => { openAdd('subtopic', tp._id, 'topic'); setOpenMenu(null); }}>+ Add sub-topic</button>
                                                        <button className="cm-danger" onClick={() => { handleDelete('topic', tp._id); setOpenMenu(null); }}>Delete</button>
                                                      </div>
                                                    )}
                                                  </div>
                                                </div>

                                                {tpExp && (
                                                  <>
                                                    {tpSubTopics.map(st => {
                                                      const stSel = selected?.id === st._id;
                                                      return (
                                                        <div key={st._id} className={`cm-tree-row cm-level-4${stSel ? ' cm-selected' : ''}`} onClick={() => { setSelected({ type: 'subtopic', id: st._id }); setAddModal(null); }}>
                                                          <span className="cm-drag-handle">::</span>
                                                          <span className="cm-leaf-dot">&#9675;</span>
                                                          <span className="cm-node-badge" style={{ background: NODE_COLORS.subtopic }}>SUB-TOPIC</span>
                                                          <span className="cm-node-title">{st.title}</span>
                                                          <span className="cm-node-meta">
                                                            {st.scheduledDay != null ? `Day ${st.scheduledDay}` : ''}
                                                            {st.startTime ? ` · ${st.startTime}` : ''}
                                                            {st.durationMinutes ? ` · ${st.durationMinutes}m` : ''}
                                                          </span>
                                                          <div className="cm-row-menu-wrap" ref={openMenu === st._id ? menuRef : null}>
                                                            <button className="cm-row-menu-btn" onClick={e => { e.stopPropagation(); setOpenMenu(openMenu === st._id ? null : st._id); }}>···</button>
                                                            {openMenu === st._id && (
                                                              <div className="cm-context-menu">
                                                                <button onClick={() => { setSelected({ type: 'subtopic', id: st._id }); setOpenMenu(null); setAddModal(null); }}>Edit</button>
                                                                <button className="cm-danger" onClick={() => { handleDelete('subtopic', st._id); setOpenMenu(null); }}>Delete</button>
                                                              </div>
                                                            )}
                                                          </div>
                                                        </div>
                                                      );
                                                    })}
                                                    <div className="cm-add-inline cm-level-4">
                                                      <button className="cm-add-inline-btn" onClick={() => openAdd('subtopic', tp._id, 'topic')}>+ Add sub-topic</button>
                                                    </div>
                                                  </>
                                                )}
                                              </div>
                                            );
                                          })}
                                          <div className="cm-add-inline cm-level-3">
                                            <button className="cm-add-inline-btn" onClick={() => openAdd('topic', ch._id, 'chapter')}>+ Add topic</button>
                                          </div>
                                        </>
                                      )}
                                    </div>
                                  );
                                })}
                                <div className="cm-add-inline cm-level-2">
                                  <button className="cm-add-inline-btn" onClick={() => openAdd('chapter', sub._id, 'subject')}>+ Add chapter</button>
                                </div>
                              </>
                            )}
                          </div>
                        );
                      })}
                      <div className="cm-add-inline cm-level-1">
                        <button className="cm-add-inline-btn" onClick={() => openAdd('subject', course._id, 'course')}>+ Add subject</button>
                      </div>
                    </>
                  )}
                </div>
              );
            })}
          </div>
        </div>

        {/* ── Right edit panel ── */}
        {selected && selectedItem && !addModal && (
          <div className="cm-edit-panel">
            <EditPanel
              type={selected.type} item={selectedItem}
              courses={courses} subjects={subjects} chapters={chapters} topics={topics} instructors={instructors}
              courseForm={courseForm} setCourseForm={setCourseForm}
              subjectForm={subjectForm} setSubjectForm={setSubjectForm}
              chapterForm={chapterForm} setChapterForm={setChapterForm}
              topicForm={topicForm} setTopicForm={setTopicForm}
              subTopicForm={subTopicForm} setSubTopicForm={setSubTopicForm}
              onSaveCourse={handleSaveCourse} onSaveSubject={handleSaveSubject}
              onSaveChapter={handleSaveChapter} onSaveTopic={handleSaveTopic} onSaveSubTopic={handleSaveSubTopic}
              onDelete={() => handleDelete(selected.type, selected.id)}
              onClose={() => setSelected(null)} saving={saving}
              handleToggleCourseStatus={handleToggleCourseStatus}
            />
          </div>
        )}
      </div>

      {/* ── Add modal ── */}
      {addModal && (
        <div className="cm-modal-overlay" onClick={() => setAddModal(null)}>
          <div className="cm-modal" onClick={e => e.stopPropagation()}>
            <div className="cm-modal-header">
              <span className="cm-modal-type-badge" style={{ background: NODE_COLORS[addModal.type] }}>{NODE_LABELS[addModal.type]}</span>
              <h2>Add {addModal.type === 'subtopic' ? 'Sub-Topic' : addModal.type.charAt(0).toUpperCase() + addModal.type.slice(1)}</h2>
              <button className="cm-modal-close" onClick={() => setAddModal(null)}>&#10005;</button>
            </div>
            <div className="cm-modal-body">
              {addModal.type === 'course' && <CourseForm form={courseForm} setForm={setCourseForm} instructors={instructors} onSubmit={handleSaveCourse} onCancel={() => setAddModal(null)} saving={saving} isEdit={false} />}
              {addModal.type === 'subject' && <SubjectForm form={subjectForm} setForm={setSubjectForm} courses={courses} onSubmit={handleSaveSubject} onCancel={() => setAddModal(null)} saving={saving} isEdit={false} />}
              {addModal.type === 'chapter' && <ChapterForm form={chapterForm} setForm={setChapterForm} courses={courses} subjects={subjects} onSubmit={handleSaveChapter} onCancel={() => setAddModal(null)} saving={saving} isEdit={false} />}
              {addModal.type === 'topic' && <TopicForm form={topicForm} setForm={setTopicForm} courses={courses} subjects={subjects} chapters={chapters} onSubmit={handleSaveTopic} onCancel={() => setAddModal(null)} saving={saving} isEdit={false} />}
              {addModal.type === 'subtopic' && <SubTopicForm form={subTopicForm} setForm={setSubTopicForm} courses={courses} subjects={subjects} chapters={chapters} topics={topics} onSubmit={handleSaveSubTopic} onCancel={() => setAddModal(null)} saving={saving} isEdit={false} />}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default CourseManagement;
