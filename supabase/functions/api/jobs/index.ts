import { createSupabaseServiceClient } from '../../_shared/sbClient.ts';
import { jsonError, jsonSuccess } from '../../_shared/responses.ts';

type JobsPayload = Record<string, unknown>;

function isRecord(value: unknown): value is JobsPayload {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

export default async function (req: Request) {
  try {
    const url = new URL(req.url);
    const q = url.searchParams.get('query') || 'software engineer in uganda';
    const provider = url.searchParams.get('provider') || 'jsearch';
    const ttlMinutes = Number(url.searchParams.get('ttl') || '5');
    const page = url.searchParams.get('page') || '1';
    const numPages = url.searchParams.get('num_pages') || '1';
    const country = url.searchParams.get('country') || 'ug';
    const datePosted = url.searchParams.get('date_posted') || 'all';

    const key = `jobs:${provider}:${q}:p${page}:c${country}`;
    const supabase = createSupabaseServiceClient();

    const { data: cached } = await supabase
      .from('external_cache')
      .select('response,expires_at')
      .eq('key', key)
      .maybeSingle();

    if (cached && new Date(cached.expires_at) > new Date()) {
      const cachedResponse = cached.response as unknown;
      const payload = isRecord(cachedResponse) ? cachedResponse : { results: cachedResponse };
      return jsonSuccess(payload);
    }

    let json: unknown = {};
    if (provider === 'adzuna') {
      const APP_ID = Deno.env.get('ADZUNA_APP_ID');
      const APP_KEY = Deno.env.get('ADZUNA_APP_KEY');
      if (!APP_ID || !APP_KEY) {
        return jsonError('Missing ADZUNA_APP_ID/ADZUNA_APP_KEY env vars', 500);
      }
      const apiUrl = `https://api.adzuna.com/v1/api/jobs/${encodeURIComponent(country)}/search/${encodeURIComponent(page)}?app_id=${APP_ID}&app_key=${APP_KEY}&results_per_page=20&what=${encodeURIComponent(q)}`;
      const res = await fetch(apiUrl);
      json = await res.json();
    } else {
      const API_KEY = Deno.env.get('JSEARCH_API_KEY');
      if (!API_KEY) {
        return jsonError('Missing JSEARCH_API_KEY env var', 500);
      }
      const apiUrl = `https://jsearch.p.rapidapi.com/search?query=${encodeURIComponent(q)}&page=${encodeURIComponent(page)}&num_pages=${encodeURIComponent(numPages)}&country=${encodeURIComponent(country)}&date_posted=${encodeURIComponent(datePosted)}`;
      const res = await fetch(apiUrl, {
        headers: {
          'x-rapidapi-key': API_KEY,
          'x-rapidapi-host': 'jsearch.p.rapidapi.com',
        },
      });
      json = await res.json();
    }

    const expiresAt = new Date(Date.now() + ttlMinutes * 60 * 1000).toISOString();
    await supabase.from('external_cache').upsert({ key, response: json, expires_at: expiresAt });

    const payload = isRecord(json) ? json : { results: json };
    return jsonSuccess(payload);
  } catch (err) {
    console.error('jobs function error', err);
    return jsonError(err instanceof Error ? err.message : String(err), 500);
  }
}
