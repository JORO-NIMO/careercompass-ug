import { createSupabaseServiceClient } from '../../_shared/sbClient.ts';
import { jsonError, jsonSuccess } from '../../_shared/responses.ts';

export default async function (req: Request) {
  try {
    const url = new URL(req.url);
    const limit = Number(url.searchParams.get('limit') || '20');
    const ttlMinutes = Number(url.searchParams.get('ttl') || '15');

    const key = `coursera:limit=${limit}`;
    const supabase = createSupabaseServiceClient();

    const { data: cached } = await supabase.from('external_cache').select('response,expires_at').eq('key', key).maybeSingle();
    if (cached && new Date(cached.expires_at) > new Date()) {
      const payload = (cached.response && typeof cached.response === 'object') ? cached.response : { results: cached.response };
      return jsonSuccess(payload as Record<string, unknown>);
    }

    const apiUrl = `https://api.coursera.org/api/courses.v1?limit=${limit}`;
    const controller = new AbortController();
    const t = setTimeout(() => controller.abort(), 3000);
    let json: unknown = null;
    try {
      const res = await fetch(apiUrl, { signal: controller.signal });
      json = await res.json();
    } finally {
      clearTimeout(t);
    }

    const expiresAt = new Date(Date.now() + ttlMinutes * 60 * 1000).toISOString();
    await supabase.from('external_cache').upsert({ key, response: json, expires_at: expiresAt });

    const payload = (json && typeof json === 'object') ? json : { results: json };
    return jsonSuccess(payload as Record<string, unknown>);
  } catch (err) {
    console.error('courses function error', err);
    return jsonError(String(err), 500);
  }
}
