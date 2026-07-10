import React, { useEffect, useRef, useState, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import Hls from 'hls.js';
import {
  HMSRoomProvider,
  useHMSActions,
  useHMSStore,
  useVideo,
  selectIsConnectedToRoom,
  selectLocalPeer,
  selectPeers,
  selectHLSState,
  selectIsLocalVideoEnabled,
  selectIsLocalAudioEnabled,
  selectIsLocalScreenShared,
} from '@100mslive/react-sdk';
import { useAuth } from '../../contexts/AuthContext';
import { hmsClassApi } from '../../api';

const BROADCASTER = 'broadcaster';
const STAGE = 'viewer-on-stage';

// ── A single WebRTC video tile ────────────────────────────────────────────────
const VideoTile: React.FC<{ peer: any }> = ({ peer }) => {
  const { videoRef } = useVideo({ trackId: peer.videoTrack });
  return (
    <div style={{ position: 'relative', background: '#111827', borderRadius: 10, overflow: 'hidden', aspectRatio: '16 / 9' }}>
      <video ref={videoRef} autoPlay playsInline muted={peer.isLocal}
        style={{ width: '100%', height: '100%', objectFit: 'cover', transform: peer.isLocal ? 'scaleX(-1)' : undefined }} />
      <span style={{ position: 'absolute', bottom: 6, left: 8, fontSize: 12, color: '#fff', background: 'rgba(0,0,0,.55)', padding: '2px 8px', borderRadius: 6 }}>
        {peer.name}{peer.isLocal ? ' (You)' : ''}
      </span>
    </div>
  );
};

// ── HLS player for viewers ────────────────────────────────────────────────────
const HlsPlayer: React.FC<{ src: string }> = ({ src }) => {
  const ref = useRef<HTMLVideoElement>(null);
  useEffect(() => {
    const video = ref.current;
    if (!video || !src) return;
    if (video.canPlayType('application/vnd.apple.mpegurl')) {
      video.src = src; // native HLS (Safari)
      return;
    }
    if (Hls.isSupported()) {
      const hls = new Hls({ enableWorker: true, lowLatencyMode: true });
      hls.loadSource(src);
      hls.attachMedia(video);
      return () => hls.destroy();
    }
  }, [src]);
  return <video ref={ref} autoPlay controls playsInline style={{ width: '100%', borderRadius: 12, background: '#000', maxHeight: '72vh' }} />;
};

// ── The room, once connected ──────────────────────────────────────────────────
const RoomInner: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  const hmsActions = useHMSActions();

  const isConnected = useHMSStore(selectIsConnectedToRoom);
  const localPeer = useHMSStore(selectLocalPeer);
  const peers = useHMSStore(selectPeers);
  const hlsState = useHMSStore(selectHLSState);
  const videoOn = useHMSStore(selectIsLocalVideoEnabled);
  const audioOn = useHMSStore(selectIsLocalAudioEnabled);
  const screenOn = useHMSStore(selectIsLocalScreenShared);

  const [joining, setJoining] = useState(true);
  const [err, setErr] = useState('');
  const [role, setRole] = useState('');

  const role_ = localPeer?.roleName || role;
  const isBroadcaster = role_ === BROADCASTER;
  const isOnStage = role_ === STAGE;
  const isViewer = !isBroadcaster && !isOnStage;

  // Join on mount
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res: any = await hmsClassApi.joinToken(id!);
        if (!res.success) throw new Error(res.message || 'Could not get join token');
        if (cancelled) return;
        setRole(res.data.role);
        await hmsActions.join({
          authToken: res.data.token,
          userName: [user?.email].filter(Boolean).join(' ') || 'Guest',
          settings: { isAudioMuted: true, isVideoMuted: true },
        });
      } catch (e: any) {
        if (!cancelled) setErr(e.message || 'Failed to join');
      } finally {
        if (!cancelled) setJoining(false);
      }
    })();
    return () => { cancelled = true; hmsActions.leave().catch(() => {}); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  // Publish the HLS url to the server once the broadcaster goes live (so late viewers get it)
  useEffect(() => {
    if (isBroadcaster && hlsState?.running && hlsState.variants?.[0]?.url) {
      hmsClassApi.setHlsUrl(id!, hlsState.variants[0].url).catch(() => {});
    }
  }, [isBroadcaster, hlsState?.running, hlsState?.variants, id]);

  const goLive = useCallback(async () => {
    try { await hmsActions.startHLSStreaming(); } catch (e: any) { setErr(e.message || 'Could not start stream'); }
  }, [hmsActions]);

  const stopLive = useCallback(async () => {
    try { await hmsActions.stopHLSStreaming(); } catch { /* ignore */ }
  }, [hmsActions]);

  const changeRole = async (peerId: string, toStage: boolean) => {
    try { await hmsClassApi.changeRole(id!, peerId, toStage); } catch (e: any) { setErr(e.message); }
  };

  const leave = async () => { await hmsActions.leave().catch(() => {}); navigate('/hms-classes'); };

  if (err) {
    return (
      <div style={{ minHeight: '60vh', display: 'grid', placeItems: 'center', color: '#fff', background: '#0b1220' }}>
        <div style={{ textAlign: 'center' }}>
          <p style={{ fontSize: 16 }}>⚠ {err}</p>
          <button onClick={() => navigate('/hms-classes')} style={btn('#374151')}>Back to classes</button>
        </div>
      </div>
    );
  }
  if (joining || !isConnected) {
    return <div style={{ minHeight: '60vh', display: 'grid', placeItems: 'center', color: '#9ca3af', background: '#0b1220' }}>Joining live class…</div>;
  }

  const stagePeers = peers.filter(p => p.roleName === BROADCASTER || p.roleName === STAGE);
  const viewerPeers = peers.filter(p => p.roleName !== BROADCASTER && p.roleName !== STAGE);

  return (
    <div style={{ background: '#0b1220', minHeight: '100vh', color: '#fff', padding: 16 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14, flexWrap: 'wrap', gap: 10 }}>
        <div style={{ fontWeight: 700, fontSize: 18 }}>
          {hlsState?.running ? '🔴 LIVE' : '● Room'} <span style={{ color: '#9ca3af', fontWeight: 400, fontSize: 14 }}>· {peers.length} in room</span>
        </div>
        <button onClick={leave} style={btn('#dc2626')}>Leave</button>
      </div>

      {/* VIEWER: watch HLS */}
      {isViewer && (
        <div style={{ maxWidth: 960, margin: '0 auto' }}>
          {hlsState?.running && hlsState.variants?.[0]?.url ? (
            <HlsPlayer src={hlsState.variants[0].url} />
          ) : (
            <div style={{ display: 'grid', placeItems: 'center', height: '50vh', background: '#111827', borderRadius: 12, color: '#9ca3af' }}>
              Waiting for the instructor to start streaming…
            </div>
          )}
          <div style={{ textAlign: 'center', marginTop: 14 }}>
            <button onClick={() => hmsActions.sendBroadcastMessage('✋ ' + (user?.email || 'A student') + ' raised their hand')}
              style={btn('#1a5490')}>✋ Raise hand</button>
            <p style={{ color: '#9ca3af', fontSize: 12, marginTop: 8 }}>If the instructor brings you on stage, your camera & mic controls will appear here.</p>
          </div>
        </div>
      )}

      {/* BROADCASTER / ON-STAGE: WebRTC tiles + controls */}
      {(isBroadcaster || isOnStage) && (
        <div style={{ display: 'grid', gridTemplateColumns: isBroadcaster ? '1fr 300px' : '1fr', gap: 16 }}>
          <div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(240px, 1fr))', gap: 12 }}>
              {stagePeers.map(p => <VideoTile key={p.id} peer={p} />)}
            </div>

            {/* Controls */}
            <div style={{ display: 'flex', gap: 10, marginTop: 16, flexWrap: 'wrap', justifyContent: 'center' }}>
              <button onClick={() => hmsActions.setLocalAudioEnabled(!audioOn)} style={btn(audioOn ? '#374151' : '#dc2626')}>
                {audioOn ? '🎙 Mute' : '🔇 Unmute'}
              </button>
              <button onClick={() => hmsActions.setLocalVideoEnabled(!videoOn)} style={btn(videoOn ? '#374151' : '#dc2626')}>
                {videoOn ? '📹 Cam off' : '📷 Cam on'}
              </button>
              {isBroadcaster && (
                <>
                  <button onClick={() => hmsActions.setScreenShareEnabled(!screenOn)} style={btn(screenOn ? '#16a34a' : '#374151')}>
                    {screenOn ? '🖥 Stop share' : '🖥 Share screen'}
                  </button>
                  {!hlsState?.running ? (
                    <button onClick={goLive} style={btn('#16a34a')}>▶ Go Live (stream to students)</button>
                  ) : (
                    <button onClick={stopLive} style={btn('#dc2626')}>■ Stop stream</button>
                  )}
                </>
              )}
            </div>
          </div>

          {/* Broadcaster: audience + stage management */}
          {isBroadcaster && (
            <div style={{ background: '#111827', borderRadius: 12, padding: 14, maxHeight: '78vh', overflowY: 'auto' }}>
              <div style={{ fontWeight: 700, fontSize: 14, marginBottom: 10 }}>On stage ({stagePeers.length})</div>
              {stagePeers.filter(p => p.roleName === STAGE).map(p => (
                <div key={p.id} style={rowStyle}>
                  <span style={{ fontSize: 13 }}>🎤 {p.name}</span>
                  <button onClick={() => changeRole(p.id, false)} style={smallBtn('#dc2626')}>Send back</button>
                </div>
              ))}
              <div style={{ fontWeight: 700, fontSize: 14, margin: '14px 0 10px' }}>Audience ({viewerPeers.length})</div>
              {viewerPeers.length === 0 && <div style={{ color: '#6b7280', fontSize: 12 }}>No students yet.</div>}
              {viewerPeers.map(p => (
                <div key={p.id} style={rowStyle}>
                  <span style={{ fontSize: 13 }}>👤 {p.name}</span>
                  <button onClick={() => changeRole(p.id, true)} style={smallBtn('#1a5490')}>Bring on stage</button>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
};

const btn = (bg: string): React.CSSProperties => ({ padding: '9px 16px', background: bg, color: '#fff', border: 'none', borderRadius: 8, fontSize: 13, fontWeight: 600, cursor: 'pointer' });
const smallBtn = (bg: string): React.CSSProperties => ({ padding: '4px 10px', background: bg, color: '#fff', border: 'none', borderRadius: 6, fontSize: 11, fontWeight: 600, cursor: 'pointer' });
const rowStyle: React.CSSProperties = { display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '6px 0', borderBottom: '1px solid #1f2937' };

const HmsRoomPage: React.FC = () => (
  <HMSRoomProvider>
    <RoomInner />
  </HMSRoomProvider>
);

export default HmsRoomPage;
