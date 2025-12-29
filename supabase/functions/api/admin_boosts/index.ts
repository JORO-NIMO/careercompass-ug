import { createSupabaseServiceClient } from '../_shared/sbClient.ts';
import { verifyAuth, unauthorizedResponse, handleCors } from '../_shared/auth.ts';
import { jsonError, jsonSuccess } from '../_shared/responses.ts';

function getSegments(url: URL): string[] {
  const parts = url.pathname.split('/').filter(Boolean);
  // Handle both /api/admin/boosts and legacy /admin_boosts patterns
  const adminIdx = parts.indexOf('admin');
  const boostsIdx = parts.indexOf('boosts');

  // If /admin/boosts pattern, return segments after 'boosts'
  if (adminIdx !== -1 && boostsIdx !== -1 && boostsIdx > adminIdx) {
    return parts.slice(boostsIdx + 1);
  }

  // Fallback for legacy /admin_boosts pattern
  const legacyIdx = parts.indexOf('admin_boosts');
  return legacyIdx === -1 ? [] : parts.slice(legacyIdx + 1);
}

function isValidEntityType(value: unknown): value is 'company' | 'listing' {
  return value === 'company' || value === 'listing';
}

function normalizeIso(value: unknown): string | null {
  if (typeof value !== 'string') return null;
  const timestamp = new Date(value);
  if (Number.isNaN(timestamp.getTime())) return null;
  return timestamp.toISOString();
}

export default async function (req: Request) {
  const corsResponse = handleCors(req);
  if (corsResponse) return corsResponse;

  const { user, error } = await verifyAuth(req);
  if (error || !user) {
    return unauthorizedResponse(error || 'Authentication required');
  }

  const supabase = createSupabaseServiceClient();
  const { data: roleData } = await supabase
    .from('user_roles')
    .select('role')
    .eq('user_id', user.id)
    .eq('role', 'admin')
    .maybeSingle();

  if (!roleData) {
    return jsonError('Admin role required', 403);
  }

  const url = new URL(req.url);
  const segments = getSegments(url);
  const resourceId = segments[0];

  try {
    if (req.method === 'GET' && !resourceId) {
      const { data, error: fetchError } = await supabase
        .from('boosts')
        .select('id, entity_id, entity_type, starts_at, ends_at, is_active, payment_id, created_at')
        .order('starts_at', { ascending: false });

      if (fetchError) {
        console.error('admin boosts fetch error', fetchError);
        return jsonError('Failed to load boosts', 500);
      }

      return jsonSuccess({ items: data ?? [] });
    }

    if (req.method === 'POST' && !resourceId) {
      const payload = await req.json().catch(() => ({}));
      const entityId = typeof payload.entity_id === 'string' ? payload.entity_id : '';
      const entityType = isValidEntityType(payload.entity_type) ? payload.entity_type : 'listing';
      const startsAtIso = normalizeIso(payload.starts_at) ?? new Date().toISOString();
      const endsAtIso = normalizeIso(payload.ends_at);
      const isActive = payload.is_active === false ? false : true;

      if (!entityId) {
        return jsonError('entity_id is required', 400);
      }

      if (!endsAtIso) {
        return jsonError('ends_at must be a valid timestamp', 400);
      }

      if (new Date(endsAtIso).getTime() <= new Date(startsAtIso).getTime()) {
        return jsonError('ends_at must be after starts_at', 400);
      }

      const { data, error: insertError } = await supabase
        .from('boosts')
        .insert({
          entity_id: entityId,
          entity_type: entityType,
          starts_at: startsAtIso,
          ends_at: endsAtIso,
          is_active: isActive,
        })
        .select()
        .maybeSingle();

      if (insertError) {
        console.error('admin boosts create error', insertError);
        return jsonError('Failed to create boost', 500);
      }

      return jsonSuccess({ item: data }, 201);
    }

    if (req.method === 'PATCH' && resourceId) {
      const payload = await req.json().catch(() => ({}));
      const updates: Record<string, unknown> = {};

      if (payload.is_active !== undefined) {
        updates.is_active = Boolean(payload.is_active);
      }

      if (payload.starts_at !== undefined) {
        const startsAtIso = normalizeIso(payload.starts_at);
        if (!startsAtIso) {
          return jsonError('starts_at must be a valid timestamp', 400);
        }
        updates.starts_at = startsAtIso;
      }

      if (payload.ends_at !== undefined) {
        const endsAtIso = normalizeIso(payload.ends_at);
        if (!endsAtIso) {
          return jsonError('ends_at must be a valid timestamp', 400);
        }
        updates.ends_at = endsAtIso;
      }

      if (Object.keys(updates).length === 0) {
        return jsonError('No updates provided', 400);
      }

      if (updates.starts_at && updates.ends_at) {
        if (new Date(updates.ends_at as string).getTime() <= new Date(updates.starts_at as string).getTime()) {
          return jsonError('ends_at must be after starts_at', 400);
        }
      }

      const { data, error: updateError } = await supabase
        .from('boosts')
        .update(updates)
        .eq('id', resourceId)
        .select()
        .maybeSingle();

      if (updateError) {
        console.error('admin boosts update error', updateError);
        return jsonError('Failed to update boost', 500);
      }

      return jsonSuccess({ item: data });
    }

    if (req.method === 'DELETE' && resourceId) {
      const { data, error: updateError } = await supabase
        .from('boosts')
        .update({ is_active: false, ends_at: new Date().toISOString() })
        .eq('id', resourceId)
        .select()
        .maybeSingle();

      if (updateError) {
        console.error('admin boosts revoke error', updateError);
        return jsonError('Failed to revoke boost', 500);
      }

      return jsonSuccess({ item: data });
    }

  } catch (err) {
    const error = err instanceof Error ? err : new Error(String(err));
    console.error('admin boosts handler error', error);
    return jsonError(error.message, 500, {
      stack: error.stack?.split('\n').slice(0, 5)
    });
  }
}
