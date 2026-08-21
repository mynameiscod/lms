import React from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
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
          <button className="app-navbar-hamburger" onClick={onHamburgerClick} aria-label="Toggle navigation">
            <i className="bi bi-list" aria-hidden="true" />
          </button>
          <label className="app-navbar-search" aria-label="Search">
            <i className="bi bi-search" aria-hidden="true" />
            <input type="search" placeholder="Search anything..." />
            <span className="search-shortcut">⌘ K</span>
          </label>
        </div>

        <div className="app-navbar-user">
          {user ? (
            <>
              <NotificationBell />
              <details className="user-menu">
                <summary className="user-menu-summary">
                  {user.profilePicture ? (
                    <img src={user.profilePicture} alt={user.firstName} className="user-avatar-img" />
                  ) : (
                    <span className="user-avatar">
                      {(user.firstName?.[0] || '').toUpperCase()}{(user.lastName?.[0] || '').toUpperCase()}
                    </span>
                  )}
                  <span className="user-meta">
                    <span className="user-name">{user.firstName} {user.lastName}</span>
                    <span className="user-role">{user.role === 'STUDENT' ? 'Student' : user.role === 'ADMIN' ? 'Admin' : user.role === 'INSTRUCTOR' ? 'Instructor' : user.role}</span>
                  </span>
                  <i className="bi bi-chevron-down user-menu-chevron" aria-hidden="true" />
                </summary>
                <div className="user-menu-popover">
                  <Link to="/profile"><i className="bi bi-person" aria-hidden="true" /> Profile</Link>
                  <button type="button" onClick={handleLogout}><i className="bi bi-box-arrow-right" aria-hidden="true" /> Logout</button>
                </div>
              </details>
            </>
          ) : (
            <Link to="/login" className="app-login-link">Login</Link>
          )}
        </div>
      </div>
    </nav>
  );
};

export default Navbar;