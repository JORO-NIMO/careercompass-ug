import { useEffect, useState } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { listUserIPs, flagIP, unflagIP, type UserIp } from '@/services/adminIPs';
import { getAdminSetting, setAdminSetting } from '@/services/adminSettings';

export default function AdminSecurity() {
  const [quota, setQuota] = useState<number>(150000);
  const [threshold, setThreshold] = useState<number>(0.9);
  const [ips, setIps] = useState<UserIp[]>([]);
  const [loadingIps, setLoadingIps] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    void (async () => {
      try {
        const [q, t] = await Promise.all([
          getAdminSetting<number>('ai_token_daily_quota'),
          getAdminSetting<number>('ai_token_alert_threshold'),
        ]);
        if (typeof q === 'number') setQuota(q);
        if (typeof t === 'number') setThreshold(t);
      } catch (e) {
        // ignore
      }
    })();
  }, []);

  useEffect(() => {
    void (async () => {
      try {
        setLoadingIps(true);
        const data = await listUserIPs(300);
        setIps(data);
      } catch (e) {
        setError(e instanceof Error ? e.message : String(e));
      } finally {
        setLoadingIps(false);
      }
    })();
  }, []);

  async function saveSettings() {
    try {
      setSaving(true);
      await setAdminSetting('ai_token_daily_quota', quota);
      await setAdminSetting('ai_token_alert_threshold', threshold);
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setSaving(false);
    }
  }

  async function onFlag(id: number) {
    await flagIP(id, 'Policy infringement');
    setIps((prev) => prev.map((x) => (x.id === id ? { ...x, flagged: true, flagged_reason: 'Policy infringement', flagged_at: new Date().toISOString() } : x)));
  }
  async function onUnflag(id: number) {
    await unflagIP(id);
    setIps((prev) => prev.map((x) => (x.id === id ? { ...x, flagged: false, flagged_reason: null, flagged_at: null, flagged_by: null } : x)));
  }

  return (
    <div className="container mx-auto p-6 space-y-6">
      <h1 className="text-2xl font-bold">Admin Security & AI Settings</h1>
      {error && <div className="text-destructive bg-destructive/10 p-3 rounded-md">{typeof error === 'string' ? error : 'An error occurred'}</div>}

      <Card className="p-4 space-y-4">
        <h2 className="font-semibold">AI Quota & Alerts</h2>
        <div className="grid sm:grid-cols-3 gap-4 items-end">
          <div>
            <label className="text-sm text-muted-foreground">Daily Token Quota</label>
            <Input type="number" value={quota} onChange={(e) => setQuota(Number(e.target.value))} />
          </div>
          <div>
            <label className="text-sm text-muted-foreground">Alert Threshold (0-1)</label>
            <Input type="number" step="0.01" min={0} max={1} value={threshold} onChange={(e) => setThreshold(Number(e.target.value))} />
          </div>
          <div>
            <Button onClick={saveSettings} disabled={saving}>Save</Button>
          </div>
        </div>
      </Card>

      <Card className="p-4 space-y-4">
        <h2 className="font-semibold">User IP Addresses</h2>
        <div className="overflow-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left border-b">
                <th className="py-2">IP</th>
                <th className="py-2">User</th>
                <th className="py-2">User Agent</th>
                <th className="py-2">First Seen</th>
                <th className="py-2">Last Seen</th>
                <th className="py-2">Status</th>
                <th className="py-2"></th>
              </tr>
            </thead>
            <tbody>
              {loadingIps ? (
                <tr><td colSpan={7} className="py-4">Loading…</td></tr>
              ) : (
                ips.map((r) => (
                  <tr key={r.id} className="border-b">
                    <td className="py-2 font-mono">{r.ip}</td>
                    <td className="py-2">{r.user_id?.slice(0, 8) || '—'}</td>
                    <td className="py-2 truncate max-w-[240px]" title={r.user_agent || ''}>{r.user_agent || '—'}</td>
                    <td className="py-2">{new Date(r.first_seen).toLocaleString()}</td>
                    <td className="py-2">{new Date(r.last_seen).toLocaleString()}</td>
                    <td className="py-2">{r.flagged ? 'Flagged' : 'OK'}</td>
                    <td className="py-2 text-right">
                      {r.flagged ? (
                        <Button size="sm" variant="secondary" onClick={() => void onUnflag(r.id)}>Unflag</Button>
                      ) : (
                        <Button size="sm" variant="destructive" onClick={() => void onFlag(r.id)}>Flag</Button>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
}
