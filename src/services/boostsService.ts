import { supabase } from '@/integrations/supabase/client';
import type { AdminBoost, AdminBoostsCollection } from '@/types/admin';
export type { AdminBoost as Boost } from '@/types/admin';

type Boost = AdminBoost;

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

async function parseJsonResponse<T>(response: Response): Promise<{
  success: boolean;
  data: T | undefined;
  error?: string;
}> {
  const contentType = response.headers.get('Content-Type') ?? '';
  const rawBody = await response.text();

  if (!rawBody) {
    return { success: response.ok, data: undefined, error: response.ok ? undefined : 'Empty response from server' };
  }

  if (!contentType.includes('application/json')) {
    if (response.ok) {
      return { success: true, data: undefined };
    }
    return { success: false, data: undefined, error: 'Server returned non-JSON response' };
  }

  try {
    const parsed = JSON.parse(rawBody) as T & { error?: string };
    return { success: response.ok, data: parsed, error: response.ok ? undefined : parsed?.error ?? 'Request failed' };
  } catch (error) {
    return { success: false, data: undefined, error: 'Invalid JSON response from server' };
  }
}

export async function fetchAdminBoosts(): Promise<Boost[]> {
  const response = await authorizedFetch('/api/admin/boosts', { method: 'GET' });
  const { success, data, error } = await parseJsonResponse<AdminBoostsCollection>(response);
  if (!success) {
    throw new Error(error ?? 'Failed to load boosts');
  }
  return data?.items ?? [];
}

export async function createBoost(payload: {
  entity_id: string;
  entity_type: 'company' | 'listing';
  starts_at?: string;
  ends_at: string;
  is_active?: boolean;
}): Promise<Boost> {
  const response = await authorizedFetch('/api/admin/boosts', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
  const { success, data, error } = await parseJsonResponse<{ item?: Boost }>(response);
  if (!success) {
    throw new Error(error ?? 'Failed to create boost');
  }
  if (!data?.item) {
    throw new Error('Failed to create boost');
  }
  return data.item;
}

export async function updateBoost(id: string, payload: Partial<Pick<Boost, 'starts_at' | 'ends_at' | 'is_active'>>): Promise<Boost> {
  const response = await authorizedFetch(`/api/admin/boosts/${id}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
  const { success, data, error } = await parseJsonResponse<{ item?: Boost }>(response);
  if (!success) {
    throw new Error(error ?? 'Failed to update boost');
  }
  if (!data?.item) {
    throw new Error('Failed to update boost');
  }
  return data.item;
}

export async function revokeBoost(id: string): Promise<Boost> {
  const response = await authorizedFetch(`/api/admin/boosts/${id}`, { method: 'DELETE' });
  const { success, data, error } = await parseJsonResponse<{ item?: Boost }>(response);
  if (!success) {
    throw new Error(error ?? 'Failed to revoke boost');
  }
  if (!data?.item) {
    throw new Error('Failed to revoke boost');
  }
  return data.item;
}

export async function fetchActiveBoosts(): Promise<Array<{ id: string; entity_id: string; entity_type: 'company' | 'listing'; starts_at: string; ends_at: string }>> {
  const response = await fetch('/api/boosts');
  const { success, data, error } = await parseJsonResponse<AdminBoostsCollection>(response);
  if (!success) {
    throw new Error(error ?? 'Failed to load boosts');
  }
  return data?.items ?? [];
}
