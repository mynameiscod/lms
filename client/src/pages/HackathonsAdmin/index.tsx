import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import hackathonApi, { Hackathon } from '../../api/hackathonApi';
import './hackathons.css';

/**
 * Hackathons — the events, and the form the public registration API validates against.
 *
 * EVERYTHING SET HERE IS A CONTROL, NOT A SUGGESTION. The registration form lives on
 * codebegun.com, an origin we do not deploy: its own validation is a courtesy to the person
 * typing. Team size, the fee, the college list, the window and the capacity are enforced by
 * the server against what is saved on this screen, so a change here takes effect on the
 * public form immediately and cannot be worked around from the browser.
 */

/** `datetime-local` wants `YYYY-MM-DDTHH:mm` in LOCAL time; an ISO string is neither. */
const toLocalInput = (iso?: string | null): string => {
  if (!iso) return '';
  const d = new Date(iso);
  if (isNaN(d.getTime())) return '';
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
};
const fromLocalInput = (v: string): string | null => (v ? new Date(v).toISOString() : null);

const fmtWhen = (iso?: string | null): string =>
  iso ? new Date(iso).toLocaleString('en-IN', { dateStyle: 'medium', timeStyle: 'short' }) : '—';

const emptyForm = (): Hackathon => ({
  title: '',
  description: '',
  process: '',
  venue: '',
  bannerUrl: '',
  startAt: '',
  endAt: null,
  prizes: { first: '', second: '', third: '', others: [] },
  feeInr: 0,
  minTeamSize: 2,
  maxTeamSize: 6,
  registerOpensAt: null,
  registerClosesAt: null,
  maxTeams: 0,
  colleges: [],
  allowOtherCollege: true,
  status: 'draft',
});

