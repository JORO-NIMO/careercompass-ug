import { createSupabaseServiceClient } from '../../_shared/sbClient.ts';
import { verifyAuth, unauthorizedResponse, handleCors, corsHeaders } from '../../_shared/auth.ts';

function getSegments(url: URL): string[] {
  const parts = url.pathname.split('/').filter(Boolean);
  const idx = parts.indexOf('admin_boosts');
  return idx === -1 ? [] : parts.slice(idx + 1);
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
    return new Response(
      JSON.stringify({ ok: false, error: 'Admin role required' }),
      { status: 403, headers: { 'Content-Type': 'application/json', ...corsHeaders } }
    );
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
        return new Response(
          JSON.stringify({ ok: false, error: 'Failed to load boosts' }),
          { status: 500, headers: { 'Content-Type': 'application/json', ...corsHeaders } }
        );
      }

      return new Response(
        JSON.stringify({ ok: true, items: data ?? [] }),
        { status: 200, headers: { 'Content-Type': 'application/json', ...corsHeaders } }
      );
    }

    if (req.method === 'POST' && !resourceId) {
      const payload = await req.json().catch(() => ({}));
      const entityId = typeof payload.entity_id === 'string' ? payload.entity_id : '';
      const entityType = isValidEntityType(payload.entity_type) ? payload.entity_type : 'listing';
      const startsAtIso = normalizeIso(payload.starts_at) ?? new Date().toISOString();
      const endsAtIso = normalizeIso(payload.ends_at);
      const isActive = payload.is_active === false ? false : true;

      if (!entityId) {
        return new Response(
          JSON.stringify({ ok: false, error: 'entity_id is required' }),
          { status: 400, headers: { 'Content-Type': 'application/json', ...corsHeaders } }
        );
      }

      if (!endsAtIso) {
        return new Response(
          JSON.stringify({ ok: false, error: 'ends_at must be a valid timestamp' }),
          { status: 400, headers: { 'Content-Type': 'application/json', ...corsHeaders } }
        );
      }

      if (new Date(endsAtIso).getTime() <= new Date(startsAtIso).getTime()) {
        return new Response(
          JSON.stringify({ ok: false, error: 'ends_at must be after starts_at' }),
          { status: 400, headers: { 'Content-Type': 'application/json', ...corsHeaders } }
        );
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
        return new Response(
          JSON.stringify({ ok: false, error: 'Failed to create boost' }),
          { status: 500, headers: { 'Content-Type': 'application/json', ...corsHeaders } }
        );
      }

      return new Response(
        JSON.stringify({ ok: true, item: data }),
        { status: 201, headers: { 'Content-Type': 'application/json', ...corsHeaders } }
      );
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
          return new Response(
            JSON.stringify({ ok: false, error: 'starts_at must be a valid timestamp' }),
            { status: 400, headers: { 'Content-Type': 'application/json', ...corsHeaders } }
          );
        }
        updates.starts_at = startsAtIso;
      }

      if (payload.ends_at !== undefined) {
        const endsAtIso = normalizeIso(payload.ends_at);
        if (!endsAtIso) {
          return new Response(
            JSON.stringify({ ok: false, error: 'ends_at must be a valid timestamp' }),
            { status: 400, headers: { 'Content-Type': 'application/json', ...corsHeaders } }
          );
        }
        updates.ends_at = endsAtIso;
      }

      if (Object.keys(updates).length === 0) {
        return new Response(
          JSON.stringify({ ok: false, error: 'No updates provided' }),
          { status: 400, headers: { 'Content-Type': 'application/json', ...corsHeaders } }
        );
      }

      if (updates.starts_at && updates.ends_at) {
        if (new Date(updates.ends_at as string).getTime() <= new Date(updates.starts_at as string).getTime()) {
          return new Response(
            JSON.stringify({ ok: false, error: 'ends_at must be after starts_at' }),
            { status: 400, headers: { 'Content-Type': 'application/json', ...corsHeaders } }
          );
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
        return new Response(
          JSON.stringify({ ok: false, error: 'Failed to update boost' }),
          { status: 500, headers: { 'Content-Type': 'application/json', ...corsHeaders } }
        );
      }

      return new Response(
        JSON.stringify({ ok: true, item: data }),
        { status: 200, headers: { 'Content-Type': 'application/json', ...corsHeaders } }
      );
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
        return new Response(
          JSON.stringify({ ok: false, error: 'Failed to revoke boost' }),
          { status: 500, headers: { 'Content-Type': 'application/json', ...corsHeaders } }
        );
      }

      return new Response(
        JSON.stringify({ ok: true, item: data }),
        { status: 200, headers: { 'Content-Type': 'application/json', ...corsHeaders } }
      );
    }

    return new Response(
      JSON.stringify({ ok: false, error: 'Not found' }),
      { status: 404, headers: { 'Content-Type': 'application/json', ...corsHeaders } }
    );
  } catch (err) {
    console.error('admin boosts handler error', err);
    return new Response(
      JSON.stringify({ ok: false, error: 'Internal server error' }),
      { status: 500, headers: { 'Content-Type': 'application/json', ...corsHeaders } }
    );
  }
}
