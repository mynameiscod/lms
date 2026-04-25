import React from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { Button } from '../common';
import NotificationBell from '../NotificationBell';
import './Navbar.css';

interface NavbarProps {
  onHamburgerClick?: () => void;
}

const Navbar: React.FC<NavbarProps> = ({ onHamburgerClick }) => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  return (
    <nav className="app-navbar">
      <div className="app-navbar-container">
        <div className="app-navbar-left">
          {onHamburgerClick && (
            <button className="app-navbar-hamburger" onClick={onHamburgerClick} aria-label="Toggle menu">
              &#9776;
            </button>
          )}
          <div className="app-navbar-logo">
            <img 
              src="/assets/logo.png" 
              alt="Logo" 
              style={{ height: '40px', width: 'auto', objectFit: 'contain' }}
            />
          </div>
        </div>

        <div className="app-navbar-user">
          {user ? (
            <>
              <NotificationBell />
              <Link to="/profile" className="profile-link" title="View your profile">
                <div className="user-info">
                  {user.profilePicture ? (
                    <img 
                      src={user.profilePicture} 
                      alt={user.firstName}
                      className="user-avatar-img"
                    />
                  ) : (
                    <span className="user-avatar">
                      {(user.firstName?.[0] || '').toUpperCase()}{(user.lastName?.[0] || '').toUpperCase()}
                    </span>
                  )}
                  <div className="user-meta">
                    <span className="user-name">
                      {user.firstName} {user.lastName}
                    </span>
                    <span className="user-role">{user.role === 'STUDENT' ? 'Student' : user.role === 'ADMIN' ? 'Admin' : user.role === 'INSTRUCTOR' ? 'Instructor' : user.role}</span>
                  </div>
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