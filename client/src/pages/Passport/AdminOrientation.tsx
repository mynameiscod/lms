import React, { useCallback, useEffect, useState } from 'react';
import passportApi, { AuthoredOrientationDay, OrientationItem, OrientationItemKind } from '../../api/passportApi';
import './adminOrientation.css';
import { mediaPathFor } from '../../utils/mediaUrl';

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

const KIND_ICON: Record<string, string> = {
  video: 'bi-play-btn', notes: 'bi-journal-text', image: 'bi-image', checklist: 'bi-list-check', recording: 'bi-mic',
};

const blankItem = (n: number): OrientationItem => ({
  key: `item_${n}`, kind: 'video', title: 'New item', blurb: '', url: '',
  required: true, estimatedMinutes: 5,
});

/**
 * Upload a welcome-day video or image, and put its URL in the field beside it.
 *
 * ── WHY THIS IS A URL AND NOT AN ATTACHMENT ───────────────────────────────────────────────
 *
 * An orientation item already has one way to carry media — `url` — and the day, the player and
 * the ninety-per-cent watched gate all read it. Giving an uploaded file a second, parallel field
 * would mean every one of those learning which to prefer, and the first place that forgot would
 * be a welcome video that silently stopped playing. So the upload fills the existing box: after
 * it, a recording and a YouTube link are indistinguishable to everything downstream.
 *
 * ── THE LINK HAS TO OUTLIVE A SESSION ─────────────────────────────────────────────────────
 *
 * It points at `/skill-resources/media/`, which serves images and video by plain URL with range
 * requests and no ticket. The ticketed route next to it expires in ten minutes — fine for a
 * handout somebody opens now, useless for a URL stored on a day and replayed for a year.
 */
const MediaUploadButton: React.FC<{
  kind: 'video' | 'image';
  onUploaded: (url: string) => void;
  onError: (m: string) => void;
}> = ({ kind, onUploaded, onError }) => {
  const [busy, setBusy] = useState(false);
  const accept = kind === 'video'
    ? 'video/mp4,video/webm,video/quicktime,.mp4,.webm,.mov,.m4v'
    : 'image/png,image/jpeg,image/gif,image/webp';

  const pick = async (file: File) => {
    setBusy(true); onError('');
    try {
      const { attachment } = await passportApi.uploadAttachment(file);
      onUploaded(mediaPathFor(attachment.fileKey));
    } catch (e: any) {
      onError(e?.response?.data?.message || 'That file could not be uploaded.');
    }
    setBusy(false);
  };

  return (
    <label className={`aori-upload${busy ? ' busy' : ''}`}>
      <i className={busy ? 'bi bi-arrow-repeat' : 'bi bi-upload'} />
      {busy ? 'Uploading…' : `Upload ${kind}`}
      <input type="file" accept={accept} hidden disabled={busy}
        onChange={e => { const f = e.target.files?.[0]; e.target.value = ''; if (f) pick(f); }} />
    </label>
  );
};

