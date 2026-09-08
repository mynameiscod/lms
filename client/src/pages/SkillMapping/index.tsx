/**
 * Map curriculum topics to canonical skills.
 *
 * THE AUTHORING SCREEN THE BRIDGE NEEDS. Every adaptive behaviour — depth by mastery, direction
 * filtering, prerequisite gating, replanning — depends on topics carrying skill keys, and until
 * now the only way to set them was a seed script. A product feature that requires shell access
 * to configure is a feature nobody outside engineering can use.
 *
 * COVERAGE IS THE POINT, not a nice-to-have. The header states how much of the curriculum is
 * mapped and which skills the content bank cannot yet teach, because an unmapped topic and an
 * unteachable skill both produce a plan that quietly omits something — and neither is visible
 * from anywhere else.
 */
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import axios from 'axios';
import { adaptiveApi } from '../../api/adaptiveApi';
import './skillMapping.css';

const API = process.env.REACT_APP_API_URL || '/api/v1';
const auth = () => {
  const token = localStorage.getItem('token');
  const tenantId = localStorage.getItem('tenantId');
  return {
    ...(token && { Authorization: `Bearer ${token}` }),
    ...(tenantId && { 'X-Tenant-Id': tenantId }),
  };
};

interface Topic {
  _id?: string;
  title: string;
  moduleCode?: string;
  topicCode?: string;
  skillKeys?: string[];
  prerequisiteSkillKeys?: string[];
  defaultDepth?: string;
  mandatory?: boolean;
  applicableDirections?: string[];
  learningOutcomes?: string[];
  [k: string]: any;
}

interface Skill { key: string; name: string; nodeType?: string; assessable?: boolean }

const DEPTHS = ['FOUNDATION', 'GUIDED', 'STANDARD', 'REVISION', 'CHALLENGE'];

