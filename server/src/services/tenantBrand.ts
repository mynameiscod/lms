import mongoose from 'mongoose';
import Tenant from '../models/Tenant';
import * as settings from './settingsService';

/**
 * An institute's brand — name, logo, contact — for every email, PDF and page the platform
 * produces on its behalf. CodeBegun (the platform owner) keeps CodeBegun's brand everywhere.
 *
 * Sources, first non-empty wins: Branding (portal title) → receipt settings (which institutes
 * already fill in for fee receipts) → the institute record itself.
 */

export interface Brand {
  isPlatformOwner: boolean;
  name: string;
  logoUrl: string;
  supportEmail: string;
  supportPhone: string;
  address: string;
  website: string;
  primaryColor: string;
}

export const CODEBEGUN_BRAND: Brand = {
  isPlatformOwner: true,
  name: 'CodeBegun',
  logoUrl: 'https://platform.codebegun.com/assets/logo.png',
  supportEmail: 'contact@codebegun.com',
  supportPhone: '+91 63010 99587',
  address: 'Madhapur, Hyderabad',
  website: 'https://codebegun.com',
  primaryColor: '#4f46e5',
};

const CACHE_MS = 5 * 60_000;
const cache = new Map<string, { at: number; brand: Brand }>();

export function invalidateBrand(tenantId?: string) {
  if (tenantId) cache.delete(String(tenantId)); else cache.clear();
}

export async function getBrand(tenantId?: string | null): Promise<Brand> {
  if (!tenantId || !mongoose.isValidObjectId(String(tenantId)) || settings.isPlatformOwner(String(tenantId))) return CODEBEGUN_BRAND;
  const key = String(tenantId);
  const hit = cache.get(key);
  if (hit && Date.now() - hit.at < CACHE_MS) return hit.brand;
  const t: any = await Tenant.findById(key).select('name logo website branding receipt').lean().catch(() => null);
  const r = t?.receipt || {};
  const brand: Brand = {
    isPlatformOwner: false,
    name: t?.branding?.portalTitle || r.instituteName || t?.name || 'Your institute',
    logoUrl: t?.logo || r.logoUrl || '',
    supportEmail: r.email || '',
    supportPhone: r.phone || '',
    address: r.address || '',
    website: r.website || t?.website || '',
    primaryColor: t?.branding?.primaryColor || '#4f46e5',
  };
  cache.set(key, { at: Date.now(), brand });
  return brand;
}

/**
 * Re-brand a finished email/PDF text for an institute that is not CodeBegun: brand name, logo and
 * contact lines are swapped; links (platform.codebegun.com/…) are left alone so they keep working.
 * For CodeBegun it returns the text unchanged.
 */
export function rebrand(text: string, brand: Brand): string {
  if (!text || brand.isPlatformOwner) return text;
  let s = text;
  // Logo image → the institute's logo, or no image at all.
  s = s.replace(/<img\b[^>]*src=["']https:\/\/platform\.codebegun\.com\/assets\/logo\.png["'][^>]*>/gi,
    brand.logoUrl ? `<img src="${brand.logoUrl}" alt="${escapeHtml(brand.name)}" style="height:40px;width:auto;display:block;" />` : '');
  // CodeBegun contact details → the institute's (or removed).
  s = s.replace(/hr@codebegun\.com(<br>)?/gi, brand.supportEmail ? `${brand.supportEmail}$1` : '');
  s = s.replace(/contact@codebegun\.com/gi, brand.supportEmail || '');
  s = s.replace(/\+91 63010 99587/g, brand.supportPhone || '');
  s = s.replace(/Madhapur, Hyderabad/g, brand.address || '');
  // The product name in prose. Not inside URLs or addresses (preceded by . / @ or followed by .com).
  s = s.replace(/CodeBegun Learning Management System/g, brand.name);
  s = s.replace(/CodeBegun LMS/g, brand.name);
  // Leaves codebegun.com / CodeBegun.in style addresses alone (a sentence-ending full stop is fine).
  s = s.replace(/(?<![\w./@-])CodeBegun(?![\w-]*\.(com|in|io))/g, brand.name);
  return s;
}

const escapeHtml = (s: string) => s.replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]!));
