/**
 * Database Service
 * Handles all Supabase database operations for opportunities
 */

import { getSupabaseClient } from '../utils/supabase.js';
import type { 
  Opportunity, 
  RssSource, 
  IngestionLog,
  SearchParams,
  OpportunitySearchResult,
} from '../types/index.js';
import { createModuleLogger } from '../utils/logger.js';

const logger = createModuleLogger('database');

/**
 * Get all active RSS sources
 */
export async function getActiveRssSources(): Promise<RssSource[]> {
  const supabase = getSupabaseClient();
  
  const { data, error } = await supabase
    .from('rss_sources')
    .select('*')
    .eq('is_active', true)
    .order('name');
  
  if (error) {
    logger.error('Failed to fetch RSS sources', { error: error.message });
    throw error;
  }
  
  return data || [];
}

/**
 * Add a new RSS source
 */
export async function addRssSource(source: Omit<RssSource, 'id' | 'created_at'>): Promise<RssSource> {
  const supabase = getSupabaseClient();
  
  const { data, error } = await supabase
    .from('rss_sources')
    .insert(source)
    .select()
    .single();
  
  if (error) {
    logger.error('Failed to add RSS source', { error: error.message, url: source.url });
    throw error;
  }
  
  logger.info('Added RSS source', { name: source.name, url: source.url });
  return data;
}

/**
 * Update RSS source status after fetch
 */
export async function updateRssSourceStatus(
  sourceId: string,
  status: { 
    lastFetchedAt?: string; 
    lastError?: string; 
    itemsCount?: number;
  }
): Promise<void> {
  const supabase = getSupabaseClient();
  
  const { error } = await supabase
    .from('rss_sources')
    .update({
      last_fetched_at: status.lastFetchedAt,
      last_error: status.lastError || null,
      items_count: status.itemsCount,
      updated_at: new Date().toISOString(),
    })
    .eq('id', sourceId);
  
  if (error) {
    logger.error('Failed to update RSS source status', { sourceId, error: error.message });
  }
}

/**
 * Check if opportunity URL already exists
 */
export async function opportunityExists(url: string): Promise<boolean> {
  const supabase = getSupabaseClient();
  
  const { data, error } = await supabase
    .from('opportunities')
    .select('id')
    .eq('url', url)
    .maybeSingle();
  
  if (error) {
    logger.error('Failed to check opportunity existence', { error: error.message });
    return false;
  }
  
  return !!data;
}

/**
 * Bulk check which URLs already exist
 */
export async function getExistingUrls(urls: string[]): Promise<Set<string>> {
  const supabase = getSupabaseClient();
  const existingUrls = new Set<string>();
  
  // Check in batches to avoid query limits
  const batchSize = 100;
  
  for (let i = 0; i < urls.length; i += batchSize) {
    const batch = urls.slice(i, i + batchSize);
    
    const { data, error } = await supabase
      .from('opportunities')
      .select('url')
      .in('url', batch);
    
    if (error) {
      logger.error('Failed to check existing URLs', { error: error.message });
      continue;
    }
    
    data?.forEach(item => existingUrls.add(item.url));
  }
  
  return existingUrls;
}

/**
 * Insert a new opportunity
 */
export async function insertOpportunity(
  opportunity: Omit<Opportunity, 'id' | 'created_at' | 'updated_at'>
): Promise<Opportunity | null> {
  const supabase = getSupabaseClient();
  
  const { data, error } = await supabase
    .from('opportunities')
    .insert(opportunity)
    .select()
    .single();
  
  if (error) {
    if (error.code === '23505') { // Unique constraint violation
      logger.debug('Opportunity already exists', { url: opportunity.url });
      return null;
    }
    logger.error('Failed to insert opportunity', { error: error.message, url: opportunity.url });
    throw error;
  }
  
  return data;
}

/**
 * Bulk insert opportunities
 */
export async function bulkInsertOpportunities(
  opportunities: Array<Omit<Opportunity, 'id' | 'created_at' | 'updated_at'>>
): Promise<{ inserted: number; failed: number }> {
  const supabase = getSupabaseClient();
  
  let inserted = 0;
  let failed = 0;
  
  // Insert in batches
  const batchSize = 50;
  
  for (let i = 0; i < opportunities.length; i += batchSize) {
    const batch = opportunities.slice(i, i + batchSize);
    
    const { data, error } = await supabase
      .from('opportunities')
      .upsert(batch, { 
        onConflict: 'url',
        ignoreDuplicates: true,
      })
      .select('id');
    
    if (error) {
      logger.error('Batch insert failed', { error: error.message, batchStart: i });
      failed += batch.length;
    } else {
      inserted += data?.length || 0;
    }
  }
  
  logger.info(`Bulk insert complete: ${inserted} inserted, ${failed} failed`);
  return { inserted, failed };
}

/**
 * Update opportunity embedding
 */
export async function updateOpportunityEmbedding(
  id: string,
  embedding: number[]
): Promise<void> {
  const supabase = getSupabaseClient();
  
  const { error } = await supabase
    .from('opportunities')
    .update({ 
      embedding,
      updated_at: new Date().toISOString(),
    })
    .eq('id', id);
  
  if (error) {
    logger.error('Failed to update embedding', { id, error: error.message });
    throw error;
  }
}

/**
 * Bulk update embeddings
 */
