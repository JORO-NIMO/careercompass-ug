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
  const { data, error } = await supabase
    .from('boosts')
    .select('*')
    .order('starts_at', { ascending: false });

  if (error) {
    console.error('fetchAdminBoosts error:', error);
    throw new Error(error.message || 'Failed to load boosts');
  }

  return (data || []) as Boost[];
}

export async function createBoost(payload: {
  entity_id: string;
  entity_type: 'company' | 'listing';
  starts_at?: string;
  ends_at: string;
  is_active?: boolean;
}): Promise<Boost> {
  const { data, error } = await supabase
    .from('boosts')
    .insert({
      entity_id: payload.entity_id,
      entity_type: payload.entity_type,
      starts_at: payload.starts_at || new Date().toISOString(),
      ends_at: payload.ends_at,
      is_active: payload.is_active ?? true,
    })
    .select('*')
    .single();

  if (error) {
    console.error('createBoost error:', error);
    throw new Error(error.message || 'Failed to create boost');
  }

  return data as Boost;
}

export async function updateBoost(id: string, payload: Partial<Pick<Boost, 'starts_at' | 'ends_at' | 'is_active'>>): Promise<Boost> {
  const { data, error } = await supabase
    .from('boosts')
    .update(payload)
    .eq('id', id)
    .select('*')
    .single();

  if (error) {
    console.error('updateBoost error:', error);
    throw new Error(error.message || 'Failed to update boost');
  }

  return data as Boost;
}

export async function revokeBoost(id: string): Promise<Boost> {
  const { data, error } = await supabase
    .from('boosts')
    .update({ is_active: false, ends_at: new Date().toISOString() })
    .eq('id', id)
    .select('*')
    .single();

  if (error) {
    console.error('revokeBoost error:', error);
    throw new Error(error.message || 'Failed to revoke boost');
  }

  return data as Boost;
}

export async function fetchActiveBoosts(): Promise<Array<{ id: string; entity_id: string; entity_type: 'company' | 'listing'; starts_at: string; ends_at: string }>> {
  const now = new Date().toISOString();
  const { data, error } = await supabase
    .from('boosts')
    .select('id, entity_id, entity_type, starts_at, ends_at')
    .eq('is_active', true)
    .lte('starts_at', now)
    .gt('ends_at', now);

  if (error) {
    console.error('fetchActiveBoosts error:', error);
    throw new Error(error.message || 'Failed to load active boosts');
  }

  return data as any[];
}
