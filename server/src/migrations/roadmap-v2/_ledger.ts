import mongoose from 'mongoose';

/**
 * The record of which Roadmap V2 migrations have run, in the `schemamigrations` collection.
 *
 * One document per (migration, tenant): when it ran, from which commit, what it changed, and the
 * prior values its rollback needs. Rollback reads them back and then deletes the entry, so a
 * second rollback finds nothing to do, and a second apply finds the entry and does nothing.
 */
const COLLECTION = 'schemamigrations';

export interface LedgerEntry {
  _id: string;
  migration: string;
  tenantId: string;
  appliedAt: Date;
  appliedBy: string;
  gitCommit: string;
  counts: Record<string, number>;
  prior: unknown;
}

const col = () => {
  const db = mongoose.connection.db;
  if (!db) throw new Error('Not connected to MongoDB.');
  return db.collection<LedgerEntry>(COLLECTION);
};

export const ledgerId = (migration: string, tenantId: string) => `${migration}:${tenantId}`;

export async function getApplied(migration: string, tenantId: string): Promise<LedgerEntry | null> {
  return col().findOne({ _id: ledgerId(migration, tenantId) });
}

export async function recordApplied(entry: Omit<LedgerEntry, '_id' | 'appliedAt'>): Promise<void> {
  await col().insertOne({ ...entry, _id: ledgerId(entry.migration, entry.tenantId), appliedAt: new Date() });
}

export async function removeApplied(migration: string, tenantId: string): Promise<void> {
  await col().deleteOne({ _id: ledgerId(migration, tenantId) });
}
