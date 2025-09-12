import React from 'react';
import { useLocation } from 'react-router-dom';
import AdminSettings from './settings/AdminSettings';
import RetailerSettings from './settings/RetailerSettings';

const Settings: React.FC = () => {
  const location = useLocation();
  const isAdmin = location.pathname.startsWith('/admin');

  return isAdmin ? <AdminSettings /> : <RetailerSettings />;
};

export default Settings;