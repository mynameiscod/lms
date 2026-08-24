import React, { useState, useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import Navbar from './Navbar';
import Sidebar from './Sidebar';
import './Layout.css';

interface LayoutProps {
  children: React.ReactNode;
}

const Layout: React.FC<LayoutProps> = ({ children }) => {
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const { pathname } = useLocation();
  const isCareerPilotAdmin = pathname.startsWith('/admin/passport') || pathname.startsWith('/admin/careerpilot');

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
    <div className={`layout ${sidebarCollapsed ? 'sidebar-collapsed' : ''} ${isCareerPilotAdmin ? 'careerpilot-admin-surface' : ''}`}>
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
        <main className="main-content" onClick={mobileSidebarOpen ? () => setMobileSidebarOpen(false) : undefined}>
          {children}
        </main>
      </div>
    </div>
  );
};

export default Layout;