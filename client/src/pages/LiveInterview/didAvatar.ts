import { studentInterviewApi as api } from '../../api/interviewModuleApi';

/**
 * D-ID Streams talking-head client. Sets up a WebRTC peer connection (via the
 * server proxy) and renders the live lip-synced video into a <video> element.
 * Uses the video track's mute/unmute (D-ID's idle/speaking signal) to drive the
 * hands-free loop. Fully self-contained; throws on setup failure so the caller
 * can fall back to the animated avatar.
 */
export class DidAvatar {
  private pc: RTCPeerConnection | null = null;
  private streamId = '';
  private sessionId = '';
  onSpeakStart?: () => void;
  onSpeakEnd?: () => void;

  async connect(videoEl: HTMLVideoElement): Promise<void> {
    const res: any = await api.didCreate();
    const d = res?.data || res;
    const { id, offer, ice_servers, session_id } = d;
    if (!id || !offer) throw new Error('D-ID stream not created');
    this.streamId = id;
    this.sessionId = session_id;

    const pc = new RTCPeerConnection({ iceServers: ice_servers });
    this.pc = pc;

    pc.onicecandidate = (e) => {
      if (e.candidate) {
        api.didIce(id, {
          candidate: e.candidate.candidate,
          sdpMid: e.candidate.sdpMid,
          sdpMLineIndex: e.candidate.sdpMLineIndex,
        }, session_id).catch(() => { /* non-fatal */ });
      }
    };

    pc.ontrack = (e) => {
      if (e.track.kind !== 'video') return;
      videoEl.srcObject = e.streams[0];
      videoEl.play?.().catch(() => { /* autoplay; muted not set since we want audio */ });
      // D-ID unmutes the video track while speaking, mutes when idle/done.
      e.track.onunmute = () => this.onSpeakStart?.();
      e.track.onmute = () => this.onSpeakEnd?.();
    };

    await pc.setRemoteDescription(offer);
    const answer = await pc.createAnswer();
    await pc.setLocalDescription(answer);
    await api.didSdp(id, answer, session_id);

    // Wait briefly for the connection to establish.
    await new Promise<void>((resolve, reject) => {
      const t = setTimeout(() => reject(new Error('D-ID connection timed out')), 12000);
      pc.oniceconnectionstatechange = () => {
        if (['connected', 'completed'].includes(pc.iceConnectionState)) { clearTimeout(t); resolve(); }
        else if (['failed', 'closed'].includes(pc.iceConnectionState)) { clearTimeout(t); reject(new Error('D-ID connection failed')); }
      };
    });
  }

  async talk(text: string): Promise<void> {
    if (!this.streamId) throw new Error('D-ID not connected');
    await api.didTalk(this.streamId, this.sessionId, text);
  }

  close(): void {
    try { this.pc?.close(); } catch { /* ignore */ }
    if (this.streamId) api.didClose(this.streamId, this.sessionId).catch(() => { /* ignore */ });
    this.pc = null; this.streamId = '';
  }
}
