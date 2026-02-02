import { supabase } from '@/integrations/supabase/client';
import type { Tables } from '@/integrations/supabase/types';
import type { AdminListing, AdminListingsCollection, ListingWithCompany } from '@/types/admin';
import { logAdminAction } from './adminService';
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

/**
 * Semantic Search for Listings
 * 1. Generates embedding for the search text via Edge Function
 * 2. Searches DB using cosine similarity
 */
export async function searchSmartListings(queryText: string) {
  // AI-based search has been disabled. Use a simple client-side text fallback
  console.warn('searchSmartListings: AI search disabled; using text fallback for:', queryText);
  try {
    const all = await fetchListings();
    const q = queryText.trim().toLowerCase();
    if (!q) return [];
    return all.filter((item) => {
      const title = (item as any).title ?? '';
      const description = (item as any).description ?? '';
      return (
        title.toLowerCase().includes(q) ||
        description.toLowerCase().includes(q)
      );
    });
  } catch (err) {
    console.error('Fallback text search failed:', err);
    return [];
  }
}

/**
 * Upload a logo for a listing to 'company-media' bucket
 */
export async function uploadListingLogo(file: File): Promise<string> {
  const maxSize = 2 * 1024 * 1024; // 2MB
  if (file.size > maxSize) {
    throw new Error('File size must be less than 2MB');
  }

  const fileExt = file.name.split('.').pop();
  const fileName = `${Date.now()}_${Math.random().toString(36).substring(7)}.${fileExt}`;
  const filePath = `listing-logos/${fileName}`;

  const { error: uploadError } = await supabase.storage
    .from('company-media')
    .upload(filePath, file, {
      upsert: false,
    });

  if (uploadError) {
    console.error('Upload error:', uploadError);
    throw new Error('Failed to upload logo');
  }

  const { data } = supabase.storage
    .from('company-media')
    .getPublicUrl(filePath);

  return data.publicUrl;
}

export async function fetchListings(): Promise<ListingWithCompany[]> {
  try {
    const response = await fetch('/api/listings');
    const { success, data, error } = await parseJsonResponse<AdminListingsCollection>(response);
    if (!success) {
      console.warn('fetchListings failed:', error, 'Status:', response.status);
      return [];
    }
    return data?.items ?? [];
  } catch (error) {
    console.error('fetchListings request failed', error);
    return [];
  }
}

export async function fetchAdminListings(): Promise<AdminListing[]> {
  const { data, error } = await supabase
    .from('listings')
    .select('*, companies:companies(id, name)')
    .order('display_order', { ascending: true })
    .order('created_at', { ascending: false });

  if (error) {
    console.error('fetchAdminListings error:', error);
    throw new Error(error.message || 'Failed to load listings');
  }

  return (data || []) as AdminListing[];
}

export async function fetchDraftListings(): Promise<AdminListing[]> {
  const { data, error } = await supabase
    .from('listings')
    .select('*, companies:companies(id, name)')
    .eq('status', 'draft')
    .order('created_at', { ascending: false });

  if (error) {
    console.error('fetchDraftListings error:', error);
    throw new Error(error.message || 'Failed to load draft listings');
  }

  return (data || []) as AdminListing[];
}

export async function bulkPublishListings(ids: string[], opts?: { autoFeatureByType?: boolean; featureTypes?: string[] }): Promise<void> {
  // Delegate to server-side endpoint to avoid client-side schema typing issues
  await bulkPublishListingsViaApi(ids, { autoFeatureByType: opts?.autoFeatureByType, featureTypes: opts?.featureTypes });
}

/** Server-side bulk publish via admin API with audit logging. */
export async function bulkPublishListingsViaApi(ids: string[], opts?: { autoFeatureByType?: boolean; featureTypes?: string[], companyAssignments?: Record<string, string | null> }): Promise<{ publishedCount: number; featuredCount: number } | void> {
  if (!Array.isArray(ids) || ids.length === 0) return;
  const payload = {
    ids,
    autoFeatureByType: opts?.autoFeatureByType ?? false,
    featureTypes: (opts?.featureTypes && opts.featureTypes.length > 0) ? opts!.featureTypes : undefined,
    companyAssignments: opts?.companyAssignments,
  };

  const response = await authorizedFetch('/api/admin/listings/bulk-publish', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });

  const { success, data, error } = await parseJsonResponse<{ publishedCount: number; featuredCount: number }>(response);
  if (!success) {
    throw new Error(error || 'Bulk publish failed');
  }
  return data;
}

