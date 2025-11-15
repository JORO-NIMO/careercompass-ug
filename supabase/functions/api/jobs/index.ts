import { createSupabaseServiceClient } from '../../_shared/sbClient.ts';

export default async function (req: Request) {
  try {
    const url = new URL(req.url);
  const q = url.searchParams.get('query') || 'software engineer in uganda';
  const provider = url.searchParams.get('provider') || 'jsearch';
  const ttlMinutes = Number(url.searchParams.get('ttl') || '5');
  const page = url.searchParams.get('page') || '1';
  const num_pages = url.searchParams.get('num_pages') || '1';
  const country = url.searchParams.get('country') || 'ug';
  const date_posted = url.searchParams.get('date_posted') || 'all';

  const key = `jobs:${provider}:${q}:p${page}:c${country}`;
    const supabase = createSupabaseServiceClient();

    const { data: cached } = await supabase.from('external_cache').select('response,expires_at').eq('key', key).maybeSingle();
    if (cached && new Date(cached.expires_at) > new Date()) {
      return new Response(JSON.stringify(cached.response), { status: 200 });
    }

    let json: any = {};
    if (provider === 'adzuna') {
      const APP_ID = Deno.env.get('ADZUNA_APP_ID');
      const APP_KEY = Deno.env.get('ADZUNA_APP_KEY');
      if (!APP_ID || !APP_KEY) {
        return new Response(JSON.stringify({ ok: false, error: 'Missing ADZUNA_APP_ID/ADZUNA_APP_KEY env vars' }), { status: 500 });
      }
      const apiUrl = `https://api.adzuna.com/v1/api/jobs/${encodeURIComponent(country)}/search/${encodeURIComponent(page)}?app_id=${APP_ID}&app_key=${APP_KEY}&results_per_page=20&what=${encodeURIComponent(q)}`;
      const res = await fetch(apiUrl);
      json = await res.json();
    } else {
      // default: jsearch via RapidAPI
      const API_KEY = Deno.env.get('JSEARCH_API_KEY');
      if (!API_KEY) {
        return new Response(JSON.stringify({ ok: false, error: 'Missing JSEARCH_API_KEY env var' }), { status: 500 });
      }
      const apiUrl = `https://jsearch.p.rapidapi.com/search?query=${encodeURIComponent(q)}&page=${encodeURIComponent(page)}&num_pages=${encodeURIComponent(num_pages)}&country=${encodeURIComponent(country)}&date_posted=${encodeURIComponent(date_posted)}`;
      const res = await fetch(apiUrl, { headers: { 'x-rapidapi-key': API_KEY, 'x-rapidapi-host': 'jsearch.p.rapidapi.com' } });
      json = await res.json();
    }

    const expiresAt = new Date(Date.now() + ttlMinutes * 60 * 1000).toISOString();
    await supabase.from('external_cache').upsert({ key, response: json, expires_at: expiresAt });

    return new Response(JSON.stringify(json), { status: 200 });
  } catch (err) {
    console.error('jobs function error', err);
    return new Response(JSON.stringify({ ok: false, error: String(err) }), { status: 500 });
  }
}
