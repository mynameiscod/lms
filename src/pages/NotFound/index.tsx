import React from 'react';
import { Link } from 'react-router-dom';
import { Button } from '../../components/common';
import './NotFound.css';

const NotFoundPage: React.FC = () => {
  return (
    <div className="not-found">
      <div className="not-found-content">
        <h1 className="not-found-code">404</h1>
        <h2>Page Not Found</h2>
        <p>The page you're looking for doesn't exist or has been moved.</p>
        <Link to="/dashboard">
          <Button variant="primary">Back to Dashboard</Button>
        </Link>
      </div>
    </div>
  );
};

export default NotFoundPage;