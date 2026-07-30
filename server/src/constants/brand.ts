/**
 * Single source of truth for CodeBegun brand links used in outbound email.
 *
 * These were previously duplicated across emailTemplates.ts and battleController.ts
 * and had already drifted — the website footer pointed at
 * linkedin.com/company/codebegun while every email pointed at
 * linkedin.com/company/codbegun (missing the 'e'). One of those was sending real
 * recipients to a dead page. Import from here so they can never disagree again.
 *
 * A social entry with an empty `href` is DROPPED from the rendered row rather than
 * falling back to the website — an icon that looks like a social link but isn't one
 * is worse than no icon.
 */

export const SITE_URL = 'https://www.codebegun.com';
export const APP_URL = process.env.APP_URL || 'https://platform.codebegun.com';
export const LOGO_URL = `${APP_URL}/assets/logo.png`;

export interface SocialLink {
  key: string;
  label: string;   // short glyph shown in the circular chip
  title: string;   // accessible name / tooltip
  href: string;    // empty string = not configured, so the icon is not rendered
}

/**
 * Confirmed by the owner 2026-07-30. Note the LinkedIn slug really is `codbegun`
 * (no 'e') — the emails were right and the WEBSITE footer had the typo, which is
 * fixed alongside this. URLs are canonicalised: share/tracking parameters and
 * feed-view suffixes stripped, so they stay stable in long-lived email archives.
 * X/Twitter is deliberately absent — no account, so no icon.
 */
export const SOCIAL_LINKS: SocialLink[] = [
  { key: 'linkedin',  label: 'in', title: 'LinkedIn',  href: 'https://www.linkedin.com/company/codbegun' },
  { key: 'instagram', label: '◎',  title: 'Instagram', href: 'https://www.instagram.com/codebegun' },
  { key: 'youtube',   label: '▶',  title: 'YouTube',   href: 'https://www.youtube.com/@CodeBegun' },
  { key: 'facebook',  label: 'f',  title: 'Facebook',  href: 'https://www.facebook.com/profile.php?id=100092735476326' },
  { key: 'whatsapp',  label: 'WA', title: 'WhatsApp',  href: 'https://wa.me/916301099587' },
];

/** Only the entries that actually have a destination. */
export const activeSocials = (): SocialLink[] => SOCIAL_LINKS.filter(s => !!s.href);

/** Circular social chip row for a dark email header. */
export const socialRowHtml = (): string =>
  activeSocials().map(s =>
    `<a href="${s.href}" title="${s.title}" style="display:inline-block;width:30px;height:30px;line-height:30px;text-align:center;background:rgba(255,255,255,.12);border-radius:50%;color:#ffffff;text-decoration:none;font-size:12px;margin-left:6px">${s.label}</a>`
  ).join('');
