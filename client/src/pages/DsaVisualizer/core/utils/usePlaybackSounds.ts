import { useEffect, useRef } from 'react';
import { soundFx } from './soundEffects';

interface PlaybackSoundState {
  readonly run: unknown;
  readonly cursor: number;
  readonly complete: boolean;
  readonly found?: boolean;
  readonly boundary?: boolean;
  readonly value: number;
  readonly values: readonly number[];
}
/** Emit once per committed movement, never per React render or initial mount. */
export function usePlaybackSounds(state:PlaybackSoundState):void {
  const previous=useRef<PlaybackSoundState|null>(null);
  const success=useRef(false),error=useRef(false);
  useEffect(()=>{
    const before=previous.current;previous.current=state;
    if(!before) return;
    const newRun=before.run!==state.run;
    if(newRun) {success.current=false;error.current=false;}
    if(state.cursor===0 && !state.boundary) {success.current=false;error.current=false;return;}
    if(state.boundary) {if(!error.current) {soundFx.playError();error.current=true;}return;}
    if(newRun) return;
    // A worker can report completion after its last buffered frame was rendered.
    if(state.cursor>0 && state.complete && !before.complete && !success.current) {soundFx.playSuccess();success.current=true;return;}
    if(state.cursor===before.cursor) return;
    if(state.cursor>before.cursor && !success.current && (state.complete||state.found)) {soundFx.playSuccess();success.current=true;return;}
    const values=state.values.filter(Number.isFinite);
    soundFx.playTone(state.value,values.length?Math.min(...values):0,values.length?Math.max(...values):1);
  },[state]);
}
