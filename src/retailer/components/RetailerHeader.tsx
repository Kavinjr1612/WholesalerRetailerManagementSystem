import React, { useState, useEffect } from 'react';
import { Sun, Moon, LogOut } from 'lucide-react';
import { useTheme } from '../../context/ThemeContext';
import { supabase } from '../../lib/supabase';
import { useNavigate } from 'react-router-dom';

const RetailerHeader: React.FC = () => {
  const { isDarkMode, toggleTheme } = useTheme();
  const [shopName, setShopName] = useState('Sweet Shop Portal');
  const navigate = useNavigate();

  useEffect(() => {
    const fetchRetailerDetails = async () => {
      try {
        const userEmail = localStorage.getItem('userEmail');
        if (!userEmail) return;

        const { data: retailer, error } = await supabase
          .from('retailers')
          .select('name')
          .eq('email', userEmail)
          .single();

        if (error) throw error;
        if (retailer) {
          setShopName(retailer.name);
        }
      } catch (error) {
        console.error('Error fetching retailer details:', error);
      }
    };

    fetchRetailerDetails();
  }, []);

  const handleLogout = () => {
    localStorage.removeItem('userEmail');
    navigate('/login');
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

        <button
          onClick={handleLogout}
          className={`flex items-center px-4 py-2 rounded-lg ${
            isDarkMode 
              ? 'bg-red-600 hover:bg-red-700' 
              : 'bg-red-600 hover:bg-red-700'
          } text-white`}
        >
          <LogOut size={16} className="mr-2" />
          Logout
        </button>
      </div>
    </header>
  );
};

export default RetailerHeader;