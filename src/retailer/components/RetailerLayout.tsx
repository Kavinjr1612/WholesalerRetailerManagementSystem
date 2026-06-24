import React, { useEffect } from 'react';
import { Outlet, useNavigate } from 'react-router-dom';
import RetailerSidebar from './RetailerSidebar';
import RetailerHeader from './RetailerHeader';
import { useTheme } from '../../context/ThemeContext';
import { supabase } from '../../lib/supabase';

const RetailerLayout: React.FC = () => {
  const { isDarkMode } = useTheme();
  const navigate = useNavigate();
  
  useEffect(() => {
    const checkAuth = async () => {
      try {
        const userEmail = localStorage.getItem('userEmail');
        if (!userEmail) {
          navigate('/login');
          return;
        }

        // Verify user exists and is a retailer
        const { data: user, error: userError } = await supabase
          .from('users')
          .select('*')
          .eq('email', userEmail)
          .eq('role', 'retailer')
          .single();

        if (userError || !user) {
          localStorage.removeItem('userEmail');
          navigate('/login');
          return;
        }
      } catch (error) {
        console.error('Auth check error:', error);
        localStorage.removeItem('userEmail');
        navigate('/login');
      }
    };

    checkAuth();
  }, [navigate]);
  
  return (
    <div className={`flex h-screen ${isDarkMode ? 'dark bg-slate-900 text-white' : 'bg-slate-50 text-slate-900'}`}>
      <RetailerSidebar />
      <div className="flex flex-col flex-1 overflow-hidden">
        <RetailerHeader />
        <main className={`flex-1 overflow-y-auto p-4 ${isDarkMode ? 'bg-slate-800' : 'bg-slate-100'}`}>
          <Outlet />
        </main>
      </div>
    </div>
  );
};

export default RetailerLayout;