import { createSupabaseServiceClient } from '../../_shared/sbClient.ts';
import { verifyAuth, unauthorizedResponse, handleCors } from '../../_shared/auth.ts';
import { jsonError, jsonSuccess } from '../../_shared/responses.ts';

function getSegments(url: URL): string[] {
  const parts = url.pathname.split('/').filter(Boolean);
  const idx = parts.indexOf('bullets');
  return idx === -1 ? [] : parts.slice(idx + 1);
}

async function canAccessOwner(
  supabase: ReturnType<typeof createSupabaseServiceClient>,
  ownerId: string,
  userId: string,
) {
  if (ownerId === userId) {
    return true;
  }

  const { data, error } = await supabase
    .from('companies')
    .select('id')
    .eq('id', ownerId)
    .eq('owner_id', userId)
    .maybeSingle();

  if (error) {
    console.error('bullets access check error', error);
    throw error;
  }

  return Boolean(data);
}

export default async function (req: Request) {
  const corsResponse = handleCors(req);
  if (corsResponse) return corsResponse;

  const { user, error } = await verifyAuth(req);
  if (error || !user) {
    return unauthorizedResponse(error || 'Authentication required');
  }

  const supabase = createSupabaseServiceClient();
  const url = new URL(req.url);
  const segments = getSegments(url);
  const ownerId = segments[0] ?? user.id;

  if (req.method === 'GET') {
    try {
      if (!(await canAccessOwner(supabase, ownerId, user.id))) {
        return jsonError('Not authorized to view this balance', 403);
      }

      const { data: balanceRow, error: balanceError } = await supabase
        .from('bullets')
        .select('owner_id, balance, updated_at, created_at')
        .eq('owner_id', ownerId)
        .maybeSingle();

      if (balanceError) {
        throw balanceError;
      }

      const { data: transactions, error: txError } = await supabase
        .from('bullet_transactions')
        .select('id, delta, reason, created_at, created_by')
        .eq('owner_id', ownerId)
        .order('created_at', { ascending: false })
        .limit(50);

      if (txError) {
        throw txError;
      }

      return jsonSuccess({
        balance: balanceRow ?? { owner_id: ownerId, balance: 0, created_at: null, updated_at: null },
        transactions: transactions ?? [],
      });
    } catch (err: unknown) {
      console.error('bullets fetch error', err);
      const message = err instanceof Error ? err.message : 'Failed to load balance';
      return jsonError(message, 500);
    }
  }

  if (req.method === 'POST' && segments.length >= 2 && segments[1] === 'transactions') {
    let payload: {
      delta?: number;
      reason?: string;
      boost?: { listing_id?: string; duration_days?: number } | null;
    } | null = null;

    try {
      payload = await req.json();
    } catch (_) {
      payload = null;
    }

    const delta = payload?.delta;
    const reason = payload?.reason?.trim();

    if (typeof delta !== 'number' || !Number.isInteger(delta) || delta >= 0 || !reason) {
      return jsonError('A negative integer delta and reason are required', 400);
    }

    try {
      if (!(await canAccessOwner(supabase, ownerId, user.id))) {
        return jsonError('Not authorized to spend bullets for this owner', 403);
      }

      let createdBoostId: string | null = null;
      const boost = payload?.boost;
      if (boost?.listing_id) {
        const durationDays = Number.isFinite(boost.duration_days) ? Math.max(1, Math.min(30, Number(boost.duration_days))) : 7;

        const { data: placement, error: placementError } = await supabase
          .from('placements')
          .select('id, created_by')
          .eq('id', boost.listing_id)
          .maybeSingle();

        if (placementError) {
          throw placementError;
        }

        if (!placement || placement.created_by !== user.id) {
          return jsonError('Listing unavailable for boost', 403);
        }

        const { data: currentBalanceRow, error: balanceError } = await supabase
          .from('bullets')
          .select('balance')
          .eq('owner_id', ownerId)
          .maybeSingle();

        if (balanceError) {
          throw balanceError;
        }

        const currentBalance = currentBalanceRow?.balance ?? 0;
        if (currentBalance + delta < 0) {
          return jsonError('Insufficient bullets for boost', 409);
        }

        const now = new Date();
        const ends = new Date(now.getTime());
        ends.setDate(ends.getDate() + durationDays);

        const { data: insertedBoost, error: boostInsertError } = await supabase
          .from('boosts')
          .insert({
            entity_id: boost.listing_id,
            entity_type: 'listing',
            starts_at: now.toISOString(),
            ends_at: ends.toISOString(),
            is_active: true,
            payment_id: null,
          })
          .select('id')
          .single();

        if (boostInsertError) {
          console.error('boost creation failed before bullet deduction', boostInsertError);
          return jsonError('Boost purchase failed', 500);
        }

        createdBoostId = insertedBoost?.id ?? null;
      }

      const { data, error: rpcError } = await supabase.rpc('adjust_bullet_balance', {
        p_owner_id: ownerId,
        p_delta: delta,
        p_reason: reason,
        p_actor: user.id,
        p_require_admin: false,
      });

      if (rpcError) {
        if (createdBoostId) {
          await supabase.from('boosts').delete().eq('id', createdBoostId);
        }
        throw rpcError;
      }

      return jsonSuccess({ balance: data });
    } catch (err: unknown) {
      console.error('bullets spend error', err);
      const message = err instanceof Error ? err.message : 'Failed to spend bullets';
      return jsonError(message, 400);
    }
  }

  return jsonError('Not found', 404);
}
