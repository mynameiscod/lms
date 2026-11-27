/**
 * Run the Lead Assignment engine on chosen unassigned leads (e.g. leads that arrived before
 * website leads were covered). Uses the institute's Lead Assignment setting, so set that first.
 *
 *   node dist/scripts/assignLeads.js <tenantId> <leadId> [<leadId> …]            report, writes nothing
 *   node dist/scripts/assignLeads.js <tenantId> <leadId> [<leadId> …] --apply    assign them
 *
 * A lead that already has an owner, is archived, or whose AI call said not interested / wrong
 * number / opt-out is skipped, exactly as for a new lead.
 */
import mongoose from 'mongoose';
import dotenv from 'dotenv';
import Lead from '../models/Lead';
import { assignLead, getAssignmentConfig } from '../services/leadAssignmentService';

dotenv.config();

async function main() {
  const args = process.argv.slice(2);
  const apply = args.includes('--apply');
  const [tenantId, ...leadIds] = args.filter(a => !a.startsWith('--'));
  if (!tenantId || !leadIds.length || ![tenantId, ...leadIds].every(id => mongoose.Types.ObjectId.isValid(id))) {
    console.error('Usage: node dist/scripts/assignLeads.js <tenantId> <leadId> [<leadId> …] [--apply]');
    process.exit(1);
  }
  await mongoose.connect(process.env.MONGODB_URI || process.env.MONGO_URI || '');
  const config = await getAssignmentConfig(tenantId);
  console.log(`Lead Assignment: mode=${config.mode}, members=${config.members.length}, rules=${config.rules.length}${apply ? '' : '   (report only — add --apply to assign)'}`);
  for (const id of leadIds) {
    const lead: any = await Lead.findOne({ _id: id, tenantId }).select('name source assignedTo archivedAt aiFeedback').populate('assignedTo', 'firstName lastName').lean();
    if (!lead) { console.log(`  ${id}  not found in this institute`); continue; }
    const label = `${id}  ${lead.name || '(no name)'} [${lead.source}]`;
    if (lead.assignedTo) { console.log(`  ${label}  already owned by ${lead.assignedTo.firstName || ''} ${lead.assignedTo.lastName || ''}`.trimEnd()); continue; }
    if (!apply) { console.log(`  ${label}  unassigned — would be assigned`); continue; }
    const owner = await assignLead(tenantId, id, { afterCall: true });
    console.log(`  ${label}  ${owner ? `assigned to ${owner}` : 'NOT assigned (manual mode, no available counsellor, archived, or a negative AI-call result)'}`);
  }
  await mongoose.disconnect();
}

main().catch(e => { console.error(e); process.exit(1); });
