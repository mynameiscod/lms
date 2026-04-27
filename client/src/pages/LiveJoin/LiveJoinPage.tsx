import React, { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import LiveClassroom from '../ClassFlow/LiveClassroom';

/**
 * LiveJoinPage — participant entry point for /live/:sessionId
 * Students arrive here via the invite link the host copies from the classroom.
 */
const LiveJoinPage: React.FC = () => {
  const { sessionId } = useParams<{ sessionId: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();

  const [joined, setJoined] = useState(false);

  if (!sessionId) {
    return (
      <div style={styles.page}>
        <div style={styles.card}>
          <div style={{ fontSize: 40, marginBottom: 12 }}>⚠️</div>
          <div style={styles.title}>Invalid session link</div>
          <div style={styles.sub}>This link doesn't contain a valid session ID.</div>
          <button style={styles.btn} onClick={() => navigate('/')}>Go Home</button>
        </div>
      </div>
    );
  }

  if (!user) {
    // Not logged in — redirect to login with return URL
    navigate(`/login?redirect=/live/${sessionId}`);
    return null;
  }

  if (!joined) {
    return (
      <div style={styles.page}>
        <div style={styles.card}>
          <div style={{ fontSize: 48, marginBottom: 12 }}>🎓</div>
          <div style={styles.title}>Join Live Class</div>
          <div style={styles.sub}>
            You've been invited to join a live class session.
          </div>
          <div style={styles.sessionRow}>
            <span style={styles.sessionLabel}>Session:</span>
            <code style={styles.sessionCode}>{sessionId}</code>
          </div>
          <div style={styles.userRow}>
            <div style={styles.avatar}>
              {`${(user.firstName || '')[0] || ''}${(user.lastName || '')[0] || ''}`.toUpperCase() || 'P'}
            </div>
            <div>
              <div style={styles.userName}>{user.firstName} {user.lastName}</div>
              <div style={styles.userRole}>Joining as Participant</div>
            </div>
          </div>
          <button style={styles.btn} onClick={() => setJoined(true)}>
            🎙 Join Session
          </button>
          <div style={styles.hint}>
            Your microphone will be requested after joining.
          </div>
        </div>
      </div>
    );
  }

  return (
    <LiveClassroom
      sessionId={sessionId}
      classTitle="Live Class"
      role="viewer"
      onClose={() => navigate('/')}
      onRetry={() => setJoined(false)}
    />
  );
};

const styles: Record<string, React.CSSProperties> = {
  page: {
    minHeight: '100vh',
    background: '#0b1437',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontFamily: "'Inter','Segoe UI',sans-serif",
    padding: 16,
  },
  card: {
    background: '#131d3d',
    borderRadius: 20,
    border: '1px solid rgba(255,255,255,0.08)',
    padding: '40px 36px',
    maxWidth: 420,
    width: '100%',
    textAlign: 'center',
    color: '#e2e8f0',
  },
  title: {
    fontSize: 24,
    fontWeight: 800,
    color: '#f0f4ff',
    marginBottom: 8,
  },
  sub: {
    fontSize: 14,
    color: '#64748b',
    marginBottom: 24,
    lineHeight: 1.6,
  },
  sessionRow: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    marginBottom: 20,
    background: 'rgba(255,255,255,0.04)',
    borderRadius: 10,
    padding: '10px 16px',
  },
  sessionLabel: {
    fontSize: 12,
    color: '#94a3b8',
    fontWeight: 600,
  },
  sessionCode: {
    fontSize: 13,
    color: '#7dd3fc',
    wordBreak: 'break-all',
  },
  userRow: {
    display: 'flex',
    alignItems: 'center',
    gap: 12,
    background: 'rgba(102,80,216,0.12)',
    border: '1px solid rgba(102,80,216,0.25)',
    borderRadius: 12,
    padding: '12px 16px',
    marginBottom: 24,
    textAlign: 'left',
  },
  avatar: {
    width: 44,
    height: 44,
    borderRadius: '50%',
    background: 'linear-gradient(135deg,#6650d8,#38bdf8)',
    color: '#fff',
    fontWeight: 800,
    fontSize: 16,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  userName: {
    fontWeight: 700,
    fontSize: 15,
    color: '#f0f4ff',
  },
  userRole: {
    fontSize: 12,
    color: '#64748b',
    marginTop: 2,
  },
  btn: {
    background: 'linear-gradient(135deg,#6650d8,#38bdf8)',
    color: '#fff',
    border: 'none',
    borderRadius: 12,
    padding: '14px 32px',
    fontSize: 15,
    fontWeight: 700,
    cursor: 'pointer',
    width: '100%',
    marginBottom: 12,
    transition: 'opacity 0.15s',
  },
  hint: {
    fontSize: 12,
    color: '#475569',
    lineHeight: 1.5,
  },
};

export default LiveJoinPage;
