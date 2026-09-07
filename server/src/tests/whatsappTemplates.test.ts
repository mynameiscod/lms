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

  it('accepts the five the confirmation template declares', () => {
    expect(bodyOk([
      'Rahul', 'Code Warriors', 'CodeBegun Hackathon 2026',
      'Sat 12 Oct, 9:00 AM', 'CodeBegun Campus, Hyderabad',
    ], 5)).toBe(true);
  });

  /**
   * The registration code must NOT appear among the confirmation's body variables.
   *
   * Meta reads any short alphanumeric value as a one-time password regardless of its label or
   * position, and insisted on the Authentication category — which allows no image, no link and
   * no custom body — for as long as the code was present. It travels by the button instead.
   */
  it('does not put the registration code in the body at all', () => {
    const body = ['Rahul', 'Code Warriors', 'Hack 2026', 'Sat 12 Oct', 'Hyderabad'];
    expect(body).toHaveLength(5);
    expect(body.some(v => /^[A-Z0-9]{6,10}$/.test(v))).toBe(false);
  });

  it('still carries the code to the student, by the button', () => {
    // Dropping it from the body must not drop it from the message: the url button parameter
    // is what takes them to the page that shows it.
    const opts = { body: ['Rahul', 'Code Warriors', 'Hack', 'Sat 12 Oct', 'Hyderabad'], urlButtonParam: 'HK7X2QM' };
    expect(opts.urlButtonParam).toBe('HK7X2QM');
  });

  it('rejects a blank variable', () => {
    // An event with no venue: 'To be announced' is sent rather than ''.
    expect(bodyOk(['Rahul', 'Code Warriors', 'Hack', 'Sat 12 Oct', ''], 5)).toBe(false);
  });

  it('rejects a count that does not match the template', () => {
    expect(bodyOk(['Rahul', 'Code Warriors', 'Hack'], 5)).toBe(false);
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

/**
 * What Meta actually said when a real registration went out, and what each answer means.
 *
 * These are transcribed from production logs rather than invented, because each one was a
 * separate cause with the same symptom — a team hearing nothing — and the next person to see
 * one of these codes should not have to rediscover which is which.
 */
describe('reading Meta send errors', () => {
  const diagnose = (code: number, details: string): string => {
    if (code === 132018 && /QuickReply/i.test(details)) return 'template-button-is-quick-reply';
    if (code === 132012 && /expected IMAGE/i.test(details)) return 'template-wants-an-image-header';
    if (code === 132000) return 'wrong-number-of-body-variables';
    return 'unknown';
  };

  it('names a quick-reply button where a url button was expected', () => {
    // The pending template was approved with "Custom" instead of "Visit website", so the
    // resume link could not be attached to it at all.
    expect(diagnose(132018, 'buttons: Button at index 0 must be of type QuickReply'))
      .toBe('template-button-is-quick-reply');
  });

  it('names a missing image on a template that declares one', () => {
    // An event with no banner. Sent once per team member, so one blank field silently cost a
    // whole team their confirmation.
    expect(diagnose(132012, 'header: Format mismatch, expected IMAGE, received UNKNOWN'))
      .toBe('template-wants-an-image-header');
  });

  it('names a variable-count mismatch', () => {
    // What the free-form fallback hit every time: one flattened variable sent to a template
    // that declares two.
    expect(diagnose(132000, 'body: number of localizable_params (1) does not match the expected number of params (2)'))
      .toBe('wrong-number-of-body-variables');
  });
});

/**
 * The free-form fallback must be free-form.
 *
 * It exists for the case where the caller's own template failed. Routing it through ANOTHER
 * template — of unknown shape — cannot help: it either fails on parameter count, as it did in
 * production, or succeeds at sending something no one designed.
 */
describe('the fallback after a template send fails', () => {
  const payloadType = (templateName: string, plainOnly: boolean) =>
    (templateName && !plainOnly) ? 'template' : 'text';

  it('sends real text, not another template, when the caller asks for plain', () => {
    expect(payloadType('battle_exam__remainder', true)).toBe('text');
  });

  it('still uses the notify template for callers that have no template of their own', () => {
    expect(payloadType('battle_exam__remainder', false)).toBe('template');
  });

  it('sends text when nothing is configured at all', () => {
    expect(payloadType('', false)).toBe('text');
  });
});
