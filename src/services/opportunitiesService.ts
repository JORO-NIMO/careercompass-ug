/**
 * Opportunities Service
 * Client-side service to interact with the opportunity-backend API
 */

import { supabase } from '@/integrations/supabase/client';
import type { OpportunityType } from '@/types/opportunities';

// API base URL - configure in .env
const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001';

export interface Opportunity {
  id: string;
  title: string;
  description?: string;
  url: string;
  type?: OpportunityType;
  field?: string;
  country?: string;
  organization?: string;
  deadline?: string;
  image_url?: string;
  published_at?: string;
  created_at: string;
}

export interface SearchParams {
  query?: string;
  type?: OpportunityType;
  field?: string;
  country?: string;
  limit?: number;
  offset?: number;
}

export interface SearchResponse {
  success: boolean;
  data: Opportunity[];
  meta: {
    count: number;
    limit: number;
    offset: number;
  };
}

/**
 * Search opportunities with filters
 */
export async function searchOpportunities(params: SearchParams): Promise<SearchResponse> {
  const searchParams = new URLSearchParams();
  
  if (params.query) searchParams.set('query', params.query);
  if (params.type) searchParams.set('type', params.type);
  if (params.field) searchParams.set('field', params.field);
  if (params.country) searchParams.set('country', params.country);
  if (params.limit) searchParams.set('limit', String(params.limit));
  if (params.offset) searchParams.set('offset', String(params.offset));
  
  const response = await fetch(`${API_BASE_URL}/opportunities/search?${searchParams}`);
  
  if (!response.ok) {
    throw new Error('Failed to search opportunities');
  }
  
  return response.json();
}

/**
 * Get opportunities directly from Supabase (fallback/alternative)
 */
export async function getOpportunitiesFromSupabase(params: SearchParams): Promise<Opportunity[]> {
  let query = supabase
    .from('opportunities')
    .select('*')
    .order('published_at', { ascending: false });
  
  if (params.type) {
    query = query.eq('type', params.type);
  }
  
  if (params.field) {
    query = query.ilike('field', `%${params.field}%`);
  }
  
  if (params.country) {
    query = query.ilike('country', `%${params.country}%`);
  }
  
  if (params.query) {
    query = query.or(`title.ilike.%${params.query}%,description.ilike.%${params.query}%`);
  }
  
  query = query.limit(params.limit || 20);
  
  if (params.offset) {
    query = query.range(params.offset, params.offset + (params.limit || 20) - 1);
  }
  
  const { data, error } = await query;
  
  if (error) throw error;
  return data || [];
}

/**
 * Get opportunity by ID
 */
export async function getOpportunityById(id: string): Promise<Opportunity | null> {
  const { data, error } = await supabase
    .from('opportunities')
    .select('*')
    .eq('id', id)
    .single();
  
  if (error) {
    if (error.code === 'PGRST116') return null;
    throw error;
  }
  
  return data;
}

/**
 * Get opportunity stats
 */
export async function getOpportunityStats(): Promise<{
  total: number;
  byType: Record<string, number>;
  byCountry: Record<string, number>;
}> {
  const response = await fetch(`${API_BASE_URL}/opportunities/stats`);
  
  if (!response.ok) {
    throw new Error('Failed to get stats');
  }
  
  const result = await response.json();
  return result.data;
}

/**
 * Subscribe to opportunity alerts
 */
export async function subscribeToAlerts(criteria: {
  types?: OpportunityType[];
  fields?: string[];
  countries?: string[];
  keywords?: string[];
}): Promise<{ success: boolean; subscriptionId?: string }> {
  const session = await supabase.auth.getSession();
  const userId = session.data.session?.user?.id;
  
  if (!userId) {
    throw new Error('Must be logged in to subscribe');
  }
  
  const { data, error } = await supabase
    .from('opportunity_subscriptions')
    .insert({
      user_id: userId,
      criteria,
      channels: ['in_app'],
      is_active: true,
    })
    .select()
    .single();
  
  if (error) throw error;
  
  return { success: true, subscriptionId: data.id };
}

/**
 * Get user's opportunity subscriptions
 */
export async function getUserSubscriptions() {
  const session = await supabase.auth.getSession();
  const userId = session.data.session?.user?.id;
  
  if (!userId) return [];
  
  const { data, error } = await supabase
    .from('opportunity_subscriptions')
    .select('*')
    .eq('user_id', userId)
    .eq('is_active', true);
  
  if (error) throw error;
  return data || [];
}

/**
 * Semantic search using Edge Function
 */
export async function semanticSearchOpportunities(
  query: string,
  limit: number = 10
): Promise<Opportunity[]> {
  const { data, error } = await supabase.rpc('search_opportunities_semantic', {
    query_text: query,
    match_threshold: 0.5,
    match_count: limit,
  });
  
  if (error) throw error;
  return data || [];
}
