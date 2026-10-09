import dns from 'dns';
import mongoose from 'mongoose';
import Tenant from '../models/Tenant';
import * as settings from './settingsService';
import { invalidateBrand } from './tenantBrand';

/**
 * Custom domains: an institute served at its own address (lms.college.edu) instead of
 * platform.codebegun.com. The same app answers on every domain; the domain only decides which
 * institute the login page, public pages and email links belong to.
 *
 * Going live is three steps: the college points DNS at the platform, the platform administrator
 * checks it here, then runs scripts/add-custom-domain.sh on the server (nginx + certificate).
 */

export class DomainError extends Error {
  constructor(message: string, public status = 400) { super(message); }
}

const DOMAIN_RE = /^(?=.{4,253}$)([a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?\.)+[a-z]{2,}$/;
export const normalizeHost = (h: string) => String(h || '').trim().toLowerCase().replace(/^https?:\/\//, '').replace(/[/:].*$/, '').replace(/\.$/, '');

const platformHost = () => normalizeHost(settings.getStr('FRONTEND_URL', 'https://platform.codebegun.com'));

export async function setDomain(tenantId: string, domain: string) {
  const d = normalizeHost(domain);
  if (d && !DOMAIN_RE.test(d)) throw new DomainError('That does not look like a domain — e.g. lms.yourcollege.edu');
  if (d && (d === platformHost() || d.endsWith('codebegun.com'))) throw new DomainError('Use the institute\'s own domain, not a platform one.');
  if (d) {
    const taken = await Tenant.exists({ _id: { $ne: new mongoose.Types.ObjectId(tenantId) }, 'branding.customDomain': d });
    if (taken) throw new DomainError('Another institute already uses that domain.');
  }
  await Tenant.updateOne({ _id: new mongoose.Types.ObjectId(tenantId) },
    { $set: { 'branding.customDomain': d || null, 'branding.customDomainVerifiedAt': null } });
  invalidateBrand(tenantId);
  hostCache.clear();
  return domainStatus(tenantId);
}

/** Does the domain point at this platform (same A records, or a CNAME to the platform host)? */
export async function verifyDomain(tenantId: string) {
  const t: any = await Tenant.findById(tenantId).select('branding').lean();
  const d = normalizeHost(t?.branding?.customDomain || '');
  if (!d) throw new DomainError('Set a domain first.');
  const r = dns.promises;
  const [mine, platform, cname] = await Promise.all([
    r.resolve4(d).catch(() => [] as string[]),
    r.resolve4(platformHost()).catch(() => [] as string[]),
    r.resolveCname(d).catch(() => [] as string[]),
  ]);
  const expectedIp = settings.getStr('PLATFORM_PUBLIC_IP', '') || platform[0] || '';
  const ok = cname.map(normalizeHost).includes(platformHost()) || (!!expectedIp && mine.includes(expectedIp)) || mine.some((ip) => platform.includes(ip));
  if (!ok) {
    throw new DomainError(mine.length || cname.length
      ? `${d} points to ${[...cname, ...mine].join(', ')} — it should be a CNAME to ${platformHost()} or an A record to ${expectedIp || 'the platform IP'}.`
      : `${d} has no DNS record yet. Add a CNAME to ${platformHost()}${expectedIp ? ` (or an A record to ${expectedIp})` : ''}, then check again — DNS can take up to an hour.`);
  }
  await Tenant.updateOne({ _id: new mongoose.Types.ObjectId(tenantId) }, { $set: { 'branding.customDomainVerifiedAt': new Date() } });
  invalidateBrand(tenantId);
  hostCache.clear();
  return domainStatus(tenantId);
}

export async function domainStatus(tenantId: string) {
  const t: any = await Tenant.findById(tenantId).select('branding').lean();
  const d = t?.branding?.customDomain || '';
  return {
    domain: d,
    verifiedAt: t?.branding?.customDomainVerifiedAt || null,
    platformHost: platformHost(),
    platformIp: settings.getStr('PLATFORM_PUBLIC_IP', ''),
    // Run on the server once DNS checks out (it writes the nginx block and gets the certificate).
    installCommand: d ? `sudo bash /root/lms/scripts/add-custom-domain.sh ${d}` : '',
  };
}

const hostCache = new Map<string, { at: number; tenantId: string | null }>();

/** The institute whose verified custom domain this is (null for the platform host or unknown). */
export async function tenantForHost(host: string): Promise<string | null> {
  const h = normalizeHost(host);
  if (!h || h === platformHost() || h === 'localhost' || /^\d+\.\d+\.\d+\.\d+$/.test(h)) return null;
  const hit = hostCache.get(h);
  if (hit && Date.now() - hit.at < 5 * 60_000) return hit.tenantId;
  const t: any = await Tenant.findOne({ 'branding.customDomain': h, 'branding.customDomainVerifiedAt': { $ne: null }, isActive: { $ne: false } }).select('_id').lean().catch(() => null);
  const id = t?._id ? String(t._id) : null;
  hostCache.set(h, { at: Date.now(), tenantId: id });
  return id;
}
