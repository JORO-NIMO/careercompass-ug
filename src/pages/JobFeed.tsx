import React, { useCallback, useEffect, useState } from 'react';
import { searchJobsJSearch } from '@/services/jsearchService';
import SEO from '@/components/seo/SEO';

interface JobResult {
  job_id?: string;
  id?: string;
  job_title?: string;
  title?: string;
  company_name?: string;
  company?: { display_name?: string };
  job_description?: string;
  description?: string;
  job_apply_link?: string;
  redirect_url?: string;
}

interface JSearchResponse {
  data?: JobResult[];
  results?: JobResult[];
}

const DEFAULT_QUERY = 'software engineer remote';

const JobFeed: React.FC = () => {
  const [query, setQuery] = useState(DEFAULT_QUERY);
  const [jobs, setJobs] = useState<JobResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const runSearch = useCallback(async (searchQuery: string) => {
    setLoading(true);
    setError(null);
    try {
      const res = (await searchJobsJSearch(searchQuery)) as JSearchResponse;
      setJobs(res?.data ?? res?.results ?? []);
    } catch (err: unknown) {
      console.error('Job search failed', err);
      setError('Failed to fetch jobs. Please try again later.');
      setJobs([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void runSearch(DEFAULT_QUERY);
  }, [runSearch]);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    void runSearch(query);
  };

  return (
    <div className="container mx-auto p-4">
      <SEO
        title="Job Feed | PlacementBridge"
        description="Browse thousands of job listings from trusted sources"
      />
      
      <h1 className="text-2xl font-semibold mb-4">Job Feed</h1>
      
      <form onSubmit={handleSearch} className="flex gap-2 mb-4">
        <input 
          className="flex-1 p-2 border rounded" 
          value={query} 
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search jobs..."
        />
        <button
          type="submit"
          className="px-4 py-2 rounded bg-primary text-white hover:bg-primary/90 transition-colors"
          disabled={loading}
        >
          {loading ? 'Searching...' : 'Search'}
        </button>
      </form>

      {error && (
        <div className="p-3 mb-4 bg-destructive/10 text-destructive rounded">
          {error}
        </div>
      )}

      {loading && (
        <div className="flex items-center justify-center py-8">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
        </div>
      )}

      {!loading && jobs.length === 0 && !error && (
        <div className="text-center py-8 text-muted-foreground">
          No jobs found. Try a different search term.
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {jobs.map((job, idx) => (
          <div key={job.job_id || job.id || idx} className="p-4 border rounded bg-card hover:shadow-md transition-shadow">
            <div className="font-medium text-lg">{job.job_title || job.title}</div>
            <div className="text-sm text-muted-foreground mb-2">
              {job.company_name || job.company?.display_name}
            </div>
            <div className="text-sm line-clamp-3 mb-3">
              {(job.job_description || job.description || '').slice(0, 200)}...
            </div>
            <div className="flex gap-2">
              {(job.job_apply_link || job.redirect_url) && (
                <a
                  href={job.job_apply_link || job.redirect_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="px-3 py-1 border rounded bg-primary text-white hover:bg-primary/90"
                >
                  Apply
                </a>
              )}
              <button className="px-3 py-1 border rounded hover:bg-muted">
                Bookmark
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default JobFeed;
