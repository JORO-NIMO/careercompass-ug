import { api } from '@/lib/api-client';

interface RawJobResult {
  job_id?: string;
  id?: string;
  job_title?: string;
  title?: string;
  company_name?: string;
  company?: { display_name?: string };
  employer_name?: string;
  job_description?: string;
  description?: string;
  job_apply_link?: string;
  redirect_url?: string;
  job_location?: string;
  location?: string;
  job_employment_type?: string;
  employment_type?: string;
  [key: string]: unknown;
}

export interface RankedJobResult extends RawJobResult {
  normalized_id: string;
  normalized_title: string;
  normalized_company: string;
  normalized_description: string;
  relevance_score: number;
}

const normalizeText = (value?: string) => (value ?? '').trim().toLowerCase().replace(/\s+/g, ' ');

const tokenize = (value: string) => normalizeText(value)
  .split(/[^a-z0-9]+/)
  .filter(Boolean);

function scoreJob(job: RawJobResult, query: string): number {
  const tokens = tokenize(query);
  if (tokens.length === 0) return 0;

  const title = normalizeText(job.job_title || job.title);
  const description = normalizeText(job.job_description || job.description);
  const company = normalizeText(job.company_name || job.company?.display_name || job.employer_name);
  const location = normalizeText(job.job_location || job.location);

  let score = 0;
  for (const token of tokens) {
    if (title.includes(token)) score += 4;
    if (company.includes(token)) score += 2;
    if (location.includes(token)) score += 1.5;
    if (description.includes(token)) score += 1;
  }

  if (title.includes(normalizeText(query))) score += 6;
  return Number(score.toFixed(2));
}

function normalizeAndRankJobs(results: RawJobResult[], query: string): RankedJobResult[] {
  const deduped = new Map<string, RankedJobResult>();

  for (const job of results) {
    const normalizedTitle = normalizeText(job.job_title || job.title);
    const normalizedCompany = normalizeText(job.company_name || job.company?.display_name || job.employer_name);
    const normalizedDescription = normalizeText(job.job_description || job.description);
    const normalizedId = normalizeText(job.job_id || job.id || `${normalizedTitle}-${normalizedCompany}`);
    const dedupeKey = `${normalizedTitle}|${normalizedCompany}|${normalizeText(job.job_apply_link || job.redirect_url)}`;

    const ranked: RankedJobResult = {
      ...job,
      normalized_id: normalizedId || dedupeKey,
      normalized_title: normalizedTitle,
      normalized_company: normalizedCompany,
      normalized_description: normalizedDescription,
      relevance_score: scoreJob(job, query),
    };

    const existing = deduped.get(dedupeKey);
    if (!existing || ranked.relevance_score > existing.relevance_score) {
      deduped.set(dedupeKey, ranked);
    }
  }

  return Array.from(deduped.values()).sort((a, b) => b.relevance_score - a.relevance_score);
}

export async function searchJobsJSearch(query: string) {
  const response = await api.searchJobs(query);
  const rawResults = ((response as { data?: RawJobResult[]; results?: RawJobResult[] })?.data
    ?? (response as { data?: RawJobResult[]; results?: RawJobResult[] })?.results
    ?? []);

  const rankedResults = normalizeAndRankJobs(rawResults, query);
  return {
    ...response,
    data: rankedResults,
    results: rankedResults,
    meta: {
      query,
      total_raw: rawResults.length,
      total_deduped: rankedResults.length,
    },
  };
}
