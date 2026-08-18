/**
 * Clearing a platform setting must actually clear it.
 *
 * applyToEnv() mirrors platform values into process.env so the many call-time
 * `process.env.X` readers pick up UI values. The mirror made a UI value
 * indistinguishable from a real .env one, so deleting a setting left the old
 * value in process.env for the life of the process: get() fell through to it,
 * the cleared value kept being used, and the UI reported "From .env" when
 * nothing was in .env.
 *
 * Found in production — an SES configuration set could not be cleared, and
 * every send failed on the stale value.
 */

import mongoose from 'mongoose';

const rows: any[] = [];
jest.mock('../models/SystemSetting', () => ({
  __esModule: true,
  default: {
    find: () => ({ lean: async () => rows.slice() }),
    deleteOne: async (q: any) => {
      const i = rows.findIndex(r => r.key === q.key && !r.tenantId === !q.tenantId);
      if (i >= 0) rows.splice(i, 1);
      return { deletedCount: 1 };
    },
    findOneAndUpdate: async (q: any, doc: any) => {
      const i = rows.findIndex(r => r.key === q.key && !r.tenantId === !q.tenantId);
      if (i >= 0) rows[i] = { ...rows[i], ...doc };
      else rows.push({ ...doc });
      return doc;
    },
  },
}));

const KEY = 'SES_CONFIGURATION_SET';
const URL_VALUE = 'https://platform.codebegun.com/api/v1/public/ses-events';

describe('clearing a platform setting', () => {
  let settings: typeof import('../services/settingsService');

  beforeEach(() => {
    rows.length = 0;
    delete process.env[KEY];
    jest.resetModules();
    // Imported fresh so the module's bootEnv snapshot reflects this test's env.
    settings = require('../services/settingsService');
  });

  afterAll(() => { delete process.env[KEY]; });

  it('removes the value from process.env, not just the database', async () => {
    await settings.setMany([{ key: KEY, value: URL_VALUE }]);
    expect(settings.getStr(KEY)).toBe(URL_VALUE);
    expect(process.env[KEY]).toBe(URL_VALUE); // mirrored for process.env readers

    await settings.setMany([{ key: KEY, value: '' }]); // the "Clear" action

    // The actual production bug: this used to still return the URL.
    expect(settings.getStr(KEY)).toBe('');
    expect(process.env[KEY]).toBeUndefined();
  });

  it('reports the value as unset, not as coming from .env', async () => {
    await settings.setMany([{ key: KEY, value: URL_VALUE }]);
    expect(settings.source(KEY)).toBe('ui');

    await settings.setMany([{ key: KEY, value: '' }]);

    // The misleading "From .env" badge that sent us looking in the wrong place.
    expect(settings.source(KEY)).toBe('unset');
  });

  it('restores a genuine .env value rather than deleting it', async () => {
    // A key that really is in .env must survive being set and cleared in the UI.
    process.env[KEY] = 'codebegun-from-env';
    jest.resetModules();
    settings = require('../services/settingsService');

    await settings.setMany([{ key: KEY, value: 'codebegun-from-ui' }]);
    expect(settings.getStr(KEY)).toBe('codebegun-from-ui');

    await settings.setMany([{ key: KEY, value: '' }]);
    expect(settings.getStr(KEY)).toBe('codebegun-from-env');
    expect(settings.source(KEY)).toBe('env');
  });

  it('survives a reload from the database', async () => {
    await settings.setMany([{ key: KEY, value: URL_VALUE }]);
    await settings.setMany([{ key: KEY, value: '' }]);
    await settings.loadAll(); // boot path
    expect(settings.getStr(KEY)).toBe('');
    expect(process.env[KEY]).toBeUndefined();
  });

  it('leaves unmanaged environment variables alone', async () => {
    process.env.SOME_UNRELATED_VAR = 'keep-me';
    await settings.setMany([{ key: KEY, value: URL_VALUE }]);
    await settings.setMany([{ key: KEY, value: '' }]);
    expect(process.env.SOME_UNRELATED_VAR).toBe('keep-me');
    delete process.env.SOME_UNRELATED_VAR;
  });

  it('does not mirror tenant values into process.env', async () => {
    const tid = new mongoose.Types.ObjectId().toString();
    await settings.setMany([{ key: KEY, value: 'tenant-only' }], undefined, tid);
    expect(settings.getStr(KEY, '', tid)).toBe('tenant-only');
    expect(process.env[KEY]).toBeUndefined(); // env is global; tenant values must not leak
  });
});
