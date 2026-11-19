import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import './waTemplates.css';
import {
  waTemplateApi, errMsg, WaTemplate, WaTemplateInput, WaPurpose, WaCompat, WaBroadcast, WaButton, WaCategory, WaMessage, WaDeliverySummary,
  WaLeadFilter, WaLeadFilterOptions, WaLeadAudience, WaAudienceSource, WaAudienceFilter, WaSourcePreview, WaBroadcastPurpose, WaReplyLead,
} from '../../api/whatsAppTemplateApi';

/**
 * WhatsApp Templates — create message templates on Meta from here instead of Business Manager,
 * choose which one each part of the system sends, and send one to a list or a batch.
 */

const C = {
  text: '#0f172a', muted: '#64748b', border: '#e2e8f0', bg: '#f8fafc', card: '#fff',
  green: '#15803d', greenBg: '#dcfce7', amber: '#b45309', amberBg: '#fef3c7', red: '#b91c1c', redBg: '#fee2e2',
  blue: '#1d4ed8', blueBg: '#dbeafe', wa: '#075e54', waChat: '#e5ddd5', waBubble: '#fff',
};
const card: React.CSSProperties = { background: C.card, border: `1px solid ${C.border}`, borderRadius: 12, padding: 16 };
const input: React.CSSProperties = { width: '100%', padding: '8px 10px', border: `1px solid ${C.border}`, borderRadius: 8, fontSize: 14, boxSizing: 'border-box', fontFamily: 'inherit' };
const label: React.CSSProperties = { display: 'block', fontSize: 12.5, fontWeight: 700, color: C.text, margin: '12px 0 5px' };
const hint: React.CSSProperties = { fontSize: 12, color: C.muted, marginTop: 4 };
const btn = (kind: 'primary' | 'ghost' | 'danger' = 'ghost'): React.CSSProperties => ({
  padding: '7px 14px', borderRadius: 8, fontSize: 13, fontWeight: 700, cursor: 'pointer',
  border: kind === 'ghost' ? `1px solid ${C.border}` : 'none',
  background: kind === 'primary' ? '#16a34a' : kind === 'danger' ? C.redBg : '#fff',
  color: kind === 'primary' ? '#fff' : kind === 'danger' ? C.red : C.text,
});
const chipRow: React.CSSProperties = { display: 'flex', flexWrap: 'wrap', gap: 6, marginTop: 4 };
const Chip: React.FC<{ on: boolean; onClick: () => void; children: React.ReactNode }> = ({ on, onClick, children }) => (
  <button type="button" onClick={onClick} style={{
    padding: '4px 10px', borderRadius: 999, fontSize: 12.5, cursor: 'pointer',
    border: `1px solid ${on ? C.green : C.border}`, background: on ? C.greenBg : '#fff', color: on ? C.green : C.text, fontWeight: on ? 700 : 500,
  }}>{children}</button>
);

const STATUS: Record<string, { bg: string; c: string; label: string }> = {
  APPROVED: { bg: C.greenBg, c: C.green, label: 'Approved' },
  PENDING: { bg: C.amberBg, c: C.amber, label: 'In review' },
  IN_APPEAL: { bg: C.amberBg, c: C.amber, label: 'In appeal' },
  REJECTED: { bg: C.redBg, c: C.red, label: 'Rejected' },
  PAUSED: { bg: C.redBg, c: C.red, label: 'Paused' },
  DISABLED: { bg: C.redBg, c: C.red, label: 'Disabled' },
  DELETED: { bg: '#f1f5f9', c: C.muted, label: 'Deleted on Meta' },
};
const Badge: React.FC<{ status: string }> = ({ status }) => {
  const s = STATUS[status] || { bg: '#f1f5f9', c: C.muted, label: status };
  return <span style={{ background: s.bg, color: s.c, fontSize: 11.5, fontWeight: 800, padding: '3px 9px', borderRadius: 999, whiteSpace: 'nowrap' }}>{s.label}</span>;
};

const LANGS = [
  ['en', 'English'], ['en_US', 'English (US)'], ['en_GB', 'English (UK)'], ['hi', 'Hindi'], ['te', 'Telugu'],
  ['ta', 'Tamil'], ['kn', 'Kannada'], ['ml', 'Malayalam'], ['mr', 'Marathi'], ['bn', 'Bengali'], ['gu', 'Gujarati'],
];

const varCount = (s: string) => {
  const idx = Array.from(String(s || '').matchAll(/\{\{\s*(\d+)\s*\}\}/g)).map((m) => Number(m[1]));
  return idx.length ? Math.max(...idx) : 0;
};

// ── Quick starts ─────────────────────────────────────────────────────────────

const STARTERS: { title: string; input: WaTemplateInput }[] = [
  {
    title: 'Class reminder', input: {
      name: 'class_reminder', language: 'en', category: 'UTILITY',
      header: { format: 'TEXT', text: 'Class reminder' },
      body: 'Hi {{1}}, your class on {{2}} starts at {{3}} today. Please join on time.',
      bodyExamples: ['Ravi', 'Java Collections', '7:00 PM'], footer: 'CodeBegun', buttons: [],
    },
  },
  {
    title: 'Fee due reminder', input: {
      name: 'fee_due_reminder', language: 'en', category: 'UTILITY',
      body: 'Hi {{1}}, your fee instalment of ₹{{2}} is due on {{3}}. Please pay to continue uninterrupted access.',
      bodyExamples: ['Ravi', '5,000', '5 Oct'], footer: 'CodeBegun', buttons: [],
    },
  },
  {
    title: 'New lead welcome', input: {
      name: 'lead_welcome', language: 'en', category: 'UTILITY',
      body: 'Hello {{1}}! Thank you for your interest in CodeBegun. Our counsellor will call you shortly with course details.',
      bodyExamples: ['Ravi'], buttons: [{ type: 'QUICK_REPLY', text: 'Call me now' }],
    },
  },
  {
    title: 'Missed call: share your availability', input: {
      name: 'missed_call_callback', language: 'en', category: 'UTILITY',
      body: 'Hi {{1}}, we tried to reach you by phone about your enquiry with CodeBegun but could not connect. Please let us know a convenient time and we will call you back. Thank you!',
      bodyExamples: ['Ravi'], footer: 'CodeBegun',
      buttons: [{ type: 'QUICK_REPLY', text: 'Call me now' }, { type: 'QUICK_REPLY', text: 'Call me later today' }, { type: 'QUICK_REPLY', text: 'Call me tomorrow' }],
    },
  },
  {
    title: 'Exam / event link', input: {
      name: 'exam_invite', language: 'en', category: 'UTILITY',
      body: 'Hi {{1}}, you are invited to {{2}} starting {{3}}. Use the button below to open your exam.',
      bodyExamples: ['Ravi', 'DSA Weekly Battle', '27 Sep, 7 PM'],
      buttons: [{ type: 'URL', text: 'Open my exam', url: 'https://platform.codebegun.com/battles/exam/{{1}}', urlExample: 'https://platform.codebegun.com/battles/exam/abc123' }],
    },
  },
  {
    title: 'Offer / promotion', input: {
      name: 'course_offer', language: 'en', category: 'MARKETING',
      header: { format: 'IMAGE', imageUrl: '' },
      body: 'Hi {{1}}, admissions for our {{2}} batch are open! Early-bird seats close this week.',
      bodyExamples: ['Ravi', 'Java Full Stack'],
      buttons: [{ type: 'URL', text: 'View details', url: 'https://codebegun.com' }],
    },
  },
  {
    title: 'Placement program invite', input: {
      name: 'placement_program_invite_2026', language: 'en', category: 'MARKETING',
      header: { format: 'TEXT', text: 'CodeBegun Placement Program 2026' },
      body: 'Hi {{1}} 👋\n\n🎓 Are you a 2026 graduate?\n✅ Is your training completed?\n💼 Looking for placement support now?\n\nThen you are in the right place! Fill in the short form below and our team will connect with you to explain the CodeBegun Placement Program.',
      bodyExamples: ['Ravi'],
      footer: 'CodeBegun · Placements 2026',
      buttons: [{ type: 'URL', text: 'Fill the form', url: 'https://www.codebegun.com/placements-2026' }],
    },
  },
  {
    title: 'OTP code', input: { name: 'login_otp', language: 'en', category: 'AUTHENTICATION', auth: { securityRecommendation: true, codeExpiryMinutes: 10 } },
  },
];

/** Ready-written drafts for uses where the generic "label: value" text would read badly. */
const PURPOSE_DRAFTS: Record<string, WaTemplateInput> = {
  PRACTICE_REMINDER: {
    name: 'daily_practice_reminder', language: 'en', category: 'UTILITY',
    header: { format: 'NONE' },
    body: 'Hi {{1}}, your daily practice for today is still pending: {{2}}.\n\nFinish it before midnight so today counts towards your practice attendance and placement support.',
    bodyExamples: ['Ravi', 'Communication Lab, Coding problem'],
    footer: 'CodeBegun · Daily Practice Pass',
    buttons: [],
  },
  WEEKLY_REPORT: {
    name: 'weekly_learning_report', language: 'en', category: 'UTILITY',
    header: { format: 'NONE' },
    body: 'Hi {{1}}, here is your weekly learning report for {{2}}.\n\n🔥 Practice days: *{{3}}*\n📊 Practice attendance: *{{4}}*\n⭐ Overall score: *{{5}}*\n\nYour full report has been sent to your email.',
    bodyExamples: ['Ravi', '22–27 Sep', '4 of 6', '72%', '68/100'],
    footer: 'CodeBegun · Weekly report',
    buttons: [],
  },
};

/** A draft suited to a system use — the right number of variables and a button slot if it has one. */
function draftForPurpose(p: WaPurpose): WaTemplateInput {
  if (PURPOSE_DRAFTS[p.key]) return { ...PURPOSE_DRAFTS[p.key] };
  if (p.requiredCategory === 'AUTHENTICATION') {
    return { name: `${p.key.toLowerCase()}_code`, language: 'en', category: 'AUTHENTICATION', auth: { securityRecommendation: true, codeExpiryMinutes: 10 } };
  }
  const parts = p.variables.map((v, i) => `${v}: {{${i + 1}}}`).join(', ');
  const urlHint = (p.buttonParam || '').match(/https?:\/\/\S+\{\{1\}\}/)?.[0];
  return {
    name: p.key.toLowerCase(), language: 'en', category: 'UTILITY',
    header: { format: p.headerImage ? 'IMAGE' : 'NONE', imageUrl: '' },
    body: `Hello, here is an update from CodeBegun. ${parts}. Thank you.`,
    bodyExamples: p.variables.map((v) => v.replace(/\s*\(.*\)/, '')),
    buttons: urlHint ? [{ type: 'URL', text: 'Open', url: urlHint, urlExample: urlHint.replace('{{1}}', 'abc123') }] : [],
  };
}

// ── Preview ──────────────────────────────────────────────────────────────────

const fmt = (s: string) => {
  // WhatsApp's *bold*, _italic_, ~strike~ — escaped first so nothing else renders.
  const esc = s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
  return esc.replace(/\*([^*\n]+)\*/g, '<b>$1</b>').replace(/_([^_\n]+)_/g, '<i>$1</i>').replace(/~([^~\n]+)~/g, '<s>$1</s>').replace(/\n/g, '<br/>');
};

