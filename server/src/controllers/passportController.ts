import { Request, Response } from 'express';
import PassportConfig, { DEFAULT_ONBOARDING_FIELDS, DEFAULT_ENTITLEMENTS } from '../models/PassportConfig';
import User from '../models/User';
import * as settings from '../services/settingsService';

const tenantOf = (req: Request): string => String((req as any).user?.tenantId || (req as any).tenantId || '');
const userIdOf = (req: Request): string => String((req as any).user?.id || '');
const role = (req: Request): string => String((req as any).user?.role || '');
const isAdmin = (req: Request) => ['SUPER_ADMIN', 'TENANT_ADMIN', 'STAFF'].includes(role(req));

/** Master on/off: the tenant config flag AND the platform PASSPORT_ENABLED setting. */
function passportEnabled(tenantId: string, cfg?: any): boolean {
  const platform = settings.getStr('PASSPORT_ENABLED', 'false', tenantId) === 'true';
  return platform && !!(cfg?.enabled ?? false);
}

async function ensureConfig(tenantId: string) {
  let cfg = await PassportConfig.findOne({ tenantId });
  if (!cfg) {
    cfg = await PassportConfig.create({
      tenantId,
      onboardingFields: DEFAULT_ONBOARDING_FIELDS,
      entitlements: DEFAULT_ENTITLEMENTS,
    });
  }
  return cfg;
}

/** Admin: read the Passport config (seeds defaults on first open). */
export const getConfig = async (req: Request, res: Response) => {
  try {
    if (!isAdmin(req)) return res.status(403).json({ message: 'Not allowed' });
    const tenantId = tenantOf(req);
    const cfg = await ensureConfig(tenantId);
    res.json({ config: cfg, platformEnabled: settings.getStr('PASSPORT_ENABLED', 'false', tenantId) === 'true' });
  } catch (e: any) {
    res.status(500).json({ message: e.message || 'Failed to load config' });
  }
};

/** Admin: update the Passport config. */
export const updateConfig = async (req: Request, res: Response) => {
  try {
    if (!isAdmin(req)) return res.status(403).json({ message: 'Not allowed' });
    const tenantId = tenantOf(req);
    await ensureConfig(tenantId);
    const allowed = ['enabled', 'assessmentMode', 'onboardingFields', 'entitlements', 'priceInr', 'membershipMonths'];
    const $set: any = {};
    for (const k of allowed) if (req.body[k] !== undefined) $set[k] = req.body[k];
    const cfg = await PassportConfig.findOneAndUpdate({ tenantId }, { $set }, { new: true });
    res.json({ config: cfg });
  } catch (e: any) {
    res.status(500).json({ message: e.message || 'Failed to update config' });
  }
};

/** Student: my Passport status + the resolved entitlements (free/paid + active). */
export const getMyStatus = async (req: Request, res: Response) => {
  try {
    const tenantId = tenantOf(req);
    const cfg = await PassportConfig.findOne({ tenantId }).lean();
    const user = await User.findById(userIdOf(req)).select('passport firstName lastName').lean() as any;
    const active = !!user?.passport?.active;
    res.json({
      enabled: passportEnabled(tenantId, cfg),
      active,
      onboarded: !!user?.passport?.onboarded,
      passport: user?.passport || null,
      entitlements: cfg?.entitlements || [],
      priceInr: cfg?.priceInr ?? 499,
    });
  } catch (e: any) {
    res.status(500).json({ message: e.message || 'Failed to load status' });
  }
};

/** Admin: list Passport students. */
export const listStudents = async (req: Request, res: Response) => {
  try {
    if (!isAdmin(req)) return res.status(403).json({ message: 'Not allowed' });
    const tenantId = tenantOf(req);
    const q: any = { tenantId, 'passport.active': true };
    if (req.query.search) {
      const s = String(req.query.search);
      q.$or = [{ firstName: { $regex: s, $options: 'i' } }, { lastName: { $regex: s, $options: 'i' } }, { email: { $regex: s, $options: 'i' } }];
    }
    const rows = await User.find(q).select('firstName lastName email phone passport createdAt').sort({ createdAt: -1 }).limit(500).lean();
    res.json({ students: rows });
  } catch (e: any) {
    res.status(500).json({ message: e.message || 'Failed to list students' });
  }
};

/** Admin: manually convert/activate a student into Passport (the "Both" entry path). */
export const convertStudent = async (req: Request, res: Response) => {
  try {
    if (!isAdmin(req)) return res.status(403).json({ message: 'Not allowed' });
    const tenantId = tenantOf(req);
    const { studentId } = req.body || {};
    const cfg = await ensureConfig(tenantId);
    const user = await User.findOne({ _id: studentId, tenantId });
    if (!user) return res.status(404).json({ message: 'Student not found' });
    const now = new Date();
    const expires = new Date(now); expires.setMonth(expires.getMonth() + (cfg.membershipMonths || 12));
    (user as any).passport = {
      ...(user as any).passport,
      active: true, product: 'career_passport', activatedAt: now, expiresAt: expires,
    };
    await user.save();
    res.json({ message: 'Student activated for Career Passport', passport: (user as any).passport });
  } catch (e: any) {
    res.status(500).json({ message: e.message || 'Failed to convert student' });
  }
};
