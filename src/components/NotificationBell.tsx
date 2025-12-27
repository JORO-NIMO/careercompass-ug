import React from 'react';
import { Bell } from 'lucide-react';
import { useNotifications } from '@/hooks/useNotifications';

const NotificationBell: React.FC<{ onClick?: () => void }> = ({ onClick }) => {
  const { notifications } = useNotifications();
  const unread = notifications.filter(n => !n.read).length;
  return (
    <button
      aria-label="Notifications"
      onClick={onClick}
      className="relative p-2 rounded hover:bg-slate-100 dark:hover:bg-slate-800"
    >
      <Bell className="w-5 h-5" />
      {unread > 0 && (
        <span className="absolute -top-1 -right-1 bg-red-600 text-white text-xs rounded-full w-5 h-5 flex items-center justify-center">
          {unread}
        </span>
      )}
    </button>
  );
};

export default NotificationBell;
