import React, { useEffect, useMemo, useState } from 'react';
import { leadApi } from '../../../api';
import { Modal } from '../../../components/common';

/**
 * Edit lead — everything a counsellor needs to correct or complete in one place: contact details,
 * what they want (courses, mode, when, placement, budget), the lead's own info (source, priority,
 * next follow-up, notes), the institute's custom fields, and every answer that came in with the lead
 * form (Meta / Google Sheet / website). Stage and counsellor keep their own buttons.
 */

type Def = { fieldKey: string; label: string; type: string; options?: string[] };
interface Props {
  open: boolean; lead: any; customDefs: Def[]; busy: boolean;
  onClose: () => void;
  onSave: (payload: Record<string, any>) => void;
}

const MODE = [['undecided', 'Not decided'], ['online', 'Online'], ['offline', 'Offline (classroom)'], ['hybrid', 'Either is fine']];
const URGENCY = [['exploring', 'Just exploring'], ['soon', 'Within a month'], ['immediate', 'Immediately']];
const AFFORD = [['unknown', 'Not discussed'], ['ready', 'Can pay the fee'], ['needs_emi', 'Needs EMI'], ['budget_concern', 'Fee is a concern']];
const PRIORITY = [['hot', 'Hot'], ['warm', 'Warm'], ['cold', 'Cold']];
const LANG = [['', '—'], ['english', 'English'], ['telugu', 'Telugu'], ['hindi', 'Hindi']];
/** Keys that are already edited above, or are plumbing, not answers worth editing. */
const HIDDEN_KEYS = /^(full_name|phone|phone_number|email|city|gclid|google_.*|fbclid|ctwa.*|lead_?id|form_?id|ad_?id|campaign.*|adset.*)$/i;

const human = (k: string) => k.replace(/^custom_/, '').replace(/[_?]+/g, ' ').replace(/[^\p{L}\p{N} ]/gu, ' ').replace(/\s+/g, ' ').trim()
  .replace(/^\w/, (c) => c.toUpperCase());
const toLocal = (iso?: string) => {
  if (!iso) return '';
  const d = new Date(iso);
  if (isNaN(d.getTime())) return '';
  const off = d.getTimezoneOffset();
  return new Date(d.getTime() - off * 60000).toISOString().slice(0, 16);
};

const Section: React.FC<{ icon: string; title: string; children: React.ReactNode }> = ({ icon, title, children }) => (
  <section className="ele-sec">
    <h4><i className={`bi ${icon}`} /> {title}</h4>
    <div className="ele-grid">{children}</div>
  </section>
);
const Field: React.FC<{ label: string; wide?: boolean; hint?: string; children: React.ReactNode }> = ({ label, wide, hint, children }) => (
  <label className={`ele-field${wide ? ' wide' : ''}`}><span>{label}</span>{children}{hint && <small>{hint}</small>}</label>
);

