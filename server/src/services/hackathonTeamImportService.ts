/**
 * Reading a spreadsheet of teams, and deciding whether it can be imported.
 *
 * ── WHY THIS IS A SERVICE AND NOT TWO COPIES ──────────────────────────────────────────────
 *
 * There are two callers: a script, for when somebody with SSH is doing it, and an admin upload
 * screen, for when they are not. Both have to reach the same verdict on the same file. If the
 * screen accepted a sheet the script would refuse, the difference would only show up as teams
 * that exist and cannot sit the exam — so the parsing, the aliases and every rule live here
 * once and neither caller owns them.
 *
 * ── PARSE AND VALIDATE ARE SEPARATE FROM WRITING ──────────────────────────────────────────
 *
 * `readTeamSheet` never touches the database, which is what lets the upload screen show a
 * preview: the same call that would import returns exactly what it would do, and the operator
 * decides. A dry run that took a different path would be a preview of something else.
 */

import * as XLSX from 'xlsx';
import HackathonRegistration from '../models/HackathonRegistration';
import { newRegistrationCode, teamNameKeyOf, normalizeMobile } from './hackathonRegistrationService';

/** Header aliases, so a sheet written by a human still reads. */
const COLUMN: Record<string, string[]> = {
  team:    ['team', 'teamname', 'team name', 'teamtitle', 'team title'],
  member:  ['member', 'name', 'member name', 'membername', 'student', 'student name', 'fullname', 'full name'],
  mobile:  ['mobile', 'phone', 'mobile number', 'mobileno', 'mobile no', 'contact', 'contact number', 'whatsapp'],
  email:   ['email', 'email id', 'emailid', 'mail', 'e-mail'],
  college: ['college', 'institute', 'institution', 'school'],
};

const norm = (s: unknown) => String(s ?? '').trim().toLowerCase().replace(/[\s_-]+/g, ' ');

export interface SheetRow {
  line: number; team: string; member: string; mobile: string; email: string; college: string;
}
export interface TeamPlan {
  teamName: string; teamNameKey: string; college: string; members: SheetRow[];
  /** Set when a team of this name is already registered here — it is skipped, not an error. */
  alreadyImported?: boolean;
  registrationCode?: string;
}
export interface SheetReport {
  ok: boolean;
  sheetNames: string[];
  sheetUsed: string;
  columns: Record<string, string>;
  rowCount: number;
  teams: TeamPlan[];
  memberCount: number;
  problems: string[];
}

/**
 * Read and check a sheet. Pure: no writes, no side effects, safe to call for a preview.
 *
 * `hackathonId` is optional — without it the cross-team duplicate check against existing
 * registrations is skipped, which is right for "does this file make sense at all" and wrong for
 * "can I import it here". The upload screen always passes it.
 */
