import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  ArrowLeft,
  Activity,
  Bell,
  CheckCircle2,
  XCircle,
  Clock,
  TrendingUp,
  RefreshCw,
  Mail,
} from 'lucide-react';

interface WorkflowStats {
  workflow_name: string;
  total_runs: number;
  completed_runs: number;
  failed_runs: number;
  avg_duration_ms: number;
  total_items_processed: number;
  total_items_succeeded: number;
  total_items_failed: number;
  success_rate: number;
}

interface NotificationStats {
  channel: string;
  total_sent: number;
  delivered: number;
  failed: number;
  delivery_rate: number;
}

interface EmailIngestionStats {
  summary: {
    total_emails: number;
    processed: number;
    failed: number;
    pending: number;
    total_jobs_extracted: number;
    total_jobs_inserted: number;
    avg_trust_score: number;
  };
  by_source: {
    source_name: string;
    trust_score: number;
    total_emails_processed: number;
    total_jobs_extracted: number;
    last_email_at: string | null;
  }[];
  recent_emails: {
    id: string;
    from_address: string;
    subject: string;
    processing_status: string;
    jobs_extracted: number;
    jobs_inserted: number;
    source_trust_score: number;
    received_at: string;
    error_message: string | null;
  }[];
}

interface RecentLog {
  id: string;
  workflow_name: string;
  status: string;
  started_at: string;
  completed_at: string | null;
  duration_ms: number | null;
  items_processed: number;
  items_succeeded: number;
  items_failed: number;
  error_message: string | null;
}

