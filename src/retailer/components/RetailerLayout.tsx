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
    <div className={`flex h-screen relative overflow-hidden ${isDarkMode ? 'dark text-white bg-slate-950' : 'text-slate-900 bg-slate-50'}`}>
      {/* Animated Gradient Background Elements */}
      <div className="absolute inset-0 z-0 overflow-hidden pointer-events-none">
        <div className={`absolute -top-40 -right-40 w-96 h-96 rounded-full mix-blend-screen filter blur-[100px] opacity-30 animate-blob ${isDarkMode ? 'bg-blue-600' : 'bg-blue-400'}`}></div>
        <div className={`absolute top-40 -left-20 w-72 h-72 rounded-full mix-blend-screen filter blur-[80px] opacity-20 animate-blob animation-delay-2000 ${isDarkMode ? 'bg-indigo-600' : 'bg-indigo-400'}`}></div>
        <div className={`absolute -bottom-40 left-1/2 w-96 h-96 rounded-full mix-blend-screen filter blur-[100px] opacity-20 animate-blob animation-delay-4000 ${isDarkMode ? 'bg-cyan-600' : 'bg-cyan-400'}`}></div>
      </div>
      
      {/* Foreground Content */}
      <div className="flex w-full h-full z-10 relative">
        <RetailerSidebar />
        <div className="flex flex-col flex-1 overflow-hidden z-10">
          <RetailerHeader />
          <main className="flex-1 overflow-y-auto p-6 scroll-smooth">
            <Outlet />
          </main>
        </div>
      </div>
    </div>
  );
};

export default RetailerLayout;