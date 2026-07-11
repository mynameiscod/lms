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
  selectPeerScreenSharing,
  selectScreenShareByPeerID,
  selectHMSMessages,
  selectRecordingState,
} from '@100mslive/react-sdk';
import { useAuth } from '../../contexts/AuthContext';
import { hmsClassApi } from '../../api';

const BROADCASTER = 'broadcaster';
const STAGE = 'viewer-on-stage';
const VIEWER = 'viewer';

// ── A single WebRTC video tile ────────────────────────────────────────────────
const VideoTile: React.FC<{ peer: any }> = ({ peer }) => {
  const { videoRef } = useVideo({ trackId: peer.videoTrack });
  return (
    <div style={{ position: 'relative', background: '#111827', borderRadius: 10, overflow: 'hidden', aspectRatio: '16 / 9' }}>
      <video ref={videoRef} autoPlay playsInline muted={peer.isLocal}
        style={{ width: '100%', height: '100%', objectFit: 'cover', transform: peer.isLocal ? 'scaleX(-1)' : undefined }} />
      <span style={{ position: 'absolute', bottom: 6, left: 8, fontSize: 12, color: '#fff', background: 'rgba(0,0,0,.55)', padding: '2px 8px', borderRadius: 6 }}>
        {peer.name}{peer.isLocal ? ' (You)' : ''}{peer.roleName === BROADCASTER ? ' · host' : ''}
      </span>
    </div>
  );
};

