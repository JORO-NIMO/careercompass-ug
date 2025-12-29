import { createSupabaseServiceClient } from '../_shared/sbClient.ts';
import { verifyAuth, unauthorizedResponse, handleCors } from '../_shared/auth.ts';
import { jsonError, jsonSuccess } from '../_shared/responses.ts';

function getSegments(url: URL): string[] {
  const parts = url.pathname.split('/').filter(Boolean);
  // Handle both /api/admin/listings and legacy /admin_listings patterns
  const adminIdx = parts.indexOf('admin');
  const listingsIdx = parts.indexOf('listings');

  // If /admin/listings pattern, return segments after 'listings'
  if (adminIdx !== -1 && listingsIdx !== -1 && listingsIdx > adminIdx) {
    return parts.slice(listingsIdx + 1);
  }

  // Fallback for legacy /admin_listings pattern
  const legacyIdx = parts.indexOf('admin_listings');
  return legacyIdx === -1 ? [] : parts.slice(legacyIdx + 1);
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
    return jsonError('Admin role required', 403);
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
        console.error('admin listings fetch error', fetchError);
        return jsonError('Failed to load listings', 500);
      }

      return jsonSuccess({ items: data ?? [] });
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
        return jsonError('Title and description are required', 400);
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
        return jsonError('Failed to create listing', 500);
      }

      return jsonSuccess({ item: data }, 201);
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
        return jsonError('Invalid JSON payload', 400);
      }

      const updates: Record<string, unknown> = {};

      if (payload.title !== undefined) {
        const trimmed = payload.title.trim();
        if (!trimmed) {
          return jsonError('Title cannot be empty', 400);
        }
        updates.title = trimmed;
      }

      if (payload.description !== undefined) {
        const trimmed = payload.description.trim();
        if (!trimmed) {
          return jsonError('Description cannot be empty', 400);
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
        return jsonError('No changes provided', 400);
      }

      const { data, error: updateError } = await supabase
        .from('listings')
        .update(updates)
        .eq('id', listingId)
        .select('*')
        .maybeSingle();

      if (updateError) {
        console.error('admin listings update error', updateError);
        return jsonError('Failed to update listing', 500);
      }

      return jsonSuccess({ item: data });
    }

    if (req.method === 'DELETE' && listingId) {
      const { error: deleteError } = await supabase
        .from('listings')
        .delete()
        .eq('id', listingId);

      if (deleteError) {
        console.error('admin listings delete error', deleteError);
        return jsonError('Failed to delete listing', 500);
      }

      return jsonSuccess({});
    }

    if (req.method === 'PATCH' && listingId && action === 'feature') {
      const payload = await req.json().catch(() => null) as { is_featured?: boolean } | null;
      if (typeof payload?.is_featured !== 'boolean') {
        return jsonError('is_featured boolean is required', 400);
      }

      const { data, error: patchError } = await supabase
        .from('listings')
        .update({ is_featured: payload.is_featured })
        .eq('id', listingId)
        .select('*')
        .maybeSingle();

      if (patchError) {
        console.error('admin listings feature error', patchError);
        return jsonError('Failed to update feature state', 500);
      }

      return jsonSuccess({ item: data });
    }

    if (req.method === 'PATCH' && listingId && action === 'order') {
      const payload = await req.json().catch(() => null) as { display_order?: number } | null;
      if (typeof payload?.display_order !== 'number' || !Number.isFinite(payload.display_order)) {
        return jsonError('display_order numeric value is required', 400);
      }

      const { data, error: patchError } = await supabase
        .from('listings')
        .update({ display_order: payload.display_order })
        .eq('id', listingId)
        .select('*')
        .maybeSingle();

      if (patchError) {
        console.error('admin listings order error', patchError);
        return jsonError('Failed to update display order', 500);
      }

      return jsonSuccess({ item: data });
    }

    return jsonError('Not found', 404);
  } catch (err) {
    console.error('admin listings handler error', err);
    return jsonError('Internal server error', 500);
  }
}
