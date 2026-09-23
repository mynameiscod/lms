import React, { useCallback, useEffect, useState } from 'react';
import passportApi, { OrientationDay, OrientationItem, OrientationItemKind } from '../../api/passportApi';
import './adminOrientation.css';

/**
 * The welcome, as an admin writes it.
 *
 * ── ONE SCREEN, EDITED IN PLACE ───────────────────────────────────────────────────────────
 *
 * The days are few and short, so they are all on one page: no drawer, no second journey to find
 * what you just changed. Nothing is saved until Save is pressed, and the page says so.
 *
 * ── IT SHOWS WHAT IS MISSING ──────────────────────────────────────────────────────────────
 *
 * A video with no URL is the normal state of a freshly provisioned tenant, so it is marked plainly
 * here and on the student's screen. An admin should never have to guess which welcome videos are
 * still to be recorded.
 *
 * ── THE KEY IS IDENTITY ───────────────────────────────────────────────────────────────────
 *
 * Every item carries a key, and members' progress is stored against it. Editing a title is safe;
 * changing a key makes it a different item and loses what members had done, so the field says so.
 */

const KINDS: { value: OrientationItemKind; label: string; hint: string }[] = [
  { value: 'video', label: 'Video', hint: 'A link to the recording' },
  { value: 'notes', label: 'Notes', hint: 'Text the student reads' },
  { value: 'image', label: 'Image', hint: 'A picture, with a caption' },
  { value: 'checklist', label: 'Checklist', hint: 'Things to go and do' },
  { value: 'recording', label: 'Recording', hint: 'The student records an answer' },
];

const blankItem = (n: number): OrientationItem => ({
  key: `item_${n}`, kind: 'video', title: 'New item', blurb: '', url: '',
  required: true, estimatedMinutes: 5,
});

