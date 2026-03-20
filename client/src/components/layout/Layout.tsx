import React, { useState } from 'react';
import Navbar from './Navbar';
import Sidebar from './Sidebar';
import './Layout.css';

interface LayoutProps {
  children: React.ReactNode;
}

const Layout: React.FC<LayoutProps> = ({ children }) => {
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false);

  return (
    <div className="layout">
      <Navbar onHamburgerClick={() => setMobileSidebarOpen(o => !o)} />
      <div className="layout-body">
        {mobileSidebarOpen && (
          <div className="sidebar-mobile-overlay" onClick={() => setMobileSidebarOpen(false)} />
        )}
        <Sidebar mobileOpen={mobileSidebarOpen} onMobileClose={() => setMobileSidebarOpen(false)} />
        <main className="main-content">{children}</main>
      </div>
    </div>
  );
};

export default Layout;