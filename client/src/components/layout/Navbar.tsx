import React from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { Button } from '../common';
import './Navbar.css';

const Navbar: React.FC = () => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  return (
    <nav className="navbar">
      <div className="navbar-container">
        <div className="navbar-logo">
          <img 
            src="/assets/logo.png" 
            alt="Logo" 
            style={{ height: '40px', width: 'auto', objectFit: 'contain' }}
          />
        </div>

        <div className="navbar-user">
          {user ? (
            <>
              <Link to="/profile" className="profile-link" title="View your profile">
                <div className="user-info">
                  {user.profilePicture ? (
                    <img 
                      src={user.profilePicture} 
                      alt={user.firstName}
                      className="user-avatar-img"
                    />
                  ) : (
                    <span className="user-avatar">👤</span>
                  )}
                  <span className="user-name">
                    {user.firstName} {user.lastName}
                  </span>
                </div>
              </Link>
              <Button variant="danger" onClick={handleLogout}>
                Logout
              </Button>
            </>
          ) : (
            <Link to="/login">
              <Button variant="primary">Login</Button>
            </Link>
          )}
        </div>
      </div>
    </nav>
  );
};

export default Navbar;