const AdminOrientation: React.FC = () => {
  const [days, setDays] = useState<AuthoredOrientationDay[]>([]);
  const [enabled, setEnabled] = useState(true);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [dirty, setDirty] = useState(false);
  const [msg, setMsg] = useState('');
  const [err, setErr] = useState('');
  const [openDay, setOpenDay] = useState(0);
  const [openItem, setOpenItem] = useState<number | null>(null);

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

  const edit = (fn: (draft: AuthoredOrientationDay[]) => void) => {
    setDays(prev => {
      const next = JSON.parse(JSON.stringify(prev)) as AuthoredOrientationDay[];
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

  const dayMinutes = (d: AuthoredOrientationDay) => d.items.reduce((s, i) => s + (Number(i.estimatedMinutes) || 0), 0);
  const dayMissing = (d: AuthoredOrientationDay) => d.items.filter(i => i.kind === 'video' && !String(i.url || '').trim()).length;
  const totalItems = days.reduce((s, d) => s + d.items.length, 0);
  const totalMinutes = days.reduce((s, d) => s + dayMinutes(d), 0);
  const di = Math.min(openDay, Math.max(0, days.length - 1));
  const day = days[di];

  if (loading) return <div className="aori"><div className="aori-state">Loading orientation…</div></div>;

  return (
    <div className="aori">
      <header className="cpx-head">
        <div>
          <span className="cpx-eyebrow">Before day 1</span>
          <h1>Orientation</h1>
          <p>
            The welcome every new member meets before their first learning day. It is not part of the
            {' '}programme's length, and it never affects anyone's Skill DNA or plan.
          </p>
        </div>
        <div className="aori-actions">
          <label className={`aori-switch${enabled ? ' on' : ''}`}>
            <input
              type="checkbox" role="switch" aria-checked={enabled}
              checked={enabled}
              onChange={e => { setEnabled(e.target.checked); setDirty(true); }}
            />
            <span className="track" aria-hidden="true"><span /></span>
            <span>{enabled ? 'On for this college' : 'Off — nobody sees it'}</span>
          </label>
          <button type="button" className="cpx-btn" onClick={reset} disabled={saving}><i className="bi bi-arrow-counterclockwise" /> Reset to default</button>
        </div>
      </header>

      <div className="aori-summary">
        <div><b>{days.length}</b><span>day{days.length === 1 ? '' : 's'}</span></div>
        <div><b>{totalItems}</b><span>item{totalItems === 1 ? '' : 's'}</span></div>
        <div><b>{totalMinutes}</b><span>minutes in all</span></div>
        <div className={missingVideos ? 'warn' : 'ok'}>
          <b>{missingVideos}</b><span>{missingVideos === 1 ? 'video has no link yet' : 'videos with no link yet'}</span>
        </div>
      </div>

      {!!missingVideos && (
        <p className="aori-warn">
          <i className="bi bi-camera-video-off" /> Students are told plainly that a video is not ready rather than shown an empty player.
        </p>
      )}
      {err && <p className="aori-err"><i className="bi bi-exclamation-circle" /> {err}</p>}
      {msg && <p className="aori-ok"><i className="bi bi-check-circle" /> {msg}</p>}

      {/* The days, as cards: what each one is called, how long it takes, and what it still needs. */}
      <div className="aori-days" role="tablist" aria-label="Orientation days">
        {days.map((d, i) => {
          const miss = dayMissing(d);
          return (
            <button
              key={d.dayNumber} type="button" role="tab" aria-selected={i === di}
              className={`aori-daycard${i === di ? ' on' : ''}`}
              onClick={() => { setOpenDay(i); setOpenItem(null); }}
            >
              <span className="aori-daycard-n">Day {d.dayNumber}</span>
              <b>{d.title || 'Untitled day'}</b>
              <small>{d.items.length} item{d.items.length === 1 ? '' : 's'} · {dayMinutes(d)} min</small>
              {miss > 0 && <em><i className="bi bi-camera-video-off" /> {miss} video{miss === 1 ? '' : 's'} missing</em>}
            </button>
          );
        })}
        <button
          type="button" className="aori-daycard add"
          onClick={() => {
            edit(d => { d.push({ dayNumber: d.length + 1, title: `Day ${d.length + 1}`, blurb: '', items: [blankItem(1)] }); });
            setOpenDay(days.length); setOpenItem(0);
          }}
        ><i className="bi bi-plus-lg" /> Add a day</button>
      </div>

      {day && (
        <section className="aori-day" aria-label={`Day ${day.dayNumber}`}>
          <div className="aori-day-head">
            <span className="aori-day-n">Day {day.dayNumber}</span>
            <div className="aori-day-fields">
              <label>
                <span>Day title</span>
                <input
                  className="aori-title"
                  value={day.title}
                  onChange={e => edit(d => { d[di].title = e.target.value; })}
                  placeholder="What this day is called"
                />
              </label>
              <label>
                <span>Subtitle</span>
                <input
                  className="aori-blurb"
                  value={day.blurb || ''}
                  onChange={e => edit(d => { d[di].blurb = e.target.value; })}
                  placeholder="One line under the title"
                />
              </label>
            </div>
            <button
              type="button" className="cpx-btn aori-del"
              onClick={() => {
                if (!window.confirm(`Delete Day ${day.dayNumber} and its ${day.items.length} item(s)?`)) return;
                edit(d => { d.splice(di, 1); d.forEach((x, i) => { x.dayNumber = i + 1; }); });
                setOpenDay(Math.max(0, di - 1)); setOpenItem(null);
              }}
            ><i className="bi bi-trash" /> Delete day</button>
          </div>

          <div className="aori-items-hd">
            <h2>What the member does on day {day.dayNumber}</h2>
            <span>{day.items.length} item{day.items.length === 1 ? '' : 's'} · {dayMinutes(day)} min · click one to edit it</span>
          </div>

          {day.items.map((item, ii) => {
            const open = openItem === ii;
            const kind = KINDS.find(k => k.value === item.kind);
            const noLink = item.kind === 'video' && !String(item.url || '').trim();
            return (
              <div className={`aori-item${open ? ' open' : ''}`} key={ii}>
                <button type="button" className="aori-item-row" aria-expanded={open} onClick={() => setOpenItem(open ? null : ii)}>
                  <span className={`aori-kind k-${item.kind}`} aria-hidden="true"><i className={`bi ${KIND_ICON[item.kind] || 'bi-journal-text'}`} /></span>
                  <span className="aori-item-name">
                    <b>{item.title || 'Untitled item'}</b>
                    <small>{kind?.label || item.kind} · {item.estimatedMinutes || 0} min{item.blurb ? ` · ${item.blurb}` : ''}</small>
                  </span>
                  {noLink && <span className="aori-pill warn">No video yet</span>}
                  <span className={`aori-pill ${item.required ? 'req' : 'opt'}`}>{item.required ? 'Required' : 'Optional'}</span>
                  <i className={`bi ${open ? 'bi-chevron-up' : 'bi-chevron-down'} aori-chev`} aria-hidden="true" />
                </button>

                {open && (
                  <div className="aori-item-body">
                    <div className="aori-grid">
                      <label className="span2">
                        <span>Title</span>
                        <input
                          className="aori-item-title"
                          value={item.title}
                          onChange={e => edit(d => { d[di].items[ii].title = e.target.value; })}
                          placeholder="Item title"
                        />
                      </label>
                      <label>
                        <span>Type</span>
                        <select
                          value={item.kind}
                          onChange={e => edit(d => { d[di].items[ii].kind = e.target.value as OrientationItemKind; })}
                        >
                          {KINDS.map(k => <option key={k.value} value={k.value}>{k.label} — {k.hint}</option>)}
                        </select>
                      </label>
                      <label>
                        <span>Minutes</span>
                        <input
                          type="number" min={0} value={item.estimatedMinutes}
                          onChange={e => edit(d => { d[di].items[ii].estimatedMinutes = Number(e.target.value) || 0; })}
                        />
                      </label>
                      <label className="span4">
                        <span>Line under the title (optional)</span>
                        <input
                          className="aori-blurb"
                          value={item.blurb || ''}
                          onChange={e => edit(d => { d[di].items[ii].blurb = e.target.value; })}
                          placeholder="A line under the item title"
                        />
                      </label>
                    </div>

                    {(item.kind === 'video' || item.kind === 'image') && (
                      <label className="aori-field">
                        <span>{item.kind === 'video' ? 'Video' : 'Image'}</span>
                        <div className="aori-media">
                          <input
                            className={`aori-url${String(item.url || '').trim() ? '' : ' empty'}`}
                            value={item.url || ''}
                            onChange={e => edit(d => { d[di].items[ii].url = e.target.value; })}
                            placeholder={item.kind === 'video' ? 'Paste a link, or upload a file — empty means "not recorded yet"' : 'Paste a link, or upload an image'}
                          />
                          {/* The field stays a URL box. An upload simply FILLS it, so a recording and a
                              YouTube link are the same thing to everything downstream — the day, the
                              player and the 90%-watched gate all read `url` and neither knows nor cares
                              which way it got there. */}
                          <MediaUploadButton
                            kind={item.kind as 'video' | 'image'}
                            onUploaded={u => edit(d => { d[di].items[ii].url = u; })}
                            onError={setErr}
                          />
                        </div>
                      </label>
                    )}

                    {(item.kind === 'notes' || item.kind === 'recording' || item.kind === 'image') && (
                      <label className="aori-field">
                        <span>{item.kind === 'notes' ? 'What the student reads' : item.kind === 'recording' ? 'The question they answer out loud' : 'Caption'}</span>
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
                      </label>
                    )}

                    {item.kind === 'recording' && (
                      <label className="aori-inline">
                        <span>Suggested length</span>
                        <input
                          type="number" min={0} value={item.targetSeconds || 60}
                          onChange={e => edit(d => { d[di].items[ii].targetSeconds = Number(e.target.value) || 0; })}
                        />
                        <span>seconds</span>
                      </label>
                    )}

                    {item.kind === 'checklist' && (
                      <div className="aori-field">
                        <span>Checklist</span>
                        <div className="aori-list">
                          {(item.items || []).map((line, li) => (
                            <div className="aori-line" key={li}>
                              <i className="bi bi-check2-square" aria-hidden="true" />
                              <input
                                aria-label={`Checklist line ${li + 1}`}
                                value={line}
                                onChange={e => edit(d => { (d[di].items[ii].items as string[])[li] = e.target.value; })}
                              />
                              <button
                                type="button" className="aori-x" title="Remove this line" aria-label="Remove this line"
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
                      </div>
                    )}

                    <div className="aori-item-foot">
                      <label className="aori-check">
                        <input
                          type="checkbox" checked={item.required}
                          onChange={e => edit(d => { d[di].items[ii].required = e.target.checked; })}
                        />
                        <span>Required to finish the day</span>
                      </label>
                      <label className="aori-key">
                        <span>Key</span>
                        <input
                          value={item.key}
                          onChange={e => edit(d => { d[di].items[ii].key = e.target.value.trim(); })}
                        />
                        <small>Members' progress is stored against this. Change it and they start this item again.</small>
                      </label>
                      <button
                        type="button" className="cpx-btn aori-del"
                        onClick={() => { edit(d => { d[di].items.splice(ii, 1); }); setOpenItem(null); }}
                      ><i className="bi bi-trash" /> Remove item</button>
                    </div>
                  </div>
                )}
              </div>
            );
          })}

          <button
            type="button" className="aori-add"
            onClick={() => { edit(d => { d[di].items.push(blankItem(d[di].items.length + 1)); }); setOpenItem(day.items.length); }}
          ><i className="bi bi-plus-lg" /> Add an item to day {day.dayNumber}</button>
        </section>
      )}

      <div className="cpx-savebar">
        <span className={`aori-state-note${dirty ? ' dirty' : ''}`}>
          <i className={`bi ${dirty ? 'bi-pencil-square' : 'bi-check-circle'}`} /> {dirty ? 'You have unsaved changes.' : 'Everything here is saved.'}
        </span>
        <span className="cpx-grow" />
        <button type="button" className="cpx-btn primary" onClick={save} disabled={saving || !dirty}>
          <i className="bi bi-floppy" /> {saving ? 'Saving…' : 'Save changes'}
        </button>
      </div>
    </div>
  );
};

export default AdminOrientation;
