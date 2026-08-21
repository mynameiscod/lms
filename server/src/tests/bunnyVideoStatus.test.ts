/**
 * Bunny encode status, mirrored onto our records.
 *
 * The defect this closes: a failed encode and one still transcoding both render Bunny's
 * "Processing video" placeholder, so a recording that will never play is indistinguishable
 * from one that is nearly ready. Eight recordings sat like that, some for two months.
 *
 * The property that matters is the classification — a terminal failure must never be
 * reported as pending, because "come back in a few minutes" is then a lie that repeats
 * forever.
 */

const updateOne = jest.fn();
const find = jest.fn();

jest.mock('../models/LearningContentLibrary', () => ({
  __esModule: true,
  default: {
    find: (...a: any[]) => find(...a),
    updateOne: (...a: any[]) => { updateOne(...a); return Promise.resolve({}); },
  },
}));

import {
  refreshBunnyVideoStatuses, isFailedStatus, isPendingStatus, BUNNY_STATUS,
} from '../services/bunnyVideoStatusService';

const lean = (rows: any[]) => ({ select: () => ({ lean: async () => rows }) });

const originalFetch = global.fetch;
const originalEnv = { ...process.env };

beforeEach(() => {
  find.mockReset();
  updateOne.mockReset();
  process.env.BUNNY_STREAM_LIBRARY_ID = '681820';
  process.env.BUNNY_STREAM_API_KEY = 'test-key';
});

afterAll(() => {
  (global as any).fetch = originalFetch;
  process.env = originalEnv;
});

const mockLibrary = (items: any[]) => {
  (global as any).fetch = jest.fn().mockResolvedValue({
    ok: true, status: 200, json: async () => ({ items }),
  });
};

describe('status classification', () => {
  it('treats Error and UploadFailed as terminal', () => {
    expect(isFailedStatus(BUNNY_STATUS.ERROR)).toBe(true);
    expect(isFailedStatus(BUNNY_STATUS.UPLOAD_FAILED)).toBe(true);
    expect(isFailedStatus(BUNNY_STATUS.FINISHED)).toBe(false);
  });

  it('never calls a terminal failure "pending"', () => {
    // The whole point: "still processing" for something that errored is a lie on repeat.
    expect(isPendingStatus(BUNNY_STATUS.ERROR)).toBe(false);
    expect(isPendingStatus(BUNNY_STATUS.UPLOAD_FAILED)).toBe(false);
  });

  it('treats the pre-finished states as pending', () => {
    for (const s of [BUNNY_STATUS.CREATED, BUNNY_STATUS.UPLOADED, BUNNY_STATUS.PROCESSING, BUNNY_STATUS.TRANSCODING]) {
      expect(isPendingStatus(s)).toBe(true);
    }
  });
});

describe('the sweep', () => {
  it('reports the real failures and stores their status', async () => {
    find.mockReturnValue(lean([
      { _id: 'c1', title: 'OM5- Functional Interface', bunnyVideoId: 'g-fail', bunnyStatus: undefined },
      { _id: 'c2', title: 'Working recording', bunnyVideoId: 'g-ok', bunnyStatus: undefined },
    ]));
    mockLibrary([
      { guid: 'g-fail', status: 5, encodeProgress: 5, title: 'OM5- Functional Interface' },
      { guid: 'g-ok', status: 4, encodeProgress: 100, title: 'Working recording' },
    ]);

    const r = await refreshBunnyVideoStatuses('t1');

    expect(r.scanned).toBe(2);
    expect(r.failed).toEqual([{ guid: 'g-fail', title: 'OM5- Functional Interface', encodeProgress: 5 }]);
    expect(r.pending).toBe(0);
    expect(r.updated).toBe(2);
  });

  it('does not rewrite a status that has not changed', async () => {
    find.mockReturnValue(lean([{ _id: 'c1', title: 'x', bunnyVideoId: 'g1', bunnyStatus: 4 }]));
    mockLibrary([{ guid: 'g1', status: 4, encodeProgress: 100 }]);

    const r = await refreshBunnyVideoStatuses('t1');
    expect(r.updated).toBe(0);
    expect(updateOne).not.toHaveBeenCalled();
  });

  it('leaves records alone when the video is not in this library', async () => {
    find.mockReturnValue(lean([{ _id: 'c1', title: 'orphan', bunnyVideoId: 'not-there', bunnyStatus: 4 }]));
    mockLibrary([{ guid: 'someone-else', status: 4, encodeProgress: 100 }]);

    const r = await refreshBunnyVideoStatuses('t1');
    expect(r.updated).toBe(0);
    expect(r.failed).toEqual([]);
  });

  it('counts in-progress encodes separately from failures', async () => {
    find.mockReturnValue(lean([
      { _id: 'c1', title: 'a', bunnyVideoId: 'g1' },
      { _id: 'c2', title: 'b', bunnyVideoId: 'g2' },
    ]));
    mockLibrary([
      { guid: 'g1', status: 3, encodeProgress: 40 },
      { guid: 'g2', status: 5, encodeProgress: 5 },
    ]);

    const r = await refreshBunnyVideoStatuses('t1');
    expect(r.pending).toBe(1);
    expect(r.failed).toHaveLength(1);
  });
});

describe('when Bunny cannot be reached', () => {
  it('reports the problem instead of throwing — a page must not die with it', async () => {
    find.mockReturnValue(lean([]));
    (global as any).fetch = jest.fn().mockResolvedValue({ ok: false, status: 503, json: async () => ({}) });

    const r = await refreshBunnyVideoStatuses('t1');
    expect(r.error).toMatch(/HTTP 503/);
    expect(r.failed).toEqual([]);
  });

  it('reports missing configuration rather than calling out with an empty key', async () => {
    delete process.env.BUNNY_STREAM_API_KEY;
    const r = await refreshBunnyVideoStatuses('t1');
    expect(r.error).toMatch(/not configured/i);
  });
});
