import { createSupabaseServiceClient } from '../../_shared/sbClient.ts';
import { verifyAuth, unauthorizedResponse, handleCors } from '../../_shared/auth.ts';
import { jsonError, jsonSuccess } from '../../_shared/responses.ts';

async function ensureAdmin(userId: string, supabase: ReturnType<typeof createSupabaseServiceClient>) {
  const { data, error } = await supabase
    .from('user_roles')
    .select('role')
    .eq('user_id', userId)
    .eq('role', 'admin')
    .maybeSingle();

  return Boolean(data) && !error;
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

  if (req.method === 'GET') {
    const url = new URL(req.url);
    const ownerId = url.searchParams.get('owner_id');

    if (ownerId) {
      const { data: balanceRow, error: balanceError } = await supabase
        .from('bullets')
        .select('owner_id, balance, updated_at, created_at')
        .eq('owner_id', ownerId)
        .maybeSingle();

      if (balanceError) {
        console.error('admin bullets fetch balance error', balanceError);
        return jsonError('Failed to load bullet balance', 500);
      }

      const { data: transactions, error: txError } = await supabase
        .from('bullet_transactions')
        .select('id, delta, reason, created_at, created_by')
        .eq('owner_id', ownerId)
        .order('created_at', { ascending: false })
        .limit(50);

      if (txError) {
        console.error('admin bullets fetch transactions error', txError);
        return jsonError('Failed to load bullet transactions', 500);
      }

      return jsonSuccess({
        balance: balanceRow ?? { owner_id: ownerId, balance: 0, created_at: null, updated_at: null },
        transactions: transactions ?? [],
      });
    }

    const { data, error: listError } = await supabase
      .from('bullets')
      .select('owner_id, balance, updated_at, created_at')
      .order('updated_at', { ascending: false })
      .limit(100);

    if (listError) {
      console.error('admin bullets list error', listError);
      return jsonError('Failed to load bullet balances', 500);
    }

    return jsonSuccess({ items: data ?? [] });
  }

  if (req.method === 'POST') {
    const payload = await req.json().catch(() => null) as {
      owner_id?: string;
      delta?: number;
      reason?: string;
    } | null;

    const ownerId = payload?.owner_id?.trim();
    const delta = payload?.delta;
    const reason = payload?.reason?.trim();

    if (!ownerId || typeof delta !== 'number' || !Number.isInteger(delta) || !reason) {
      return jsonError('owner_id, integer delta, and reason are required', 400);
    }

    try {
      const { data, error: rpcError } = await supabase.rpc('adjust_bullet_balance', {
        p_owner_id: ownerId,
        p_delta: delta,
        p_reason: reason,
        p_actor: user.id,
        p_require_admin: true,
      });

      if (rpcError) {
        throw rpcError;
      }

      return jsonSuccess({ balance: data });
    } catch (err: unknown) {
      console.error('admin bullets adjust error', err);
      const message = err instanceof Error ? err.message : 'Failed to adjust bullet balance';
      return jsonError(message, 400);
    }
  }

  return jsonError('Method not allowed', 405);
}
