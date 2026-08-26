import React, { useState, useEffect, useRef, useCallback } from 'react';
import { learningContentLibraryApi } from '../../api/learningContentLibraryApi';

/**
 * Lesson video playback for students.
 *
 * Students could not move around inside a lesson video. Nothing was blocking them on
 * purpose — the uploaded player exposed only the native scrub bar (a few pixels tall on a
 * phone, and arrow keys only work once you have clicked the video), and the Bunny/YouTube/
 * Vimeo branches handed playback to an iframe we never spoke to. So "go back ten seconds,
 * I missed that" had no answer.
 *
 * Two players are driveable and both are driven here: the uploaded <video>, which we own
 * outright, and the Bunny embed, which speaks the Player.js postMessage protocol. YouTube
 * and Vimeo keep their own controls, which already seek perfectly well on their own.
 */

const SKIP_SECONDS = 10;
const BIG_SKIP_SECONDS = 30;
const SPEEDS = [0.75, 1, 1.25, 1.5, 2];

/**
 * Bunny publishes a Player.js build for driving its embed from the parent page.
 * Loaded once per page and shared, rather than per player instance.
 */
const PLAYERJS_SRC = 'https://assets.mediadelivery.net/playerjs/player-0.1.0.min.js';
let playerjsLoad: Promise<any> | null = null;

function loadPlayerjs(): Promise<any> {
  if ((window as any).playerjs) return Promise.resolve((window as any).playerjs);
  if (playerjsLoad) return playerjsLoad;

  playerjsLoad = new Promise((resolve, reject) => {
    const done = () => resolve((window as any).playerjs);
    const existing = document.querySelector(`script[src="${PLAYERJS_SRC}"]`);
    if (existing) {
      existing.addEventListener('load', done);
      existing.addEventListener('error', reject);
      return;
    }
    const tag = document.createElement('script');
    tag.src = PLAYERJS_SRC;
    tag.async = true;
    tag.onload = done;
    tag.onerror = () => reject(new Error('playerjs failed to load'));
    document.head.appendChild(tag);
  });
  return playerjsLoad;
}

function formatTime(secs: number): string {
  if (!secs || !isFinite(secs) || secs < 0) return '0:00';
  const total = Math.floor(secs);
  const h = Math.floor(total / 3600);
  const m = Math.floor((total % 3600) / 60);
  const s = total % 60;
  const pad = (n: number) => String(n).padStart(2, '0');
  return h > 0 ? `${h}:${pad(m)}:${pad(s)}` : `${m}:${pad(s)}`;
}

/**
 * Watch progress and the completion hand-off.
 *
 * Threshold 0 means "complete on open" (see LearningContentLibrary.completionThreshold),
 * so firing on the first progress report is deliberate, not an off-by-one.
 */
function useWatchProgress(threshold: number, onWatchEnough: () => void) {
  const [pct, setPct] = useState(0);
  const notified = useRef(false);
  const notify = useRef(onWatchEnough);
  notify.current = onWatchEnough;

  const report = useCallback((time: number, duration: number) => {
    if (!duration || !isFinite(duration) || duration <= 0) return;
    const watched = Math.round((time / duration) * 100);
    setPct(watched);
    if (!notified.current && watched >= threshold) {
      notified.current = true;
      notify.current();
    }
  }, [threshold]);

  return { pct, report };
}

// ─── Controls ─────────────────────────────────────────────────────────────────

const btnStyle: React.CSSProperties = {
  display: 'inline-flex', alignItems: 'center', gap: 6,
  padding: '6px 11px', border: '1px solid #e2e8f0', borderRadius: 8,
  background: '#fff', color: '#334155', fontSize: 13, fontWeight: 600,
  cursor: 'pointer', lineHeight: 1.2,
};

function SeekControls({
  onSkip, currentTime, duration, speed, onSpeedChange, note,
}: {
  onSkip: (delta: number) => void;
  currentTime: number;
  duration: number;
  speed?: number;
  onSpeedChange?: (s: number) => void;
  note?: string;
}) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', flexWrap: 'wrap', gap: 8, marginTop: 8 }}>
      <button
        type="button"
        style={btnStyle}
        onClick={() => onSkip(-SKIP_SECONDS)}
        aria-label={`Rewind ${SKIP_SECONDS} seconds`}
        title={`Rewind ${SKIP_SECONDS}s (left arrow)`}
      >
        <i className="bi bi-arrow-counterclockwise" /> {SKIP_SECONDS}s
      </button>
      <button
        type="button"
        style={btnStyle}
        onClick={() => onSkip(SKIP_SECONDS)}
        aria-label={`Forward ${SKIP_SECONDS} seconds`}
        title={`Forward ${SKIP_SECONDS}s (right arrow)`}
      >
        {SKIP_SECONDS}s <i className="bi bi-arrow-clockwise" />
      </button>

      {duration > 0 && (
        <span style={{ fontSize: 12, color: '#64748b', fontVariantNumeric: 'tabular-nums' }}>
          {formatTime(currentTime)} / {formatTime(duration)}
        </span>
      )}

      {onSpeedChange && (
        <label style={{ display: 'inline-flex', alignItems: 'center', gap: 5, marginLeft: 'auto', fontSize: 12, color: '#64748b' }}>
          Speed
          <select
            value={speed}
            onChange={e => onSpeedChange(Number(e.target.value))}
            aria-label="Playback speed"
            style={{ border: '1px solid #e2e8f0', borderRadius: 7, padding: '4px 6px', fontSize: 12, color: '#334155', background: '#fff', cursor: 'pointer' }}
          >
            {SPEEDS.map(s => <option key={s} value={s}>{s}x</option>)}
          </select>
        </label>
      )}

      {note && <span style={{ fontSize: 11, color: '#94a3b8', width: '100%' }}>{note}</span>}
    </div>
  );
}

