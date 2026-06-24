import React, { useState, useEffect } from 'react';
import { useTheme } from '../../context/ThemeContext';
import { supabase } from '../../lib/supabase';
import { 
  Moon, Sun, User, Bell, Shield, Eye, EyeOff, Send, 
  ChevronDown, ChevronUp, AlertCircle, Palette 
} from 'lucide-react';

type RetailerData = {
  shopName: string;
  retailerName: string;
  email: string;
  password: string;
  address: string;
  phone: string;
  role: string;
};

const RetailerSettings: React.FC = () => {
  const { isDarkMode, toggleTheme, themeColor, setThemeColor } = useTheme();
  const [expandedSection, setExpandedSection] = useState<string | null>('appearance');
  const [showPassword, setShowPassword] = useState(false);
  const [retailerData, setRetailerData] = useState<RetailerData>({
    shopName: '',
    retailerName: '',
    email: '',
    password: '••••••••',
    address: '',
    phone: '',
    role: 'Retailer'
  });
  const [notifications, setNotifications] = useState({
    orderUpdates: true,
    stockAlerts: true,
    promotions: true,
    systemUpdates: true
  });
  const [resetRequestSent, setResetRequestSent] = useState(false);
  const [roleError, setRoleError] = useState('');

  const themeColors = [
    { name: 'Green', value: 'green' },
    { name: 'Blue', value: 'blue' },
    { name: 'Purple', value: 'purple' },
    { name: 'Red', value: 'red' },
    { name: 'Yellow', value: 'yellow' },
    { name: 'Gray', value: 'gray' },
    { name: 'Pink', value: 'pink' },
    { name: 'Orange', value: 'orange' }
  ];

  const toggleSection = (section: string) => {
    setExpandedSection(expandedSection === section ? null : section);
  };

  useEffect(() => {
    fetchRetailerData();
  }, []);

  const fetchRetailerData = async () => {
    try {
      const userEmail = localStorage.getItem('userEmail');
      if (!userEmail) return;

      const { data: retailer, error } = await supabase
        .from('retailers')
        .select('*')
        .eq('email', userEmail)
        .single();

      if (error) throw error;

      setRetailerData({
        shopName: retailer.name,
        retailerName: retailer.contact_person,
        email: retailer.email || '',
        password: '••••••••',
        address: retailer.address,
        phone: retailer.phone,
        role: 'Retailer'
      });
    } catch (error) {
      console.error('Error fetching retailer data:', error);
      setRoleError('Failed to load retailer data');
    }
  };

  const handlePasswordResetRequest = async () => {
    try {
      const { error } = await supabase.auth.resetPasswordForEmail(retailerData.email);
      if (error) throw error;
      
      setResetRequestSent(true);
      setTimeout(() => setResetRequestSent(false), 3000);
    } catch (error) {
      console.error('Password reset error:', error);
    }
  };

  if (roleError) {
    return (
      <div className="p-6 text-red-500 flex items-center">
        <AlertCircle className="mr-2" />
        {roleError}
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">Settings</h1>

      {/* Appearance Section */}
      <div className={`rounded-lg shadow-md overflow-hidden ${isDarkMode ? 'bg-slate-700' : 'bg-white'}`}>
        <button
          className={`w-full px-6 py-4 flex justify-between items-center ${
            isDarkMode ? 'hover:bg-slate-600' : 'hover:bg-slate-50'
          }`}
          onClick={() => toggleSection('appearance')}
        >
          <div className="flex items-center">
            <Palette size={20} className="mr-3 text-blue-600" />
            <span className="font-semibold">Appearance</span>
          </div>
          {expandedSection === 'appearance' ? <ChevronUp size={20} /> : <ChevronDown size={20} />}
        </button>

        {expandedSection === 'appearance' && (
          <div className="p-6 border-t border-slate-200 dark:border-slate-600">
            <div className="space-y-6">
              <div>
                <h3 className="text-md font-medium mb-4">Theme Mode</h3>
                <div className="flex items-center space-x-4">
                  <button 
                    onClick={toggleTheme}
                    className={`flex items-center px-4 py-2 rounded-md ${
                      !isDarkMode 
                        ? 'bg-primary/10 text-primary' 
                        : 'bg-slate-600 text-slate-300'
                    }`}
                  >
                    <Sun size={18} className="mr-2" />
                    Light
                  </button>
                  
                  <button 
                    onClick={toggleTheme}
                    className={`flex items-center px-4 py-2 rounded-md ${
                      isDarkMode 
                        ? 'bg-primary/10 text-primary' 
                        : 'bg-slate-100 text-slate-700'
                    }`}
                  >
                    <Moon size={18} className="mr-2" />
                    Dark
                  </button>
                </div>
              </div>

              {isDarkMode && (
                <div>
                  <h3 className="text-md font-medium mb-4">Theme Color</h3>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                    {themeColors.map(color => (
                      <button
                        key={color.value}
                        onClick={() => setThemeColor(color.value as any)}
                        className={`flex items-center justify-center px-4 py-2 rounded-md transition-colors ${
                          themeColor === color.value
                            ? `bg-${color.value}-600 text-white`
                            : `bg-${color.value}-100 dark:bg-${color.value}-900/20 text-${color.value}-600 dark:text-${color.value}-400 hover:bg-${color.value}-200 dark:hover:bg-${color.value}-900/30`
                        }`}
                      >
                        {color.name}
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Account Section */}
      <div className={`rounded-lg shadow-md overflow-hidden ${isDarkMode ? 'bg-slate-700' : 'bg-white'}`}>
        <button
          className={`w-full px-6 py-4 flex justify-between items-center ${
            isDarkMode ? 'hover:bg-slate-600' : 'hover:bg-slate-50'
          }`}
          onClick={() => toggleSection('account')}
        >
          <div className="flex items-center">
            <User size={20} className="mr-3 text-blue-600" />
            <span className="font-semibold">Account</span>
          </div>
          {expandedSection === 'account' ? <ChevronUp size={20} /> : <ChevronDown size={20} />}
        </button>

        {expandedSection === 'account' && (
          <div className="p-6 border-t border-slate-200 dark:border-slate-600">
            <div className="space-y-4">
              <div>
                <label className={`block text-sm font-medium ${isDarkMode ? 'text-slate-300' : 'text-slate-700'}`}>
                  Shop Name
                </label>
                <input
                  type="text"
                  value={retailerData.shopName}
                  readOnly
                  className={`mt-1 block w-full rounded-md ${
                    isDarkMode 
                      ? 'bg-slate-600 border-slate-500' 
                      : 'bg-slate-50 border-slate-300'
                  } border px-3 py-2`}
                />
              </div>

              <div>
                <label className={`block text-sm font-medium ${isDarkMode ? 'text-slate-300' : 'text-slate-700'}`}>
                  Retailer Name
                </label>
                <input
                  type="text"
                  value={retailerData.retailerName}
                  readOnly
                  className={`mt-1 block w-full rounded-md ${
                    isDarkMode 
                      ? 'bg-slate-600 border-slate-500' 
                      : 'bg-slate-50 border-slate-300'
                  } border px-3 py-2`}
                />
              </div>

              <div>
                <label className={`block text-sm font-medium ${isDarkMode ? 'text-slate-300' : 'text-slate-700'}`}>
                  Email
                </label>
                <input
                  type="email"
                  value={retailerData.email}
                  readOnly
                  className={`mt-1 block w-full rounded-md ${
                    isDarkMode 
                      ? 'bg-slate-600 border-slate-500' 
                      : 'bg-slate-50 border-slate-300'
                  } border px-3 py-2`}
                />
              </div>

              <div>
                <label className={`block text-sm font-medium ${isDarkMode ? 'text-slate-300' : 'text-slate-700'}`}>
                  Password
                </label>
                <div className="mt-1 relative">
                  <input
                    type={showPassword ? "text" : "password"}
                    value={retailerData.password}
                    readOnly
                    className={`block w-full rounded-md ${
                      isDarkMode 
                        ? 'bg-slate-600 border-slate-500' 
                        : 'bg-slate-50 border-slate-300'
                    } border px-3 py-2 pr-10`}
                  />
                  <button
                    type="button"
                    className="absolute inset-y-0 right-0 px-3 flex items-center"
                    onClick={() => setShowPassword(!showPassword)}
                  >
                    {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                </div>
              </div>

              <div>
                <label className={`block text-sm font-medium ${isDarkMode ? 'text-slate-300' : 'text-slate-700'}`}>
                  Address
                </label>
                <input
                  type="text"
                  value={retailerData.address}
                  readOnly
                  className={`mt-1 block w-full rounded-md ${
                    isDarkMode 
                      ? 'bg-slate-600 border-slate-500' 
                      : 'bg-slate-50 border-slate-300'
                  } border px-3 py-2`}
                />
              </div>

              <div>
                <label className={`block text-sm font-medium ${isDarkMode ? 'text-slate-300' : 'text-slate-700'}`}>
                  Phone
                </label>
                <input
                  type="text"
                  value={retailerData.phone}
                  readOnly
                  className={`mt-1 block w-full rounded-md ${
                    isDarkMode 
                      ? 'bg-slate-600 border-slate-500' 
                      : 'bg-slate-50 border-slate-300'
                  } border px-3 py-2`}
                />
              </div>

              <div className="pt-4">
                <button
                  onClick={handlePasswordResetRequest}
                  className={`flex items-center px-4 py-2 rounded-md ${
                    isDarkMode 
                      ? 'bg-blue-600 hover:bg-blue-700' 
                      : 'bg-blue-600 hover:bg-blue-700'
                  } text-white`}
                >
                  <Send size={16} className="mr-2" />
                  Reset Password
                </button>
                {resetRequestSent && (
                  <p className="mt-2 text-sm text-green-500 flex items-center">
                    <AlertCircle size={16} className="mr-1" />
                    Password reset email sent
                  </p>
                )}
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Notifications Section */}
      <div className={`rounded-lg shadow-md overflow-hidden ${isDarkMode ? 'bg-slate-700' : 'bg-white'}`}>
        <button
          className={`w-full px-6 py-4 flex justify-between items-center ${
            isDarkMode ? 'hover:bg-slate-600' : 'hover:bg-slate-50'
          }`}
          onClick={() => toggleSection('notifications')}
        >
          <div className="flex items-center">
            <Bell size={20} className="mr-3 text-blue-600" />
            <span className="font-semibold">Notifications</span>
          </div>
          {expandedSection === 'notifications' ? <ChevronUp size={20} /> : <ChevronDown size={20} />}
        </button>

        {expandedSection === 'notifications' && (
          <div className="p-6 border-t border-slate-200 dark:border-slate-600">
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="font-medium">Order Updates</h3>
                  <p className={`text-sm ${isDarkMode ? 'text-slate-300' : 'text-slate-600'}`}>
                    Get notified about order status changes
                  </p>
                </div>
                <label className="relative inline-flex items-center cursor-pointer">
                  <input
                    type="checkbox"
                    checked={notifications.orderUpdates}
                    onChange={() => setNotifications(prev => ({ ...prev, orderUpdates: !prev.orderUpdates }))}
                    className="sr-only peer"
                  />
                  <div className={`w-11 h-6 bg-slate-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 dark:peer-focus:ring-blue-800 rounded-full peer dark:bg-slate-600 peer-checked:after:translate-x-full rtl:peer-checked:after:-translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:start-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all dark:border-slate-600 peer-checked:bg-blue-600`}></div>
                </label>
              </div>

              <div className="flex items-center justify-between">
                <div>
                  <h3 className="font-medium">Stock Alerts</h3>
                  <p className={`text-sm ${isDarkMode ? 'text-slate-300' : 'text-slate-600'}`}>
                    Get notified when stock is running low
                  </p>
                </div>
                <label className="relative inline-flex items-center cursor-pointer">
                  <input
                    type="checkbox"
                    checked={notifications.stockAlerts}
                    onChange={() => setNotifications(prev => ({ ...prev, stockAlerts: !prev.stockAlerts }))}
                    className="sr-only peer"
                  />
                  <div className={`w-11 h-6 bg-slate-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 dark:peer-focus:ring-blue-800 rounded-full peer dark:bg-slate-600 peer-checked:after:translate-x-full rtl:peer-checked:after:-translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:start-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all dark:border-slate-600 peer-checked:bg-blue-600`}></div>
                </label>
              </div>

              <div className="flex items-center justify-between">
                <div>
                  <h3 className="font-medium">Promotions</h3>
                  <p className={`text-sm ${isDarkMode ? 'text-slate-300' : 'text-slate-600'}`}>
                    Get notified about new promotions
                  </p>
                </div>
                <label className="relative inline-flex items-center cursor-pointer">
                  <input
                    type="checkbox"
                    checked={notifications.promotions}
                    onChange={() => setNotifications(prev => ({ ...prev, promotions: !prev.promotions }))}
                    className="sr-only peer"
                  />
                  <div className={`w-11 h-6 bg-slate-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 dark:peer-focus:ring-blue-800 rounded-full peer dark:bg-slate-600 peer-checked:after:translate-x-full rtl:peer-checked:after:-translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:start-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all dark:border-slate-600 peer-checked:bg-blue-600`}></div>
                </label>
              </div>

              <div className="flex items-center justify-between">
                <div>
                  <h3 className="font-medium">System Updates</h3>
                  <p className={`text-sm ${isDarkMode ? 'text-slate-300' : 'text-slate-600'}`}>
                    Get notified about system updates
                  </p>
                </div>
                <label className="relative inline-flex items-center cursor-pointer">
                  <input
                    type="checkbox"
                    checked={notifications.systemUpdates}
                    onChange={() => setNotifications(prev => ({ ...prev, systemUpdates: !prev.systemUpdates }))}
                    className="sr-only peer"
                  />
                  <div className={`w-11 h-6 bg-slate-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 dark:peer-focus:ring-blue-800 rounded-full peer dark:bg-slate-600 peer-checked:after:translate-x-full rtl:peer-checked:after:-translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:start-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all dark:border-slate-600 peer-checked:bg-blue-600`}></div>
                </label>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default RetailerSettings;