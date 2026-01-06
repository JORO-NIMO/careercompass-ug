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

const ADS_BUCKET = 'ads';

function extractStoragePath(url: string): string | null {
  const marker = `/storage/v1/object/public/${ADS_BUCKET}/`;
  const index = url.indexOf(marker);
  if (index === -1) return null;
  return url.slice(index + marker.length);
}

export async function fetchAdminAds(): Promise<Ad[]> {
  const { data, error } = await supabase
    .from('ads')
    .select('id, title, description, image_url, link, is_active, created_at')
    .order('created_at', { ascending: false });

  if (error) {
    console.error('fetchAdminAds error:', error);
    throw new Error(error.message || 'Failed to load ads');
  }

  return (data || []) as Ad[];
}

async function uploadAdImage(file: File): Promise<{ url: string; path: string }> {
  const extension = file.name.includes('.') ? file.name.substring(file.name.lastIndexOf('.') + 1) : 'jpg';
  const path = `ads/${crypto.randomUUID()}-${file.name.replace(/[^a-zA-Z0-9]/g, '_')}.${extension}`;

  const { error: uploadError } = await supabase.storage.from(ADS_BUCKET).upload(path, file);
  if (uploadError) {
    console.error('ad image upload error', uploadError);
    throw new Error('Failed to upload image');
  }

  const { data } = supabase.storage.from(ADS_BUCKET).getPublicUrl(path);
  return { url: data.publicUrl, path };
}

export async function createAd(payload: {
  title: string;
  description?: string;
  link?: string;
  isActive: boolean;
  image: File;
}): Promise<Ad> {
  const { url: imageUrl } = await uploadAdImage(payload.image);

  const { data, error } = await supabase
    .from('ads')
    .insert({
      title: payload.title,
      description: payload.description,
      image_url: imageUrl,
      link: payload.link,
      is_active: payload.isActive,
    })
    .select()
    .single();

  if (error) {
    console.error('createAd error:', error);
    throw new Error(error.message || 'Failed to create ad');
  }

  return data as Ad;
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
  const updates: any = { ...payload };
  delete updates.image;

  // Handle snake_case conversion if necessary, or just map manually
  const dbUpdates: any = {};
  if (payload.title !== undefined) dbUpdates.title = payload.title;
  if (payload.description !== undefined) dbUpdates.description = payload.description;
  if (payload.link !== undefined) dbUpdates.link = payload.link;
  if (payload.isActive !== undefined) dbUpdates.is_active = payload.isActive;

  let oldImageUrl: string | null = null;
  if (payload.image) {
    const { data: existing } = await supabase.from('ads').select('image_url').eq('id', id).single();
    oldImageUrl = existing?.image_url || null;

    const { url: imageUrl } = await uploadAdImage(payload.image);
    dbUpdates.image_url = imageUrl;
  }

  const { data, error } = await supabase
    .from('ads')
    .update(dbUpdates)
    .eq('id', id)
    .select()
    .single();

  if (error) {
    console.error('updateAd error:', error);
    throw new Error(error.message || 'Failed to update ad');
  }

  if (oldImageUrl) {
    const oldPath = extractStoragePath(oldImageUrl);
    if (oldPath) await supabase.storage.from(ADS_BUCKET).remove([oldPath]);
  }

  return data as Ad;
}

export async function toggleAd(id: string, isActive: boolean): Promise<Ad> {
  const { data, error } = await supabase
    .from('ads')
    .update({ is_active: isActive })
    .eq('id', id)
    .select()
    .single();

  if (error) {
    console.error('toggleAd error:', error);
    throw new Error(error.message || 'Failed to update status');
  }
  return data as Ad;
}

export async function deleteAd(id: string): Promise<void> {
  const { data: existing } = await supabase.from('ads').select('image_url').eq('id', id).single();

  const { error } = await supabase
    .from('ads')
    .delete()
    .eq('id', id);

  if (error) {
    console.error('deleteAd error:', error);
    throw new Error(error.message || 'Failed to delete ad');
  }

  if (existing?.image_url) {
    const path = extractStoragePath(existing.image_url);
    if (path) await supabase.storage.from(ADS_BUCKET).remove([path]);
  }
}

export async function fetchPublicAds(): Promise<Ad[]> {
  const { data, error } = await supabase
    .from('ads')
    .select('id, title, description, image_url, link, is_active, created_at')
    .eq('is_active', true)
    .order('created_at', { ascending: false });

  if (error) {
    console.error('fetchPublicAds error:', error);
    throw new Error(error.message || 'Failed to load ads');
  }

  return (data || []) as Ad[];
}
