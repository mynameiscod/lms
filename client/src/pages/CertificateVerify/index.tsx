import React, { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';

// Public certificate verification — no login required.
const CertificateVerify: React.FC = () => {
  const { code } = useParams<{ code: string }>();
  const [state, setState] = useState<'loading' | 'valid' | 'revoked' | 'invalid'>('loading');
  const [cert, setCert] = useState<any>(null);
  const [reason, setReason] = useState('');

  useEffect(() => {
    (async () => {
      try {
        const r = await fetch(`/api/v1/public/certificate/${encodeURIComponent(code || '')}`);
        const j = await r.json();
        if (!j.found) { setState('invalid'); return; }
        setCert(j.certificate);
        if (j.revoked) { setReason(j.revokedReason || ''); setState('revoked'); }
        else setState('valid');
      } catch { setState('invalid'); }
    })();
  }, [code]);

  const fmt = (d?: string) => d ? new Date(d).toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' }) : '';
  const banner = state === 'valid' ? { bg: '#16a34a', ic: '✓', t: 'Verified Certificate' }
    : state === 'revoked' ? { bg: '#dc2626', ic: '⚠', t: 'Certificate Revoked' }
    : { bg: '#64748b', ic: '✕', t: 'Certificate Not Found' };

  return (
    <div style={{ minHeight: '100vh', background: '#eef2f8', display: 'grid', placeItems: 'center', padding: 20, fontFamily: '"Segoe UI",system-ui,sans-serif' }}>
      <div style={{ width: 520, maxWidth: '100%', background: '#fff', borderRadius: 18, overflow: 'hidden', boxShadow: '0 12px 40px rgba(15,23,42,.12)' }}>
        <div style={{ background: '#0b2f5e', color: '#fff', padding: '18px 22px', fontWeight: 800, letterSpacing: .5 }}>CodeBegun · Certificate Verification</div>

        {state === 'loading' ? (
          <div style={{ padding: 60, textAlign: 'center', color: '#64748b' }}>Verifying…</div>
        ) : (
          <>
            <div style={{ background: banner.bg, color: '#fff', padding: '22px', textAlign: 'center' }}>
              <div style={{ fontSize: 40 }}>{banner.ic}</div>
              <div style={{ fontSize: 20, fontWeight: 800, marginTop: 4 }}>{banner.t}</div>
              {state === 'revoked' && reason && <div style={{ fontSize: 13, opacity: .92, marginTop: 4 }}>{reason}</div>}
            </div>

            {cert ? (
              <div style={{ padding: 24 }}>
                <div style={{ textAlign: 'center', marginBottom: 16 }}>
                  <div style={{ fontSize: 13, color: '#94a3b8', fontWeight: 600 }}>{cert.title}</div>
                  <div style={{ fontSize: 24, fontWeight: 800, color: '#0f172a', marginTop: 2 }}>{cert.studentName}</div>
                  {cert.company && <div style={{ fontSize: 15, color: '#334155', marginTop: 4 }}>{cert.role ? `${cert.role} · ` : ''}<b>{cert.company}</b>{cert.ctc ? ` · ₹${cert.ctc} LPA` : ''}</div>}
                  {cert.score && <div style={{ fontSize: 15, color: '#334155', marginTop: 4 }}>Score: <b>{cert.score}</b></div>}
                </div>
                <div style={{ borderTop: '1px solid #eef1f6', paddingTop: 14, display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, fontSize: 13 }}>
                  <div><div style={{ color: '#94a3b8', fontSize: 11 }}>Certificate No.</div><div style={{ fontWeight: 700, color: '#0f172a' }}>{cert.certificateNumber}</div></div>
                  <div><div style={{ color: '#94a3b8', fontSize: 11 }}>Issued</div><div style={{ fontWeight: 700, color: '#0f172a' }}>{fmt(cert.issuedAt)}</div></div>
                  {cert.department && <div><div style={{ color: '#94a3b8', fontSize: 11 }}>Department</div><div style={{ fontWeight: 700, color: '#0f172a' }}>{cert.department}</div></div>}
                  <div><div style={{ color: '#94a3b8', fontSize: 11 }}>Issued by</div><div style={{ fontWeight: 700, color: '#0f172a' }}>{cert.issuerName}</div></div>
                </div>
              </div>
            ) : (
              <div style={{ padding: 30, textAlign: 'center', color: '#64748b', fontSize: 14 }}>No certificate matches this verification code. It may be mistyped or the certificate does not exist.</div>
            )}
          </>
        )}
        <div style={{ padding: '12px 22px', borderTop: '1px solid #eef1f6', fontSize: 11.5, color: '#94a3b8', textAlign: 'center' }}>Powered by CodeBegun · This page independently verifies the authenticity of the certificate.</div>
      </div>
    </div>
  );
};

export default CertificateVerify;