const Preview: React.FC<{ t: WaTemplateInput; values?: string[] }> = ({ t, values }) => {
  const isAuth = t.category === 'AUTHENTICATION';
  const body = isAuth
    ? `*{{1}}* is your verification code.${t.auth?.securityRecommendation !== false ? ' For your security, do not share this code.' : ''}`
    : (t.body || '');
  const vals = isAuth ? ['123456'] : (values || t.bodyExamples || []);
  const filled = body.replace(/\{\{\s*(\d+)\s*\}\}/g, (_, n) => vals[Number(n) - 1] || `{{${n}}}`);
  const footer = isAuth ? (t.auth?.codeExpiryMinutes ? `This code expires in ${t.auth.codeExpiryMinutes} minutes.` : '') : t.footer;
  const buttons: WaButton[] = isAuth ? [{ type: 'OTP', text: 'Copy code' }] : (t.buttons || []);
  const icon = (b: WaButton) => b.type === 'URL' ? '↗' : b.type === 'PHONE_NUMBER' ? '✆' : b.type === 'OTP' ? '⧉' : '↩';
  return (
    <div style={{ background: C.waChat, borderRadius: 12, padding: 14, minHeight: 220 }}>
      <div style={{ background: C.waBubble, borderRadius: '0 10px 10px 10px', maxWidth: 300, boxShadow: '0 1px 1px rgba(0,0,0,.1)', overflow: 'hidden' }}>
        {t.header?.format === 'DOCUMENT' && (
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, background: '#f0f2f5', margin: 4, borderRadius: 8, padding: '12px 10px' }}>
            <div style={{ width: 34, height: 40, background: '#e53935', color: '#fff', borderRadius: 4, display: 'grid', placeItems: 'center', fontSize: 10, fontWeight: 800 }}>PDF</div>
            <div style={{ fontSize: 13, color: '#111', wordBreak: 'break-all' }}>{t.header.fileName || 'Document.pdf'}</div>
          </div>
        )}
        {t.header?.format === 'IMAGE' && (
          t.header.imageUrl
            ? <img src={t.header.imageUrl} alt="" style={{ width: '100%', display: 'block', maxHeight: 160, objectFit: 'cover' }} />
            : <div style={{ height: 120, background: '#cbd5e1', display: 'grid', placeItems: 'center', color: '#475569', fontSize: 12 }}>Image header</div>
        )}
        <div style={{ padding: '8px 10px 6px' }}>
          {t.header?.format === 'TEXT' && t.header.text && <div style={{ fontWeight: 800, fontSize: 14, marginBottom: 4 }}>{t.header.text}</div>}
          <div style={{ fontSize: 13.5, lineHeight: 1.45, color: '#111', wordBreak: 'break-word' }} dangerouslySetInnerHTML={{ __html: fmt(filled) || '<span style="color:#94a3b8">Your message…</span>' }} />
          {footer && <div style={{ fontSize: 11.5, color: '#8696a0', marginTop: 5 }}>{footer}</div>}
          <div style={{ textAlign: 'right', fontSize: 10.5, color: '#8696a0' }}>10:24</div>
        </div>
        {buttons.map((b, i) => (
          <div key={i} style={{ borderTop: '1px solid #e9edef', padding: '8px 0', textAlign: 'center', color: '#00a5f4', fontSize: 13.5, fontWeight: 600 }}>
            {icon(b)} {b.text || 'Button'}
          </div>
        ))}
      </div>
    </div>
  );
};

// ── PDF header: upload (stored by us at a public link) or paste a link ───────

const PdfHeaderInput: React.FC<{ value: { documentUrl?: string; fileName?: string }; onChange: (p: { documentUrl?: string; fileName?: string }) => void }> = ({ value, onChange }) => {
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState('');
  const fileRef = useRef<HTMLInputElement>(null);
  const upload = async (f?: File) => {
    if (!f) return;
    if (f.type && f.type !== 'application/pdf') { setErr('Choose a PDF file.'); return; }
    setBusy(true); setErr('');
    try { const r = await waTemplateApi.uploadPdf(f); onChange({ documentUrl: r.url, fileName: value.fileName || r.fileName }); }
    catch (e) { setErr(errMsg(e, 'Upload failed')); }
    setBusy(false);
  };
  return (
    <div style={{ background: C.bg, border: `1px solid ${C.border}`, borderRadius: 8, padding: 10, marginTop: 8 }}>
      <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
        <button type="button" style={btn()} disabled={busy} onClick={() => fileRef.current?.click()}>{busy ? 'Uploading…' : value.documentUrl ? 'Replace PDF' : 'Upload PDF'}</button>
        <input ref={fileRef} type="file" accept="application/pdf,.pdf" style={{ display: 'none' }} onChange={(e) => { upload(e.target.files?.[0]); e.target.value = ''; }} />
        {value.documentUrl && <a href={value.documentUrl} target="_blank" rel="noreferrer" style={{ fontSize: 12.5 }}>Open current PDF ↗</a>}
      </div>
      <input style={{ ...input, marginTop: 8 }} placeholder="…or paste a public https link to the PDF" value={value.documentUrl || ''} onChange={(e) => onChange({ documentUrl: e.target.value.trim() })} />
      <label style={{ ...label, marginTop: 8 }}>File name people see</label>
      <input style={input} maxLength={120} placeholder="CodeBegun-Brochure.pdf" value={value.fileName || ''} onChange={(e) => onChange({ fileName: e.target.value })} />
      {err && <div style={{ color: C.red, fontSize: 12.5, marginTop: 6 }}>{err}</div>}
      <div style={hint}>Meta reviews this PDF as the sample, and it is sent with every message from this template — also to brand-new leads who never messaged you. A workflow step can send a different PDF with the same template. Max 30 MB.</div>
    </div>
  );
};

// ── Editor ───────────────────────────────────────────────────────────────────

const Modal: React.FC<{ title: string; onClose: () => void; wide?: boolean; children: React.ReactNode }> = ({ title, onClose, wide, children }) => (
  <div style={{ position: 'fixed', inset: 0, background: 'rgba(15,23,42,.45)', zIndex: 1000, display: 'flex', alignItems: 'flex-start', justifyContent: 'center', padding: '4vh 12px', overflowY: 'auto' }} onMouseDown={onClose}>
    <div style={{ ...card, width: '100%', maxWidth: wide ? 1000 : 560, padding: 20 }} onMouseDown={(e) => e.stopPropagation()}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
        <h3 style={{ margin: 0, fontSize: 17 }}>{title}</h3>
        <button onClick={onClose} style={{ ...btn(), padding: '4px 10px' }}>✕</button>
      </div>
      {children}
    </div>
  </div>
);

