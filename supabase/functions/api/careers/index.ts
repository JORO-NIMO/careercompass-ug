import { createSupabaseServiceClient } from '../../_shared/sbClient.ts';
import { jsonError, jsonSuccess } from '../../_shared/responses.ts';

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
      const payload = (cached.response && typeof cached.response === 'object') ? cached.response : { results: cached.response };
      return jsonSuccess(payload as Record<string, unknown>);
    }

    // Example O*NET endpoint; adjust to actual API format/credentials
    const ONET_API_KEY = Deno.env.get('ONET_API_KEY') || '';
    let apiUrl = '';
    if (code) {
      apiUrl = `https://services.onetcenter.org/ws/mnm/careers/${encodeURIComponent(code)}?key=${ONET_API_KEY}`;
    } else if (q) {
      apiUrl = `https://services.onetcenter.org/ws/mnm/careers?keyword=${encodeURIComponent(q)}&key=${ONET_API_KEY}`;
    } else {
      return jsonError('Missing code or q param', 400);
    }

    const res = await fetch(apiUrl);
    const json = await res.json();

    const expiresAt = new Date(Date.now() + ttlMinutes * 60 * 1000).toISOString();
    await supabase.from('external_cache').upsert({ key, response: json, expires_at: expiresAt });

    const payload = (json && typeof json === 'object') ? json : { results: json };
    return jsonSuccess(payload as Record<string, unknown>);
  } catch (err) {
    console.error('careers function error', err);
    return jsonError(String(err), 500);
  }
}