// ── Shared-screen tile (large) ────────────────────────────────────────────────
const ScreenTile: React.FC<{ peer: any }> = ({ peer }) => {
  const track: any = useHMSStore(selectScreenShareByPeerID(peer.id));
  const trackId = typeof track === 'string' ? track : track?.id;
  const { videoRef } = useVideo({ trackId });
  return (
    <div style={{ position: 'relative', background: '#000', borderRadius: 12, overflow: 'hidden', width: '100%', aspectRatio: '16 / 9', marginBottom: 12 }}>
      <video ref={videoRef} autoPlay playsInline style={{ width: '100%', height: '100%', objectFit: 'contain' }} />
      <span style={{ position: 'absolute', top: 8, left: 10, fontSize: 12, color: '#fff', background: 'rgba(0,0,0,.6)', padding: '3px 9px', borderRadius: 6 }}>
        🖥 {peer.name}{peer.isLocal ? ' (You)' : ''} is sharing screen
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
  return <video ref={ref} autoPlay controls playsInline style={{ width: '100%', borderRadius: 12, background: '#000', maxHeight: '78vh' }} />;
};

// ── Chat panel (everyone) ─────────────────────────────────────────────────────
const ChatPanel: React.FC = () => {
  const messages: any[] = useHMSStore(selectHMSMessages) as any;
  const hmsActions = useHMSActions();
  const [text, setText] = useState('');
  const endRef = useRef<HTMLDivElement>(null);
  useEffect(() => { endRef.current?.scrollIntoView({ block: 'end' }); }, [messages?.length]);
  const send = async () => {
    const t = text.trim();
    if (!t) return;
    try { await hmsActions.sendBroadcastMessage(t); setText(''); } catch { /* ignore */ }
  };
  return (
    <div style={{ display: 'flex', flexDirection: 'column', flex: 1, minHeight: 120 }}>
      <div style={{ fontWeight: 700, fontSize: 13, margin: '4px 0 8px', color: '#e5e7eb' }}>💬 Chat</div>
      <div style={{ flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 8, paddingRight: 4 }}>
        {(!messages || messages.length === 0) && <div style={{ color: '#6b7280', fontSize: 12 }}>No messages yet.</div>}
        {(messages || []).map((m: any) => (
          <div key={m.id} style={{ fontSize: 13 }}>
            <span style={{ color: '#8fb6d9', fontSize: 11, fontWeight: 600 }}>{m.senderName || 'Someone'}</span>
            <div style={{ color: '#e5e7eb', wordBreak: 'break-word' }}>{m.message}</div>
          </div>
        ))}
        <div ref={endRef} />
      </div>
      <div style={{ display: 'flex', gap: 6, marginTop: 8 }}>
        <input value={text} onChange={e => setText(e.target.value)} onKeyDown={e => { if (e.key === 'Enter') send(); }}
          placeholder="Message everyone…"
          style={{ flex: 1, background: '#0b1220', border: '1px solid #334155', borderRadius: 8, color: '#fff', padding: '8px 10px', fontSize: 13, outline: 'none' }} />
        <button onClick={send} style={smallBtn('#1a5490')}>Send</button>
      </div>
    </div>
  );
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
  const screenPeer = useHMSStore(selectPeerScreenSharing);
  const recording: any = useHMSStore(selectRecordingState);

  const [phase, setPhase] = useState<'lobby' | 'joining' | 'joined'>('lobby');
  const [err, setErr] = useState('');
  const [notice, setNotice] = useState('');
  const [role, setRole] = useState('');
  const [tokenData, setTokenData] = useState<any>(null);
  const [camReady, setCamReady] = useState(true);
  const [micReady, setMicReady] = useState(true);
  const previewRef = useRef<HTMLVideoElement>(null);
  const previewStreamRef = useRef<MediaStream | null>(null);

  const role_ = localPeer?.roleName || role;
  const isBroadcaster = role_ === BROADCASTER;
  const isOnStage = role_ === STAGE;
  const isViewer = !isBroadcaster && !isOnStage;
  const willPublish = role === BROADCASTER || role === STAGE;
  const isRecording = !!(recording?.browser?.running || recording?.server?.running || recording?.hls?.running);

  // 1) Fetch the join token up front
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res: any = await hmsClassApi.joinToken(id!);
        if (!res.success) throw new Error(res.message || 'Could not get join token');
        if (!cancelled) { setTokenData(res.data); setRole(res.data.role); }
      } catch (e: any) {
        if (!cancelled) setErr(e.message || 'Failed to load the class');
      }
    })();
    return () => { cancelled = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  // 2) Lobby camera preview for hosts / on-stage roles
  useEffect(() => {
    if (phase !== 'lobby' || !willPublish) return;
    let stream: MediaStream | null = null;
    (async () => {
      try {
        stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
        previewStreamRef.current = stream;
        if (previewRef.current) previewRef.current.srcObject = stream;
      } catch {
        setCamReady(false); setMicReady(false);
      }
    })();
    return () => { stream?.getTracks().forEach(t => t.stop()); };
  }, [phase, willPublish]);

  useEffect(() => () => { hmsActions.leave().catch(() => {}); }, [hmsActions]);

  const doJoin = async () => {
    if (!tokenData) return;
    setPhase('joining');
    previewStreamRef.current?.getTracks().forEach(t => t.stop());
    try {
      await hmsActions.join({
        authToken: tokenData.token,
        userName: [user?.email].filter(Boolean).join(' ') || 'Guest',
        settings: { isAudioMuted: willPublish ? !micReady : true, isVideoMuted: willPublish ? !camReady : true },
      });
      setPhase('joined');
    } catch (e: any) {
      setErr(e.message || 'Failed to join');
      setPhase('lobby');
    }
  };

  useEffect(() => {
    if (isBroadcaster && hlsState?.running && hlsState.variants?.[0]?.url) {
      hmsClassApi.setHlsUrl(id!, hlsState.variants[0].url).catch(() => {});
    }
  }, [isBroadcaster, hlsState?.running, hlsState?.variants, id]);

  const goLive = useCallback(async () => {
    try { await hmsActions.startHLSStreaming(); setNotice(''); }
    catch (e: any) {
      const msg = String(e?.message || 'Could not start stream');
      setNotice(/permission/i.test(msg)
        ? "Couldn't start the live stream — the broadcaster role is missing HLS Streaming permission in your 100ms template."
        : `Couldn't start the live stream: ${msg}`);
    }
  }, [hmsActions]);

  const stopLive = useCallback(async () => {
    try { await hmsActions.stopHLSStreaming(); } catch { /* ignore */ }
  }, [hmsActions]);

  // Generic role change via SDK (broadcaster has changeRole permission)
  const setPeerRole = async (peerId: string, roleName: string) => {
    const act: any = hmsActions;
    const fn = act.changeRoleOfPeer || act.changeRole;
    try { await fn.call(act, peerId, roleName, true); setNotice(''); }
    catch (e: any) { setNotice(`Could not change role: ${e?.message || 'error'}`); }
  };

  // Bulk controls for the whole stage (on-stage speakers)
  const bulkTracks = async (enabled: boolean, type: 'audio' | 'video') => {
    try { await (hmsActions as any).setRemoteTracksEnabled({ enabled, type, roles: [STAGE] }); setNotice(''); }
    catch (e: any) { setNotice(`Bulk control failed: ${e?.message || 'error'}`); }
  };

  const raiseHand = () =>
    hmsActions.sendBroadcastMessage('✋ ' + (user?.email || 'A student') + ' raised their hand').catch(() => {});

  const leave = async () => { await hmsActions.leave().catch(() => {}); navigate('/hms-classes'); };

  const canShareScreen = isBroadcaster || isOnStage;

  if (err) {
    return (
      <div style={shell}>
        <div style={{ margin: 'auto', textAlign: 'center' }}>
          <p style={{ fontSize: 16 }}>⚠ {err}</p>
          <button onClick={() => navigate('/hms-classes')} style={btn('#374151')}>Back to classes</button>
        </div>
      </div>
    );
  }

  // ── Pre-join lobby ─────────────────────────────────────────────────────────
  if (phase === 'lobby') {
    return (
      <div style={{ ...shell, display: 'grid', placeItems: 'center' }}>
        <div style={{ width: '100%', maxWidth: 520, background: '#111827', borderRadius: 16, padding: 24, textAlign: 'center' }}>
          <h2 style={{ margin: '0 0 4px', fontSize: 20 }}>{tokenData?.title || 'Live Class'}</h2>
          <p style={{ color: '#9ca3af', fontSize: 13, margin: '0 0 18px' }}>
            {willPublish ? 'You are joining as a host — check your camera & mic.' : 'You are joining as a viewer — you will watch the live stream.'}
          </p>
          {willPublish ? (
            <>
              <div style={{ position: 'relative', background: '#000', borderRadius: 12, overflow: 'hidden', aspectRatio: '16 / 9', marginBottom: 14 }}>
                <video ref={previewRef} autoPlay playsInline muted style={{ width: '100%', height: '100%', objectFit: 'cover', transform: 'scaleX(-1)' }} />
                {!camReady && <div style={{ position: 'absolute', inset: 0, display: 'grid', placeItems: 'center', color: '#9ca3af', fontSize: 13 }}>Camera unavailable</div>}
              </div>
              <div style={{ display: 'flex', gap: 10, justifyContent: 'center', marginBottom: 18 }}>
                <button onClick={() => setMicReady(v => !v)} style={btn(micReady ? '#374151' : '#dc2626')}>{micReady ? '🎙 Mic on' : '🔇 Mic off'}</button>
                <button onClick={() => setCamReady(v => !v)} style={btn(camReady ? '#374151' : '#dc2626')}>{camReady ? '📹 Cam on' : '📷 Cam off'}</button>
              </div>
            </>
          ) : (
            <div style={{ display: 'grid', placeItems: 'center', height: 160, background: '#0b1220', borderRadius: 12, marginBottom: 18, fontSize: 40 }}>🎥</div>
          )}
          <button onClick={doJoin} disabled={!tokenData} style={{ ...btn('#16a34a'), width: '100%', padding: '12px 0', fontSize: 15 }}>
            {tokenData ? (willPublish ? 'Join Class' : 'Join & Watch') : 'Loading…'}
          </button>
          <button onClick={() => navigate('/hms-classes')} style={{ ...btn('transparent'), marginTop: 8, color: '#9ca3af' }}>Cancel</button>
        </div>
      </div>
    );
  }

  if (!isConnected) {
    return <div style={{ ...shell, display: 'grid', placeItems: 'center', color: '#9ca3af' }}>Joining live class…</div>;
  }

  const stagePeers = peers.filter(p => p.roleName === BROADCASTER || p.roleName === STAGE);
  const viewerPeers = peers.filter(p => p.roleName !== BROADCASTER && p.roleName !== STAGE);

  return (
    <div style={{ ...shell, display: 'flex', flexDirection: 'column' }}>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12, flexWrap: 'wrap', gap: 10, flexShrink: 0 }}>
        <div style={{ fontWeight: 700, fontSize: 18, display: 'flex', alignItems: 'center', gap: 12 }}>
          <span>{hlsState?.running ? '🔴 LIVE' : '● Room'}</span>
          {isRecording && <span style={{ fontSize: 12, color: '#fca5a5', background: '#3f1d1d', padding: '2px 8px', borderRadius: 6 }}>● REC</span>}
          <span style={{ color: '#9ca3af', fontWeight: 400, fontSize: 14 }}>· {peers.length} in room</span>
        </div>
        <button onClick={leave} style={btn('#dc2626')}>Leave</button>
      </div>

      {notice && (
        <div style={{ background: '#3f2d10', border: '1px solid #7c5b1e', color: '#fde68a', borderRadius: 10, padding: '10px 14px', marginBottom: 12, fontSize: 13.5, display: 'flex', gap: 10, alignItems: 'flex-start', flexShrink: 0 }}>
          <span style={{ flex: 1 }}>⚠ {notice}</span>
          <button onClick={() => setNotice('')} style={{ background: 'none', border: 'none', color: '#fde68a', cursor: 'pointer', fontSize: 16, lineHeight: 1 }}>×</button>
        </div>
      )}

      {/* Body: main + right side panel */}
      <div style={{ flex: 1, minHeight: 0, display: 'grid', gridTemplateColumns: 'minmax(0,1fr) 320px', gap: 16 }} className="hms-body">
        {/* MAIN */}
        <div style={{ minWidth: 0, overflowY: 'auto' }}>
          {isViewer ? (
            <div style={{ maxWidth: 1000, margin: '0 auto' }}>
              {hlsState?.running && hlsState.variants?.[0]?.url ? (
                <HlsPlayer src={hlsState.variants[0].url} />
              ) : (
                <div style={{ display: 'grid', placeItems: 'center', minHeight: '60vh', background: '#111827', borderRadius: 12, color: '#9ca3af' }}>
                  Waiting for the instructor to start streaming…
                </div>
              )}
              <div style={{ textAlign: 'center', marginTop: 14 }}>
                <button onClick={raiseHand} style={btn('#1a5490')}>✋ Raise hand</button>
                <p style={{ color: '#9ca3af', fontSize: 12, marginTop: 8 }}>Live video has a few seconds’ delay. Use chat to ask questions →</p>
              </div>
            </div>
          ) : (
            <>
              {screenPeer && <ScreenTile peer={screenPeer} />}
              <div style={{ display: 'grid', gridTemplateColumns: screenPeer ? 'repeat(auto-fill, minmax(150px, 1fr))' : 'repeat(auto-fill, minmax(240px, 1fr))', gap: 12 }}>
                {stagePeers.map(p => <VideoTile key={p.id} peer={p} />)}
              </div>
              {/* Personal controls */}
              <div style={{ display: 'flex', gap: 10, marginTop: 16, flexWrap: 'wrap', justifyContent: 'center' }}>
                <button onClick={() => hmsActions.setLocalAudioEnabled(!audioOn)} style={btn(audioOn ? '#374151' : '#dc2626')}>{audioOn ? '🎙 Mute' : '🔇 Unmute'}</button>
                <button onClick={() => hmsActions.setLocalVideoEnabled(!videoOn)} style={btn(videoOn ? '#374151' : '#dc2626')}>{videoOn ? '📹 Cam off' : '📷 Cam on'}</button>
                {canShareScreen && (
                  <button onClick={() => hmsActions.setScreenShareEnabled(!screenOn).catch((e: any) => setNotice(`Screen share failed: ${e?.message || ''}`))} style={btn(screenOn ? '#16a34a' : '#374151')}>
                    {screenOn ? '🖥 Stop share' : '🖥 Share screen'}
                  </button>
                )}
                {isOnStage && <button onClick={raiseHand} style={btn('#1a5490')}>✋ Raise hand</button>}
                {isBroadcaster && (!hlsState?.running
                  ? <button onClick={goLive} style={btn('#16a34a')}>▶ Go Live</button>
                  : <button onClick={stopLive} style={btn('#dc2626')}>■ Stop stream</button>)}
              </div>
            </>
          )}
        </div>

        {/* RIGHT PANEL: management (host) + chat (everyone) */}
        <div style={{ background: '#111827', borderRadius: 12, padding: 14, display: 'flex', flexDirection: 'column', minHeight: 0, gap: 12 }}>
          {isBroadcaster && (
            <div style={{ maxHeight: '45%', overflowY: 'auto' }}>
              {/* Bulk audience controls */}
              <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginBottom: 10 }}>
                <button onClick={() => bulkTracks(false, 'audio')} style={smallBtn('#dc2626')}>🔇 Mute all</button>
                <button onClick={() => bulkTracks(true, 'audio')} style={smallBtn('#374151')}>🎙 Ask unmute</button>
                <button onClick={() => bulkTracks(false, 'video')} style={smallBtn('#dc2626')}>📷 Cams off</button>
              </div>
              <div style={{ fontWeight: 700, fontSize: 13, marginBottom: 8 }}>On stage ({stagePeers.length})</div>
              {stagePeers.filter(p => p.roleName === STAGE).map(p => (
                <div key={p.id} style={rowStyle}>
                  <span style={{ fontSize: 12.5, flex: 1, minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>🎤 {p.name}</span>
                  <button onClick={() => setPeerRole(p.id, BROADCASTER)} style={smallBtn('#7c3aed')} title="Make co-host (can present & manage)">Co-host</button>
                  <button onClick={() => setPeerRole(p.id, VIEWER)} style={smallBtn('#dc2626')}>Send back</button>
                </div>
              ))}
              {stagePeers.filter(p => p.roleName === BROADCASTER && !p.isLocal).map(p => (
                <div key={p.id} style={rowStyle}>
                  <span style={{ fontSize: 12.5, flex: 1 }}>⭐ {p.name} (co-host)</span>
                  <button onClick={() => setPeerRole(p.id, STAGE)} style={smallBtn('#374151')}>Un-host</button>
                </div>
              ))}
              <div style={{ fontWeight: 700, fontSize: 13, margin: '12px 0 8px' }}>Audience ({viewerPeers.length})</div>
              {viewerPeers.length === 0 && <div style={{ color: '#6b7280', fontSize: 12 }}>No students yet.</div>}
              {viewerPeers.map(p => (
                <div key={p.id} style={rowStyle}>
                  <span style={{ fontSize: 12.5, flex: 1, minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>👤 {p.name}</span>
                  <button onClick={() => setPeerRole(p.id, STAGE)} style={smallBtn('#1a5490')}>On stage</button>
                </div>
              ))}
            </div>
          )}
          <div style={{ borderTop: isBroadcaster ? '1px solid #1f2937' : 'none', paddingTop: isBroadcaster ? 10 : 0, flex: 1, minHeight: 0, display: 'flex' }}>
            <ChatPanel />
          </div>
        </div>
      </div>
    </div>
  );
};

const shell: React.CSSProperties = { position: 'fixed', inset: 0, background: '#0b1220', color: '#fff', padding: 16, overflowY: 'auto' };
const btn = (bg: string): React.CSSProperties => ({ padding: '9px 16px', background: bg, color: '#fff', border: 'none', borderRadius: 8, fontSize: 13, fontWeight: 600, cursor: 'pointer' });
const smallBtn = (bg: string): React.CSSProperties => ({ padding: '4px 9px', background: bg, color: '#fff', border: 'none', borderRadius: 6, fontSize: 11, fontWeight: 600, cursor: 'pointer', whiteSpace: 'nowrap' });
const rowStyle: React.CSSProperties = { display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 6, padding: '6px 0', borderBottom: '1px solid #1f2937' };

const HmsRoomPage: React.FC = () => (
  <HMSRoomProvider>
    <RoomInner />
  </HMSRoomProvider>
);

export default HmsRoomPage;