const Editor: React.FC<{ initial?: WaTemplate | null; draft?: WaTemplateInput | null; onClose: () => void; onSaved: (msg: string) => void }> = ({ initial, draft, onClose, onSaved }) => {
  const editing = !!initial;
  const [t, setT] = useState<WaTemplateInput>(() => initial ? {
    name: initial.name, language: initial.language, category: initial.category,
    header: { format: (['NONE', 'TEXT', 'IMAGE', 'DOCUMENT'].includes(initial.header?.format) ? initial.header.format : 'NONE') as any, text: initial.header?.text, imageUrl: initial.header?.imageUrl, documentUrl: initial.header?.documentUrl, fileName: initial.header?.fileName },
    body: initial.body, bodyExamples: initial.bodyExamples || [], footer: initial.footer || '',
    buttons: (initial.buttons || []).filter((b) => ['URL', 'PHONE_NUMBER', 'QUICK_REPLY'].includes(b.type)),
    auth: initial.auth || { securityRecommendation: true, codeExpiryMinutes: 10 },
  } : (draft || { name: '', language: 'en', category: 'UTILITY', header: { format: 'NONE' }, body: '', bodyExamples: [], footer: '', buttons: [] }));
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState('');
  const bodyRef = useRef<HTMLTextAreaElement>(null);
  const set = (patch: Partial<WaTemplateInput>) => setT((x) => ({ ...x, ...patch }));
  const isAuth = t.category === 'AUTHENTICATION';
  const n = varCount(t.body || '');

  const addVariable = () => {
    const el = bodyRef.current;
    const token = `{{${n + 1}}}`;
    const body = t.body || '';
    const pos = el ? el.selectionStart : body.length;
    set({ body: body.slice(0, pos) + token + body.slice(pos) });
    setTimeout(() => { if (el) { el.focus(); el.selectionStart = el.selectionEnd = pos + token.length; } }, 0);
  };
  const setButton = (i: number, patch: Partial<WaButton>) => set({ buttons: (t.buttons || []).map((b, k) => k === i ? { ...b, ...patch } : b) });

  const save = async () => {
    setSaving(true); setErr('');
    try {
      const payload = { ...t, bodyExamples: (t.bodyExamples || []).slice(0, n) };
      if (editing) await waTemplateApi.update(initial!._id, payload);
      else await waTemplateApi.create(payload);
      onSaved(editing ? 'Changes submitted — Meta will review them again.' : `"${t.name}" submitted to Meta for review. Approval usually takes a few minutes.`);
    } catch (e) { setErr(errMsg(e, 'Could not submit the template')); }
    setSaving(false);
  };

  return (
    <Modal title={editing ? `Edit ${initial!.name}` : 'New WhatsApp template'} onClose={onClose} wide>
      {!editing && !draft && (
        <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', margin: '8px 0 4px' }}>
          <span style={{ fontSize: 12, color: C.muted, alignSelf: 'center' }}>Start from:</span>
          {STARTERS.map((s) => <button key={s.title} style={{ ...btn(), padding: '4px 10px', fontSize: 12 }} onClick={() => setT(JSON.parse(JSON.stringify(s.input)))}>{s.title}</button>)}
        </div>
      )}
      <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0,1.3fr) minmax(0,1fr)', gap: 20 }} className="wa-editor-grid">
        <div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
            <div>
              <label style={label}>Template name</label>
              <input style={input} value={t.name} disabled={editing} placeholder="class_reminder"
                onChange={(e) => set({ name: e.target.value.toLowerCase().replace(/\s+/g, '_').replace(/[^a-z0-9_]/g, '') })} />
            </div>
            <div>
              <label style={label}>Language</label>
              <select style={input} value={t.language} disabled={editing} onChange={(e) => set({ language: e.target.value })}>
                {LANGS.map(([v, l]) => <option key={v} value={v}>{l} ({v})</option>)}
              </select>
            </div>
          </div>
          <label style={label}>Category</label>
          <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
            {([['UTILITY', 'Utility', 'Updates, reminders, links — transactional'], ['MARKETING', 'Marketing', 'Offers, promotions, announcements'], ['AUTHENTICATION', 'Authentication', 'One-time passwords only']] as [WaCategory, string, string][]).map(([v, l, d]) => (
              <button key={v} disabled={editing && initial!.status === 'APPROVED'} onClick={() => set({ category: v })} title={d}
                style={{ ...btn(), flex: '1 1 120px', textAlign: 'left', borderColor: t.category === v ? '#16a34a' : C.border, background: t.category === v ? '#f0fdf4' : '#fff' }}>
                <div>{l}</div><div style={{ fontWeight: 400, fontSize: 11.5, color: C.muted }}>{d}</div>
              </button>
            ))}
          </div>

          {isAuth ? (
            <>
              <div style={{ ...hint, marginTop: 10 }}>Meta writes the wording of OTP templates itself; you choose the options. The code is sent as {'{{1}}'} with a "Copy code" button.</div>
              <label style={{ ...label, display: 'flex', gap: 8, alignItems: 'center' }}>
                <input type="checkbox" checked={t.auth?.securityRecommendation !== false} onChange={(e) => set({ auth: { ...t.auth, securityRecommendation: e.target.checked } })} />
                Add "For your security, do not share this code."
              </label>
              <label style={label}>Code expires in (minutes, optional)</label>
              <input style={{ ...input, maxWidth: 140 }} type="number" min={1} max={90} value={t.auth?.codeExpiryMinutes ?? ''}
                onChange={(e) => set({ auth: { ...t.auth, codeExpiryMinutes: e.target.value ? Number(e.target.value) : undefined } })} />
            </>
          ) : (
            <>
              <label style={label}>Header (optional)</label>
              <div style={{ display: 'flex', gap: 8 }}>
                <select style={{ ...input, maxWidth: 130 }} value={t.header?.format || 'NONE'} onChange={(e) => set({ header: { ...t.header, format: e.target.value as any } })}>
                  <option value="NONE">None</option><option value="TEXT">Text</option><option value="IMAGE">Image</option><option value="DOCUMENT">PDF document</option>
                </select>
                {t.header?.format === 'TEXT' && <input style={input} maxLength={60} placeholder="Class reminder" value={t.header.text || ''} onChange={(e) => set({ header: { ...t.header!, text: e.target.value } })} />}
                {t.header?.format === 'IMAGE' && <input style={input} placeholder="https://… public JPEG/PNG" value={t.header.imageUrl || ''} onChange={(e) => set({ header: { ...t.header!, imageUrl: e.target.value.trim() } })} />}
              </div>
              {t.header?.format === 'IMAGE' && <div style={hint}>Meta reviews this image as the sample, and it is sent as the default picture when a message has no image of its own.</div>}
              {t.header?.format === 'DOCUMENT' && <PdfHeaderInput value={t.header} onChange={(p) => set({ header: { ...t.header!, ...p } })} />}

              <label style={{ ...label, display: 'flex', justifyContent: 'space-between' }}>
                <span>Body</span>
                <span style={{ fontWeight: 400, color: (t.body || '').length > 1024 ? C.red : C.muted }}>{(t.body || '').length}/1024</span>
              </label>
              <textarea ref={bodyRef} style={{ ...input, minHeight: 110, resize: 'vertical' }} value={t.body || ''}
                placeholder="Hi {{1}}, your class on {{2}} starts at {{3}} today."
                onChange={(e) => set({ body: e.target.value })} />
              <div style={{ display: 'flex', gap: 8, alignItems: 'center', marginTop: 6 }}>
                <button style={{ ...btn(), padding: '4px 10px', fontSize: 12 }} onClick={addVariable}>+ Add variable {`{{${n + 1}}}`}</button>
                <span style={hint}>*bold* _italic_ ~strike~ · a variable can't be the very first or last thing</span>
              </div>
              {n > 0 && (
                <div style={{ background: C.bg, border: `1px solid ${C.border}`, borderRadius: 8, padding: 10, marginTop: 10 }}>
                  <div style={{ fontSize: 12, fontWeight: 700, marginBottom: 6 }}>Sample values <span style={{ fontWeight: 400, color: C.muted }}>— Meta reviews the template with these</span></div>
                  {Array.from({ length: n }).map((_, i) => (
                    <div key={i} style={{ display: 'flex', gap: 8, alignItems: 'center', marginBottom: 5 }}>
                      <code style={{ width: 44, fontSize: 12 }}>{`{{${i + 1}}}`}</code>
                      <input style={{ ...input, padding: '6px 8px' }} value={(t.bodyExamples || [])[i] || ''}
                        onChange={(e) => { const ex = [...(t.bodyExamples || [])]; ex[i] = e.target.value; set({ bodyExamples: ex }); }} />
                    </div>
                  ))}
                </div>
              )}

              <label style={label}>Footer (optional)</label>
              <input style={input} maxLength={60} value={t.footer || ''} placeholder="CodeBegun" onChange={(e) => set({ footer: e.target.value })} />

              <label style={label}>Buttons (optional)</label>
              {(t.buttons || []).map((b, i) => (
                <div key={i} style={{ border: `1px solid ${C.border}`, borderRadius: 8, padding: 8, marginBottom: 6 }}>
                  <div style={{ display: 'flex', gap: 6 }}>
                    <select style={{ ...input, maxWidth: 140 }} value={b.type} onChange={(e) => setButton(i, { type: e.target.value as any })}>
                      <option value="URL">Visit website</option><option value="PHONE_NUMBER">Call phone</option><option value="QUICK_REPLY">Quick reply</option>
                    </select>
                    <input style={input} maxLength={25} placeholder="Button label" value={b.text} onChange={(e) => setButton(i, { text: e.target.value })} />
                    <button style={btn('danger')} onClick={() => set({ buttons: (t.buttons || []).filter((_, k) => k !== i) })}>✕</button>
                  </div>
                  {b.type === 'URL' && (
                    <>
                      <input style={{ ...input, marginTop: 6 }} placeholder="https://platform.codebegun.com/page or …/exam/{{1}}" value={b.url || ''} onChange={(e) => setButton(i, { url: e.target.value.trim() })} />
                      {/\{\{1\}\}$/.test(b.url || '') && (
                        <input style={{ ...input, marginTop: 6 }} placeholder="Example full URL, e.g. https://…/exam/abc123" value={b.urlExample || ''} onChange={(e) => setButton(i, { urlExample: e.target.value.trim() })} />
                      )}
                      <div style={hint}>End the URL with {'{{1}}'} for a personal link (exam token, registration code) filled in per recipient.</div>
                    </>
                  )}
                  {b.type === 'PHONE_NUMBER' && <input style={{ ...input, marginTop: 6 }} placeholder="+919876543210" value={b.phoneNumber || ''} onChange={(e) => setButton(i, { phoneNumber: e.target.value })} />}
                </div>
              ))}
              {(t.buttons || []).length < 10 && (
                <button style={{ ...btn(), padding: '4px 10px', fontSize: 12 }} onClick={() => set({ buttons: [...(t.buttons || []), { type: 'URL', text: '', url: '' }] })}>+ Add button</button>
              )}
            </>
          )}
        </div>

        <div>
          <label style={label}>Preview</label>
          <Preview t={t} />
          {t.category === 'MARKETING' && <div style={{ ...hint, background: C.amberBg, color: C.amber, padding: 8, borderRadius: 8, marginTop: 10 }}>Marketing templates cost more per message and are not delivered to people who opted out of marketing. Use Utility for reminders and links.</div>}
          {editing && initial!.status === 'APPROVED' && <div style={{ ...hint, marginTop: 10 }}>Editing an approved template sends it back for review. Meta allows about 10 edits a month per template.</div>}
        </div>
      </div>

      {err && <div style={{ background: C.redBg, color: C.red, borderRadius: 8, padding: '8px 12px', fontSize: 13, marginTop: 14 }}>{err}</div>}
      <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8, marginTop: 16 }}>
        <button style={btn()} onClick={onClose}>Cancel</button>
        <button style={btn('primary')} disabled={saving} onClick={save}>{saving ? 'Submitting to Meta…' : editing ? 'Save & resubmit' : 'Submit for approval'}</button>
      </div>
      <style>{`@media (max-width: 760px) { .wa-editor-grid { grid-template-columns: 1fr !important; } }`}</style>
    </Modal>
  );
};

// ── Send (test / broadcast) ──────────────────────────────────────────────────

/** What a broadcast is for. Replies to anything but sales stay in the inbox: no bot, no new lead. */
const PURPOSE_LOOK: Record<WaBroadcastPurpose, { label: string; icon: string; reply: string }> = {
  sales: { label: 'Sales / admissions', icon: 'bi-mortarboard-fill', reply: 'Replies are leads: the bot may answer and a lead is created.' },
  hiring: { label: 'Hiring / jobs', icon: 'bi-briefcase-fill', reply: 'Replies go to the inbox only. No bot, no lead.' },
  wishes: { label: 'Wishes / greetings', icon: 'bi-balloon-heart-fill', reply: 'Replies go to the inbox only. No bot, no lead.' },
  update: { label: 'Update to students / participants', icon: 'bi-megaphone-fill', reply: 'Replies go to the inbox only. No bot, no lead.' },
};