function ProgressNote({ threshold, pct }: { threshold: number; pct: number }) {
  if (threshold <= 0) return null;
  return (
    <div style={{ fontSize: '12px', color: '#64748b', marginTop: '6px' }}>
      Watch progress: {pct}% · Completion at {threshold}%
      {pct >= threshold && <span style={{ color: '#10b981', marginLeft: '8px' }}>✓ Threshold reached</span>}
    </div>
  );
}

/** Keys we take over. Ignored while the student is typing somewhere. */
function useSeekKeys(onSkip: (delta: number) => void, onTogglePlay?: () => void) {
  return useCallback((e: React.KeyboardEvent) => {
    const el = e.target as HTMLElement;
    const tag = el?.tagName?.toLowerCase();
    if (tag === 'input' || tag === 'textarea' || tag === 'select' || el?.isContentEditable) return;

    const step = e.shiftKey ? BIG_SKIP_SECONDS : SKIP_SECONDS;
    if (e.key === 'ArrowLeft' || e.key === 'j' || e.key === 'J') {
      e.preventDefault();
      onSkip(-step);
    } else if (e.key === 'ArrowRight' || e.key === 'l' || e.key === 'L') {
      e.preventDefault();
      onSkip(step);
    } else if (onTogglePlay && (e.key === 'k' || e.key === 'K')) {
      e.preventDefault();
      onTogglePlay();
    }
  }, [onSkip, onTogglePlay]);
}

// ─── Bunny embed, driven over Player.js ───────────────────────────────────────

/**
 * The Bunny iframe is cross-origin, so the only way in is the Player.js protocol it
 * implements. Worth the wiring twice over: the timeupdate stream also gives us real
 * watch-percent tracking, which the iframe branches never had — completionThreshold was
 * silently ignored for every Bunny, YouTube and Vimeo lesson.
 *
 * Two paths run side by side on purpose. The first attempt here hand-rolled the protocol
 * and shipped dead: it only accepted string payloads, so an embed that posts objects was
 * ignored down to the last message and every button did nothing. Bunny's own library is
 * now the primary path, with a corrected raw listener behind it, and `ready` gates the
 * controls so a bridge that fails again hides the buttons instead of faking them.
 */
function useBunnyPlayer(
  iframeRef: React.RefObject<HTMLIFrameElement>,
  onProgress: (time: number, duration: number) => void,
) {
  const clock = useRef({ time: 0, duration: 0 });
  const [tick, setTick] = useState({ time: 0, duration: 0 });
  const [ready, setReady] = useState(false);
  const player = useRef<any>(null);
  const report = useRef(onProgress);
  report.current = onProgress;

  const post = useCallback((message: Record<string, any>) => {
    iframeRef.current?.contentWindow?.postMessage(
      JSON.stringify({ context: 'player.js', version: '0.0.11', ...message }),
      '*',
    );
  }, [iframeRef]);

  useEffect(() => {
    let cancelled = false;

    const accept = (seconds: any, duration: any) => {
      if (cancelled) return;
      const time = Number(seconds) || 0;
      const total = Number(duration) || 0;
      clock.current = { time, duration: total };
      setTick({ time, duration: total });
      if (total > 0) setReady(true);
      report.current(time, total);
    };

    // Primary: the library Bunny publishes for exactly this.
    loadPlayerjs()
      .then(pj => {
        if (cancelled || !pj || !iframeRef.current) return;
        const p = new pj.Player(iframeRef.current);
        player.current = p;
        p.on('ready', () => {
          if (cancelled) return;
          setReady(true);
          p.on('timeupdate', (d: any) => accept(d?.seconds, d?.duration));
        });
      })
      .catch(() => { /* the raw listener below is the fallback */ });

    // Fallback: the same protocol by hand, accepting both payload encodings this time.
    const subscribe = () => post({ method: 'addEventListener', value: 'timeupdate', listener: 'tu' });
    const onMessage = (e: MessageEvent) => {
      let data: any = e.data;
      if (typeof data === 'string') {
        try {
          data = JSON.parse(data);
        } catch {
          return;
        }
      }
      if (!data || data.context !== 'player.js') return;

      if (data.event === 'ready') {
        setReady(true);
        subscribe();
      }
      if (data.event === 'timeupdate' && data.value) accept(data.value.seconds, data.value.duration);
    };

    window.addEventListener('message', onMessage);
    // The embed may have gone ready before this listener existed, in which case its one
    // "ready" is already gone. Ask again unprompted rather than wait for a second.
    const retry = window.setTimeout(subscribe, 1200);
    return () => {
      cancelled = true;
      window.removeEventListener('message', onMessage);
      window.clearTimeout(retry);
    };
  }, [post, iframeRef]);

  const skip = useCallback((delta: number) => {
    const { time, duration } = clock.current;
    let next = time + delta;
    if (next < 0) next = 0;
    if (duration > 0 && next > duration) next = duration;

    if (player.current?.setCurrentTime) {
      try {
        player.current.setCurrentTime(next);
      } catch { /* fall through to the raw post */ }
    }
    post({ method: 'setCurrentTime', value: next });

    clock.current = { ...clock.current, time: next };
    setTick(t => ({ ...t, time: next }));
  }, [post]);

  return { skip, ready, ...tick };
}

