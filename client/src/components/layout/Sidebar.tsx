import React, { useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { useStudentFeatures, StudentFeatures } from '../../contexts/StudentFeaturesContext';
import './Sidebar.css';

interface MenuItem {
  label: string;
  path?: string;
  roles: string[];
  icon?: string;
  submenu?: MenuItem[];
  featureKey?: keyof StudentFeatures;
  permissions?: string[]; // If set, user needs at least one of these permissions
}

const Sidebar: React.FC = () => {
  const [isOpen, setIsOpen] = useState(true);
  const [expandedGroups, setExpandedGroups] = useState<Record<string, boolean>>({
    attendance: false,
    quizzes: false,
    assignments: false,
    leads: false,
    marketing: false
  });
  const location = useLocation();
  const { user } = useAuth();
  const { isFeatureEnabled } = useStudentFeatures();

  const isActive = (path?: string) => path ? location.pathname === path : false;

  const toggleGroup = (group: string) => {
    setExpandedGroups(prev => ({
      ...prev,
      [group]: !prev[group]
    }));
  };

  const menuItems: MenuItem[] = [
    { label: 'Dashboard', path: '/dashboard', roles: ['SUPER_ADMIN', 'TENANT_ADMIN', 'INSTRUCTOR', 'STUDENT', 'ATTENDANCE_ADMIN'], icon: '⌂', featureKey: 'dashboard', permissions: ['view_analytics', 'view_reports', 'view_courses', 'view_attendance'] },
    { label: 'My Course', path: '/my-course', roles: ['STUDENT'], icon: '📚', featureKey: 'myCourse', permissions: ['enroll_courses', 'view_courses'] },
    { label: 'Courses', path: '/courses', roles: ['SUPER_ADMIN', 'TENANT_ADMIN', 'INSTRUCTOR'], icon: '▦', permissions: ['view_courses'] },
    { label: 'Course Management', path: '/course-management', roles: ['SUPER_ADMIN', 'TENANT_ADMIN', 'INSTRUCTOR'], icon: '⚡', permissions: ['create_courses', 'edit_courses', 'manage_own_courses'] },
    { label: 'Users', path: '/users', roles: ['SUPER_ADMIN', 'TENANT_ADMIN'], icon: '⊕', permissions: ['manage_tenant_users'] },
    { label: 'Roles', path: '/roles', roles: ['SUPER_ADMIN', 'TENANT_ADMIN'], icon: '⚙', permissions: ['manage_roles'] },
    { label: 'Batches', path: '/batches', roles: ['SUPER_ADMIN', 'TENANT_ADMIN'], icon: '▤', permissions: ['manage_tenant_courses'] },
    {
      label: 'Attendance',
      roles: ['SUPER_ADMIN', 'TENANT_ADMIN', 'INSTRUCTOR', 'STUDENT', 'ATTENDANCE_ADMIN'],
      icon: '☑',
      featureKey: 'attendance',
      permissions: ['mark_attendance', 'view_attendance'],
      submenu: [
        { label: 'Mark Attendance', path: '/attendance', roles: ['SUPER_ADMIN', 'TENANT_ADMIN', 'ATTENDANCE_ADMIN', 'INSTRUCTOR'], permissions: ['mark_attendance'] },
        { label: 'My Attendance', path: '/my-attendance', roles: ['INSTRUCTOR', 'STUDENT', 'ATTENDANCE_ADMIN'], permissions: ['view_attendance'] },
        { label: 'Reports', path: '/attendance-reports', roles: ['SUPER_ADMIN', 'TENANT_ADMIN', 'ATTENDANCE_ADMIN', 'INSTRUCTOR'], permissions: ['view_reports'] },
      ]
    },
    {
      label: 'Quizzes',
      roles: ['SUPER_ADMIN', 'TENANT_ADMIN', 'INSTRUCTOR', 'STUDENT'],
      icon: '✎',
      featureKey: 'quizzes',
      permissions: ['create_quiz', 'edit_quiz', 'view_quiz'],
      submenu: [
        { label: 'My Quizzes', path: '/quizzes', roles: ['INSTRUCTOR', 'STUDENT'], permissions: ['view_quiz'] },
        { label: 'Manage Quizzes', path: '/quiz-management', roles: ['SUPER_ADMIN', 'TENANT_ADMIN', 'INSTRUCTOR'], permissions: ['create_quiz', 'edit_quiz'] },
        { label: 'Question Bank', path: '/question-bank', roles: ['SUPER_ADMIN', 'TENANT_ADMIN', 'INSTRUCTOR'], permissions: ['create_question', 'edit_question'] },
        { label: 'Quiz Reports', path: '/quiz-reports', roles: ['SUPER_ADMIN', 'TENANT_ADMIN', 'INSTRUCTOR'], permissions: ['view_reports'] },
      ]
    },
    {
      label: 'Assignments',
      roles: ['SUPER_ADMIN', 'TENANT_ADMIN', 'INSTRUCTOR', 'STUDENT'],
      icon: '📝',
      featureKey: 'assignments',
      permissions: ['manage_assignments', 'submit_assignments', 'view_grades'],
      submenu: [
        { label: 'My Assignments', path: '/assignments', roles: ['STUDENT'], permissions: ['submit_assignments', 'view_grades'] },
        { label: 'Manage Assignments', path: '/admin/assignments', roles: ['SUPER_ADMIN', 'TENANT_ADMIN', 'INSTRUCTOR'], permissions: ['manage_assignments'] },
        { label: 'Assignment Reports', path: '/admin/assignments/reports', roles: ['SUPER_ADMIN', 'TENANT_ADMIN', 'INSTRUCTOR'], permissions: ['view_reports', 'grade_assignments'] },
      ]
    },
    { label: 'Student Reports', path: '/student-reports', roles: ['SUPER_ADMIN', 'TENANT_ADMIN', 'INSTRUCTOR'], icon: '📊', permissions: ['view_reports'] },
    { label: 'Student Features', path: '/student-features', roles: ['SUPER_ADMIN', 'TENANT_ADMIN'], icon: '🎛', permissions: ['manage_tenant_settings', 'manage_tenant'] },
    { label: 'Interview Q&A Bank', path: '/interview-question-bank', roles: ['SUPER_ADMIN', 'TENANT_ADMIN', 'INSTRUCTOR'], icon: '💼', permissions: ['manage_interviews'] },
    {
      label: 'Mock Interviews',
      roles: ['STUDENT', 'SUPER_ADMIN', 'TENANT_ADMIN', 'INSTRUCTOR'],
      icon: '🎯',
      featureKey: 'mockInterviews',
      permissions: ['manage_interviews', 'take_interviews'],
      submenu: [
        { label: 'Practice', path: '/mock-interviews', roles: ['STUDENT', 'SUPER_ADMIN', 'TENANT_ADMIN', 'INSTRUCTOR'], permissions: ['take_interviews'] },
        { label: 'Assign to Students', path: '/mock-interviews/assign', roles: ['SUPER_ADMIN', 'TENANT_ADMIN', 'INSTRUCTOR'], permissions: ['manage_interviews'] },
      ]
    },
    {
      label: 'Leads',
      roles: ['SUPER_ADMIN', 'TENANT_ADMIN', 'STAFF'],
      icon: '🎯',
      permissions: ['manage_leads', 'view_leads'],
      submenu: [
        { label: 'All Leads', path: '/leads', roles: ['SUPER_ADMIN', 'TENANT_ADMIN', 'STAFF'], permissions: ['manage_leads', 'view_leads'] },
        { label: 'Manager Board', path: '/lead-manager-board', roles: ['SUPER_ADMIN', 'TENANT_ADMIN'], permissions: ['manage_leads'] },
        { label: 'Lead Stages', path: '/lead-stages', roles: ['SUPER_ADMIN', 'TENANT_ADMIN'], permissions: ['manage_leads'] },
        { label: 'Form Settings', path: '/lead-form-settings', roles: ['SUPER_ADMIN', 'TENANT_ADMIN'], permissions: ['manage_leads'] },
      ]
    },
    {
      label: 'Marketing',
      roles: ['SUPER_ADMIN', 'TENANT_ADMIN'],
      icon: '📊',
      permissions: ['manage_marketing'],
      submenu: [
        { label: 'Dashboard', path: '/marketing', roles: ['SUPER_ADMIN', 'TENANT_ADMIN'], permissions: ['manage_marketing'] },
        { label: 'Competitors', path: '/marketing/competitors', roles: ['SUPER_ADMIN', 'TENANT_ADMIN'], permissions: ['manage_marketing'] },
        { label: 'Ad Capture', path: '/marketing/ads', roles: ['SUPER_ADMIN', 'TENANT_ADMIN'], permissions: ['manage_marketing'] },
        { label: 'Insights', path: '/marketing/insights', roles: ['SUPER_ADMIN', 'TENANT_ADMIN'], permissions: ['manage_marketing'] },
        { label: 'Marketing Ideas', path: '/marketing/ideas', roles: ['SUPER_ADMIN', 'TENANT_ADMIN'], permissions: ['manage_marketing'] },
      ]
    },
  ];

  const hasAccessToMenu = (item: MenuItem): boolean => {
    if (!user) return false;

    // If user has permissions array (custom role or resolved permissions), use permission-based access
    if (user.permissions && user.permissions.length > 0 && item.permissions) {
      const hasPermission = item.permissions.some(p => user.permissions!.includes(p));
      if (!hasPermission) return false;
    } else {
      // Fallback to role-based access for users without permissions array
      if (!user.role || !item.roles.includes(user.role)) return false;
    }

    // For students, check if the feature is enabled by admin
    if (user.role === 'STUDENT' && item.featureKey && !isFeatureEnabled(item.featureKey)) {
      return false;
    }
    return true;
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