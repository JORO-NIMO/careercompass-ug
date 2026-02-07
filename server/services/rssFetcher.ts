/**
 * RSS Fetcher Service
 * Fetches and parses RSS feeds from various sources
 */

import Parser from 'rss-parser';
import type { RssFeedItem, RssSource } from '../types/index.js';
import { createModuleLogger } from '../utils/logger.js';

const logger = createModuleLogger('rss-fetcher');

// RSS parser instance with custom fields
const parser = new Parser({
  customFields: {
    item: [
      ['content:encoded', 'content'],
      ['dc:creator', 'creator'],
      ['media:content', 'mediaContent'],
    ],
  },
  timeout: 30000, // 30 second timeout
  headers: {
    'User-Agent': 'OpportunityBot/1.0 (+https://careercompass.ug)',
    'Accept': 'application/rss+xml, application/xml, text/xml, application/atom+xml',
  },
});

/**
 * Fetch and parse a single RSS feed
 */
export async function fetchRssFeed(
  sourceUrl: string,
  sourceName?: string
): Promise<{ items: RssFeedItem[]; error?: string }> {
  const name = sourceName || sourceUrl;
  
  try {
    logger.info(`Fetching RSS feed: ${name}`, { url: sourceUrl });
    
    const feed = await parser.parseURL(sourceUrl);
    
    if (!feed.items || feed.items.length === 0) {
      logger.warn(`No items found in feed: ${name}`);
      return { items: [], error: 'No items found in feed' };
    }
    
    const items: RssFeedItem[] = feed.items.map(item => ({
      title: item.title || '',
      link: item.link || '',
      pubDate: item.pubDate,
      content: item.content || item['content:encoded'] as string | undefined,
      contentSnippet: item.contentSnippet,
      summary: item.summary,
      description: item.content || item.contentSnippet,
      creator: item.creator || item['dc:creator'] as string | undefined,
      categories: item.categories,
      guid: item.guid,
      isoDate: item.isoDate,
    }));
    
    logger.info(`Fetched ${items.length} items from: ${name}`);
    return { items };
    
  } catch (err) {
    const errorMessage = err instanceof Error ? err.message : 'Unknown error';
    logger.error(`Failed to fetch RSS feed: ${name}`, { 
      url: sourceUrl, 
      error: errorMessage 
    });
    return { items: [], error: errorMessage };
  }
}

/**
 * Fetch multiple RSS feeds in parallel (with concurrency limit)
 */
export async function fetchMultipleFeeds(
  sources: RssSource[],
  concurrencyLimit: number = 3
): Promise<Map<string, { items: RssFeedItem[]; error?: string }>> {
  const results = new Map<string, { items: RssFeedItem[]; error?: string }>();
  
  // Process feeds in batches to limit concurrency
  for (let i = 0; i < sources.length; i += concurrencyLimit) {
    const batch = sources.slice(i, i + concurrencyLimit);
    
    const batchResults = await Promise.all(
      batch.map(async source => {
        const result = await fetchRssFeed(source.url, source.name);
        return { url: source.url, result };
      })
    );
    
    for (const { url, result } of batchResults) {
      results.set(url, result);
    }
    
    // Small delay between batches to be respectful
    if (i + concurrencyLimit < sources.length) {
      await new Promise(resolve => setTimeout(resolve, 1000));
    }
  }
  
  return results;
}

/**
 * Validate if URL is a valid RSS feed
 */
export async function validateRssFeed(url: string): Promise<{
  valid: boolean;
  feedTitle?: string;
  itemCount?: number;
  error?: string;
}> {
  try {
    const feed = await parser.parseURL(url);
    
    return {
      valid: true,
      feedTitle: feed.title,
      itemCount: feed.items?.length || 0,
    };
  } catch (err) {
    return {
      valid: false,
      error: err instanceof Error ? err.message : 'Invalid RSS feed',
    };
  }
}

/**
 * Extract feed metadata
 */
export async function getFeedMetadata(url: string): Promise<{
  title?: string;
  description?: string;
  link?: string;
  language?: string;
  lastBuildDate?: string;
  itemCount: number;
} | null> {
  try {
    const feed = await parser.parseURL(url);
    
    return {
      title: feed.title,
      description: feed.description,
      link: feed.link,
      language: feed.language,
      lastBuildDate: feed.lastBuildDate,
      itemCount: feed.items?.length || 0,
    };
  } catch {
    return null;
  }
}
