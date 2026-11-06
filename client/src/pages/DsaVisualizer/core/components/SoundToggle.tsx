import { useSyncExternalStore } from 'react';
import { Volume2, VolumeX } from 'lucide-react';
import { soundFx } from '../utils/soundEffects';

/** Every mounted toggle subscribes to the same engine, with no provider required. */
export default function SoundToggle() {
  const muted=useSyncExternalStore(soundFx.subscribe,soundFx.getMuted,()=>false);
  const volume=useSyncExternalStore(soundFx.subscribe,soundFx.getVolume,()=>1);
  return <div className="global-sound-controls"><button type="button" className="sound-toggle" aria-label={muted?'Unmute sound':'Mute sound'} aria-pressed={!muted} title={muted?'Unmute sound':'Mute sound'}
    onClick={()=>{soundFx.setMuted(!muted);if(muted) void soundFx.unlock().then(()=>soundFx.playSelect());}}>
    {muted?<VolumeX size={16}/>:<Volume2 size={16}/>}<span>{muted?'Unmute':'Mute'}</span>
  </button>{!muted&&<details className="global-sound-settings"><summary>Volume</summary><div><label title="Global volume">Volume<input aria-label="Global sound volume" type="range" min="0" max="100" value={Math.round(volume*100)} onChange={event=>soundFx.setVolume(Number(event.target.value)/100)}/></label><button type="button" className="sound-toggle" onClick={()=>{void soundFx.unlock().then(()=>soundFx.playSuccess());}}>Test sound</button></div></details>}</div>;
}
