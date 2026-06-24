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
        <Calendar size={20} className="mr-2 text-slate-400" />
        <input
          type="date"
          value={startDate}
          onChange={(e) => onStartDateChange(e.target.value)}
          className={`p-2 rounded-md ${
            isDarkMode 
              ? 'bg-slate-700 text-white border-slate-600' 
              : 'bg-white text-slate-900 border-slate-300'
          } border`}
        />
      </div>
      <span className="text-slate-500">to</span>
      <input
        type="date"
        value={endDate}
        onChange={(e) => onEndDateChange(e.target.value)}
        className={`p-2 rounded-md ${
          isDarkMode 
            ? 'bg-slate-700 text-white border-slate-600' 
            : 'bg-white text-slate-900 border-slate-300'
        } border`}
      />
    </div>
  );
};

export default DateRangePicker;