import { api } from '@/lib/api-client';

export async function searchJobsJSearch(query: string) {
  return api.searchJobs(query, 'jsearch');
}