export default function AdminWorkflowAnalytics() {
  const { user, profile, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const [timeRange, setTimeRange] = useState('7');
  const [loading, setLoading] = useState(true);
  const [workflowStats, setWorkflowStats] = useState<WorkflowStats[]>([]);
  const [notificationStats, setNotificationStats] = useState<NotificationStats[]>([]);
  const [emailStats, setEmailStats] = useState<EmailIngestionStats | null>(null);
  const [recentLogs, setRecentLogs] = useState<RecentLog[]>([]);

  useEffect(() => {
    if (!authLoading && (!user || profile?.role !== 'admin')) {
      navigate('/');
    }
  }, [user, profile, authLoading, navigate]);

  const fetchStats = async () => {
    setLoading(true);
    try {
      const days = parseInt(timeRange);

      // Fetch workflow health stats
      const { data: workflowData, error: workflowError } = await supabase.rpc(
        'get_workflow_health_stats',
        { p_days: days }
      );
      if (workflowError) throw workflowError;
      setWorkflowStats(workflowData || []);

      // Fetch notification delivery stats
      const { data: notifData, error: notifError } = await supabase.rpc(
        'get_notification_delivery_stats',
        { p_days: days }
      );
      if (notifError) throw notifError;
      setNotificationStats(notifData || []);

      // Fetch email ingestion stats
      const { data: emailData, error: emailError } = await supabase.rpc(
        'get_email_ingestion_stats',
        { p_days: days }
      );
      if (!emailError && emailData) {
        setEmailStats(emailData as EmailIngestionStats);
      }

      // Fetch recent logs
      const since = new Date();
      since.setDate(since.getDate() - days);
      
      const { data: logsData, error: logsError } = await supabase
        .from('workflow_logs')
        .select('*')
        .gte('started_at', since.toISOString())
        .order('started_at', { ascending: false })
        .limit(50);
      
      if (logsError) throw logsError;
      setRecentLogs(logsData || []);
    } catch (error) {
      console.error('Failed to fetch analytics:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (user && profile?.role === 'admin') {
      fetchStats();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user, profile, timeRange]);

  const formatDuration = (ms: number | null) => {
    if (ms === null) return '—';
    if (ms < 1000) return `${ms}ms`;
    if (ms < 60000) return `${(ms / 1000).toFixed(1)}s`;
    return `${(ms / 60000).toFixed(1)}m`;
  };

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleString();
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'completed':
        return <Badge className="bg-green-100 text-green-800">Completed</Badge>;
      case 'failed':
        return <Badge className="bg-red-100 text-red-800">Failed</Badge>;
      case 'running':
        return <Badge className="bg-blue-100 text-blue-800">Running</Badge>;
      default:
        return <Badge variant="secondary">{status}</Badge>;
    }
  };

  // Calculate totals
  const totalRuns = workflowStats.reduce((sum, w) => sum + w.total_runs, 0);
  const totalCompleted = workflowStats.reduce((sum, w) => sum + w.completed_runs, 0);
  const totalFailed = workflowStats.reduce((sum, w) => sum + w.failed_runs, 0);
  const overallSuccessRate = totalRuns > 0 ? (totalCompleted / totalRuns * 100).toFixed(1) : '0';

  const totalNotifications = notificationStats.reduce((sum, n) => sum + n.total_sent, 0);
  const totalDelivered = notificationStats.reduce((sum, n) => sum + n.delivered, 0);
  const overallDeliveryRate = totalNotifications > 0 
    ? (totalDelivered / totalNotifications * 100).toFixed(1) 
    : '0';

  if (authLoading || !user || profile?.role !== 'admin') {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <RefreshCw className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="container mx-auto py-8 px-4">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={() => navigate('/admin')}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div>
            <h1 className="text-2xl font-bold">Workflow Analytics</h1>
            <p className="text-muted-foreground">Monitor pipeline health and notifications</p>
          </div>
        </div>
        <div className="flex items-center gap-4">
          <Select value={timeRange} onValueChange={setTimeRange}>
            <SelectTrigger className="w-40">
              <SelectValue placeholder="Time range" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="1">Last 24 hours</SelectItem>
              <SelectItem value="7">Last 7 days</SelectItem>
              <SelectItem value="30">Last 30 days</SelectItem>
              <SelectItem value="90">Last 90 days</SelectItem>
            </SelectContent>
          </Select>
          <Button variant="outline" onClick={fetchStats} disabled={loading}>
            <RefreshCw className={`h-4 w-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Total Runs</CardTitle>
            <Activity className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalRuns}</div>
            <p className="text-xs text-muted-foreground">
              {workflowStats.length} workflows
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Success Rate</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{overallSuccessRate}%</div>
            <p className="text-xs text-muted-foreground">
              {totalCompleted} succeeded, {totalFailed} failed
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Notifications</CardTitle>
            <Bell className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalNotifications}</div>
            <p className="text-xs text-muted-foreground">
              {notificationStats.length} channels
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Delivery Rate</CardTitle>
            <CheckCircle2 className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{overallDeliveryRate}%</div>
            <p className="text-xs text-muted-foreground">
              {totalDelivered} delivered
            </p>
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="workflows" className="space-y-4">
        <TabsList>
          <TabsTrigger value="workflows">Workflows</TabsTrigger>
          <TabsTrigger value="notifications">Notifications</TabsTrigger>
          <TabsTrigger value="emails">Email Ingestion</TabsTrigger>
          <TabsTrigger value="logs">Recent Logs</TabsTrigger>
        </TabsList>

        <TabsContent value="workflows">
          <Card>
            <CardHeader>
              <CardTitle>Workflow Health</CardTitle>
              <CardDescription>Performance metrics by workflow</CardDescription>
            </CardHeader>
            <CardContent>
              {workflowStats.length === 0 ? (
                <p className="text-center text-muted-foreground py-8">
                  No workflow data for this period
                </p>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Workflow</TableHead>
                      <TableHead className="text-right">Runs</TableHead>
                      <TableHead className="text-right">Success</TableHead>
                      <TableHead className="text-right">Failed</TableHead>
                      <TableHead className="text-right">Avg Duration</TableHead>
                      <TableHead className="text-right">Items</TableHead>
                      <TableHead className="text-right">Rate</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {workflowStats.map((w) => (
                      <TableRow key={w.workflow_name}>
                        <TableCell className="font-medium">{w.workflow_name}</TableCell>
                        <TableCell className="text-right">{w.total_runs}</TableCell>
                        <TableCell className="text-right text-green-600">
                          {w.completed_runs}
                        </TableCell>
                        <TableCell className="text-right text-red-600">
                          {w.failed_runs}
                        </TableCell>
                        <TableCell className="text-right">
                          {formatDuration(w.avg_duration_ms)}
                        </TableCell>
                        <TableCell className="text-right">
                          {w.total_items_processed}
                        </TableCell>
                        <TableCell className="text-right">
                          <Badge variant={w.success_rate >= 90 ? 'default' : 'destructive'}>
                            {w.success_rate.toFixed(0)}%
                          </Badge>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="notifications">
          <Card>
            <CardHeader>
              <CardTitle>Notification Delivery</CardTitle>
              <CardDescription>Delivery stats by channel</CardDescription>
            </CardHeader>
            <CardContent>
              {notificationStats.length === 0 ? (
                <p className="text-center text-muted-foreground py-8">
                  No notification data for this period
                </p>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Channel</TableHead>
                      <TableHead className="text-right">Total Sent</TableHead>
                      <TableHead className="text-right">Delivered</TableHead>
                      <TableHead className="text-right">Failed</TableHead>
                      <TableHead className="text-right">Delivery Rate</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {notificationStats.map((n) => (
                      <TableRow key={n.channel}>
                        <TableCell className="font-medium capitalize">
                          {n.channel}
                        </TableCell>
                        <TableCell className="text-right">{n.total_sent}</TableCell>
                        <TableCell className="text-right text-green-600">
                          {n.delivered}
                        </TableCell>
                        <TableCell className="text-right text-red-600">
                          {n.failed}
                        </TableCell>
                        <TableCell className="text-right">
                          <Badge variant={n.delivery_rate >= 90 ? 'default' : 'destructive'}>
                            {n.delivery_rate.toFixed(0)}%
                          </Badge>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="emails">
          <div className="space-y-4">
            {/* Email Summary */}
            {emailStats && (
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm font-medium">Emails Processed</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold">{emailStats.summary.processed}</div>
                    <p className="text-xs text-muted-foreground">
                      {emailStats.summary.pending} pending
                    </p>
                  </CardContent>
                </Card>
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm font-medium">Jobs Extracted</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold">{emailStats.summary.total_jobs_extracted}</div>
                  </CardContent>
                </Card>
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm font-medium">Jobs Inserted</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold">{emailStats.summary.total_jobs_inserted}</div>
                  </CardContent>
                </Card>
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm font-medium">Avg Trust Score</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold">
                      {(emailStats.summary.avg_trust_score * 100).toFixed(0)}%
                    </div>
                  </CardContent>
                </Card>
              </div>
            )}

            {/* Email Sources */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Mail className="h-5 w-5" />
                  Email Sources
                </CardTitle>
                <CardDescription>Trusted sources and their stats</CardDescription>
              </CardHeader>
              <CardContent>
                {!emailStats || emailStats.by_source.length === 0 ? (
                  <p className="text-center text-muted-foreground py-8">
                    No email sources configured
                  </p>
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Source</TableHead>
                        <TableHead className="text-right">Trust Score</TableHead>
                        <TableHead className="text-right">Emails</TableHead>
                        <TableHead className="text-right">Jobs Extracted</TableHead>
                        <TableHead>Last Email</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {emailStats.by_source.map((s) => (
                        <TableRow key={s.source_name}>
                          <TableCell className="font-medium">{s.source_name}</TableCell>
                          <TableCell className="text-right">
                            <Badge variant={s.trust_score >= 0.7 ? 'default' : 'secondary'}>
                              {(s.trust_score * 100).toFixed(0)}%
                            </Badge>
                          </TableCell>
                          <TableCell className="text-right">{s.total_emails_processed}</TableCell>
                          <TableCell className="text-right">{s.total_jobs_extracted}</TableCell>
                          <TableCell className="text-sm">
                            {s.last_email_at ? formatDate(s.last_email_at) : '—'}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                )}
              </CardContent>
            </Card>

            {/* Recent Emails */}
            <Card>
              <CardHeader>
                <CardTitle>Recent Emails</CardTitle>
                <CardDescription>Last 50 ingested emails</CardDescription>
              </CardHeader>
              <CardContent>
                {!emailStats || emailStats.recent_emails.length === 0 ? (
                  <p className="text-center text-muted-foreground py-8">
                    No emails ingested in this period
                  </p>
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>From</TableHead>
                        <TableHead>Subject</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead className="text-right">Jobs</TableHead>
                        <TableHead>Received</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {emailStats.recent_emails.map((e) => (
                        <TableRow key={e.id}>
                          <TableCell className="text-sm max-w-32 truncate">
                            {e.from_address}
                          </TableCell>
                          <TableCell className="text-sm max-w-48 truncate">
                            {e.subject}
                          </TableCell>
                          <TableCell>{getStatusBadge(e.processing_status)}</TableCell>
                          <TableCell className="text-right">
                            {e.jobs_inserted}/{e.jobs_extracted}
                          </TableCell>
                          <TableCell className="text-sm">
                            {formatDate(e.received_at)}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                )}
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="logs">
          <Card>
            <CardHeader>
              <CardTitle>Recent Workflow Logs</CardTitle>
              <CardDescription>Last 50 workflow executions</CardDescription>
            </CardHeader>
            <CardContent>
              {recentLogs.length === 0 ? (
                <p className="text-center text-muted-foreground py-8">
                  No logs for this period
                </p>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Workflow</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Started</TableHead>
                      <TableHead className="text-right">Duration</TableHead>
                      <TableHead className="text-right">Items</TableHead>
                      <TableHead>Error</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {recentLogs.map((log) => (
                      <TableRow key={log.id}>
                        <TableCell className="font-medium">{log.workflow_name}</TableCell>
                        <TableCell>{getStatusBadge(log.status)}</TableCell>
                        <TableCell className="text-sm">
                          {formatDate(log.started_at)}
                        </TableCell>
                        <TableCell className="text-right">
                          {formatDuration(log.duration_ms)}
                        </TableCell>
                        <TableCell className="text-right">
                          <span className="text-green-600">{log.items_succeeded}</span>
                          /
                          <span className="text-red-600">{log.items_failed}</span>
                          /{log.items_processed}
                        </TableCell>
                        <TableCell className="text-sm text-red-600 max-w-xs truncate">
                          {log.error_message || '—'}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
