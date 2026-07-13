import { IPlacementPartner } from '../models/PlacementPartner';

/**
 * Outreach copy + branded HTML rendering for Placement Partnership emails.
 *
 * Templates return plain text (used as the text/plain part + for reply threading);
 * `brandedHtml` turns that text into a polished, on-brand HTML email:
 *   - a white header with the CodeBegun logo + tagline and a teal accent
 *   - the message as properly-spaced paragraphs (blank line = new paragraph)
 *   - lines starting with "•" or "-" become a clean bulleted list
 *   - a lone "—" line separates the message from a styled signature block
 *   - a compliant footer (mailing address + one-click unsubscribe)
 *
 * Branding is CodeBegun only.
 */

export interface Draft { subject: string; body: string; }

// ── CodeBegun identity (used in copy + signature) ─────────────────────────────
const FOUNDER = 'Siva Prasad Galaba';
const FOUNDER_SHORT = 'Siva Prasad';
const CONTACT_PHONE = '+91 63010 99587';
const CONTACT_EMAIL = 'contact@codebegun.com';
const SITE = 'codebegun.com';
const LOCATION = 'Madhapur, Hyderabad';

const firstName = (full?: string) => (full || '').trim().split(/\s+/)[0] || 'there';
// The sender setting may be "Siva — CodeBegun Placements"; take the person part.
const personName = (sender: string) => (sender.split('—')[0] || sender).trim();
// Resolve the signer name: a configured real name wins; otherwise the founder.
const signerName = (sender: string) => {
  const nm = personName(sender);
  if (!nm || /placements?\s*team|codebegun/i.test(nm)) return FOUNDER;
  return nm;
};

// A lone "—" line is the sentinel that separates message from signature (see brandedHtml).
const SIGNATURE = (sender: string) =>
  `\n—\n${signerName(sender)}\nFounder — CodeBegun\n${LOCATION}\n📞 ${CONTACT_PHONE}  ·  ✉️ ${CONTACT_EMAIL}  ·  🌐 ${SITE}`;

// ── First intro (cold) email ──────────────────────────────────────────────────
export function coldEmail(p: IPlacementPartner, senderName: string): Draft {
  const fn = firstName(p.contactName);
  const company = p.companyName;
  const angle = p.outreachAngle?.trim();
  const signer = signerName(senderName);
  const signerShort = signer === FOUNDER ? FOUNDER_SHORT : signer.split(/\s+/).slice(0, 2).join(' ');
  const noticedLine = angle
    ? `${angle.replace(/\.?\s*$/, '')}.`
    : `I noticed that ${company} is hiring for Java Developer / Java Full Stack Developer roles.`;

  return {
    subject: `Pre-screened Java Full Stack freshers ready for interview | CodeBegun`,
    body:
`Hi ${fn},

I'm ${signerShort}, Founder of CodeBegun, a career-focused software training and placement institute in Hyderabad.

${noticedLine}

We currently have a group of trained and internally assessed freshers who are ready for immediate interviews. Our candidates have completed practical training in:

• Java, Spring Boot, Microservices & REST APIs
• React.js, JavaScript, HTML & CSS
• SQL, Data Structures & problem-solving
• Git, GitHub & real-time project development
• Communication, aptitude & mock interviews

Before we share a profile, each candidate goes through our internal screening — technical assessments, live coding, project evaluation and communication checks.

Instead of sending a large number of resumes, I'd be happy to share a shortlist of 2–3 relevant candidates based on your current requirements. There is no recruitment or evaluation fee for reviewing or interviewing our candidates.

Could you please share your current fresher hiring requirements, or the appropriate HR / Talent Acquisition contact?${SIGNATURE(senderName)}`,
  };
}

// ── Polite follow-up bumps (auto-sent if no reply), step 1..N ─────────────────
export function followupEmail(p: IPlacementPartner, step: number, senderName: string): Draft {
  const fn = firstName(p.contactName);
  const company = p.companyName;

  if (step <= 1) {
    return {
      subject: `Re: Pre-screened Java Full Stack freshers ready for interview | CodeBegun`,
      body:
`Hi ${fn},

Just floating this back to the top of your inbox — I know hiring inboxes get busy.

If fresher or junior hiring is on the cards at ${company}, I'd be glad to share a shortlist of 2–3 pre-screened Java Full Stack candidates you can interview directly. No cost to evaluate.

Could you point me to the right HR / Talent Acquisition contact, or your current requirements?${SIGNATURE(senderName)}`,
    };
  }
  if (step === 2) {
    return {
      subject: `Re: Pre-screened Java Full Stack freshers ready for interview | CodeBegun`,
      body:
`Hi ${fn},

One more gentle nudge — then I'll leave your inbox in peace :)

Even a quick "not now" helps me know whether to check back next quarter. And if the timing is right, I can share 2–3 strong, interview-ready profiles today.${SIGNATURE(senderName)}`,
    };
  }
  // Final, graceful close
  return {
    subject: `Closing the loop — ${company} | CodeBegun`,
    body:
`Hi ${fn},

I'll assume the timing isn't right for now, so I won't keep emailing.

Whenever you need job-ready Java / React freshers, just reply to this note and I'll send a shortlist the same day. Wishing you and the ${company} team a great quarter ahead.${SIGNATURE(senderName)}`,
  };
}

