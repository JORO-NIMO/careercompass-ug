import { supabase } from '@/integrations/supabase/client';
import { resolveApiUrl } from '@/lib/api-client';
import type {
  AdminBulletDetail,
  AdminBulletList,
  AdminBulletResponse,
  BulletBalance,
  BulletTransaction,
} from '@/types/admin';
export type { BulletBalance, BulletTransaction } from '@/types/admin';

async function authorizedFetch(input: RequestInfo, init: RequestInit = {}) {
  const {
    data: { session },
  } = await supabase.auth.getSession();

  if (!session?.access_token) {
    throw new Error('Authentication required');
  }

  const headers = new Headers(init.headers ?? {});
  headers.set('Authorization', `Bearer ${session.access_token}`);
  headers.set('Accept', 'application/json');
  if (!headers.has('Content-Type') && init.body && !(init.body instanceof FormData)) {
    headers.set('Content-Type', 'application/json');
  }

  const target = typeof input === 'string' ? resolveApiUrl(input) : input;
  return fetch(target, { ...init, headers });
}

async function parseJsonResponse<T>(response: Response): Promise<{
  success: boolean;
  data: T | undefined;
  error?: string;
}> {
  const contentType = response.headers.get('Content-Type') ?? '';
  const rawBody = await response.text();

  if (!rawBody) {
    return {
      success: response.ok,
      data: undefined,
      error: response.ok ? undefined : 'Empty response from server',
    };
  }

  if (!contentType.includes('application/json')) {
    if (response.ok) {
      return { success: true, data: undefined };
    }
    return { success: false, data: undefined, error: 'Server returned non-JSON response' };
  }

  try {
    const parsed = JSON.parse(rawBody) as T & { error?: string };
    return {
      success: response.ok,
      data: parsed,
      error: response.ok ? undefined : parsed?.error ?? 'Request failed',
    };
  } catch (error) {
    return { success: false, data: undefined, error: 'Invalid JSON response from server' };
  }
}

export async function fetchBulletSummary(ownerId?: string) {
  const { data: { user } } = await supabase.auth.getUser();
  const targetId = ownerId || user?.id;
  if (!targetId) throw new Error('Owner ID not found');

  const { data: balanceRow, error: balanceError } = await supabase
    .from('bullets')
    .select('owner_id, balance, updated_at, created_at')
    .eq('owner_id', targetId)
    .maybeSingle();

  if (balanceError) {
    console.error('fetchBulletSummary balance error:', balanceError);
    throw new Error(balanceError.message || 'Failed to load bullet balance');
  }

  const { data: transactions, error: txError } = await supabase
    .from('bullet_transactions')
    .select('id, delta, reason, created_at, created_by')
    .eq('owner_id', targetId)
    .order('created_at', { ascending: false })
    .limit(50);

  if (txError) {
    console.error('fetchBulletSummary transactions error:', txError);
    throw new Error(txError.message || 'Failed to load bullet transactions');
  }

  return {
    balance: balanceRow ?? { owner_id: targetId, balance: 0, created_at: null, updated_at: null },
    transactions: transactions ?? [],
  };
}

export async function spendBullets(options: {
  ownerId: string;
  amount: number;
  reason: string;
  boost?: { listingId: string; durationDays?: number };
}) {
  if (options.amount <= 0) {
    throw new Error('Amount must be positive when spending bullets');
  }

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('Authentication required');

  const { data, error } = await (supabase.rpc as any)('adjust_bullet_balance', {
    p_owner_id: options.ownerId,
    p_delta: -Math.abs(Math.floor(options.amount)),
    p_reason: options.reason,
    p_actor: user.id
  });

  if (error) {
    console.error('spendBullets error:', error);
    throw new Error(error.message || 'Failed to spend bullets');
  }

  return data;
}

export async function fetchAdminBulletBalances(): Promise<AdminBulletList>;
export async function fetchAdminBulletBalances(ownerId: string): Promise<AdminBulletDetail>;
export async function fetchAdminBulletBalances(ownerId?: string) {
  if (ownerId) {
    const { data: balanceRow, error: balanceError } = await supabase
      .from('bullets')
      .select('owner_id, balance, updated_at, created_at')
      .eq('owner_id', ownerId)
      .maybeSingle();

    if (balanceError) {
      console.error('fetchAdminBulletBalances (id) balance error:', balanceError);
      throw new Error(balanceError.message || 'Failed to load bullet balance');
    }

    const { data: transactions, error: txError } = await supabase
      .from('bullet_transactions')
      .select('id, delta, reason, created_at, created_by')
      .eq('owner_id', ownerId)
      .order('created_at', { ascending: false })
      .limit(50);

    if (txError) {
      console.error('fetchAdminBulletBalances (id) transactions error:', txError);
      throw new Error(txError.message || 'Failed to load bullet transactions');
    }

    return {
      balance: balanceRow ?? { owner_id: ownerId, balance: 0, created_at: null, updated_at: null },
      transactions: transactions ?? [],
    } as AdminBulletDetail;
  }

  const { data, error } = await supabase
    .from('bullets')
    .select('owner_id, balance, updated_at, created_at')
    .order('updated_at', { ascending: false })
    .limit(100);

  if (error) {
    console.error('fetchAdminBulletBalances list error:', error);
    throw new Error(error.message || 'Failed to load bullet balances');
  }

  return { items: data || [] } as AdminBulletList;
}

export async function adminAdjustBullets(payload: { ownerId: string; delta: number; reason: string }) {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('Authentication required');

  const { data, error } = await (supabase.rpc as any)('adjust_bullet_balance', {
    p_owner_id: payload.ownerId,
    p_delta: Math.trunc(payload.delta),
    p_reason: payload.reason,
    p_actor: user.id,
    p_require_admin: true,
  });

  if (error) {
    console.error('adminAdjustBullets error:', error);
    throw new Error(error.message || 'Failed to adjust bullets');
  }

  return data;
}
