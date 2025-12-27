import React from 'react';
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts';
import { useAdminAnalytics } from '@/hooks/useAdminAnalytics';

const AdminAnalytics: React.FC = () => {
  const { data, loading, error } = useAdminAnalytics();

  if (loading) return <div className="container mx-auto p-4">Loading analytics…</div>;
  if (error) return <div className="container mx-auto p-4 text-destructive">Error: {error}</div>;
  if (!data) return <div className="container mx-auto p-4">No analytics data available.</div>;

  return (
    <div className="container mx-auto p-4">
      <h1 className="text-2xl font-semibold mb-4">Admin Analytics</h1>
      <div className="mb-6 grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="p-3 border rounded">
          <div className="font-bold text-lg">{data.overview.totalUsers}</div>
          <div className="text-muted-foreground">Total Users</div>
        </div>
        <div className="p-3 border rounded">
          <div className="font-bold text-lg">{data.overview.totalEmployers}</div>
          <div className="text-muted-foreground">Total Employers</div>
        </div>
        <div className="p-3 border rounded">
          <div className="font-bold text-lg">{data.overview.totalPlacements}</div>
          <div className="text-muted-foreground">Total Placements</div>
        </div>
      </div>

      <div className="w-full h-64 bg-card p-4 rounded mb-6">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={data.signupsSeries}>
            <XAxis dataKey="date" />
            <YAxis />
            <Tooltip />
            <Line type="monotone" dataKey="value" stroke="#8884d8" strokeWidth={2} />
          </LineChart>
        </ResponsiveContainer>
        <div className="text-center text-muted-foreground mt-2">New Signups (last 30 days)</div>
      </div>

      <div className="w-full h-64 bg-card p-4 rounded mb-6">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={data.placementsSeries}>
            <XAxis dataKey="date" />
            <YAxis />
            <Tooltip />
            <Line type="monotone" dataKey="value" stroke="#4ade80" strokeWidth={2} />
          </LineChart>
        </ResponsiveContainer>
        <div className="text-center text-muted-foreground mt-2">Placements (last 30 days)</div>
      </div>

      <div className="mt-4 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        <div className="p-3 border rounded">
          <div className="font-semibold mb-2">Top Companies</div>
          <ol className="list-decimal ml-4">
            {data.topCompanies.map((c) => (
              <li key={c.id}>{c.name} <span className="text-muted-foreground">({c.count})</span></li>
            ))}
          </ol>
        </div>
        {/* Add more entity breakdowns as needed */}
      </div>
    </div>
  );
};

export default AdminAnalytics;
