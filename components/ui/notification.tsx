'use client';

import { useEffect, useState } from 'react';
import { CheckCircle } from 'lucide-react';

interface NotificationProps {
  message: string;
  duration?: number;
  onClose?: () => void;
}

export function Notification({ message, duration = 3000, onClose }: NotificationProps) {
  const [isVisible, setIsVisible] = useState(true);

  useEffect(() => {
    const timer = setTimeout(() => {
      setIsVisible(false);
      onClose?.();
    }, duration);

    return () => clearTimeout(timer);
  }, [duration, onClose]);

  if (!isVisible) return null;

  return (
    <div className="fixed bottom-4 right-4 z-50 animate-slide-up">
      <div className="bg-green-50 border border-green-200 rounded-lg shadow-lg p-4 flex items-center space-x-3">
        <CheckCircle className="h-5 w-5 text-green-500" />
        <p className="text-sm font-medium text-green-800">{message}</p>
      </div>
    </div>
  );
} 