const SendModal: React.FC<{ t: WaTemplate; onClose: () => void; onDone: (msg: string) => void }> = ({ t, onClose, onDone }) => {
  const [mode, setMode] = useState<'test' | 'broadcast'>('test');
  const [phone, setPhone] = useState('');
  const [values, setValues] = useState<string[]>(() => Array.from({ length: t.shape.bodyVarCount }, (_, i) => t.bodyExamples?.[i] || ''));
  const [buttonParam, setButtonParam] = useState('');
  // 'paste' | 'batch' | 'leads', or the key of a module's people list (hackathons, battles...).
  const [audience, setAudience] = useState<string>('paste');
  const [sources, setSources] = useState<WaAudienceSource[]>([]);
  const [srcFilters, setSrcFilters] = useState<WaAudienceFilter[] | null>(null);
  const [pick, setPick] = useState<Record<string, string[]>>({});
  const [srcSkip, setSrcSkip] = useState(true);
  const [srcPreview, setSrcPreview] = useState<WaSourcePreview | null>(null);
  const isSource = !['paste', 'batch', 'leads'].includes(audience);
  const [phones, setPhones] = useState('');
  const [batchId, setBatchId] = useState('');
  const [batches, setBatches] = useState<{ _id: string; name: string }[]>([]);
  const [leadOpts, setLeadOpts] = useState<WaLeadFilterOptions | null>(null);
  const [leadFilter, setLeadFilter] = useState<WaLeadFilter>({ stageIds: [], sources: [], passoutYears: [], skipAlreadySent: true });
  const [leadPreview, setLeadPreview] = useState<WaLeadAudience | null>(null);
  const [purpose, setPurpose] = useState<WaBroadcastPurpose | ''>('');
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState('');
  const isAuth = t.category === 'AUTHENTICATION';
  // CRM leads are sales unless said otherwise; every other list must say what it is for.
  const effPurpose: WaBroadcastPurpose | '' = purpose || (audience === 'leads' ? 'sales' : '');
  const hasBtn = t.shape.urlButtonIndex >= 0;

  useEffect(() => { if (mode === 'broadcast' && !batches.length) waTemplateApi.batches().then(setBatches).catch(() => {}); }, [mode, batches.length]);
  useEffect(() => { if (mode === 'broadcast' && !sources.length) waTemplateApi.audienceSources().then(setSources).catch(() => {}); }, [mode, sources.length]);
  useEffect(() => {
    if (!isSource) return;
    let live = true;
    setSrcFilters(null); setSrcPreview(null);
    waTemplateApi.audienceFilters(audience).then((f) => {
      if (!live) return;
      setSrcFilters(f);
      setPick(Object.fromEntries(f.filter((x) => x.single && x.options[0]).map((x) => [x.key, [x.options[0].value]])));
    }).catch((e) => live && setErr(errMsg(e)));
    return () => { live = false; };
  }, [audience, isSource]);
  useEffect(() => {
    if (!isSource || !srcFilters) return;
    let live = true;
    setSrcPreview(null);
    const h = setTimeout(() => waTemplateApi.audiencePreview(t._id, { source: audience, pick, skipAlreadySent: srcSkip })
      .then((p) => live && setSrcPreview(p)).catch((e) => live && setErr(errMsg(e))), 250);
    return () => { live = false; clearTimeout(h); };
  }, [audience, isSource, srcFilters, pick, srcSkip, t._id]);
  const togglePick = (f: WaAudienceFilter, v: string) => setPick((p) => {
    const cur = p[f.key] || [];
    return { ...p, [f.key]: f.single ? [v] : cur.includes(v) ? cur.filter((x) => x !== v) : [...cur, v] };
  });
  useEffect(() => { if (audience === 'leads' && !leadOpts) waTemplateApi.leadFilters().then(setLeadOpts).catch((e) => setErr(errMsg(e))); }, [audience, leadOpts]);
  // Re-count whenever the filter changes, so the number on the Send button is the number that goes out.
  useEffect(() => {
    if (audience !== 'leads') return;
    let live = true;
    setLeadPreview(null);
    const h = setTimeout(() => waTemplateApi.leadAudience(t._id, leadFilter).then((p) => live && setLeadPreview(p)).catch((e) => live && setErr(errMsg(e))), 250);
    return () => { live = false; clearTimeout(h); };
  }, [audience, leadFilter, t._id]);
  const toggle = (key: 'stageIds' | 'sources' | 'passoutYears', v: string) =>
    setLeadFilter((f) => ({ ...f, [key]: f[key].includes(v) ? f[key].filter((x) => x !== v) : [...f[key], v] }));

  const go = async () => {
    setBusy(true); setErr('');
    try {
      if (mode === 'test') {
        try {
          await waTemplateApi.sendTest(t._id, phone, values, hasBtn ? buttonParam : undefined);
        } catch (e: any) {
          // Meta already held back a marketing message to this number — say so before spending another send.
          if (e?.response?.status !== 409 || e?.response?.data?.code !== 'MARKETING_HELD') throw e;
          if (!window.confirm(`${e.response.data.message}\n\nSend anyway?`)) { setBusy(false); return; }
          await waTemplateApi.sendTest(t._id, phone, values, hasBtn ? buttonParam : undefined, true);
        }
        onDone(`Accepted by Meta for ${phone} — watch the Delivery log for whether it arrives.`);
      } else {
        if (!window.confirm('Send this template to every recipient now? This cannot be undone.')) { setBusy(false); return; }
        const b = await waTemplateApi.broadcast(t._id, {
          phones: audience === 'paste' ? phones : undefined, batchId: audience === 'batch' ? batchId : undefined,
          leads: audience === 'leads' ? leadFilter : undefined, audience: isSource ? { source: audience, pick, skipAlreadySent: srcSkip } : undefined, values, buttonParam: hasBtn ? buttonParam : undefined,
          purpose: effPurpose || undefined,
        });
        onDone(`Broadcast started to ${b.total} recipient${b.total === 1 ? '' : 's'} — follow it under Sent history.`);
      }
    } catch (e) { setErr(errMsg(e)); }
    setBusy(false);
  };

  return (
    <Modal title={`Send ${t.name}`} onClose={onClose}>
      <div style={{ display: 'flex', gap: 6, margin: '10px 0' }}>
        {(['test', 'broadcast'] as const).map((m) => (
          <button key={m} style={{ ...btn(), background: mode === m ? C.text : '#fff', color: mode === m ? '#fff' : C.text }} onClick={() => setMode(m)}>
            {m === 'test' ? 'Test to one number' : 'Send to many'}
          </button>
        ))}
      </div>

      {mode === 'test' ? (
        <>
          <label style={label}>WhatsApp number</label>
          <input style={input} value={phone} placeholder="9876543210" onChange={(e) => setPhone(e.target.value)} />
          {t.category === 'MARKETING' && (
            <div style={hint}>
              Marketing template: Meta limits how many marketing messages one person gets and may hold this back
              (code 131049) — especially on repeated tests to the same number. For a reliable test, first send any
              WhatsApp message from this number to your business number.
            </div>
          )}
        </>
      ) : (
        <>
          <label style={label}>What is this message for?</label>
          <div className="wat-purpose" role="radiogroup" aria-label="What is this message for?">
            {(Object.keys(PURPOSE_LOOK) as WaBroadcastPurpose[]).map((k) => (
              <button key={k} type="button" role="radio" aria-checked={effPurpose === k} className={effPurpose === k ? 'on' : ''} onClick={() => setPurpose(k)}>
                <i className={`bi ${PURPOSE_LOOK[k].icon}`} /> {PURPOSE_LOOK[k].label}
              </button>
            ))}
          </div>
          <div style={{ ...hint, color: effPurpose && effPurpose !== 'sales' ? C.green : effPurpose ? C.amber : C.red }}>
            {effPurpose ? PURPOSE_LOOK[effPurpose].reply : 'Choose one. Hiring, wishes and updates never start the bot or create leads when people reply.'}
          </div>
          <label style={label}>Recipients</label>
          <div style={{ display: 'flex', gap: '6px 14px', fontSize: 13, flexWrap: 'wrap' }}>
            <label><input type="radio" checked={audience === 'paste'} onChange={() => setAudience('paste')} /> Paste numbers</label>
            <label><input type="radio" checked={audience === 'batch'} onChange={() => setAudience('batch')} /> Students of a batch</label>
            <label><input type="radio" checked={audience === 'leads'} onChange={() => setAudience('leads')} /> CRM leads</label>
            {sources.map((s) => (
              <label key={s.key} title={s.description}><input type="radio" checked={audience === s.key} onChange={() => setAudience(s.key)} /> {s.label}</label>
            ))}
          </div>
          {isSource ? (
            <div style={{ marginTop: 6 }}>
              {!srcFilters ? <div style={hint}>Loading...</div> : (
                <>
                  {srcFilters.map((f) => {
                    const opts = f.single ? f.options : f.options.filter((o) => (o.count ?? 1) > 0 || (pick[f.key] || []).includes(o.value));
                    if (!opts.length) return null;
                    return (
                      <div key={f.key}>
                        <div style={{ ...hint, fontWeight: 600, color: C.text, marginTop: 8 }}>{f.label}</div>
                        <div style={chipRow}>
                          {opts.map((o) => (
                            <Chip key={o.value} on={(pick[f.key] || []).includes(o.value)} onClick={() => togglePick(f, o.value)}>
                              {o.label}{o.count != null ? ` · ${o.count}` : ''}
                            </Chip>
                          ))}
                        </div>
                      </div>
                    );
                  })}
                  <label style={{ display: 'block', fontSize: 13, marginTop: 8 }}>
                    <input type="checkbox" checked={srcSkip} onChange={(e) => setSrcSkip(e.target.checked)} /> Skip numbers this template already reached
                  </label>
                  <div style={{ ...hint, marginTop: 6 }}>
                    {!srcPreview ? 'Counting...' : (
                      <><b style={{ color: C.text }}>{srcPreview.total} {srcPreview.total === 1 ? 'person' : 'people'}</b> will get this
                        {srcPreview.alreadySent > 0 && ` (${srcPreview.alreadySent} skipped, already sent)`}
                        {srcPreview.sample.length > 0 && ` — e.g. ${srcPreview.sample.join(', ')}`}. Nothing picked in a row means everyone in it; one message per number.</>
                    )}
                  </div>
                </>
              )}
            </div>
          ) : audience === 'leads' ? (
            <div style={{ marginTop: 6 }}>
              {!leadOpts ? <div style={hint}>Loading lead stages…</div> : (
                <>
                  <div style={{ ...hint, fontWeight: 600, color: C.text }}>Stage</div>
                  <div style={chipRow}>
                    {leadOpts.stages.filter((s) => s.count > 0).map((s) => (
                      <Chip key={s._id} on={leadFilter.stageIds.includes(s._id)} onClick={() => toggle('stageIds', s._id)}>{s.name} · {s.count}</Chip>
                    ))}
                  </div>
                  <div style={{ ...hint, fontWeight: 600, color: C.text, marginTop: 8 }}>Source</div>
                  <div style={chipRow}>
                    {leadOpts.sources.map((s) => (
                      <Chip key={s.source} on={leadFilter.sources.includes(s.source)} onClick={() => toggle('sources', s.source)}>{s.source} · {s.count}</Chip>
                    ))}
                  </div>
                  {leadPreview && Object.keys(leadPreview.years).length > 0 && (
                    <>
                      <div style={{ ...hint, fontWeight: 600, color: C.text, marginTop: 8 }}>Passout year <span style={{ fontWeight: 400 }}>(from the lead form)</span></div>
                      <div style={chipRow}>
                        {Array.from(new Set([...Object.keys(leadPreview.years), ...leadFilter.passoutYears])).sort().map((y) => (
                          <Chip key={y} on={leadFilter.passoutYears.includes(y)} onClick={() => toggle('passoutYears', y)}>{y}{leadPreview.years[y] ? ` · ${leadPreview.years[y]}` : ''}</Chip>
                        ))}
                      </div>
                    </>
                  )}
                  <label style={{ display: 'block', fontSize: 13, marginTop: 8 }}>
                    <input type="checkbox" checked={leadFilter.skipAlreadySent} onChange={(e) => setLeadFilter((f) => ({ ...f, skipAlreadySent: e.target.checked }))} /> Skip numbers this template already reached
                  </label>
                  <div style={{ ...hint, marginTop: 6 }}>
                    {!leadPreview ? 'Counting…' : (
                      <><b style={{ color: C.text }}>{leadPreview.total} lead{leadPreview.total === 1 ? '' : 's'}</b> will get this
                        {leadPreview.alreadySent > 0 && ` (${leadPreview.alreadySent} skipped — already sent)`}
                        {leadPreview.sample.length > 0 && ` — e.g. ${leadPreview.sample.join(', ')}`}. No stage or source picked means all of them.</>
                    )}
                  </div>
                </>
              )}
            </div>
          ) : audience === 'paste' ? (
            <>
              <textarea style={{ ...input, minHeight: 90, marginTop: 6 }} value={phones} placeholder={'Ravi Kumar, 9876543210\nPriya 9123456780\n9000000000'} onChange={(e) => setPhones(e.target.value)} />
              <div style={hint}>One per line. A name on the line is used for {'{name}'}.</div>
            </>
          ) : (
            <select style={{ ...input, marginTop: 6 }} value={batchId} onChange={(e) => setBatchId(e.target.value)}>
              <option value="">Choose a batch…</option>
              {batches.map((b) => <option key={b._id} value={b._id}>{b.name}</option>)}
            </select>
          )}
          {t.category === 'MARKETING' && <div style={{ ...hint, color: C.amber }}>Only send marketing templates to people who agreed to hear from you on WhatsApp.</div>}
        </>
      )}

      {isAuth ? (
        <>
          <label style={label}>Code to send</label>
          <input style={input} value={values[0] || ''} placeholder="123456" onChange={(e) => { setValues([e.target.value]); setButtonParam(e.target.value); }} />
        </>
      ) : values.length > 0 && (
        <>
          <label style={label}>Values {mode === 'broadcast' && <span style={{ fontWeight: 400, color: C.muted }}>— type {'{name}'} for each recipient's first name</span>}</label>
          {values.map((v, i) => (
            <div key={i} style={{ display: 'flex', gap: 8, alignItems: 'center', marginBottom: 5 }}>
              <code style={{ width: 44, fontSize: 12 }}>{`{{${i + 1}}}`}</code>
              <input style={{ ...input, padding: '6px 8px' }} value={v} onChange={(e) => setValues(values.map((x, k) => k === i ? e.target.value : x))} />
            </div>
          ))}
        </>
      )}
      {hasBtn && !isAuth && (
        <>
          <label style={label}>Link ending ({'{{1}}'} of the button URL)</label>
          <input style={input} value={buttonParam} placeholder="abc123" onChange={(e) => setButtonParam(e.target.value)} />
          <div style={hint}>{t.buttons[t.shape.urlButtonIndex]?.url}</div>
        </>
      )}

      <div style={{ marginTop: 14 }}><Preview t={{ ...t, header: t.header as any }} values={isAuth ? undefined : values.map((v) => v.replace(/\{name\}/gi, 'Ravi'))} /></div>
      {err && <div style={{ background: C.redBg, color: C.red, borderRadius: 8, padding: '8px 12px', fontSize: 13, marginTop: 12 }}>{err}</div>}
      <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8, marginTop: 14 }}>
        <button style={btn()} onClick={onClose}>Cancel</button>
        <button style={btn('primary')} disabled={busy || (mode === 'broadcast' && !effPurpose) || (mode === 'broadcast' && audience === 'leads' && !leadPreview?.total) || (mode === 'broadcast' && isSource && !srcPreview?.total)} onClick={go}>
          {busy ? 'Sending…' : mode === 'test' ? 'Send test' : audience === 'leads' && leadPreview ? `Send to ${leadPreview.total} leads` : isSource && srcPreview ? `Send to ${srcPreview.total} ${srcPreview.total === 1 ? 'person' : 'people'}` : 'Send now'}
        </button>
      </div>
    </Modal>
  );
};

