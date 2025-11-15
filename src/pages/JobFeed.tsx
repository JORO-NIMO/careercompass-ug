import React, { useEffect, useState } from 'react';
import { searchJobsJSearch } from '@/services/jsearchService';
import { searchJobsAdzuna } from '@/services/adzunaService';

const JobFeed: React.FC = () => {
  const [query, setQuery] = useState('software engineer in uganda');
  const [provider, setProvider] = useState<'jsearch' | 'adzuna'>('jsearch');
  const [jobs, setJobs] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);

  const runSearch = async () => {
    setLoading(true);
    try {
      if (provider === 'jsearch') {
        const res = await searchJobsJSearch(query);
        setJobs(res.data ?? res.results ?? res ?? []);
      } else {
        const res = await searchJobsAdzuna(query);
        setJobs(res.results ?? res.results ?? []);
      }
    } catch (err) {
      console.error(err);
      setJobs([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { runSearch(); }, []);

  return (
    <div className="container mx-auto p-4">
      <h1 className="text-2xl font-semibold mb-4">Job Feed</h1>
      <div className="flex gap-2 mb-4">
        <input className="flex-1 p-2 border rounded" value={query} onChange={(e) => setQuery(e.target.value)} />
        <select value={provider} onChange={(e) => setProvider(e.target.value as any)} className="p-2 border rounded">
          <option value="jsearch">JSearch</option>
          <option value="adzuna">Adzuna</option>
        </select>
        <button onClick={runSearch} className="px-3 py-1 rounded bg-primary text-white">Search</button>
      </div>

      {loading && <div>Loading...</div>}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {jobs.map((job: any, idx: number) => (
          <div key={job.job_id || job.id || idx} className="p-3 border rounded bg-card">
            <div className="font-medium">{job.job_title || job.title}</div>
            <div className="text-sm text-muted">{job.company_name || job.company?.display_name}</div>
            <div className="text-sm mt-2">{job.job_description?.slice(0, 200) || job.description?.slice(0, 200)}</div>
            <div className="mt-2 flex gap-2">
              <button className="px-3 py-1 border rounded">Apply</button>
              <button className="px-3 py-1 border rounded">Bookmark</button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default JobFeed;
