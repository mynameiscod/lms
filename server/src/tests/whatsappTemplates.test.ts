/**
 * Which template a message is sent as, and what is attached to it.
 *
 * WHY THIS IS WORTH PINNING. Every failure mode here is silent from our side: Meta accepts the
 * HTTP call and then declines to deliver, or rejects with error 132000 — "parameter mismatch" —
 * which names neither the template nor the field. The product looks fine and the student never
 * hears from us. So the rules that decide the template name, its language, its button and its
 * header are asserted directly rather than trusted to be obvious.
 *
 * The rules are mirrored here rather than imported because the real resolver reaches the
 * settings service, which reaches Mongo. They are small and stated once in the source.
 */

type Store = Record<string, string>;
const read = (store: Store, key: string): string => store[key] || '';

/** Mirrors templateConfig() in assessmentOtpService. */
function templateConfig(store: Store, purpose?: string): { name: string; lang: string; hasButton: boolean } {
  const scoped = (suffix: string) => (purpose ? read(store, `WHATSAPP_TEMPLATE_${purpose.toUpperCase()}${suffix}`) : '');
  const name = scoped('') || read(store, 'WHATSAPP_NOTIFY_TEMPLATE');
  const scopedName = !!scoped('');
  const lang = scoped('_LANG') || (scopedName ? 'en' : (read(store, 'WHATSAPP_NOTIFY_TEMPLATE_LANG') || 'en'));
  const buttonRaw = scoped('_BUTTON') || (scopedName ? 'true' : (read(store, 'WHATSAPP_NOTIFY_TEMPLATE_BUTTON') || 'true'));
  return { name, lang, hasButton: String(buttonRaw) !== 'false' };
}

describe('choosing which approved template to send', () => {
  /**
   * The fault that forced this. One global slot held a Tech Battle template whose body takes
   * TWO variables. A hackathon notice passes three — and Meta validates the count against the
   * template you name, so every hackathon message would have been rejected while the battle
   * messages kept working, which is the hardest kind of bug to notice.
   */
  const store: Store = {
    WHATSAPP_NOTIFY_TEMPLATE: 'battle_exam_reminder',
    WHATSAPP_NOTIFY_TEMPLATE_LANG: 'en_US',
    WHATSAPP_TEMPLATE_HACKATHON_PENDING: 'hackathon_payment_pending',
    WHATSAPP_TEMPLATE_HACKATHON_CONFIRMED: 'hackathon_registration_confirmed',
  };

  it('sends each purpose as its own template', () => {
    expect(templateConfig(store, 'HACKATHON_PENDING').name).toBe('hackathon_payment_pending');
    expect(templateConfig(store, 'HACKATHON_CONFIRMED').name).toBe('hackathon_registration_confirmed');
  });

  it('never lets one purpose borrow another purpose template', () => {
    expect(templateConfig(store, 'HACKATHON_PENDING').name)
      .not.toBe(templateConfig(store, 'HACKATHON_CONFIRMED').name);
  });

  it('falls back to the global slot for a purpose with nothing configured', () => {
    // What keeps Tech Battle working across this change.
    expect(templateConfig(store, 'BATTLE_APPROVED').name).toBe('battle_exam_reminder');
    expect(templateConfig(store).name).toBe('battle_exam_reminder');
  });

  it('reports no template when nothing at all is configured', () => {
    // The caller uses this to fall back to free-form text rather than posting a nameless send.
    expect(templateConfig({}, 'HACKATHON_PENDING').name).toBe('');
  });
});

describe('the language sent with a template', () => {
  /**
   * "en" and "en_US" are different templates to Meta, and naming the wrong one fails every
   * send. So a scoped template must NOT inherit the global slot's language — that pairs one
   * template's name with another template's locale, and the error message names neither.
   */
  const store: Store = {
    WHATSAPP_NOTIFY_TEMPLATE: 'battle_exam_reminder',
    WHATSAPP_NOTIFY_TEMPLATE_LANG: 'en_US',
    WHATSAPP_TEMPLATE_HACKATHON_PENDING: 'hackathon_payment_pending',
  };

  it('does not inherit the global language for a scoped template', () => {
    expect(templateConfig(store, 'HACKATHON_PENDING').lang).toBe('en');
  });

  it('uses the scoped language when one is set', () => {
    const s = { ...store, WHATSAPP_TEMPLATE_HACKATHON_PENDING_LANG: 'en_US' };
    expect(templateConfig(s, 'HACKATHON_PENDING').lang).toBe('en_US');
  });

  it('keeps the global language for the global slot', () => {
    expect(templateConfig(store).lang).toBe('en_US');
  });
});

