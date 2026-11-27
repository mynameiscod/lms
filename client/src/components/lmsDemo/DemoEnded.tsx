import React, { useState } from 'react';
import { lmsDemoApi, DemoMe } from '../../api/lmsDemoApi';

/** The only screen a demo student sees once the demo is over: what they did, and "Talk to a counsellor". */
export default function DemoEnded({ me, onTalk, onMoreTime }: { me: DemoMe; onTalk: () => void; onMoreTime: () => void }) {
  const [asked, setAsked] = useState(!!me.moreTimeRequestedAt);
  const courses = me.courses || [];
  const items = courses.reduce((a, c) => a + (c.itemsDone || 0), 0);
  const days = courses.reduce((a, c) => a + (c.daysDone || 0), 0);
  const tried = courses.filter(c => (c.itemsDone || 0) > 0).length;

  const askMore = async () => {
    try { await lmsDemoApi.moreTime(); } catch { /* the request is best effort */ }
    setAsked(true);
    onMoreTime();
  };

  return (
    <div className="dsh-end">
      <div className="dsh-end-hero">
        <span className="dsh-end-badge"><i className="bi bi-trophy-fill" /></span>
        <h1>Your demo is complete{me.firstName ? `, ${me.firstName}` : ''} 🎉</h1>
        <p>Thanks for learning with CodeBegun. Here is what you did.</p>
        <div className="dsh-end-stats">
          <div><b>{items}</b><span>lesson{items === 1 ? '' : 's'} finished</span></div>
          <div><b>{days}</b><span>day{days === 1 ? '' : 's'} completed</span></div>
          <div><b>{tried}</b><span>course{tried === 1 ? '' : 's'} explored</span></div>
        </div>
      </div>
      <div className="dsh-end-card">
        <h2>Ready to keep going?</h2>
        <p>{me.counsellor?.message || 'Our counsellor will help you pick the right course, the batch timings and the fee plan that suits you.'}</p>
        <button type="button" className="dsh-btn navy big" onClick={onTalk}><i className="bi bi-headset" /> Talk to a counsellor</button>
        {asked
          ? <p className="dsh-end-note"><i className="bi bi-check-circle" /> We've asked our team to give you more time. They'll be in touch.</p>
          : <button type="button" className="dsh-link" onClick={askMore}>Need a little more time? Ask for it</button>}
      </div>
    </div>
  );
}
