import { supabase } from '@/integrations/supabase/client';
import type { Tables } from '@/integrations/supabase/types';
import type { AdminListing, AdminListingsCollection, ListingWithCompany } from '@/types/admin';
export type { ListingWithCompany } from '@/types/admin';

export type Listing = Tables<'listings'>;

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
    return { success: false, data: undefined, error: 'Server returned non-JSON response' };
  }

  try {
    const parsed = JSON.parse(rawBody) as T & { error?: string };
    return { success: response.ok, data: parsed, error: response.ok ? undefined : parsed?.error ?? 'Request failed' };
  } catch (error) {
    return { success: false, data: undefined, error: 'Invalid JSON response from server' };
  }
}

export async function fetchListings(): Promise<ListingWithCompany[]> {
  const response = await fetch('/api/listings');
  const { success, data, error } = await parseJsonResponse<AdminListingsCollection>(response);
  if (!success) {
    throw new Error(error ?? 'Failed to load listings');
  }
  return data?.items ?? [];
}

export async function fetchAdminListings(): Promise<AdminListing[]> {
  const response = await authorizedFetch('/api/admin/listings', { method: 'GET' });
  const { success, data, error } = await parseJsonResponse<AdminListingsCollection>(response);
  if (!success) {
    throw new Error(error ?? 'Failed to load admin listings');
  }
  return data?.items ?? [];
}

export async function createListing(payload: {
  title: string;
  description: string;
  companyId?: string | null;
  isFeatured?: boolean;
  displayOrder?: number;
}): Promise<Listing> {
  const response = await authorizedFetch('/api/admin/listings', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      title: payload.title,
      description: payload.description,
      company_id: payload.companyId ?? null,
      is_featured: payload.isFeatured ?? false,
      display_order: payload.displayOrder,
    }),
  });

  const { success, data, error } = await parseJsonResponse<{ item?: Listing }>(response);
  if (!success || !data?.item) {
    throw new Error(error ?? 'Failed to create listing');
  }

  return data.item;
}

export async function updateListing(id: string, payload: {
  title?: string;
  description?: string;
  companyId?: string | null;
  isFeatured?: boolean;
  displayOrder?: number;
}): Promise<Listing> {
  const response = await authorizedFetch(`/api/admin/listings/${id}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      title: payload.title,
      description: payload.description,
      company_id: payload.companyId,
      is_featured: payload.isFeatured,
      display_order: payload.displayOrder,
    }),
  });

  const { success, data, error } = await parseJsonResponse<{ item?: Listing }>(response);
  if (!success || !data?.item) {
    throw new Error(error ?? 'Failed to update listing');
  }

  return data.item;
}

export async function deleteListing(id: string): Promise<void> {
  const response = await authorizedFetch(`/api/admin/listings/${id}`, { method: 'DELETE' });
  const { success, error } = await parseJsonResponse<Record<string, never>>(response);
  if (!success) {
    throw new Error(error ?? 'Failed to delete listing');
  }
}

export async function toggleListingFeature(id: string, isFeatured: boolean): Promise<Listing> {
  const response = await authorizedFetch(`/api/admin/listings/${id}/feature`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ is_featured: isFeatured }),
  });

  const { success, data, error } = await parseJsonResponse<{ item?: Listing }>(response);
  if (!success || !data?.item) {
    throw new Error(error ?? 'Failed to update feature status');
  }

  return data.item;
}

export async function updateListingOrder(id: string, displayOrder: number): Promise<Listing> {
  const response = await authorizedFetch(`/api/admin/listings/${id}/order`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ display_order: displayOrder }),
  });

  const { success, data, error } = await parseJsonResponse<{ item?: Listing }>(response);
  if (!success || !data?.item) {
    throw new Error(error ?? 'Failed to update display order');
  }

  return data.item;
}
