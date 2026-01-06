import React from 'react';
import NotificationBell from '@/components/NotificationBell';
import { useNotifications } from '@/hooks/useNotifications';

const NotificationsPage: React.FC = () => {
  const { notifications, loading, error } = useNotifications();

  return (
    <div className="container mx-auto p-4">
      <div className="flex items-center justify-between mb-4">
        <h1 className="text-2xl font-semibold">Notifications</h1>
        <NotificationBell />
      </div>

      {loading && <div>Loading notifications…</div>}
      {error && <div className="text-red-500">{error}</div>}
      <div className="space-y-3">
        {notifications.length === 0 && !loading && <div className="text-muted">No notifications yet.</div>}
        {notifications.map((n) => (
          <div key={n.id} className="p-3 border rounded bg-card">
            <div className="font-medium">{n.message || n.type}</div>
            {n.metadata?.body && <div className="text-sm text-muted">{n.metadata.body}</div>}
            <div className="text-xs text-muted mt-1">{n.created_at}</div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default NotificationsPage;
