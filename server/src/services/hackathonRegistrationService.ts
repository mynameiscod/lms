import crypto from 'crypto';
import HackathonRegistration, {
  IHackathonMember, IHackathonRegistration, PENDING_TTL_MINUTES,
} from '../models/HackathonRegistration';
import { IHackathon } from '../models/Hackathon';

/**
 * Turning a public form post into a team, or refusing it with a reason.
 *
 * EVERY RULE IS CHECKED HERE, SERVER-SIDE, AND NOTHING IS TRUSTED FROM THE BODY. The form
 * lives on codebegun.com, a different origin we do not deploy: its validation is a courtesy
 * to the person typing, never a control. Team size, the fee, the college list, the window
 * and the capacity are all read off the Hackathon document.
 *
 * REFUSALS ARE WRITTEN FOR THE STUDENT. "Invalid payload" tells someone standing in a
 * corridor with a phone nothing they can act on; "Rahul's mobile number is already
 * registered with another team" tells them exactly what to fix.
 */

export interface RegistrationInput {
  teamName?: unknown;
  college?: unknown;
  members?: unknown;
}

export interface ValidationFailure { field: string; message: string }

export interface ValidatedTeam {
  teamName: string;
  teamNameKey: string;
  college: string;
  collegeIsOther: boolean;
  members: IHackathonMember[];
  memberMobiles: string[];
  memberEmails: string[];
}

const str = (v: unknown): string => String(v ?? '').trim();
const collapse = (v: string): string => v.replace(/\s+/g, ' ');

/** Last ten digits — how an Indian mobile is identified however it was typed. */
export const normalizeMobile = (v: unknown): string => str(v).replace(/\D/g, '').slice(-10);
const isMobile = (v: string): boolean => /^[6-9]\d{9}$/.test(v);
const isEmail = (v: string): boolean => /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(v);

export const teamNameKeyOf = (name: string): string => collapse(str(name)).toLowerCase();

/**
 * A short code the team can quote, and that a confirmation link can carry.
 *
 * Crockford-ish alphabet: no O/0, no I/1/L, because this gets read aloud at a registration
 * desk and written down wrong. Randomly generated rather than sequential so it does not
 * disclose how many teams have registered.
 */
export function newRegistrationCode(): string {
  const alphabet = 'ABCDEFGHJKMNPQRSTUVWXYZ23456789';
  const bytes = crypto.randomBytes(8);
  let out = '';
  for (let i = 0; i < 8; i++) out += alphabet[bytes[i] % alphabet.length];
  return `HK-${out.slice(0, 4)}-${out.slice(4)}`;
}

/** Is the event currently taking registrations, and if not, why not? */
export function registrationWindowError(h: IHackathon, now = new Date()): string | null {
  if (h.status !== 'published') return 'Registrations are not open for this hackathon.';
  if (h.registerOpensAt && now < new Date(h.registerOpensAt)) {
    return `Registrations open on ${new Date(h.registerOpensAt).toLocaleString('en-IN', { dateStyle: 'medium', timeStyle: 'short' })}.`;
  }
  if (h.registerClosesAt && now > new Date(h.registerClosesAt)) return 'Registrations for this hackathon have closed.';
  // A hackathon that has already started is not something to sell a place in.
  if (h.endAt && now > new Date(h.endAt)) return 'This hackathon has already finished.';
  return null;
}

/**
 * Validate the team itself — shape, sizes, and the duplicates a team can create on its own.
 *
 * Within-team duplicates are checked here and not left to the index: a unique multikey index
 * de-duplicates the entries of a SINGLE document, so one team listing the same number twice
 * would sail past it and register five people as six.
 */
