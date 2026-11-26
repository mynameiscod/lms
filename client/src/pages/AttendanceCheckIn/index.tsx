import React, { useCallback, useEffect, useRef, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { studentRulesApi, CheckInResult, deviceId } from '../../api/studentRulesApi';

/**
 * Where a student lands after scanning the classroom QR code with their phone camera. Marks them
 * present (or checked out) straight away. Asks for the phone's location only if the institute
 * requires it.
 *
 * The code on the screen changes every few seconds, so the first thing this page does — before
 * login, before anything else loads — is swap it for a 15-minute ticket (public /scan). That way a
 * slow phone, or a student who has to log in first (on iPhone the camera opens Safari, which is
 * often not where they are logged in), still checks in with the code they scanned. "Try again"
 * reuses the ticket, so after switching to the office Wi-Fi there is no need to scan again.
 */

type State =
  | { kind: 'working'; text: string }
  | { kind: 'done'; result: CheckInResult }
  | { kind: 'error'; text: string; code?: string };

const isIos = () => /iPhone|iPad|iPod/i.test(navigator.userAgent) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);

const getLocation = () => new Promise<{ lat: number; lng: number }>((ok, bad) => {
  if (!navigator.geolocation) { bad(new Error('This phone’s browser cannot share its location.')); return; }
  navigator.geolocation.getCurrentPosition(
    (p) => ok({ lat: p.coords.latitude, lng: p.coords.longitude }),
    (e) => bad(new Error(e.code === 1
      ? (isIos()
        ? 'Location access was refused. On iPhone: Settings → Privacy & Security → Location Services → Safari Websites → "While Using", then tap Try again.'
        : 'Location access was refused. Allow location for this site in your browser settings, then tap Try again.')
      : 'Could not read your location. Turn on location and tap Try again.')),
    { enableHighAccuracy: true, timeout: 15000, maximumAge: 0 },
  );
});

const errOf = (e: any): { text: string; code?: string } => {
  const code = e?.response?.data?.code;
  if (!e?.response) return { text: e?.message && !/network/i.test(e.message) ? e.message : 'No internet connection. Check that your phone is connected to the office Wi-Fi, then tap Try again.', code: e?.message ? undefined : 'OFFLINE' };
  return { text: e.response.data?.message || 'Could not check you in. Tap Try again.', code };
};

