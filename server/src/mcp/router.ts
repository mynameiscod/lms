import express, { Response } from 'express';
import mongoose from 'mongoose';
import { AuthenticatedRequest } from '../types';
import { authMiddleware } from '../middleware/auth';
import { tenantResolver } from '../middleware/tenantResolver';
import { permissionsOf } from '../middleware/roleGuard';
import OutperoCall from '../models/OutperoCall';
import Lead from '../models/Lead';
import User from '../models/User';
import Attendance from '../models/Attendance';
import Exam from '../models/Exam';
import Fee from '../models/Fee';
import Batch from '../models/Batch';
import Role from '../models/Role';

/**
 * Read-only MCP JSON-RPC transport for internal testing with LMS JWTs.
 * NOT a ChatGPT-ready OAuth authorization server. Never expose publicly until
 * OAuth discovery, PKCE, audience validation and token revocation are implemented.
 */
const router = express.Router();
router.use(authMiddleware, tenantResolver);
const PROTOCOL = '2025-03-26';
const tools = [
  { name: 'codebegun_call_summary', description: 'Summarize authorized Outpero call outcomes', inputSchema: { type: 'object', properties: { days: { type: 'integer', minimum: 1, maximum: 90 } }, additionalProperties: false }, permission: 'mcp_calls_read' },
  { name: 'codebegun_calls', description: 'List authorized call metadata and AI summaries (no recording URLs or transcripts)', inputSchema: { type: 'object', properties: { limit: { type: 'integer', minimum: 1, maximum: 50 } }, additionalProperties: false }, permission: 'mcp_calls_read' },
  { name: 'codebegun_lead_summary', description: 'Aggregate lead counts by source', inputSchema: { type: 'object', properties: {}, additionalProperties: false }, permission: 'mcp_leads_read' },
  { name: 'codebegun_attendance_summary', description: 'Aggregate attendance by status for permitted batches', inputSchema: { type: 'object', properties: { days: { type: 'integer', minimum: 1, maximum: 90 } }, additionalProperties: false }, permission: 'mcp_attendance_read' },
  { name: 'codebegun_exam_summary', description: 'Aggregate exam performance for permitted batches', inputSchema: { type: 'object', properties: {}, additionalProperties: false }, permission: 'mcp_assessments_read' },
  { name: 'codebegun_fee_summary', description: 'Aggregate fee collections and outstanding balances', inputSchema: { type: 'object', properties: {}, additionalProperties: false }, permission: 'mcp_finance_read' },
  { name: 'codebegun_student_count', description: 'Count active student accounts for this tenant', inputSchema: { type: 'object', properties: {}, additionalProperties: false }, permission: 'mcp_students_read' },
] as const;

