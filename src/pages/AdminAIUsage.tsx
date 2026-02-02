import { useEffect, useMemo, useState } from 'react';
import { getAIUsageDaily, type AIUsageDailyRow } from '@/services/adminAIUsage';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Sparkline } from '@/components/charts/Sparkline';

function Bar({ value, max, label }: { value: number; max: number; label?: string }) {
  const pct = max > 0 ? Math.min(100, Math.round((value / max) * 100)) : 0;
  return (
    <div className="w-full">
      <div className="h-2 bg-muted rounded">
        <div className="h-2 bg-primary rounded" style={{ width: `${pct}%` }} />
      </div>
      {label && <div className="text-xs text-muted-foreground mt-1">{label}</div>}
    </div>
  );
}

export default function AdminAIUsage() {
  const [rows, setRows] = useState<AIUsageDailyRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    void (async () => {
      try {
        setLoading(true);
        const data = await getAIUsageDaily(30);
        setRows(data);
      } catch (e) {
        setError(e instanceof Error ? e.message : String(e));
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const totals = useMemo(() => {
    const asks = rows.reduce((sum, r) => sum + (r.asks || 0), 0);
    const responses = rows.reduce((sum, r) => sum + (r.responses || 0), 0);
    const tokens = rows.reduce((sum, r) => sum + (r.total_tokens || 0), 0);
    return { asks, responses, tokens };
  }, [rows]);

  const maxTokens = useMemo(() => Math.max(...rows.map((r) => r.total_tokens || 0), 0), [rows]);
  const sparkTokens = useMemo(() => rows.slice().reverse().map(r => r.total_tokens || 0), [rows]);

  return (
    <div className="container mx-auto p-6 space-y-6">
      <h1 className="text-2xl font-bold">AI Usage Analytics</h1>
      {error && <div className="text-destructive">{error}</div>}
      <div className="grid sm:grid-cols-3 gap-4">
        <Card className="p-4 flex flex-col gap-2">
          <div className="text-sm text-muted-foreground">Total Asks (30d)</div>
          <div className="text-2xl font-semibold">{totals.asks}</div>
          <Sparkline data={rows.slice().reverse().map(r => r.asks || 0)} />
        </Card>
        <Card className="p-4 flex flex-col gap-2">
          <div className="text-sm text-muted-foreground">Total Responses (30d)</div>
          <div className="text-2xl font-semibold">{totals.responses}</div>
          <Sparkline data={rows.slice().reverse().map(r => r.responses || 0)} />
        </Card>
        <Card className="p-4 flex flex-col gap-2">
          <div className="text-sm text-muted-foreground">Tokens Used (30d)</div>
          <div className="text-2xl font-semibold">{totals.tokens}</div>
          <Sparkline data={sparkTokens} />
        </Card>
      </div>

      <Card className="p-4">
        <div className="flex justify-between items-center mb-2">
          <h2 className="font-semibold">Daily Usage</h2>
          <Button variant="secondary" onClick={() => window.location.reload()} disabled={loading}>Refresh</Button>
        </div>
        <div className="overflow-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left border-b">
                <th className="py-2">Day</th>
                <th className="py-2">Asks</th>
                <th className="py-2">Responses</th>
                <th className="py-2">Tokens</th>
                <th className="py-2">Trend</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => (
                <tr key={r.day} className="border-b">
                  <td className="py-2">{new Date(r.day).toLocaleDateString()}</td>
                  <td className="py-2">{r.asks ?? 0}</td>
                  <td className="py-2">{r.responses ?? 0}</td>
                  <td className="py-2">{r.total_tokens ?? 0}</td>
                  <td className="py-2"><Bar value={r.total_tokens || 0} max={maxTokens} /></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
}