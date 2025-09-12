import React, { useState, useEffect } from 'react';
import { useTheme } from '../../context/ThemeContext';
import { supabase } from '../../lib/supabase';
import { Store, ChevronDown, ChevronUp, Palette, Moon, Sun } from 'lucide-react';
import { Notification } from '../../components/ui/notification';

const RetailerSettings: React.FC = () => {
  const { isDarkMode, toggleTheme, themeColor, setThemeColor } = useTheme();
  const [expandedSection, setExpandedSection] = useState<string | null>('shop');
  const [shopName, setShopName] = useState('Sweet & Snacks Wholesaler');
  const [notification, setNotification] = useState<{ type: 'success' | 'error', message: string } | null>(null);
  const [isEditing, setIsEditing] = useState(false);

  const themeColors = [
    { name: 'Green', value: 'green' },
    { name: 'Black', value: 'black' },
    { name: 'Blue', value: 'blue' },
    { name: 'Red', value: 'red' },
    { name: 'Purple', value: 'purple' }
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
      <h1 className="text-2xl font-bold">Settings</h1>

      {notification && (
        <Notification
          type={notification.type}
          message={notification.message}
          isOpen={!!notification}
          onClose={() => setNotification(null)}
        />
      )}

    </div>
  );
};

export default RetailerSettings;