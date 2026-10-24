/**
 * A person's display name. Accounts created without a last name store a "-" placeholder (the
 * schema requires one), which printed as "seenu -" everywhere. The placeholder is dropped, and
 * with no name at all the email stands in.
 */
export function personName(u: { firstName?: string | null; lastName?: string | null; email?: string | null } | null | undefined, fallback = 'Unnamed'): string {
  const clean = (v: unknown) => String(v ?? '').trim().replace(/^-+$/, '');
  const n = `${clean(u?.firstName)} ${clean(u?.lastName)}`.trim();
  return n || String(u?.email || fallback);
}
