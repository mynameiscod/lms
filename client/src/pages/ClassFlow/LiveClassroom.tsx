import React, { useState, useEffect, useCallback, useRef } from 'react';
import { io, Socket } from 'socket.io-client';
import { useAuth } from '../../contexts/AuthContext';
import './LiveClassroom.css';

const ICE_SERVERS: RTCIceServer[] = [
  { urls: 'stun:stun.l.google.com:19302' },
  { urls: 'stun:stun1.l.google.com:19302' },
  { urls: 'stun:stun2.l.google.com:19302' },
];

interface Participant {
  socketId: string;
  userId: string;
  name: string;
  initials: string;
  role: 'host' | 'speaker' | 'viewer';
  audioEnabled: boolean;
  videoEnabled: boolean;
  stream?: MediaStream;
}

interface ChatMessage {
  id: string;
  senderId: string;
  senderName: string;
  initials: string;
  role: string;
  text: string;
  timestamp: number;
}

export interface LiveClassroomProps {
  sessionId: string;
  classTitle: string;
  role: 'host' | 'viewer';
  /** Host only: call to pause/resume/stop the screen recording */
  onRecordingAction?: (action: 'pause' | 'resume' | 'stop') => void;
  /** Controlled recording state from ClassFlowPage */
  recordingState?: 'recording' | 'paused' | 'stopped';
  /** Elapsed seconds from ClassFlowPage timer */
  elapsed?: number;
  onClose: () => void;
  /** Called when the user wants to retry joining (e.g. after an error) */
  onRetry?: () => void;
}

// ── Remote audio element helper (keeps audio playing on stream update) ──
const RemoteAudio: React.FC<{ stream: MediaStream | undefined }> = ({ stream }) => {
  const ref = useRef<HTMLAudioElement | null>(null);
  useEffect(() => {
    if (ref.current && stream) ref.current.srcObject = stream;
  }, [stream]);
  return <audio ref={ref} autoPlay playsInline style={{ display: 'none' }} />;
};

// ── Single participant tile ──
const ParticipantTile: React.FC<{
  participant: Participant;
  isHost: boolean;
  hostSocketId: string;
  onHostAction: (action: string, targetSocketId: string, value?: any) => void;
}> = ({ participant, isHost, hostSocketId, onHostAction }) => {
  const videoRef = useRef<HTMLVideoElement | null>(null);

  useEffect(() => {
    if (videoRef.current && participant.stream) {
      videoRef.current.srcObject = participant.stream;
    }
  }, [participant.stream]);

  const isThisHost = participant.socketId === hostSocketId;

  return (
    <div className={`lc-tile ${participant.audioEnabled ? 'speaking' : ''}`}>
      {participant.stream && participant.videoEnabled ? (
        <video ref={videoRef} autoPlay playsInline className="lc-tile-video" />
      ) : (
        <div className="lc-tile-avatar">{participant.initials}</div>
      )}

      {/* Audio-only: hidden audio element */}
      {participant.stream && <RemoteAudio stream={participant.stream} />}

      <div className="lc-tile-footer">
        <span className="lc-tile-name">
          {participant.name}
          {isThisHost && <span className="lc-role-badge host">Host</span>}
          {participant.role === 'speaker' && !isThisHost && <span className="lc-role-badge speaker">Speaker</span>}
        </span>
        <span className="lc-tile-mic" title={participant.audioEnabled ? 'Mic on' : 'Mic off'}>
          {participant.audioEnabled ? '🎙' : '🔇'}
        </span>
      </div>

      {/* Host per-participant controls (not shown for host tile) */}
      {isHost && !isThisHost && (
        <div className="lc-tile-actions">
          <button
            className="lc-tile-act-btn"
            title={participant.audioEnabled ? 'Mute participant' : 'Ask to unmute'}
            onClick={() => onHostAction(participant.audioEnabled ? 'mute' : 'unmute', participant.socketId)}
          >
            {participant.audioEnabled ? '🔇' : '🎙'}
          </button>
          <button
            className="lc-tile-act-btn"
            title={participant.role === 'speaker' ? 'Remove speaker role' : 'Make speaker'}
            onClick={() => onHostAction('promote', participant.socketId, participant.role === 'speaker' ? 'viewer' : 'speaker')}
          >
            {participant.role === 'speaker' ? '👤' : '🎤'}
          </button>
          <button
            className="lc-tile-act-btn danger"
            title="Remove from session"
            onClick={() => {
              if (window.confirm(`Remove ${participant.name} from the session?`)) {
                onHostAction('remove', participant.socketId);
              }
            }}
          >
            ✕
          </button>
        </div>
      )}
    </div>
  );
};

