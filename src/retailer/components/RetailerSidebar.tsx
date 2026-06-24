import React, { useState, useEffect, useRef } from 'react';
import { NavLink } from 'react-router-dom';
import { 
  ShoppingCart,
  Lock,
  Unlock,
  LayoutDashboard,
  Package,
  CreditCard
} from 'lucide-react';
import { useTheme } from '../../context/ThemeContext';
import { supabase } from '../../lib/supabase';

const Sidebar: React.FC = () => {
  const { isDarkMode } = useTheme();
  const [collapsed, setCollapsed] = useState(false);
  const [isLocked, setIsLocked] = useState(false);
  const [isHovering, setIsHovering] = useState(false);
  const [shopName, setShopName] = useState('Sweet Shop');
  const hoverTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  
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

  const navItems = [
    { path: '/retailer/dashboard', icon: <LayoutDashboard size={20} />, label: 'Dashboard' },
    { path: '/retailer/billing', icon: <CreditCard size={20} />, label: 'Billing' },
    { path: '/retailer/products', icon: <Package size={20} />, label: 'Products' },
    { path: '/retailer/orders', icon: <ShoppingCart size={20} />, label: 'My Orders' }
  ];

  const handleMouseEnter = () => {
    setIsHovering(true);
    if (!isLocked && collapsed) {
      if (hoverTimeoutRef.current) {
        clearTimeout(hoverTimeoutRef.current);
      }
      hoverTimeoutRef.current = setTimeout(() => {
        setCollapsed(false);
      }, 300);
    }
  };
  
  const handleMouseLeave = () => {
    setIsHovering(false);
    if (!isLocked && !collapsed) {
      if (hoverTimeoutRef.current) {
        clearTimeout(hoverTimeoutRef.current);
      }
      hoverTimeoutRef.current = setTimeout(() => {
        setCollapsed(true);
      }, 300);
    }
  };
  
  const toggleLock = () => {
    setIsLocked(!isLocked);
    if (collapsed && !isLocked) {
      setCollapsed(false);
    }
  };
  
  useEffect(() => {
    return () => {
      if (hoverTimeoutRef.current) {
        clearTimeout(hoverTimeoutRef.current);
      }
    };
  }, []);
  
  return (
    <aside 
      className={`relative ${collapsed ? 'w-16' : 'w-64'} transition-all duration-300 ${
        isDarkMode ? 'bg-gray-900' : 'bg-white'
      } border-r ${isDarkMode ? 'border-gray-700/50' : 'border-gray-200/50'}`}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
    >
      <div className={`flex items-center p-4 ${isDarkMode ? 'border-gray-700/50' : 'border-gray-200/50'} border-b`}>
        <div className="w-8 h-8 rounded-full bg-blue-600/20 flex items-center justify-center overflow-hidden">
          <img 
            src="/images/logo.png"
            alt="Logo"
            className="w-full h-full object-cover"
          />
        </div>
        {!collapsed && <span className="ml-2 font-bold text-lg truncate">{shopName}</span>}
      </div>
      
      <nav className="mt-6 mb-20">
        <ul>
          {navItems.map((item) => (
            <li key={item.path} className="mb-2 px-2">
              <NavLink
                to={item.path}
                className={({ isActive }) => 
                  `flex items-center p-3 ${collapsed ? 'justify-center' : 'px-4'} ${
                    isActive 
                      ? `${isDarkMode ? 'bg-gray-800' : 'bg-blue-50'} text-blue-600` 
                      : `${isDarkMode ? 'text-gray-400 hover:bg-gray-800' : 'text-gray-600 hover:bg-gray-100'}`
                  } rounded-lg transition-colors`
                }
              >
                <span>{item.icon}</span>
                {!collapsed && <span className="ml-3">{item.label}</span>}
              </NavLink>
            </li>
          ))}
        </ul>
      </nav>
      
      <div className="absolute bottom-4 left-4 transition-all duration-300">
        <button 
          onClick={toggleLock}
          className={`p-2 rounded-full ${
            isDarkMode 
              ? 'bg-gray-800 hover:bg-gray-700' 
              : 'bg-gray-100 hover:bg-gray-200'
          } transition-colors`}
          title={isLocked ? "Unlock sidebar" : "Lock sidebar"}
        >
          {isLocked ? (
            <Lock size={16} className={`${isDarkMode ? 'text-blue-400' : 'text-blue-600'}`} />
          ) : (
            <Unlock size={16} className={`${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`} />
          )}
        </button>
      </div>
    </aside>
  );
};

export default Sidebar;