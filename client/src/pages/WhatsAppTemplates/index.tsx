import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  waTemplateApi, errMsg, WaTemplate, WaTemplateInput, WaPurpose, WaCompat, WaBroadcast, WaButton, WaCategory,
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
    title: 'OTP code', input: { name: 'login_otp', language: 'en', category: 'AUTHENTICATION', auth: { securityRecommendation: true, codeExpiryMinutes: 10 } },
  },
];

/** A draft suited to a system use — the right number of variables and a button slot if it has one. */
function draftForPurpose(p: WaPurpose): WaTemplateInput {
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
    header: { format: (['NONE', 'TEXT', 'IMAGE'].includes(initial.header?.format) ? initial.header.format : 'NONE') as any, text: initial.header?.text, imageUrl: initial.header?.imageUrl },
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
                  <option value="NONE">None</option><option value="TEXT">Text</option><option value="IMAGE">Image</option>
                </select>
                {t.header?.format === 'TEXT' && <input style={input} maxLength={60} placeholder="Class reminder" value={t.header.text || ''} onChange={(e) => set({ header: { ...t.header!, text: e.target.value } })} />}
                {t.header?.format === 'IMAGE' && <input style={input} placeholder="https://… public JPEG/PNG" value={t.header.imageUrl || ''} onChange={(e) => set({ header: { ...t.header!, imageUrl: e.target.value.trim() } })} />}
              </div>
              {t.header?.format === 'IMAGE' && <div style={hint}>Meta reviews this image as the sample, and it is sent as the default picture when a message has no image of its own.</div>}

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

const SendModal: React.FC<{ t: WaTemplate; onClose: () => void; onDone: (msg: string) => void }> = ({ t, onClose, onDone }) => {
  const [mode, setMode] = useState<'test' | 'broadcast'>('test');
  const [phone, setPhone] = useState('');
  const [values, setValues] = useState<string[]>(() => Array.from({ length: t.shape.bodyVarCount }, (_, i) => t.bodyExamples?.[i] || ''));
  const [buttonParam, setButtonParam] = useState('');
  const [audience, setAudience] = useState<'paste' | 'batch'>('paste');
  const [phones, setPhones] = useState('');
  const [batchId, setBatchId] = useState('');
  const [batches, setBatches] = useState<{ _id: string; name: string }[]>([]);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState('');
  const isAuth = t.category === 'AUTHENTICATION';
  const hasBtn = t.shape.urlButtonIndex >= 0;

  useEffect(() => { if (mode === 'broadcast' && !batches.length) waTemplateApi.batches().then(setBatches).catch(() => {}); }, [mode, batches.length]);

  const go = async () => {
    setBusy(true); setErr('');
    try {
      if (mode === 'test') {
        await waTemplateApi.sendTest(t._id, phone, values, hasBtn ? buttonParam : undefined);
        onDone(`Test sent to ${phone}.`);
      } else {
        if (!window.confirm('Send this template to every recipient now? This cannot be undone.')) { setBusy(false); return; }
        const b = await waTemplateApi.broadcast(t._id, { phones: audience === 'paste' ? phones : undefined, batchId: audience === 'batch' ? batchId : undefined, values, buttonParam: hasBtn ? buttonParam : undefined });
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
        </>
      ) : (
        <>
          <label style={label}>Recipients</label>
          <div style={{ display: 'flex', gap: 14, fontSize: 13 }}>
            <label><input type="radio" checked={audience === 'paste'} onChange={() => setAudience('paste')} /> Paste numbers</label>
            <label><input type="radio" checked={audience === 'batch'} onChange={() => setAudience('batch')} /> Students of a batch</label>
          </div>
          {audience === 'paste' ? (
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
        <button style={btn('primary')} disabled={busy} onClick={go}>{busy ? 'Sending…' : mode === 'test' ? 'Send test' : 'Send now'}</button>
      </div>
    </Modal>
  );
};

// ── Page ─────────────────────────────────────────────────────────────────────

type Tab = 'templates' | 'usage' | 'history';

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
  const [filter, setFilter] = useState('');
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
    if (tab !== 'history') return;
    loadHistory();
    const id = setInterval(loadHistory, 4000);
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

  const shown = useMemo(() => templates.filter((t) => !filter || t.name.includes(filter.toLowerCase()) || t.status === filter), [templates, filter]);
  const modules = useMemo(() => Array.from(new Set(usage.map((u) => u.module))), [usage]);
  const counts = useMemo(() => ({
    approved: templates.filter((t) => t.status === 'APPROVED').length,
    pending: templates.filter((t) => ['PENDING', 'IN_APPEAL'].includes(t.status)).length,
    rejected: templates.filter((t) => ['REJECTED', 'PAUSED', 'DISABLED'].includes(t.status)).length,
  }), [templates]);

  return (
    <div style={{ padding: '20px 16px', maxWidth: 1180, margin: '0 auto', color: C.text }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 12, flexWrap: 'wrap' }}>
        <div>
          <h1 style={{ margin: 0, fontSize: 22 }}><i className="fa-brands fa-whatsapp" style={{ color: '#16a34a' }} /> WhatsApp Templates</h1>
          <p style={{ margin: '4px 0 0', color: C.muted, fontSize: 13.5 }}>Create templates here — they are submitted to Meta for approval — then choose where each one is used.</p>
        </div>
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          <button style={btn()} onClick={() => setShowConn((x) => !x)}>⚙ Connection</button>
          {conn?.wabaId && <button style={btn()} disabled={busy === 'sync'} onClick={sync}>{busy === 'sync' ? 'Syncing…' : '⟳ Sync from Meta'}</button>}
          {conn?.wabaId && <button style={btn('primary')} onClick={() => setEditor({})}>+ New template</button>}
        </div>
      </div>

      {toast && (
        <div style={{ background: toast.kind === 'ok' ? '#f0fdf4' : C.redBg, border: `1px solid ${toast.kind === 'ok' ? '#bbf7d0' : '#fecaca'}`, color: toast.kind === 'ok' ? C.green : C.red, borderRadius: 8, padding: '8px 14px', fontSize: 13.5, marginTop: 12, display: 'flex', justifyContent: 'space-between', gap: 10 }}>
          <span>{toast.text}</span><button onClick={() => setToast(null)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'inherit' }}>✕</button>
        </div>
      )}

      {showConn && (
        <div style={{ ...card, marginTop: 14 }}>
          <div style={{ fontWeight: 800 }}>Connect your WhatsApp Business Account</div>
          <div style={hint}>Meta Business Manager → Business settings → Accounts → WhatsApp accounts → select the account → copy the <b>Account ID</b>. The access token already set for sending messages is reused; it also needs the <code>whatsapp_business_management</code> permission.</div>
          <div style={{ display: 'flex', gap: 8, marginTop: 10, flexWrap: 'wrap' }}>
            <input style={{ ...input, maxWidth: 300 }} value={wabaInput} placeholder="WhatsApp Business Account ID" onChange={(e) => setWabaInput(e.target.value.replace(/\D/g, ''))} />
            <button style={btn('primary')} disabled={!wabaInput || busy === 'conn'} onClick={saveConn}>{busy === 'conn' ? 'Checking…' : 'Save & test'}</button>
          </div>
          {conn?.source === 'lead_source' && <div style={hint}>Currently using the ID from CRM → Lead Sources → WhatsApp.</div>}
        </div>
      )}

      {loading ? <div style={{ padding: 40, textAlign: 'center', color: C.muted }}>Loading…</div> : conn?.wabaId ? (
        <>
          <div style={{ display: 'flex', gap: 4, borderBottom: `1px solid ${C.border}`, margin: '18px 0 14px', overflowX: 'auto' }}>
            {([['templates', `Templates (${templates.length})`], ['usage', 'Where used'], ['history', 'Sent history']] as [Tab, string][]).map(([k, l]) => (
              <button key={k} onClick={() => setTab(k)} style={{ background: 'none', border: 'none', padding: '9px 14px', fontSize: 14, fontWeight: 700, cursor: 'pointer', whiteSpace: 'nowrap', color: tab === k ? C.text : C.muted, borderBottom: tab === k ? '2px solid #16a34a' : '2px solid transparent' }}>{l}</button>
            ))}
          </div>

          {tab === 'templates' && (
            <>
              <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center', marginBottom: 12 }}>
                <input style={{ ...input, maxWidth: 240 }} placeholder="Search by name" value={filter} onChange={(e) => setFilter(e.target.value)} />
                <span style={{ fontSize: 12.5, color: C.muted }}>{counts.approved} approved · {counts.pending} in review · {counts.rejected} rejected/paused</span>
              </div>
              {!shown.length ? (
                <div style={{ ...card, textAlign: 'center', color: C.muted, padding: 40 }}>
                  No templates yet. <button style={{ ...btn('primary'), marginLeft: 8 }} onClick={() => setEditor({})}>Create your first template</button>
                </div>
              ) : (
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: 12 }}>
                  {shown.map((t) => (
                    <div key={t._id} style={{ ...card, display: 'flex', flexDirection: 'column', gap: 8 }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', gap: 8, alignItems: 'flex-start' }}>
                        <div style={{ minWidth: 0 }}>
                          <div style={{ fontWeight: 800, fontSize: 14.5, wordBreak: 'break-all' }}>{t.name}</div>
                          <div style={{ fontSize: 12, color: C.muted }}>{t.category.toLowerCase()} · {t.language} · {t.shape.bodyVarCount} variable{t.shape.bodyVarCount === 1 ? '' : 's'}{t.shape.urlButtonIndex >= 0 ? ' · personal link' : ''}{t.source === 'meta' ? ' · from Meta' : ''}</div>
                        </div>
                        <Badge status={t.status} />
                      </div>
                      <div style={{ fontSize: 13, color: '#334155', background: C.bg, borderRadius: 8, padding: '8px 10px', whiteSpace: 'pre-wrap', maxHeight: 96, overflow: 'hidden' }}>{t.body}</div>
                      {t.rejectedReason && <div style={{ fontSize: 12, color: C.red }}>Meta: {t.rejectedReason.replace(/_/g, ' ').toLowerCase()}</div>}
                      {t.usedBy.length > 0 && (
                        <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap' }}>
                          {t.usedBy.map((u) => <span key={u} style={{ fontSize: 11, background: C.blueBg, color: C.blue, padding: '2px 8px', borderRadius: 999, fontWeight: 700 }}>{u}</span>)}
                        </div>
                      )}
                      <div style={{ display: 'flex', gap: 6, marginTop: 'auto', flexWrap: 'wrap' }}>
                        <button style={btn()} disabled={t.status !== 'APPROVED'} title={t.status !== 'APPROVED' ? 'Only approved templates can be sent' : ''} onClick={() => setSending(t)}>Send</button>
                        {t.metaId && t.status !== 'DELETED' && ['REJECTED', 'APPROVED', 'PAUSED'].includes(t.status) && <button style={btn()} onClick={() => setEditor({ initial: t })}>Edit</button>}
                        <button style={btn('danger')} onClick={() => remove(t)}>Delete</button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </>
          )}

          {tab === 'usage' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
              <div style={hint}>Each system message below goes out as the template you choose. Only approved templates whose variables and buttons fit the message can be picked.</div>
              {modules.map((m) => (
                <div key={m}>
                  <div style={{ fontSize: 12, fontWeight: 800, color: C.muted, textTransform: 'uppercase', letterSpacing: '.05em', marginBottom: 6 }}>{m}</div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                    {usage.filter((u) => u.module === m).map((p) => {
                      const current = p.assigned ? templates.find((t) => t.name === p.assigned!.name && t.language === p.assigned!.language) : undefined;
                      const cmap = compat[p.key] || {};
                      const usable = templates.filter((t) => cmap[t._id]?.ok);
                      return (
                        <div key={p.key} style={{ ...card, display: 'grid', gridTemplateColumns: 'minmax(0,1.2fr) minmax(0,1fr)', gap: 14 }} className="wa-usage-row">
                          <div>
                            <div style={{ fontWeight: 800 }}>{p.label}</div>
                            <div style={{ fontSize: 12.5, color: C.muted, marginTop: 2 }}>{p.help}</div>
                            <div style={{ fontSize: 12, marginTop: 6 }}>
                              <b>Values it provides:</b> {p.variables.map((v, i) => <code key={i} style={{ marginRight: 6 }}>{`{{${i + 1}}}`} {v}</code>)}
                              {p.buttonParam && <div style={{ color: C.muted, marginTop: 2 }}>Personal link: {p.buttonParam}</div>}
                              {p.headerImage && <div style={{ color: C.muted, marginTop: 2 }}>Image header: supported</div>}
                            </div>
                          </div>
                          <div>
                            <select style={input} value={current?._id || ''} disabled={busy === p.key} onChange={(e) => assign(p, e.target.value)}>
                              <option value="">{p.assigned && !current ? `${p.assigned.name} (${p.assigned.language}) — set manually` : '— Not set —'}</option>
                              {templates.filter((t) => t.status !== 'DELETED').map((t) => (
                                <option key={t._id} value={t._id} disabled={!cmap[t._id]?.ok && current?._id !== t._id}>
                                  {cmap[t._id]?.ok ? '✓ ' : '✕ '}{t.name} ({t.language}){!cmap[t._id]?.ok ? ` — ${cmap[t._id]?.errors?.[0] || ''}` : ''}
                                </option>
                              ))}
                            </select>
                            {current && cmap[current._id]?.warnings?.map((w, i) => <div key={i} style={{ ...hint, color: C.amber }}>⚠ {w}</div>)}
                            {current && !cmap[current._id]?.ok && cmap[current._id]?.errors?.map((w, i) => <div key={i} style={{ ...hint, color: C.red }}>✕ {w}</div>)}
                            {p.assigned && !current && <div style={{ ...hint, color: C.amber }}>This name isn't in the synced list — press "Sync from Meta", or pick one above.</div>}
                            {!usable.length && (
                              <button style={{ ...btn(), marginTop: 8, fontSize: 12 }} onClick={() => setEditor({ draft: draftForPurpose(p) })}>+ Create a template for this</button>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              ))}
              <style>{`@media (max-width: 760px) { .wa-usage-row { grid-template-columns: 1fr !important; } }`}</style>
            </div>
          )}

          {tab === 'history' && (
            !history.length ? <div style={{ ...card, textAlign: 'center', color: C.muted, padding: 40 }}>Nothing sent yet. Use "Send" on an approved template.</div> : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                {history.map((b) => (
                  <div key={b._id} style={card}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', gap: 10, flexWrap: 'wrap' }}>
                      <div><b>{b.templateName}</b> <span style={{ color: C.muted, fontSize: 12.5 }}>→ {b.audience} · {new Date(b.createdAt).toLocaleString()}</span></div>
                      <span style={{ fontSize: 12.5, fontWeight: 700, color: b.status === 'running' ? C.amber : b.failed ? C.red : C.green }}>
                        {b.status === 'running' ? 'Sending…' : b.status === 'failed' ? 'Stopped' : 'Done'} · {b.sent} sent · {b.failed} failed · {b.total} total
                      </span>
                    </div>
                    <div style={{ height: 6, background: C.bg, borderRadius: 3, marginTop: 8, overflow: 'hidden' }}>
                      <div style={{ height: '100%', width: `${b.total ? ((b.sent + b.failed) / b.total) * 100 : 0}%`, background: b.failed ? '#f59e0b' : '#16a34a' }} />
                    </div>
                    {b.failures?.length > 0 && (
                      <details style={{ marginTop: 6, fontSize: 12.5 }}>
                        <summary style={{ cursor: 'pointer', color: C.red }}>Failures</summary>
                        {b.failures.map((f, i) => <div key={i} style={{ color: C.muted }}>{f.phone}: {f.error}</div>)}
                      </details>
                    )}
                  </div>
                ))}
              </div>
            )
          )}
        </>
      ) : null}

      {editor && <Editor initial={editor.initial} draft={editor.draft} onClose={() => setEditor(null)} onSaved={(m) => { setEditor(null); say('ok', m); loadAll(); }} />}
      {sending && <SendModal t={sending} onClose={() => setSending(null)} onDone={(m) => { setSending(null); say('ok', m); if (m.startsWith('Broadcast')) setTab('history'); }} />}
    </div>
  );
};

export default WhatsAppTemplates;
