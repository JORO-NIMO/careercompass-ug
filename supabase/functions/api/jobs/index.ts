import { createSupabaseServiceClient } from '../../_shared/sbClient.ts';

export default async function (req: Request) {
  try {
    const url = new URL(req.url);
    const q = url.searchParams.get('query') || 'software engineer in uganda';
    const provider = url.searchParams.get('provider') || 'jsearch';
    const ttlMinutes = Number(url.searchParams.get('ttl') || '5');

    const key = `jobs:${provider}:${q}`;
    const supabase = createSupabaseServiceClient();

    const { data: cached } = await supabase.from('external_cache').select('response,expires_at').eq('key', key).maybeSingle();
    if (cached && new Date(cached.expires_at) > new Date()) {
      return new Response(JSON.stringify(cached.response), { status: 200 });
    }

    let json: any = {};
    if (provider === 'adzuna') {
      const APP_ID = Deno.env.get('ADZUNA_APP_ID');
      const APP_KEY = Deno.env.get('ADZUNA_APP_KEY');
      const apiUrl = `https://api.adzuna.com/v1/api/jobs/ug/search/1?app_id=${APP_ID}&app_key=${APP_KEY}&results_per_page=20&what=${encodeURIComponent(q)}`;
      const res = await fetch(apiUrl);
      json = await res.json();
    } else {
      // default: jsearch via RapidAPI
      const API_KEY = Deno.env.get('JSEARCH_API_KEY');
      const apiUrl = `https://jsearch.p.rapidapi.com/search?query=${encodeURIComponent(q)}`;
      const res = await fetch(apiUrl, { headers: { 'X-RapidAPI-Key': API_KEY, 'X-RapidAPI-Host': 'jsearch.p.rapidapi.com' } });
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
