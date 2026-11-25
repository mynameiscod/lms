import React, { useEffect, useRef, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { studentRulesApi, CheckInResult, deviceId } from '../../api/studentRulesApi';

/**
 * Where a student lands after scanning the classroom QR code with their phone camera. Marks them
 * present (or checked out) straight away. Asks for the phone's location only if the institute
 * requires it.
 */

type State =
  | { kind: 'working'; text: string }
  | { kind: 'done'; result: CheckInResult }
  | { kind: 'error'; text: string; code?: string };

const getLocation = () => new Promise<{ lat: number; lng: number }>((ok, bad) => {
  if (!navigator.geolocation) { bad(new Error('This phone’s browser cannot share its location.')); return; }
  navigator.geolocation.getCurrentPosition(
    (p) => ok({ lat: p.coords.latitude, lng: p.coords.longitude }),
    (e) => bad(new Error(e.code === 1 ? 'Location access was refused. Allow location for this site in your browser settings, then scan again.' : 'Could not read your location. Turn on location and scan again.')),
    { enableHighAccuracy: true, timeout: 15000, maximumAge: 0 },
  );
});

const AttendanceCheckIn: React.FC = () => {
  const [params] = useSearchParams();
  const token = params.get('t') || '';
  const { isAuthenticated, loading, user } = useAuth();
  const [state, setState] = useState<State>({ kind: 'working', text: 'Checking you in…' });
  const started = useRef(false);

  useEffect(() => {
    if (loading || !isAuthenticated || started.current) return;
    if (!token) { setState({ kind: 'error', text: 'This link has no attendance code. Scan the QR code on the classroom screen.' }); return; }
    started.current = true;
    (async () => {
      const send = (extra: { lat?: number; lng?: number } = {}) => studentRulesApi.checkIn({ token, deviceId: deviceId(), ...extra });
      try {
        setState({ kind: 'done', result: await send() });
      } catch (e: any) {
        const code = e?.response?.data?.code;
        if (code === 'NEED_LOCATION') {
          setState({ kind: 'working', text: 'Confirming you are in the office… allow location if your phone asks.' });
          try {
            const loc = await getLocation();
            setState({ kind: 'done', result: await send(loc) });
          } catch (e2: any) {
            setState({ kind: 'error', text: e2?.response?.data?.message || e2?.message || 'Could not check you in.', code: e2?.response?.data?.code });
          }
          return;
        }
        setState({ kind: 'error', text: e?.response?.data?.message || 'Could not check you in. Scan the code again.', code });
      }
    })();
  }, [loading, isAuthenticated, token]);

  const card: React.CSSProperties = { maxWidth: 420, margin: '10vh auto 0', background: '#fff', borderRadius: 18, padding: '32px 24px', textAlign: 'center', boxShadow: '0 10px 40px rgba(15,23,42,.12)' };
  const wrap: React.CSSProperties = { minHeight: '100vh', background: '#f1f5f9', padding: 16, fontFamily: 'inherit' };

  if (loading) return <div style={wrap}><div style={card}>Loading…</div></div>;

  if (!isAuthenticated) {
    return (
      <div style={wrap}>
        <div style={card}>
          <div style={{ fontSize: 44 }}>🔐</div>
          <h2 style={{ margin: '8px 0' }}>Log in first</h2>
          <p style={{ color: '#475569' }}>Log in to the LMS on this phone, then scan the code on the classroom screen again. The code changes every few seconds, so an old scan will not work.</p>
          <Link to="/login" style={{ display: 'inline-block', marginTop: 10, background: '#2563eb', color: '#fff', padding: '10px 22px', borderRadius: 10, textDecoration: 'none', fontWeight: 600 }}>Log in</Link>
        </div>
      </div>
    );
  }

  return (
    <div style={wrap}>
      <div style={card}>
        {state.kind === 'working' && <>
          <div style={{ fontSize: 44 }}>⏳</div>
          <h2 style={{ margin: '8px 0' }}>{state.text}</h2>
        </>}
        {state.kind === 'done' && (() => {
          const r = state.result;
          const icon = r.action === 'in' ? (r.late ? '🟡' : '✅') : r.action === 'out' ? '👋' : 'ℹ️';
          const title = r.action === 'in' ? `Checked in at ${r.time}` : r.action === 'out' ? `Checked out at ${r.time}` : 'Already done';
          return <>
            <div style={{ fontSize: 56 }}>{icon}</div>
            <h2 style={{ margin: '8px 0' }}>{title}</h2>
            <p style={{ color: '#475569' }}>
              {r.action === 'in' && <>{r.late ? 'You are marked present, but late today.' : `You are marked present, ${r.name || user?.firstName || ''}.`}{r.checkOutExpected ? ' Remember to scan again when you leave.' : ''}</>}
              {r.action === 'out' && <>See you tomorrow! You were in from {r.inTime} to {r.time}.</>}
              {r.action === 'already' && r.message}
            </p>
          </>;
        })()}
        {state.kind === 'error' && <>
          <div style={{ fontSize: 52 }}>{state.code === 'TOO_EARLY' ? '⏰' : '⚠️'}</div>
          <h2 style={{ margin: '8px 0' }}>{state.code === 'TOO_EARLY' ? 'Too early to check out' : 'Not checked in'}</h2>
          <p style={{ color: '#475569' }}>{state.text}</p>
        </>}
        <Link to="/my-attendance" style={{ display: 'inline-block', marginTop: 14, color: '#2563eb', textDecoration: 'none', fontWeight: 600 }}>My attendance →</Link>
      </div>
    </div>
  );
};

export default AttendanceCheckIn;
