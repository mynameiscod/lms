import React from 'react';
import { ContentManagementLayout } from '../../components/content';
import './AdminContentPage.css';

const AdminContentPage: React.FC = () => {
  return (
    <div className="admin-content-page">
      <ContentManagementLayout />
    </div>
  );
};

export default AdminContentPage;