export async function bulkUpdateEmbeddings(
  embeddings: Map<string, number[]>
): Promise<number> {
  const supabase = getSupabaseClient();
  let updated = 0;
  
  // Update in batches
  const entries = Array.from(embeddings.entries());
  const batchSize = 20;
  
  for (let i = 0; i < entries.length; i += batchSize) {
    const batch = entries.slice(i, i + batchSize);
    
    // Use Promise.all for parallel updates within batch
    const results = await Promise.all(
      batch.map(async ([id, embedding]) => {
        const { error } = await supabase
          .from('opportunities')
          .update({ 
            embedding,
            updated_at: new Date().toISOString(),
          })
          .eq('id', id);
        
        return !error;
      })
    );
    
    updated += results.filter(Boolean).length;
  }
  
  logger.info(`Updated ${updated} embeddings`);
  return updated;
}

/**
 * Get opportunities without embeddings
 */
export async function getOpportunitiesWithoutEmbeddings(
  limit: number = 100
): Promise<Opportunity[]> {
  const supabase = getSupabaseClient();
  
  const { data, error } = await supabase
    .from('opportunities')
    .select('*')
    .is('embedding', null)
    .order('created_at', { ascending: false })
    .limit(limit);
  
  if (error) {
    logger.error('Failed to fetch opportunities without embeddings', { error: error.message });
    throw error;
  }
  
  return data || [];
}

/**
 * Search opportunities using text search
 */
export async function searchOpportunities(
  params: SearchParams
): Promise<OpportunitySearchResult[]> {
  const supabase = getSupabaseClient();
  
  const { data, error } = await supabase.rpc('search_opportunities', {
    p_query: params.query || '',
    p_type: params.type || null,
    p_field: params.field || null,
    p_country: params.country || null,
    p_limit: params.limit || 20,
    p_offset: params.offset || 0,
  });
  
  if (error) {
    logger.error('Search failed', { error: error.message, params });
    throw error;
  }
  
  return data || [];
}

/**
 * Semantic search using vector similarity
 */
export async function semanticSearchOpportunities(
  embedding: number[],
  params: Omit<SearchParams, 'query'>
): Promise<OpportunitySearchResult[]> {
  const supabase = getSupabaseClient();
  
  const { data, error } = await supabase.rpc('match_opportunities_semantic', {
    query_embedding: embedding,
    match_threshold: 0.5,
    match_count: params.limit || 10,
    filter_type: params.type || null,
    filter_field: params.field || null,
    filter_country: params.country || null,
  });
  
  if (error) {
    logger.error('Semantic search failed', { error: error.message });
    throw error;
  }
  
  return data || [];
}

/**
 * Hybrid search combining vector similarity (60%) with keyword ranking (40%)
 * Best of both worlds: semantic understanding + exact keyword matching
 */
export async function hybridSearchOpportunities(
  embedding: number[],
  queryText: string,
  params: Omit<SearchParams, 'query'>
): Promise<(OpportunitySearchResult & { vector_score: number; keyword_score: number; hybrid_score: number })[]> {
  const supabase = getSupabaseClient();
  
  const { data, error } = await supabase.rpc('hybrid_search_opportunities', {
    query_embedding: embedding,
    query_text: queryText,
    match_threshold: 0.3, // Lower threshold since we combine scores
    match_count: params.limit || 10,
    filter_type: params.type || null,
    filter_field: params.field || null,
    filter_country: params.country || null,
    vector_weight: 0.6,
    keyword_weight: 0.4,
  });
  
  if (error) {
    logger.error('Hybrid search failed', { error: error.message });
    throw error;
  }
  
  return data || [];
}

/**
 * Keyword-only search using tsvector (fallback when no embedding available)
 */
export async function keywordSearchOpportunities(
  queryText: string,
  params: Omit<SearchParams, 'query'>
): Promise<(OpportunitySearchResult & { keyword_score: number })[]> {
  const supabase = getSupabaseClient();
  
  const { data, error } = await supabase.rpc('keyword_search_opportunities', {
    query_text: queryText,
    match_count: params.limit || 10,
    filter_type: params.type || null,
    filter_field: params.field || null,
    filter_country: params.country || null,
  });
  
  if (error) {
    logger.error('Keyword search failed', { error: error.message });
    throw error;
  }
  
  return data || [];
}

/**
 * Create ingestion log entry
 */
export async function createIngestionLog(
  log: Omit<IngestionLog, 'id' | 'started_at'>
): Promise<string> {
  const supabase = getSupabaseClient();
  
  const { data, error } = await supabase
    .from('opportunity_ingestion_logs')
    .insert(log)
    .select('id')
    .single();
  
  if (error) {
    logger.error('Failed to create ingestion log', { error: error.message });
    throw error;
  }
  
  return data.id;
}

/**
 * Update ingestion log status
 */
export async function updateIngestionLog(
  id: string,
  updates: Partial<IngestionLog>
): Promise<void> {
  const supabase = getSupabaseClient();
  
  const { error } = await supabase
    .from('opportunity_ingestion_logs')
    .update({
      ...updates,
      completed_at: updates.status === 'completed' || updates.status === 'failed' 
        ? new Date().toISOString() 
        : undefined,
    })
    .eq('id', id);
  
  if (error) {
    logger.error('Failed to update ingestion log', { id, error: error.message });
  }
}

/**
 * Get opportunities statistics
 */
export async function getOpportunitiesStats(): Promise<{
  total: number;
  withEmbeddings: number;
  byType: Record<string, number>;
  byCountry: Record<string, number>;
  activeSources: number;
}> {
  const supabase = getSupabaseClient();
  
  const { data, error } = await supabase.rpc('get_opportunities_stats');
  
  if (error) {
    logger.error('Failed to get stats', { error: error.message });
    throw error;
  }
  
  return {
    total: data?.total_count || 0,
    withEmbeddings: data?.with_embeddings || 0,
    byType: data?.by_type || {},
    byCountry: data?.by_country || {},
    activeSources: data?.sources_count || 0,
  };
}
