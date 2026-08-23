import React from 'react';
import { useParams } from 'react-router-dom';
import CompanyDetail from './CompanyDetail';
import Opportunities from './Opportunities';

/**
 * Career opportunities live at the existing member destination so the persistent
 * CareerPilot shell does not need a second competing jobs route. Company interview
 * preparation remains available on /careerpilot/companies/:slug.
 */
const Companies: React.FC = () => {
  const { slug } = useParams();
  if (slug) return <CompanyDetail slug={slug} />;
  return <Opportunities />;
};

export default Companies;