// ── Main LiveClassroom component ──
const LiveClassroom: React.FC<LiveClassroomProps> = ({
  sessionId,
  classTitle,
  role,
  onRecordingAction,
  recordingState: externalRecordingState,
  elapsed = 0,
  onClose,
  onRetry,
}) => {
  const { user } = useAuth();

  const socketRef = useRef<Socket | null>(null);
  const peerConnectionsRef = useRef<Map<string, RTCPeerConnection>>(new Map());
  const localStreamRef = useRef<MediaStream | null>(null);
  const localVideoRef = useRef<HTMLVideoElement | null>(null);
  const pendingCandidatesRef = useRef<Map<string, RTCIceCandidateInit[]>>(new Map());
  const chatBottomRef = useRef<HTMLDivElement | null>(null);
  const joinTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  const [participants, setParticipants] = useState<Participant[]>([]);
  const [mySocketId, setMySocketId] = useState('');
  const [hostSocketId, setHostSocketId] = useState('');
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([]);
  const [chatInput, setChatInput] = useState('');
  const [chatEnabled, setChatEnabled] = useState(true);
  const [chatOpen, setChatOpen] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);
  const [localAudioEnabled, setLocalAudioEnabled] = useState(true);
  const [localVideoEnabled, setLocalVideoEnabled] = useState(false);
  const [recordingState, setRecordingState] = useState<'recording' | 'paused' | 'stopped'>(
    externalRecordingState || 'recording'
  );
  const [isJoining, setIsJoining] = useState(true);
  const [joinStep, setJoinStep] = useState<'media'|'connecting'|'joining'>('media');
  const [joinError, setJoinError] = useState('');
  const [linkCopied, setLinkCopied] = useState(false);

  const myName = user ? `${user.firstName || ''} ${user.lastName || ''}`.trim() || 'Participant' : 'Participant';
  const myInitials = user
    ? `${(user.firstName || '')[0] || ''}${(user.lastName || '')[0] || ''}`.toUpperCase() || 'P'
    : 'P';
  const shareLink = `${window.location.origin}/live/${sessionId}`;

  const formatTime = (s: number) => {
    const m = Math.floor(s / 60);
    const sec = s % 60;
    return `${String(m).padStart(2, '0')}:${String(sec).padStart(2, '0')}`;
  };

  // ── Create RTCPeerConnection for a remote participant ──
  const createPeerConnection = useCallback((remoteSocketId: string): RTCPeerConnection => {
    const pc = new RTCPeerConnection({ iceServers: ICE_SERVERS });
    peerConnectionsRef.current.set(remoteSocketId, pc);

    // Add local tracks
    localStreamRef.current?.getTracks().forEach(track => {
      pc.addTrack(track, localStreamRef.current!);
    });

    // Receive remote stream
    pc.ontrack = (event) => {
      const remoteStream = event.streams[0];
      setParticipants(prev =>
        prev.map(p => p.socketId === remoteSocketId ? { ...p, stream: remoteStream } : p)
      );
    };

    // Send ICE candidates
    pc.onicecandidate = (event) => {
      if (event.candidate && socketRef.current) {
        socketRef.current.emit('live_class:ice', {
          sessionId,
          to: remoteSocketId,
          candidate: event.candidate.toJSON(),
        });
      }
    };

    pc.onconnectionstatechange = () => {
      if (['failed', 'closed', 'disconnected'].includes(pc.connectionState)) {
        peerConnectionsRef.current.delete(remoteSocketId);
      }
    };

    return pc;
  }, [sessionId]);

  const flushPendingCandidates = useCallback(async (remoteSocketId: string, pc: RTCPeerConnection) => {
    const pending = pendingCandidatesRef.current.get(remoteSocketId) || [];
    for (const c of pending) {
      try { await pc.addIceCandidate(new RTCIceCandidate(c)); } catch { /* ignore */ }
    }
    pendingCandidatesRef.current.delete(remoteSocketId);
  }, []);

  // ── Initialize socket + media ──
  useEffect(() => {
    let mounted = true;

    const init = async () => {
      // ── Start socket IMMEDIATELY — don't wait for camera permission ──
      setJoinStep('connecting');
      const socket = io(window.location.origin, {
        auth: { token: localStorage.getItem('token') },
        transports: ['websocket', 'polling'],
        reconnection: true,
        reconnectionAttempts: 5,
        reconnectionDelay: 1500,
      });
      socketRef.current = socket;

      // ── Get mic + camera in parallel (non-blocking) ──
      const getMedia = async () => {
        try {
          const stream = await navigator.mediaDevices.getUserMedia({ audio: true, video: true });
          if (!mounted) { stream.getTracks().forEach(t => t.stop()); return; }
          localStreamRef.current = stream;
          stream.getVideoTracks().forEach(t => { t.enabled = false; });
          if (localVideoRef.current) localVideoRef.current.srcObject = stream;
          // Add tracks to any peer connections already created
          peerConnectionsRef.current.forEach(pc => {
            stream.getTracks().forEach(t => pc.addTrack(t, stream));
          });
        } catch {
          try {
            const stream = await navigator.mediaDevices.getUserMedia({ audio: true, video: false });
            if (!mounted) { stream.getTracks().forEach(t => t.stop()); return; }
            localStreamRef.current = stream;
            peerConnectionsRef.current.forEach(pc => {
              stream.getTracks().forEach(t => pc.addTrack(t, stream));
            });
          } catch {
            if (mounted) localStreamRef.current = new MediaStream();
          }
        }
      };
      getMedia(); // fire-and-forget — socket connects in parallel

      socket.on('connect', () => {
        if (!mounted) return;
        setMySocketId(socket.id);
        setJoinStep('joining');
        // Start 25-second timeout AFTER socket connects — if no participant_list arrives it means
        // the session doesn't exist or the server is not responding to the join event
        joinTimeoutRef.current = setTimeout(() => {
          if (!mounted) return;
          setJoinError(
            'The host may not have started the live session yet, or the server is temporarily unavailable. ' +
            'Please ask the host to check their session and try joining again.'
          );
          setIsJoining(false);
        }, 25000);
        socket.emit('live_class:join', {
          sessionId,
          userId: (user as any)?._id || (user as any)?.id || socket.id,
          name: myName,
          initials: myInitials,
          role,
        });
      });

      // Received on join — full current state
      socket.on('live_class:participant_list', ({
        participants: list,
        chatEnabled: ce,
        recordingState: rs,
        hostSocketId: hId,
      }) => {
        if (!mounted) return;
        // Clear the join timeout
        if (joinTimeoutRef.current) clearTimeout(joinTimeoutRef.current);
        setParticipants(list.map((p: Participant) => ({ ...p, stream: undefined })));
        setChatEnabled(ce);
        setRecordingState(rs);
        setHostSocketId(hId);
        setIsJoining(false);

        // Initiate offers to all existing participants
        list.forEach((p: Participant) => {
          if (p.socketId !== socket.id) {
            const pc = createPeerConnection(p.socketId);
            pc.createOffer()
              .then(offer => pc.setLocalDescription(offer).then(() => offer))
              .then(offer => {
                socket.emit('live_class:offer', { sessionId, to: p.socketId, sdp: offer });
              })
              .catch(() => { /* swallow — peer may have left */ });
          }
        });
      });

      socket.on('live_class:participant_joined', (participant: Participant) => {
        if (!mounted) return;
        setParticipants(prev => [
          ...prev.filter(p => p.socketId !== participant.socketId),
          { ...participant, stream: undefined },
        ]);
        // New participant will initiate the offer towards us — just wait
      });

      socket.on('live_class:participant_left', ({ socketId }: { socketId: string }) => {
        if (!mounted) return;
        setParticipants(prev => prev.filter(p => p.socketId !== socketId));
        const pc = peerConnectionsRef.current.get(socketId);
        if (pc) { pc.close(); peerConnectionsRef.current.delete(socketId); }
      });

      socket.on('live_class:participant_updated', ({ socketId, audioEnabled, videoEnabled }: any) => {
        if (!mounted) return;
        setParticipants(prev =>
          prev.map(p => p.socketId === socketId ? { ...p, audioEnabled, videoEnabled } : p)
        );
      });

      // ── WebRTC signaling ──
      socket.on('live_class:offer', async ({ from, sdp }: { from: string; sdp: RTCSessionDescriptionInit }) => {
        if (!mounted) return;
        let pc = peerConnectionsRef.current.get(from);
        if (!pc) pc = createPeerConnection(from);
        try {
          await pc.setRemoteDescription(new RTCSessionDescription(sdp));
          await flushPendingCandidates(from, pc);
          const answer = await pc.createAnswer();
          await pc.setLocalDescription(answer);
          socket.emit('live_class:answer', { sessionId, to: from, sdp: answer });
        } catch { /* ignore negotiation errors */ }
      });

      socket.on('live_class:answer', async ({ from, sdp }: { from: string; sdp: RTCSessionDescriptionInit }) => {
        if (!mounted) return;
        const pc = peerConnectionsRef.current.get(from);
        if (pc && pc.signalingState !== 'stable') {
          try {
            await pc.setRemoteDescription(new RTCSessionDescription(sdp));
            await flushPendingCandidates(from, pc);
          } catch { /* ignore */ }
        }
      });

      socket.on('live_class:ice', async ({ from, candidate }: { from: string; candidate: RTCIceCandidateInit }) => {
        if (!mounted) return;
        const pc = peerConnectionsRef.current.get(from);
        if (pc && pc.remoteDescription) {
          try { await pc.addIceCandidate(new RTCIceCandidate(candidate)); } catch { /* ignore */ }
        } else {
          const pending = pendingCandidatesRef.current.get(from) || [];
          pending.push(candidate);
          pendingCandidatesRef.current.set(from, pending);
        }
      });

      // ── Chat ──
      socket.on('live_class:chat', (msg: ChatMessage) => {
        if (!mounted) return;
        setChatMessages(prev => [...prev, msg]);
        setChatOpen(open => {
          if (!open) setUnreadCount(c => c + 1);
          return open;
        });
      });

      // ── Host actions broadcast ──
      socket.on('live_class:host_action', ({ action, targetSocketId, value, participants: updatedList, chatEnabled: ce, recordingState: rs }: any) => {
        if (!mounted) return;
        if (updatedList) {
          setParticipants(prev => {
            const streamMap = new Map(prev.map(p => [p.socketId, p.stream]));
            return updatedList.map((p: Participant) => ({ ...p, stream: streamMap.get(p.socketId) }));
          });
        }
        if (ce !== undefined) setChatEnabled(ce);
        if (rs !== undefined) setRecordingState(rs);

        // If we are muted/unmuted by host
        if (action === 'mute' && targetSocketId === socket.id) {
          localStreamRef.current?.getAudioTracks().forEach(t => { t.enabled = false; });
          setLocalAudioEnabled(false);
        }
        if (action === 'unmute' && targetSocketId === socket.id) {
          localStreamRef.current?.getAudioTracks().forEach(t => { t.enabled = true; });
          setLocalAudioEnabled(true);
        }
      });

      socket.on('live_class:removed', () => {
        if (!mounted) return;
        alert('You have been removed from the session by the host.');
        handleClose();
      });

      socket.on('connect_error', (err) => {
        if (!mounted) return;
        if (joinTimeoutRef.current) clearTimeout(joinTimeoutRef.current);
        setJoinError(
          `Could not reach the server (${err.message}). ` +
          'Please check your internet connection and try again.'
        );
        setIsJoining(false);
      });

      // If socket disconnects while still in joining state, clear the timeout so it doesn't
      // fire the wrong message — reconnection will re-join automatically
      socket.on('disconnect', (reason) => {
        if (!mounted) return;
        if (reason === 'io server disconnect' || reason === 'io client disconnect') return;
        if (joinTimeoutRef.current) {
          clearTimeout(joinTimeoutRef.current);
          joinTimeoutRef.current = null;
        }
        // Re-set joining step so UI reflects reconnection
        setJoinStep('connecting');
        setIsJoining(true);
      });

      socket.on('reconnect', () => {
        if (!mounted) return;
        // Re-emit join after reconnection
        setJoinStep('joining');
        joinTimeoutRef.current = setTimeout(() => {
          if (!mounted) return;
          setJoinError('Could not reconnect to the live session. Please try again.');
          setIsJoining(false);
        }, 20000);
        socket.emit('live_class:join', {
          sessionId,
          userId: (user as any)?._id || (user as any)?.id || socket.id,
          name: myName,
          initials: myInitials,
          role,
        });
      });

      socket.on('live_class:error', ({ message }: { message: string }) => {
        if (!mounted) return;
        if (joinTimeoutRef.current) clearTimeout(joinTimeoutRef.current);
        setJoinError(message);
        setIsJoining(false);
      });
    };

    init();

    return () => {
      mounted = false;
      if (joinTimeoutRef.current) clearTimeout(joinTimeoutRef.current);
      socketRef.current?.emit('live_class:leave', { sessionId });
      socketRef.current?.disconnect();
      localStreamRef.current?.getTracks().forEach(t => t.stop());
      peerConnectionsRef.current.forEach(pc => pc.close());
      peerConnectionsRef.current.clear();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Scroll chat to bottom on new messages
  useEffect(() => {
    if (chatOpen) chatBottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [chatMessages, chatOpen]);

  const toggleLocalAudio = () => {
    const enabled = !localAudioEnabled;
    localStreamRef.current?.getAudioTracks().forEach(t => { t.enabled = enabled; });
    setLocalAudioEnabled(enabled);
    socketRef.current?.emit('live_class:update', {
      sessionId,
      audioEnabled: enabled,
      videoEnabled: localVideoEnabled,
    });
  };

  const toggleLocalVideo = () => {
    const videoTracks = localStreamRef.current?.getVideoTracks() || [];
    if (videoTracks.length === 0) return; // no camera available
    const enabled = !localVideoEnabled;
    videoTracks.forEach(t => { t.enabled = enabled; });
    setLocalVideoEnabled(enabled);
    // Attach stream to local preview once enabled
    if (enabled && localVideoRef.current && localStreamRef.current) {
      localVideoRef.current.srcObject = localStreamRef.current;
    }
    socketRef.current?.emit('live_class:update', {
      sessionId,
      audioEnabled: localAudioEnabled,
      videoEnabled: enabled,
    });
  };

  const sendChat = () => {
    const text = chatInput.trim();
    if (!text || !chatEnabled) return;
    socketRef.current?.emit('live_class:chat', { sessionId, text });
    setChatInput('');
  };

  const handleHostAction = useCallback((action: string, targetSocketId: string, value?: any) => {
    socketRef.current?.emit('live_class:host_action', { sessionId, action, targetSocketId, value });
  }, [sessionId]);

  const handleRecording = (action: 'pause' | 'resume' | 'stop') => {
    if (onRecordingAction) onRecordingAction(action);
    const newState = action === 'stop' ? 'stopped' : action === 'pause' ? 'paused' : 'recording';
    setRecordingState(newState);
    socketRef.current?.emit('live_class:host_action', {
      sessionId,
      action: 'recording_state',
      value: newState,
    });
    if (action === 'stop') handleClose();
  };

  const copyLink = () => {
    navigator.clipboard.writeText(shareLink).then(() => {
      setLinkCopied(true);
      setTimeout(() => setLinkCopied(false), 2500);
    }).catch(() => {
      // Fallback for older browsers
      const ta = document.createElement('textarea');
      ta.value = shareLink;
      document.body.appendChild(ta);
      ta.select();
      document.execCommand('copy');
      document.body.removeChild(ta);
      setLinkCopied(true);
      setTimeout(() => setLinkCopied(false), 2500);
    });
  };

  const handleClose = useCallback(() => {
    socketRef.current?.emit('live_class:leave', { sessionId });
    socketRef.current?.disconnect();
    localStreamRef.current?.getTracks().forEach(t => t.stop());
    peerConnectionsRef.current.forEach(pc => pc.close());
    onClose();
  }, [sessionId, onClose]);

  // ── Loading state ──
  if (isJoining) {
    const stepLabel = joinStep === 'media'
      ? 'Requesting microphone…'
      : joinStep === 'connecting'
      ? 'Connecting to server…'
      : 'Joining live session…';
    return (
      <div className="lc-overlay">
        <div className="lc-center-card">
          <div className="lc-spinner" />
          <div className="lc-center-text">{stepLabel}</div>
          <div style={{ fontSize: 12, color: '#64748b', marginTop: 8 }}>This may take a few seconds</div>
        </div>
      </div>
    );
  }

  if (joinError) {
    const isNotFound = /not found|not started|no session/i.test(joinError);
    return (
      <div className="lc-overlay">
        <div className="lc-center-card" style={{ maxWidth: 420 }}>
          <div style={{ fontSize: 40, marginBottom: 12 }}>{isNotFound ? '⏳' : '⚠️'}</div>
          <div className="lc-center-text" style={{ color: '#ef4444', marginBottom: 8 }}>
            {isNotFound ? 'Session not available yet' : 'Could not join session'}
          </div>
          <div style={{ fontSize: 13, color: '#94a3b8', textAlign: 'center', lineHeight: 1.6, marginBottom: 20 }}>
            {joinError}
          </div>
          <div style={{ display: 'flex', gap: 10, justifyContent: 'center', flexWrap: 'wrap' }}>
            {(onRetry || isNotFound) && (
              <button
                className="lc-btn-primary"
                onClick={onRetry || handleClose}
              >
                🔄 Try Again
              </button>
            )}
            <button
              className="lc-btn-secondary"
              onClick={handleClose}
            >
              ✕ Close
            </button>
          </div>
        </div>
      </div>
    );
  }

  const isHost = role === 'host';
  const others = participants.filter(p => p.socketId !== mySocketId);

  return (
    <div className="lc-overlay">
      <div className="lc-shell">

        {/* ── Top bar ── */}
        <div className="lc-topbar">
          <div className="lc-topbar-left">
            <span className="lc-session-title">{classTitle}</span>

            {isHost && recordingState === 'recording' && (
              <span className="lc-rec-badge">
                <span className="lc-rec-dot" />
                REC {formatTime(elapsed)}
              </span>
            )}
            {isHost && recordingState === 'paused' && (
              <span className="lc-paused-badge">⏸ PAUSED</span>
            )}

            {/* Recording controls — host only */}
            {isHost && recordingState !== 'stopped' && (
              <div className="lc-rec-controls">
                {recordingState === 'recording' && (
                  <button className="lc-btn-outline sm" onClick={() => handleRecording('pause')}>
                    ⏸ Pause Rec
                  </button>
                )}
                {recordingState === 'paused' && (
                  <button className="lc-btn-primary sm" onClick={() => handleRecording('resume')}>
                    ▶ Resume Rec
                  </button>
                )}
                <button
                  className="lc-btn-danger sm"
                  onClick={() => {
                    if (window.confirm('Stop recording, upload the video and end the live session?')) {
                      handleRecording('stop');
                    }
                  }}
                >
                  ⏹ Stop &amp; Upload
                </button>
              </div>
            )}
          </div>

          <div className="lc-topbar-right">
            {/* Invite link */}
            <div className="lc-invite-row">
              <span className="lc-invite-label">Invite:</span>
              <code className="lc-invite-code">{sessionId}</code>
              <button className="lc-btn-copy" onClick={copyLink}>
                {linkCopied ? '✓ Copied!' : '📋 Copy Link'}
              </button>
            </div>

            <span className="lc-people-badge">👥 {participants.length}</span>

            <button
              className={`lc-chat-toggle ${chatOpen ? 'active' : ''}`}
              onClick={() => { setChatOpen(o => !o); setUnreadCount(0); }}
            >
              💬 Chat
              {unreadCount > 0 && <span className="lc-unread">{unreadCount}</span>}
            </button>

            <button className="lc-close-btn" onClick={handleClose} title={isHost ? 'End session' : 'Leave session'}>
              {isHost ? '📵 End' : '👋 Leave'}
            </button>
          </div>
        </div>

        {/* ── Body ── */}
        <div className="lc-body">

          {/* Main area: participant grid */}
          <div className="lc-content">

            {/* Participant grid */}
            <div className={`lc-grid lc-grid-${Math.min(participants.length, 6)}`}>
              {/* Local (self) tile */}
              <div className={`lc-tile lc-tile-self ${localAudioEnabled ? 'speaking' : ''}`}>
                {localVideoEnabled
                  ? <video ref={localVideoRef} autoPlay muted playsInline className="lc-tile-video" />
                  : <div className="lc-tile-avatar">{myInitials}</div>
                }
                {/* hidden video element so stream is always attached */}
                {!localVideoEnabled && (
                  <video ref={localVideoRef} autoPlay muted playsInline style={{ display: 'none' }} />
                )}
                <div className="lc-tile-footer">
                  <span className="lc-tile-name">
                    You
                    {isHost && <span className="lc-role-badge host">Host</span>}
                  </span>
                  <span className="lc-tile-mic">{localAudioEnabled ? '🎙' : '🔇'}</span>
                </div>
              </div>

              {/* Remote participant tiles */}
              {others.map(p => (
                <ParticipantTile
                  key={p.socketId}
                  participant={p}
                  isHost={isHost}
                  hostSocketId={hostSocketId}
                  onHostAction={handleHostAction}
                />
              ))}
            </div>

            {participants.length <= 1 && (
              <div className="lc-waiting">
                <div className="lc-waiting-icon">👋</div>
                <div className="lc-waiting-title">Waiting for participants…</div>
                <div className="lc-waiting-sub">Share the invite link so students can join</div>
                <div className="lc-waiting-link">
                  <code>{shareLink}</code>
                  <button className="lc-btn-copy" onClick={copyLink}>
                    {linkCopied ? '✓ Copied!' : '📋 Copy'}
                  </button>
                </div>
              </div>
            )}

            {/* Bottom controls bar */}
            <div className="lc-controls">
              <button
                className={`lc-ctrl-btn ${localAudioEnabled ? '' : 'muted'}`}
                onClick={toggleLocalAudio}
                title={localAudioEnabled ? 'Mute mic' : 'Unmute mic'}
              >
                <span className="lc-ctrl-icon">{localAudioEnabled ? '🎙' : '🔇'}</span>
                <span className="lc-ctrl-label">{localAudioEnabled ? 'Mute' : 'Unmute'}</span>
              </button>

              <button
                className={`lc-ctrl-btn ${localVideoEnabled ? '' : 'muted'}`}
                onClick={toggleLocalVideo}
                title={localVideoEnabled ? 'Turn off camera' : 'Turn on camera'}
              >
                <span className="lc-ctrl-icon">{localVideoEnabled ? '📷' : '🚫'}</span>
                <span className="lc-ctrl-label">{localVideoEnabled ? 'Camera' : 'No Cam'}</span>
              </button>

              {isHost && (
                <button
                  className={`lc-ctrl-btn ${chatEnabled ? '' : 'muted'}`}
                  onClick={() => handleHostAction('chat_toggle', '', !chatEnabled)}
                  title={chatEnabled ? 'Disable chat for participants' : 'Enable chat'}
                >
                  <span className="lc-ctrl-icon">💬</span>
                  <span className="lc-ctrl-label">Chat {chatEnabled ? 'On' : 'Off'}</span>
                </button>
              )}

              <button
                className="lc-ctrl-btn danger"
                onClick={handleClose}
              >
                <span className="lc-ctrl-icon">{isHost ? '📵' : '👋'}</span>
                <span className="lc-ctrl-label">{isHost ? 'End' : 'Leave'}</span>
              </button>
            </div>
          </div>

          {/* ── Chat panel ── */}
          {chatOpen && (
            <div className="lc-chat">
              <div className="lc-chat-header">
                <span>💬 Class Chat</span>
                {!chatEnabled && <span className="lc-chat-off">Chat disabled</span>}
                <button className="lc-chat-close-btn" onClick={() => setChatOpen(false)}>✕</button>
              </div>

              <div className="lc-chat-body">
                {chatMessages.length === 0 && (
                  <div className="lc-chat-empty">
                    No messages yet.{chatEnabled ? ' Say hello 👋' : ''}
                  </div>
                )}
                {chatMessages.map(msg => (
                  <div
                    key={msg.id}
                    className={`lc-chat-msg ${msg.senderId === ((user as any)?._id || (user as any)?.id) ? 'mine' : ''}`}
                  >
                    <div className="lc-chat-av">{msg.initials}</div>
                    <div className="lc-chat-bubble">
                      <div className="lc-chat-meta">
                        <span className="lc-chat-sender">{msg.senderName}</span>
                        {msg.role === 'host' && <span className="lc-role-badge host" style={{ fontSize: 9 }}>Host</span>}
                        {msg.role === 'speaker' && <span className="lc-role-badge speaker" style={{ fontSize: 9 }}>Speaker</span>}
                        <span className="lc-chat-time">
                          {new Date(msg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </span>
                      </div>
                      <div className="lc-chat-text">{msg.text}</div>
                    </div>
                  </div>
                ))}
                <div ref={chatBottomRef} />
              </div>

              <div className="lc-chat-input-row">
                <input
                  className="lc-chat-input"
                  placeholder={chatEnabled ? 'Type a message…' : 'Chat disabled by host'}
                  disabled={!chatEnabled}
                  value={chatInput}
                  onChange={e => setChatInput(e.target.value)}
                  onKeyDown={e => {
                    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendChat(); }
                  }}
                  maxLength={500}
                />
                <button
                  className="lc-btn-primary"
                  style={{ padding: '10px 16px', flexShrink: 0 }}
                  disabled={!chatEnabled || !chatInput.trim()}
                  onClick={sendChat}
                >
                  Send
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default LiveClassroom;
