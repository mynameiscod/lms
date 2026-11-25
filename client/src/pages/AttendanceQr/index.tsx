import React, { useCallback, useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { studentRulesApi, QrScreen } from '../../api/studentRulesApi';
import { batchApi } from '../../api';

/**
 * The QR check-in screen — opened full screen on the classroom TV, projector or trainer's laptop.
 * The code changes every few seconds; it also tells the server which internet connection the office
 * is on right now (the "same Wi-Fi as the screen" check), so keep this open while students check in.
 */
const AttendanceQrScreen: React.FC = () => {
  const [batches, setBatches] = useState<{ _id: string; name: string }[]>([]);
  const [batchId, setBatchId] = useState(() => localStorage.getItem('attendance.qrBatch') || '');
  const [qr, setQr] = useState<QrScreen | null>(null);
  const [err, setErr] = useState('');
  const [left, setLeft] = useState(0);
  const timer = useRef<any>();
  const tick = useRef<any>();
  const nextAt = useRef(0);

  useEffect(() => {
    batchApi.getBatches()
      .then((r: any) => setBatches(((r?.data || r?.batches || r) as any[] || []).filter((b: any) => b?.isActive !== false).map((b: any) => ({ _id: b._id, name: b.name }))))
      .catch(() => setBatches([]));
  }, []);

  const load = useCallback(async () => {
    clearTimeout(timer.current);
    try {
      const r = await studentRulesApi.qr(batchId);
      setQr(r);
      setErr('');
      nextAt.current = Date.now() + r.refreshInMs;
      timer.current = setTimeout(load, Math.max(1000, r.refreshInMs + 150));
    } catch (e: any) {
      setErr(e?.response?.data?.message || 'Could not load the QR code. Retrying…');
      timer.current = setTimeout(load, 5000);
    }
  }, [batchId]);

  useEffect(() => {
    load();
    tick.current = setInterval(() => setLeft(Math.max(0, Math.ceil((nextAt.current - Date.now()) / 1000))), 250);
    return () => { clearTimeout(timer.current); clearInterval(tick.current); };
  }, [load]);

  const fullscreen = () => { document.documentElement.requestFullscreen?.().catch(() => undefined); };

  return (
    <div style={{ minHeight: '100vh', background: '#0f172a', color: '#f8fafc', display: 'flex', flexDirection: 'column', alignItems: 'center', padding: 24, fontFamily: 'inherit' }}>
      <div style={{ width: '100%', maxWidth: 1100, display: 'flex', gap: 12, alignItems: 'center', flexWrap: 'wrap' }}>
        <Link to="/attendance" style={{ color: '#94a3b8', textDecoration: 'none' }}><i className="fa-solid fa-arrow-left" /> Attendance</Link>
        <span style={{ flex: 1 }} />
        <select value={batchId} onChange={(e) => { setBatchId(e.target.value); localStorage.setItem('attendance.qrBatch', e.target.value); }}
          style={{ background: '#1e293b', color: '#f8fafc', border: '1px solid #334155', borderRadius: 8, padding: '8px 10px' }}>
          <option value="">All batches (each student's own batch)</option>
          {batches.map((b) => <option key={b._id} value={b._id}>{b.name}</option>)}
        </select>
        <button onClick={fullscreen} style={{ background: '#1e293b', color: '#f8fafc', border: '1px solid #334155', borderRadius: 8, padding: '8px 12px', cursor: 'pointer' }}>
          <i className="fa-solid fa-expand" /> Full screen
        </button>
      </div>

      <h1 style={{ margin: '28px 0 4px', fontSize: 34, fontWeight: 800, textAlign: 'center' }}>Scan to mark your attendance</h1>
      <p style={{ margin: 0, color: '#cbd5e1', fontSize: 18, textAlign: 'center' }}>
        Open your phone camera, point it at the code{qr?.checks.sameNetworkAsScreen || qr?.checks.savedNetworks ? ' — stay on the office Wi-Fi, not mobile data' : ''}.
        {qr?.checkOut ? ' Scan again when you leave.' : ''}
      </p>

      <div style={{ marginTop: 24, background: '#fff', borderRadius: 20, padding: 18, width: 'min(70vh, 86vw)', aspectRatio: '1 / 1', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        {qr ? <div style={{ width: '100%', height: '100%' }} dangerouslySetInnerHTML={{ __html: qr.svg.replace('<svg', '<svg width="100%" height="100%"') }} />
          : <span style={{ color: '#475569' }}>{err || 'Loading…'}</span>}
      </div>

      {qr && (
        <div style={{ marginTop: 16, display: 'flex', gap: 28, alignItems: 'center', fontSize: 18, flexWrap: 'wrap', justifyContent: 'center' }}>
          <span style={{ color: '#94a3b8' }}>{qr.batchName}</span>
          <span><i className="fa-solid fa-rotate" /> New code in {left}s</span>
          <span style={{ color: '#4ade80' }}><i className="fa-solid fa-right-to-bracket" /> {qr.checkedIn} checked in today</span>
          {qr.checkOut && <span style={{ color: '#fbbf24' }}><i className="fa-solid fa-right-from-bracket" /> {qr.checkedOut} checked out</span>}
        </div>
      )}
      {err && qr && <div style={{ marginTop: 10, color: '#fca5a5' }}>{err}</div>}
      <p style={{ marginTop: 'auto', paddingTop: 24, color: '#64748b', fontSize: 13, textAlign: 'center' }}>
        Keep this screen open while students check in. It must run on a computer connected to the office internet.
      </p>
    </div>
  );
};

export default AttendanceQrScreen;
