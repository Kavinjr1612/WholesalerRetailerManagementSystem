import React, { useState, useEffect, useRef } from 'react';
import { NavLink } from 'react-router-dom';
import { 
  ShoppingCart,
  Lock,
  Unlock,
  Candy,
  LayoutDashboard,
  Settings as SettingsIcon,
  Store,
  LineChart,
  Package,
  PieChart
} from 'lucide-react';
import { useTheme } from '../context/ThemeContext';
import { supabase } from '../lib/supabase';

const Sidebar: React.FC = () => {
  const { isDarkMode } = useTheme();
  const [collapsed, setCollapsed] = useState(false);
  const [isLocked, setIsLocked] = useState(false);
  const [isHovering, setIsHovering] = useState(false);
  const [shopName, setShopName] = useState('Sweet Wholesale');
  const hoverTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  
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

    // Set up real-time subscription for shop name updates
    const subscription = supabase
      .channel('admin_settings_changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'admin_settings'
        },
        (payload) => {
          if (payload.new && payload.new.shop_name) {
            setShopName(payload.new.shop_name);
          }
        }
      )
      .subscribe();

    return () => {
      subscription.unsubscribe();
    };
  }, []);
  
  const navItems = [
    { path: '/admin/dashboard', icon: <LayoutDashboard size={20} />, label: 'Dashboard' },
    { path: '/admin/retailers', icon: <Store size={20} />, label: 'Retailers' },
    { path: '/admin/products', icon: <Package size={20} />, label: 'Products' },
    { path: '/admin/orders', icon: <ShoppingCart size={20} />, label: 'Orders' },
    { path: '/admin/profit-sharing', icon: <PieChart size={20} />, label: 'Profit Sharing' },
  ];
  
  const bottomNavItems = [
    { path: '/admin/settings', icon: <SettingsIcon size={20} />, label: 'Settings' }
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
        isDarkMode ? 'bg-slate-900 text-slate-100' : 'bg-white text-slate-800'
      } border-r ${isDarkMode ? 'border-slate-700' : 'border-slate-200'}`}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
    >
      <div className="flex items-center p-4 border-b border-slate-200 dark:border-slate-700">
        <Candy size={24} className="text-blue-600" />
        {!collapsed && <span className="ml-2 font-bold text-lg">{shopName}</span>}
      </div>
      
      <nav className="mt-6 mb-20">
        <ul>
          {navItems.map((item) => (
            <li key={item.path} className="mb-2">
              <NavLink
                to={item.path}
                className={({ isActive }) => 
                  `flex items-center p-3 ${collapsed ? 'justify-center' : 'px-4'} ${
                    isActive 
                      ? `${isDarkMode ? 'bg-slate-800' : 'bg-blue-50'} text-blue-600` 
                      : `${isDarkMode ? 'text-slate-400 hover:bg-slate-800' : 'text-slate-600 hover:bg-slate-100'}`
                  } rounded-lg transition-colors`
                }
              >
                <span>{item.icon}</span>
                {!collapsed && <span className="ml-3">{item.label}</span>}
              </NavLink>
            </li>
          ))}
        </ul>

        <ul className="absolute bottom-16 left-0 right-0">
          {bottomNavItems.map((item) => (
            <li key={item.path} className="mb-2">
              <NavLink
                to={item.path}
                className={({ isActive }) => 
                  `flex items-center p-3 ${collapsed ? 'justify-center' : 'px-4'} ${
                    isActive 
                      ? `${isDarkMode ? 'bg-slate-800' : 'bg-blue-50'} text-blue-600` 
                      : `${isDarkMode ? 'text-slate-400 hover:bg-slate-800' : 'text-slate-600 hover:bg-slate-100'}`
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
              ? 'bg-slate-800 hover:bg-slate-700' 
              : 'bg-slate-100 hover:bg-slate-200'
          } transition-colors`}
          title={isLocked ? "Unlock sidebar" : "Lock sidebar"}
        >
          {isLocked ? (
            <Lock size={16} className={`${isDarkMode ? 'text-blue-400' : 'text-blue-600'}`} />
          ) : (
            <Unlock size={16} className={`${isDarkMode ? 'text-slate-400' : 'text-slate-600'}`} />
          )}
        </button>
      </div>
    </aside>
  );
};

export default Sidebar;