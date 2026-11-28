import { randomUUID } from 'crypto';
import { ClientSession } from 'mongoose';
import McpAuditEvent from '../models/McpAuditEvent';

export interface AuditIdentity { userId?: any; tenantId?: any; clientId?: string }

/** Only server-selected codes/identifiers. Never args, URLs, credentials, or results. */
export async function audit(tool: string, outcome: 'allowed' | 'denied' | 'failed', reason: string,
  identity: AuditIdentity = {}, requestId = randomUUID(), session?: ClientSession) {
  await McpAuditEvent.create([{ ...identity, requestId, tool, outcome, reason }], { session });
}
