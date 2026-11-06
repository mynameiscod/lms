import { leadApi } from '../api';

/**
 * Moving a lead to a stage, shared by the lead page and the Kanban board.
 *
 * Mirrors the server rule in changeLeadStage: a stage with `requiresReason` (or the
 * legacy "Not Interested" stage) needs a reason, and a lost stage moved by a
 * non-admin goes to a manager for approval (HTTP 202, `data.pendingApproval`).
 */
export interface StageLike {
  _id: string;
  name: string;
  requiresReason?: boolean;
}

export type StageChangeResult = 'moved' | 'pending_approval' | 'cancelled';

export const stageNeedsReason = (stage: StageLike) =>
  !!stage.requiresReason || stage.name === 'Not Interested';

export async function moveLeadToStage(leadId: string, stage: StageLike): Promise<StageChangeResult> {
  let reason: string | undefined;
  if (stageNeedsReason(stage)) {
    const typed = window.prompt(`Why is this lead moving to "${stage.name}"? (required)`);
    if (typed === null) return 'cancelled';
    if (!typed.trim()) throw new Error('A reason is required for this stage');
    reason = typed.trim();
  }
  const res: any = await leadApi.changeStage(leadId, stage._id, reason);
  if (res?.success === false) throw new Error(res.message || 'Failed to update stage');
  return res?.data?.pendingApproval ? 'pending_approval' : 'moved';
}
