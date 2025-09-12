import React, { useEffect } from 'react';
import { CheckCircle, XCircle, AlertCircle, X } from 'lucide-react';
import { cn } from '@/lib/utils';

export interface NotificationProps {
  type: 'success' | 'error' | 'info';
  message: string;
  isOpen: boolean;
  onClose: () => void;
  duration?: number;
}

const icons = {
  success: CheckCircle,
  error: XCircle,
  info: AlertCircle,
};

const colors = {
  success: 'bg-green-100 text-green-800 dark:bg-green-900/50 dark:text-green-200',
  error: 'bg-red-100 text-red-800 dark:bg-red-900/50 dark:text-red-200',
  info: 'bg-blue-100 text-blue-800 dark:bg-blue-900/50 dark:text-blue-200',
};

export const Notification: React.FC<NotificationProps> = ({
  type,
  message,
  isOpen,
  onClose,
  duration = 3000,
}) => {
  const Icon = icons[type];

  useEffect(() => {
    if (isOpen && duration) {
      const timer = setTimeout(onClose, duration);
      return () => clearTimeout(timer);
    }
  }, [isOpen, duration, onClose]);

  if (!isOpen) return null;

  return (
    <div className="fixed top-4 right-4 z-50 animate-in fade-in slide-in-from-top-4">
      <div
        className={cn(
          'flex items-center p-4 rounded-lg shadow-lg min-w-[320px]',
          colors[type]
        )}
      >
        <Icon className="h-5 w-5 flex-shrink-0" />
        <p className="ml-3 mr-8 flex-1">{message}</p>
        <button
          onClick={onClose}
          className="flex-shrink-0 rounded-lg p-1 hover:bg-black/5 focus:outline-none focus:ring-2 focus:ring-black/10"
        >
          <X className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
};