

import PushOptIn from '@/components/PushOptIn';

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
    const map: Record<NotificationType, Partial<Record<NotificationChannel, boolean>>> = {};
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
    </div>
  );
};

export default NotificationPreferences;
