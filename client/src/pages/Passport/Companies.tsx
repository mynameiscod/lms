import React from 'react';
import { useParams } from 'react-router-dom';
import CompanyDetail from './CompanyDetail';
import Opportunities from './Opportunities';

/** Career opportunities and company-prep detail share one member destination. */
const Companies: React.FC = () => {
  const { slug } = useParams();
  return <div className="cb-companies-surface">{slug ? <CompanyDetail slug={slug} /> : <Opportunities />}</div>;
};

export default Companies;
