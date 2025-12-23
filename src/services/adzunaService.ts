import { api } from '@/lib/api-client';

export async function searchJobsAdzuna(query: string) {
  return api.searchJobs(query, 'adzuna');
}
