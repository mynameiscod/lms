import mongoose from 'mongoose';
import { startMongo, stopMongo } from './mongoHarness';

test('real timers run during a fixture and pending callbacks stop with its database', async () => {
  await startMongo();
  try {
    let immediate = false;
    await new Promise<void>(resolve => setTimeout(() => { immediate = true; resolve(); }, 5));
    expect(immediate).toBe(true);
    let afterShutdown = false;
    setTimeout(() => { afterShutdown = true; }, 1000);
    await stopMongo();
    await new Promise(resolve => setTimeout(resolve, 1100));
    expect(afterShutdown).toBe(false);
  } finally {
    if (mongoose.connection.readyState !== 0) await stopMongo();
  }
}, 120000);
