import React, { useState } from 'react';

interface ThemeColor {
  name: string;
  value: string;
  bgClass: string;
  hoverClass: string;
}

const ThemeColorPicker: React.FC = () => {
  const [selectedColor, setSelectedColor] = useState<string>('green');

  const themeColors: ThemeColor[] = [
    { 
      name: 'Green',
      value: 'green',
      bgClass: 'bg-blue-600',
      hoverClass: 'hover:bg-blue-700'
    },
    { 
      name: 'Blue',
      value: 'blue',
      bgClass: 'bg-blue-600',
      hoverClass: 'hover:bg-blue-700'
    },
    { 
      name: 'Purple',
      value: 'purple',
      bgClass: 'bg-purple-600',
      hoverClass: 'hover:bg-purple-700'
    },
    { 
      name: 'Red',
      value: 'red',
      bgClass: 'bg-red-600',
      hoverClass: 'hover:bg-red-700'
    },
    { 
      name: 'Yellow',
      value: 'yellow',
      bgClass: 'bg-yellow-600',
      hoverClass: 'hover:bg-yellow-700'
    },
    { 
      name: 'Orange',
      value: 'orange',
      bgClass: 'bg-orange-600',
      hoverClass: 'hover:bg-orange-700'
    }
  ];

  const handleColorChange = (color: string) => {
    setSelectedColor(color);
    document.documentElement.setAttribute('data-theme', color);
  };

  return (
    <div className="p-6 max-w-md mx-auto bg-white rounded-xl shadow-md dark:bg-slate-800">
      <h2 className="text-xl font-bold mb-4 text-slate-900 dark:text-white">
        Choose Theme Color
      </h2>
      
      <div className="grid grid-cols-2 gap-4">
        {themeColors.map((color) => (
          <button
            key={color.value}
            onClick={() => handleColorChange(color.value)}
            className={`
              flex items-center justify-center px-4 py-2 rounded-md
              transition-colors duration-200
              ${color.bgClass} ${color.hoverClass}
              ${selectedColor === color.value ? 'ring-2 ring-offset-2 ring-offset-white dark:ring-offset-gray-800' : ''}
              text-white font-medium
            `}
          >
            {color.name}
          </button>
        ))}
      </div>

      <div className="mt-4 p-4 rounded-md bg-slate-100 dark:bg-slate-700">
        <p className="text-sm text-slate-600 dark:text-slate-300">
          Current theme: <span className="font-medium">{selectedColor}</span>
        </p>
      </div>
    </div>
  );
};

export default ThemeColorPicker;