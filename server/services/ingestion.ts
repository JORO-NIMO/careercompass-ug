/**
 * Ingestion Service
 * Main orchestrator for RSS feed ingestion pipeline
 */

import type { 
  Opportunity, 
  RssSource, 
  IngestionResult,
  IngestionLog,
} from '../types/index.js';
import { fetchRssFeed } from './rssFetcher.js';
import { cleanRssItem, isValidUrl, isLikelyExpired } from '../utils/cleaner.js';
import { classifyOpportunity } from './classifier.js';
import { generateOpportunityEmbeddings, isEmbeddingServiceAvailable } from './embeddingService.js';
import {
  getActiveRssSources,
  getExistingUrls,
  bulkInsertOpportunities,
  updateRssSourceStatus,
  createIngestionLog,
  updateIngestionLog,
  searchOpportunities,
} from './database.js';
import { createModuleLogger } from '../utils/logger.js';
import { DEFAULT_RSS_SOURCES } from '../config/index.js';
import { notifyMatchingUsers } from './notificationService.js';
import { invalidateSearchCache } from '../utils/cache.js';

const logger = createModuleLogger('ingestion');

/**
 * Process a single RSS feed
 */
export async function processRssFeed(
  source: RssSource
): Promise<IngestionResult> {
  const result: IngestionResult = {
    source: source.name,
    fetched: 0,
    inserted: 0,
    skipped: 0,
    failed: 0,
    errors: [],
  };
  
  logger.info(`Processing feed: ${source.name}`);
  
  // Fetch feed items
  const { items, error: fetchError } = await fetchRssFeed(source.url, source.name);
  
  if (fetchError) {
    result.errors.push(fetchError);
    
    // Update source status with error
    if (source.id) {
      await updateRssSourceStatus(source.id, {
        lastFetchedAt: new Date().toISOString(),
        lastError: fetchError,
      });
    }
    
    return result;
  }
  
  result.fetched = items.length;
  
  if (items.length === 0) {
    logger.info(`No items to process from: ${source.name}`);
    return result;
  }
  
  // Clean and prepare opportunities
  const cleanedItems: Array<Omit<Opportunity, 'id' | 'created_at' | 'updated_at'>> = [];
  const urls: string[] = [];
  
  for (const item of items) {
    // Skip items without valid URLs
    if (!item.link || !isValidUrl(item.link)) {
      result.skipped++;
      continue;
    }
    
    // Clean the item data
    const cleaned = cleanRssItem(item);
    
    // Skip items without title
    if (!cleaned.title) {
      result.skipped++;
      continue;
    }
    
    // Skip potentially expired items
    if (isLikelyExpired(cleaned.title, cleaned.description, cleaned.publishedAt)) {
      result.skipped++;
      continue;
    }
    
    urls.push(cleaned.url);
    
    // Classify the opportunity
    const classification = classifyOpportunity(cleaned.title, cleaned.description);
    
    cleanedItems.push({
      title: cleaned.title,
      organization: cleaned.organization,
      description: cleaned.description,
      url: cleaned.url,
      source: source.name,
      type: classification.type,
      field: classification.field,
      country: classification.country,
      published_at: cleaned.publishedAt,
    });
  }
  
  // Check for existing URLs
  const existingUrls = await getExistingUrls(urls);
  
  // Filter out existing items
  const newItems = cleanedItems.filter(item => !existingUrls.has(item.url));
  result.skipped += cleanedItems.length - newItems.length;
  
  if (newItems.length === 0) {
    logger.info(`No new items to insert from: ${source.name}`);
    
    // Update source status
    if (source.id) {
      await updateRssSourceStatus(source.id, {
        lastFetchedAt: new Date().toISOString(),
        lastError: undefined,
        itemsCount: items.length,
      });
    }
    
    return result;
  }
  
  // Insert new opportunities
  const { inserted, failed } = await bulkInsertOpportunities(newItems);
  result.inserted = inserted;
  result.failed = failed;
  
  // Update source status
  if (source.id) {
    await updateRssSourceStatus(source.id, {
      lastFetchedAt: new Date().toISOString(),
      lastError: undefined,
      itemsCount: items.length,
    });
  }
  
  logger.info(`Feed processed: ${source.name}`, {
    fetched: result.fetched,
    inserted: result.inserted,
    skipped: result.skipped,
    failed: result.failed,
  });
  
  return result;
}

/**
 * Run full ingestion from all active sources
 */
