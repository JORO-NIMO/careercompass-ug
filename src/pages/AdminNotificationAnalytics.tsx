import React, { useEffect, useState } from 'react';
import { useNotificationAnalytics } from '@/hooks/useNotificationAnalytics';
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, BarChart, Bar } from 'recharts';

const AdminNotificationAnalytics: React.FC = () => {

  const { data, loading, error } = useNotificationAnalytics();
  const thinkingStates = [
    'Thinking',
    'Crunching numbers',
    'Analyzing events',
    'Gathering insights',
    'Almost there',
  ];
  const [thinkingIndex, setThinkingIndex] = useState(0);
  useEffect(() => {
    if (!loading) return;
    const interval = setInterval(() => {
      setThinkingIndex((i) => (i + 1) % thinkingStates.length);
    }, 1200);
    return () => clearInterval(interval);
  }, [loading]);

  if (loading) {
    return (
      <div className="container mx-auto p-4 flex flex-col items-center justify-center h-64">
        <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-primary mb-4" />
        <div className="text-lg font-medium text-muted-foreground">{thinkingStates[thinkingIndex]}…</div>
      </div>
    );
  }
  if (error) return <div className="container mx-auto p-4 text-destructive">Error: {error}</div>;
  if (!data) return <div className="container mx-auto p-4">No notification analytics data available.</div>;

  return (
    <div className="container mx-auto p-4">
      <h1 className="text-2xl font-semibold mb-4">Notification Analytics</h1>
      <div className="mb-6 grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="p-3 border rounded">
          <div className="font-bold text-lg">{data.totalSent}</div>
          <div className="text-muted-foreground">Total Sent</div>
        </div>
        <div className="p-3 border rounded">
          <div className="font-bold text-lg">{data.totalOpened}</div>
          <div className="text-muted-foreground">Total Opened</div>
        </div>
        <div className="p-3 border rounded">
          <div className="font-bold text-lg">{data.totalClicked}</div>
          <div className="text-muted-foreground">Total Clicked</div>
        </div>
      </div>

      <div className="w-full h-64 bg-card p-4 rounded mb-6">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={data.eventsSeries}>
            <XAxis dataKey="date" />
            <YAxis />
            <Tooltip />
            <Line type="monotone" dataKey="sent" stroke="#8884d8" strokeWidth={2} />
            <Line type="monotone" dataKey="opened" stroke="#4ade80" strokeWidth={2} />
            <Line type="monotone" dataKey="clicked" stroke="#f59e42" strokeWidth={2} />
          </LineChart>
        </ResponsiveContainer>
        <div className="text-center text-muted-foreground mt-2">Notification Events (last 30 days)</div>
      </div>

      <div className="w-full h-64 bg-card p-4 rounded mb-6">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={data.typeBreakdown}>
            <XAxis dataKey="type" />
            <YAxis />
            <Tooltip />
            <Bar dataKey="sent" fill="#8884d8" />
            <Bar dataKey="opened" fill="#4ade80" />
            <Bar dataKey="clicked" fill="#f59e42" />
          </BarChart>
        </ResponsiveContainer>
        <div className="text-center text-muted-foreground mt-2">By Notification Type</div>
      </div>
    </div>
  );
};

export default AdminNotificationAnalytics;
