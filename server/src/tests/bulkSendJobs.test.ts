/**
 * The 504 that hid a running send.
 *
 * "Send invitations" ran 443 recipients across two channels inside one HTTP request. It passed
 * nginx's 600s proxy_read_timeout, the admin got a 504, and the send carried on invisibly --
 * so nobody could tell how far it had got, or whether pressing the button again would message
 * the whole cohort twice.
 *
 * These cover the two properties that matter: the caller is not made to wait, and a second
 * send cannot start on top of the first.
 */
import {
  startBulkSend, getBulkSend, runningBulkSend, SendAlreadyRunning, __resetBulkSends,
} from '../services/bulkSendJobs';

const flush = () => new Promise(r => setImmediate(r));

beforeEach(() => __resetBulkSends());

describe('a bulk send does not block the caller', () => {
  it('returns a running job before the work has finished', async () => {
    let release: () => void = () => {};
    const gate = new Promise<void>(r => { release = r; });

    const job = startBulkSend({
      kind: 'test', scope: 'exam1', total: 3,
      work: async () => { await gate; },
    });

    /* The point of the whole change: this is reached while the send is still going. */
    expect(job.status).toBe('running');
    expect(job.total).toBe(3);
    expect(job.processed).toBe(0);

    release();
    await flush();
    expect(getBulkSend(job.id)!.status).toBe('done');
  });

  it('counts each recipient as the work reports it', async () => {
    const job = startBulkSend({
      kind: 'test', scope: 'exam1', total: 3,
      work: async (tick) => {
        tick({ email: 1 });
        tick({ email: 1, whatsapp: 1 });
        tick({ failed: 1 });
      },
    });
    await flush();

    expect(job.processed).toBe(3);
    expect(job.email).toBe(2);
    expect(job.whatsapp).toBe(1);
    expect(job.failed).toBe(1);
    expect(job.status).toBe('done');
  });

  it('counts skips separately, so "nothing sent" is distinguishable from "nothing to send"', async () => {
    const job = startBulkSend({
      kind: 'test', scope: 'exam1', total: 2,
      work: async (tick) => { tick({ skipped: 1 }); tick({ skipped: 1 }); },
    });
    await flush();
    expect(job.skipped).toBe(2);
    expect(job.email + job.whatsapp + job.failed).toBe(0);
  });

  it('records WHY a send stopped rather than leaving it running forever', async () => {
    const job = startBulkSend({
      kind: 'test', scope: 'exam1', total: 5,
      work: async (tick) => { tick({ email: 1 }); throw new Error('SES refused the message'); },
    });
    await flush();

    expect(job.status).toBe('failed');
    expect(job.error).toMatch(/SES refused/);
    /* And it says how far it got, which is what decides whether to re-run. */
    expect(job.processed).toBe(1);
    expect(job.finishedAt).toBeInstanceOf(Date);
  });
});

describe('two sends cannot overlap on one exam', () => {
  it('refuses a second start and names the job already running', async () => {
    let release: () => void = () => {};
    const gate = new Promise<void>(r => { release = r; });
    const first = startBulkSend({
      kind: 'test', scope: 'exam1', total: 1, work: async () => { await gate; },
    });

    /*
     * Overlapping sends would interleave their reads of the already-invited flags and message
     * people twice. That is the failure this prevents.
     */
    try {
      startBulkSend({ kind: 'test', scope: 'exam1', total: 1, work: async () => {} });
      throw new Error('a second send was allowed to start');
    } catch (e) {
      expect(e).toBeInstanceOf(SendAlreadyRunning);
      expect((e as SendAlreadyRunning).jobId).toBe(first.id);
    }

    release();
    await flush();
  });

  it('allows a second send once the first has finished', async () => {
    startBulkSend({ kind: 'test', scope: 'exam1', total: 1, work: async () => {} });
    await flush();
    const second = startBulkSend({ kind: 'test', scope: 'exam1', total: 1, work: async () => {} });
    expect(second.status).toBe('running');
    await flush();
  });

  it('allows a second send after the first FAILED — a failure must not wedge the exam', async () => {
    startBulkSend({
      kind: 'test', scope: 'exam1', total: 1, work: async () => { throw new Error('nope'); },
    });
    await flush();
    expect(() =>
      startBulkSend({ kind: 'test', scope: 'exam1', total: 1, work: async () => {} }),
    ).not.toThrow();
    await flush();
  });

  it('does not block a different exam', async () => {
    let release: () => void = () => {};
    const gate = new Promise<void>(r => { release = r; });
    startBulkSend({ kind: 'test', scope: 'exam1', total: 1, work: async () => { await gate; } });
    expect(() =>
      startBulkSend({ kind: 'test', scope: 'exam2', total: 1, work: async () => {} }),
    ).not.toThrow();
    release();
    await flush();
  });
});

describe('an admin who reloaded the page can find their send', () => {
  it('reports the send running for an exam without needing its id', async () => {
    let release: () => void = () => {};
    const gate = new Promise<void>(r => { release = r; });
    const job = startBulkSend({
      kind: 'test', scope: 'exam1', total: 1, work: async () => { await gate; },
    });
    expect(runningBulkSend('exam1')?.id).toBe(job.id);
    release();
    await flush();
    /* Finished is not running: the screen should stop polling, not keep showing a bar. */
    expect(runningBulkSend('exam1')).toBeUndefined();
    /* But the result is still retrievable by id, so the final counts can be shown. */
    expect(getBulkSend(job.id)?.status).toBe('done');
  });

  it('reports nothing for an exam with no send', () => {
    expect(runningBulkSend('never-sent')).toBeUndefined();
  });
});