export async function runFullIngestion(): Promise<{
  results: IngestionResult[];
  totalInserted: number;
  totalSkipped: number;
  totalFailed: number;
  embeddingsGenerated: number;
  notificationsQueued: number;
}> {
  logger.info('Starting full ingestion run');
  
  // Create ingestion log
  const logId = await createIngestionLog({
    source_url: 'all_sources',
    status: 'running',
    items_fetched: 0,
    items_inserted: 0,
    items_skipped: 0,
    items_failed: 0,
  });
  
  try {
    // Get active RSS sources from database
    let sources = await getActiveRssSources();
    
    // If no sources in database, use defaults
    if (sources.length === 0) {
      logger.info('No active sources in database, using defaults');
      sources = DEFAULT_RSS_SOURCES.map(s => ({
        ...s,
        is_active: true,
      }));
    }
    
    logger.info(`Processing ${sources.length} RSS sources`);
    
    // Process each feed
    const results: IngestionResult[] = [];
    
    for (const source of sources) {
      try {
        const result = await processRssFeed(source);
        results.push(result);
      } catch (err) {
        logger.error(`Failed to process feed: ${source.name}`, {
          error: err instanceof Error ? err.message : 'Unknown error',
        });
        results.push({
          source: source.name,
          fetched: 0,
          inserted: 0,
          skipped: 0,
          failed: 0,
          errors: [err instanceof Error ? err.message : 'Unknown error'],
        });
      }
      
      // Small delay between sources to be respectful
      await new Promise(resolve => setTimeout(resolve, 500));
    }
    
    // Calculate totals
    const totalInserted = results.reduce((sum, r) => sum + r.inserted, 0);
    const totalSkipped = results.reduce((sum, r) => sum + r.skipped, 0);
    const totalFailed = results.reduce((sum, r) => sum + r.failed, 0);
    const totalFetched = results.reduce((sum, r) => sum + r.fetched, 0);
    
    // Generate embeddings for new opportunities
    let embeddingsGenerated = 0;
    if (isEmbeddingServiceAvailable() && totalInserted > 0) {
      embeddingsGenerated = await generateEmbeddingsForNew();
    }
    
    // Invalidate search cache since we have new opportunities
    if (totalInserted > 0) {
      await invalidateSearchCache();
    }
    
    // Notify users about matching opportunities
    let notificationStats = { subscriptionsMatched: 0, notificationsQueued: 0 };
    if (totalInserted > 0) {
      // Get recently inserted opportunities (last hour)
      const recentOpportunities = await searchOpportunities({
        limit: totalInserted,
        offset: 0,
      });
      
      if (recentOpportunities.length > 0) {
        notificationStats = await notifyMatchingUsers(recentOpportunities);
      }
    }
    
    // Update ingestion log
    await updateIngestionLog(logId, {
      status: 'completed',
      items_fetched: totalFetched,
      items_inserted: totalInserted,
      items_skipped: totalSkipped,
      items_failed: totalFailed,
    });
    
    logger.info('Full ingestion complete', {
      sources: sources.length,
      totalInserted,
      totalSkipped,
      totalFailed,
      embeddingsGenerated,
      notificationsQueued: notificationStats.notificationsQueued,
    });
    
    return {
      results,
      totalInserted,
      totalSkipped,
      totalFailed,
      embeddingsGenerated,
      notificationsQueued: notificationStats.notificationsQueued,
    };
  } catch (err) {
    // Update log with error
    await updateIngestionLog(logId, {
      status: 'failed',
      error_message: err instanceof Error ? err.message : 'Unknown error',
    });
    
    throw err;
  }
}

/**
 * Generate embeddings for opportunities without them
 */
export async function generateEmbeddingsForNew(limit: number = 200): Promise<number> {
  const { getOpportunitiesWithoutEmbeddings, bulkUpdateEmbeddings } = await import('./database.js');
  
  logger.info('Generating embeddings for new opportunities');
  
  // Get opportunities without embeddings
  const opportunities = await getOpportunitiesWithoutEmbeddings(limit);
  
  if (opportunities.length === 0) {
    logger.info('No opportunities need embeddings');
    return 0;
  }
  
  logger.info(`Found ${opportunities.length} opportunities needing embeddings`);
  
  // Generate embeddings
  const embeddings = await generateOpportunityEmbeddings(opportunities);
  
  if (embeddings.size === 0) {
    logger.warn('No embeddings generated');
    return 0;
  }
  
  // Update database
  const updated = await bulkUpdateEmbeddings(embeddings);
  
  logger.info(`Generated and stored ${updated} embeddings`);
  return updated;
}

/**
 * Process a single RSS URL (for testing/manual ingestion)
 */
export async function processRssUrl(url: string, name?: string): Promise<IngestionResult> {
  const source: RssSource = {
    name: name || url,
    url,
    is_active: true,
  };
  
  return processRssFeed(source);
}
