import React, { useMemo, useState } from 'react';
import passportApi, { AssessCategory, CategoryUsage } from '../../api/passportApi';

/**
 * Managing the scoring categories a member is measured against.
 *
 * A category key is a STABLE IDENTIFIER, not a label. It is stored on every question, on
 * every mission pool and in every pathway's focus list, so the key of a saved category is
 * shown read-only — renaming it would not rename anything else, it would orphan all three.
 * The label is free to change at any time; that is what a member actually reads.
 *
 * Deleting is guarded on the server, which refuses with a 409 and a breakdown of what is
 * still pointing at the category. The counts are shown here so the block is visible before
 * the button is pressed rather than after.
 */

const slug = (s: string) =>
  s.trim().toLowerCase().replace(/[^a-z0-9]+/g, '_').replace(/^_|_$/g, '').slice(0, 40);

const box: React.CSSProperties = {
  background: '#fff', border: '1px solid #eef0f7', borderRadius: 14, padding: 20, marginBottom: 18,
};
const inp: React.CSSProperties = {
  padding: '9px 11px', border: '1px solid #e2e8f0', borderRadius: 9,
  fontSize: 13.5, boxSizing: 'border-box', fontFamily: 'inherit',
};
const lbl: React.CSSProperties = {
  display: 'block', fontSize: 10.5, fontWeight: 800, letterSpacing: '.07em',
  textTransform: 'uppercase', color: '#94a3b8', marginBottom: 5,
};

type Row = AssessCategory & { isNew?: boolean };

