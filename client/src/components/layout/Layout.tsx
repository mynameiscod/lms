import React, { useState, useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import Navbar from './Navbar';
import Sidebar from './Sidebar';
import './Layout.css';
import './StudentCoreRemaining.css';

interface LayoutProps {
  children: React.ReactNode;
}

const STUDENT_CORE_REMAINING_ROUTES = [
  '/student/fee-details',
  '/student/college',
  '/student/my-applications',
  '/student/alumni-directory',
  '/notifications',
  '/my-interviews',
  '/student/interviews',
  '/my-leave',
  '/playground',
  '/project-builder',
  '/job-tracker',
  '/ai-mentor',
  '/resource-library',
  '/hms-classes',
  '/ai-communication-lab',
  '/thinking-lab',
  '/logic-gym',
  '/resume-builder',
  '/career-profile',
  '/profile',
  '/interview-questions',
];

const routeKeyFor = (pathname: string) => {
  const match = STUDENT_CORE_REMAINING_ROUTES.find(
    route => pathname === route || pathname.startsWith(`${route}/`)
  );
  if (!match) return '';
  return match
    .replace(/^\//, '')
    .replace(/\//g, '-')
    .replace(/[^a-z0-9-]/gi, '') || 'student-core';
};

const Layout: React.FC<LayoutProps> = ({ children }) => {
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const { pathname } = useLocation();
  const isCareerPilotAdmin = pathname.startsWith('/admin/passport') || pathname.startsWith('/admin/careerpilot');
  const studentCoreRouteKey = routeKeyFor(pathname);
  const isRemainingStudentCore = Boolean(studentCoreRouteKey);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') setMobileSidebarOpen(false); };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, []);

  const handleMenuToggle = () => {
    if (window.innerWidth <= 768) {
      setMobileSidebarOpen(open => !open);
    } else {
      setSidebarCollapsed(collapsed => !collapsed);
    }
  };

  return (
    <div className={`layout ${sidebarCollapsed ? 'sidebar-collapsed' : ''} ${isCareerPilotAdmin ? 'careerpilot-admin-surface' : ''} ${isRemainingStudentCore ? 'student-core-remaining-layout' : ''}`}>
      <Navbar onHamburgerClick={handleMenuToggle} />
      <div className="layout-body">
        {mobileSidebarOpen && (
          <div
            className="sidebar-mobile-overlay"
            onClick={() => setMobileSidebarOpen(false)}
            style={{ cursor: 'pointer' }}
          />
        )}
        <Sidebar
          mobileOpen={mobileSidebarOpen}
          onMobileClose={() => setMobileSidebarOpen(false)}
        />
        <main
          className={`main-content ${isRemainingStudentCore ? 'student-core-remaining-surface' : ''}`}
          data-student-core-route={studentCoreRouteKey || undefined}
          onClick={mobileSidebarOpen ? () => setMobileSidebarOpen(false) : undefined}
        >
          {children}
        </main>
      </div>
    </div>
  );
};

export default Layout;
