import React from 'react';
import PushOptIn from '@/components/PushOptIn';
import { useNotificationPreferences } from '@/hooks/useNotifications';
import type { NotificationChannel, NotificationType } from '@/types/notifications';
import { ASSISTANT_PAGE_KEYS, getAssistantPrefs, setAssistantPrefs } from '@/lib/assistantConfig';
import { loadAssistantPrefsFromServer, saveAssistantPrefsToServer } from '@/services/userSettings';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';

const channels: NotificationChannel[] = ['in_app', 'email', 'push'];
const types: NotificationType[] = ['session', 'deadline', 'admin_alert', 'admin_broadcast', 'custom'];

const channelLabels: Record<NotificationChannel, string> = {
  in_app: 'In-app',
  email: 'Email',
  push: 'Push',
};

const NotificationPreferences: React.FC = () => {
  const { preferences, loading, error, updatePreference } = useNotificationPreferences();

  // Build a map: type -> channel -> enabled
  const prefsMap: Record<NotificationType, Partial<Record<NotificationChannel, boolean>>> = React.useMemo(() => {
    const map: Record<NotificationType, Partial<Record<NotificationChannel, boolean>>> = {
      session: {},
      deadline: {},
      admin_alert: {},
      admin_broadcast: {},
      custom: {},
    };
    for (const t of types) map[t] = {};
    for (const pref of preferences) {
      if (types.includes(pref.type as NotificationType) && channels.includes(pref.channel as NotificationChannel)) {
        map[pref.type as NotificationType][pref.channel as NotificationChannel] = pref.enabled;
      }
    }
    return map;
  }, [preferences]);

  const handleToggle = (type: NotificationType, channel: NotificationChannel) => {
    const enabled = !!prefsMap[type]?.[channel];
    updatePreference(channel, type, !enabled);
  };

  return (
    <div className="container mx-auto p-4">
      <h1 className="text-2xl font-semibold mb-4">Notification preferences</h1>
      <PushOptIn />
      {loading && <div>Loading preferences…</div>}
      {error && <div className="text-red-500">{error}</div>}
      <div className="space-y-4">
        {types.map((type) => (
          <div key={type} className="p-3 border rounded flex items-center justify-between">
            <div className="font-medium">{type}</div>
            <div className="flex items-center gap-3">
              {channels.map((channel) => (
                <label key={channel} className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={!!prefsMap[type]?.[channel]}
                    onChange={() => handleToggle(type, channel)}
                  />
                  {channelLabels[channel]}
                </label>
              ))}
            </div>
          </div>
        ))}
      </div>

      {/* AI Assistant Settings */}
      <div className="mt-8">
        <Card>
          <CardHeader>
            <CardTitle>AI Assistant Settings</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {(() => {
              const prefs = getAssistantPrefs();
              const updateGlobal = async (enabled: boolean) => {
                const next = { ...prefs, enabled };
                setAssistantPrefs(next);
                await saveAssistantPrefsToServer(next);
              };
              const updatePage = async (key: string, enabled: boolean) => {
                const next = { ...prefs, pages: { ...prefs.pages, [key]: enabled } };
                setAssistantPrefs(next);
                await saveAssistantPrefsToServer(next);
              };
              // On first render, attempt to load from server
              void loadAssistantPrefsFromServer();
              return (
                <div className="space-y-3">
                  <label className="flex items-center gap-2">
                    <Checkbox checked={prefs.enabled} onCheckedChange={(v) => void updateGlobal(Boolean(v))} />
                    <span>Enable AI Assistant</span>
                  </label>
                  <div className="grid sm:grid-cols-2 gap-2">
                    {Object.entries(ASSISTANT_PAGE_KEYS).map(([label, key]) => (
                      <label key={key} className="flex items-center gap-2 p-2 border rounded">
                        <Checkbox checked={!!prefs.pages[key]} onCheckedChange={(v) => void updatePage(key, Boolean(v))} />
                        <span>{label}</span>
                        <span className="ml-auto text-xs text-muted-foreground">{key}</span>
                      </label>
                    ))}
                  </div>
                </div>
              );
            })()}
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default NotificationPreferences;