const AdminCategories: React.FC<{
  categories: AssessCategory[];
  usage: CategoryUsage[];
  onSaved: (next: AssessCategory[]) => void;
}> = ({ categories, usage, onSaved }) => {
  const [rows, setRows] = useState<Row[]>(
    [...categories].sort((a, b) => (a.order ?? 0) - (b.order ?? 0)));
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState('');
  const [err, setErr] = useState('');
  const [blocked, setBlocked] = useState<CategoryUsage[]>([]);

  const useOf = useMemo(() => {
    const m = new Map<string, CategoryUsage>();
    usage.forEach(u => m.set(u.key, u));
    return m;
  }, [usage]);

  /** Content pointing at a category that only exists on the server counts as "in use". */
  const inUseCount = (key: string) => {
    const u = useOf.get(key);
    return u ? u.questions + u.missions + u.pathways : 0;
  };

  const set = (i: number, patch: Partial<Row>) =>
    setRows(r => r.map((x, j) => (j === i ? { ...x, ...patch } : x)));

  const move = (i: number, dir: -1 | 1) => setRows(r => {
    const j = i + dir;
    if (j < 0 || j >= r.length) return r;
    const next = [...r];
    [next[i], next[j]] = [next[j], next[i]];
    return next;
  });

  const add = () => setRows(r => [...r, { key: '', label: '', weight: 1, isNew: true }]);

  const remove = (i: number) => {
    const row = rows[i];
    const n = row.isNew ? 0 : inUseCount(row.key);
    if (n > 0) {
      const u = useOf.get(row.key)!;
      setErr(`"${row.label}" is still used by ${[
        u.questions && `${u.questions} question${u.questions === 1 ? '' : 's'}`,
        u.missions && `${u.missions} mission${u.missions === 1 ? '' : 's'}`,
        u.pathways && `${u.pathways} pathway${u.pathways === 1 ? '' : 's'}`,
      ].filter(Boolean).join(', ')}. Move that content to another category first.`);
      return;
    }
    setErr('');
    setRows(r => r.filter((_, j) => j !== i));
  };

  const save = async () => {
    setBusy(true); setErr(''); setMsg(''); setBlocked([]);

    const clean = rows.map((r, i) => ({
      key: r.isNew ? (slug(r.key) || slug(r.label)) : r.key,
      label: r.label.trim(),
      weight: r.weight,
      order: i,
    }));

    if (clean.some(c => !c.label)) { setErr('Every category needs a label.'); setBusy(false); return; }
    if (clean.some(c => !c.key)) { setErr('A new category needs a key — it is generated from the label, so give it letters or numbers.'); setBusy(false); return; }
    const dupe = clean.find((c, i) => clean.findIndex(x => x.key === c.key) !== i);
    if (dupe) { setErr(`Two categories share the key "${dupe.key}". Keys must be unique.`); setBusy(false); return; }

    try {
      const r = await passportApi.saveCategories(clean);
      setRows(r.categories.sort((a, b) => (a.order ?? 0) - (b.order ?? 0)));
      onSaved(r.categories);
      setMsg(r.removed?.length
        ? `Saved. Removed ${r.removed.length} categor${r.removed.length === 1 ? 'y' : 'ies'}.`
        : 'Saved.');
      setTimeout(() => setMsg(''), 3000);
    } catch (e: any) {
      const d = e?.response?.data;
      // The server refuses to strand content. Show exactly what is holding each one.
      if (d?.inUse) setBlocked(d.inUse);
      setErr(d?.message || 'Could not save the categories.');
    }
    setBusy(false);
  };

  return (
    <div style={box}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 12, flexWrap: 'wrap' }}>
        <div>
          <h2 style={{ fontSize: 16, fontWeight: 900, color: '#0f172a', margin: 0 }}>Scoring categories</h2>
          <p style={{ fontSize: 12.5, color: '#64748b', margin: '5px 0 0', lineHeight: 1.6, maxWidth: '62ch' }}>
            What every member is measured against. <b>Weight</b> scales how much a category
            moves the career score — Technical is heavier than Career Clarity because it
            predicts more. Order is the order a member reads their breakdown in.
          </p>
        </div>
        <button className="pm-btn primary" disabled={busy} onClick={save}>
          {busy ? 'Saving…' : 'Save categories'}
        </button>
      </div>

      <div style={{ marginTop: 18 }}>
        {rows.map((r, i) => {
          const n = r.isNew ? 0 : inUseCount(r.key);
          const u = useOf.get(r.key);
          return (
            <div key={r.key || `new-${i}`} style={{
              border: '1px solid #eef0f7', borderRadius: 11, padding: 13, marginBottom: 9,
              background: r.isNew ? '#f8fbff' : '#fff',
            }}>
              <div style={{ display: 'flex', gap: 10, alignItems: 'flex-end', flexWrap: 'wrap' }}>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
                  <button className="pm-btn ghost" style={{ padding: '1px 8px', lineHeight: 1.3 }}
                    disabled={i === 0} onClick={() => move(i, -1)} aria-label="Move up">↑</button>
                  <button className="pm-btn ghost" style={{ padding: '1px 8px', lineHeight: 1.3 }}
                    disabled={i === rows.length - 1} onClick={() => move(i, 1)} aria-label="Move down">↓</button>
                </div>

                <div style={{ flex: 2, minWidth: 180 }}>
                  <label style={lbl}>Label — shown to the member</label>
                  <input style={{ ...inp, width: '100%' }} value={r.label}
                    placeholder="e.g. Cloud Basics"
                    onChange={e => set(i, { label: e.target.value })} />
                </div>

                <div style={{ flex: 1.2, minWidth: 150 }}>
                  <label style={lbl}>Key {r.isNew ? '(generated)' : '(permanent)'}</label>
                  <input
                    style={{ ...inp, width: '100%', fontFamily: 'ui-monospace, Consolas, monospace',
                      fontSize: 12.5, background: r.isNew ? '#fff' : '#f8fafc', color: r.isNew ? '#0f172a' : '#94a3b8' }}
                    value={r.isNew ? (r.key || slug(r.label)) : r.key}
                    readOnly={!r.isNew}
                    title={r.isNew ? 'Generated from the label. You can override it.' : 'Stored on every question, mission and pathway — it cannot be changed.'}
                    onChange={e => set(i, { key: slug(e.target.value) })} />
                </div>

                <div style={{ width: 96 }}>
                  <label style={lbl}>Weight</label>
                  <input style={{ ...inp, width: '100%' }} type="number" step="0.1" min="0.1" max="3"
                    value={r.weight}
                    onChange={e => set(i, { weight: Math.min(3, Math.max(0.1, Number(e.target.value) || 1)) })} />
                </div>

                <button className="pm-btn ghost"
                  style={{ color: n ? '#94a3b8' : '#b91c1c', cursor: n ? 'not-allowed' : 'pointer' }}
                  title={n ? 'Still in use — move its content first' : 'Remove this category'}
                  onClick={() => remove(i)}>Remove</button>
              </div>

              {!r.isNew && (
                <div style={{ fontSize: 11.5, color: '#94a3b8', marginTop: 9, display: 'flex', gap: 14, flexWrap: 'wrap' }}>
                  <span>{u?.questions ?? 0} question{(u?.questions ?? 0) === 1 ? '' : 's'}</span>
                  <span>{u?.missions ?? 0} mission{(u?.missions ?? 0) === 1 ? '' : 's'}</span>
                  <span>{u?.pathways ?? 0} pathway{(u?.pathways ?? 0) === 1 ? '' : 's'} focusing on it</span>
                  {n === 0 && <span style={{ color: '#16a34a', fontWeight: 700 }}>safe to remove</span>}
                </div>
              )}
              {r.isNew && (
                <div style={{ fontSize: 11.5, color: '#1d4ed8', marginTop: 9 }}>
                  New — after saving, tag some questions to it and give it a mission pool,
                  or it will never appear in a member's breakdown.
                </div>
              )}
            </div>
          );
        })}
      </div>

      <button className="pm-btn ghost" onClick={add}>+ Add category</button>

      {msg && <div className="pm-msg ok" style={{ marginTop: 13 }}>{msg}</div>}
      {err && <div className="pm-msg err" style={{ marginTop: 13 }}>{err}</div>}
      {!!blocked.length && (
        <div style={{ marginTop: 10, fontSize: 12.5, color: '#b91c1c' }}>
          {blocked.map(b => (
            <div key={b.key}>
              <b>{b.key}</b> — {b.questions} question(s), {b.missions} mission(s), {b.pathways} pathway(s)
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default AdminCategories;
