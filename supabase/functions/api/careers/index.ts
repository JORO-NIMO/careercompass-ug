import { createSupabaseServiceClient } from '../../_shared/sbClient.ts';

export default async function (req: Request) {
  try {
    const url = new URL(req.url);
    const code = url.searchParams.get('code');
    const q = url.searchParams.get('q');
    const ttlMinutes = Number(url.searchParams.get('ttl') || '60');

    const key = `onet:${code || q}`;
    const supabase = createSupabaseServiceClient();

    const { data: cached } = await supabase.from('external_cache').select('response,expires_at').eq('key', key).maybeSingle();
    if (cached && new Date(cached.expires_at) > new Date()) {
      return new Response(JSON.stringify(cached.response), { status: 200 });
    }

    // Example O*NET endpoint; adjust to actual API format/credentials
    const ONET_API_KEY = Deno.env.get('ONET_API_KEY') || '';
    let apiUrl = '';
    if (code) {
      apiUrl = `https://services.onetcenter.org/ws/mnm/careers/${encodeURIComponent(code)}?key=${ONET_API_KEY}`;
    } else if (q) {
      apiUrl = `https://services.onetcenter.org/ws/mnm/careers?keyword=${encodeURIComponent(q)}&key=${ONET_API_KEY}`;
    } else {
      return new Response(JSON.stringify({ ok: false, error: 'Missing code or q param' }), { status: 400 });
    }

    const res = await fetch(apiUrl);
    const json = await res.json();

    const expiresAt = new Date(Date.now() + ttlMinutes * 60 * 1000).toISOString();
    await supabase.from('external_cache').upsert({ key, response: json, expires_at: expiresAt });

    return new Response(JSON.stringify(json), { status: 200 });
  } catch (err) {
    console.error('careers function error', err);
    return new Response(JSON.stringify({ ok: false, error: String(err) }), { status: 500 });
  }
}
