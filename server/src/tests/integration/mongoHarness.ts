import mongoose from 'mongoose';
import { MongoMemoryServer } from 'mongodb-memory-server';

/**
 * A real MongoDB, for the tests that cannot be written against a mock.
 *
 * WHY THIS EXISTS. Every other suite in this repository substitutes its models, which is
 * fast, hermetic and completely unable to exercise an aggregation pipeline: `$lookup`,
 * `$switch` and `$group` are evaluated by the database, so a fake model object can only
 * ever assert that a pipeline was *passed somewhere*. Rewriting a live screen's counts on
 * that basis would be rewriting them blind.
 *
 * DEV DEPENDENCY ONLY. mongodb-memory-server downloads and runs a real mongod, which is
 * exactly why it is useful and exactly why it must never reach the production image. The
 * Dockerfile installs with the dev dependencies pruned; nothing outside `src/tests`
 * imports this file.
 *
 * ONE SERVER PER SUITE FILE. Starting mongod costs a second or two, so a suite starts it
 * once and clears collections between tests rather than paying that per test.
 */

let mongod: MongoMemoryServer | null = null;

/** Start an isolated mongod and point the default mongoose connection at it. */
export async function startMongo(): Promise<string> {
  mongod = await MongoMemoryServer.create();
  const uri = mongod.getUri();
  await mongoose.connect(uri);
  return uri;
}

export async function stopMongo(): Promise<void> {
  await mongoose.connection.dropDatabase().catch(() => {});
  await mongoose.disconnect();
  if (mongod) await mongod.stop();
  mongod = null;
}

/**
 * Empty every collection between tests.
 *
 * Deletes documents rather than dropping collections, so the indexes Mongoose built at
 * connect time survive — a test that silently lost its indexes would still pass while
 * proving nothing about the query plan.
 */
export async function clearCollections(): Promise<void> {
  const { collections } = mongoose.connection;
  await Promise.all(Object.values(collections).map(c => c.deleteMany({})));
}

/** Force index builds for the models a suite is about to exercise. */
export async function ensureIndexes(models: { syncIndexes: () => Promise<any> }[]): Promise<void> {
  for (const m of models) await m.syncIndexes();
}

/**
 * The winning plan stage for a query, for the tests that assert an index is actually used.
 *
 * `COLLSCAN` here means the index is missing or does not match the query shape — which is
 * the failure that matters, because an index nobody's query can use costs writes and buys
 * nothing.
 */
export async function explainStage(cursor: { explain: (v: string) => Promise<any> }): Promise<any> {
  const plan = await cursor.explain('queryPlanner');
  return plan?.queryPlanner?.winningPlan;
}
