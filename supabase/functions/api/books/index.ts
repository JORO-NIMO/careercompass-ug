import { createSupabaseServiceClient } from '../../_shared/sbClient.ts';
import { jsonError, jsonSuccess } from '../../_shared/responses.ts';

export default async function (req: Request) {
  try {
    const url = new URL(req.url);
    const q = url.searchParams.get('q') || 'software engineering';
    const ttlMinutes = Number(url.searchParams.get('ttl') || '15');

    const key = `openlibrary:${q}`;
    const supabase = createSupabaseServiceClient();

    // check cache
    const { data: cached } = await supabase.from('external_cache').select('response,expires_at').eq('key', key).maybeSingle();
    if (cached && new Date(cached.expires_at) > new Date()) {
      const payload = (cached.response && typeof cached.response === 'object') ? cached.response : { results: cached.response };
      return jsonSuccess(payload as Record<string, unknown>);
    }

    const apiUrl = `https://openlibrary.org/search.json?q=${encodeURIComponent(q)}&limit=20`;
    const res = await fetch(apiUrl);
    const json = await res.json();

    const expiresAt = new Date(Date.now() + ttlMinutes * 60 * 1000).toISOString();
    await supabase.from('external_cache').upsert({ key, response: json, expires_at: expiresAt });

    const payload = (json && typeof json === 'object') ? json : { results: json };
    return jsonSuccess(payload as Record<string, unknown>);
  } catch (err) {
    console.error('books function error', err);
    return jsonError(String(err), 500);
  }
}
