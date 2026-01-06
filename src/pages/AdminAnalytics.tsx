import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Users, Eye, Activity, Globe } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";

interface AnalyticsMetrics {
  unique_visitors: number;
  page_views: number;
  active_now: number;
  top_pages: { path: string; views: number }[];
}

const AdminAnalytics = () => {
  const [metrics, setMetrics] = useState<AnalyticsMetrics | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchMetrics = async () => {
      try {
        const { data, error } = await (supabase.rpc('get_analytics_metrics') as any);
        if (error) throw error;
        setMetrics(data as AnalyticsMetrics);
      } catch (err) {
        console.error("Failed to fetch analytics:", err);
      } finally {
        setLoading(false);
      }
    };

    fetchMetrics();
    // Refresh every 30s
    const interval = setInterval(fetchMetrics, 30000);
    return () => clearInterval(interval);
  }, []);

  if (loading) {
    return (
      <div className="container mx-auto p-6 space-y-6">
        <h1 className="text-3xl font-bold">Analytics Dashboard</h1>
        <div className="grid gap-6 md:grid-cols-3">
          {[1, 2, 3].map((i) => <Skeleton key={i} className="h-32 rounded-xl" />)}
        </div>
        <Skeleton className="h-64 rounded-xl" />
      </div>
    );
  }

  if (!metrics) return <div>Failed to load data.</div>;

  return (
    <div className="container mx-auto p-6 space-y-8">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Analytics Dashboard</h1>
        <p className="text-muted-foreground">Real-time overview of platform usage.</p>
      </div>

      <div className="grid gap-6 md:grid-cols-3">
        {/* Active Now */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Active Now</CardTitle>
            <Activity className="h-4 w-4 text-green-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600 animate-pulse">
              {metrics.active_now}
            </div>
            <p className="text-xs text-muted-foreground">
              Users active in last 5 mins
            </p>
          </CardContent>
        </Card>

        {/* Unique Visitors */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Unique Visitors</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{metrics.unique_visitors.toLocaleString()}</div>
            <p className="text-xs text-muted-foreground">
              Total unique devices (Est.)
            </p>
          </CardContent>
        </Card>

        {/* Total Page Views */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Page Views</CardTitle>
            <Eye className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{metrics.page_views.toLocaleString()}</div>
            <p className="text-xs text-muted-foreground">
              Last 30 days
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Top Pages */}
      <Card className="col-span-3">
        <CardHeader>
          <CardTitle>Top Pages (30 Days)</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {metrics.top_pages.map((page, i) => (
              <div key={i} className="flex items-center justify-between border-b pb-2 last:border-0 last:pb-0">
                <div className="flex items-center gap-2">
                  <span className="text-sm font-mono text-muted-foreground w-6">#{i + 1}</span>
                  <span className="font-medium truncate max-w-[300px] md:max-w-md" title={page.path}>
                    {page.path}
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="font-bold">{page.views.toLocaleString()}</span>
                  <span className="text-xs text-muted-foreground">views</span>
                </div>
              </div>
            ))}
            {metrics.top_pages.length === 0 && (
              <p className="text-muted-foreground text-center py-4">No data available yet.</p>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default AdminAnalytics;
