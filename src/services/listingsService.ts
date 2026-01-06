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
