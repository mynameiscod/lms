import { IPlacementPartner } from '../models/PlacementPartner';

/**
 * Outreach copy + branded HTML rendering for Placement Partnership emails.
 *
 * Templates return plain text (used as the text/plain part + for reply threading);
 * `brandedHtml` turns that text into a polished, on-brand HTML email:
 *   - a CodeBegun header band + tagline
 *   - the message as properly-spaced paragraphs (blank line = new paragraph)
 *   - lines starting with "•" or "-" become a clean bulleted list
 *   - a lone "—" line separates the message from a styled signature block
 *   - a compliant footer (mailing address + one-click unsubscribe)
 *
 * Keep the copy warm, specific and short — this is 1:1 B2B outreach to hiring
 * teams, not bulk marketing.
 */

export interface Draft { subject: string; body: string; }

const firstName = (full?: string) => (full || '').trim().split(/\s+/)[0] || 'there';
// The sender setting may be "Siva — CodeBegun Placements"; use just the person for the signature name line.
const personName = (sender: string) => (sender.split('—')[0] || sender).trim() || sender;

// A lone "—" line is the sentinel that separates message from signature (see brandedHtml).
const SIGNATURE = (sender: string) =>
  `\n—\n${personName(sender)}\nCodeBegun — Java Full Stack Training & Placements\nHyderabad · codebegun.com`;

// ── First intro (cold) email ──────────────────────────────────────────────────
export function coldEmail(p: IPlacementPartner, senderName: string): Draft {
  const fn = firstName(p.contactName);
  const company = p.companyName;
  const angle = p.outreachAngle?.trim();

  return {
    subject: `Java full-stack freshers, ready to interview — ${company}`,
    body:
`Hi ${fn},

I'm ${personName(senderName)} from CodeBegun, a Java Full Stack training institute in Hyderabad. We train and screen freshers until they're genuinely job-ready — real project work and live coding rounds, not just certificates.

${angle ? `${angle.replace(/\.?\s*$/, '')}.\n\n` : ''}Our current batch is ready to interview now, and strong on:

• Java, Spring Boot & REST APIs
• React & modern front-end
• SQL, data structures & problem-solving

Every candidate clears our internal screening, so you'd review a short, pre-vetted shortlist — not a pile of resumes. Could I send you 2–3 profiles that fit ${company}'s openings? You can interview them directly, and there's no cost to evaluate.${SIGNATURE(senderName)}`,
  };
}

// ── Polite follow-up bumps (auto-sent if no reply), step 1..N ─────────────────
export function followupEmail(p: IPlacementPartner, step: number, senderName: string): Draft {
  const fn = firstName(p.contactName);
  const company = p.companyName;

  if (step <= 1) {
    return {
      subject: `Re: Java full-stack freshers for ${company}`,
      body:
`Hi ${fn},

Just floating this back to the top of your inbox — I know hiring inboxes get busy.

If fresher or junior hiring is on the cards at ${company}, I'd be glad to send a couple of matched, pre-screened profiles you can interview directly. No commitment to take a look.

Worth a quick look?${SIGNATURE(senderName)}`,
    };
  }
  if (step === 2) {
    return {
      subject: `Re: Java full-stack freshers for ${company}`,
      body:
`Hi ${fn},

One more gentle nudge — then I'll leave your inbox in peace :)

Even a quick "not now" helps me know whether to check back next quarter. And if the timing is right, I can share 2–3 strong profiles today.${SIGNATURE(senderName)}`,
    };
  }
  // Final, graceful close
  return {
    subject: `Closing the loop — ${company}`,
    body:
`Hi ${fn},

I'll assume the timing isn't right for now, so I won't keep emailing.

Whenever you need job-ready Java / React freshers, just reply to this note and I'll send profiles the same day. Wishing you and the ${company} team a great quarter ahead.${SIGNATURE(senderName)}`,
  };
}

// ── Personal vouch (trust point — drafted, approved before send) ──────────────
export function vouchEmail(p: IPlacementPartner, senderName: string): Draft {
  const fn = firstName(p.contactName);
  return {
    subject: `A quick personal note — ${p.companyName}`,
    body:
`Hi ${fn},

I wanted to reach out personally rather than send another generic mail.

I've worked closely with the freshers we train at CodeBegun, and a few of them really stand out — not just on skills, but on attitude and how fast they pick things up. I'd genuinely vouch for them in an interview setting.

If you're open to it, I'd love to introduce 1–2 of them to ${p.companyName}. I'm confident they'd be worth your team's time.

Happy to jump on a 10-minute call whenever suits you.${SIGNATURE(senderName)}`,
  };
}

