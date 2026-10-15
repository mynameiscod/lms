import React, { useEffect, useState } from 'react';
import { careerTrackApi, MyTracks } from '../../api/passportApi';
import { toast } from '../../components/feedback/appFeedback';
import './careerTrackPicker.css';

/**
 * Year 3 and 4: pick the career track the roadmap is built from (role + language, e.g. Java Full
 * Stack + AI). Shown only to a Year-3/4 student while at least one track is open. Picking rebuilds
 * a roadmap they have not started; one already started keeps its days until their mentor rebuilds it.
 */
const TRACK_YEARS = ['specialize', 'placement'];

const CareerTrackPicker: React.FC<{ onPicked?: () => void }> = ({ onPicked }) => {
  const [data, setData] = useState<MyTracks | null>(null);
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState('');
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);

  useEffect(() => { careerTrackApi.myTracks().then(setData).catch(() => setData(null)); }, []);
  if (!data || !TRACK_YEARS.includes(String(data.stage)) || !data.tracks.length) return null;
  const current = data.tracks.find(t => t.key === data.current) || null;
  const choosing = !current || open;

  const pick = async (key: string) => {
    setBusy(key); setMsg(null);
    try {
      const r = await careerTrackApi.pickMyTrack(key);
      if (!r.ok) { setMsg({ ok: false, text: r.message || 'Your track was not saved.' }); return; }
      setData({ ...data, current: key });
      setOpen(false);
      // A toast, not the inline message: onPicked reloads the page around this picker, which
      // would wipe an inline confirmation before anyone read it.
      toast(r.rebuilt ? 'Your roadmap has been rebuilt for this track.' : 'Saved. Your roadmap follows this track.');
      onPicked?.();
    } catch {
      setMsg({ ok: false, text: 'Your track was not saved. Please try again.' });
    } finally { setBusy(''); }
  };

  return (
    <section className={`ctp${choosing ? ' choosing' : ''}`} aria-label="Your career track">
      {!choosing ? (
        <div className="ctp-current">
          <i className="bi bi-signpost-2-fill" aria-hidden />
          <div><small>Your track</small><b>{current!.name}</b></div>
          <button type="button" onClick={() => setOpen(true)}>Change</button>
        </div>
      ) : (
        <>
          <div className="ctp-hd">
            <b>{current ? 'Change your track' : 'Choose your track'}</b>
            <span>Your roadmap is built only from the track you pick: its skills, its projects and its interview preparation.</span>
          </div>
          <div className="ctp-grid">
            {data.tracks.map(t => (
              <button key={t.key} type="button" className={`ctp-card${t.key === data.current ? ' on' : ''}`} disabled={!!busy} onClick={() => pick(t.key)}>
                <b>{t.name}</b>
                <span className="ctp-lang">{t.language}</span>
                {t.description && <span className="ctp-desc">{t.description}</span>}
                <span className="ctp-go">{busy === t.key ? 'Saving…' : t.key === data.current ? 'Your track' : 'Choose'}</span>
              </button>
            ))}
          </div>
          {current && <button type="button" className="ctp-cancel" onClick={() => setOpen(false)}>Keep {current.name}</button>}
        </>
      )}
      {msg && <p className={`ctp-msg ${msg.ok ? 'ok' : 'err'}`}>{msg.text}</p>}
    </section>
  );
};

export default CareerTrackPicker;
