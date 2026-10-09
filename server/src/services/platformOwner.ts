import mongoose from 'mongoose';
import Tenant from '../models/Tenant';
import * as settings from './settingsService';

/**
 * Which institute owns the platform credentials (CodeBegun). Every other institute must use
 * its own Razorpay, WhatsApp and ad accounts — see settingsService.getCredential.
 *
 * Resolved once at boot, first match wins:
 *   1. Platform Setting / env PLATFORM_OWNER_TENANT_ID
 *   2. env DEFAULT_TENANT_ID (already used as the webhook fallback institute)
 *   3. the institute whose slug is "codebegun"
 * If none resolves, every institute keeps the old fallback behaviour and a warning is logged.
 */
export async function initPlatformOwner(): Promise<string | null> {
  const configured = settings.getStr('PLATFORM_OWNER_TENANT_ID', '') || process.env.DEFAULT_TENANT_ID || '';
  let id: string | null = mongoose.isValidObjectId(configured) ? configured : null;
  if (!id) {
    const t: any = await Tenant.findOne({ slug: 'codebegun' }).select('_id').lean().catch(() => null);
    id = t?._id ? String(t._id) : null;
  }
  settings.setPlatformOwnerTenant(id);
  if (id) console.log(`🏠 Platform owner institute: ${id} (only it may use platform payment/WhatsApp credentials)`);
  else console.warn('⚠️  No platform owner institute resolved — every institute still falls back to platform credentials. Set PLATFORM_OWNER_TENANT_ID.');
  return id;
}
