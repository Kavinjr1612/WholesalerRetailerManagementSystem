import React, { useState, useEffect, useRef } from 'react';
import { Sun, Moon, Settings, LogOut, ChevronDown } from 'lucide-react';
import { useTheme } from '../context/ThemeContext';
import { supabase } from '../lib/supabase';
import { useNavigate } from 'react-router-dom';

const Header: React.FC = () => {
  const { isDarkMode, toggleTheme } = useTheme();
  const [isProfileOpen, setIsProfileOpen] = useState(false);
  const [shopName, setShopName] = useState('Sweet & Snacks Wholesaler');
  const profileRef = useRef<HTMLDivElement>(null);
  const navigate = useNavigate();

  useEffect(() => {
    const fetchShopName = async () => {
      try {
        const { data, error } = await supabase
          .from('admin_settings')
          .select('shop_name')
          .single();

        if (!error && data?.shop_name) {
          setShopName(data.shop_name);
        }
      } catch (error) {
        console.error('Error fetching shop name:', error);
      }
    };

    fetchShopName();
  }, []);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (profileRef.current && !profileRef.current.contains(event.target as Node)) {
        setIsProfileOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleLogout = () => {
    localStorage.removeItem('userEmail');
    navigate('/admin/login');
  };

  return (
    <header className={`flex justify-between items-center p-4 border-b ${
      isDarkMode ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'
    }`}>
      <div className="flex items-center space-x-4">
        <h1 className="text-xl font-bold">{shopName}</h1>
      </div>
      <div className="flex items-center space-x-4">
        <button
          className={`p-2 rounded-full ${
            isDarkMode ? 'hover:bg-gray-700' : 'hover:bg-gray-100'
          }`}
          onClick={toggleTheme}
        >
          {isDarkMode ? <Sun size={20} /> : <Moon size={20} />}
        </button>

        <div className="relative" ref={profileRef}>
          <button
            onClick={() => setIsProfileOpen(!isProfileOpen)}
            className={`flex items-center space-x-2 p-2 rounded-lg ${
              isDarkMode 
                ? 'hover:bg-gray-700' 
                : 'hover:bg-gray-100'
            }`}
          >
            <div className="w-8 h-8 rounded-full bg-indigo-600 flex items-center justify-center text-white">
              A
            </div>
            <span className={isDarkMode ? 'text-gray-300' : 'text-gray-700'}>
              Admin
            </span>
            <ChevronDown size={16} className={`transform transition-transform ${
              isProfileOpen ? 'rotate-180' : ''
            }`} />
          </button>

          {isProfileOpen && (
            <div className={`absolute right-0 mt-2 w-48 rounded-md shadow-lg py-1 ${
              isDarkMode 
                ? 'bg-gray-700 border border-gray-600' 
                : 'bg-white border border-gray-200'
            }`}>
              <button
                onClick={() => {
                  setIsProfileOpen(false);
                  navigate('/admin/settings');
                }}
                className={`flex items-center w-full px-4 py-2 text-sm ${
                  isDarkMode 
                    ? 'text-gray-300 hover:bg-gray-600' 
                    : 'text-gray-700 hover:bg-gray-100'
                }`}
              >
                <Settings size={16} className="mr-2" />
                Settings
              </button>
              <button
                onClick={handleLogout}
                className={`flex items-center w-full px-4 py-2 text-sm ${
                  isDarkMode 
                    ? 'text-red-400 hover:bg-gray-600' 
                    : 'text-red-600 hover:bg-gray-100'
                }`}
              >
                <LogOut size={16} className="mr-2" />
                Logout
              </button>
            </div>
          )}
        </div>
      </div>
    </header>
  );
};

export default Header;