export async function readTeamSheet(
  buffer: Buffer,
  opts: { hackathonId?: string; defaultCollege?: string; sheet?: string } = {},
): Promise<SheetReport> {
  const problems: string[] = [];
  const wb = XLSX.read(buffer, { type: 'buffer' });
  const sheetUsed = opts.sheet && wb.Sheets[opts.sheet] ? opts.sheet : wb.SheetNames[0];
  const sheet = wb.Sheets[sheetUsed];

  const empty: SheetReport = {
    ok: false, sheetNames: wb.SheetNames, sheetUsed, columns: {},
    rowCount: 0, teams: [], memberCount: 0, problems,
  };
  if (!sheet) { problems.push('The file has no readable sheet.'); return empty; }

  const raw: any[] = XLSX.utils.sheet_to_json(sheet, { defval: '' });
  if (!raw.length) { problems.push('The sheet has no data rows — only a header, or nothing at all.'); return empty; }

  const headers = Object.keys(raw[0]);
  const columns: Record<string, string> = {};
  for (const [field, aliases] of Object.entries(COLUMN)) {
    const hit = headers.find(h => aliases.includes(norm(h)));
    if (hit) columns[field] = hit;
  }
  const missing = ['team', 'member', 'mobile'].filter(f => !columns[f]);
  if (missing.length) {
    problems.push(`No column found for: ${missing.join(', ')}. The sheet has: ${headers.join(' | ')}`);
    return { ...empty, columns, rowCount: raw.length };
  }

  const rows: SheetRow[] = raw.map((r, i) => ({
    line: i + 2,                                   // +2: one for the header row, one for 1-based
    team: String(r[columns.team] ?? '').trim(),
    member: String(r[columns.member] ?? '').trim(),
    mobile: normalizeMobile(r[columns.mobile]),
    email: String(columns.email ? r[columns.email] ?? '' : '').trim().toLowerCase(),
    college: String(columns.college ? r[columns.college] ?? '' : '').trim() || (opts.defaultCollege || ''),
  }));

  /* Mobiles carry the most weight: they are how a candidate signs in, and the database enforces
     one person per hackathon, so a duplicate inside the file would otherwise surface as an
     opaque write error partway through the import. */
  const seen = new Map<string, number>();
  for (const r of rows) {
    const at = `Row ${r.line}`;
    if (!r.team) problems.push(`${at}: no team name`);
    if (!r.member) problems.push(`${at}: no member name`);
    if (!r.mobile) problems.push(`${at}: no usable mobile number${r.member ? ` (${r.member})` : ''}`);
    else if (r.mobile.length !== 10) problems.push(`${at}: "${r.mobile}" is not a 10-digit mobile`);
    else if (seen.has(r.mobile)) problems.push(`${at}: ${r.mobile} is also on row ${seen.get(r.mobile)} — one person cannot be on two teams`);
    else seen.set(r.mobile, r.line);
    if (!r.college) problems.push(`${at}: no college, and no default given`);
  }

  const byTeam = new Map<string, SheetRow[]>();
  for (const r of rows) {
    const key = teamNameKeyOf(r.team);
    if (!byTeam.has(key)) byTeam.set(key, []);
    byTeam.get(key)!.push(r);
  }
  const teams: TeamPlan[] = [...byTeam.entries()].map(([teamNameKey, members]) => ({
    teamNameKey, teamName: members[0].team, college: members[0].college, members,
  }));

  /*
   * Against what is already registered here, two things look alike and are not.
   *
   * The same team name again is this file being re-imported — the normal way a cohort grows:
   * import, notice a team is missing, add rows, upload again. That is skipped. The same person
   * on a DIFFERENT team is a genuine conflict and stops the run.
   */
  if (opts.hackathonId && seen.size) {
    const existing = await HackathonRegistration.find({
      hackathonId: opts.hackathonId, memberMobiles: { $in: [...seen.keys()] },
    }).select('teamName teamNameKey memberMobiles registrationCode').lean() as any[];

    for (const e of existing) {
      const plan = teams.find(t => t.teamNameKey === String(e.teamNameKey));
      if (plan) { plan.alreadyImported = true; plan.registrationCode = e.registrationCode; continue; }
      const dupes = (e.memberMobiles || []).filter((m: string) => seen.has(m));
      problems.push(`${dupes.join(', ')} already registered here under a different team, "${e.teamName}"`);
    }
  }

  return {
    ok: problems.length === 0,
    sheetNames: wb.SheetNames, sheetUsed, columns,
    rowCount: rows.length, teams, memberCount: rows.length, problems,
  };
}

export interface ImportResult { created: number; skipped: number; codes: { team: string; code: string; existing: boolean }[] }

/** Write the teams a report found. Assumes the report is ok — callers check first. */
export async function writeTeams(
  tenantId: string, hackathonId: string, report: SheetReport,
): Promise<ImportResult> {
  const out: ImportResult = { created: 0, skipped: 0, codes: [] };

  for (const t of report.teams) {
    if (t.alreadyImported) {
      out.skipped++;
      out.codes.push({ team: t.teamName, code: t.registrationCode || '—', existing: true });
      continue;
    }
    const reg = await HackathonRegistration.create({
      tenantId, hackathonId,
      teamName: t.teamName, teamNameKey: t.teamNameKey, college: t.college,
      members: t.members.map(m => ({ name: m.member, mobile: m.mobile, email: m.email })),
      memberMobiles: t.members.map(m => m.mobile),
      memberEmails: t.members.map(m => m.email).filter(Boolean),
      registrationCode: newRegistrationCode(),
      status: 'confirmed',
      amountInr: 0,
    });
    out.created++;
    out.codes.push({ team: t.teamName, code: reg.registrationCode, existing: false });
  }
  return out;
}

/**
 * The blank sheet an admin downloads.
 *
 * Carries two example rows rather than headers alone: the commonest mistake is one row per TEAM
 * with names in one cell, and an example showing two rows sharing a team name prevents it more
 * reliably than an instruction would.
 */
export function templateWorkbook(): Buffer {
  const rows = [
    { Team: 'Alpha Coders', Member: 'Ravi Kumar', Mobile: '9876543210', Email: 'ravi@example.com', College: 'NEC' },
    { Team: 'Alpha Coders', Member: 'Priya S',    Mobile: '9876543211', Email: 'priya@example.com', College: 'NEC' },
    { Team: 'Beta Builders', Member: 'Sneha R',   Mobile: '9876543212', Email: 'sneha@example.com', College: 'NEC' },
  ];
  const ws = XLSX.utils.json_to_sheet(rows);
  ws['!cols'] = [{ wch: 22 }, { wch: 22 }, { wch: 14 }, { wch: 28 }, { wch: 18 }];
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, 'Teams');
  return XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' });
}
