import React, { useState } from 'react';

const CareerExplorer: React.FC = () => {
  const [query, setQuery] = useState('software engineer');
  const [result, setResult] = useState<any>(null);

  const runSearch = async () => {
    try {
      const res = await fetch(`/api/careers?q=${encodeURIComponent(query)}`);
      const json = await res.json();
      setResult(json);
    } catch (err) {
      console.error(err);
    }
  };

  return (
    <div className="container mx-auto p-4">
      <h1 className="text-2xl font-semibold mb-4">Career Explorer</h1>
      <div className="flex gap-2 mb-4">
        <input className="flex-1 p-2 border rounded" value={query} onChange={(e) => setQuery(e.target.value)} />
        <button onClick={runSearch} className="px-3 py-1 rounded bg-primary text-white">Search</button>
      </div>

      {result ? (
        <div className="p-3 border rounded bg-card">
          <pre className="whitespace-pre-wrap text-sm">{JSON.stringify(result, null, 2)}</pre>
        </div>
      ) : (
        <div className="text-muted">No results yet.</div>
      )}
    </div>
  );
};

export default CareerExplorer;
