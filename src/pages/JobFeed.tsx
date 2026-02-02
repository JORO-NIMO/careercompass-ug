import React, { useCallback, useEffect, useState } from 'react';
import { searchJobsJSearch } from '@/services/jsearchService';
import { searchJobsAdzuna } from '@/services/adzunaService';

interface JobResult {
  job_id?: string;
  id?: string;
  job_title?: string;
  title?: string;
  company_name?: string;
  company?: { display_name?: string };
  job_description?: string;
  description?: string;
}

interface JSearchResponse {
  data?: JobResult[];
  results?: JobResult[];
}

interface AdzunaResponse {
  results?: JobResult[];
}

const DEFAULT_QUERY = 'software engineer remote';
const DEFAULT_PROVIDER: 'jsearch' | 'adzuna' = 'jsearch';

const JobFeed: React.FC = () => {
  const [query, setQuery] = useState(DEFAULT_QUERY);
  const [provider, setProvider] = useState<'jsearch' | 'adzuna'>(DEFAULT_PROVIDER);
  const [jobs, setJobs] = useState<JobResult[]>([]);
  const [loading, setLoading] = useState(false);

  const runSearch = useCallback(async (searchQuery: string, searchProvider: 'jsearch' | 'adzuna') => {
    setLoading(true);
    try {
      if (searchProvider === 'jsearch') {
        const res = (await searchJobsJSearch(searchQuery)) as JSearchResponse;
        setJobs(res?.data ?? res?.results ?? []);
      } else {
        const res = (await searchJobsAdzuna(searchQuery)) as AdzunaResponse;
        setJobs(res?.results ?? []);
      }
    } catch (error: unknown) {
      console.error('Job search failed', error);
      setJobs([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void runSearch(DEFAULT_QUERY, DEFAULT_PROVIDER);
  }, [runSearch]);

  return (
    <div className="container mx-auto p-4">
      <h1 className="text-2xl font-semibold mb-4">Job Feed</h1>
      <div className="flex gap-2 mb-4">
        <input className="flex-1 p-2 border rounded" value={query} onChange={(e) => setQuery(e.target.value)} />
        <select
          value={provider}
          onChange={(event) => {
            const nextProvider = event.target.value as 'jsearch' | 'adzuna';
            setProvider(nextProvider);
            void runSearch(query, nextProvider);
          }}
          className="p-2 border rounded"
        >
          <option value="jsearch">JSearch</option>
          <option value="adzuna">Adzuna</option>
        </select>
        <button
          onClick={() => {
            void runSearch(query, provider);
          }}
          className="px-3 py-1 rounded bg-primary text-white"
        >
          Search
        </button>
      </div>

      {loading && <div>Loading...</div>}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {jobs.map((job, idx) => (
          <div key={job.job_id || job.id || idx} className="p-3 border rounded bg-card">
            <div className="font-medium">{job.job_title || job.title}</div>
            <div className="text-sm text-muted">{job.company_name || job.company?.display_name}</div>
            <div className="text-sm mt-2">{(job.job_description || job.description || '').slice(0, 200)}</div>
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