function BunnyPlayer({ content, threshold, onWatchEnough }: { content: any; threshold: number; onWatchEnough: () => void }) {
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const { pct, report } = useWatchProgress(threshold, onWatchEnough);
  const { skip, ready, time, duration } = useBunnyPlayer(iframeRef, report);
  // Keyboard reaches us only while focus sits outside the iframe, which it rarely does
  // once playback starts. Wired because it costs nothing, never advertised because it
  // cannot be relied on — the buttons are the honest control here.
  const onKeyDown = useSeekKeys(skip);

  return (
    <div onKeyDown={onKeyDown} tabIndex={0} style={{ outline: 'none' }}>
      <div style={{ position: 'relative', paddingBottom: '56.25%', height: 0, borderRadius: '10px', overflow: 'hidden' }}>
        <iframe
          ref={iframeRef}
          src={`https://iframe.mediadelivery.net/embed/${content.bunnyLibraryId}/${content.bunnyVideoId}?autoplay=false&preload=true&responsive=true`}
          loading="lazy"
          style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', border: 'none' }}
          allow="accelerometer;gyroscope;autoplay;encrypted-media;picture-in-picture;"
          allowFullScreen
          title={content.title}
        />
      </div>
      {ready && <SeekControls onSkip={skip} currentTime={time} duration={duration} />}
      <ProgressNote threshold={threshold} pct={pct} />
    </div>
  );
}

// ─── Uploaded file, native <video> ────────────────────────────────────────────

function UploadedPlayer({ content, threshold, onWatchEnough }: { content: any; threshold: number; onWatchEnough: () => void }) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [speed, setSpeed] = useState(1);
  const [time, setTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [unseekable, setUnseekable] = useState(false);
  const { pct, report } = useWatchProgress(threshold, onWatchEnough);

  const streamUrl = learningContentLibraryApi.getStreamUrl(content._id);

  const skip = useCallback((delta: number) => {
    const v = videoRef.current;
    if (!v) return;
    const max = isFinite(v.duration) ? v.duration : Number.MAX_SAFE_INTEGER;
    v.currentTime = Math.min(Math.max(v.currentTime + delta, 0), max);
  }, []);

  const togglePlay = useCallback(() => {
    const v = videoRef.current;
    if (!v) return;
    if (v.paused) v.play().catch(() => { /* blocked autoplay is not an error worth surfacing */ });
    else v.pause();
  }, []);

  const onKeyDown = useSeekKeys(skip, togglePlay);

  const handleTimeUpdate = useCallback(() => {
    const v = videoRef.current;
    if (!v || !v.duration) return;
    setTime(v.currentTime);
    report(v.currentTime, v.duration);
  }, [report]);

  /**
   * A file whose moov atom sits after mdat gives the browser no duration and no way to map
   * a timestamp to a byte offset, so every seek control here is inert through no fault of
   * its own. Say that plainly instead of leaving buttons that quietly do nothing.
   */
  const handleLoadedMetadata = useCallback(() => {
    const v = videoRef.current;
    if (!v) return;
    setDuration(v.duration);
    setUnseekable(!isFinite(v.duration) || v.duration <= 0);
    v.playbackRate = speed;
  }, [speed]);

  const changeSpeed = useCallback((s: number) => {
    setSpeed(s);
    if (videoRef.current) videoRef.current.playbackRate = s;
  }, []);

  return (
    <div onKeyDown={onKeyDown} tabIndex={0} style={{ outline: 'none' }}>
      <video
        ref={videoRef}
        src={streamUrl}
        poster={content.videoThumbnail || undefined}
        controls
        preload="metadata"
        onTimeUpdate={handleTimeUpdate}
        onLoadedMetadata={handleLoadedMetadata}
        style={{ width: '100%', borderRadius: '10px', background: '#000' }}
      />
      <SeekControls
        onSkip={skip}
        currentTime={time}
        duration={duration}
        speed={speed}
        onSpeedChange={changeSpeed}
        note="Tip: the left and right arrow keys skip 10s (hold Shift for 30s), K plays and pauses."
      />
      {unseekable && (
        <div style={{ fontSize: 12, color: '#92400e', background: '#fffbeb', border: '1px solid #fde68a', borderRadius: 8, padding: '8px 10px', marginTop: 6 }}>
          <i className="bi bi-exclamation-triangle" style={{ marginRight: 6 }} />
          This file was uploaded in a format that cannot be skipped through. It will play from
          the start, but seeking will not work until it is re-encoded — please let your trainer know.
        </div>
      )}
      <ProgressNote threshold={threshold} pct={pct} />
    </div>
  );
}

