import React, { useState, useEffect } from 'react';
import Navbar from './Navbar';
import Sidebar from './Sidebar';
import './Layout.css';

interface LayoutProps {
  children: React.ReactNode;
}

const Layout: React.FC<LayoutProps> = ({ children }) => {
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false);

  // Close mobile sidebar on Escape key
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') setMobileSidebarOpen(false); };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, []);

  return (
    <div className="layout">
      <Navbar onHamburgerClick={() => setMobileSidebarOpen(o => !o)} />
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