import axios from 'axios';
import * as settings from './settingsService';

/**
 * contactEnrichmentService — "Add by Company" for Placement Partnership.
 *
 * Given a company (name and/or domain), find likely outreach targets at that
 * company (HR / talent / hiring managers / decision-makers / founders) via the
 * Apollo.io People Search API. Returns contacts with confidence based on Apollo's
 * email verification status.
 *
 * The APOLLO_API_KEY is read per-tenant from settings (falls back to platform /
 * env). If unset, the feature degrades gracefully (configured:false) — nothing
 * is force-on, consistent with every other integration.
 *
 * Note: Apollo often returns "locked" emails (email_not_unlocked@…) unless the
 * account has revealed them (which uses Apollo credits). We surface such people
 * but omit the unusable email and mark low confidence.
 */

// Apollo's current API base is /api/v1 (the bare /v1 host rejects auth). Key goes
// in the X-Api-Key header — Apollo has deprecated passing it as a URL/body param.
const APOLLO_BASE = 'https://api.apollo.io/api/v1';

// Titles we care about for fresher/junior placement outreach.
const TARGET_TITLES = [
  'HR', 'Human Resources', 'HR Manager', 'Head of HR', 'HR Business Partner',
  'Talent Acquisition', 'Talent Acquisition Specialist', 'Recruiter', 'Technical Recruiter',
  'Hiring Manager', 'People Operations', 'Recruitment',
  'CEO', 'Founder', 'Co-Founder', 'CTO', 'VP Engineering', 'Engineering Manager', 'Director of Engineering',
];
const TARGET_SENIORITIES = ['owner', 'founder', 'c_suite', 'partner', 'vp', 'head', 'director', 'manager'];

export type Confidence = 'high' | 'medium' | 'low';

export interface EnrichedContact {
  name: string;
  title?: string;
  seniority?: string;
  email?: string;          // omitted when Apollo has it locked
  emailStatus?: string;    // apollo email_status
  linkedinUrl?: string;
  confidence: Confidence;
}

export interface CompanyInfo {
  name?: string;
  industry?: string;
  employees?: number;
  linkedinUrl?: string;
  logoUrl?: string;
  jobOpenings?: number;    // open-roles count, if Apollo exposes it on this plan
}
export interface HiringLinks {
  linkedinJobs: string;    // deep-link to the company's LinkedIn Jobs
  googleJobs: string;      // deep-link to Google Jobs for the company
}
export interface EnrichResult {
  configured: boolean;     // is APOLLO_API_KEY set?
  company: string;
  domain?: string;
  contacts: EnrichedContact[];
  companyInfo?: CompanyInfo;
  hiringLinks?: HiringLinks;   // constructed URLs — work with no Apollo API/plan
  note?: string;
}