// ── Page ─────────────────────────────────────────────────────────────────────

type Tab = 'templates' | 'usage' | 'history' | 'delivery';

/** Status → label and colour. "Accepted" means Meta queued it; only "Delivered"/"Read" mean it arrived. */
const DELIVERY_STATUS: Record<WaMessage['status'], { label: string; cls: string; icon: string }> = {
  accepted: { label: 'Queued', cls: 'muted', icon: 'bi-clock' },
  sent: { label: 'Sent', cls: 'blue', icon: 'bi-check2' },
  delivered: { label: 'Delivered', cls: 'green', icon: 'bi-check2-all' },
  read: { label: 'Read', cls: 'green', icon: 'bi-check2-all' },
  failed: { label: 'Failed', cls: 'red', icon: 'bi-exclamation-circle' },
};
const CATEGORY: Record<string, { label: string; cls: string; icon: string }> = {
  MARKETING: { label: 'Marketing', cls: 'violet', icon: 'bi-megaphone-fill' },
  UTILITY: { label: 'Utility', cls: 'blue', icon: 'bi-gear-fill' },
  AUTHENTICATION: { label: 'Authentication', cls: 'pink', icon: 'bi-shield-lock-fill' },
};
const SOURCE: Record<string, { label: string; cls: string; icon: string }> = {
  broadcast: { label: 'Broadcast', cls: 'violet', icon: 'bi-broadcast' },
  test: { label: 'Chat / test', cls: 'blue', icon: 'bi-person-fill' },
  system: { label: 'Automatic', cls: 'teal', icon: 'bi-lightning-charge-fill' },
};
const STATUS_GROUPS: Record<string, string[]> = {
  approved: ['APPROVED'], review: ['PENDING', 'IN_APPEAL'], rejected: ['REJECTED', 'PAUSED', 'DISABLED'], deleted: ['DELETED'],
};
const PAGE = 10;
const when = (iso?: string) => (iso ? new Date(iso).toLocaleString('en-IN', { day: 'numeric', month: 'short', year: 'numeric', hour: 'numeric', minute: '2-digit', hour12: true }) : '—');
const clock = (iso?: string) => (iso ? new Date(iso).toLocaleTimeString('en-IN', { hour: 'numeric', minute: '2-digit', hour12: true }) : '');
const prettyTo = (p: string) => (p.startsWith('91') && p.length === 12 ? `+91 ${p.slice(2, 7)} ${p.slice(7)}` : `+${p}`);
const pct = (a: number, b: number) => (b ? `${Math.round((a / b) * 1000) / 10}%` : '0%');
const firstLine = (s: string) => String(s || '').replace(/[*_~]/g, '').split('\n').map((x) => x.trim()).filter(Boolean).join(' ');

function downloadCsv(name: string, rows: (string | number)[][]) {
  const csv = rows.map((r) => r.map((c) => `"${String(c ?? '').replace(/"/g, '""')}"`).join(',')).join('\n');
  const url = URL.createObjectURL(new Blob([csv], { type: 'text/csv;charset=utf-8' }));
  const a = document.createElement('a');
  a.href = url; a.download = name; a.click();
  setTimeout(() => URL.revokeObjectURL(url), 5000);
}

const Pill: React.FC<{ cls: string; icon?: string; children: React.ReactNode; title?: string }> = ({ cls, icon, children, title }) => (
  <span className={`wat-pill ${cls}`} title={title}>{icon && <i className={icon.includes(' ') ? icon : `bi ${icon}`} />} {children}</span>
);

const Stat: React.FC<{ tone: string; icon: string; label: string; value: React.ReactNode; sub?: React.ReactNode }> = ({ tone, icon, label, value, sub }) => (
  <div className={`wat-stat ${tone}`}>
    <span className="wat-stat-ic"><i className={`bi ${icon}`} /></span>
    <div>
      <div className="wat-stat-label">{label}</div>
      <div className="wat-stat-row"><b>{value}</b>{sub && <span>{sub}</span>}</div>
    </div>
  </div>
);

const Pager: React.FC<{ page: number; total: number; noun: string; onPage: (p: number) => void }> = ({ page, total, noun, onPage }) => {
  const pages = Math.max(1, Math.ceil(total / PAGE));
  if (!total) return null;
  const nums = Array.from({ length: pages }, (_, i) => i + 1).filter((n) => n === 1 || n === pages || Math.abs(n - page) <= 1);
  return (
    <div className="wat-pager">
      <span>Showing {(page - 1) * PAGE + 1} – {Math.min(page * PAGE, total)} of {total} {noun}</span>
      <div>
        <button type="button" disabled={page <= 1} onClick={() => onPage(page - 1)} aria-label="Previous page"><i className="bi bi-chevron-left" /></button>
        {nums.map((n, i) => (
          <React.Fragment key={n}>
            {i > 0 && n - nums[i - 1] > 1 && <span className="gap">…</span>}
            <button type="button" className={n === page ? 'on' : ''} onClick={() => onPage(n)}>{n}</button>
          </React.Fragment>
        ))}
        <button type="button" disabled={page >= pages} onClick={() => onPage(page + 1)} aria-label="Next page"><i className="bi bi-chevron-right" /></button>
      </div>
    </div>
  );
};

const HeroArt: React.FC<{ tab: Tab }> = ({ tab }) => (
  <div className="wat-art" aria-hidden>
    {tab === 'delivery' ? (
      <div className="wat-art-flow">
        <span className="wat-art-bubble"><i className="fa-brands fa-whatsapp" /></span><i className="wat-art-dash" />
        <span className="wat-art-card sm"><i className="bi bi-list-ul" /></span><i className="wat-art-dash" />
        <i className="bi bi-send-fill wat-art-plane" /><i className="wat-art-dash" />
        <span className="wat-art-bubble people"><i className="bi bi-people-fill" /></span>
      </div>
    ) : (
      <>
        <span className="wat-art-bubble"><i className="fa-brands fa-whatsapp" /></span>
        <span className="wat-art-card">
          <i className="wat-art-bar" /><i className="wat-art-line" /><i className="wat-art-line short" />
          {tab === 'usage' ? <i className="bi bi-gear-fill wat-art-gear" /> : <i className="wat-art-btn" />}
        </span>
        <i className="bi bi-stars wat-art-spark" />
      </>
    )}
  </div>
);

// ── Templates tab ────────────────────────────────────────────────────────────