const AdminOrientation: React.FC = () => {
  const [days, setDays] = useState<OrientationDay[]>([]);
  const [enabled, setEnabled] = useState(true);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [dirty, setDirty] = useState(false);
  const [msg, setMsg] = useState('');
  const [err, setErr] = useState('');

  const load = useCallback(async () => {
    setLoading(true); setErr('');
    try {
      const r = await passportApi.getOrientationProgram();
      setDays(r.days || []); setEnabled(r.enabled !== false); setDirty(false);
    } catch (e: any) {
      setErr(e?.response?.data?.message || 'Could not load orientation.');
    } finally { setLoading(false); }
  }, []);

  useEffect(() => { load(); }, [load]);

  const edit = (fn: (draft: OrientationDay[]) => void) => {
    setDays(prev => {
      const next = JSON.parse(JSON.stringify(prev)) as OrientationDay[];
      fn(next);
      return next;
    });
    setDirty(true); setMsg('');
  };

  const save = async () => {
    setSaving(true); setErr(''); setMsg('');
    try {
      const r = await passportApi.saveOrientationProgram(days, enabled);
      if (!r.ok) { setErr(r.message || 'That could not be saved.'); return; }
      setDays(r.days || days); setDirty(false); setMsg('Saved. Students see this from their next visit.');
    } catch (e: any) {
      setErr(e?.response?.data?.message || 'That could not be saved.');
    } finally { setSaving(false); }
  };

  const reset = async () => {
    if (!window.confirm('Replace this welcome with the one CareerPilot ships? Your edits will be lost.')) return;
    setSaving(true);
    try {
      const r = await passportApi.resetOrientationProgram();
      setDays(r.days || []); setEnabled(r.enabled !== false); setDirty(false);
      setMsg('Back to the shipped welcome.');
    } catch (e: any) {
      setErr(e?.response?.data?.message || 'Could not reset orientation.');
    } finally { setSaving(false); }
  };

  const missingVideos = days.flatMap(d => d.items.filter(i => i.kind === 'video' && !String(i.url || '').trim())).length;

  if (loading) return <div className="aori"><div className="aori-state">Loading orientation…</div></div>;

  return (
    <div className="aori">
      <header className="aori-hd">
        <div>
          <span className="aori-eyebrow">Before day 1</span>
          <h1>Orientation</h1>
          <p>
            The welcome every new member meets before their first learning day. It is not part of the
            {' '}programme's length, and it never affects anyone's Skill DNA or plan.
          </p>
        </div>
        <div className="aori-actions">
          <label className="aori-toggle">
            <input
              type="checkbox"
              checked={enabled}
              onChange={e => { setEnabled(e.target.checked); setDirty(true); }}
            />
            <span>{enabled ? 'On for this college' : 'Off — nobody sees it'}</span>
          </label>
          <button type="button" className="aori-btn" onClick={reset} disabled={saving}>Reset to default</button>
          <button type="button" className="aori-btn primary" onClick={save} disabled={saving || !dirty}>
            {saving ? 'Saving…' : dirty ? 'Save changes' : 'Saved'}
          </button>
        </div>
      </header>

      {!!missingVideos && (
        <p className="aori-warn">
          <i className="bi bi-camera-video-off" /> {missingVideos} video{missingVideos === 1 ? '' : 's'} {missingVideos === 1 ? 'has' : 'have'} no
          link yet. Students are told plainly that it is not ready rather than shown an empty player.
        </p>
      )}
      {err && <p className="aori-err">{err}</p>}
      {msg && <p className="aori-ok">{msg}</p>}

      {days.map((day, di) => (
        <section className="aori-day" key={day.dayNumber}>
          <header>
            <span className="aori-day-n">Day {day.dayNumber}</span>
            <input
              className="aori-title"
              value={day.title}
              onChange={e => edit(d => { d[di].title = e.target.value; })}
              placeholder="What this day is called"
            />
            <button
              type="button" className="aori-x" title="Remove this day"
              onClick={() => edit(d => { d.splice(di, 1); d.forEach((x, i) => { x.dayNumber = i + 1; }); })}
            ><i className="bi bi-trash" /></button>
          </header>
          <input
            className="aori-blurb"
            value={day.blurb || ''}
            onChange={e => edit(d => { d[di].blurb = e.target.value; })}
            placeholder="One line under the title"
          />

          {day.items.map((item, ii) => (
            <div className="aori-item" key={ii}>
              <div className="aori-item-top">
                <select
                  value={item.kind}
                  onChange={e => edit(d => { d[di].items[ii].kind = e.target.value as OrientationItemKind; })}
                >
                  {KINDS.map(k => <option key={k.value} value={k.value}>{k.label}</option>)}
                </select>
                <input
                  className="aori-item-title"
                  value={item.title}
                  onChange={e => edit(d => { d[di].items[ii].title = e.target.value; })}
                  placeholder="Item title"
                />
                <label className="aori-mins">
                  <input
                    type="number" min={0} value={item.estimatedMinutes}
                    onChange={e => edit(d => { d[di].items[ii].estimatedMinutes = Number(e.target.value) || 0; })}
                  />
                  <span>min</span>
                </label>
                <label className="aori-req">
                  <input
                    type="checkbox" checked={item.required}
                    onChange={e => edit(d => { d[di].items[ii].required = e.target.checked; })}
                  />
                  <span>Required</span>
                </label>
                <button
                  type="button" className="aori-x" title="Remove this item"
                  onClick={() => edit(d => { d[di].items.splice(ii, 1); })}
                ><i className="bi bi-x-lg" /></button>
              </div>

              <input
                className="aori-blurb"
                value={item.blurb || ''}
                onChange={e => edit(d => { d[di].items[ii].blurb = e.target.value; })}
                placeholder="A line under the item title (optional)"
              />

              {(item.kind === 'video' || item.kind === 'image') && (
                <input
                  className={`aori-url${String(item.url || '').trim() ? '' : ' empty'}`}
                  value={item.url || ''}
                  onChange={e => edit(d => { d[di].items[ii].url = e.target.value; })}
                  placeholder={item.kind === 'video' ? 'Paste the video link — empty means "not recorded yet"' : 'Paste the image link'}
                />
              )}

              {(item.kind === 'notes' || item.kind === 'recording' || item.kind === 'image') && (
                <textarea
                  className="aori-body"
                  rows={item.kind === 'notes' ? 8 : 3}
                  value={item.body || ''}
                  onChange={e => edit(d => { d[di].items[ii].body = e.target.value; })}
                  placeholder={
                    item.kind === 'notes' ? 'What the student reads. **bold**, `code` and | tables | work.'
                      : item.kind === 'recording' ? 'The question the student answers out loud'
                        : 'A caption for the picture'
                  }
                />
              )}

              {item.kind === 'recording' && (
                <label className="aori-mins wide">
                  <span>Suggested length</span>
                  <input
                    type="number" min={0} value={item.targetSeconds || 60}
                    onChange={e => edit(d => { d[di].items[ii].targetSeconds = Number(e.target.value) || 0; })}
                  />
                  <span>seconds</span>
                </label>
              )}

              {item.kind === 'checklist' && (
                <div className="aori-list">
                  {(item.items || []).map((line, li) => (
                    <div className="aori-line" key={li}>
                      <input
                        value={line}
                        onChange={e => edit(d => { (d[di].items[ii].items as string[])[li] = e.target.value; })}
                      />
                      <button
                        type="button" className="aori-x" title="Remove"
                        onClick={() => edit(d => { (d[di].items[ii].items as string[]).splice(li, 1); })}
                      ><i className="bi bi-x-lg" /></button>
                    </div>
                  ))}
                  <button
                    type="button" className="aori-add"
                    onClick={() => edit(d => {
                      const it = d[di].items[ii];
                      it.items = [...(it.items || []), 'Something to do'];
                    })}
                  ><i className="bi bi-plus-lg" /> Add a line</button>
                </div>
              )}

              <label className="aori-key">
                <span>Key</span>
                <input
                  value={item.key}
                  onChange={e => edit(d => { d[di].items[ii].key = e.target.value.trim(); })}
                />
                <small>Members' progress is stored against this. Change it and they start this item again.</small>
              </label>
            </div>
          ))}

          <button
            type="button" className="aori-add"
            onClick={() => edit(d => { d[di].items.push(blankItem(d[di].items.length + 1)); })}
          ><i className="bi bi-plus-lg" /> Add an item to day {day.dayNumber}</button>
        </section>
      ))}

      <button
        type="button" className="aori-add big"
        onClick={() => edit(d => {
          d.push({ dayNumber: d.length + 1, title: `Day ${d.length + 1}`, blurb: '', items: [blankItem(1)] });
        })}
      ><i className="bi bi-plus-lg" /> Add a day</button>

      <footer className="aori-foot">
        <span>{dirty ? 'You have unsaved changes.' : 'Everything here is saved.'}</span>
        <button type="button" className="aori-btn primary" onClick={save} disabled={saving || !dirty}>
          {saving ? 'Saving…' : 'Save changes'}
        </button>
      </footer>
    </div>
  );
};

export default AdminOrientation;
