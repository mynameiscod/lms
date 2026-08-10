/**
 * One definition of what an Indian mobile number is.
 *
 * There were three near-copies of this before: two identical `normalizePhone` helpers in
 * the public assessment and CareerPilot signup controllers, and a weaker
 * `replace(/[^\d]/g, '')` inline in the battle controller. That third one is why the same
 * person could register for a Tech Battle twice — typing `+91 97435 45311` stored
 * `919743545311` while `9743545311` stored ten digits, so the duplicate check compared two
 * different strings and found nothing.
 *
 * Any identity check on a phone number has to run on the SAME normalised form everywhere,
 * or it is not a check.
 */

/** Strip formatting and the country code, leaving the bare national number. */
export function normalizePhone(raw: unknown): string {
  let d = String(raw ?? '').replace(/[^\d]/g, '');
  if (d.length === 12 && d.startsWith('91')) d = d.slice(2);
  else if (d.length === 13 && d.startsWith('091')) d = d.slice(3);
  else if (d.length === 11 && d.startsWith('0')) d = d.slice(1);
  return d;
}

/** Indian mobile numbers are exactly ten digits and begin 6-9. */
export function isValidMobile(normalized: string): boolean {
  return /^[6-9]\d{9}$/.test(normalized);
}

/**
 * The message a member sees. Says what is wrong with the number they actually typed
 * rather than a generic "invalid mobile", because the common mistakes — pasting a number
 * with the country code, dropping a digit — are each fixable once named.
 */
export function mobileError(raw: unknown): string | null {
  const d = normalizePhone(raw);
  if (!d) return 'Mobile number is required.';
  if (d.length < 10) return `That is only ${d.length} digit${d.length === 1 ? '' : 's'}. Enter your 10-digit mobile number.`;
  if (d.length > 10) return `That is ${d.length} digits. Enter your 10-digit mobile number, without the country code.`;
  if (!isValidMobile(d)) return 'That does not look like a mobile number. It should start with 6, 7, 8 or 9.';
  return null;
}