export async function createListing(payload: {
  title: string;
  description: string;
  companyId?: string | null;
  isFeatured?: boolean;
  displayOrder?: number;
  opportunity_type?: string;
  application_deadline?: string;
  application_method?: string;
  whatsapp_number?: string;
  application_email?: string;
  application_url?: string;
  region?: string;
  status?: 'draft' | 'published' | 'archived';
  expires_at?: string;
  logo_url?: string;
  image_url?: string;
  banner_urls?: string[];
}): Promise<Listing> {
  const { data, error } = await supabase
    .from('listings')
    .insert({
      title: payload.title,
      description: payload.description,
      company_id: payload.companyId ?? null,
      is_featured: payload.isFeatured ?? false,
      display_order: payload.displayOrder,
      opportunity_type: payload.opportunity_type,
      application_deadline: payload.application_deadline,
      application_method: payload.application_method,
      whatsapp_number: payload.whatsapp_number,
      application_email: payload.application_email,
      application_url: payload.application_url,
      region: payload.region,
      status: payload.status ?? 'published',
      expires_at: payload.expires_at,
      logo_url: payload.logo_url,
      image_url: payload.image_url,
      banner_urls: payload.banner_urls,
    })
    .select('*')
    .single();

  if (error) {
    console.error('createListing error:', error);
    throw new Error(error.message || 'Failed to create listing');
  }

  await logAdminAction({
    action: 'create',
    targetTable: 'listings',
    targetId: data.id,
    changes: data,
  });

  return data;
}

export async function updateListing(id: string, payload: {
  title?: string;
  description?: string;
  companyId?: string | null;
  isFeatured?: boolean;
  displayOrder?: number;
  opportunity_type?: string;
  application_deadline?: string;
  application_method?: string;
  whatsapp_number?: string;
  application_email?: string;
  application_url?: string;
  region?: string;
  status?: 'draft' | 'published' | 'archived';
  expires_at?: string;
  logo_url?: string;
  image_url?: string;
  banner_urls?: string[];
}): Promise<Listing> {
  const { data, error } = await supabase
    .from('listings')
    .update({
      title: payload.title,
      description: payload.description,
      company_id: payload.companyId,
      is_featured: payload.isFeatured,
      display_order: payload.displayOrder,
      opportunity_type: payload.opportunity_type,
      application_deadline: payload.application_deadline,
      application_method: payload.application_method,
      whatsapp_number: payload.whatsapp_number,
      application_email: payload.application_email,
      application_url: payload.application_url,
      region: payload.region,
      status: payload.status,
      expires_at: payload.expires_at,
      logo_url: payload.logo_url,
      image_url: payload.image_url,
      banner_urls: payload.banner_urls,
    })
    .eq('id', id)
    .select('*')
    .single();

  if (error) {
    console.error('updateListing error:', error);
    throw new Error(error.message || 'Failed to update listing');
  }

  await logAdminAction({
    action: 'update',
    targetTable: 'listings',
    targetId: id,
    changes: payload,
  });

  return data;
}

export async function deleteListing(id: string): Promise<void> {
  const { error } = await supabase
    .from('listings')
    .delete()
    .eq('id', id);

  if (error) {
    console.error('deleteListing error:', error);
    throw new Error(error.message || 'Failed to delete listing');
  }

  await logAdminAction({
    action: 'delete',
    targetTable: 'listings',
    targetId: id,
  });
}

export async function toggleListingFeature(id: string, isFeatured: boolean): Promise<Listing> {
  const { data, error } = await supabase
    .from('listings')
    .update({ is_featured: isFeatured })
    .eq('id', id)
    .select('*')
    .single();

  if (error) {
    console.error('toggleListingFeature error:', error);
    throw new Error(error.message || 'Failed to update feature status');
  }

  return data;
}

export async function updateListingOrder(id: string, displayOrder: number): Promise<Listing> {
  const { data, error } = await supabase
    .from('listings')
    .update({ display_order: displayOrder })
    .eq('id', id)
    .select('*')
    .single();

  if (error) {
    console.error('updateListingOrder error:', error);
    throw new Error(error.message || 'Failed to update display order');
  }

  return data;
}
