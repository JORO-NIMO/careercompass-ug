import { createSupabaseServiceClient } from '../../_shared/sbClient.ts';
import { verifyAuth, unauthorizedResponse, handleCors, corsHeaders } from '../../_shared/auth.ts';

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
    return new Response(
      JSON.stringify({ ok: false, error: 'Admin role required' }),
      { status: 403, headers: { 'Content-Type': 'application/json', ...corsHeaders } },
    );
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
        return new Response(
          JSON.stringify({ ok: false, error: 'Failed to load bullet balance' }),
          { status: 500, headers: { 'Content-Type': 'application/json', ...corsHeaders } },
        );
      }

      const { data: transactions, error: txError } = await supabase
        .from('bullet_transactions')
        .select('id, delta, reason, created_at, created_by')
        .eq('owner_id', ownerId)
        .order('created_at', { ascending: false })
        .limit(50);

      if (txError) {
        console.error('admin bullets fetch transactions error', txError);
        return new Response(
          JSON.stringify({ ok: false, error: 'Failed to load bullet transactions' }),
          { status: 500, headers: { 'Content-Type': 'application/json', ...corsHeaders } },
        );
      }

      return new Response(
        JSON.stringify({
          ok: true,
          balance: balanceRow ?? { owner_id: ownerId, balance: 0, created_at: null, updated_at: null },
          transactions: transactions ?? [],
        }),
        { status: 200, headers: { 'Content-Type': 'application/json', ...corsHeaders } },
      );
    }

    const { data, error: listError } = await supabase
      .from('bullets')
      .select('owner_id, balance, updated_at, created_at')
      .order('updated_at', { ascending: false })
      .limit(100);

    if (listError) {
      console.error('admin bullets list error', listError);
      return new Response(
        JSON.stringify({ ok: false, error: 'Failed to load bullet balances' }),
        { status: 500, headers: { 'Content-Type': 'application/json', ...corsHeaders } },
      );
    }

    return new Response(
      JSON.stringify({ ok: true, items: data ?? [] }),
      { status: 200, headers: { 'Content-Type': 'application/json', ...corsHeaders } },
    );
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
      return new Response(
        JSON.stringify({ ok: false, error: 'owner_id, integer delta, and reason are required' }),
        { status: 400, headers: { 'Content-Type': 'application/json', ...corsHeaders } },
      );
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

      return new Response(
        JSON.stringify({ ok: true, balance: data }),
        { status: 200, headers: { 'Content-Type': 'application/json', ...corsHeaders } },
      );
    } catch (err: any) {
      console.error('admin bullets adjust error', err);
      return new Response(
        JSON.stringify({ ok: false, error: err?.message ?? 'Failed to adjust bullet balance' }),
        { status: 400, headers: { 'Content-Type': 'application/json', ...corsHeaders } },
      );
    }
  }

  return new Response(
    JSON.stringify({ ok: false, error: 'Method not allowed' }),
    { status: 405, headers: { 'Content-Type': 'application/json', ...corsHeaders } },
  );
}