const TemplatesTab: React.FC<{
  templates: WaTemplate[]; busy: string;
  onNew: () => void; onEdit: (t: WaTemplate) => void; onSend: (t: WaTemplate) => void; onDelete: (t: WaTemplate) => void; onRefresh: () => void;
}> = ({ templates, busy, onNew, onEdit, onSend, onDelete, onRefresh }) => {
  const [q, setQ] = useState('');
  const [status, setStatus] = useState('');
  const [category, setCategory] = useState('');
  const [source, setSource] = useState('');
  const [page, setPage] = useState(1);
  const [viewing, setViewing] = useState<WaTemplate | null>(null);
  const [menu, setMenu] = useState('');
  useEffect(() => { setPage(1); }, [q, status, category, source]);
  useEffect(() => {
    if (!menu) return undefined;
    const close = () => setMenu('');
    window.addEventListener('click', close);
    return () => window.removeEventListener('click', close);
  }, [menu]);

  const count = (k: string) => templates.filter((t) => STATUS_GROUPS[k].includes(t.status)).length;
  const total = templates.length;
  const rows = templates
    .filter((t) => !q || t.name.toLowerCase().includes(q.toLowerCase()) || t.body.toLowerCase().includes(q.toLowerCase()))
    .filter((t) => !status || STATUS_GROUPS[status].includes(t.status))
    .filter((t) => !category || t.category === category)
    .filter((t) => !source || t.source === source)
    .sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime());
  const slice = rows.slice((page - 1) * PAGE, page * PAGE);
  const editable = (t: WaTemplate) => !!t.metaId && t.status !== 'DELETED' && ['REJECTED', 'APPROVED', 'PAUSED'].includes(t.status);
  const exportCsv = () => downloadCsv('whatsapp-templates.csv', [
    ['Name', 'Category', 'Language', 'Status', 'Variables', 'Source', 'Used in', 'Last updated', 'Message'],
    ...rows.map((t) => [t.name, t.category, t.language, t.status, t.shape.bodyVarCount, t.source === 'meta' ? 'Meta' : 'Created here', t.usedBy.join('; '), when(t.updatedAt), t.body]),
  ]);

  return (
    <>
      <div className="wat-stats">
        <Stat tone="violet" icon="bi-stack" label="Total Templates" value={total} />
        <Stat tone="green" icon="bi-check-lg" label="Approved" value={count('approved')} sub={pct(count('approved'), total)} />
        <Stat tone="amber" icon="bi-clock" label="In Review" value={count('review')} sub={pct(count('review'), total)} />
        <Stat tone="red" icon="bi-x-lg" label="Rejected / Paused" value={count('rejected')} sub={pct(count('rejected'), total)} />
      </div>

      <div className="wat-bar">
        <label className="wat-search"><i className="bi bi-search" /><input placeholder="Search by template name or message…" value={q} onChange={(e) => setQ(e.target.value)} /></label>
        <label className="wat-select"><span>Status:</span>
          <select value={status} onChange={(e) => setStatus(e.target.value)}>
            <option value="">All Statuses</option><option value="approved">Approved</option><option value="review">In review</option><option value="rejected">Rejected / paused</option><option value="deleted">Deleted on Meta</option>
          </select>
        </label>
        <label className="wat-select"><span>Category:</span>
          <select value={category} onChange={(e) => setCategory(e.target.value)}>
            <option value="">All Categories</option><option value="MARKETING">Marketing</option><option value="UTILITY">Utility</option><option value="AUTHENTICATION">Authentication</option>
          </select>
        </label>
        <label className="wat-select"><span>Source:</span>
          <select value={source} onChange={(e) => setSource(e.target.value)}>
            <option value="">All Sources</option><option value="meta">Synced from Meta</option><option value="lms">Created here</option>
          </select>
        </label>
        <button type="button" className="wat-btn ghost" onClick={exportCsv}><i className="bi bi-download" /> Export</button>
        <button type="button" className="wat-btn ghost" onClick={onRefresh} disabled={busy === 'sync'}><i className="bi bi-arrow-clockwise" /> Refresh</button>
      </div>

      {!templates.length ? (
        <div className="wat-card wat-empty">No templates yet. <button type="button" className="wat-btn primary" onClick={onNew}>Create your first template</button></div>
      ) : (
        <div className="wat-card wat-table-wrap">
          <table className="wat-table">
            <thead><tr><th>#</th><th>Template name</th><th>Category</th><th>Message (preview)</th><th className="c">Variables</th><th>Source</th><th>Status</th><th>Last updated</th><th className="c">Actions</th></tr></thead>
            <tbody>
              {!slice.length && <tr><td colSpan={9} className="wat-none">No templates match these filters.</td></tr>}
              {slice.map((t, i) => {
                const cat = CATEGORY[t.category] || { label: t.category, cls: 'muted', icon: 'bi-tag' };
                return (
                  <tr key={t._id}>
                    <td className="num">{(page - 1) * PAGE + i + 1}</td>
                    <td>
                      <div className="wat-name"><i className="fa-brands fa-whatsapp" /><div><b>{t.name}</b>
                        <small>{t.language}{t.usedBy.length ? ` · used in ${t.usedBy.length} place${t.usedBy.length === 1 ? '' : 's'}` : ' · not used yet'}{t.shape.urlButtonIndex >= 0 ? ' · personal link' : ''}</small></div></div>
                    </td>
                    <td><Pill cls={cat.cls} icon={cat.icon}>{cat.label}</Pill></td>
                    <td className="wat-preview-cell"><span>{firstLine(t.body)}</span>{t.rejectedReason && <small className="bad">Meta: {t.rejectedReason.replace(/_/g, ' ').toLowerCase()}</small>}</td>
                    <td className="c"><span className="wat-count">{t.shape.bodyVarCount}</span></td>
                    <td>{t.source === 'meta' ? <Pill cls="meta" icon="fa-brands fa-meta">Meta</Pill> : <Pill cls="muted" icon="bi-pencil-square">Created here</Pill>}</td>
                    <td><Badge status={t.status} /></td>
                    <td className="when">{when(t.updatedAt)}</td>
                    <td className="c">
                      <div className="wat-actions">
                        <button type="button" title="Preview" aria-label={`Preview ${t.name}`} onClick={() => setViewing(t)}><i className="bi bi-eye" /></button>
                        <button type="button" title={editable(t) ? 'Edit' : 'Only approved, rejected or paused templates can be edited'} aria-label={`Edit ${t.name}`} disabled={!editable(t)} onClick={() => onEdit(t)}><i className="bi bi-pencil" /></button>
                        <span className="wat-menu-wrap">
                          <button type="button" aria-label={`More for ${t.name}`} onClick={(e) => { e.stopPropagation(); setMenu(menu === t._id ? '' : t._id); }}><i className="bi bi-three-dots-vertical" /></button>
                          {menu === t._id && (
                            <span className="wat-menu" role="menu">
                              <button type="button" role="menuitem" disabled={t.status !== 'APPROVED'} onClick={() => onSend(t)}><i className="bi bi-send" /> Send</button>
                              <button type="button" role="menuitem" onClick={() => navigator.clipboard?.writeText(t.name)}><i className="bi bi-clipboard" /> Copy name</button>
                              <button type="button" role="menuitem" className="danger" onClick={() => onDelete(t)}><i className="bi bi-trash" /> Delete</button>
                            </span>
                          )}
                        </span>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
          <Pager page={page} total={rows.length} noun="templates" onPage={setPage} />
        </div>
      )}

      {viewing && (
        <Modal title={viewing.name} onClose={() => setViewing(null)}>
          <div className="wat-view-meta">
            <Pill cls={(CATEGORY[viewing.category] || { cls: 'muted' }).cls}>{(CATEGORY[viewing.category] || { label: viewing.category }).label}</Pill>
            <Badge status={viewing.status} />
            <span>{viewing.language} · {viewing.shape.bodyVarCount} variable{viewing.shape.bodyVarCount === 1 ? '' : 's'}</span>
          </div>
          <Preview t={viewing as unknown as WaTemplateInput} values={viewing.bodyExamples} />
          {viewing.usedBy.length > 0 && <div style={hint}>Used for: {viewing.usedBy.join(', ')}</div>}
          <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end', marginTop: 14 }}>
            <button style={btn()} onClick={() => setViewing(null)}>Close</button>
            <button style={btn('primary')} disabled={viewing.status !== 'APPROVED'} onClick={() => { const t = viewing; setViewing(null); onSend(t); }}>Send</button>
          </div>
        </Modal>
      )}
    </>
  );
};

// ── Where used tab ───────────────────────────────────────────────────────────

const MODULE_ICON: [RegExp, string][] = [
  [/lead|crm/i, 'bi-person-lines-fill'], [/placement|drive|hiring|job/i, 'bi-briefcase-fill'], [/exam|assess|battle|hackathon/i, 'bi-calendar-check'],
  [/class|live/i, 'bi-display'], [/batch|course|student|attendance/i, 'bi-megaphone-fill'], [/otp|login|auth|sign/i, 'bi-shield-lock-fill'],
  [/remind|follow/i, 'bi-bell-fill'], [/pay|fee/i, 'bi-currency-rupee'], [/career|passport/i, 'bi-compass-fill'],
];
const moduleIcon = (m: string) => MODULE_ICON.find(([rx]) => rx.test(m))?.[1] || 'bi-grid-fill';

const UsageTab: React.FC<{
  templates: WaTemplate[]; usage: WaPurpose[]; compat: Record<string, Record<string, WaCompat>>; busy: string;
  onAssign: (p: WaPurpose, id: string) => void; onCreateFor: (p: WaPurpose) => void;
}> = ({ templates, usage, compat, busy, onAssign, onCreateFor }) => {
  const [q, setQ] = useState('');
  const [mod, setMod] = useState('');
  const [state, setState] = useState('');
  const [open, setOpen] = useState<Record<string, boolean>>({});
  const [editing, setEditing] = useState('');

  const info = (p: WaPurpose) => {
    const current = p.assigned ? templates.find((t) => t.name === p.assigned!.name && t.language === p.assigned!.language) : undefined;
    const c = current ? compat[p.key]?.[current._id] : undefined;
    const st: 'in_use' | 'not_set' | 'issue' = !p.assigned ? 'not_set' : !current || (c && !c.ok) || current.status !== 'APPROVED' ? 'issue' : 'in_use';
    const why = !p.assigned ? '' : !current ? 'Template not found — Sync from Meta or pick another'
      : current.status !== 'APPROVED' ? `Template is ${(STATUS[current.status]?.label || current.status).toLowerCase()}` : c && !c.ok ? c.errors[0] : '';
    return { current, st, why, warnings: c?.warnings || [] };
  };
  const modules = Array.from(new Set(usage.map((u) => u.module)));
  const all = usage.map((p) => ({ p, ...info(p) }));
  const usedTemplates = templates.filter((t) => t.usedBy.length > 0).length;
  const shown = all.filter(({ p, current, st }) =>
    (!mod || p.module === mod) && (!state || st === state)
    && (!q || `${p.label} ${p.help} ${current?.name || ''} ${p.module}`.toLowerCase().includes(q.toLowerCase())));
  const isOpen = (m: string) => open[m] ?? (!!q || !!state || modules.indexOf(m) === 0);

  return (
    <>
      <div className="wat-stats">
        <Stat tone="violet" icon="bi-stack" label="Total Templates" value={templates.length} />
        <Stat tone="green" icon="bi-check-lg" label="In Use" value={usedTemplates} sub={`by ${all.filter((x) => x.st === 'in_use').length} system messages`} />
        <Stat tone="amber" icon="bi-clock" label="Not In Use" value={templates.length - usedTemplates} sub={`${all.filter((x) => x.st === 'not_set').length} messages have no template`} />
        <Stat tone="red" icon="bi-exclamation-circle" label="With Issues" value={all.filter((x) => x.st === 'issue').length} sub="need a fix" />
      </div>
      <p className="wat-lead">Each automatic message below (OTP, reminders, results…) goes out as the template you choose. Only approved templates whose values and buttons fit can be picked.</p>
      <div className="wat-bar">
        <label className="wat-search"><i className="bi bi-search" /><input placeholder="Search message or template (e.g. OTP, exam, reminder)…" value={q} onChange={(e) => setQ(e.target.value)} /></label>
        <label className="wat-select"><i className="bi bi-stack" />
          <select value={mod} onChange={(e) => setMod(e.target.value)}><option value="">All Modules</option>{modules.map((m) => <option key={m} value={m}>{m}</option>)}</select>
        </label>
        <label className="wat-select"><i className="bi bi-funnel" />
          <select value={state} onChange={(e) => setState(e.target.value)}><option value="">All Status</option><option value="in_use">In use</option><option value="not_set">No template</option><option value="issue">With issues</option></select>
        </label>
        <button type="button" className="wat-btn ghost" onClick={() => setOpen(Object.fromEntries(modules.map((m) => [m, true])))}><i className="bi bi-arrows-angle-expand" /> Expand All</button>
        <button type="button" className="wat-btn ghost" onClick={() => setOpen(Object.fromEntries(modules.map((m) => [m, false])))}><i className="bi bi-arrows-angle-contract" /> Collapse All</button>
      </div>

      <div className="wat-groups">
        {modules.map((m) => {
          const items = shown.filter((x) => x.p.module === m);
          if (!items.length) return null;
          const inUse = items.filter((x) => x.st === 'in_use').length;
          const issues = items.filter((x) => x.st === 'issue').length;
          const unset = items.filter((x) => x.st === 'not_set').length;
          const o = isOpen(m);
          return (
            <section key={m} className="wat-card wat-group">
              <button type="button" className="wat-group-head" onClick={() => setOpen({ ...open, [m]: !o })} aria-expanded={o}>
                <span className="wat-group-ic"><i className={`bi ${moduleIcon(m)}`} /></span>
                <span className="wat-group-title"><b>{m}</b> <small>({items.length} message{items.length === 1 ? '' : 's'})</small></span>
                {issues > 0 ? <Pill cls="red" icon="bi-exclamation-triangle">{issues} With Issues</Pill>
                  : unset > 0 ? <Pill cls="amber" icon="bi-clock">{unset} Not Set</Pill>
                    : <Pill cls="green" icon="bi-check-circle">{inUse} In Use</Pill>}
                <i className={`bi ${o ? 'bi-chevron-up' : 'bi-chevron-down'} wat-chev`} />
              </button>
              {o && (
                <table className="wat-table inner">
                  <thead><tr><th>System message</th><th>Template</th><th>Message (preview)</th><th>Values it fills</th><th>Status</th><th /></tr></thead>
                  <tbody>
                    {items.map(({ p, current, st, why, warnings }) => {
                      const cmap = compat[p.key] || {};
                      const usable = templates.filter((t) => cmap[t._id]?.ok);
                      return (
                        <React.Fragment key={p.key}>
                          <tr>
                            <td><b>{p.label}</b><small className="sub">{p.help}</small></td>
                            <td>{current ? <span className="wat-name sm"><i className="fa-brands fa-whatsapp" /><b>{current.name}</b></span> : p.assigned ? <span className="bad">{p.assigned.name}</span> : <span className="muted">— Not set —</span>}</td>
                            <td className="wat-preview-cell"><span>{current ? firstLine(current.body) : '—'}</span></td>
                            <td className="vals">{p.variables.map((v, i) => <code key={i}>{`{{${i + 1}}}`} {v}</code>)}</td>
                            <td>
                              {st === 'in_use' ? <Pill cls="green" icon="bi-check-circle">In Use</Pill> : st === 'issue' ? <Pill cls="red" icon="bi-exclamation-triangle" title={why}>Issue</Pill> : <Pill cls="amber" icon="bi-clock">Not Set</Pill>}
                              {why && <small className="sub bad">{why}</small>}
                              {warnings.map((w, i) => <small key={i} className="sub warn">⚠ {w}</small>)}
                            </td>
                            <td className="c">
                              <button type="button" className="wat-btn ghost sm" onClick={() => setEditing(editing === p.key ? '' : p.key)}>{editing === p.key ? 'Done' : 'Change'}</button>
                            </td>
                          </tr>
                          {editing === p.key && (
                            <tr className="wat-edit-row"><td colSpan={6}>
                              <div className="wat-edit">
                                <select value={current?._id || ''} disabled={busy === p.key} onChange={(e) => onAssign(p, e.target.value)} aria-label={`Template for ${p.label}`}>
                                  <option value="">{p.assigned && !current ? `${p.assigned.name} (${p.assigned.language}) — set manually` : '— Not set —'}</option>
                                  {templates.filter((t) => t.status !== 'DELETED').map((t) => (
                                    <option key={t._id} value={t._id} disabled={!cmap[t._id]?.ok && current?._id !== t._id}>
                                      {cmap[t._id]?.ok ? '✓ ' : '✕ '}{t.name} ({t.language}){!cmap[t._id]?.ok ? ` — ${cmap[t._id]?.errors?.[0] || ''}` : ''}
                                    </option>
                                  ))}
                                </select>
                                {!usable.length && <button type="button" className="wat-btn ghost sm" onClick={() => onCreateFor(p)}>+ Create a template for this</button>}
                                {p.buttonParam && <small className="sub">Personal link: {p.buttonParam}</small>}
                              </div>
                            </td></tr>
                          )}
                        </React.Fragment>
                      );
                    })}
                  </tbody>
                </table>
              )}
            </section>
          );
        })}
        {!shown.length && <div className="wat-card wat-empty">Nothing matches these filters.</div>}
      </div>
    </>
  );
};

// ── Delivery log tab ─────────────────────────────────────────────────────────

/**
 * Every template send and what Meta later reported. Meta answering a send means "queued"; delivery is
 * decided after, and reported to our webhook — so a row that stays "Queued" for minutes means the
 * report never came (the webhook is not subscribed to message statuses in Meta).
 */
const DeliveryLog: React.FC<{ templates: WaTemplate[] }> = ({ templates }) => {
  const [rows, setRows] = useState<WaMessage[]>([]);
  const [loaded, setLoaded] = useState(false);
  const [q, setQ] = useState('');
  const [status, setStatus] = useState<'' | 'failed' | 'delivered' | 'read' | 'pending'>('');
  const [source, setSource] = useState('');
  const [days, setDays] = useState(7);
  const [page, setPage] = useState(1);
  const [summary, setSummary] = useState<WaDeliverySummary | null>(null);
  const [tick, setTick] = useState(0);
  const bodyOf = useMemo(() => new Map(templates.map((t) => [t.name, firstLine(t.body)])), [templates]);

  useEffect(() => { setPage(1); }, [q, status, source, days]);
  useEffect(() => {
    let alive = true;
    const load = () => {
      waTemplateApi.messages({ q: q.trim() || undefined, status, source: source || undefined, days, limit: 1000 })
        .then((r) => { if (alive) { setRows(r); setLoaded(true); } }).catch(() => { if (alive) setLoaded(true); });
      waTemplateApi.messagesSummary(days).then((s) => { if (alive) setSummary(s); }).catch(() => undefined);
    };
    const t = setTimeout(load, q ? 300 : 0);
    const id = setInterval(load, 15000);
    return () => { alive = false; clearTimeout(t); clearInterval(id); };
  }, [q, status, source, days, tick]);

  const stale = (m: WaMessage) => m.status === 'accepted' && Date.now() - new Date(m.createdAt).getTime() > 5 * 60 * 1000;
  const trend = summary && summary.prevTotal ? Math.round(((summary.total - summary.prevTotal) / summary.prevTotal) * 100) : null;
  const slice = rows.slice((page - 1) * PAGE, page * PAGE);
  const period = days === 1 ? 'last 24 hours' : `last ${days} days`;
  const exportCsv = () => downloadCsv('whatsapp-delivery-log.csv', [
    ['Sent at', 'Recipient', 'Template', 'Source', 'Status', 'Status at', 'Reason', 'Code'],
    ...rows.map((m) => [when(m.createdAt), `+${m.to}`, m.templateName, m.source, m.status, when(m.statusAt), m.reason || '', m.errorCode || '']),
  ]);

  return (
    <>
      <div className="wat-stats">
        <Stat tone="blue" icon="bi-send-fill" label="Total Sends" value={summary?.total ?? '—'}
          sub={trend === null ? period : <span className={trend >= 0 ? 'up' : 'down'}><i className={`bi ${trend >= 0 ? 'bi-arrow-up' : 'bi-arrow-down'}`} />{Math.abs(trend)}% vs previous</span>} />
        <Stat tone="green" icon="bi-check-lg" label="Delivered" value={summary?.delivered ?? '—'} sub={summary ? `${pct(summary.delivered, summary.total)} delivery rate` : ''} />
        <Stat tone="sky" icon="bi-check2-all" label="Read" value={summary?.read ?? '—'} sub={summary ? `${pct(summary.read, summary.delivered)} of delivered` : ''} />
        <Stat tone="red" icon="bi-exclamation-lg" label="Failed" value={summary?.failed ?? '—'} sub={summary ? `${pct(summary.failed, summary.total)} failure rate` : ''} />
      </div>

      {summary && summary.failed > 0 && (
        <div className="wat-why">
          <div className="wat-why-head">
            <i className="bi bi-exclamation-octagon-fill" />
            <div>
              <b>Why {summary.failed} of {summary.total} messages failed ({period})</b>
              <span>Meta accepted these, then could not deliver them. Here is what each reason means and what to do.</span>
            </div>
            <button type="button" className="wat-btn ghost sm" onClick={() => setStatus('failed')}>Show failed only</button>
          </div>
          <div className="wat-why-grid">
            {summary.reasons.map((r, i) => (
              <div key={i} className="wat-why-card">
                <div className="wat-why-top"><b>{r.count}×</b>{r.code && <code>code {r.code}</code>}</div>
                <p>{r.reason}</p>
                {r.advice && <p className="fix"><i className="bi bi-lightbulb-fill" /> {r.advice}</p>}
                {r.templates.length > 0 && <small>Template{r.templates.length === 1 ? '' : 's'}: {r.templates.join(', ')}</small>}
              </div>
            ))}
          </div>
          {summary.badNumbers > 0 && (
            <p className="wat-why-note"><i className="bi bi-telephone-x" /> {summary.badNumbers} failed number{summary.badNumbers === 1 ? ' is' : 's are'} not a valid Indian mobile (+91 and 10 digits). Fix them on the lead.</p>
          )}
        </div>
      )}

      <div className="wat-bar">
        <label className="wat-search"><i className="bi bi-search" /><input placeholder="Search by template or phone number…" value={q} onChange={(e) => setQ(e.target.value)} /></label>
        <label className="wat-select"><span>Status:</span>
          <select value={status} onChange={(e) => setStatus(e.target.value as any)}>
            <option value="">All Statuses</option><option value="delivered">Delivered (incl. read)</option><option value="read">Read</option><option value="pending">Queued / sent</option><option value="failed">Failed</option>
          </select>
        </label>
        <label className="wat-select"><span>Source:</span>
          <select value={source} onChange={(e) => setSource(e.target.value)}>
            <option value="">All Sources</option><option value="broadcast">Broadcast</option><option value="system">Automatic</option><option value="test">Chat / test</option>
          </select>
        </label>
        <label className="wat-select"><i className="bi bi-calendar3" />
          <select value={days} onChange={(e) => setDays(Number(e.target.value))}>
            <option value={1}>Last 24 hours</option><option value={7}>Last 7 days</option><option value={30}>Last 30 days</option><option value={90}>Last 90 days</option>
          </select>
        </label>
        <button type="button" className="wat-btn ghost" onClick={exportCsv} disabled={!rows.length}><i className="bi bi-download" /> Export</button>
        <button type="button" className="wat-btn ghost" onClick={() => setTick(tick + 1)}><i className="bi bi-arrow-clockwise" /> Refresh</button>
      </div>

      {!loaded ? <div className="wat-card wat-empty">Loading…</div> : !rows.length ? (
        <div className="wat-card wat-empty">No messages match. Login codes (OTP), broadcasts, chat templates and automatic messages are all listed here.</div>
      ) : (
        <div className="wat-card wat-table-wrap">
          <table className="wat-table">
            <thead><tr><th>#</th><th>Template / message</th><th>Source</th><th>Sent at</th><th>Recipient</th><th>Status</th><th>Details</th><th className="c">Actions</th></tr></thead>
            <tbody>
              {slice.map((m, i) => {
                const s = DELIVERY_STATUS[m.status];
                const src = SOURCE[m.source] || { label: m.source, cls: 'muted', icon: 'bi-dot' };
                return (
                  <tr key={m._id}>
                    <td className="num">{(page - 1) * PAGE + i + 1}</td>
                    <td><div className="wat-name"><i className="fa-brands fa-whatsapp" /><div><b>{m.templateName}</b>{bodyOf.get(m.templateName) && <small>{bodyOf.get(m.templateName)}</small>}</div></div></td>
                    <td><Pill cls={src.cls} icon={src.icon}>{src.label}</Pill></td>
                    <td className="when">{when(m.createdAt)}</td>
                    <td className="when">{prettyTo(m.to)}</td>
                    <td><Pill cls={s.cls} icon={s.icon}>{s.label}</Pill></td>
                    <td className="wat-detail">
                      {m.status === 'failed' ? <span className="bad"><i className="bi bi-exclamation-circle" /> {m.reason}{m.errorCode ? ` (code ${m.errorCode})` : ''}</span>
                        : m.status === 'read' ? <span><i className="bi bi-eye" /> Read at {clock(m.statusAt)}</span>
                          : m.status === 'delivered' ? <span><i className="bi bi-check2" /> Delivered at {clock(m.statusAt)}</span>
                            : stale(m) ? <span className="warn">No report from Meta yet — check the webhook is subscribed to message statuses.</span>
                              : <span className="muted">Waiting for Meta…</span>}
                    </td>
                    <td className="c">
                      <div className="wat-actions">
                        <Link to={`/whatsapp-inbox?phone=${m.to}`} title="Open the chat" aria-label={`Open chat with ${prettyTo(m.to)}`}><i className="bi bi-chat-left-text" /></Link>
                        <button type="button" title="Copy number" aria-label="Copy number" onClick={() => navigator.clipboard?.writeText(`+${m.to}`)}><i className="bi bi-clipboard" /></button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
          <Pager page={page} total={rows.length} noun="delivery logs" onPage={setPage} />
          {rows.length >= 1000 && <p className="wat-foot">Showing the newest 1,000. Narrow the period or filters to see older ones.</p>}
        </div>
      )}
    </>
  );
};

// ── Sent history tab ─────────────────────────────────────────────────────────

/** Per broadcast: say what it was for, and archive leads that replies to a non-sales message created. */
const PurposeRow: React.FC<{ b: WaBroadcast; onChanged: () => void }> = ({ b, onChanged }) => {
  const [leads, setLeads] = useState<WaReplyLead[] | null>(null);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState('');
  const nonSales = !!b.purpose && b.purpose !== 'sales';
  useEffect(() => {
    if (!nonSales && b.purpose) return;
    waTemplateApi.replyLeads(b._id).then(setLeads).catch(() => setLeads([]));
  }, [b._id, b.purpose, nonSales]);
  const choose = async (p: WaBroadcastPurpose) => {
    setBusy(true); setMsg('');
    try { const r = await waTemplateApi.setPurpose(b._id, p); setLeads(r.leads); onChanged(); } catch (e) { setMsg(errMsg(e)); }
    setBusy(false);
  };
  const archive = async () => {
    if (!leads?.length || !window.confirm(`Archive the ${leads.length} lead${leads.length === 1 ? '' : 's'} created when people replied to this ${PURPOSE_LOOK[b.purpose as WaBroadcastPurpose]?.label.toLowerCase() || ''} message?\n\nThey can be restored from Lead Archive.`)) return;
    setBusy(true);
    try { const r = await waTemplateApi.archiveReplyLeads(b._id); setMsg(`Archived ${r.archived} lead${r.archived === 1 ? '' : 's'}.`); setLeads([]); } catch (e) { setMsg(errMsg(e)); }
    setBusy(false);
  };
  return (
    <div className="wat-bcast-purpose">
      <label className="wat-select"><span>For:</span>
        <select value={b.purpose || ''} disabled={busy} onChange={(e) => e.target.value && choose(e.target.value as WaBroadcastPurpose)} aria-label="What this broadcast was for">
          {!b.purpose && <option value="">Not set (replies treated as leads)</option>}
          {(Object.keys(PURPOSE_LOOK) as WaBroadcastPurpose[]).map((k) => <option key={k} value={k}>{PURPOSE_LOOK[k].label}</option>)}
        </select>
      </label>
      <small className="sub">{b.purpose ? PURPOSE_LOOK[b.purpose].reply : 'Sent before this choice existed. If it was hiring, wishes or an update, set it so their replies stop going to the bot.'}</small>
      {leads && leads.length > 0 && (
        <div className="wat-bcast-leads">
          <i className="bi bi-exclamation-triangle-fill" />
          <span><b>{leads.length} lead{leads.length === 1 ? ' was' : 's were'} created</b> when people replied: {leads.slice(0, 4).map((l) => l.name).join(', ')}{leads.length > 4 ? '…' : ''}</span>
          {nonSales && <button type="button" className="wat-btn ghost sm" disabled={busy} onClick={archive}>Archive them</button>}
        </div>
      )}
      {msg && <small className="sub">{msg}</small>}
    </div>
  );
};

const HistoryTab: React.FC<{ history: WaBroadcast[]; onChanged: () => void }> = ({ history, onChanged }) => {
  if (!history.length) return <div className="wat-card wat-empty">Nothing sent yet. Use "Send" on an approved template.</div>;
  return (
    <div className="wat-history">
      {history.map((b) => {
        const o = b.outcome || { delivered: 0, read: 0, failed: 0, pending: 0 };
        const failed = Math.max(o.failed, b.failed);
        const base = Math.max(b.total, 1);
        return (
          <div key={b._id} className="wat-card wat-bcast">
            <div className="wat-bcast-top">
              <div className="wat-name"><i className="fa-brands fa-whatsapp" /><div><b>{b.templateName}</b><small>{b.audience} · {when(b.createdAt)}</small></div></div>
              {b.purpose && <Pill cls={b.purpose === 'sales' ? 'blue' : 'teal'} icon={PURPOSE_LOOK[b.purpose].icon}>{PURPOSE_LOOK[b.purpose].label}</Pill>}
              {b.status === 'running' ? <Pill cls="amber" icon="bi-hourglass-split">Sending… {b.sent + b.failed}/{b.total}</Pill> : b.status === 'failed' ? <Pill cls="red" icon="bi-x-circle">Stopped</Pill> : <Pill cls="green" icon="bi-check-circle">Finished</Pill>}
            </div>
            <div className="wat-bcast-bar" aria-hidden>
              <i className="read" style={{ width: `${(o.read / base) * 100}%` }} />
              <i className="deliv" style={{ width: `${((o.delivered - o.read) / base) * 100}%` }} />
              <i className="fail" style={{ width: `${(failed / base) * 100}%` }} />
            </div>
            <div className="wat-bcast-nums">
              <span><b>{b.total}</b> to send</span>
              <span className="g"><b>{o.delivered}</b> delivered</span>
              <span className="s"><b>{o.read}</b> read</span>
              <span className="r"><b>{failed}</b> failed</span>
              {o.pending > 0 && <span><b>{o.pending}</b> waiting for Meta</span>}
            </div>
            {failed > b.failed && <small className="sub">Meta accepted all of them, then reported {o.failed} as not delivered. See the Delivery log for why.</small>}
            <PurposeRow b={b} onChanged={onChanged} />
            {b.failures?.length > 0 && (
              <details className="wat-bcast-fail"><summary>Refused at send time ({b.failures.length})</summary>
                {b.failures.map((f, i) => <div key={i}>{f.phone}: {f.error}</div>)}
              </details>
            )}
          </div>
        );
      })}
    </div>
  );
};

const SUBTITLE: Record<Tab, string> = {
  templates: 'Create, manage and track WhatsApp templates submitted to Meta for approval, and use them across the platform.',
  usage: 'See which template each automatic message sends — OTPs, reminders, results and more.',
  history: 'Every Send-to-many broadcast, and what Meta reported for its messages.',
  delivery: 'Every message sent with a template, and whether it was delivered, read or failed.',
};

const WhatsAppTemplates: React.FC = () => {
  const [tab, setTab] = useState<Tab>('templates');
  const [templates, setTemplates] = useState<WaTemplate[]>([]);
  const [usage, setUsage] = useState<WaPurpose[]>([]);
  const [compat, setCompat] = useState<Record<string, Record<string, WaCompat>>>({});
  const [history, setHistory] = useState<WaBroadcast[]>([]);
  const [conn, setConn] = useState<{ wabaId: string; source: string } | null>(null);
  const [wabaInput, setWabaInput] = useState('');
  const [showConn, setShowConn] = useState(false);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState('');
  const [toast, setToast] = useState<{ kind: 'ok' | 'err'; text: string } | null>(null);
  const [editor, setEditor] = useState<{ initial?: WaTemplate | null; draft?: WaTemplateInput | null } | null>(null);
  const [sending, setSending] = useState<WaTemplate | null>(null);

  const say = (kind: 'ok' | 'err', text: string) => { setToast({ kind, text }); if (kind === 'ok') setTimeout(() => setToast(null), 6000); };

  const loadAll = async () => {
    try {
      const c = await waTemplateApi.connection();
      setConn(c); setWabaInput(c.wabaId);
      if (!c.wabaId) { setShowConn(true); setLoading(false); return; }
      const [t, u, cp] = await Promise.all([waTemplateApi.list(), waTemplateApi.usage(), waTemplateApi.compatibility()]);
      setTemplates(t); setUsage(u); setCompat(cp);
    } catch (e) { say('err', errMsg(e, 'Could not load templates')); }
    setLoading(false);
  };
  useEffect(() => { loadAll(); }, []);

  const loadHistory = () => waTemplateApi.broadcasts().then(setHistory).catch(() => {});
  useEffect(() => {
    if (tab !== 'history') return undefined;
    loadHistory();
    const id = setInterval(loadHistory, 6000);
    return () => clearInterval(id);
  }, [tab]);

  const saveConn = async () => {
    setBusy('conn');
    try {
      await waTemplateApi.saveConnection(wabaInput.trim());
      const r = await waTemplateApi.testConnection();
      say('ok', `Connected to "${r.name || r.wabaId}". Pulling your existing templates…`);
      await waTemplateApi.sync();
      setShowConn(false);
      await loadAll();
    } catch (e) { say('err', errMsg(e, 'Could not connect')); }
    setBusy('');
  };

  const sync = async () => {
    setBusy('sync');
    try {
      const r = await waTemplateApi.sync();
      say('ok', `Synced ${r.total} template${r.total === 1 ? '' : 's'} from Meta (${r.created} new).`);
      await loadAll();
    } catch (e) { say('err', errMsg(e, 'Sync failed')); }
    setBusy('');
  };

  const remove = async (t: WaTemplate) => {
    if (!window.confirm(`Delete "${t.name}" (${t.language}) from Meta and the LMS? Meta does not let you reuse this name for 30 days.`)) return;
    try { await waTemplateApi.remove(t._id); say('ok', `Deleted ${t.name}.`); await loadAll(); }
    catch (e) { say('err', errMsg(e, 'Delete failed')); }
  };

  const assign = async (p: WaPurpose, templateId: string) => {
    setBusy(p.key);
    try {
      const r = await waTemplateApi.assign(p.key, templateId || null);
      say('ok', templateId ? `${p.label} now sends this template.${r.warnings.length ? ' Note: ' + r.warnings.join(' ') : ''}` : `${p.label} unassigned.`);
      await loadAll();
    } catch (e) { say('err', errMsg(e, 'Could not assign')); }
    setBusy('');
  };

  const TABS: [Tab, string][] = [['templates', `Templates (${templates.length})`], ['usage', 'Where Used'], ['history', 'Sent History'], ['delivery', 'Delivery Log']];

  return (
    <div className="wat">
      <div className="wat-hero">
        <div className="wat-hero-main">
          <span className="wat-logo"><i className="fa-brands fa-whatsapp" /></span>
          <div>
            <h1>WhatsApp Templates</h1>
            <p>{SUBTITLE[tab]}</p>
          </div>
        </div>
        <HeroArt tab={tab} />
        <div className="wat-hero-actions">
          <button type="button" className="wat-btn ghost icon" title="WhatsApp Business Account connection" aria-label="Connection" onClick={() => setShowConn((x) => !x)}><i className="bi bi-gear" /></button>
          {conn?.wabaId && <button type="button" className="wat-btn ghost" disabled={busy === 'sync'} onClick={sync}><i className={`bi bi-arrow-repeat${busy === 'sync' ? ' spin' : ''}`} /> {busy === 'sync' ? 'Syncing…' : 'Sync from Meta'}</button>}
          {conn?.wabaId && <button type="button" className="wat-btn primary" onClick={() => setEditor({})}><i className="bi bi-plus-lg" /> New Template</button>}
        </div>
        {conn?.wabaId && (
          <nav className="wat-tabs" role="tablist">
            {TABS.map(([k, l]) => <button key={k} role="tab" aria-selected={tab === k} className={tab === k ? 'on' : ''} onClick={() => setTab(k)}>{l}</button>)}
          </nav>
        )}
      </div>

      {toast && (
        <div className={`wat-toast ${toast.kind}`}>
          <span>{toast.text}</span><button type="button" onClick={() => setToast(null)} aria-label="Dismiss">✕</button>
        </div>
      )}

      {showConn && (
        <div className="wat-card">
          <div style={{ fontWeight: 800 }}>Connect your WhatsApp Business Account</div>
          <div style={hint}>Meta Business Manager → Business settings → Accounts → WhatsApp accounts → select the account → copy the <b>Account ID</b>. The access token already set for sending messages is reused; it also needs the <code>whatsapp_business_management</code> permission.</div>
          <div style={{ display: 'flex', gap: 8, marginTop: 10, flexWrap: 'wrap' }}>
            <input style={{ ...input, maxWidth: 300 }} value={wabaInput} placeholder="WhatsApp Business Account ID" onChange={(e) => setWabaInput(e.target.value.replace(/\D/g, ''))} />
            <button style={btn('primary')} disabled={!wabaInput || busy === 'conn'} onClick={saveConn}>{busy === 'conn' ? 'Checking…' : 'Save & test'}</button>
          </div>
          {conn?.source === 'lead_source' && <div style={hint}>Currently using the ID from CRM → Lead Sources → WhatsApp.</div>}
        </div>
      )}

      {loading ? <div className="wat-card wat-empty">Loading…</div> : conn?.wabaId ? (
        <>
          {tab === 'templates' && <TemplatesTab templates={templates} busy={busy} onNew={() => setEditor({})} onEdit={(t) => setEditor({ initial: t })} onSend={setSending} onDelete={remove} onRefresh={loadAll} />}
          {tab === 'usage' && <UsageTab templates={templates} usage={usage} compat={compat} busy={busy} onAssign={assign} onCreateFor={(p) => setEditor({ draft: draftForPurpose(p) })} />}
          {tab === 'delivery' && <DeliveryLog templates={templates} />}
          {tab === 'history' && <HistoryTab history={history} onChanged={loadHistory} />}
        </>
      ) : null}

      {editor && <Editor initial={editor.initial} draft={editor.draft} onClose={() => setEditor(null)} onSaved={(m) => { setEditor(null); say('ok', m); loadAll(); }} />}
      {sending && <SendModal t={sending} onClose={() => setSending(null)} onDone={(m) => { setSending(null); say('ok', m); if (m.startsWith('Broadcast')) setTab('history'); else if (m.startsWith('Accepted')) setTab('delivery'); }} />}
    </div>
  );
};

export default WhatsAppTemplates;
