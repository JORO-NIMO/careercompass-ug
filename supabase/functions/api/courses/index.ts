import { createSupabaseServiceClient } from '../../_shared/sbClient.ts';

export default async function (req: Request) {
  try {
    const url = new URL(req.url);
    const limit = Number(url.searchParams.get('limit') || '20');
    const ttlMinutes = Number(url.searchParams.get('ttl') || '15');

    const key = `coursera:limit=${limit}`;
    const supabase = createSupabaseServiceClient();

    const { data: cached } = await supabase.from('external_cache').select('response,expires_at').eq('key', key).maybeSingle();
    if (cached && new Date(cached.expires_at) > new Date()) {
      return new Response(JSON.stringify(cached.response), { status: 200 });
    }

    const apiUrl = `https://api.coursera.org/api/courses.v1?limit=${limit}`;
    const res = await fetch(apiUrl);
    const json = await res.json();

    const expiresAt = new Date(Date.now() + ttlMinutes * 60 * 1000).toISOString();
    await supabase.from('external_cache').upsert({ key, response: json, expires_at: expiresAt });

    return new Response(JSON.stringify(json), { status: 200 });
  } catch (err) {
    console.error('courses function error', err);
    return new Response(JSON.stringify({ ok: false, error: String(err) }), { status: 500 });
  }
}
