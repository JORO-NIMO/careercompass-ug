import { supabase } from '@/integrations/supabase/client';
import type { Tables } from '@/integrations/supabase/types';

export type Company = Tables<'companies'>;
export type CompanyMedia = Tables<'company_media'>;

export interface VerificationMeta {
  maps: {
    verified: boolean;
    placeId?: string;
    formattedAddress?: string;
    rawStatus?: string;
  };
  web: {
    verified: boolean;
    resolvedUrl?: string;
    status?: number;
    rawError?: string;
  };
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
      error: response.ok ? undefined : `Empty response: ${response.status} ${response.statusText}`
    };
  }

  if (!contentType.includes('application/json')) {
    if (response.ok) {
      return { success: true, data: undefined };
    }
    return { success: false, data: undefined, error: 'Server returned non-JSON response' };
  }

  try {
    const parsed = JSON.parse(rawBody);
    return { success: response.ok, data: parsed, error: response.ok ? undefined : parsed?.error ?? 'Request failed' };
  } catch (error) {
    return { success: false, data: undefined, error: 'Invalid JSON response from server' };
  }
}

export async function registerCompany(payload: {
  name: string;
  location: string;
  website_url?: string;
  contact_email?: string;
}): Promise<{ company: Company; verification: VerificationMeta }> {
  const response = await authorizedFetch('/api/user/register-company', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });

  const { success, data, error } = await parseJsonResponse(response);
  if (!success || !data?.item) {
    if (response.status === 409) {
      throw new Error('A company with the same name and location already exists.');
    }
    throw new Error(error ?? 'Failed to register company');
  }

  return { company: data.item as Company, verification: data.verification as VerificationMeta };
}

export async function fetchMyCompany(): Promise<Company | null> {
  const companies = await listOwnedCompanies();
  return companies[0] ?? null;
}

export async function listCompanies(): Promise<Company[]> {
  const { data, error } = await supabase
    .from('companies')
    .select('*')
    .order('created_at', { ascending: false });

  if (error) {
    throw error;
  }

  return (data ?? []) as Company[];
}

export async function approveCompany(id: string, options: { approved?: boolean; notes?: string } = {}): Promise<Company> {
  const { data, error } = await supabase
    .from('companies')
    .update({
      approved: options.approved ?? true,
      notes: options.notes
    })
    .eq('id', id)
    .select('*')
    .single();

  if (error) {
    console.error('approveCompany error:', error);
    throw new Error(error.message || 'Failed to update company');
  }

  return data as Company;
}

export async function listOwnedCompanies(): Promise<Company[]> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('Authentication required');

  const { data, error } = await supabase
    .from('companies')
    .select('*')
    .eq('created_by', user.id)
    .order('created_at', { ascending: false });

  if (error) {
    console.error('listOwnedCompanies error:', error);
    throw new Error(error.message || 'Failed to load companies');
  }

  return (data || []) as Company[];
}

export async function listCompanyMedia(companyId: string): Promise<CompanyMedia[]> {
  const { data, error } = await supabase
    .from('company_media')
    .select('*')
    .eq('company_id', companyId)
    .order('created_at', { ascending: false });

  if (error) {
    console.error('listCompanyMedia error:', error);
    throw new Error(error.message || 'Failed to load media');
  }

  return (data || []) as CompanyMedia[];
}

export async function deleteCompanyMedia(companyId: string, mediaId: string): Promise<void> {
  const { error } = await supabase
    .from('company_media')
    .delete()
    .eq('id', mediaId)
    .eq('company_id', companyId);

  if (error) {
    console.error('deleteCompanyMedia error:', error);
    throw new Error(error.message || 'Failed to delete media');
  }
}

function assertMediaFile(file: File) {
  const maxBytes = 5 * 1024 * 1024;
  if (file.size > maxBytes) {
    throw new Error('File exceeds 5MB limit.');
  }
  const mime = file.type?.toLowerCase() ?? '';
  if (!(mime.startsWith('image/') || mime === 'application/pdf')) {
    throw new Error('Only image or PDF files are allowed.');
  }
}

export async function uploadCompanyMedia(companyId: string, file: File, options: { placementId?: string } = {}): Promise<CompanyMedia> {
  assertMediaFile(file);

  const formData = new FormData();
  formData.append('file', file);
  if (options.placementId) {
    formData.append('placement_id', options.placementId);
  }

  const response = await authorizedFetch(`/api/companies/${companyId}/media`, {
    method: 'POST',
    body: formData,
  });

  const { success, data, error } = await parseJsonResponse(response);
  if (!success || !data?.item) {
    throw new Error(error ?? 'Failed to upload media');
  }

  return data.item as CompanyMedia;
}