const HackathonsAdmin: React.FC = () => {
  const nav = useNavigate();
  const [rows, setRows] = useState<Hackathon[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadErr, setLoadErr] = useState('');
  const [msg, setMsg] = useState('');
  const [err, setErr] = useState('');
  const [saving, setSaving] = useState(false);

  /** null = closed; otherwise the event being edited ('' id means a new one). */
  const [form, setForm] = useState<Hackathon | null>(null);
  const [editingId, setEditingId] = useState<string>('');

  const load = async () => {
    setLoading(true); setLoadErr('');
    try {
      setRows(await hackathonApi.list());
    } catch (e: any) {
      setLoadErr(e?.response?.status === 403
        ? 'Your role does not include permission to view hackathons.'
        : (e?.response?.data?.message || 'Could not load hackathons.'));
    }
    setLoading(false);
  };
  useEffect(() => { load(); }, []);

  const flash = (m: string) => { setMsg(m); setTimeout(() => setMsg(''), 6000); };

  const startNew = () => { setForm(emptyForm()); setEditingId(''); setErr(''); };
  const startEdit = (h: Hackathon) => { setForm({ ...h, prizes: { first: '', second: '', third: '', others: [], ...(h.prizes || {}) } }); setEditingId(h._id || ''); setErr(''); };
  const cancel = () => { setForm(null); setEditingId(''); setErr(''); };

  const patch = (p: Partial<Hackathon>) => setForm(f => (f ? { ...f, ...p } : f));

  const save = async () => {
    if (!form) return;
    if (!form.title.trim()) { setErr('Give the hackathon a title.'); return; }
    if (!form.startAt) { setErr('Set the date and time it starts.'); return; }
    setSaving(true); setErr('');
    try {
      const body: Partial<Hackathon> = {
        ...form,
        startAt: new Date(form.startAt).toISOString(),
        endAt: form.endAt || null,
        registerOpensAt: form.registerOpensAt || null,
        registerClosesAt: form.registerClosesAt || null,
      };
      if (editingId) await hackathonApi.update(editingId, body);
      else await hackathonApi.create(body);
      cancel();
      await load();
      flash('Saved. The public registration form uses these rules immediately.');
    } catch (e: any) {
      setErr(e?.response?.data?.message || 'Could not save the hackathon.');
    }
    setSaving(false);
  };

  const remove = async (h: Hackathon) => {
    if (!window.confirm(`Delete "${h.title}"? This cannot be undone.`)) return;
    try {
      await hackathonApi.remove(h._id!);
      await load();
      flash('Hackathon deleted.');
    } catch (e: any) {
      // The server refuses once anyone has paid — that message says what to do instead.
      setErr(e?.response?.data?.message || 'Could not delete the hackathon.');
    }
  };

  const publicPath = (h: Hackathon) => `/api/v1/public/hackathons/<your-tenant-slug>/${h.slug || ''}`;

  if (loading) return <div className="hk"><p style={{ color: '#64748b' }}>Loading hackathons…</p></div>;

  return (
    <div className="hk">
      <div className="hk-crumb">Events <span style={{ color: '#cbd5e1' }}>›</span> <b>Hackathons</b></div>
      <div className="hk-hd">
        <div>
          <h1>Hackathons</h1>
          <p>
            Create an event and the public registration API opens for it. Team size, the fee,
            the college list and the capacity set here are what the server enforces — the form
            on your website cannot go around them.
          </p>
        </div>
        {!form && <button className="hk-btn primary" onClick={startNew}>+ New hackathon</button>}
      </div>

      {loadErr && <div className="hk-msg err">{loadErr}</div>}
      {msg && <div className="hk-msg ok">{msg}</div>}
      {err && !form && <div className="hk-msg err">{err}</div>}

      {form && (
        <div className="hk-panel">
          <h2>{editingId ? 'Edit hackathon' : 'New hackathon'}</h2>
          <p>Students see the title, description, process, prizes and fee. Everything else decides what the form will accept.</p>

          <div className="hk-grid" style={{ marginBottom: 16 }}>
            <label className="hk-f wide">
              <span>Title</span>
              <input value={form.title} placeholder="CodeBegun Hack 2026" onChange={e => patch({ title: e.target.value })} />
            </label>
            <label className="hk-f">
              <span>Status</span>
              <select value={form.status} onChange={e => patch({ status: e.target.value as any })}>
                <option value="draft">Draft — hidden from the public</option>
                <option value="published">Published — accepting registrations</option>
                <option value="closed">Closed</option>
              </select>
            </label>
            <label className="hk-f">
              <span>Venue</span>
              <input value={form.venue || ''} placeholder="Main campus, Block A" onChange={e => patch({ venue: e.target.value })} />
            </label>
          </div>

          <div className="hk-grid" style={{ marginBottom: 16 }}>
            <label className="hk-f">
              <span>Starts (date &amp; time)</span>
              <input type="datetime-local" value={toLocalInput(form.startAt)} onChange={e => patch({ startAt: fromLocalInput(e.target.value) || '' })} />
            </label>
            <label className="hk-f">
              <span>Ends (optional)</span>
              <input type="datetime-local" value={toLocalInput(form.endAt)} onChange={e => patch({ endAt: fromLocalInput(e.target.value) })} />
              <small>After this, registration closes automatically.</small>
            </label>
            <label className="hk-f">
              <span>Registration opens</span>
              <input type="datetime-local" value={toLocalInput(form.registerOpensAt)} onChange={e => patch({ registerOpensAt: fromLocalInput(e.target.value) })} />
              <small>Leave blank to open as soon as it is published.</small>
            </label>
            <label className="hk-f">
              <span>Registration closes</span>
              <input type="datetime-local" value={toLocalInput(form.registerClosesAt)} onChange={e => patch({ registerClosesAt: fromLocalInput(e.target.value) })} />
            </label>
          </div>

          <div className="hk-grid" style={{ marginBottom: 16 }}>
            <label className="hk-f">
              <span>Fee per team (₹)</span>
              <input type="number" min={0} style={{ width: 130 }} value={form.feeInr ?? 0}
                onChange={e => patch({ feeInr: Math.max(0, Number(e.target.value) || 0) })} />
              {/* Free is not "an order for ₹0" — the server skips the gateway entirely. */}
              <small>{form.feeInr ? 'Charged once per team, not per person.' : '0 = free. Teams are confirmed instantly, with no payment step.'}</small>
            </label>
            <label className="hk-f">
              <span>Min team size</span>
              <input type="number" min={1} max={10} style={{ width: 110 }} value={form.minTeamSize ?? 2}
                onChange={e => patch({ minTeamSize: Number(e.target.value) || 1 })} />
              <small>Including the team lead.</small>
            </label>
            <label className="hk-f">
              <span>Max team size</span>
              <input type="number" min={1} max={10} style={{ width: 110 }} value={form.maxTeamSize ?? 6}
                onChange={e => patch({ maxTeamSize: Number(e.target.value) || 1 })} />
              <small>Including the team lead.</small>
            </label>
            <label className="hk-f">
              <span>Max teams</span>
              <input type="number" min={0} style={{ width: 110 }} value={form.maxTeams ?? 0}
                onChange={e => patch({ maxTeams: Math.max(0, Number(e.target.value) || 0) })} />
              <small>0 = unlimited. Counts confirmed teams only.</small>
            </label>
          </div>

          <div className="hk-grid" style={{ marginBottom: 16 }}>
            <label className="hk-f"><span>1st prize</span><input value={form.prizes?.first || ''} placeholder="₹50,000" onChange={e => patch({ prizes: { ...form.prizes!, first: e.target.value } })} /></label>
            <label className="hk-f"><span>2nd prize</span><input value={form.prizes?.second || ''} placeholder="₹25,000" onChange={e => patch({ prizes: { ...form.prizes!, second: e.target.value } })} /></label>
            <label className="hk-f"><span>3rd prize</span><input value={form.prizes?.third || ''} placeholder="₹10,000" onChange={e => patch({ prizes: { ...form.prizes!, third: e.target.value } })} /></label>
            <label className="hk-f wide">
              <span>Other prizes — one per line</span>
              <textarea rows={3} value={(form.prizes?.others || []).join('\n')}
                onChange={e => patch({ prizes: { ...form.prizes!, others: e.target.value.split('\n').map(s => s.trim()).filter(Boolean) } })} />
            </label>
          </div>

          <div className="hk-grid" style={{ marginBottom: 16 }}>
            <label className="hk-f wide">
              <span>Description</span>
              <textarea rows={4} value={form.description || ''} placeholder="What the hackathon is about." onChange={e => patch({ description: e.target.value })} />
            </label>
            <label className="hk-f wide">
              <span>Process</span>
              <textarea rows={4} value={form.process || ''} placeholder="Rounds, judging criteria, what to bring." onChange={e => patch({ process: e.target.value })} />
            </label>
          </div>

          <div className="hk-grid" style={{ marginBottom: 8 }}>
            <label className="hk-f wide">
              <span>Colleges — one per line ({(form.colleges || []).length})</span>
              <textarea rows={6} value={(form.colleges || []).join('\n')}
                onChange={e => patch({ colleges: e.target.value.split('\n').map(s => s.trim()).filter(Boolean) })} />
              <small>This is the dropdown on the registration form. Leave empty to accept any college typed in.</small>
            </label>
            <div className="hk-f">
              <span>If their college is missing</span>
              <label className="hk-check" style={{ marginTop: 4 }}>
                <input type="checkbox" checked={form.allowOtherCollege !== false} onChange={e => patch({ allowOtherCollege: e.target.checked })} />
                Let them type their own
              </label>
              {/*
                Said out loud because switching it off is quietly expensive: a student whose
                college is not on the list simply cannot register, and nothing counts them.
              */}
              {form.allowOtherCollege === false && (
                <small style={{ color: '#b45309' }}>
                  Off: a student whose college is not listed above cannot register at all.
                </small>
              )}
            </div>
          </div>

          <div className="hk-save">
            <button className="hk-btn primary" onClick={save} disabled={saving}>{saving ? 'Saving…' : 'Save hackathon'}</button>
            <button className="hk-btn" onClick={cancel} disabled={saving}>Cancel</button>
            {err && <span style={{ color: '#dc2626', fontSize: 13 }}>{err}</span>}
          </div>
        </div>
      )}

      <div className="hk-list">
        {!rows.length && !loadErr && (
          <div className="hk-panel hk-empty">No hackathons yet. Create one to open its public registration API.</div>
        )}
        {rows.map(h => (
          <div className="hk-card" key={h._id}>
            <div className="hk-card-main">
              <div className="hk-title-row">
                <h3>{h.title}</h3>
                <span className={`hk-tag ${h.status}`}>{h.status}</span>
                {!h.feeInr && <span className="hk-tag free">Free entry</span>}
              </div>
              <div className="hk-when">
                {fmtWhen(h.startAt)}{h.venue ? ` · ${h.venue}` : ''}
                {' · '}teams of {h.minTeamSize}–{h.maxTeamSize}
                {' · '}{h.feeInr ? `₹${h.feeInr} per team` : 'free'}
                {h.maxTeams ? ` · cap ${h.maxTeams} teams` : ''}
              </div>
              <div className="hk-counts">
                <span><b>{h.counts?.confirmed ?? 0}</b> confirmed</span>
                <span><b>{h.counts?.pending ?? 0}</b> awaiting payment</span>
                {/* Money that is owed back. Never hidden behind a filter — someone has to act on it. */}
                {!!h.counts?.refundDue && <span className="owed"><b>{h.counts.refundDue}</b> refund due</span>}
              </div>
              {h.status === 'published' && (
                <div className="hk-url">Public API: <code>{publicPath(h)}</code></div>
              )}
            </div>
            <div className="hk-acts">
              <button className="hk-btn sm" onClick={() => nav(`/admin/hackathons/${h._id}`)}>Registrations</button>
              <button className="hk-btn sm" onClick={() => startEdit(h)}>Edit</button>
              <button className="hk-btn sm danger" onClick={() => remove(h)}>Delete</button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default HackathonsAdmin;