const SkillMapping: React.FC<{ curriculumId: string }> = ({ curriculumId }) => {
  const [topics, setTopics] = useState<Topic[]>([]);
  const [title, setTitle] = useState('');
  const [skills, setSkills] = useState<Skill[]>([]);
  const [directions, setDirections] = useState<{ key: string; name: string }[]>([]);
  const [gaps, setGaps] = useState<{ unmapped: string[] } | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [open, setOpen] = useState<number | null>(null);

  const load = useCallback(async () => {
    setLoading(true); setError('');
    try {
      const [cur, sk, dirs] = await Promise.all([
        axios.get(`${API}/curricula/${curriculumId}`, { headers: auth() }),
        axios.get(`${API}/passport/career-skills?limit=500`, { headers: auth() }).catch(() => ({ data: { skills: [] } })),
        adaptiveApi.listDirections().catch(() => []),
      ]);
      setTitle(cur.data?.title || '');
      setTopics(cur.data?.topics || []);
      // Groups are shelves, not capabilities — offering them here would let somebody map a
      // topic to a heading, which nothing can ever measure.
      const list: Skill[] = (sk.data?.skills || sk.data?.data || [])
        .filter((s: Skill) => s.nodeType !== 'GROUP');
      setSkills(list);
      setDirections(dirs);
      adaptiveApi.contentGaps(curriculumId).then(setGaps).catch(() => setGaps(null));
    } catch (e: any) {
      setError(e?.response?.data?.message || 'Could not load that curriculum.');
    } finally { setLoading(false); }
  }, [curriculumId]);

  useEffect(() => { load(); }, [load]);

  const update = (i: number, patch: Partial<Topic>) =>
    setTopics(ts => ts.map((t, n) => (n === i ? { ...t, ...patch } : t)));

  const save = async () => {
    setSaving(true); setError(''); setNotice('');
    try {
      await axios.put(`${API}/curricula/${curriculumId}`, { topics }, { headers: auth() });
      setNotice('Mapping saved.');
      adaptiveApi.contentGaps(curriculumId).then(setGaps).catch(() => {});
    } catch (e: any) {
      setError(e?.response?.data?.message || 'Could not save that mapping.');
    } finally { setSaving(false); }
  };

  const mapped = useMemo(() => topics.filter(t => (t.skillKeys || []).length).length, [topics]);
  const skillName = useMemo(() => new Map(skills.map(s => [s.key, s.name])), [skills]);

  if (loading) return <div className="sm-wrap"><p className="sm-muted">Loading…</p></div>;

  return (
    <div className="sm-wrap">
      <header className="sm-head">
        <div>
          <h1 className="sm-title">Skill mapping</h1>
          <p className="sm-sub">{title}</p>
        </div>
        <button className="sm-btn" onClick={save} disabled={saving}>
          {saving ? 'Saving…' : 'Save mapping'}
        </button>
      </header>

      <div className="sm-coverage">
        <div className="sm-cov-stat">
          <strong>{mapped}</strong> of <strong>{topics.length}</strong> topics mapped
        </div>
        {gaps && gaps.unmapped.length > 0 && (
          /**
           * Named, not counted. "12 skills have no content" is a number somebody ignores; the
           * list is a task somebody can pick up.
           */
          <div className="sm-cov-gap">
            <span>No content yet for:</span>
            <span className="sm-gap-keys">{gaps.unmapped.join(', ')}</span>
          </div>
        )}
      </div>

      {error && <div className="sm-error">{error}</div>}
      {notice && <div className="sm-notice">{notice}</div>}

      <ul className="sm-topics">
        {topics.map((t, i) => {
          const isOpen = open === i;
          const keys = t.skillKeys || [];
          return (
            <li className={`sm-topic ${keys.length ? '' : 'is-unmapped'}`} key={t._id || t.title || i}>
              <div className="sm-topic-head" onClick={() => setOpen(isOpen ? null : i)}>
                <div className="sm-topic-text">
                  <span className="sm-topic-title">{t.title}</span>
                  <span className="sm-topic-meta">
                    {keys.length
                      ? keys.map(k => skillName.get(k) || k).join(' · ')
                      : 'Not mapped — this topic cannot be personalised'}
                  </span>
                </div>
                <span className="sm-chev">{isOpen ? '−' : '+'}</span>
              </div>

              {isOpen && (
                <div className="sm-editor">
                  <label className="sm-field">
                    <span>Skills taught</span>
                    <select
                      multiple
                      value={keys}
                      onChange={e => update(i, {
                        skillKeys: Array.from(e.target.selectedOptions).map(o => o.value),
                      })}
                    >
                      {skills.map(s => <option key={s.key} value={s.key}>{s.name} ({s.key})</option>)}
                    </select>
                  </label>

                  <label className="sm-field">
                    <span>Needed first</span>
                    <select
                      multiple
                      value={t.prerequisiteSkillKeys || []}
                      onChange={e => update(i, {
                        prerequisiteSkillKeys: Array.from(e.target.selectedOptions).map(o => o.value),
                      })}
                    >
                      {skills.map(s => <option key={s.key} value={s.key}>{s.name}</option>)}
                    </select>
                  </label>

                  <div className="sm-row">
                    <label className="sm-field sm-narrow">
                      <span>Default depth</span>
                      <select
                        value={t.defaultDepth || ''}
                        onChange={e => update(i, { defaultDepth: e.target.value || undefined })}
                      >
                        <option value="">—</option>
                        {DEPTHS.map(d => <option key={d} value={d}>{d}</option>)}
                      </select>
                    </label>

                    <label className="sm-field sm-narrow">
                      <span>Module code</span>
                      <input
                        value={t.moduleCode || ''}
                        onChange={e => update(i, { moduleCode: e.target.value })}
                        placeholder="M03_PROGRAMMING"
                      />
                    </label>

                    <label className="sm-field sm-narrow">
                      <span>Topic code</span>
                      <input
                        value={t.topicCode || ''}
                        onChange={e => update(i, { topicCode: e.target.value })}
                        placeholder="T_LOOPS"
                      />
                    </label>
                  </div>

                  <label className="sm-check">
                    <input
                      type="checkbox"
                      checked={t.mandatory !== false}
                      onChange={e => update(i, { mandatory: e.target.checked })}
                    />
                    <span>
                      Everyone learns this
                      <em>Mandatory topics are never removed by direction filtering.</em>
                    </span>
                  </label>

                  <label className="sm-field">
                    <span>
                      Directions
                      <em>Leave empty for everyone. Ignored while “everyone learns this” is on.</em>
                    </span>
                    <select
                      multiple
                      value={t.applicableDirections || []}
                      onChange={e => update(i, {
                        applicableDirections: Array.from(e.target.selectedOptions).map(o => o.value),
                      })}
                    >
                      {directions.map(d => <option key={d.key} value={d.key}>{d.name}</option>)}
                    </select>
                  </label>
                </div>
              )}
            </li>
          );
        })}
      </ul>
    </div>
  );
};

export default SkillMapping;
