import { useEffect, useState, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import type { Notification, NotificationPreference, PushSubscription } from '@/types/notifications';

export function useNotifications() {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchNotifications = useCallback(async () => {
    setLoading(true);
    const { data, error } = await supabase.from('notifications').select('*').order('created_at', { ascending: false });
    if (error) setError(error.message);
    else setNotifications(data || []);
    setLoading(false);
  }, []);

  useEffect(() => { fetchNotifications(); }, [fetchNotifications]);

  const markAsRead = async (id: string) => {
    await supabase.from('notifications').update({ read: true }).eq('id', id);
    setNotifications((prev) => prev.map((n) => n.id === id ? { ...n, read: true } : n));
  };

  return { notifications, loading, error, fetchNotifications, markAsRead };
}

export function useNotificationPreferences() {
  const [preferences, setPreferences] = useState<NotificationPreference[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchPreferences = useCallback(async () => {
    setLoading(true);
    const { data, error } = await supabase.from('notification_preferences').select('*');
    if (error) setError(error.message);
    else setPreferences(data || []);
    setLoading(false);
  }, []);

  useEffect(() => { fetchPreferences(); }, [fetchPreferences]);

  const updatePreference = async (channel: string, type: string, enabled: boolean) => {
    await supabase.from('notification_preferences').upsert({ channel, type, enabled });
    fetchPreferences();
  };

  return { preferences, loading, error, updatePreference };
}

export async function registerPushSubscription(userId: string, vapidPublicKey: string) {
  if ('serviceWorker' in navigator && 'PushManager' in window) {
    const reg = await navigator.serviceWorker.register('/sw.js');
    const sub = await reg.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: vapidPublicKey,
    });
    await supabase.from('push_subscriptions').upsert({
      user_id: userId,
      endpoint: sub.endpoint,
      keys: sub.toJSON().keys,
    });
  }
}
