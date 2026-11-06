import { createWorkerEngine } from './workerEngine';
const engine = createWorkerEngine(message => postMessage(message), undefined, false);
globalThis.addEventListener('message', (event: MessageEvent<unknown>) => engine.receive(event.data));
