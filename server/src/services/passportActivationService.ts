import mongoose from 'mongoose';
import User from '../models/User';
import PassportConfig from '../models/PassportConfig';
import PassportProgress from '../models/PassportProgress';

/**
 * Activate a student's CareerPilot membership. Shared by the admin manual path
 * (convertStudent) and the online ₹499 Razorpay path (settlePayment). Idempotent:
 * safe to call more than once — re-activation extends from the later of now / current
 * expiry, so a webhook + verify race won't double-charge time. Also ensures the
 * shareable-card slug and the journey progress doc exist.
 */

// Slug from an id + salt — deterministic (no Math.random, which is unavailable in some
// runtimes) yet unguessable enough for a share link.
function slugFor(studentId: string): string {
  const base = String(studentId);
  let h = 0;
  for (let i = 0; i < base.length; i++) h = (h * 31 + base.charCodeAt(i)) >>> 0;
  return base.slice(-6) + h.toString(36).slice(0, 6);
}

export async function activateMembership(tenantId: string, studentId: string): Promise<{ activated: boolean; expiresAt: Date }> {
  const cfg = await PassportConfig.findOne({ tenantId }).lean();
  const months = cfg?.membershipMonths ?? 12;

  const user = await User.findById(studentId).select('passport').lean() as any;
  const now = new Date();
  const from = user?.passport?.expiresAt && new Date(user.passport.expiresAt) > now ? new Date(user.passport.expiresAt) : now;
  const expiresAt = new Date(from);
  expiresAt.setMonth(expiresAt.getMonth() + months);

  const set: any = {
    'passport.active': true,
    'passport.product': 'career_passport',
    'passport.expiresAt': expiresAt,
  };
  if (!user?.passport?.activatedAt) set['passport.activatedAt'] = now;
  if (!user?.passport?.shareSlug) set['passport.shareSlug'] = slugFor(studentId);

  await User.updateOne({ _id: studentId }, { $set: set });

  // Ensure a journey progress doc exists, starting the day-count from activation.
  await PassportProgress.updateOne(
    { tenantId, studentId },
    { $setOnInsert: { tenantId, studentId: new mongoose.Types.ObjectId(studentId), startDate: user?.passport?.activatedAt || now } },
    { upsert: true }
  );

  return { activated: true, expiresAt };
}
