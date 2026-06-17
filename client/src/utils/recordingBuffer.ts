// Crash-safe local buffer for class recordings (Tier 1).
// Every MediaRecorder chunk is mirrored to IndexedDB as it arrives, so a tab
// crash / accidental close / forgot-to-save no longer loses the recording — it
// can be recovered and uploaded on the next visit.

const DB_NAME = 'cb-recordings';
const DB_VER = 1;
const SESSIONS = 'sessions';
const CHUNKS = 'chunks';

export interface RecSession {
  id: string;
  title: string;
  mime: string;
  mode: string;
  status: 'recording' | 'recorded';
  durationSec: number;
  bytes: number;
  chunkCount: number;
  createdAt: number;
  updatedAt: number;
}

let dbp: Promise<IDBDatabase> | null = null;
function db(): Promise<IDBDatabase> {
  if (dbp) return dbp;
  dbp = new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, DB_VER);
    req.onupgradeneeded = () => {
      const d = req.result;
      if (!d.objectStoreNames.contains(SESSIONS)) d.createObjectStore(SESSIONS, { keyPath: 'id' });
      if (!d.objectStoreNames.contains(CHUNKS)) {
        const cs = d.createObjectStore(CHUNKS, { keyPath: 'k', autoIncrement: true });
        cs.createIndex('bySession', 'sessionId', { unique: false });
      }
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
  return dbp;
}

const tx = async (store: string, mode: IDBTransactionMode) => {
  const d = await db();
  return d.transaction(store, mode).objectStore(store);
};
const done = (req: IDBRequest) => new Promise<any>((res, rej) => { req.onsuccess = () => res(req.result); req.onerror = () => rej(req.error); });

export async function rbStart(s: { id: string; title: string; mime: string; mode: string }): Promise<void> {
  try {
    const store = await tx(SESSIONS, 'readwrite');
    const now = Date.now();
    await done(store.put({ ...s, status: 'recording', durationSec: 0, bytes: 0, chunkCount: 0, createdAt: now, updatedAt: now } as RecSession));
  } catch { /* buffering is best-effort, never block recording */ }
}

export async function rbAppend(sessionId: string, blob: Blob): Promise<void> {
  try {
    const cstore = await tx(CHUNKS, 'readwrite');
    await done(cstore.add({ sessionId, blob }));
    const sstore = await tx(SESSIONS, 'readwrite');
    const sess: RecSession = await done(sstore.get(sessionId));
    if (sess) { sess.bytes += blob.size; sess.chunkCount += 1; sess.updatedAt = Date.now(); await done(sstore.put(sess)); }
  } catch { /* best-effort */ }
}

export async function rbMark(sessionId: string, patch: Partial<RecSession>): Promise<void> {
  try {
    const store = await tx(SESSIONS, 'readwrite');
    const sess: RecSession = await done(store.get(sessionId));
    if (sess) { Object.assign(sess, patch, { updatedAt: Date.now() }); await done(store.put(sess)); }
  } catch { /* best-effort */ }
}

export async function rbList(): Promise<RecSession[]> {
  try {
    const store = await tx(SESSIONS, 'readonly');
    const all: RecSession[] = await done(store.getAll());
    return (all || []).sort((a, b) => b.createdAt - a.createdAt);
  } catch { return []; }
}

export async function rbChunks(sessionId: string): Promise<Blob[]> {
  try {
    const d = await db();
    const idx = d.transaction(CHUNKS, 'readonly').objectStore(CHUNKS).index('bySession');
    const rows: any[] = await done(idx.getAll(IDBKeyRange.only(sessionId)));
    return (rows || []).map(r => r.blob);
  } catch { return []; }
}

export async function rbDelete(sessionId: string): Promise<void> {
  try {
    const d = await db();
    const t = d.transaction([SESSIONS, CHUNKS], 'readwrite');
    t.objectStore(SESSIONS).delete(sessionId);
    const idx = t.objectStore(CHUNKS).index('bySession');
    const keysReq = idx.getAllKeys(IDBKeyRange.only(sessionId));
    keysReq.onsuccess = () => { (keysReq.result || []).forEach((k: any) => t.objectStore(CHUNKS).delete(k)); };
  } catch { /* best-effort */ }
}
