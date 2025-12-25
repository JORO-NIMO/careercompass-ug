import { supabase } from '@/integrations/supabase/client';

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

  return fetch(input, { ...init, headers });
}

async function parseJsonResponse(response: Response) {
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
    return { success: false, data: undefined, error: 'Server returned non-JSON response' };
  }

  try {
    const parsed = JSON.parse(rawBody);
    return {
      success: response.ok,
      data: parsed,
      error: response.ok ? undefined : parsed?.error ?? 'Request failed',
    };
  } catch (error) {
    return { success: false, data: undefined, error: 'Invalid JSON response from server' };
  }
}

export interface BulletBalance {
  owner_id: string;
  balance: number;
  created_at?: string | null;
  updated_at?: string | null;
}

export interface BulletTransaction {
  id: string;
  owner_id: string;
  delta: number;
  reason: string;
  created_at: string;
  created_by: string;
}

export async function fetchBulletSummary(ownerId?: string) {
  const url = ownerId ? `/api/bullets/${ownerId}` : '/api/bullets';
  const response = await authorizedFetch(url, { method: 'GET' });
  const { success, data, error } = await parseJsonResponse(response);
  if (!success) {
    throw new Error(error ?? 'Failed to load bullet balance');
  }
  return {
    balance: (data?.balance as BulletBalance | null) ?? { owner_id: ownerId ?? '', balance: 0 },
    transactions: (data?.transactions as BulletTransaction[] | null) ?? [],
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

  const response = await authorizedFetch(`/api/bullets/${options.ownerId}/transactions`, {
    method: 'POST',
    body: JSON.stringify({
      delta: -Math.abs(Math.floor(options.amount)),
      reason: options.reason,
      boost: options.boost
        ? {
            listing_id: options.boost.listingId,
            duration_days: options.boost.durationDays,
          }
        : undefined,
    }),
  });

  const { success, data, error } = await parseJsonResponse(response);
  if (!success) {
    throw new Error(error ?? 'Failed to spend bullets');
  }

  return data?.balance as BulletBalance;
}

export async function fetchAdminBulletBalances(ownerId?: string) {
  const url = ownerId ? `/api/admin/bullets?owner_id=${encodeURIComponent(ownerId)}` : '/api/admin/bullets';
  const response = await authorizedFetch(url, { method: 'GET' });
  const { success, data, error } = await parseJsonResponse(response);
  if (!success) {
    throw new Error(error ?? 'Failed to load bullet balances');
  }
  return data;
}

export async function adminAdjustBullets(payload: { ownerId: string; delta: number; reason: string }) {
  const response = await authorizedFetch('/api/admin/bullets', {
    method: 'POST',
    body: JSON.stringify({
      owner_id: payload.ownerId,
      delta: Math.trunc(payload.delta),
      reason: payload.reason,
    }),
  });

  const { success, data, error } = await parseJsonResponse(response);
  if (!success) {
    throw new Error(error ?? 'Failed to adjust bullets');
  }

  return data?.balance as BulletBalance;
}
