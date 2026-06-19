import { IPlacementPartner } from '../models/PlacementPartner';

/**
 * Outreach copy. Cold email is matched to the company's tier; the vouch email
 * is a personal trust-point draft (always held for approval). Tokens are filled
 * from the partner record; `senderName` comes from settings.
 */

export interface Draft { subject: string; body: string; }

const firstName = (full?: string) => (full || '').trim().split(/\s+/)[0] || 'there';

const SIGNATURE = (sender: string) =>
  `\n\nWarm regards,\n${sender}\nCodeBegun — Java Full Stack Training & Placements, Hyderabad`;

// ── First cold email, per tier ────────────────────────────────────────────────
export function coldEmail(p: IPlacementPartner, senderName: string): Draft {
  const fn = firstName(p.contactName);
  const company = p.companyName;
  const angle = p.outreachAngle?.trim();

  if (p.tier === 'tier1') {
    return {
      subject: `Pre-screened Java full-stack freshers for ${company}`,
      body:
`Hi ${fn},

I lead placements at CodeBegun, a Hyderabad-based Java Full Stack training institute. We graduate job-ready freshers who've already built real projects and cleared a structured screening (DSA, Spring Boot, React, SQL and a live coding round).

${angle ? `I'm reaching out specifically because ${angle}.\n\n` : ''}For a team like ${company}'s, I'd only put forward candidates who clear our internal bar — so you'd review a shortlist, not a pile of resumes. Would you be open to a quick look at 2–3 profiles that fit your stack?

If helpful, I can share their project work and a short technical summary.${SIGNATURE(senderName)}`,
    };
  }

  if (p.tier === 'tier2') {
    return {
      subject: `Job-ready Java/React freshers for ${company}`,
      body:
`Hi ${fn},

I'm with CodeBegun, a Java Full Stack training institute in Hyderabad. We train freshers on Spring Boot, React, SQL and DSA, with real projects and mock interviews before they graduate.

${angle ? `${angle.charAt(0).toUpperCase() + angle.slice(1)} — which is why I thought of ${company}.\n\n` : ''}If you have fresher or junior openings, I'd be glad to send 2–3 matched profiles you can interview directly. No cost to evaluate.

Open to it?${SIGNATURE(senderName)}`,
    };
  }

  // tier3 — direct & fast
  return {
    subject: `Freshers ready to interview for ${company}`,
    body:
`Hi ${fn},

Quick one — I run placements at CodeBegun (Java Full Stack training, Hyderabad). I have trained freshers ready to interview now: Java, Spring Boot, React, SQL.

${angle ? `${angle}.\n\n` : ''}Want me to send a couple of profiles that match your openings? You can interview them directly.${SIGNATURE(senderName)}`,
  };
}

// ── Polite follow-up bumps (auto-sent if no reply), step 1..N ─────────────────
export function followupEmail(p: IPlacementPartner, step: number, senderName: string): Draft {
  const fn = firstName(p.contactName);
  const company = p.companyName;
  if (step <= 1) {
    return {
      subject: `Re: Freshers for ${company}`,
      body:
`Hi ${fn},

Just floating this back to the top of your inbox — I know hiring inboxes get busy.

If fresher/junior hiring is on the cards at ${company}, I'd be happy to send a couple of matched profiles you can interview directly. No commitment to evaluate.

Worth a quick look?${SIGNATURE(senderName)}`,
    };
  }
  if (step === 2) {
    return {
      subject: `Re: Freshers for ${company}`,
      body:
`Hi ${fn},

One more nudge — and then I'll get out of your inbox :)

If now isn't the right time, even a quick "not now" helps me know whether to check back next quarter. And if it is, I can share 2–3 strong profiles today.${SIGNATURE(senderName)}`,
    };
  }
  // Final, graceful close
  return {
    subject: `Closing the loop — ${company}`,
    body:
`Hi ${fn},

I'll assume the timing isn't right for now, so I won't keep emailing.

If you ever need job-ready Java/React freshers, just reply to this and I'll send profiles the same day. Wishing you and the ${company} team a great quarter.${SIGNATURE(senderName)}`,
  };
}

// ── Personal vouch (trust point — always drafted, approved before send) ────────
export function vouchEmail(p: IPlacementPartner, senderName: string): Draft {
  const fn = firstName(p.contactName);
  return {
    subject: `A quick personal note — ${p.companyName}`,
    body:
`Hi ${fn},

I wanted to reach out personally rather than send another generic mail.

I've worked closely with the freshers we train at CodeBegun, and a few of them stand out — not just on skills, but on attitude and how fast they pick things up. I'd genuinely vouch for them in an interview setting.

If you're open to it, I'd love to introduce 1–2 of them to ${p.companyName}. I'm confident they'd be worth your team's time.

Happy to jump on a 10-minute call whenever suits you.${SIGNATURE(senderName)}`,
  };
}

/** Minimal HTML wrapper so the plain-text body renders cleanly in email clients. */
export function toHtml(body: string): string {
  const esc = body.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
  return `<div style="font-family:Arial,Helvetica,sans-serif;font-size:14px;line-height:1.6;color:#1f2937;white-space:pre-wrap">${esc}</div>`;
}
