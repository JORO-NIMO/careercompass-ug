import { supabase } from '@/integrations/supabase/client';
import type { AdminAd, AdminAdsCollection } from '@/types/admin';
export type { AdminAd as Ad } from '@/types/admin';

type Ad = AdminAd;

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

export async function fetchAdminAds(): Promise<Ad[]> {
  const response = await authorizedFetch('/api/admin/ads', { method: 'GET' });
  const { success, data, error } = await parseJsonResponse<AdminAdsCollection>(response);
  if (!success) {
    throw new Error(error ?? 'Failed to load ads');
  }
  return data?.items ?? [];
}

export async function createAd(payload: {
  title: string;
  description?: string;
  link?: string;
  isActive: boolean;
  image: File;
}): Promise<Ad> {
  const formData = new FormData();
  formData.append('title', payload.title);
  if (payload.description !== undefined) {
    formData.append('description', payload.description);
  }
  if (payload.link !== undefined) {
    formData.append('link', payload.link);
  }
  formData.append('is_active', String(payload.isActive));
  formData.append('image', payload.image);

  const response = await authorizedFetch('/api/admin/ads', {
    method: 'POST',
    body: formData,
  });

  const { success, data, error } = await parseJsonResponse<{ item?: AdminAd }>(response);
  if (!success || !data?.item) {
    throw new Error(error ?? 'Failed to create ad');
  }
  return data.item;
}

export async function updateAd(
  id: string,
  payload: {
    title?: string;
    description?: string | null;
    link?: string | null;
    isActive?: boolean;
    image?: File | null;
  },
): Promise<Ad> {
  const formData = new FormData();
  if (payload.title !== undefined) {
    formData.append('title', payload.title);
  }
  if (payload.description !== undefined) {
    formData.append('description', payload.description ?? '');
  }
  if (payload.link !== undefined) {
    formData.append('link', payload.link ?? '');
  }
  if (payload.isActive !== undefined) {
    formData.append('is_active', String(payload.isActive));
  }
  if (payload.image) {
    formData.append('image', payload.image);
  }

  const response = await authorizedFetch(`/api/admin/ads/${id}`, {
    method: 'PUT',
    body: formData,
  });

  const { success, data, error } = await parseJsonResponse<{ item?: AdminAd }>(response);
  if (!success || !data?.item) {
    throw new Error(error ?? 'Failed to update ad');
  }
  return data.item;
}

export async function toggleAd(id: string, isActive: boolean): Promise<Ad> {
  const response = await authorizedFetch(`/api/admin/ads/${id}/toggle`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ is_active: isActive }),
  });

  const { success, data, error } = await parseJsonResponse<{ item?: AdminAd }>(response);
  if (!success || !data?.item) {
    throw new Error(error ?? 'Failed to update status');
  }
  return data.item;
}

export async function deleteAd(id: string): Promise<void> {
  const response = await authorizedFetch(`/api/admin/ads/${id}`, { method: 'DELETE' });
  const { success, error } = await parseJsonResponse<Record<string, never>>(response);
  if (!success) {
    throw new Error(error ?? 'Failed to delete ad');
  }
}

export async function fetchPublicAds(): Promise<Ad[]> {
  const response = await fetch('/api/ads', { method: 'GET' });
  const { success, data, error } = await parseJsonResponse<AdminAdsCollection>(response);
  if (!success) {
    throw new Error(error ?? 'Failed to load ads');
  }
  return data?.items ?? [];
}