const EditLeadModal: React.FC<Props> = ({ open, lead, customDefs, busy, onClose, onSave }) => {
  const [f, setF] = useState<any>({});
  const [courses, setCourses] = useState<string[]>([]);
  const [courseDraft, setCourseDraft] = useState('');
  const [custom, setCustom] = useState<Record<string, any>>({});
  const [knownCourses, setKnownCourses] = useState<string[]>([]);
  const [sources, setSources] = useState<string[]>([]);
  const [err, setErr] = useState('');

  useEffect(() => {
    if (!open || !lead) return;
    const i = lead.interests || {};
    setF({
      name: lead.name || '', phone: lead.phone || '', email: lead.email || '',
      city: (lead.customFields || {}).city || i.location || '', language: lead.language || '',
      source: lead.source || '', priority: lead.priority || 'warm',
      nextFollowUp: toLocal(lead.nextFollowUp), notes: lead.notes || '',
      mode: i.mode || 'undecided', urgency: i.urgency || 'exploring', affordability: i.affordability || 'unknown',
      placement: !!i.placement, demoInterest: !!i.demoInterest, campusVisitInterest: !!i.campusVisitInterest,
      technologies: (i.technologies || []).join(', '),
    });
    setCourses([...(lead.courseInterest || [])]);
    setCourseDraft('');
    setCustom({ ...(lead.customFields || {}) });
    setErr('');
    leadApi.getQueue('today', 1, { limit: 1 }).then((r: any) => setKnownCourses(r?.data?.options?.courses || r?.options?.courses || [])).catch(() => {});
    leadApi.getSources().then((r: any) => setSources((r?.data || []).map((s: any) => (typeof s === 'string' ? s : s._id || s.source || s.name)).filter(Boolean))).catch(() => {});
  }, [open, lead]);

  const set = (k: string, v: any) => setF((x: any) => ({ ...x, [k]: v }));
  const addCourse = (c: string) => {
    const v = c.trim();
    if (v && !courses.some((x) => x.toLowerCase() === v.toLowerCase())) setCourses([...courses, v]);
    setCourseDraft('');
  };
  const defKeys = new Set(customDefs.map((d) => d.fieldKey));
  // Every other answer that came in with the lead (form questions), editable as text.
  const formAnswers = useMemo(() => Object.entries(lead?.customFields || {})
    .filter(([k, v]) => !defKeys.has(k) && !HIDDEN_KEYS.test(k) && (typeof v === 'string' || typeof v === 'number'))
    .map(([k]) => k), [lead, customDefs]); // eslint-disable-line react-hooks/exhaustive-deps

  const save = () => {
    if (!String(f.name || '').trim() || !String(f.phone || '').trim()) { setErr('Name and mobile are required.'); return; }
    if (f.email && !/^\S+@\S+\.\S+$/.test(f.email.trim())) { setErr('That email does not look right.'); return; }
    const pending = courseDraft.trim() ? [...courses, courseDraft.trim()] : courses;
    onSave({
      name: f.name.trim(), phone: f.phone.trim(), email: f.email.trim(),
      courseInterest: pending,
      source: f.source || undefined,
      priority: f.priority,
      nextFollowUp: f.nextFollowUp ? new Date(f.nextFollowUp).toISOString() : null,
      notes: f.notes,
      ...(f.language ? { language: f.language } : {}),
      interests: {
        mode: f.mode, urgency: f.urgency, affordability: f.affordability,
        placement: f.placement, demoInterest: f.demoInterest, campusVisitInterest: f.campusVisitInterest,
        location: f.city, technologies: String(f.technologies || '').split(',').map((s) => s.trim()).filter(Boolean),
      },
      customFields: { ...custom, ...(f.city ? { city: f.city } : {}) },
    });
  };

  return (
    <Modal isOpen={open} onClose={onClose} title="Edit lead" size="large">
      <div className="ele">
        <Section icon="bi-person-vcard" title="Contact">
          <Field label="Name *"><input className="form-control" value={f.name || ''} onChange={(e) => set('name', e.target.value)} /></Field>
          <Field label="Mobile *"><input className="form-control" value={f.phone || ''} onChange={(e) => set('phone', e.target.value)} /></Field>
          <Field label="Email"><input className="form-control" type="email" value={f.email || ''} onChange={(e) => set('email', e.target.value)} /></Field>
          <Field label="City"><input className="form-control" value={f.city || ''} onChange={(e) => set('city', e.target.value)} /></Field>
          <Field label="Preferred language">
            <select className="form-select" value={f.language || ''} onChange={(e) => set('language', e.target.value)}>{LANG.map(([v, l]) => <option key={v} value={v}>{l}</option>)}</select>
          </Field>
        </Section>

        <Section icon="bi-mortarboard" title="What they want">
          <Field label="Interested courses" wide hint="Type a course and press Enter, or pick one from the list.">
            <div className="ele-chips">
              {courses.map((c) => (
                <span key={c} className="ele-chip">{c}<button type="button" aria-label={`Remove ${c}`} onClick={() => setCourses(courses.filter((x) => x !== c))}>×</button></span>
              ))}
              <input className="ele-chip-input" list="ele-courses" value={courseDraft} placeholder={courses.length ? 'Add another…' : 'e.g. Java Full Stack with AI'}
                onChange={(e) => { const v = e.target.value; if (knownCourses.includes(v)) addCourse(v); else setCourseDraft(v); }}
                onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ',') { e.preventDefault(); addCourse(courseDraft); } }}
                onBlur={() => courseDraft.trim() && addCourse(courseDraft)} aria-label="Add a course" />
              <datalist id="ele-courses">{knownCourses.filter((c) => !courses.includes(c)).map((c) => <option key={c} value={c} />)}</datalist>
            </div>
          </Field>
          <Field label="Training mode">
            <select className="form-select" value={f.mode} onChange={(e) => set('mode', e.target.value)}>{MODE.map(([v, l]) => <option key={v} value={v}>{l}</option>)}</select>
          </Field>
          <Field label="When can they start">
            <select className="form-select" value={f.urgency} onChange={(e) => set('urgency', e.target.value)}>{URGENCY.map(([v, l]) => <option key={v} value={v}>{l}</option>)}</select>
          </Field>
          <Field label="Fee / budget">
            <select className="form-select" value={f.affordability} onChange={(e) => set('affordability', e.target.value)}>{AFFORD.map(([v, l]) => <option key={v} value={v}>{l}</option>)}</select>
          </Field>
          <Field label="Technologies they know"><input className="form-control" value={f.technologies || ''} placeholder="Java, SQL, HTML" onChange={(e) => set('technologies', e.target.value)} /></Field>
          <div className="ele-checks wide">
            <label><input type="checkbox" checked={!!f.placement} onChange={(e) => set('placement', e.target.checked)} /> Wants placement support</label>
            <label><input type="checkbox" checked={!!f.demoInterest} onChange={(e) => set('demoInterest', e.target.checked)} /> Wants a demo</label>
            <label><input type="checkbox" checked={!!f.campusVisitInterest} onChange={(e) => set('campusVisitInterest', e.target.checked)} /> Wants to visit the campus</label>
          </div>
        </Section>

        <Section icon="bi-clipboard-data" title="Lead details">
          <Field label="Source">
            <input className="form-control" list="ele-sources" value={f.source || ''} onChange={(e) => set('source', e.target.value)} />
            <datalist id="ele-sources">{sources.map((s) => <option key={s} value={s} />)}</datalist>
          </Field>
          <Field label="Priority">
            <select className="form-select" value={f.priority} onChange={(e) => set('priority', e.target.value)}>{PRIORITY.map(([v, l]) => <option key={v} value={v}>{l}</option>)}</select>
          </Field>
          <Field label="Next follow-up"><input className="form-control" type="datetime-local" value={f.nextFollowUp || ''} onChange={(e) => set('nextFollowUp', e.target.value)} /></Field>
          <Field label="Notes" wide><textarea className="form-control" rows={3} value={f.notes || ''} onChange={(e) => set('notes', e.target.value)} /></Field>
        </Section>

        {customDefs.length > 0 && (
          <Section icon="bi-ui-checks" title="Your custom fields">
            {customDefs.map((d) => {
              const v = custom[d.fieldKey] ?? '';
              const put = (val: any) => setCustom((c) => ({ ...c, [d.fieldKey]: val }));
              return (
                <Field key={d.fieldKey} label={d.label} wide={d.type === 'textarea'}>
                  {d.type === 'select' && d.options?.length ? (
                    <select className="form-select" value={String(v)} onChange={(e) => put(e.target.value)}><option value="">—</option>{d.options.map((o) => <option key={o} value={o}>{o}</option>)}</select>
                  ) : d.type === 'textarea' ? (
                    <textarea className="form-control" rows={2} value={String(v)} onChange={(e) => put(e.target.value)} />
                  ) : (
                    <input className="form-control" type={d.type === 'number' ? 'number' : d.type === 'date' ? 'date' : d.type === 'email' ? 'email' : 'text'} value={String(v)} onChange={(e) => put(e.target.value)} />
                  )}
                </Field>
              );
            })}
          </Section>
        )}

        {formAnswers.length > 0 && (
          <Section icon="bi-file-earmark-text" title="Answers from the lead form">
            {formAnswers.map((k) => (
              <Field key={k} label={human(k) || k}>
                <input className="form-control" value={String(custom[k] ?? '')} onChange={(e) => setCustom((c) => ({ ...c, [k]: e.target.value }))} />
              </Field>
            ))}
          </Section>
        )}

        {err && <div className="alert alert-danger py-2 small mb-0">{err}</div>}
        <div className="ele-foot">
          <button type="button" className="btn btn-outline-secondary btn-sm" onClick={onClose}>Cancel</button>
          <button type="button" className="btn btn-primary btn-sm" disabled={busy} onClick={save}>{busy ? 'Saving…' : 'Save changes'}</button>
        </div>
      </div>
    </Modal>
  );
};

export default EditLeadModal;
