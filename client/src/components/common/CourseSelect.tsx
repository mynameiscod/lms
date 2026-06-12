import React, { useCallback, useEffect, useState } from 'react';
import { courseApi } from '../../api';

/**
 * Course dropdown with an inline "＋ New course" quick-add.
 *
 * Courses are a lightweight lookup (title + optional code) used to tag batches,
 * assignments and quizzes. Since the old Course Management page was removed,
 * this lets admins create a course right where they need it. The backend only
 * requires title + code (other fields default server-side).
 */
export interface CourseLite { _id: string; title: string; code?: string; }

interface Props {
  value: string;
  onChange: (id: string) => void;
  className?: string;                 // applied to the <select>
  placeholder?: string;
  onCreated?: (course: CourseLite) => void; // let parent sync its own list if it keeps one
}

const CourseSelect: React.FC<Props> = ({ value, onChange, className, placeholder = '-- Select Course --', onCreated }) => {
  const [courses, setCourses] = useState<CourseLite[]>([]);
  const [adding, setAdding]   = useState(false);
  const [title, setTitle]     = useState('');
  const [code, setCode]       = useState('');
  const [saving, setSaving]   = useState(false);
  const [err, setErr]         = useState('');

  const load = useCallback(async () => {
    try { const res: any = await courseApi.getCourses(); setCourses(res?.data || []); } catch { /* ignore */ }
  }, []);
  useEffect(() => { load(); }, [load]);

  const create = async () => {
    if (!title.trim()) { setErr('Enter a course name.'); return; }
    setSaving(true); setErr('');
    try {
      const res: any = await courseApi.createCourse({ title: title.trim(), code: (code.trim() || title.trim().slice(0, 12)).toUpperCase() });
      const created: CourseLite | undefined = res?.data;
      await load();
      if (created?._id) { onChange(created._id); onCreated?.(created); }
      setAdding(false); setTitle(''); setCode('');
    } catch (e: any) {
      setErr(e?.message || 'Could not create the course.');
    } finally {
      setSaving(false);
    }
  };

  const btn: React.CSSProperties = { border: 'none', borderRadius: 8, padding: '8px 12px', fontWeight: 700, fontSize: 13, cursor: 'pointer' };

  if (adding) {
    return (
      <div style={{ border: '1.5px solid #c7d2fe', borderRadius: 10, padding: 12, background: '#f5f8ff' }}>
        <div style={{ fontWeight: 700, fontSize: 13, color: '#3730a3', marginBottom: 8 }}>＋ New course</div>
        <input value={title} onChange={e => setTitle(e.target.value)} placeholder="Course name * (e.g. Java Full Stack)"
          style={{ width: '100%', border: '1px solid #cbd5e1', borderRadius: 8, padding: '9px 11px', fontSize: 14, marginBottom: 8 }} autoFocus />
        <input value={code} onChange={e => setCode(e.target.value)} placeholder="Code (optional, e.g. JAVA-FS)"
          style={{ width: '100%', border: '1px solid #cbd5e1', borderRadius: 8, padding: '9px 11px', fontSize: 14 }} />
        {err && <div style={{ color: '#dc2626', fontSize: 12.5, marginTop: 6 }}>{err}</div>}
        <div style={{ display: 'flex', gap: 8, marginTop: 10 }}>
          <button type="button" onClick={create} disabled={saving} style={{ ...btn, background: '#4f46e5', color: '#fff', opacity: saving ? 0.6 : 1 }}>
            {saving ? 'Creating…' : 'Create & select'}
          </button>
          <button type="button" onClick={() => { setAdding(false); setErr(''); }} style={{ ...btn, background: '#fff', border: '1.5px solid #cbd5e1', color: '#334155' }}>Cancel</button>
        </div>
      </div>
    );
  }

  return (
    <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
      <select className={className} value={value} onChange={e => onChange(e.target.value)} style={{ flex: 1 }}>
        <option value="">{placeholder}</option>
        {courses.map(c => <option key={c._id} value={c._id}>{c.title}{c.code ? ` (${c.code})` : ''}</option>)}
      </select>
      <button type="button" onClick={() => setAdding(true)} title="Create a new course"
        style={{ ...btn, background: '#eef2ff', color: '#4f46e5', whiteSpace: 'nowrap' }}>＋ New</button>
    </div>
  );
};

export default CourseSelect;