const cleanDomain = (raw?: string): string | undefined => {
  const d = (raw || '').trim().replace(/^https?:\/\//i, '').replace(/\/.*$/, '').replace(/^www\./i, '');
  return d || undefined;
};
const isLocked = (email?: string | null): boolean => !email || /not_unlocked|no_?email/i.test(email);

async function apollo(path: string, key: string, body: Record<string, any>): Promise<any> {
  const res = await axios.post(
    `${APOLLO_BASE}${path}`,
    body,
    { headers: { 'Content-Type': 'application/json', accept: 'application/json', 'Cache-Control': 'no-cache', 'X-Api-Key': key }, timeout: 20000 },
  );
  return res.data;
}

/** Look up the company's org record (firmographics + domain) via Apollo. Best-effort. */
async function fetchOrg(key: string, q: { company?: string; domain?: string }): Promise<any | null> {
  try {
    const body: Record<string, any> = { page: 1, per_page: 1 };
    if (q.domain) body.q_organization_domains = q.domain;
    else if (q.company) body.q_organization_name = q.company;
    const data = await apollo('/mixed_companies/search', key, body);
    return data?.organizations?.[0] || data?.accounts?.[0] || null;
  } catch {
    return null;
  }
}

/** Read an open-roles count from an Apollo org record if the plan exposes one. */
function jobOpeningsOf(org: any): number | undefined {
  const v = org?.num_current_job_openings ?? org?.job_postings_count ?? (Array.isArray(org?.job_postings) ? org.job_postings.length : undefined);
  return typeof v === 'number' && v >= 0 ? v : undefined;
}

/** Deep-links to a company's live openings — plain constructed URLs, no API/plan needed. */
function buildHiringLinks(company: string, domain?: string): HiringLinks {
  const term = company || domain || '';
  return {
    linkedinJobs: `https://www.linkedin.com/jobs/search/?keywords=${encodeURIComponent(term)}`,
    googleJobs: `https://www.google.com/search?q=${encodeURIComponent(term + ' jobs')}&ibp=htl;jobs`,
  };
}

export async function enrichCompanyContacts(
  tenantId: string,
  input: { company?: string; domain?: string },
): Promise<EnrichResult> {
  const key = settings.getStr('APOLLO_API_KEY', '', tenantId);
  const company = (input.company || '').trim();
  let domain = cleanDomain(input.domain);

  if (!key) {
    return {
      configured: false, company, contacts: [],
      hiringLinks: (company || domain) ? buildHiringLinks(company, domain) : undefined,
      note: 'Apollo API key not set — contact discovery is off (the openings links below still work). Add the key in Platform Settings → Placement Outreach.',
    };
  }
  if (!company && !domain) {
    return { configured: true, company, contacts: [], note: 'Enter a company name or website domain.' };
  }

  // Company firmographics + domain (best-effort; needs a paid Apollo plan).
  const org = await fetchOrg(key, { company, domain });
  if (!domain) domain = cleanDomain(org?.primary_domain || org?.website_url) || domain;
  const companyInfo: CompanyInfo | undefined = org ? {
    name: org.name || company || undefined,
    industry: org.industry || undefined,
    employees: typeof org.estimated_num_employees === 'number' ? org.estimated_num_employees : undefined,
    linkedinUrl: org.linkedin_url || undefined,
    logoUrl: org.logo_url || undefined,
    jobOpenings: jobOpeningsOf(org),
  } : (company ? { name: company } : undefined);
  const hiringLinks = buildHiringLinks(company, domain);

  const body: Record<string, any> = { person_titles: TARGET_TITLES, person_seniorities: TARGET_SENIORITIES, page: 1, per_page: 10 };
  if (domain) body.q_organization_domains = domain;
  else body.q_keywords = company;

  let data: any;
  try {
    data = await apollo('/mixed_people/search', key, body);
  } catch (e: any) {
    const status = e?.response?.status;
    const apolloMsg = (e?.response?.data && (e.response.data.error || e.response.data.message)) || '';
    console.warn('[apollo] people search failed', status, apolloMsg || e?.message);
    let note: string;
    if (status === 401) {
      note = 'Apollo rejected the API key (invalid). Re-copy it from Apollo → Settings → API Keys into Platform Settings → Placement Outreach.';
    } else if (status === 403) {
      note = `Apollo denied access to People Search — this usually means your Apollo plan doesn't include API search access (a paid plan is typically required).${apolloMsg ? ` Apollo: ${apolloMsg}` : ''}`;
    } else if (status === 402) {
      note = 'Apollo says credits/payment are required for this request (free plans are limited).';
    } else if (status === 429) {
      note = 'Apollo rate limit hit — try again shortly.';
    } else {
      note = `Apollo request failed${status ? ` (${status})` : ''}.${apolloMsg ? ` Apollo: ${apolloMsg}` : ''}`;
    }
    return { configured: true, company, domain, contacts: [], companyInfo, hiringLinks, note };
  }

  const people: any[] = Array.isArray(data?.people) ? data.people : [];
  const contacts: EnrichedContact[] = people.map((p) => {
    const locked = isLocked(p.email);
    const emailStatus: string | undefined = p.email_status || undefined;
    const confidence: Confidence = !locked && emailStatus === 'verified' ? 'high' : (!locked ? 'medium' : 'low');
    return {
      name: p.name || [p.first_name, p.last_name].filter(Boolean).join(' ') || 'Unknown',
      title: p.title || undefined,
      seniority: p.seniority || undefined,
      email: locked ? undefined : p.email,
      emailStatus,
      linkedinUrl: p.linkedin_url || undefined,
      confidence,
    };
  })
    // Show contacts with a usable email first, then by confidence.
    .sort((a, b) => Number(!!b.email) - Number(!!a.email));

  const usable = contacts.filter((c) => c.email).length;
  const note = contacts.length === 0
    ? 'No matching contacts found for this company on Apollo.'
    : usable === 0
      ? 'Found people, but their emails are locked in Apollo (revealing them uses Apollo credits). Reveal in Apollo or add the email manually.'
      : undefined;

  return { configured: true, company, domain, contacts, companyInfo, hiringLinks, note };
}
