import { createSupabaseServiceClient } from '../../_shared/sbClient.ts';
import { verifyAuth, unauthorizedResponse, handleCors, corsHeaders } from '../../_shared/auth.ts';

function getSegments(url: URL): string[] {
  const parts = url.pathname.split('/').filter(Boolean);
  const idx = parts.indexOf('admin_listings');
  return idx === -1 ? [] : parts.slice(idx + 1);
}

async function ensureAdmin(userId: string, supabase: ReturnType<typeof createSupabaseServiceClient>) {
  const { data, error } = await supabase
    .from('user_roles')
    .select('role')
    .eq('user_id', userId)
    .eq('role', 'admin')
    .maybeSingle();

  if (error || !data) {
    return false;
  }

  return true;
}

async function determineDisplayOrder(supabase: ReturnType<typeof createSupabaseServiceClient>, provided?: number | null) {
  if (typeof provided === 'number' && Number.isFinite(provided)) {
    return provided;
  }
  const { data } = await supabase
    .from('listings')
    .select('display_order')
    .order('display_order', { ascending: false })
    .limit(1)
    .maybeSingle();
  return (data?.display_order ?? 0) + 1;
}

export default async function (req: Request) {
  const corsResponse = handleCors(req);
  if (corsResponse) return corsResponse;

  const { user, error } = await verifyAuth(req);
  if (error || !user) {
    return unauthorizedResponse(error || 'Authentication required');
  }

  const supabase = createSupabaseServiceClient();
  const isAdmin = await ensureAdmin(user.id, supabase);
  if (!isAdmin) {
    return new Response(
      JSON.stringify({ ok: false, error: 'Admin role required' }),
      { status: 403, headers: { 'Content-Type': 'application/json', ...corsHeaders } },
    );
  }

  const url = new URL(req.url);
  const segments = getSegments(url);
  const listingId = segments[0] ?? null;
  const action = segments[1] ?? null;

  try {
    if (req.method === 'GET' && !listingId) {
      const { data, error: fetchError } = await supabase
        .from('listings')
        .select('*, companies:companies!listings_company_id_fkey(id, name)')
        .order('display_order', { ascending: true })
        .order('created_at', { ascending: false });

      if (fetchError) {
        console.error('admin listings fetch error', fetchError);
        return new Response(
          JSON.stringify({ ok: false, error: 'Failed to load listings' }),
          { status: 500, headers: { 'Content-Type': 'application/json', ...corsHeaders } },
        );
      }

      return new Response(
        JSON.stringify({ ok: true, items: data ?? [] }),
        { status: 200, headers: { 'Content-Type': 'application/json', ...corsHeaders } },
      );
    }

    if (req.method === 'POST' && !listingId) {
      const payload = await req.json().catch(() => null) as {
        title?: string;
        description?: string;
        company_id?: string | null;
        is_featured?: boolean;
        display_order?: number;
      } | null;

      const title = payload?.title?.trim();
      const description = payload?.description?.trim();

      if (!title || !description) {
        return new Response(
          JSON.stringify({ ok: false, error: 'Title and description are required' }),
          { status: 400, headers: { 'Content-Type': 'application/json', ...corsHeaders } },
        );
      }

      const displayOrder = await determineDisplayOrder(supabase, payload?.display_order ?? null);

      const { data, error: insertError } = await supabase
        .from('listings')
        .insert({
          title,
          description,
          company_id: payload?.company_id?.trim() || null,
          is_featured: payload?.is_featured ?? false,
          display_order: displayOrder,
        })
        .select('*')
        .maybeSingle();

      if (insertError) {
        console.error('admin listings insert error', insertError);
        return new Response(
          JSON.stringify({ ok: false, error: 'Failed to create listing' }),
          { status: 500, headers: { 'Content-Type': 'application/json', ...corsHeaders } },
        );
      }

      return new Response(
        JSON.stringify({ ok: true, item: data }),
        { status: 201, headers: { 'Content-Type': 'application/json', ...corsHeaders } },
      );
    }

    if (req.method === 'PUT' && listingId) {
      const payload = await req.json().catch(() => null) as {
        title?: string;
        description?: string;
        company_id?: string | null;
        is_featured?: boolean;
        display_order?: number;
      } | null;

      if (!payload) {
        return new Response(
          JSON.stringify({ ok: false, error: 'Invalid JSON payload' }),
          { status: 400, headers: { 'Content-Type': 'application/json', ...corsHeaders } },
        );
      }

      const updates: Record<string, unknown> = {};

      if (payload.title !== undefined) {
        const trimmed = payload.title.trim();
        if (!trimmed) {
          return new Response(
            JSON.stringify({ ok: false, error: 'Title cannot be empty' }),
            { status: 400, headers: { 'Content-Type': 'application/json', ...corsHeaders } },
          );
        }
        updates.title = trimmed;
      }

      if (payload.description !== undefined) {
        const trimmed = payload.description.trim();
        if (!trimmed) {
          return new Response(
            JSON.stringify({ ok: false, error: 'Description cannot be empty' }),
            { status: 400, headers: { 'Content-Type': 'application/json', ...corsHeaders } },
          );
        }
        updates.description = trimmed;
      }

      if (payload.company_id !== undefined) {
        updates.company_id = payload.company_id?.trim() || null;
      }

      if (payload.is_featured !== undefined) {
        updates.is_featured = Boolean(payload.is_featured);
      }

      if (payload.display_order !== undefined) {
        updates.display_order = payload.display_order;
      }

      if (Object.keys(updates).length === 0) {
        return new Response(
          JSON.stringify({ ok: false, error: 'No changes provided' }),
          { status: 400, headers: { 'Content-Type': 'application/json', ...corsHeaders } },
        );
      }

      const { data, error: updateError } = await supabase
        .from('listings')
        .update(updates)
        .eq('id', listingId)
        .select('*')
        .maybeSingle();

      if (updateError) {
        console.error('admin listings update error', updateError);
        return new Response(
          JSON.stringify({ ok: false, error: 'Failed to update listing' }),
          { status: 500, headers: { 'Content-Type': 'application/json', ...corsHeaders } },
        );
      }

      return new Response(
        JSON.stringify({ ok: true, item: data }),
        { status: 200, headers: { 'Content-Type': 'application/json', ...corsHeaders } },
      );
    }

    if (req.method === 'DELETE' && listingId) {
      const { error: deleteError } = await supabase
        .from('listings')
        .delete()
        .eq('id', listingId);

      if (deleteError) {
        console.error('admin listings delete error', deleteError);
        return new Response(
          JSON.stringify({ ok: false, error: 'Failed to delete listing' }),
          { status: 500, headers: { 'Content-Type': 'application/json', ...corsHeaders } },
        );
      }

      return new Response(null, { status: 204, headers: { ...corsHeaders } });
    }

    if (req.method === 'PATCH' && listingId && action === 'feature') {
      const payload = await req.json().catch(() => null) as { is_featured?: boolean } | null;
      if (typeof payload?.is_featured !== 'boolean') {
        return new Response(
          JSON.stringify({ ok: false, error: 'is_featured boolean is required' }),
          { status: 400, headers: { 'Content-Type': 'application/json', ...corsHeaders } },
        );
      }

      const { data, error: patchError } = await supabase
        .from('listings')
        .update({ is_featured: payload.is_featured })
        .eq('id', listingId)
        .select('*')
        .maybeSingle();

      if (patchError) {
        console.error('admin listings feature error', patchError);
        return new Response(
          JSON.stringify({ ok: false, error: 'Failed to update feature state' }),
          { status: 500, headers: { 'Content-Type': 'application/json', ...corsHeaders } },
        );
      }

      return new Response(
        JSON.stringify({ ok: true, item: data }),
        { status: 200, headers: { 'Content-Type': 'application/json', ...corsHeaders } },
      );
    }

    if (req.method === 'PATCH' && listingId && action === 'order') {
      const payload = await req.json().catch(() => null) as { display_order?: number } | null;
      if (typeof payload?.display_order !== 'number' || !Number.isFinite(payload.display_order)) {
        return new Response(
          JSON.stringify({ ok: false, error: 'display_order numeric value is required' }),
          { status: 400, headers: { 'Content-Type': 'application/json', ...corsHeaders } },
        );
      }

      const { data, error: patchError } = await supabase
        .from('listings')
        .update({ display_order: payload.display_order })
        .eq('id', listingId)
        .select('*')
        .maybeSingle();

      if (patchError) {
        console.error('admin listings order error', patchError);
        return new Response(
          JSON.stringify({ ok: false, error: 'Failed to update display order' }),
          { status: 500, headers: { 'Content-Type': 'application/json', ...corsHeaders } },
        );
      }

      return new Response(
        JSON.stringify({ ok: true, item: data }),
        { status: 200, headers: { 'Content-Type': 'application/json', ...corsHeaders } },
      );
    }

    return new Response(
      JSON.stringify({ ok: false, error: 'Not found' }),
      { status: 404, headers: { 'Content-Type': 'application/json', ...corsHeaders } },
    );
  } catch (err) {
    console.error('admin listings handler error', err);
    return new Response(
      JSON.stringify({ ok: false, error: 'Internal server error' }),
      { status: 500, headers: { 'Content-Type': 'application/json', ...corsHeaders } },
    );
  }
}
