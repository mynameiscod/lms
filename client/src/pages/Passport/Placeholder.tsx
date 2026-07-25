import React from 'react';

/** Shell for Passport admin tabs still being built (Pathways / Assessment / Missions). */
const PassportPlaceholder: React.FC<{ title: string; step: string }> = ({ title, step }) => (
  <div style={{ padding: '22px 26px', maxWidth: 900 }}>
    <div style={{ fontSize: 13, color: '#94a3b8', marginBottom: 8 }}>Career Passport <span style={{ color: '#cbd5e1' }}>›</span> <b style={{ color: '#334155' }}>{title}</b></div>
    <h1 style={{ fontSize: 24, fontWeight: 800, color: '#0f172a', margin: '0 0 8px' }}>{title}</h1>
    <div style={{ background: '#eef2ff', border: '1px solid #c7d2fe', borderRadius: 14, padding: '28px 24px', color: '#3730a3', fontSize: 14, lineHeight: 1.7 }}>
      🚧 <b>Coming in {step}.</b> The foundation is live; this admin area is being built next and will appear here without another deploy dance.
    </div>
  </div>
);

export default PassportPlaceholder;
