/**
 * Videos on Bunny must be seekable: the browser's Range header reaches Bunny, and Bunny's 206 with
 * its Content-Range / Accept-Ranges reaches the browser. Without this every seek control in
 * production (where uploads live on Bunny) did nothing.
 */
import { Writable } from 'stream';

jest.mock('../services/settingsService', () => ({
  getStr: (k: string, d: string) => ({ BUNNY_STORAGE_ZONE: 'zone', BUNNY_STORAGE_ACCESSKEY: 'key' } as any)[k] ?? d,
}));
import { sendFileWithRanges } from '../services/bunnyStorageService';

function fakeRes() {
  const chunks: Buffer[] = [];
  const res: any = new Writable({ write(c, _e, cb) { chunks.push(Buffer.from(c)); cb(); } });
  res.headers = {} as Record<string, string>;
  res.statusCode = 200;
  res.setHeader = (k: string, v: string) => { res.headers[k.toLowerCase()] = v; };
  res.status = (s: number) => { res.statusCode = s; return res; };
  res.body = () => Buffer.concat(chunks).toString();
  return res;
}
const finished = (res: any) => new Promise(r => res.on('finish', r));

describe('sendFileWithRanges', () => {
  const realFetch = global.fetch;
  afterEach(() => { global.fetch = realFetch; });

  it('passes the Range header to Bunny and returns its 206 with range headers', async () => {
    let sent: any = null;
    global.fetch = jest.fn(async (_url: any, init: any) => {
      sent = init.headers;
      return new Response('3456', { status: 206, headers: { 'content-range': 'bytes 3-6/10', 'content-length': '4' } });
    }) as any;
    const res = fakeRes();
    const done = finished(res);
    await sendFileWithRanges({ headers: { range: 'bytes=3-6' } }, res, 'media/a.mp4', 'video/mp4');
    await done;
    expect(sent.Range).toBe('bytes=3-6');
    expect(sent.AccessKey).toBe('key');
    expect(res.statusCode).toBe(206);
    expect(res.headers['content-range']).toBe('bytes 3-6/10');
    expect(res.headers['accept-ranges']).toBe('bytes');
    expect(res.headers['content-type']).toBe('video/mp4');
    expect(res.body()).toBe('3456');
  });

  it('sends the whole file with 200 when the browser asks for no range', async () => {
    let sent: any = null;
    global.fetch = jest.fn(async (_u: any, init: any) => { sent = init.headers; return new Response('0123456789', { status: 200, headers: { 'content-length': '10', 'accept-ranges': 'bytes' } }); }) as any;
    const res = fakeRes();
    const done = finished(res);
    await sendFileWithRanges({ headers: {} }, res, 'media/a.mp4');
    await done;
    expect(sent.Range).toBeUndefined();
    expect(res.statusCode).toBe(200);
    expect(res.headers['accept-ranges']).toBe('bytes');
    expect(res.body()).toBe('0123456789');
  });

  it('cuts the range out itself when Bunny ignores Range and sends the whole file', async () => {
    global.fetch = jest.fn(async () => new Response('0123456789', { status: 200, headers: { 'content-length': '10' } })) as any;
    const res = fakeRes();
    const done = finished(res);
    await sendFileWithRanges({ headers: { range: 'bytes=3-6' } }, res, 'media/a.mp4', 'video/mp4');
    await done;
    expect(res.statusCode).toBe(206);
    expect(res.headers['content-range']).toBe('bytes 3-6/10');
    expect(res.headers['content-length']).toBe('4');
    expect(res.body()).toBe('3456');
  });

  it('serves an open-ended range to the end of the file', async () => {
    global.fetch = jest.fn(async () => new Response('0123456789', { status: 200, headers: { 'content-length': '10' } })) as any;
    const res = fakeRes();
    const done = finished(res);
    await sendFileWithRanges({ headers: { range: 'bytes=7-' } }, res, 'media/a.mp4');
    await done;
    expect(res.headers['content-range']).toBe('bytes 7-9/10');
    expect(res.body()).toBe('789');
  });

  it('answers 416 when Bunny says the range is out of bounds', async () => {
    global.fetch = jest.fn(async () => new Response(null, { status: 416, headers: { 'content-range': 'bytes */10' } })) as any;
    const res = fakeRes();
    res.end = jest.fn();
    await sendFileWithRanges({ headers: { range: 'bytes=50-' } }, res, 'media/a.mp4');
    expect(res.statusCode).toBe(416);
    expect(res.headers['content-range']).toBe('bytes */10');
  });
});
