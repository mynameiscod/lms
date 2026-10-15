import mongoose, { Schema } from 'mongoose';
import { Request } from 'express';
import { tokenDigest } from './oauthSecurity';
import { McpError } from './oauthPolicy';

const schema = new Schema({
  _id: String, count: { type: Number, default: 0 }, expiresAt: { type: Date, required: true },
});
schema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });
export const McpRateLimit = mongoose.model('McpRateLimit', schema);

/** Shared by all processes; no unbounded in-memory counters. TTL is cleanup, not enforcement. */
export async function rateLimit(key: string, maximum: number, seconds = 60) {
  const bucket = Math.floor(Date.now() / (seconds * 1000));
  const _id = tokenDigest(`${key}:${bucket}`);
  const update = { $inc: { count: 1 }, $setOnInsert: { expiresAt: new Date((bucket + 2) * seconds * 1000) } };
  let row;
  try { row = await McpRateLimit.findOneAndUpdate({ _id }, update, { upsert: true, new: true }); }
  catch (e: any) {
    if (e.code !== 11000) throw e;
    row = await McpRateLimit.findOneAndUpdate({ _id }, { $inc: { count: 1 } }, { new: true });
  }
  if (!row || row.count > maximum) throw new McpError('rate_limit_exceeded', 429);
}
export const ipKey = (req: Request) => req.ip || req.socket.remoteAddress || 'unknown';
