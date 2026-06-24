import React, { useState, useEffect } from 'react';
import { useTheme } from '../../context/ThemeContext';
import { supabase } from '../../lib/supabase';
import { Moon, Sun, ChevronDown, ChevronUp, Palette, Store } from 'lucide-react';
import { Notification } from '../../components/ui/notification';

const AdminSettings: React.FC = () => {
  const { isDarkMode, toggleTheme, themeColor, setThemeColor } = useTheme();
  const [expandedSection, setExpandedSection] = useState<string | null>('shop');
  const [shopName, setShopName] = useState('Sweet & Snacks Wholesaler');
  const [notification, setNotification] = useState<{ type: 'success' | 'error', message: string } | null>(null);
  const [isEditing, setIsEditing] = useState(false);

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

  useEffect(() => {
    fetchShopName();
  }, []);

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

  const toggleSection = (section: string) => {
    setExpandedSection(expandedSection === section ? null : section);
  };

  const handleShopNameUpdate = async () => {
    try {
      const { error } = await supabase
        .from('admin_settings')
        .upsert({ id: 1, shop_name: shopName });

      if (error) throw error;

      setNotification({ type: 'success', message: 'Shop name updated successfully' });
      setIsEditing(false);
    } catch (error) {
      console.error('Error updating shop name:', error);
      setNotification({ type: 'error', message: 'Failed to update shop name' });
    }

    setTimeout(() => setNotification(null), 3000);
  };

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">Admin Settings</h1>

      {notification && (
        <Notification
          type={notification.type}
          message={notification.message}
          isOpen={!!notification}
          onClose={() => setNotification(null)}
        />
      )}

      {/* Shop Name Section */}
      <div className={`rounded-lg shadow-md overflow-hidden ${isDarkMode ? 'bg-slate-700' : 'bg-white'}`}>
        <button
          className={`w-full px-6 py-4 flex justify-between items-center ${
            isDarkMode ? 'hover:bg-slate-600' : 'hover:bg-slate-50'
          }`}
          onClick={() => toggleSection('shop')}
        >
          <div className="flex items-center">
            <Store size={20} className="mr-3 text-blue-600" />
            <span className="font-semibold">Shop Settings</span>
          </div>
          {expandedSection === 'shop' ? <ChevronUp size={20} /> : <ChevronDown size={20} />}
        </button>

        {expandedSection === 'shop' && (
          <div className="p-6 border-t border-slate-200 dark:border-slate-600">
            <div className="space-y-4">
              <div>
                <label className={`block text-sm font-medium mb-1 ${isDarkMode ? 'text-slate-300' : 'text-slate-700'}`}>
                  Shop Name
                </label>
                <div className="flex items-center space-x-2">
                  {isEditing ? (
                    <>
                      <input
                        type="text"
                        value={shopName}
                        onChange={(e) => setShopName(e.target.value)}
                        className={`flex-1 px-3 py-2 rounded-md ${
                          isDarkMode 
                            ? 'bg-slate-600 border-slate-500' 
                            : 'bg-slate-50 border-slate-300'
                        } border`}
                      />
                      <button
                        onClick={handleShopNameUpdate}
                        className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
                      >
                        Save
                      </button>
                      <button
                        onClick={() => {
                          setIsEditing(false);
                          fetchShopName();
                        }}
                        className="px-4 py-2 bg-slate-500 text-white rounded-md hover:bg-slate-600"
                      >
                        Cancel
                      </button>
                    </>
                  ) : (
                    <>
                      <span className={`flex-1 ${isDarkMode ? 'text-slate-300' : 'text-slate-700'}`}>
                        {shopName}
                      </span>
                      <button
                        onClick={() => setIsEditing(true)}
                        className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
                      >
                        Edit
                      </button>
                    </>
                  )}
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default AdminSettings;