import React from 'react';
import { Calendar } from 'lucide-react';

interface DateRangePickerProps {
  startDate: string;
  endDate: string;
  onStartDateChange: (date: string) => void;
  onEndDateChange: (date: string) => void;
  isDarkMode: boolean;
}

const DateRangePicker: React.FC<DateRangePickerProps> = ({
  startDate,
  endDate,
  onStartDateChange,
  onEndDateChange,
  isDarkMode
}) => {
  return (
    <div className="flex items-center space-x-4">
      <div className="flex items-center">
        <Calendar size={20} className="mr-2 text-gray-400" />
        <input
          type="date"
          value={startDate}
          onChange={(e) => onStartDateChange(e.target.value)}
          className={`p-2 rounded-md ${
            isDarkMode 
              ? 'bg-gray-700 text-white border-gray-600' 
              : 'bg-white text-gray-900 border-gray-300'
          } border`}
        />
      </div>
      <span className="text-gray-500">to</span>
      <input
        type="date"
        value={endDate}
        onChange={(e) => onEndDateChange(e.target.value)}
        className={`p-2 rounded-md ${
          isDarkMode 
            ? 'bg-gray-700 text-white border-gray-600' 
            : 'bg-white text-gray-900 border-gray-300'
        } border`}
      />
    </div>
  );
};

export default DateRangePicker;