import React, { useEffect, useState } from 'react';
import NotificationBell from '@/components/NotificationBell';

type NotificationItem = {
  id: string;
  title: string;
  body?: string;
  created_at?: string;
  read?: boolean;
};

const NotificationsPage: React.FC = () => {
  const [items, setItems] = useState<NotificationItem[]>([]);

  useEffect(() => {
    // fetch initial notifications (placeholder)
    fetch('/api/notifications')
      .then((r) => r.json())
      .then((data) => setItems(data.items ?? []))
      .catch(() => setItems([]));
  }, []);

  return (
    <div className="container mx-auto p-4">
      <div className="flex items-center justify-between mb-4">
        <h1 className="text-2xl font-semibold">Notifications</h1>
        <NotificationBell unread={items.filter((i) => !i.read).length} />
      </div>

      <div className="space-y-3">
        {items.length === 0 && <div className="text-muted">No notifications yet.</div>}
        {items.map((n) => (
          <div key={n.id} className="p-3 border rounded bg-card">
            <div className="font-medium">{n.title}</div>
            <div className="text-sm text-muted">{n.body}</div>
            <div className="text-xs text-muted mt-1">{n.created_at}</div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default NotificationsPage;
