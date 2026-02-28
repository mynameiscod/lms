import React from 'react';
import { AdminContentPanel } from '../../components/content';
import './AdminContentPage.css';

const AdminContentPage: React.FC = () => {
  return (
    <div className="admin-content-page">
      <AdminContentPanel />
    </div>
  );
};

export default AdminContentPage;