export function validateTeam(input: RegistrationInput, h: IHackathon): { team?: ValidatedTeam; errors: ValidationFailure[] } {
  const errors: ValidationFailure[] = [];

  const teamName = collapse(str(input.teamName));
  if (!teamName) errors.push({ field: 'teamName', message: 'Give your team a name.' });
  else if (teamName.length > 60) errors.push({ field: 'teamName', message: 'Team name must be 60 characters or fewer.' });

  // ── College ──
  const college = collapse(str(input.college));
  let collegeIsOther = false;
  if (!college) {
    errors.push({ field: 'college', message: 'Choose your college.' });
  } else if (h.colleges?.length) {
    const known = h.colleges.some(c => c.trim().toLowerCase() === college.toLowerCase());
    if (!known) {
      if (!h.allowOtherCollege) {
        errors.push({ field: 'college', message: 'Choose your college from the list.' });
      } else {
        collegeIsOther = true;
      }
    }
  } else {
    // No list configured — anything typed is "other" by definition.
    collegeIsOther = true;
  }

  // ── Members ──
  const raw = Array.isArray(input.members) ? input.members : [];
  const min = h.minTeamSize, max = h.maxTeamSize;
  if (raw.length < min || raw.length > max) {
    errors.push({
      field: 'members',
      message: `A team must have between ${min} and ${max} members, including the team lead. You have sent ${raw.length}.`,
    });
  }

  const members: IHackathonMember[] = [];
  const mobiles: string[] = [];
  const emails: string[] = [];

  raw.slice(0, max).forEach((m: any, i: number) => {
    const who = i === 0 ? 'Team lead' : `Member ${i + 1}`;
    const name = collapse(str(m?.name));
    const mobile = normalizeMobile(m?.mobile);
    const email = str(m?.email).toLowerCase();

    if (!name) errors.push({ field: `members[${i}].name`, message: `${who}: enter a name.` });
    if (!isMobile(mobile)) errors.push({ field: `members[${i}].mobile`, message: `${who}: enter a valid 10-digit mobile number.` });

    /**
     * The LEAD must have an email; the rest need one only if they give one.
     *
     * The confirmation, the payment receipt and anything sent later all go to the lead, so
     * without their address a paid team has no way to be reached. Demanding six working
     * addresses at a registration desk, on the other hand, is how a team gives up.
     */
    if (i === 0) {
      if (!isEmail(email)) errors.push({ field: 'members[0].email', message: 'Team lead: enter a valid email address — the confirmation goes there.' });
    } else if (email && !isEmail(email)) {
      errors.push({ field: `members[${i}].email`, message: `${who}: that email address does not look valid.` });
    }

    if (mobile && mobiles.includes(mobile)) {
      errors.push({ field: `members[${i}].mobile`, message: `${who}: this mobile number is already used by someone else in your team.` });
    }
    if (email && emails.includes(email)) {
      errors.push({ field: `members[${i}].email`, message: `${who}: this email is already used by someone else in your team.` });
    }

    if (mobile) mobiles.push(mobile);
    if (email) emails.push(email);
    members.push({ name, mobile, email, isLead: i === 0 });
  });

  if (errors.length) return { errors };

  return {
    errors: [],
    team: {
      teamName,
      teamNameKey: teamNameKeyOf(teamName),
      college,
      collegeIsOther,
      members,
      memberMobiles: mobiles,
      memberEmails: emails,
    },
  };
}

/** Registrations that currently hold a place: confirmed, or pending and not yet expired. */
export function holdingFilter(hackathonId: any, now = new Date()) {
  const pendingCutoff = new Date(now.getTime() - PENDING_TTL_MINUTES * 60_000);
  return {
    hackathonId,
    $or: [
      { status: 'confirmed' },
      { status: 'pending_payment', createdAt: { $gte: pendingCutoff } },
    ],
  };
}

/**
 * Is anything in this team already taken?
 *
 * Deliberately a READ, and deliberately not the guarantee — the unique indexes are that.
 * This exists so a student is told before they pay, rather than after. See the index comment
 * in the model for why both halves are needed.
 */
export async function findConflicts(
  hackathonId: any, team: ValidatedTeam, now = new Date(),
): Promise<ValidationFailure[]> {
  const base = holdingFilter(hackathonId, now);
  const clashes = await HackathonRegistration.find({
    ...base,
    $and: [{
      $or: [
        { teamNameKey: team.teamNameKey },
        { memberMobiles: { $in: team.memberMobiles } },
        { memberEmails: team.memberEmails.length ? { $in: team.memberEmails } : { $in: [' never'] } },
      ],
    }],
  }).select('teamName teamNameKey memberMobiles memberEmails').lean() as any[];

  if (!clashes.length) return [];

  const errors: ValidationFailure[] = [];
  if (clashes.some(c => c.teamNameKey === team.teamNameKey)) {
    errors.push({ field: 'teamName', message: 'A team with this name is already registered. Please pick another name.' });
  }

  team.members.forEach((m, i) => {
    const who = i === 0 ? 'Team lead' : `Member ${i + 1}`;
    if (m.mobile && clashes.some(c => (c.memberMobiles || []).includes(m.mobile))) {
      errors.push({ field: `members[${i}].mobile`, message: `${who}: this mobile number is already registered with another team for this hackathon.` });
    }
    if (m.email && clashes.some(c => (c.memberEmails || []).includes(m.email))) {
      errors.push({ field: `members[${i}].email`, message: `${who}: this email is already registered with another team for this hackathon.` });
    }
  });

  // A clash we matched on but could not attribute to a field — never return "no reason".
  return errors.length ? errors : [{ field: 'teamName', message: 'Someone in this team is already registered for this hackathon.' }];
}

/** Confirmed teams only — a pending registration has not bought a place. */
export const confirmedTeamCount = (hackathonId: any) =>
  HackathonRegistration.countDocuments({ hackathonId, status: 'confirmed' });

/** MongoDB's duplicate-key error, however the driver wrapped it. */
export const isDuplicateKey = (e: any): boolean =>
  e?.code === 11000 || e?.cause?.code === 11000 || /E11000/.test(String(e?.message || ''));

/** What the team is shown about itself. Never another team's contact details. */
export const publicRegistration = (r: IHackathonRegistration | any) => ({
  registrationCode: r.registrationCode,
  teamName: r.teamName,
  college: r.college,
  status: r.status,
  amountInr: r.amountInr,
  teamSize: (r.members || []).length,
  members: (r.members || []).map((m: IHackathonMember) => ({ name: m.name, isLead: m.isLead })),
  confirmedAt: r.confirmedAt || null,
  createdAt: r.createdAt,
});