// ─── Entry point ──────────────────────────────────────────────────────────────

export function VideoPlayer({ content, onWatchEnough }: { content: any; onWatchEnough: () => void }) {
  const threshold = content.completionThreshold || 0;

  if (content.videoSource === 'youtube' && content.videoUrl) {
    const ytId = content.videoUrl.match(/(?:v=|youtu\.be\/)([A-Za-z0-9_-]{11})/)?.[1];
    return (
      <div style={{ position: 'relative', paddingBottom: '56.25%', height: 0, borderRadius: '10px', overflow: 'hidden' }}>
        <iframe
          src={`https://www.youtube.com/embed/${ytId}`}
          style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', border: 'none' }}
          allowFullScreen
          title={content.title}
        />
      </div>
    );
  }

  if (content.videoSource === 'bunny' && content.bunnyVideoId && content.bunnyLibraryId) {
    /**
     * A failed encode must not be dressed up as a slow one.
     *
     * Bunny shows the same "Processing video" placeholder for a video that is transcoding
     * and one that errored, so a recording that will never play looks like it is nearly
     * ready — and a student waits for something that is not coming. 5 and 6 are terminal:
     * say so, and tell whoever can act what to do about it.
     */
    if (content.bunnyStatus === 5 || content.bunnyStatus === 6) {
      return (
        <div style={{ borderRadius: 10, border: '1px solid #fde68a', background: '#fffbeb', color: '#92400e', padding: '20px 18px' }}>
          <div style={{ fontWeight: 700, fontSize: 14, marginBottom: 4 }}>
            <i className="bi bi-exclamation-triangle" style={{ marginRight: 8 }} />
            This recording could not be processed
          </div>
          <div style={{ fontSize: 13, lineHeight: 1.55 }}>
            The upload failed while being prepared, so there is nothing to play. It needs to be
            uploaded again — please let your trainer know.
          </div>
        </div>
      );
    }

    // Still working. Bunny's own placeholder is fine here, but say why, so "nothing is
    // happening" reads as "not yet" rather than "broken".
    if (content.bunnyStatus !== undefined && content.bunnyStatus < 4) {
      return (
        <div style={{ borderRadius: 10, border: '1px solid #bae6fd', background: '#f0f9ff', color: '#075985', padding: '20px 18px' }}>
          <div style={{ fontWeight: 700, fontSize: 14, marginBottom: 4 }}>
            <i className="bi bi-hourglass-split" style={{ marginRight: 8 }} />
            Still being prepared
          </div>
          <div style={{ fontSize: 13, lineHeight: 1.55 }}>
            This recording is being processed and will play shortly. Check back in a few minutes.
          </div>
        </div>
      );
    }

    return <BunnyPlayer content={content} threshold={threshold} onWatchEnough={onWatchEnough} />;
  }

  if (content.videoSource === 'vimeo' && content.videoUrl) {
    const vimeoId = content.videoUrl.match(/vimeo\.com\/(\d+)/)?.[1];
    return (
      <div style={{ position: 'relative', paddingBottom: '56.25%', height: 0, borderRadius: '10px', overflow: 'hidden' }}>
        <iframe
          src={`https://player.vimeo.com/video/${vimeoId}`}
          style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', border: 'none' }}
          allowFullScreen
          title={content.title}
        />
      </div>
    );
  }

  // Uploaded video (streaming)
  return <UploadedPlayer content={content} threshold={threshold} onWatchEnough={onWatchEnough} />;
}

export default VideoPlayer;
