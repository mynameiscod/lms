import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { initialPlayback, playbackReducer } from './playbackReducer';
import type { PlaybackAction } from './playbackReducer';
import type { Generation } from '../useAlgorithmWorker';
export function usePlayback(generation: Generation) {
  const [state, setState] = useState(() => initialPlayback(generation.runId));
  const intent = useRef(false);
  const dispatch = useCallback((action: PlaybackAction) => setState(current => {
    try { return playbackReducer(current, action); }
    catch { intent.current = false; return playbackReducer(current, { type: 'ERROR', code: 'INVALID_PLAYBACK' }); }
  }), []);
  useLayoutEffect(() => { intent.current = false; setState(initialPlayback(generation.runId)); }, [generation.runId]);
  useEffect(() => {
    if (generation.error) { intent.current = false; dispatch({ type: 'ERROR', code: generation.error }); }
    else if (generation.buffer) dispatch({ type: 'BUFFER', count: generation.count, complete: generation.complete, intent: intent.current });
  }, [generation.runId, generation.buffer, generation.count, generation.complete, generation.error, dispatch]);
  // The buffer is appended in place, so the event count is what marks a new batch.
  const durations = useMemo(() => generation.buffer?.durations.slice(0, generation.count) ?? [], [generation.buffer, generation.count]);
  useEffect(() => {
    if (state.status !== 'playing') return;
    let id = 0, last: number | null = null;
    const frame = (now: number) => { if (last !== null) dispatch({ type: 'TICK', deltaMs: now - last, durations }); last = now; id = requestAnimationFrame(frame); };
    id = requestAnimationFrame(frame); return () => cancelAnimationFrame(id);
  }, [state.status, durations, dispatch]);
  useEffect(() => {
    const hidden = () => { if (document.hidden) { intent.current = false; dispatch({ type: 'PAUSE' }); } };
    document.addEventListener('visibilitychange', hidden); return () => document.removeEventListener('visibilitychange', hidden);
  }, [dispatch]);
  const current = state.runId === generation.runId ? state : initialPlayback(generation.runId);
  const scene = useMemo(() => generation.buffer?.seek(Math.min(current.cursor, generation.count)) ?? null, [generation.buffer, generation.count, current.cursor]);
  return { state: current, scene,
    play: () => { if (document.hidden) return; intent.current = true; dispatch({ type: 'PLAY' }); },
    pause: () => { intent.current = false; dispatch({ type: 'PAUSE' }); },
    seek: (cursor: number) => { intent.current = false; dispatch({ type: 'SEEK', cursor }); },
    speed: (speed: number) => dispatch({ type: 'SPEED', speed }),
  };
}
