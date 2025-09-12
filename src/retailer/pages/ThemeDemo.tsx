import React from 'react';
import ThemeColorPicker from '../components/ThemeColorPicker';
import '../styles/theme-colors.css';

const ThemeDemo: React.FC = () => {
  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 py-12 px-4">
      <div className="max-w-3xl mx-auto">
        <h1 className="text-3xl font-bold text-center mb-8 text-gray-900 dark:text-white">
          Theme Color Demo
        </h1>
        
        <ThemeColorPicker />
      </div>
    </div>
  );
};

export default ThemeDemo;