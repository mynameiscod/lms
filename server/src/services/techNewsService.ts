import dns from 'dns/promises';
import net from 'net';
import { aiComplete } from './aiGateway';

/**
 * Turn a link an admin pasted into a publishable draft.
 *
 * Fetch the page, pull out the metadata and readable text, and have the model write three
 * lines a student would actually read. The admin reviews and publishes — the model never
 * publishes anything on its own.
 */

export interface NewsDraft {
  title: string;
  summary: string;
  source: string;
  imageUrl: string;
  tags: string[];
}

/**
 * Refuse URLs that point back inside our own network.
 *
 * This endpoint takes a URL from a user and makes the SERVER fetch it, which is exactly
 * the shape of an SSRF: paste http://169.254.169.254/ or http://127.0.0.1:27017 and the
 * server happily retrieves something no outsider should ever see. Admin-only is not
 * sufficient protection — this box has been compromised twice, and the second time was
 * through a service that was reachable when it should not have been.
 *
 * Resolution happens BEFORE the fetch, and the resolved address is what gets checked, so
 * a hostname that resolves to a private range is caught too.
 */
async function assertPublicUrl(raw: string): Promise<URL> {
  let u: URL;
  try { u = new URL(raw); } catch { throw new Error('That is not a valid URL.'); }
  if (u.protocol !== 'http:' && u.protocol !== 'https:') {
    throw new Error('Only http and https links can be imported.');
  }

  const isPrivate = (ip: string): boolean => {
    if (net.isIPv4(ip)) {
      const [a, b] = ip.split('.').map(Number);
      return a === 10 || a === 127 || a === 0
        || (a === 172 && b >= 16 && b <= 31)
        || (a === 192 && b === 168)
        || (a === 169 && b === 254)          // cloud metadata
        || a >= 224;                          // multicast / reserved
    }
    const s = ip.toLowerCase();
    return s === '::1' || s.startsWith('fc') || s.startsWith('fd') || s.startsWith('fe80');
  };

  const host = u.hostname.replace(/^\[|\]$/g, '');
  if (net.isIP(host)) {
    if (isPrivate(host)) throw new Error('That address is not reachable from here.');
    return u;
  }
  const addrs = await dns.lookup(host, { all: true }).catch(() => []);
  if (!addrs.length) throw new Error('That domain could not be resolved.');
  if (addrs.some(a => isPrivate(a.address))) throw new Error('That address is not reachable from here.');
  return u;
}

const meta = (html: string, prop: string): string => {
  const re = new RegExp(`<meta[^>]+(?:property|name)=["']${prop}["'][^>]*content=["']([^"']+)["']`, 'i');
  const alt = new RegExp(`<meta[^>]+content=["']([^"']+)["'][^>]*(?:property|name)=["']${prop}["']`, 'i');
  return (html.match(re)?.[1] || html.match(alt)?.[1] || '').trim();
};

/** Strip markup down to readable prose. Crude on purpose — the model tolerates noise. */
function readableText(html: string): string {
  return html
    .replace(/<script[\s\S]*?<\/script>/gi, ' ')
    .replace(/<style[\s\S]*?<\/style>/gi, ' ')
    .replace(/<nav[\s\S]*?<\/nav>/gi, ' ')
    .replace(/<footer[\s\S]*?<\/footer>/gi, ' ')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&#39;|&rsquo;/g, "'")
    .replace(/&quot;|&ldquo;|&rdquo;/g, '"')
    .replace(/\s+/g, ' ')
    .trim();
}

const SYSTEM = `You write a daily tech-news card for Indian engineering students who are job hunting.

Return ONLY a JSON object:
{"title":"...","summary":"...","tags":["..."]}

title: the headline, rewritten in your own words, under 90 characters. Plain, not clickbait.
summary: EXACTLY 2-3 short sentences. What happened, then why it matters to someone about
to start a tech career. No hype, no "in a groundbreaking move". If it does not matter to a
student, say what it changes rather than inventing significance.
tags: 2-4 lowercase topic tags, e.g. ["ai","hiring","google"].

Never copy sentences from the article. Summarise in your own words — this is published
alongside a link to the original, not instead of it.`;

/**
 * Build a draft from a URL. Throws with a message meant for the admin to read.
 */
export async function draftFromUrl(url: string, tenantId?: string): Promise<NewsDraft> {
  const u = await assertPublicUrl(url);

  const ctrl = new AbortController();
  // A slow publisher must not hold a request open indefinitely.
  const timer = setTimeout(() => ctrl.abort(), 12_000);
  let html = '';
  try {
    const r = await fetch(u.toString(), {
      signal: ctrl.signal,
      redirect: 'follow',
      headers: { 'User-Agent': 'CodeBegunBot/1.0 (+https://platform.codebegun.com)' },
    });
    if (!r.ok) throw new Error(`The page returned ${r.status}.`);
    html = (await r.text()).slice(0, 400_000);
  } catch (e: any) {
    if (e?.name === 'AbortError') throw new Error('That page took too long to respond.');
    throw new Error(e?.message || 'Could not fetch that page.');
  } finally {
    clearTimeout(timer);
  }

  const ogTitle = meta(html, 'og:title') || (html.match(/<title[^>]*>([^<]+)<\/title>/i)?.[1] || '').trim();
  const ogImage = meta(html, 'og:image');
  const ogSite = meta(html, 'og:site_name') || u.hostname.replace(/^www\./, '');
  const ogDesc = meta(html, 'og:description') || meta(html, 'description');

  const body = readableText(html).slice(0, 6000);
  if (body.length < 200 && !ogDesc) {
    throw new Error('There was almost no readable text on that page — write the summary yourself.');
  }

  let ai: any = null;
  try {
    const raw = await aiComplete({
      tenantId, module: 'technews_summary', product: 'careerpilot',
      system: SYSTEM,
      user: `URL: ${u.toString()}\nHeadline: ${ogTitle}\nMeta description: ${ogDesc}\n\nPage text:\n${body}`,
      maxTokens: 400,
    });
    const cleaned = raw.replace(/```json|```/g, '').trim();
    ai = JSON.parse(cleaned.slice(cleaned.indexOf('{'), cleaned.lastIndexOf('}') + 1));
  } catch (e: any) {
    console.error('[technews] summarise failed:', e?.message || e);
  }

  // Falls back to the publisher's own metadata rather than failing outright: a draft the
  // admin has to finish is far more useful than an error.
  return {
    title: String(ai?.title || ogTitle || '').trim().slice(0, 200),
    summary: String(ai?.summary || ogDesc || '').trim().slice(0, 700),
    source: ogSite.slice(0, 80),
    imageUrl: ogImage.startsWith('http') ? ogImage.slice(0, 600) : '',
    tags: Array.isArray(ai?.tags)
      ? ai.tags.map((t: any) => String(t).toLowerCase().trim().slice(0, 24)).filter(Boolean).slice(0, 4)
      : [],
  };
}
