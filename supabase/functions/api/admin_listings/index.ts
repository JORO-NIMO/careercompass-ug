import { createSupabaseServiceClient } from '../_shared/sbClient.ts';
import { verifyAuth, unauthorizedResponse, handleCors } from '../_shared/auth.ts';
import { jsonError, jsonSuccess, withRateLimitHeaders, jsonErrorWithId, withHeaders } from '../_shared/responses.ts';
import { getRequestId } from '../../_shared/request.ts';
import {
  checkRateLimitUnified as checkRateLimit,
  getClientIdentifier,
  rateLimitExceededResponse,
  RATE_LIMITS,
} from '../../_shared/rateLimit.ts';

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

  const reqId = getRequestId(req);
  const { user, error } = await verifyAuth(req);
  if (error || !user) {
    return jsonErrorWithId(error || 'Authentication required', 401, {}, {}, reqId);
  }

  const supabase = createSupabaseServiceClient();
  const isAdmin = await ensureAdmin(user.id, supabase);
  if (!isAdmin) {
    return jsonErrorWithId('Admin role required', 403, {}, {}, reqId);
  }

  // Rate limit admin operations per user/IP
  const clientId = getClientIdentifier(req, user.id);
  const rl = await checkRateLimit(clientId, RATE_LIMITS.admin);
  if (!rl.allowed) {
    return rateLimitExceededResponse(rl.resetAt, reqId);
  }
  const rateHeaders = withRateLimitHeaders({}, rl.remaining, rl.resetAt);
  const reqHeaders = withHeaders(rateHeaders, { 'X-Request-Id': reqId });

  const url = new URL(req.url);
  const segments = getSegments(url);
  const listingId = segments[0] ?? null;
  const action = segments[1] ?? null;
  const limitParam = Number(url.searchParams.get('limit') || '0');
  const pageLimit = Number.isFinite(limitParam) && limitParam > 0 ? Math.min(limitParam, 200) : null;

  try {
    // Bulk publish: /api/admin/listings/bulk-publish
    if (req.method === 'POST' && !listingId && (segments[0] === 'bulk-publish' || segments[0] === 'bulk_publish')) {
      const payload = await req.json().catch(() => null) as {
        ids?: string[];
        autoFeatureByType?: boolean;
        featureTypes?: string[];
        companyAssignments?: Record<string, string | null>;
      } | null;

      const ids = Array.isArray(payload?.ids) ? payload!.ids.filter((x) => typeof x === 'string' && x.trim().length) : [];
      if (ids.length === 0) {
        return jsonErrorWithId('ids array is required', 400, {}, reqHeaders, reqId);
      }

      const autoFeature = Boolean(payload?.autoFeatureByType);
      const featureTypes = (payload?.featureTypes && payload.featureTypes.length > 0)
        ? payload.featureTypes.map((t) => t.toLowerCase())
        : ['scholarship', 'fellowship'];

      // Fetch listings to determine opportunity_type and apply optional company assignments
      const { data: rows, error: fetchErr } = await supabase
        .from('listings')
        .select('id, opportunity_type, company_id')
        .in('id', ids);

      if (fetchErr) {
        console.error('bulk-publish fetch error', fetchErr);
        return jsonErrorWithId('Failed to load listings for bulk publish', 500, {}, reqHeaders, reqId);
      }

      // Optional company assignments
      const assignments = payload?.companyAssignments || {};
      const assignIds = Object.keys(assignments).filter((k) => ids.includes(k));
      if (assignIds.length > 0) {
        // Apply company assignments per id
        for (const id of assignIds) {
          const companyId = assignments[id];
          const { error: assignErr } = await supabase
            .from('listings')
            .update({ company_id: companyId ?? null })
            .eq('id', id);
          if (assignErr) {
            console.warn('bulk-publish company assignment warning:', id, assignErr.message);
          }
        }
      }

      // Publish all
      const nowIso = new Date().toISOString();
      const { error: pubErr } = await supabase
        .from('listings')
        .update({ status: 'published', published_at: nowIso })
        .in('id', ids);
      if (pubErr) {
        console.error('bulk-publish update error', pubErr);
        return jsonErrorWithId('Failed to publish listings', 500, {}, reqHeaders, reqId);
      }

      // Determine which to feature
      let featuredCount = 0;
      if (autoFeature && Array.isArray(rows)) {
        const featureIds = rows
          .filter((r) => featureTypes.includes((r.opportunity_type || '').toLowerCase()))
          .map((r) => r.id);
        if (featureIds.length > 0) {
          const { error: featErr } = await supabase
            .from('listings')
            .update({ is_featured: true })
            .in('id', featureIds);
          if (featErr) {
            console.warn('bulk-publish feature step warning:', featErr.message);
          } else {
            featuredCount = featureIds.length;
          }
        }
      }

      // Audit logs per listing
      for (const id of ids) {
        const changes: Record<string, unknown> = {
          auto_feature: autoFeature,
          featured_types: featureTypes,
          published_at: nowIso,
        };
        if (assignments[id] !== undefined) {
          changes.company_assigned = assignments[id] ?? null;
        }
        await supabase
          .from('admin_audit_logs')
          .insert({
            admin_id: user.id,
            action: 'publish',
            target_table: 'listings',
            target_id: id,
            changes,
          });
      }

      return jsonSuccess({ publishedCount: ids.length, featuredCount }, 200, reqHeaders);
    }
    if (req.method === 'GET' && !listingId) {
      let query = supabase
        .from('listings')
        .select('*, companies:companies!listings_company_id_fkey(id, name)')
        .order('display_order', { ascending: true })
        .order('created_at', { ascending: false });
      if (pageLimit) {
        query = query.limit(pageLimit);
      }
      const { data, error: fetchError } = await query;

      if (fetchError) {
        console.error('admin listings fetch error', fetchError);
        return jsonErrorWithId(`Failed to load listings: ${fetchError.message}`, 500, fetchError, reqHeaders, reqId);
      }

      return jsonSuccess({ items: data ?? [] }, 200, reqHeaders);
    }

    if (req.method === 'POST' && !listingId) {
      const payload = await req.json().catch(() => null) as {
        title?: string;
        description?: string;
        company_id?: string | null;
        is_featured?: boolean;
        display_order?: number;
        image_url?: string | null;
      } | null;

      const title = payload?.title?.trim();
      const description = payload?.description?.trim();

      if (!title || !description) {
        return jsonErrorWithId('Title and description are required', 400, {}, reqHeaders, reqId);
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
          image_url: payload?.image_url?.trim() || null,
        })
        .select('*')
        .maybeSingle();

      if (insertError) {
        console.error('admin listings insert error', insertError);
        return jsonErrorWithId('Failed to create listing', 500, {}, reqHeaders, reqId);
      }

      return jsonSuccess({ item: data }, 201, reqHeaders);
    }

    if (req.method === 'PUT' && listingId) {
      const payload = await req.json().catch(() => null) as {
        title?: string;
        description?: string;
        company_id?: string | null;
        is_featured?: boolean;
        display_order?: number;
        image_url?: string | null;
      } | null;

      if (!payload) {
        return jsonErrorWithId('Invalid JSON payload', 400, {}, reqHeaders, reqId);
      }

      const updates: Record<string, unknown> = {};

      if (payload.title !== undefined) {
        const trimmed = payload.title.trim();
        if (!trimmed) {
          return jsonErrorWithId('Title cannot be empty', 400, {}, reqHeaders, reqId);
        }
        updates.title = trimmed;
      }

      if (payload.description !== undefined) {
        const trimmed = payload.description.trim();
        if (!trimmed) {
          return jsonErrorWithId('Description cannot be empty', 400, {}, reqHeaders, reqId);
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

      if (payload.image_url !== undefined) {
        updates.image_url = payload.image_url?.trim() || null;
      }

      if (Object.keys(updates).length === 0) {
        return jsonErrorWithId('No changes provided', 400, {}, reqHeaders, reqId);
      }

      const { data, error: updateError } = await supabase
        .from('listings')
        .update(updates)
        .eq('id', listingId)
        .select('*')
        .maybeSingle();

      if (updateError) {
        console.error('admin listings update error', updateError);
        return jsonErrorWithId('Failed to update listing', 500, {}, reqHeaders, reqId);
      }

      return jsonSuccess({ item: data }, 200, reqHeaders);
    }

    if (req.method === 'DELETE' && listingId) {
      const { error: deleteError } = await supabase
        .from('listings')
        .delete()
        .eq('id', listingId);

      if (deleteError) {
        console.error('admin listings delete error', deleteError);
        return jsonErrorWithId('Failed to delete listing', 500, {}, reqHeaders, reqId);
      }

      return jsonSuccess({}, 200, reqHeaders);
    }

    if (req.method === 'PATCH' && listingId && action === 'feature') {
      const payload = await req.json().catch(() => null) as { is_featured?: boolean } | null;
      if (typeof payload?.is_featured !== 'boolean') {
        return jsonErrorWithId('is_featured boolean is required', 400, {}, reqHeaders, reqId);
      }

      const { data, error: patchError } = await supabase
        .from('listings')
        .update({ is_featured: payload.is_featured })
        .eq('id', listingId)
        .select('*')
        .maybeSingle();

      if (patchError) {
        console.error('admin listings feature error', patchError);
        return jsonErrorWithId('Failed to update feature state', 500, {}, reqHeaders, reqId);
      }

      return jsonSuccess({ item: data }, 200, reqHeaders);
    }

    if (req.method === 'PATCH' && listingId && action === 'order') {
      const payload = await req.json().catch(() => null) as { display_order?: number } | null;
      if (typeof payload?.display_order !== 'number' || !Number.isFinite(payload.display_order)) {
        return jsonErrorWithId('display_order numeric value is required', 400, {}, reqHeaders, reqId);
      }

      const { data, error: patchError } = await supabase
        .from('listings')
        .update({ display_order: payload.display_order })
        .eq('id', listingId)
        .select('*')
        .maybeSingle();

      if (patchError) {
        console.error('admin listings order error', patchError);
        return jsonErrorWithId('Failed to update display order', 500, {}, reqHeaders, reqId);
      }

      return jsonSuccess({ item: data }, 200, reqHeaders);
    }

  } catch (err) {
    const error = err instanceof Error ? err : new Error(String(err));
    console.error('admin listings handler error', error);
    return jsonErrorWithId(error.message, 500, {
      stack: error.stack?.split('\n').slice(0, 5)
    }, reqHeaders, reqId);
  }
}
