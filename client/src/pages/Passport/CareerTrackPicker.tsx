import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { careerTrackApi, MyTracks } from '../../api/passportApi';
import './careerTrackPicker.css';

/**
 * Years 2, 3 and 4: the career track the roadmap is built from (role + language, e.g. Java Full Stack
 * + AI). Read only. The track follows what the member chose in setup — their target role and their
 * one main language — and is fixed once their roadmap is built from it. Changing it goes through
 * Help & Support, so a member cannot hop between tracks and lose the work of the one they were on.
 *
 * `onPicked` is kept for the pages that render this; nothing here picks any more.
 */
const TRACK_YEARS = ['build', 'specialize', 'placement'];

const CareerTrackPicker: React.FC<{ onPicked?: () => void }> = () => {
  const nav = useNavigate();
  const [data, setData] = useState<MyTracks | null>(null);

  useEffect(() => { careerTrackApi.myTracks().then(setData).catch(() => setData(null)); }, []);
  if (!data || !TRACK_YEARS.includes(String(data.stage)) || !data.tracks.length) return null;
  const current = data.tracks.find(t => t.key === data.current) || null;

  if (!current) {
    return (
      <section className="ctp" aria-label="Your career track">
        <div className="ctp-current">
          <i className="bi bi-signpost-2-fill" aria-hidden />
          <div>
            <small>Your track</small>
            <b>Not set yet</b>
            <span className="ctp-desc">Your track comes from the role and the main language you choose in setup — for example Full Stack Developer with Java gives Java Full Stack + AI.</span>
          </div>
          <button type="button" onClick={() => nav('/careerpilot/setup?step=direction')}>Choose role &amp; language</button>
        </div>
      </section>
    );
  }

  return (
    <section className="ctp" aria-label="Your career track">
      <div className="ctp-current">
        <i className="bi bi-signpost-2-fill" aria-hidden />
        <div>
          <small>Your track</small>
          <b>{current.name}</b>
          <span className="ctp-desc">Based on the role and language you chose in setup.{data.fixed ? ' Your roadmap is built from this track.' : ''}</span>
        </div>
        <button type="button" onClick={() => nav('/careerpilot/support/new?module=career_tracks')}>Need a change?</button>
      </div>
    </section>
  );
};

export default CareerTrackPicker;
