import React, { createContext, useContext, useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';

type ThemeColor = 'green' | 'blue' | 'purple' | 'red' | 'yellow' | 'gray' | 'pink' | 'orange';

type ThemeContextType = {
  isDarkMode: boolean;
  toggleTheme: () => void;
  themeColor: ThemeColor;
  setThemeColor: (color: ThemeColor) => void;
};

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

export const ThemeProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [isDarkMode, setIsDarkMode] = useState(() => {
    const savedTheme = localStorage.getItem('theme');
    return savedTheme === 'dark' || 
      (!savedTheme && window.matchMedia('(prefers-color-scheme: dark)').matches);
  });
  const [themeColor, setThemeColorState] = useState<ThemeColor>('blue');
  useEffect(() => {
    const fetchUserPreferences = async () => {
      try {
        const userEmail = localStorage.getItem('userEmail');
        if (!userEmail) return;

        const { data: user, error: userError } = await supabase
          .from('users')
          .select('id')
          .eq('email', userEmail)
          .single();

        if (userError || !user) return;

        const { data: preferences } = await supabase
          .from('user_preferences')
          .select('theme_color')
          .eq('user_id', user.id)
          .single();

        if (preferences?.theme_color) {
          setThemeColorState(preferences.theme_color as ThemeColor);
          document.documentElement.setAttribute('data-color-theme', preferences.theme_color);
          // Add theme class to html element
          document.documentElement.className = `${isDarkMode ? 'dark' : ''} theme-${preferences.theme_color}`;
        }
      } catch (error) {
        console.error('Error fetching user preferences:', error);
      }
    };

    fetchUserPreferences();
  }, [isDarkMode]);

  useEffect(() => {
    if (isDarkMode) {
      document.documentElement.classList.add('dark');
      localStorage.setItem('theme', 'dark');
    } else {
      document.documentElement.classList.remove('dark');
      localStorage.setItem('theme', 'light');
    }
    // Ensure theme color class is maintained when dark mode changes
    document.documentElement.className = `${isDarkMode ? 'dark' : ''} theme-${themeColor}`;
  }, [isDarkMode, themeColor]);

  const toggleTheme = () => {
    setIsDarkMode(!isDarkMode);
  };

  const setThemeColor = async (color: ThemeColor) => {
    try {
      const userEmail = localStorage.getItem('userEmail');
      if (!userEmail) return;

      const { data: user, error: userError } = await supabase
        .from('users')
        .select('id')
        .eq('email', userEmail)
        .single();

      if (userError || !user) return;

      // First check if a preference already exists
      const { data: existingPreference } = await supabase
        .from('user_preferences')
        .select('id')
        .eq('user_id', user.id)
        .single();

      if (existingPreference) {
        // Update existing preference
        const { error: updateError } = await supabase
          .from('user_preferences')
          .update({ theme_color: color })
          .eq('user_id', user.id);

        if (updateError) throw updateError;
      } else {
        // Insert new preference
        const { error: insertError } = await supabase
          .from('user_preferences')
          .insert({ 
            user_id: user.id,
            theme_color: color
          });

        if (insertError) throw insertError;
      }

      setThemeColorState(color);
      document.documentElement.setAttribute('data-color-theme', color);
      // Update theme class
      document.documentElement.className = `${isDarkMode ? 'dark' : ''} theme-${color}`;
    } catch (error) {
      console.error('Error updating theme color:', error);
    }
  };

  return (
    <ThemeContext.Provider value={{ isDarkMode, toggleTheme, themeColor, setThemeColor }}>
      {children}
    </ThemeContext.Provider>
  );
};

export const useTheme = (): ThemeContextType => {
  const context = useContext(ThemeContext);
  if (context === undefined) {
    throw new Error('useTheme must be used within a ThemeProvider');
  }
  return context;
};