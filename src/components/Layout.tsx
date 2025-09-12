import React from 'react';
import { Outlet } from 'react-router-dom';
import Sidebar from './Sidebar';
import Header from './Header';
import { useTheme } from '../context/ThemeContext';

const Layout: React.FC = () => {
  const { isDarkMode } = useTheme();
  
  return (
    <div className={`flex h-screen ${isDarkMode ? 'dark bg-gray-900 text-white' : 'bg-gray-50 text-gray-900'}`}>
      <Sidebar />
      <div className="flex flex-col flex-1 overflow-hidden">
        <Header />
        <main className={`flex-1 overflow-y-auto p-4 ${isDarkMode ? 'bg-gray-800' : 'bg-gray-100'}`}>
          <Outlet />
        </main>
      </div>
    </div>
  );
};

export default Layout;