function reply(res: Response, id: unknown, result: unknown) {
  return res.json({ jsonrpc: '2.0', id, result });
}
function error(res: Response, id: unknown, code: number, message: string) {
  return res.json({ jsonrpc: '2.0', id, error: { code, message } });
}
router.get('/', (_req, res) => res.status(405).set('Allow', 'POST').end());
router.post('/', async (req: AuthenticatedRequest, res: Response) => {
  res.set('Cache-Control', 'no-store');
  const body = req.body;
  if (!body || body.jsonrpc !== '2.0' || typeof body.method !== 'string' || Array.isArray(body)) {
    return error(res, body?.id ?? null, -32600, 'Invalid request');
  }
  const id = body.id;
  if (body.method === 'notifications/initialized') {
    const p = await permissionsOf(req.user!);
    return p.includes('mcp_connect') ? res.status(202).end() : res.status(403).end();
  }
  if (id === undefined || id === null) return error(res, null, -32600, 'Request ID required');
  // Require authorization even for protocol discovery. Never expose tools to unauthorized users.
  if (body.method === 'initialize') {
    if (req.user!.customRoleId && !(await Role.exists({ _id: req.user!.customRoleId, tenantId: req.tenantId }))) return error(res, id, -32003, 'Assigned role unavailable');
    const p = await permissionsOf(req.user!);
    if (!p.includes('mcp_connect') || !['SUPER_ADMIN', 'TENANT_ADMIN', 'INSTRUCTOR'].includes(req.user!.role)) return error(res, id, -32003, 'MCP access denied');
    return reply(res, id, { protocolVersion: PROTOCOL, capabilities: { tools: {} }, serverInfo: { name: 'codebegun-lms', version: '0.1.0' } });
  }
  try {
    const perms = await permissionsOf(req.user!);
    // MCP fails closed when a custom role was deleted or is inaccessible.
    if (req.user!.customRoleId) {
      const assigned = await Role.findOne({ _id: req.user!.customRoleId, tenantId: req.tenantId }).select('_id').lean();
      if (!assigned) return error(res, id, -32003, 'Assigned role unavailable');
    }
    // Super Admin has no implicit bypass: access must be explicitly granted.
    if (!perms.includes('mcp_connect')) return error(res, id, -32003, 'MCP access denied');
    if (!['SUPER_ADMIN', 'TENANT_ADMIN', 'INSTRUCTOR'].includes(req.user!.role)) return error(res, id, -32003, 'MCP role not enabled');
    if (body.method === 'ping') return reply(res, id, {});
    if (body.method === 'tools/list') return reply(res, id, { tools: tools.filter(t => perms.includes(t.permission)).map(({ permission, ...t }) => t) });
    if (body.method !== 'tools/call') return error(res, id, -32601, 'Method not found');
    const name = body.params?.name;
    const tool = tools.find(t => t.name === name);
    if (!tool) return error(res, id, -32602, 'Unknown tool');
    if (!perms.includes(tool.permission)) return error(res, id, -32003, 'Permission denied');
    const args = body.params?.arguments ?? {};
    if (!args || typeof args !== 'object' || Array.isArray(args)) return error(res, id, -32602, 'Invalid arguments');
    const tenantId = req.tenantId!;
    if (!mongoose.isValidObjectId(tenantId)) return error(res, id, -32602, 'Invalid tenant');
    // Restrict instructors to assigned batches; other non-admin roles must use
    // explicitly scoped tools rather than receiving tenant-wide student data.
    const isAdmin = ['SUPER_ADMIN', 'TENANT_ADMIN'].includes(req.user!.role);
    const assignedBatches = isAdmin ? [] : await Batch.find({ tenantId, instructors: req.user!.id }).distinct('_id');
    const batchScope = isAdmin ? {} : { batchId: { $in: assignedBatches } };
    let result: unknown;
    switch (name) {
      case 'codebegun_call_summary': {
        if (!isAdmin) return error(res, id, -32003, 'Call summaries require an administrator');
        const days = args.days === undefined ? 7 : args.days;
        if (!Number.isInteger(days) || days < 1 || days > 90) return error(res, id, -32602, 'days must be 1–90');
        result = await OutperoCall.aggregate([
          { $match: { tenantId: new mongoose.Types.ObjectId(tenantId), createdAt: { $gte: new Date(Date.now() - days * 86400000) } } },
          { $group: { _id: { status: '$status', outcome: '$outcome' }, calls: { $sum: 1 }, avgDurationSec: { $avg: '$durationSec' } } },
          { $sort: { calls: -1 } }, { $limit: 100 }
        ]);
        break;
      }
      case 'codebegun_calls': {
        if (!isAdmin) return error(res, id, -32003, 'Call history requires an administrator');
        const limit = args.limit === undefined ? 20 : args.limit;
        if (!Number.isInteger(limit) || limit < 1 || limit > 50) return error(res, id, -32602, 'limit must be 1–50');
        result = await OutperoCall.find({ tenantId }).sort({ createdAt: -1 }).limit(limit)
          .select('callId status outcome summary durationSec createdAt analysedAt analysis.summary analysis.intent analysis.objections').lean();
        break;
      }
      case 'codebegun_lead_summary':
        if (!isAdmin) return error(res, id, -32003, 'Lead summaries require an administrator');
        result = await Lead.aggregate([
          { $match: { tenantId: new mongoose.Types.ObjectId(tenantId) } },
          { $group: { _id: '$source', count: { $sum: 1 } } }, { $sort: { count: -1 } }, { $limit: 100 }
        ]);
        break;
      case 'codebegun_attendance_summary': {
        if (!isAdmin && assignedBatches.length === 0) return error(res, id, -32003, 'No assigned batches');
        const days = args.days === undefined ? 30 : args.days;
        if (!Number.isInteger(days) || days < 1 || days > 90) return error(res, id, -32602, 'days must be 1–90');
        result = await Attendance.aggregate([
          { $match: { tenantId: new mongoose.Types.ObjectId(tenantId), ...batchScope, date: { $gte: new Date(Date.now() - days * 86400000) } } },
          { $group: { _id: '$status', count: { $sum: 1 } } }, { $limit: 10 }
        ]);
        break;
      }
      case 'codebegun_exam_summary': {
        if (!isAdmin && assignedBatches.length === 0) return error(res, id, -32003, 'No assigned batches');
        result = await Exam.aggregate([
          { $match: { tenantId: new mongoose.Types.ObjectId(tenantId), ...batchScope } },
          { $group: { _id: '$result', count: { $sum: 1 }, averagePercentage: { $avg: '$percentage' } } }, { $limit: 10 }
        ]);
        break;
      }
      case 'codebegun_fee_summary': {
        if (!isAdmin) return error(res, id, -32003, 'Finance summaries require an administrator');
        result = await Fee.aggregate([
          { $match: { tenantId: new mongoose.Types.ObjectId(tenantId) } },
          { $group: { _id: '$status', count: { $sum: 1 }, paid: { $sum: '$paidAmount' }, due: { $sum: '$dueAmount' } } }, { $limit: 10 }
        ]);
        break;
      }
      case 'codebegun_student_count':
        if (!isAdmin && assignedBatches.length === 0) return error(res, id, -32003, 'No assigned batches');
        result = { count: await User.countDocuments({ tenantId, role: 'STUDENT', isActive: true, ...batchScope }) };
        break;
      default: return error(res, id, -32601, 'Tool not implemented');
    }
    console.info('[MCP AUDIT]', JSON.stringify({ userId: req.user!.id, tenantId, tool: name, at: new Date().toISOString() }));
    return reply(res, id, { content: [{ type: 'text', text: JSON.stringify(result) }] });
  } catch (e) {
    console.error('[MCP] Tool error', e);
    return error(res, id, -32603, 'Internal error');
  }
});
export default router;
