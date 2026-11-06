import type { PlaybackState } from './playback';
import { validatePlayback } from './validation';
export function initialPlayback(runId: string): PlaybackState {
  return { schemaVersion: 1, runId, status: 'idle', cursor: 0, bufferedEventCount: 0, totalEventCount: null, generationComplete: false, speed: 1, elapsedInEventMs: 0, errorCode: null };
}
export type PlaybackAction = { type: 'BUFFER'; count: number; complete: boolean; intent: boolean }
  | { type: 'PLAY' } | { type: 'PAUSE' } | { type: 'SEEK'; cursor: number } | { type: 'SPEED'; speed: number }
  | { type: 'ERROR'; code: string } | { type: 'TICK'; deltaMs: number; durations: readonly number[] };
export function playbackReducer(state: PlaybackState, action: PlaybackAction): PlaybackState {
  let next = state;
  if (action.type === 'ERROR') return { ...state, status: 'error', errorCode: action.code, elapsedInEventMs: 0 };
  if (state.status === 'error') return state;
  switch (action.type) {
    case 'BUFFER':
      if (action.count < state.bufferedEventCount) throw new Error('INVALID_PLAYBACK');
      next = { ...state, bufferedEventCount: action.count, generationComplete: action.complete, totalEventCount: action.complete ? action.count : null,
        status: action.complete && state.cursor === action.count ? 'completed' : action.intent ? state.cursor < action.count ? 'playing' : 'buffering' : 'paused' };
      break;
    case 'PLAY':
      next = { ...state, cursor: state.status === 'completed' ? 0 : state.cursor, elapsedInEventMs: state.status === 'completed' ? 0 : state.elapsedInEventMs,
        status: state.bufferedEventCount > 0 ? 'playing' : state.generationComplete ? 'completed' : 'buffering' }; break;
    case 'PAUSE': next = { ...state, status: state.status === 'completed' ? 'completed' : 'paused' }; break;
    case 'SEEK': next = { ...state, cursor: action.cursor, elapsedInEventMs: 0,
      status: state.generationComplete && action.cursor === state.totalEventCount ? 'completed' : 'paused' }; break;
    case 'SPEED': next = { ...state, speed: action.speed }; break;
    case 'TICK': {
      if (state.status !== 'playing') return state;
      if (!Number.isFinite(action.deltaMs) || action.deltaMs < 0 || action.durations.length !== state.bufferedEventCount) throw new Error('INVALID_PLAYBACK');
      let elapsed = state.elapsedInEventMs + Math.min(250, action.deltaMs) * state.speed; let cursor = state.cursor; let committed = 0;
      while (cursor < state.bufferedEventCount && committed < 128) {
        const duration = action.durations[cursor];
        if (!Number.isFinite(duration) || duration < 0 || duration > 5000) throw new Error('INVALID_PLAYBACK');
        if (elapsed < duration) break;
        elapsed -= duration; cursor++; committed++;
      }
      const ended = cursor === state.bufferedEventCount;
      next = { ...state, cursor, elapsedInEventMs: ended ? 0 : Math.min(elapsed, 5000), status: ended ? state.generationComplete ? 'completed' : 'buffering' : 'playing' }; break;
    }
  }
  validatePlayback(next); return next;
}
