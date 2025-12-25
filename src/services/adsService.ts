import { supabase } from '@/integrations/supabase/client';

export interface Ad {
  id: string;
  title: string;
  description: string | null;
  image_url: string;
  link: string | null;
  is_active: boolean;
  created_at: string;
}

async function authorizedFetch(input: RequestInfo, init: RequestInit = {}) {
  const {
    data: { session },
  } = await supabase.auth.getSession();

  if (!session?.access_token) {
    throw new Error('Authentication required');
  }

  const headers = new Headers(init.headers ?? {});
  headers.set('Authorization', `Bearer ${session.access_token}`);

  return fetch(input, { ...init, headers });
}

export async function fetchAdminAds(): Promise<Ad[]> {
  const response = await authorizedFetch('/api/admin/ads', { method: 'GET' });
  const data = await response.json();
  if (!response.ok) {
    throw new Error(data?.error ?? 'Failed to load ads');
  }
  return data.items ?? [];
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

  const data = await response.json();
  if (!response.ok) {
    throw new Error(data?.error ?? 'Failed to create ad');
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

  const data = await response.json();
  if (!response.ok) {
    throw new Error(data?.error ?? 'Failed to update ad');
  }
  return data.item;
}

export async function toggleAd(id: string, isActive: boolean): Promise<Ad> {
  const response = await authorizedFetch(`/api/admin/ads/${id}/toggle`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ is_active: isActive }),
  });

  const data = await response.json();
  if (!response.ok) {
    throw new Error(data?.error ?? 'Failed to update status');
  }
  return data.item;
}

export async function deleteAd(id: string): Promise<void> {
  const response = await authorizedFetch(`/api/admin/ads/${id}`, { method: 'DELETE' });
  if (!response.ok) {
    const data = await response.json().catch(() => ({}));
    throw new Error(data?.error ?? 'Failed to delete ad');
  }
}

export async function fetchPublicAds(): Promise<Ad[]> {
  const response = await fetch('/api/ads', { method: 'GET' });
  const data = await response.json();
  if (!response.ok) {
    throw new Error(data?.error ?? 'Failed to load ads');
  }
  return data.items ?? [];
}
