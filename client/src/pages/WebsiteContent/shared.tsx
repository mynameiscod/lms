import React, { useEffect, useRef, useState } from 'react';
import { websiteContentApi, WcStat, WcHistory, WcStatSection } from '../../api';
import { Modal } from '../../components/common';

/** Pieces every Website Content tab uses (2026-11-27). */

export type Msg = { type: 'ok' | 'err'; text: string } | null;
export type Ok = (t: string) => void;
export type Err = (e: any, fallback?: string) => void;

export const fmtWhen = (iso: string) => new Date(iso).toLocaleString('en-IN', { day: 'numeric', month: 'short', year: 'numeric', hour: 'numeric', minute: '2-digit' });
export const initials = (name: string) => name.split(/\s+/).filter(Boolean).map((w) => w[0]).join('').slice(0, 2).toUpperCase();
export const monthText = (ym: string) => (ym ? new Date(`${ym}-01T00:00:00`).toLocaleDateString('en-IN', { month: 'short', year: 'numeric' }) : '');
export const dateText = (ymd: string) => (ymd ? new Date(`${ymd}T00:00:00`).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' }) : '');
export const lpaText = (n: number | null | undefined) => (n === null || n === undefined || Number.isNaN(n) ? '' : `₹ ${Number.isInteger(n) ? n : n.toFixed(1).replace(/\.0$/, '')} LPA`);
/** One item per line, blanks dropped — for "tags", "topics", "prizes" boxes. */
export const linesOf = (s: string) => s.split('\n').map((x) => x.trim()).filter(Boolean);

export const History: React.FC<{ items?: WcHistory[] }> = ({ items }) => (items && items.length ? (
  <details className="wct-history">
    <summary>Changes ({items.length})</summary>
    <ul>{items.map((h, i) => <li key={i}><span>{fmtWhen(h.at)}{h.byName ? ` · ${h.byName}` : ''}</span> {h.change}</li>)}</ul>
  </details>
) : null);

export const StatusPill: React.FC<{ on: boolean; onText?: string; offText?: string }> = ({ on, onText = 'Published', offText = 'Draft' }) =>
  <span className={`wct-pill ${on ? 'pub' : 'draft'}`}>{on ? onText : offText}</span>;

/** Drag to reorder (desktop) plus earlier/later buttons (touch and keyboard). */
export function useReorder<T extends { id: string }>(items: T[], save: (ids: string[]) => Promise<void>) {
  const [order, setOrder] = useState<T[]>(items);
  const drag = useRef<string | null>(null);
  useEffect(() => setOrder(items), [items]);
  const commit = async (next: T[]) => { setOrder(next); await save(next.map((x) => x.id)); };
  const move = (id: string, delta: number) => {
    const i = order.findIndex((x) => x.id === id);
    const j = i + delta;
    if (i < 0 || j < 0 || j >= order.length) return;
    const next = [...order];
    [next[i], next[j]] = [next[j], next[i]];
    commit(next);
  };
  const props = (id: string) => ({
    draggable: true,
    onDragStart: (e: React.DragEvent) => { drag.current = id; e.dataTransfer.effectAllowed = 'move'; },
    onDragOver: (e: React.DragEvent) => { if (drag.current && drag.current !== id) e.preventDefault(); },
    onDrop: (e: React.DragEvent) => {
      e.preventDefault();
      const from = order.findIndex((x) => x.id === drag.current);
      const to = order.findIndex((x) => x.id === id);
      drag.current = null;
      if (from < 0 || to < 0 || from === to) return;
      const next = [...order];
      const [it] = next.splice(from, 1);
      next.splice(to, 0, it);
      commit(next);
    },
    onDragEnd: () => { drag.current = null; },
  });
  return { order, move, props };
}

const PICK_HINT: Record<'photo' | 'logo' | 'thumb', string> = {
  photo: 'Cropped to a square around the face. JPG, PNG or WebP, up to 8 MB.',
  logo: 'Fitted inside the logo strip; transparent backgrounds are kept.',
  thumb: 'Cropped to a wide 16:9 picture. JPG, PNG or WebP, up to 8 MB.',
};
const PICK_WORD: Record<'photo' | 'logo' | 'thumb', string> = { photo: 'photo', logo: 'logo', thumb: 'picture' };

export const ImagePick: React.FC<{
  kind: 'photo' | 'logo' | 'thumb'; url: string | null; fallback: string; onUploaded: (id: string, url: string) => void; onClear: () => void; onError: (m: string) => void;
}> = ({ kind, url, fallback, onUploaded, onClear, onError }) => {
  const [busy, setBusy] = useState(false);
  const input = useRef<HTMLInputElement>(null);
  const pick = async (f?: File) => {
    if (!f) return;
    if (f.size > 8 * 1024 * 1024) return onError('The image is larger than 8 MB.');
    setBusy(true);
    try { const r = await websiteContentApi.upload(kind, f); onUploaded(r.id, r.url); }
    catch (e: any) { onError(e.message || 'Could not upload the image'); }
    finally { setBusy(false); if (input.current) input.current.value = ''; }
  };
  return (
    <div className={`wct-imgpick ${kind}`}>
      <div className="wct-imgpick-preview">{url ? <img src={url} alt="" /> : <span>{fallback}</span>}</div>
      <div className="wct-imgpick-side">
        <input ref={input} type="file" accept="image/png,image/jpeg,image/webp,image/svg+xml,image/gif" hidden onChange={(e) => pick(e.target.files?.[0])} />
        <button type="button" className="wct-btn ghost sm" disabled={busy} onClick={() => input.current?.click()}>
          <i className="fa-solid fa-upload" /> {busy ? 'Uploading…' : url ? 'Change' : `Upload ${PICK_WORD[kind]}`}
        </button>
        {url && !busy && <button type="button" className="wct-link" onClick={onClear}>Remove</button>}
        <small>{PICK_HINT[kind]}</small>
      </div>
    </div>
  );
};

/** A box for "one per line" lists, kept as text while typing so blank lines don't jump away. */
export const LinesBox: React.FC<{ label: React.ReactNode; value: string[]; onChange: (v: string[]) => void; rows?: number; placeholder?: string }> =
  ({ label, value, onChange, rows = 4, placeholder }) => {
    const [text, setText] = useState(value.join('\n'));
    const last = useRef(value.join('\n'));
    useEffect(() => { const v = value.join('\n'); if (v !== linesOf(last.current).join('\n')) { setText(v); last.current = v; } }, [value]);
    return (
      <label><span>{label}</span>
        <textarea rows={rows} value={text} placeholder={placeholder}
          onChange={(e) => { setText(e.target.value); last.current = e.target.value; onChange(linesOf(e.target.value)); }} />
      </label>
    );
  };

/** Remove / publish helpers every list uses. */
export async function confirmRemove(what: string, run: () => Promise<unknown>, after: () => Promise<void>, ok: Ok, err: Err) {
  if (!window.confirm(`Remove ${what}? It disappears from the website.`)) return;
  try { await run(); await after(); ok(`${what} removed.`); }
  catch (e) { err(e, 'Could not remove'); }
}

/* ── Numbers (placements, home page, Tech Battle page) ─────────────────────────────────────────── */

export const NumbersEditor: React.FC<{
  stats: WcStat[]; section: WcStatSection; blurb: React.ReactNode; empty: string; sample: [string, string];
  reload: () => Promise<void>; ok: Ok; err: Err;
}> = ({ stats, section, blurb, empty, sample, reload, ok, err }) => {
  const save = async (ids: string[]) => {
    try { await websiteContentApi.reorder('stats', ids); await reload(); } catch (e) { err(e, 'Could not save the order'); await reload(); }
  };
  const { order, move, props } = useReorder<WcStat>(stats, save);
  const [form, setForm] = useState<{ id?: string; value: string; label: string; published: boolean; history?: WcHistory[] } | null>(null);
  const [saving, setSaving] = useState(false);
  const submit = async () => {
    if (!form) return;
    if (!form.value.trim() || !form.label.trim()) return err({ message: 'Type both the number and what it means.' });
    setSaving(true);
    try {
      const body = { value: form.value, label: form.label, published: form.published };
      if (form.id) await websiteContentApi.update('stats', form.id, body); else await websiteContentApi.create('stats', { ...body, section });
      setForm(null); await reload(); ok('Saved. The website shows it within about a minute.');
    } catch (e) { err(e); } finally { setSaving(false); }
  };
  const toggle = async (s: WcStat) => {
    try { await websiteContentApi.update('stats', s.id, { published: !s.published }); await reload(); ok(s.published ? 'Taken off the website.' : 'Published.'); }
    catch (e) { err(e); }
  };
  return (
    <section>
      <div className="wct-bar">
        <p className="wct-muted">{blurb}</p>
        <button className="wct-btn primary" onClick={() => setForm({ value: '', label: '', published: true })}><i className="fa-solid fa-plus" /> Add number</button>
      </div>
      {order.length === 0 ? <div className="wct-none">{empty}</div> : (
        <div className="wct-stats">
          {order.map((s, i) => (
            <div key={s.id} className={`wct-stat ${s.published ? '' : 'off'}`} {...props(s.id)}>
              <div className="wct-stat-top"><i className="fa-solid fa-grip-vertical wct-grip" aria-hidden /><StatusPill on={s.published} /></div>
              <b>{s.value}</b>
              <span>{s.label}</span>
              <div className="wct-card-actions">
                <button className="wct-icon" onClick={() => move(s.id, -1)} disabled={i === 0} aria-label={`Move ${s.label} earlier`}><i className="fa-solid fa-arrow-left" /></button>
                <button className="wct-icon" onClick={() => move(s.id, 1)} disabled={i === order.length - 1} aria-label={`Move ${s.label} later`}><i className="fa-solid fa-arrow-right" /></button>
                <button className="wct-icon" onClick={() => toggle(s)} aria-label={s.published ? `Unpublish ${s.label}` : `Publish ${s.label}`} title={s.published ? 'Unpublish' : 'Publish'}>
                  <i className={`fa-solid ${s.published ? 'fa-eye-slash' : 'fa-eye'}`} />
                </button>
                <button className="wct-icon" onClick={() => setForm({ id: s.id, value: s.value, label: s.label, published: s.published, history: s.history })} aria-label={`Edit ${s.label}`}><i className="fa-solid fa-pen" /></button>
                <button className="wct-icon danger" onClick={() => confirmRemove(`"${s.value} ${s.label}"`, () => websiteContentApi.remove('stats', s.id), reload, ok, err)} aria-label={`Remove ${s.label}`}><i className="fa-solid fa-trash" /></button>
              </div>
            </div>
          ))}
        </div>
      )}
      <Modal isOpen={!!form} onClose={() => setForm(null)} title={form?.id ? 'Edit number' : 'Add number'} size="small">
        {form && (
          <div className="wct-form">
            <div className="wct-form-two">
              <label><span>Number</span><input value={form.value} maxLength={20} onChange={(e) => setForm({ ...form, value: e.target.value })} placeholder={sample[0]} autoFocus /></label>
              <label><span>What it means</span><input value={form.label} maxLength={60} onChange={(e) => setForm({ ...form, label: e.target.value })} placeholder={sample[1]} /></label>
            </div>
            <div className="wct-statpreview"><b>{form.value || sample[0]}</b><span>{form.label || sample[1]}</span></div>
            <label className="wct-check"><input type="checkbox" checked={form.published} onChange={(e) => setForm({ ...form, published: e.target.checked })} /> Published — show on the website</label>
            <History items={form.history} />
            <div className="wct-form-actions">
              <button className="wct-btn ghost" onClick={() => setForm(null)} disabled={saving}>Cancel</button>
              <button className="wct-btn primary" onClick={submit} disabled={saving}>{saving ? 'Saving…' : 'Save'}</button>
            </div>
          </div>
        )}
      </Modal>
    </section>
  );
};