/** Minimal HTML wrapper (kept for callers that want a bare body). */
export function toHtml(body: string): string {
  const esc = body.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
  return `<div style="font-family:Arial,Helvetica,sans-serif;font-size:14px;line-height:1.6;color:#1f2937;white-space:pre-wrap">${esc}</div>`;
}

export interface BrandOpts {
  mode: 'light' | 'full';
  logoUrl?: string;
  mailingAddress?: string;
  unsubscribeUrl?: string;
  links?: { label: string; url: string }[];   // download links for large attachments
}

const esc = (s: string) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

/** Turn the plain body (paragraphs, "•" bullets) into formatted HTML blocks. */
function renderBlocks(text: string): string {
  return text
    .split(/\n{2,}/)
    .map(b => b.replace(/\s+$/,'').replace(/^\s+/,''))
    .filter(Boolean)
    .map(block => {
      const lines = block.split('\n');
      const isList = lines.length > 0 && lines.every(l => /^\s*[•\-]\s+/.test(l));
      if (isList) {
        return `<ul style="margin:0 0 16px;padding-left:22px">${lines
          .map(l => `<li style="margin:5px 0;color:#334155;font-size:15px;line-height:1.6">${esc(l.replace(/^\s*[•\-]\s+/, ''))}</li>`)
          .join('')}</ul>`;
      }
      return `<p style="margin:0 0 15px;color:#334155;font-size:15px;line-height:1.65">${esc(block).replace(/\n/g, '<br>')}</p>`;
    })
    .join('');
}

/**
 * Render an outreach email as a polished, on-brand HTML message.
 * Used for cold / follow-up / vouch / reply. Deliverability-friendly: single
 * column, inline CSS, no remote images unless a logo URL is configured.
 */
export function brandedHtml(body: string, opts: BrandOpts): string {
  const [messageRaw, ...sigParts] = body.split(/\n—\n/);
  const signatureRaw = sigParts.join('\n—\n').trim();

  const messageHtml = renderBlocks(messageRaw);

  const linksHtml = opts.links?.length
    ? `<div style="margin:2px 0 16px;font-size:14px">${opts.links
        .map(l => `<a href="${l.url}" style="color:#0a66c2;text-decoration:none">📎 ${esc(l.label)}</a>`)
        .join('<br>')}</div>`
    : '';

  let signatureHtml = '';
  if (signatureRaw) {
    const sl = signatureRaw.split('\n').map(l => l.trim()).filter(Boolean);
    const name = sl[0] || '';
    const rest = sl.slice(1);
    signatureHtml = `<div style="margin-top:22px;padding-top:16px;border-top:1px solid #eef2f7">
      <div style="color:#051D64;font-weight:700;font-size:14px">${esc(name)}</div>
      ${rest.map(l => `<div style="color:#64748b;font-size:13px;line-height:1.55">${esc(l)}</div>`).join('')}
    </div>`;
  }

  const footerBits: string[] = [];
  if (opts.mailingAddress) footerBits.push(esc(opts.mailingAddress));
  if (opts.unsubscribeUrl) footerBits.push(`<a href="${opts.unsubscribeUrl}" style="color:#94a3b8">Unsubscribe</a>`);
  const footer = footerBits.length
    ? `<div style="padding:14px 28px;border-top:1px solid #e5e7eb;color:#94a3b8;font-size:11px;line-height:1.6">${footerBits.join(' &middot; ')}</div>`
    : '';

  const brandMark = opts.logoUrl
    ? `<img src="${esc(opts.logoUrl)}" alt="CodeBegun" style="height:30px;display:block">`
    : `<div style="color:#ffffff;font-size:21px;font-weight:800;letter-spacing:.3px;line-height:1">Code<span style="color:#5eb3c7">Begun</span></div>`;

  return `<div style="margin:0;padding:24px 12px;background:#f1f5f9;font-family:Arial,Helvetica,sans-serif">
  <div style="max-width:600px;margin:0 auto;background:#ffffff;border:1px solid #e5e7eb;border-radius:12px;overflow:hidden">
    <div style="background:#051D64;padding:20px 28px">
      ${brandMark}
      <div style="color:#93c5fd;font-size:12px;margin-top:5px">Java Full Stack Training &amp; Placements &middot; Hyderabad</div>
    </div>
    <div style="height:3px;background:#359AAD"></div>
    <div style="padding:26px 28px 20px">
      ${messageHtml}${linksHtml}${signatureHtml}
    </div>
    ${footer}
  </div>
</div>`;
}
