import React, { useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import './Sidebar.css';

interface MenuItem {
  label: string;
  path?: string;
  roles: string[];
  icon?: string;
  submenu?: MenuItem[];
}

const Sidebar: React.FC = () => {
  const [isOpen, setIsOpen] = useState(true);
  const [expandedGroups, setExpandedGroups] = useState<Record<string, boolean>>({
    attendance: false,
    quizzes: false,
    assignments: false
  });
  const location = useLocation();
  const { user } = useAuth();

  const isActive = (path?: string) => path ? location.pathname === path : false;

  const toggleGroup = (group: string) => {
    setExpandedGroups(prev => ({
      ...prev,
      [group]: !prev[group]
    }));
  };

  const menuItems: MenuItem[] = [
    { label: 'Dashboard', path: '/dashboard', roles: ['SUPER_ADMIN', 'TENANT_ADMIN', 'INSTRUCTOR', 'STUDENT', 'ATTENDANCE_ADMIN'], icon: '⌂' },
    { label: 'My Course', path: '/my-course', roles: ['STUDENT'], icon: '📚' },
    { label: 'Courses', path: '/courses', roles: ['SUPER_ADMIN', 'TENANT_ADMIN', 'INSTRUCTOR'], icon: '▦' },
    { label: 'Course Management', path: '/course-management', roles: ['SUPER_ADMIN', 'TENANT_ADMIN', 'INSTRUCTOR'], icon: '⚡' },
    { label: 'Users', path: '/users', roles: ['SUPER_ADMIN', 'TENANT_ADMIN'], icon: '⊕' },
    { label: 'Roles', path: '/roles', roles: ['SUPER_ADMIN', 'TENANT_ADMIN'], icon: '⚙' },
    { label: 'Batches', path: '/batches', roles: ['SUPER_ADMIN', 'TENANT_ADMIN'], icon: '▤' },
    {
      label: 'Attendance',
      roles: ['SUPER_ADMIN', 'TENANT_ADMIN', 'INSTRUCTOR', 'STUDENT', 'ATTENDANCE_ADMIN'],
      icon: '☑',
      submenu: [
        { label: 'Mark Attendance', path: '/attendance', roles: ['SUPER_ADMIN', 'TENANT_ADMIN', 'ATTENDANCE_ADMIN', 'INSTRUCTOR'] },
        { label: 'My Attendance', path: '/my-attendance', roles: ['INSTRUCTOR', 'STUDENT', 'ATTENDANCE_ADMIN'] },
        { label: 'Reports', path: '/attendance-reports', roles: ['SUPER_ADMIN', 'TENANT_ADMIN', 'ATTENDANCE_ADMIN', 'INSTRUCTOR'] },
      ]
    },
    {
      label: 'Quizzes',
      roles: ['SUPER_ADMIN', 'TENANT_ADMIN', 'INSTRUCTOR', 'STUDENT'],
      icon: '✎',
      submenu: [
        { label: 'My Quizzes', path: '/quizzes', roles: ['INSTRUCTOR', 'STUDENT'] },
        { label: 'Manage Quizzes', path: '/quiz-management', roles: ['SUPER_ADMIN', 'TENANT_ADMIN', 'INSTRUCTOR'] },
        { label: 'Question Bank', path: '/question-bank', roles: ['SUPER_ADMIN', 'TENANT_ADMIN', 'INSTRUCTOR'] },
        { label: 'Quiz Reports', path: '/quiz-reports', roles: ['SUPER_ADMIN', 'TENANT_ADMIN', 'INSTRUCTOR'] },
      ]
    },
    {
      label: 'Assignments',
      roles: ['SUPER_ADMIN', 'TENANT_ADMIN', 'INSTRUCTOR', 'STUDENT'],
      icon: '📝',
      submenu: [
        { label: 'My Assignments', path: '/assignments', roles: ['STUDENT'] },
        { label: 'Manage Assignments', path: '/admin/assignments', roles: ['SUPER_ADMIN', 'TENANT_ADMIN', 'INSTRUCTOR'] },
        { label: 'Assignment Reports', path: '/admin/assignments/reports', roles: ['SUPER_ADMIN', 'TENANT_ADMIN', 'INSTRUCTOR'] },
      ]
    },
    { label: 'Student Reports', path: '/student-reports', roles: ['SUPER_ADMIN', 'TENANT_ADMIN', 'INSTRUCTOR'], icon: '📊' },
    { label: 'Interview Q&A Bank', path: '/interview-question-bank', roles: ['SUPER_ADMIN', 'TENANT_ADMIN', 'INSTRUCTOR'], icon: '💼' },
    {
      label: 'Mock Interviews',
      roles: ['STUDENT', 'SUPER_ADMIN', 'TENANT_ADMIN', 'INSTRUCTOR'],
      icon: '🎯',
      submenu: [
        { label: 'Practice', path: '/mock-interviews', roles: ['STUDENT', 'SUPER_ADMIN', 'TENANT_ADMIN', 'INSTRUCTOR'] },
        { label: 'Assign to Students', path: '/mock-interviews/assign', roles: ['SUPER_ADMIN', 'TENANT_ADMIN', 'INSTRUCTOR'] },
      ]
    },
  ];

  const hasAccessToMenu = (item: MenuItem): boolean => {
    return user?.role ? item.roles.includes(user.role) : false;
  };

  const filteredItems = menuItems.filter(hasAccessToMenu);

  const renderMenuItem = (item: MenuItem, isSubmenu = false) => {
    if (!hasAccessToMenu(item)) return null;

    if (item.submenu) {
      const isExpanded = expandedGroups[item.label.toLowerCase()];
      return (
        <div key={item.label} className="menu-group">
          <button
            className={`sidebar-group-button ${isExpanded ? 'expanded' : ''}`}
            onClick={() => toggleGroup(item.label.toLowerCase())}
          >
            <span className="group-icon">{item.icon}</span>
            <span className="group-label">{item.label}</span>
            <span className="group-chevron">›</span>
          </button>
          {isExpanded && (
            <ul className="submenu">
              {item.submenu
                .filter(subitem => hasAccessToMenu(subitem))
                .map((subitem) => (
                <li key={subitem.path}>
                  <Link
                    to={subitem.path!}
                    className={`sidebar-link submenu-link ${isActive(subitem.path) ? 'active' : ''}`}
                  >
                    <span className="sidebar-label">{subitem.label}</span>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </div>
      );
    }

    return (
      <li key={item.path} className={isSubmenu ? 'submenu-item' : ''}>
        <Link
          to={item.path!}
          className={`sidebar-link ${isActive(item.path) ? 'active' : ''}`}
        >
          <span className="menu-icon">{item.icon}</span>
          <span className="sidebar-label">{item.label}</span>
        </Link>
      </li>
    );
  };

  return (
    <aside className={`sidebar ${isOpen ? 'open' : 'closed'}`}>
      {/* Sidebar Header - Clickable to Toggle */}
      <div 
        className="sidebar-header" 
        onClick={() => setIsOpen(!isOpen)}
        title={isOpen ? "Collapse" : "Expand"}
        role="button"
        tabIndex={0}
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === ' ') {
            setIsOpen(!isOpen);
          }
        }}
      >
        <div className="header-icon">☰</div>
        <div className="header-text">Menu</div>
        <div className="header-toggle">{isOpen ? '‹' : '›'}</div>
      </div>

      {/* Navigation */}
      <nav className="sidebar-nav">
        <ul>
          {filteredItems.map((item) => 
            item.submenu ? renderMenuItem(item) : renderMenuItem(item)
          )}
        </ul>
      </nav>
    </aside>
  );
};

export default Sidebar;