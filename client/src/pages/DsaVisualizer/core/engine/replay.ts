import type { VisualizationEvent } from './events';
import type { VisualScene } from './scene';
import { reduceScene } from './scene';
import { validateEvent } from './validation';
import { LIMITS, byteSize } from '../workers/workerProtocol';
function freeze<T>(value: T): T {
  if (value && typeof value === 'object' && !Object.isFrozen(value)) { Object.freeze(value); Object.values(value).forEach(freeze); }
  return value;
}
export class ReplayBuffer {
  private events: VisualizationEvent[] = [];
  private checkpoints = new Map<number, VisualScene>();
  private tail: VisualScene;
  private bytes = 0;
  private sealed = false;
  readonly initial: VisualScene;
  constructor(readonly runId: string, scene: VisualScene) { this.initial = freeze(structuredClone(scene)); this.tail = this.initial; this.checkpoints.set(0, this.initial); }
  get count() { return this.events.length; }
  get durations() { return this.events.map(e => e.durationMs); }
  event(index: number) { return this.events[index]; }
  append(events: readonly VisualizationEvent[]) {
    if (this.sealed || this.count + events.length > LIMITS.maxEvents || this.bytes + byteSize(events) > LIMITS.maxBytes) throw new Error('LIMIT_EXCEEDED');
    for (const [i, event] of events.entries()) validateEvent(event, this.runId, this.count + i, this.initial);
    for (const value of events) {
      const event = freeze(structuredClone(value)); this.events.push(event); this.tail = freeze(reduceScene(this.tail, event));
      if (this.count % 64 === 0) this.checkpoints.set(this.count, this.tail);
    }
    this.bytes += byteSize(events);
  }
  complete(total: number) { if (this.sealed || total !== this.count) throw new Error('INVALID_SEQUENCE'); this.sealed = true; }
  seek(cursor: number) {
    if (!Number.isSafeInteger(cursor) || cursor < 0 || cursor > this.count) throw new Error('INVALID_CURSOR');
    const checkpoint = Math.floor(cursor / 64) * 64; let scene = this.checkpoints.get(checkpoint)!;
    for (let i = checkpoint; i < cursor; i++) scene = reduceScene(scene, this.events[i]);
    return freeze(scene);
  }
}
