import React from 'react';
import { useParams } from 'react-router-dom';
import CompanyDetail from './CompanyDetail';
import Opportunities from './Opportunities';
import SectionLock from './SectionLock';
import { useMember } from './MemberLayout';

/**
 * Career opportunities and company-prep detail share one CodeBegun member surface.
 *
 * ── THE LOCK LIVES HERE, NOT IN EITHER CHILD ──────────────────────────────────────────────
 *
 * `companies` has been a paid section the whole time — the server names it in `locked` and
 * `listCompanies` answers a non-member with `{ locked: true }` and no rows. Nothing read that
 * flag. Opportunities did `setCompanies(res.companies || [])`, so a non-member was shown the
 * full screen with an empty list and the words "No matching opportunities right now" — which
 * reads as "your college has not posted any", not "this is part of membership". The one page
 * whose job is to make membership look worth buying was quietly telling people it was empty.
 *
 * Gating the shared surface covers the list AND a deep link to one company in a single place,
 * so a URL pasted into a chat cannot walk around the lock the rail already shows.
 *
 * It is still only the explanation: the server refuses the data regardless of what renders.
 */
const Companies: React.FC = () => {
  const { slug } = useParams();
  const { data } = useMember();
  const locked = (data?.locked || []).some(l => l.section === 'companies');

  if (locked) return <SectionLock section="companies" />;

  return (
    <section className="cb-companies-surface" aria-label="Career opportunities">
      {slug ? <CompanyDetail slug={slug} /> : <Opportunities />}
    </section>
  );
};

export default Companies;