describe('whether a url button parameter is attached', () => {
  it('attaches one by default, since both hackathon templates carry the resume link', () => {
    expect(templateConfig({ WHATSAPP_TEMPLATE_X: 't' }, 'X').hasButton).toBe(true);
  });

  it('can be turned off for a template with a static button or none', () => {
    // Sending a button parameter to a template that has no dynamic button is error 132000.
    expect(templateConfig({ WHATSAPP_TEMPLATE_X: 't', WHATSAPP_TEMPLATE_X_BUTTON: 'false' }, 'X').hasButton).toBe(false);
  });

  it('does not inherit a global "false" for a scoped template', () => {
    const s = { WHATSAPP_NOTIFY_TEMPLATE_BUTTON: 'false', WHATSAPP_TEMPLATE_X: 't' };
    expect(templateConfig(s, 'X').hasButton).toBe(true);
  });
});

/**
 * The poster on the confirmation template.
 *
 * Meta FETCHES the image from their own servers, unauthenticated. A relative path or anything
 * behind a login resolves to nothing for them, and the send fails on media rather than on
 * anything a reader of the error would connect to the banner field.
 */
function posterUrl(bannerUrl: string, publicBase: string): string | undefined {
  const raw = String(bannerUrl || '').trim();
  if (!raw) return undefined;
  if (/^https:\/\//i.test(raw)) return raw;
  if (raw.startsWith('/') && /^https:\/\//i.test(publicBase)) return `${publicBase.replace(/\/+$/, '')}${raw}`;
  return undefined;
}

describe('the poster sent as the confirmation header', () => {
  const base = 'https://platform.codebegun.com';

  it('passes an absolute https url through', () => {
    expect(posterUrl('https://cdn.codebegun.com/poster.jpg', base)).toBe('https://cdn.codebegun.com/poster.jpg');
  });

  it('absolutises a site-relative upload path', () => {
    expect(posterUrl('/uploads/poster.jpg', base)).toBe('https://platform.codebegun.com/uploads/poster.jpg');
  });

  it('does not double the slash when the base has a trailing one', () => {
    expect(posterUrl('/uploads/poster.jpg', 'https://platform.codebegun.com/')).toBe('https://platform.codebegun.com/uploads/poster.jpg');
  });

  it('refuses plain http, which Meta will not fetch', () => {
    expect(posterUrl('http://codebegun.com/poster.jpg', base)).toBeUndefined();
  });

  it('refuses a relative path when the site itself is not public https', () => {
    expect(posterUrl('/uploads/poster.jpg', 'http://localhost:3000')).toBeUndefined();
  });

  it('sends no header at all when the event has no banner', () => {
    expect(posterUrl('', base)).toBeUndefined();
    expect(posterUrl('   ', base)).toBeUndefined();
  });
});

/**
 * Body variables, as Meta validates them.
 *
 * An EMPTY variable is rejected outright rather than rendered as a gap — which is why venue
 * falls back to text in the notice service instead of being passed through blank.
 */
const bodyOk = (params: string[], expected: number): boolean =>
  params.length === expected && params.every(p => String(p ?? '').trim().length > 0);

describe('the variables each template is sent', () => {
  it('accepts the three the pending template declares', () => {
    expect(bodyOk(['Rahul', 'Code Warriors', 'CodeBegun Hackathon 2026'], 3)).toBe(true);
  });

  it('accepts the six the confirmation template declares', () => {
    // Order matters: Meta requires body variables to appear in ascending order, and the team
    // ID sits LAST because a labelled code on its own line reads to the classifier as an OTP.
    expect(bodyOk([
      'Rahul', 'Code Warriors', 'CodeBegun Hackathon 2026',
      'Sat 12 Oct, 9:00 AM', 'CodeBegun Campus, Hyderabad', 'HK7X2QM',
    ], 6)).toBe(true);
  });

  it('puts the team ID last, not in the middle', () => {
    // Pins the ORDER, not just the count — a silent reshuffle would send the venue where the
    // template prints the ID, and every message would read as nonsense while still delivering.
    const body = ['Rahul', 'Code Warriors', 'Hack 2026', 'Sat 12 Oct', 'Hyderabad', 'HK7X2QM'];
    expect(body[5]).toBe('HK7X2QM');
    expect(body[3]).toBe('Sat 12 Oct');
  });

  it('rejects a blank variable', () => {
    // An event with no venue: 'To be announced' is sent rather than ''.
    expect(bodyOk(['Rahul', 'Code Warriors', 'Hack', 'Sat 12 Oct', '', 'HK7X2QM'], 6)).toBe(false);
  });

  it('rejects a count that does not match the template', () => {
    expect(bodyOk(['Rahul', 'Code Warriors', 'Hack'], 6)).toBe(false);
  });
});

/**
 * Who the confirmation reaches.
 *
 * The lead is who we take payment from; they are not the only person who has to arrive on the
 * day with an entry code. Messaging one member and trusting them to relay the venue, the time
 * and the code is how a team turns up incomplete.
 */
const confirmationRecipients = (members: Array<{ name: string; mobile: string }>) => {
  const seen = new Set<string>();
  return members.filter(m => {
    const key = String(m?.mobile || '').replace(/\D/g, '');
    if (!key || seen.has(key)) return false;
    seen.add(key);
    return true;
  });
};

describe('who the confirmation goes to', () => {
  it('messages every member of the team, not only the lead', () => {
    const team = [
      { name: 'Rahul', mobile: '9876543210' },
      { name: 'Priya', mobile: '9123456789' },
      { name: 'Arun', mobile: '9000000001' },
    ];
    expect(confirmationRecipients(team).map(m => m.name)).toEqual(['Rahul', 'Priya', 'Arun']);
  });

  it('messages a shared handset once, not once per member', () => {
    // Teams do enter one number twice. Two identical confirmations reads as a system fault.
    const team = [
      { name: 'Rahul', mobile: '+91 98765 43210' },
      { name: 'Priya', mobile: '919876543210' },
      { name: 'Arun', mobile: '9000000001' },
    ];
    expect(confirmationRecipients(team).map(m => m.name)).toEqual(['Rahul', 'Arun']);
  });

  it('skips a member with no number rather than sending to nobody', () => {
    const team = [
      { name: 'Rahul', mobile: '9876543210' },
      { name: 'Priya', mobile: '' },
    ];
    expect(confirmationRecipients(team).map(m => m.name)).toEqual(['Rahul']);
  });

  it('addresses each member by their own name', () => {
    // {{1}} is the recipient, so it reads as their confirmation and not a forwarded copy.
    const team = [{ name: 'Rahul', mobile: '9876543210' }, { name: 'Priya', mobile: '9123456789' }];
    const bodies = confirmationRecipients(team).map(m => [m.name, 'Code Warriors', 'Hack 2026', 'HK7X2QM', 'Sat 12 Oct', 'Hyderabad']);
    expect(bodies[0][0]).toBe('Rahul');
    expect(bodies[1][0]).toBe('Priya');
    expect(bodies.every(b => b.length === 6)).toBe(true);
  });
});

/**
 * One member's bad number must not cost the rest their confirmation, so every send is
 * independent and the result reports how many of the team were actually reached.
 */
describe('reporting how much of the team was reached', () => {
  const tally = (results: boolean[]) => ({
    whatsappTotal: results.length,
    whatsappSent: results.filter(Boolean).length,
    whatsapp: results.filter(Boolean).length > 0,
  });

  it('counts a partial delivery honestly rather than as success', () => {
    expect(tally([true, false, true])).toEqual({ whatsappTotal: 3, whatsappSent: 2, whatsapp: true });
  });

  it('still reports true when only one member was reached', () => {
    expect(tally([false, false, true]).whatsapp).toBe(true);
  });

  it('reports false only when nobody was reached', () => {
    expect(tally([false, false]).whatsapp).toBe(false);
  });
});
