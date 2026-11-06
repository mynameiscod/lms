import { playSelectionSound, soundFx } from './utils/soundEffects';
import { Play, Pause, SkipBack, SkipForward, RotateCcw } from 'lucide-react';
import type { PlaybackState } from './engine/playback';
export function PlaybackControls({ state, play, pause, seek, speed }: { state: PlaybackState; play: () => void; pause: () => void; seek: (cursor: number) => void; speed: (speed: number) => void }) {
  const playing = state.status === 'playing' || state.status === 'buffering';
  const unavailable = state.status === 'error' || state.bufferedEventCount === 0;
  return <section onClickCapture={()=>{void soundFx.unlock();}} onKeyDownCapture={()=>{void soundFx.unlock();}} className="playback-controls" aria-label="Playback controls">
    <div className="playback-buttons"><button className="icon-button" aria-label="Reset playback" disabled={unavailable} onClick={() => {playSelectionSound();seek(0);}}><RotateCcw size={17}/></button>
      <button className="icon-button" aria-label="Step back" disabled={unavailable || state.cursor === 0} onClick={() => seek(state.cursor - 1)}><SkipBack size={19}/></button>
      <button className="button primary playback-play" disabled={state.status === 'error' || state.status === 'idle' || (!playing && unavailable && state.generationComplete)} onClick={()=>{playSelectionSound();if(playing) pause();else play();}}>{playing ? <Pause size={16}/> : <Play size={16}/>} {playing ? 'Pause' : state.status === 'completed' ? 'Replay' : 'Play'}</button>
      <button className="icon-button" aria-label="Step forward" disabled={unavailable || state.cursor === state.bufferedEventCount} onClick={() => seek(state.cursor + 1)}><SkipForward size={19}/></button>
      <span className="playback-count" aria-live="polite">Step {state.cursor} / {state.totalEventCount ?? `${state.bufferedEventCount}+`}</span></div>
    <label className="seek-control">Seek <input aria-label="Seek to step" type="range" min={0} max={state.bufferedEventCount} value={state.cursor} step={1} disabled={unavailable} onChange={e => seek(Number(e.target.value))}/></label>
    <label className="speed-control">Speed <input aria-label="Playback speed" type="range" min={0.25} max={4} step={0.25} value={state.speed} onChange={e => {playSelectionSound();speed(Number(e.target.value));}}/><output>{state.speed}×</output></label>
  </section>;
}