// ── Personal vouch (trust point — drafted, approved before send) ──────────────
export function vouchEmail(p: IPlacementPartner, senderName: string): Draft {
  const fn = firstName(p.contactName);
  return {
    subject: `A quick personal note — ${p.companyName} | CodeBegun`,
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
  const escd = body.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
  return `<div style="font-family:Arial,Helvetica,sans-serif;font-size:14px;line-height:1.6;color:#1f2937;white-space:pre-wrap">${escd}</div>`;
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
    .map(b => b.replace(/^\s+|\s+$/g, ''))
    .filter(Boolean)
    .map(block => {
      const lines = block.split('\n');
      const isList = lines.length > 0 && lines.every(l => /^\s*[•\-]\s+/.test(l));
      if (isList) {
        return `<ul style="margin:0 0 16px;padding-left:22px">${lines
          .map(l => `<li style="margin:6px 0;color:#334155;font-size:15px;line-height:1.55">${esc(l.replace(/^\s*[•\-]\s+/, ''))}</li>`)
          .join('')}</ul>`;
      }
      return `<p style="margin:0 0 15px;color:#334155;font-size:15px;line-height:1.65">${esc(block).replace(/\n/g, '<br>')}</p>`;
    })
    .join('');
}

/**
 * Render an outreach email as a polished, on-brand HTML message (CodeBegun logo
 * header + formatted body + signature + footer). Single column, inline CSS.
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
    const title = sl[1] || '';
    const rest = sl.slice(2);
    signatureHtml = `<div style="margin-top:24px;padding-top:16px;border-top:1px solid #eef2f7">
      <div style="color:#051D64;font-weight:700;font-size:15px">${esc(name)}</div>
      ${title ? `<div style="color:#334155;font-size:13px;font-weight:600;margin-top:1px">${esc(title)}</div>` : ''}
      ${rest.map(l => `<div style="color:#64748b;font-size:12.5px;line-height:1.6;margin-top:2px">${esc(l)}</div>`).join('')}
    </div>`;
  }

  const footerBits: string[] = [];
  if (opts.mailingAddress) footerBits.push(esc(opts.mailingAddress));
  if (opts.unsubscribeUrl) footerBits.push(`<a href="${opts.unsubscribeUrl}" style="color:#94a3b8">Unsubscribe</a>`);
  const footer = footerBits.length
    ? `<div style="padding:14px 28px;border-top:1px solid #e5e7eb;color:#94a3b8;font-size:11px;line-height:1.6">${footerBits.join(' &middot; ')}</div>`
    : '';

  const header = opts.logoUrl
    ? `<div style="background:#ffffff;padding:22px 28px 16px">
        <img src="${esc(opts.logoUrl)}" alt="CodeBegun" style="height:36px;display:block">
        <div style="color:#051D64;font-size:12.5px;font-weight:600;margin-top:9px">Java Full Stack Training &amp; Placements &middot; Hyderabad</div>
      </div>`
    : `<div style="background:#051D64;padding:22px 28px">
        <div style="color:#ffffff;font-size:21px;font-weight:800;letter-spacing:.3px;line-height:1">Code<span style="color:#5eb3c7">Begun</span></div>
        <div style="color:#93c5fd;font-size:12px;margin-top:5px">Java Full Stack Training &amp; Placements &middot; Hyderabad</div>
      </div>`;

  return `<div style="margin:0;padding:24px 12px;background:#f1f5f9;font-family:Arial,Helvetica,sans-serif">
  <div style="max-width:600px;margin:0 auto;background:#ffffff;border:1px solid #e5e7eb;border-radius:12px;overflow:hidden">
    ${header}
    <div style="height:3px;background:#359AAD"></div>
    <div style="padding:26px 28px 20px">
      ${messageHtml}${linksHtml}${signatureHtml}
    </div>
    ${footer}
  </div>
</div>`;
}
