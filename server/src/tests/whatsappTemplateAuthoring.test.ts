/**
 * Templates authored in the LMS, and fitting them to the places that send them.
 *
 * Meta rejects a send whose parameters do not match the template (error 132000) without saying
 * which part is wrong, and rejects a submission for rules its form enforces silently. Both are
 * checked here before anything reaches Meta, so these rules are pinned directly.
 */
import { templateShape, buildSendComponents } from '../services/whatsAppTemplateShape';
import { validateInput, checkCompatibility } from '../services/whatsAppTemplateService';
import { getPurpose } from '../config/whatsappTemplatePurposes';

const tpl = (over: any = {}) => ({
  name: 't', language: 'en', category: 'UTILITY', status: 'APPROVED',
  header: { format: 'NONE' }, body: 'Hi {{1}}, your exam {{2}} starts soon.', bodyExamples: ['Ravi', 'DSA'],
  buttons: [], ...over,
});

describe('template shape', () => {
  it('counts variables by the highest index and finds the dynamic url button wherever it sits', () => {
    const s = templateShape(tpl({
      buttons: [{ type: 'QUICK_REPLY', text: 'Stop' }, { type: 'URL', text: 'Open', url: 'https://x.com/e/{{1}}' }],
    }) as any);
    expect(s.bodyVarCount).toBe(2);
    expect(s.urlButtonIndex).toBe(1);
  });

  it('treats a static url button as no slot, and an OTP button as one', () => {
    expect(templateShape(tpl({ buttons: [{ type: 'URL', text: 'Site', url: 'https://x.com' }] }) as any).urlButtonIndex).toBe(-1);
    expect(templateShape(tpl({ category: 'AUTHENTICATION', buttons: [{ type: 'OTP', text: 'Copy code' }] }) as any).urlButtonIndex).toBe(0);
  });
});

describe('building a send to fit the template', () => {
  it('drops values the template has no variable for', () => {
    const c = buildSendComponents(tpl() as any, { body: ['Ravi', 'DSA', 'extra'] });
    expect(c).toEqual([{ type: 'body', parameters: [{ type: 'text', text: 'Ravi' }, { type: 'text', text: 'DSA' }] }]);
  });

  it('puts the url param on the dynamic button index, and omits it when there is no such button', () => {
    const withBtn = buildSendComponents(tpl({ buttons: [{ type: 'PHONE_NUMBER', text: 'Call' }, { type: 'URL', text: 'Go', url: 'https://x.com/{{1}}' }] }) as any,
      { body: ['a', 'b'], urlButtonParam: 'tok' });
    expect(withBtn[1]).toMatchObject({ type: 'button', index: '1', parameters: [{ text: 'tok' }] });
    const noBtn = buildSendComponents(tpl() as any, { body: ['a', 'b'], urlButtonParam: 'tok' });
    expect(noBtn.some((x) => x.type === 'button')).toBe(false);
  });

  it('uses the stored image for an image header when the caller has none, and never sends an empty body', () => {
    const c = buildSendComponents(tpl({ body: 'Welcome aboard!', header: { format: 'IMAGE', imageUrl: 'https://cdn/x.jpg' } }) as any, { body: ['ignored'] });
    expect(c).toEqual([{ type: 'header', parameters: [{ type: 'image', image: { link: 'https://cdn/x.jpg' } }] }]);
  });

  it('strips newlines that Meta rejects inside a variable', () => {
    const c = buildSendComponents(tpl({ body: 'Hello {{1}} there' }) as any, { body: ['Line\none'] });
    expect(c[0].parameters[0].text).toBe('Line one');
  });
});

describe('validating before submitting to Meta', () => {
  const base = { name: 'batch_reminder', language: 'en', category: 'UTILITY' as const, body: 'Hi {{1}}, class at {{2}} today.', bodyExamples: ['Ravi', '6 PM'] };

  it('accepts a well-formed template', () => {
    expect(validateInput(base)).toEqual([]);
  });

  it('rejects names Meta would reject, skipped variables, and missing samples', () => {
    expect(validateInput({ ...base, name: 'Batch Reminder' }).join(' ')).toMatch(/lowercase/);
    expect(validateInput({ ...base, body: 'Hi {{1}}, see {{3}} ok' , bodyExamples: ['a', 'b', 'c'] }).join(' ')).toMatch(/\{\{2\}\} is missing/);
    expect(validateInput({ ...base, bodyExamples: ['Ravi'] }).join(' ')).toMatch(/sample value for \{\{2\}\}/);
  });

  it('rejects a body that starts or ends with a variable', () => {
    expect(validateInput({ ...base, body: '{{1}} your class is today', bodyExamples: ['x'] }).length).toBeGreaterThan(0);
    expect(validateInput({ ...base, body: 'Your class is at {{1}}.', bodyExamples: ['x'] }).length).toBeGreaterThan(0);
  });

  it('only allows {{1}} at the end of a dynamic url, with an example', () => {
    const b = (url: string, urlExample?: string) => validateInput({ ...base, buttons: [{ type: 'URL', text: 'Open', url, urlExample }] });
    expect(b('https://x.com/e/{{1}}', 'https://x.com/e/abc')).toEqual([]);
    expect(b('https://x.com/{{1}}/e', 'https://x.com/a/e').length).toBeGreaterThan(0);
    expect(b('https://x.com/e/{{1}}').join(' ')).toMatch(/example URL/);
  });

  it('needs nothing but options for an authentication template', () => {
    expect(validateInput({ name: 'cb_otp', language: 'en', category: 'AUTHENTICATION', auth: { codeExpiryMinutes: 10 } })).toEqual([]);
  });
});

describe('fitting a template to a system use', () => {
  const invite = getPurpose('HACKATHON_EXAM_INVITE')!;

  it('refuses a template needing more values than the use provides', () => {
    const r = checkCompatibility(tpl({ body: 'a {{1}} b {{2}} c {{3}} d {{4}} e' }), invite);
    expect(r.ok).toBe(false);
    expect(r.errors.join(' ')).toMatch(/4 variables/);
  });

  it('allows fewer values, with a warning naming what is used', () => {
    const r = checkCompatibility(tpl({ body: 'Hi {{1}}, check your mail.' }), invite);
    expect(r.ok).toBe(true);
    expect(r.warnings.join(' ')).toMatch(/first 1 of 3/);
  });

  it('refuses unapproved templates and keeps OTP to authentication templates', () => {
    expect(checkCompatibility(tpl({ status: 'PENDING' }), invite).ok).toBe(false);
    expect(checkCompatibility(tpl(), getPurpose('OTP')!).ok).toBe(false);
    expect(checkCompatibility(tpl({ category: 'AUTHENTICATION', body: '*{{1}}* is your code.', buttons: [{ type: 'OTP', text: 'Copy code' }] }), getPurpose('OTP')!).ok).toBe(true);
  });

  it('refuses a dynamic button on a use with nothing to put in it', () => {
    const r = checkCompatibility(tpl({ body: 'Hi {{1}}, welcome to us.', buttons: [{ type: 'URL', text: 'Go', url: 'https://x.com/{{1}}' }] }), getPurpose('LEAD_WELCOME')!);
    expect(r.ok).toBe(false);
  });
});
