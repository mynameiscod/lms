import { useAuth } from '../../contexts/AuthContext';
import { homePathFor } from '../../utils/product';
import React from 'react';
import { Link } from 'react-router-dom';
import { Button } from '../../components/common';
import './NotFound.css';

const NotFoundPage: React.FC = () => {
  const { user } = useAuth();
  return (
    <div className="not-found">
      <div className="not-found-content">
        <h1 className="not-found-code">404</h1>
        <h2>Page Not Found</h2>
        <p>The page you're looking for doesn't exist or has been moved.</p>
        <Link to={homePathFor(user)}>
          <Button variant="primary">{homePathFor(user) === '/careerpilot' ? 'Back to CareerPilot' : 'Back to Dashboard'}</Button>
        </Link>
      </div>
    </div>
  );
};

export default NotFoundPage;