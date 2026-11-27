/**
 * A person who is already a lead enquires again: a new ad form, the website, an enquiry form.
 *
 * Until now the second enquiry was filed as a quiet note on the old lead and nobody was told. A lead
 * that was cold or "not interested" a month ago, and is interested now, stayed buried. Now the lead:
 *   - gets a visible "enquired again" entry on its timeline (with the ad, when there is one)
 *   - is raised to hot priority if it was cold or warm
 *   - is flagged (reEnquiryUnseen) until somebody works it, which drives the badge and the filter
 *   - notifies the assigned person (or the institute admins when nobody owns it yet)
 *
 * We do NOT move its stage on our own (a person decides that), and no second lead is created: one
 * person, one lead, with the whole history in one place.
 *
 * Never throws: recording a repeat enquiry must not make the form submission fail.
 */
import mongoose from 'mongoose';
import Lead from '../models/Lead';
import User from '../models/User';
import { createNotifications } from '../notifications/notificationService';

/** Two submissions this close together are the same enquiry (a double tap), not a returning person. */
export const RE_ENQUIRY_QUIET_MS = 10 * 60 * 1000;
const MAX_HISTORY = 20;

export interface ReEnquiryInput {
  channel: 'meta_form' | 'website' | 'enquiry_form';
  note?: string;
  adId?: string; adName?: string; campaignName?: string; formId?: string;
  at?: Date;
}

const channelLabel = (c: ReEnquiryInput['channel']) => (c === 'meta_form' ? 'a Meta ad form' : c === 'website' ? 'the website' : 'an enquiry form');

/** "after 31 days" / "again today": how long since the last time we heard from them. */
export const gapText = (since: Date | undefined, now: Date): string => {
  if (!since) return '';
  const days = Math.floor((now.getTime() - new Date(since).getTime()) / 86_400_000);
  return days >= 1 ? ` — ${days} day${days === 1 ? '' : 's'} after their last enquiry` : '';
};

export async function recordReEnquiry(tenantId: string, leadId: string | mongoose.Types.ObjectId, input: ReEnquiryInput): Promise<void> {
  try {
    const now = input.at || new Date();
    const lead: any = await Lead.findOne({ _id: leadId, tenantId }).select('name assignedTo createdAt lastReEnquiryAt priority createdBy').lean();
    if (!lead) return;
    const last: Date | undefined = lead.lastReEnquiryAt || lead.createdAt;
    if (lead.lastReEnquiryAt && now.getTime() - new Date(lead.lastReEnquiryAt).getTime() < RE_ENQUIRY_QUIET_MS) return;

    const ad = [input.campaignName, input.adName].filter(Boolean).join(' › ');
    const description = `🔁 Enquired again via ${channelLabel(input.channel)}${ad ? ` (${ad})` : ''}${gapText(last, now)}.${input.note ? ` Message: ${input.note}` : ''}`.slice(0, 600);

    await Lead.updateOne({ _id: lead._id }, {
      $inc: { reEnquiryCount: 1 },
      $set: { lastReEnquiryAt: now, reEnquiryUnseen: true },
      $push: {
        activities: { type: 'note', description, createdBy: lead.createdBy, createdAt: now },
        reEnquiries: { $each: [{ at: now, channel: input.channel, adId: input.adId, adName: input.adName, campaignName: input.campaignName, formId: input.formId, note: input.note?.slice(0, 300) }], $slice: -MAX_HISTORY },
      },
    });
    if (lead.priority === 'cold' || lead.priority === 'warm') {
      await Lead.updateOne({ _id: lead._id, priority: { $in: ['cold', 'warm'] } }, { $set: { priority: 'hot' } });
    }

    // Tell the owner; with no owner, the institute admins, so it is never nobody's.
    let who: string[] = lead.assignedTo ? [String(lead.assignedTo)] : [];
    if (!who.length) {
      const admins = await User.find({ tenantId, role: 'TENANT_ADMIN', isActive: { $ne: false } }).select('_id').limit(10).lean();
      who = admins.map((a: any) => String(a._id));
    }
    await createNotifications(String(tenantId), who, 'general', `${lead.name} enquired again`, `${description.replace('🔁 ', '')}`.slice(0, 200), `/leads/${lead._id}`);
  } catch (e: any) {
    console.warn('[lead-reenquiry] could not record the repeat enquiry:', e?.message);
  }
}
