import fs from 'fs';
import * as settings from './settingsService';
import { brandedHtml } from './outreachTemplates';
import { unsubToken } from '../utils/partnerUnsub';

/**
 * Shared helpers for partner-outreach emails: branded rendering, the public base
 * URL, one-click unsubscribe links, and splitting stored attachments into files
 * to attach (≤10 MB) vs download links (larger — kept out of the message so it
 * doesn't bounce or trip spam filters).
 */

export interface AttachmentRef {
  filename: string;
  path: string;
  size: number;
  contentType?: string;
  url?: string;         // public /uploads path
}

const ATTACH_MAX = 10 * 1024 * 1024; // 10 MB

export function publicBase(): string {
  return (process.env.FRONTEND_URL || process.env.CLIENT_URL || 'https://platform.codebegun.com').replace(/\/$/, '');
}
function absUrl(u?: string): string {
  if (!u) return '';
  return u.startsWith('http') ? u : `${publicBase()}${u.startsWith('/') ? '' : '/'}${u}`;
}

export function unsubUrl(tenantId: string, partnerId: string): string {
  return `${publicBase()}/api/v1/public/partner-unsubscribe/${unsubToken(tenantId, partnerId)}`;
}

/** Attach small files inline; surface large ones as download links. */
export function splitAttachments(refs?: AttachmentRef[]): {
  attach: { filename: string; content: Buffer }[];
  links: { label: string; url: string }[];
} {
  const attach: { filename: string; content: Buffer }[] = [];
  const links: { label: string; url: string }[] = [];
  for (const r of refs || []) {
    try {
      if (r.size <= ATTACH_MAX && r.path && fs.existsSync(r.path)) {
        attach.push({ filename: r.filename, content: fs.readFileSync(r.path) });
      } else if (r.url) {
        links.push({ label: r.filename, url: absUrl(r.url) });
      }
    } catch { /* skip a broken/missing file rather than fail the whole send */ }
  }
  return { attach, links };
}

/** Render the email body with tenant branding + footer. */
export function renderEmail(
  body: string,
  tenantId: string,
  opts: { mode: 'light' | 'full'; links?: { label: string; url: string }[]; unsubscribeUrl?: string },
): string {
  return brandedHtml(body, {
    mode: opts.mode,
    logoUrl: settings.getStr('PARTNER_EMAIL_LOGO_URL', '', tenantId) || `${publicBase()}/assets/logo.png`,
    mailingAddress: settings.getStr('PARTNER_MAILING_ADDRESS', '', tenantId) || undefined,
    unsubscribeUrl: opts.unsubscribeUrl,
    links: opts.links,
  });
}
