import React, { useEffect, useState } from 'react';
import type {
  NotificationChannel,
  NotificationPreferencesState,
  NotificationType,
} from '@/types/notifications';

const defaultPrefs: NotificationPreferencesState = {
  session: { in_app: true, email: true },
  deadline: { in_app: true, email: true },
  admin_alert: { in_app: true, email: true },
};

interface NotificationPreferencesResponse {
  preferences?: NotificationPreferencesState;
}

const NotificationPreferences: React.FC = () => {
  const [prefs, setPrefs] = useState<NotificationPreferencesState>(defaultPrefs);

  useEffect(() => {
    let isMounted = true;

    const loadPreferences = async () => {
      try {
        const response = await fetch('/api/notification-preferences');
        if (!response.ok) {
          return;
        }
        const data = (await response.json()) as NotificationPreferencesResponse;
        if (isMounted && data.preferences) {
          setPrefs((current) => ({ ...current, ...data.preferences }));
        }
      } catch (error) {
        console.error('Failed to load notification preferences', error);
      }
    };

    void loadPreferences();

    return () => {
      isMounted = false;
    };
  }, []);

  const toggle = (type: NotificationType, channel: NotificationChannel) => {
    setPrefs((current) => {
      const currentTypePrefs = current[type] ?? {};
      const nextValue = !currentTypePrefs[channel];
      return {
        ...current,
        [type]: {
          ...currentTypePrefs,
          [channel]: nextValue,
        },
      } satisfies NotificationPreferencesState;
    });
  };

  const save = async () => {
    await fetch('/api/notification-preferences', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ preferences: prefs }),
    });
    alert('Saved');
  };

  const preferenceEntries = Object.entries(prefs) as Array<[
    NotificationType,
    NotificationPreferencesState[NotificationType]
  ]>;

  return (
    <div className="container mx-auto p-4">
      <h1 className="text-2xl font-semibold mb-4">Notification preferences</h1>
      <div className="space-y-4">
        {preferenceEntries.map(([type, channels]) => (
          <div key={type} className="p-3 border rounded flex items-center justify-between">
            <div className="font-medium">{type}</div>
            <div className="flex items-center gap-3">
              <label className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={Boolean(channels?.in_app)}
                  onChange={() => toggle(type, 'in_app')}
                />
                In-app
              </label>
              <label className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={Boolean(channels?.email)}
                  onChange={() => toggle(type, 'email')}
                />
                Email
              </label>
            </div>
          </div>
        ))}
      </div>
      <div className="mt-4">
        <button onClick={save} className="px-3 py-1 rounded bg-primary text-white">Save preferences</button>
      </div>
    </div>
  );
};

export default NotificationPreferences;