const AttendanceCheckIn: React.FC = () => {
  const [params, setParams] = useSearchParams();
  const scanned = params.get('t') || '';
  const { isAuthenticated, loading, user } = useAuth();
  const [ticket, setTicket] = useState<string>(scanned.startsWith('k.') ? scanned : '');
  const [ticketErr, setTicketErr] = useState<{ text: string; code?: string } | null>(null);
  const [state, setState] = useState<State>({ kind: 'working', text: 'Checking you in…' });
  const started = useRef(false);

  // 1. Turn the scanned code into a ticket at once, logged in or not.
  useEffect(() => {
    if (!scanned) return;
    if (scanned.startsWith('k.')) { setTicket(scanned); return; }
    let alive = true;
    studentRulesApi.scan(scanned)
      .then(({ ticket: tk }) => {
        if (!alive) return;
        setTicket(tk);
        // Keep the ticket in the address, so a reload or the trip through the login page keeps it.
        setParams({ t: tk }, { replace: true });
      })
      .catch((e) => { if (alive) setTicketErr(errOf(e)); });
    return () => { alive = false; };
  }, [scanned, setParams]);

  const run = useCallback(async () => {
    if (!ticket) return;
    const send = (extra: { lat?: number; lng?: number } = {}) => studentRulesApi.checkIn({ token: ticket, deviceId: deviceId(), ...extra });
    setState({ kind: 'working', text: 'Checking you in…' });
    try {
      setState({ kind: 'done', result: await send() });
    } catch (e: any) {
      const er = errOf(e);
      if (er.code === 'NEED_LOCATION') {
        setState({ kind: 'working', text: 'Confirming you are in the office… allow location if your phone asks.' });
        try {
          const loc = await getLocation();
          setState({ kind: 'done', result: await send(loc) });
        } catch (e2: any) {
          setState({ kind: 'error', ...errOf(e2) });
        }
        return;
      }
      setState({ kind: 'error', ...er });
    }
  }, [ticket]);

  // 2. Once logged in and the ticket is ready, check in.
  useEffect(() => {
    if (loading || !isAuthenticated || started.current) return;
    if (!scanned) { setState({ kind: 'error', text: 'This link has no attendance code. Scan the QR code on the classroom screen.' }); return; }
    if (ticketErr) { setState({ kind: 'error', ...ticketErr }); return; }
    if (!ticket) return;
    started.current = true;
    run();
  }, [loading, isAuthenticated, scanned, ticket, ticketErr, run]);

  const card: React.CSSProperties = { maxWidth: 420, margin: '8vh auto 0', background: '#fff', borderRadius: 18, padding: '28px 22px', textAlign: 'center', boxShadow: '0 10px 40px rgba(15,23,42,.12)' };
  const wrap: React.CSSProperties = { minHeight: '100vh', background: '#f1f5f9', padding: 16, fontFamily: 'inherit', WebkitTextSizeAdjust: '100%' };
  const btn: React.CSSProperties = { display: 'inline-block', marginTop: 14, background: '#2563eb', color: '#fff', padding: '12px 26px', borderRadius: 10, textDecoration: 'none', fontWeight: 700, border: 'none', fontSize: 16, cursor: 'pointer', WebkitAppearance: 'none' };
  const steps: React.CSSProperties = { textAlign: 'left', color: '#334155', fontSize: 14.5, lineHeight: 1.55, background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: 12, padding: '12px 14px 12px 30px', margin: '12px 0 0' };

  if (loading) return <div style={wrap}><div style={card}>Loading…</div></div>;

  if (!isAuthenticated) {
    // Come straight back here after logging in, with the ticket (valid 15 minutes) still in the link.
    const next = `/attendance/check-in?t=${encodeURIComponent(ticket || scanned)}`;
    return (
      <div style={wrap}>
        <div style={card}>
          <div style={{ fontSize: 44 }}>🔐</div>
          <h2 style={{ margin: '8px 0' }}>Log in to mark attendance</h2>
          {ticketErr
            ? <p style={{ color: '#b91c1c' }}>{ticketErr.text}</p>
            : <p style={{ color: '#475569' }}>Your scan is saved for 15 minutes. Log in on this phone and you will come straight back here and be checked in — no need to scan again.</p>}
          {isIos() && !ticketErr && <p style={{ color: '#64748b', fontSize: 13 }}>On iPhone the camera opens Safari. Log in here in Safari once; next time Safari will remember you.</p>}
          <Link to={`/login?next=${encodeURIComponent(next)}`} style={btn}>Log in</Link>
        </div>
      </div>
    );
  }

  const network = state.kind === 'error' && state.code === 'NOT_OFFICE_NETWORK';
  const offline = state.kind === 'error' && state.code === 'OFFLINE';
  const rescan = state.kind === 'error' && (state.code === 'QR_EXPIRED' || state.code === 'QR_INVALID' || !scanned);
  const canRetry = state.kind === 'error' && !!ticket && !rescan && !['PHONE_USED', 'WRONG_BATCH', 'NOT_STUDENT', 'NO_BATCH', 'OFF'].includes(state.code || '');

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
        {state.kind === 'error' && network && <>
          <div style={{ fontSize: 52 }}>📶</div>
          <h2 style={{ margin: '8px 0', color: '#b45309' }}>Please connect to the office Wi-Fi</h2>
          <p style={{ color: '#475569', margin: 0 }}>Attendance is marked only from the office Wi-Fi. Your phone is not on it right now.</p>
          <ol style={steps}>
            <li>Turn <b>off mobile data</b>.</li>
            <li>Connect to the <b>office Wi-Fi</b>.</li>
            {isIos() ? <>
              <li>iPhone: Settings → Wi-Fi → tap <b>ⓘ</b> next to the office Wi-Fi → turn <b>off “Limit IP Address Tracking”</b>.</li>
              <li>If you use iCloud+: Settings → your name → iCloud → <b>Private Relay → Off</b>.</li>
            </> : <li>Turn off any <b>VPN</b> app.</li>}
            <li>Come back here and tap <b>Try again</b>.</li>
          </ol>
        </>}
        {state.kind === 'error' && offline && <>
          <div style={{ fontSize: 52 }}>📶</div>
          <h2 style={{ margin: '8px 0', color: '#b45309' }}>No internet</h2>
          <p style={{ color: '#475569' }}>{state.text}</p>
        </>}
        {state.kind === 'error' && !network && !offline && <>
          <div style={{ fontSize: 52 }}>{state.code === 'TOO_EARLY' ? '⏰' : '⚠️'}</div>
          <h2 style={{ margin: '8px 0' }}>{state.code === 'TOO_EARLY' ? 'Too early to check out' : 'Not checked in'}</h2>
          <p style={{ color: '#475569' }}>{state.text}</p>
          {rescan && <p style={{ color: '#64748b', fontSize: 13.5 }}>Open your camera and scan the code on the screen again.</p>}
        </>}
        {canRetry && <div><button type="button" style={btn} onClick={run}>Try again</button></div>}
        <Link to="/my-attendance" style={{ display: 'inline-block', marginTop: 14, color: '#2563eb', textDecoration: 'none', fontWeight: 600 }}>My attendance →</Link>
      </div>
    </div>
  );
};

export default AttendanceCheckIn;
