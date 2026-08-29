import React from 'react';
import { useParams } from 'react-router-dom';
import CompanyDetail from './CompanyDetail';
import Opportunities from './Opportunities';

/** Career opportunities and company-prep detail share one CodeBegun member surface. */
const Companies: React.FC = () => {
  const { slug } = useParams();
  return (
    <section className="cb-companies-surface" aria-label="Career opportunities">
      {slug ? <CompanyDetail slug={slug} /> : <Opportunities />}
    </section>
  );
};

export default Companies;
