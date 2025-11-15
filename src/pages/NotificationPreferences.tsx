import React, { useEffect, useState } from 'react';

const defaultPrefs = {
  session: { in_app: true, email: true },
  deadline: { in_app: true, email: true },
  admin_alert: { in_app: true, email: true },
};

const NotificationPreferences: React.FC = () => {
  const [prefs, setPrefs] = useState(defaultPrefs);

  useEffect(() => {
    // load preferences
    fetch('/api/notification-preferences')
      .then((r) => r.json())
      .then((d) => d.preferences && setPrefs(d.preferences))
      .catch(() => {});
  }, []);

  const toggle = (key: string, channel: string) => {
    setPrefs((p: any) => ({ ...p, [key]: { ...p[key], [channel]: !p[key][channel] } }));
  };

  const save = async () => {
    await fetch('/api/notification-preferences', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ preferences: prefs }) });
    alert('Saved');
  };

  return (
    <div className="container mx-auto p-4">
      <h1 className="text-2xl font-semibold mb-4">Notification preferences</h1>
      <div className="space-y-4">
        {Object.keys(prefs).map((key) => (
          <div key={key} className="p-3 border rounded flex items-center justify-between">
            <div className="font-medium">{key}</div>
            <div className="flex items-center gap-3">
              <label className="flex items-center gap-2">
                <input type="checkbox" checked={prefs[key].in_app} onChange={() => toggle(key, 'in_app')} /> In-app
              </label>
              <label className="flex items-center gap-2">
                <input type="checkbox" checked={prefs[key].email} onChange={() => toggle(key, 'email')} /> Email
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
