import React, { useEffect, useState } from 'react';
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts';

const mockData = [
  { name: 'Day 1', value: 40 },
  { name: 'Day 2', value: 65 },
  { name: 'Day 3', value: 52 },
  { name: 'Day 4', value: 78 },
  { name: 'Day 5', value: 90 },
];

const AdminAnalytics: React.FC = () => {
  const [data, setData] = useState(mockData);

  useEffect(() => {
    // TODO: replace with real aggregated api call e.g. /api/admin/analytics
    // fetch('/api/admin/analytics').then(r=>r.json()).then(d=>setData(d.series))
  }, []);

  return (
    <div className="container mx-auto p-4">
      <h1 className="text-2xl font-semibold mb-4">Admin Analytics</h1>
      <div className="w-full h-64 bg-card p-4 rounded">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={data}>
            <XAxis dataKey="name" />
            <YAxis />
            <Tooltip />
            <Line type="monotone" dataKey="value" stroke="#8884d8" strokeWidth={2} />
          </LineChart>
        </ResponsiveContainer>
      </div>
      <div className="mt-4 grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="p-3 border rounded">Top Mentors (mock)</div>
        <div className="p-3 border rounded">Top Listings (mock)</div>
        <div className="p-3 border rounded">Drop-offs (mock)</div>
      </div>
    </div>
  );
};

export default AdminAnalytics;
