import mongoose from 'mongoose';
import Tenant from '../models/Tenant';
import { invalidateBrand } from './tenantBrand';
import * as settings from './settingsService';

/**
 * The institute admin's Branding page. Only these fields can be written — the old CollegeSettings
 * page called PATCH /tenants/:id, which wrote the raw request body into the tenant record and
 * needed super-admin rights, so a college admin always got 403.
 */
export class BrandingError extends Error {
  constructor(message: string, public status = 400) { super(message); }
}

const URL_RE = /^https:\/\/[^\s"'<>]+$/i;
const COLOR_RE = /^#[0-9a-f]{6}$/i;

export async function getBranding(tenantId: string) {
  const t: any = await Tenant.findById(tenantId).select('name slug logo website branding receipt').lean();
  if (!t) throw new BrandingError('Institute not found', 404);
  return {
    name: t.name || '',
    slug: t.slug || '',
    logo: t.logo || '',
    website: t.website || '',
    primaryColor: t.branding?.primaryColor || '',
    secondaryColor: t.branding?.secondaryColor || '',
    portalTitle: t.branding?.portalTitle || '',
    welcomeMessage: t.branding?.welcomeMessage || '',
    faviconUrl: t.branding?.faviconUrl || '',
    supportEmail: t.receipt?.email || '',
    supportPhone: t.receipt?.phone || '',
    address: t.receipt?.address || '',
  };
}

export async function saveBranding(tenantId: string, input: Record<string, unknown>) {
  const v = (k: string) => (input[k] === undefined ? undefined : String(input[k] ?? '').trim());
  const set: Record<string, unknown> = {};
  const name = v('name');
  if (name !== undefined) {
    if (name.length < 2 || name.length > 80) throw new BrandingError('The institute name should be 2–80 characters.');
    set.name = name;
  }
  for (const [key, path] of [['logo', 'logo'], ['faviconUrl', 'branding.faviconUrl'], ['website', 'website']] as const) {
    const val = v(key);
    if (val === undefined) continue;
    if (val && !URL_RE.test(val)) throw new BrandingError(`${key === 'website' ? 'Website' : key === 'logo' ? 'Logo' : 'Favicon'} must be an https:// link.`);
    set[path] = val;
  }
  for (const [key, path] of [['primaryColor', 'branding.primaryColor'], ['secondaryColor', 'branding.secondaryColor']] as const) {
    const val = v(key);
    if (val === undefined) continue;
    if (val && !COLOR_RE.test(val)) throw new BrandingError('Colours look like #4f46e5.');
    set[path] = val;
  }
  for (const [key, path, max] of [['portalTitle', 'branding.portalTitle', 60], ['welcomeMessage', 'branding.welcomeMessage', 300],
    ['supportEmail', 'receipt.email', 120], ['supportPhone', 'receipt.phone', 30], ['address', 'receipt.address', 200]] as const) {
    const val = v(key);
    if (val === undefined) continue;
    if (val.length > max) throw new BrandingError(`${key} is too long.`);
    if (key === 'supportEmail' && val && !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(val)) throw new BrandingError('Support email looks wrong.');
    set[path] = val;
  }
  // An institute that is not the platform owner never shows CodeBegun's brand.
  if (!settings.isPlatformOwner(tenantId)) set['branding.hideCodeBegunBranding'] = true;
  await Tenant.updateOne({ _id: new mongoose.Types.ObjectId(tenantId) }, { $set: set });
  invalidateBrand(tenantId);
  return getBranding(tenantId);
}

/** What the login page may show before anyone signs in: by id or slug, no private data. */
export async function publicBranding(idOrSlug: string) {
  const q = mongoose.isValidObjectId(idOrSlug) ? { _id: idOrSlug } : { slug: String(idOrSlug).toLowerCase() };
  const t: any = await Tenant.findOne({ ...q, isActive: { $ne: false } }).select('name logo branding').lean();
  if (!t) return null;
  const owner = settings.isPlatformOwner(String(t._id));
  return {
    tenantId: String(t._id),
    name: t.branding?.portalTitle || t.name,
    logo: t.logo || '',
    primaryColor: t.branding?.primaryColor || '',
    welcomeMessage: t.branding?.welcomeMessage || '',
    isPlatformOwner: owner,
  };
}
