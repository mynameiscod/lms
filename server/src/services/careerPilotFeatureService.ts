import Tenant from '../models/Tenant';
import { CAREERPILOT_FEATURE_KEYS, CareerPilotFeatureKey, allOn } from '../data/studentFeatureKeys';

/**
 * Which parts of the CareerPilot student's menu the institute's admin has switched off.
 * The student's dashboard carries this list, and the menu and the page routes obey it.
 */

export async function careerPilotFeatures(tenantId: string): Promise<Record<CareerPilotFeatureKey, boolean>> {
  const t: any = await Tenant.findById(tenantId).select('careerPilotFeatures').lean();
  return { ...allOn(CAREERPILOT_FEATURE_KEYS), ...(t?.careerPilotFeatures || {}) };
}

/** The keys that are OFF: what the student's menu must hide. */
export async function hiddenCareerPilotFeatures(tenantId: string): Promise<CareerPilotFeatureKey[]> {
  const f = await careerPilotFeatures(tenantId);
  return CAREERPILOT_FEATURE_KEYS.filter((k) => f[k] === false);
}

export async function saveCareerPilotFeatures(tenantId: string, input: Record<string, unknown>) {
  const set: Record<string, boolean> = {};
  for (const k of CAREERPILOT_FEATURE_KEYS) if (typeof input?.[k] === 'boolean') set[`careerPilotFeatures.${k}`] = input[k] as boolean;
  await Tenant.updateOne({ _id: tenantId }, { $set: set });
  return careerPilotFeatures(tenantId);
}
