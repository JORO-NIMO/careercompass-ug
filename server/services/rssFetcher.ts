/**
 * RSS Fetcher Service
 * Fetches and parses RSS feeds from various sources
 * Includes retry logic with exponential backoff
 */

import Parser from "rss-parser";
import type { RssFeedItem, RssSource } from "../types/index.js";
import { createModuleLogger } from "../utils/logger.js";
import { config } from "../config/index.js";
import { assertSafeOutboundUrl } from "../utils/security.js";

const logger = createModuleLogger("rss-fetcher");

// RSS parser instance with custom fields
const parser = new Parser({
  customFields: {
    item: [
      ["content:encoded", "content"],
      ["dc:creator", "creator"],
      ["media:content", "mediaContent"],
    ],
  },
  timeout: 30000, // 30 second timeout
  headers: {
    "User-Agent": "OpportunityBot/1.0 (+https://www.placementbridge.org)",
    Accept:
      "application/rss+xml, application/xml, text/xml, application/atom+xml",
  },
});

/**
 * Retry configuration
 */
const RETRY_CONFIG = {
  maxRetries: 3,
  baseDelayMs: 1000,
  maxDelayMs: 30000,
};

/**
 * Calculate delay with exponential backoff and jitter
 */
function calculateBackoffDelay(attempt: number): number {
  const exponentialDelay = RETRY_CONFIG.baseDelayMs * Math.pow(2, attempt);
  const jitter = Math.random() * 1000;
  return Math.min(exponentialDelay + jitter, RETRY_CONFIG.maxDelayMs);
}

/**
 * Sleep for a specified duration
 */
function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Fetch and parse a single RSS feed with retry logic
 */
export async function fetchRssFeed(
  sourceUrl: string,
  sourceName?: string,
): Promise<{ items: RssFeedItem[]; error?: string }> {
  const name = sourceName || sourceUrl;
  assertSafeOutboundUrl(sourceUrl, config.rssAllowedHosts);
  let lastError: string | undefined;

  for (let attempt = 0; attempt <= RETRY_CONFIG.maxRetries; attempt++) {
    try {
      if (attempt > 0) {
        const delay = calculateBackoffDelay(attempt - 1);
        logger.info(
          `Retry ${attempt}/${RETRY_CONFIG.maxRetries} for feed: ${name}`,
          {
            delayMs: delay,
          },
        );
        await sleep(delay);
      }

      logger.info(`Fetching RSS feed: ${name}`, { url: sourceUrl, attempt });

      const feed = await parser.parseURL(sourceUrl);

      if (!feed.items || feed.items.length === 0) {
        logger.warn(`No items found in feed: ${name}`);
        return { items: [], error: "No items found in feed" };
      }

      const items: RssFeedItem[] = feed.items.map((item) => ({
        title: item.title || "",
        link: item.link || "",
        pubDate: item.pubDate,
        content:
          item.content || (item["content:encoded"] as string | undefined),
        contentSnippet: item.contentSnippet,
        summary: item.summary,
        description: item.content || item.contentSnippet,
        creator: item.creator || (item["dc:creator"] as string | undefined),
        categories: item.categories,
        guid: item.guid,
        isoDate: item.isoDate,
      }));

      logger.info(`Fetched ${items.length} items from: ${name}`);
      return { items };
    } catch (err) {
      lastError = err instanceof Error ? err.message : "Unknown error";
      logger.warn(`Fetch attempt ${attempt + 1} failed for: ${name}`, {
        url: sourceUrl,
        error: lastError,
      });

      // Don't retry on certain errors
      if (
        lastError.includes("404") ||
        lastError.includes("403") ||
        lastError.includes("Invalid XML")
      ) {
        break;
      }
    }
  }

  logger.error(
    `Failed to fetch RSS feed after ${RETRY_CONFIG.maxRetries + 1} attempts: ${name}`,
    {
      url: sourceUrl,
      error: lastError,
    },
  );
  return { items: [], error: lastError };
}

/**
 * Fetch multiple RSS feeds in parallel (with concurrency limit)
 */
export async function fetchMultipleFeeds(
  sources: RssSource[],
  concurrencyLimit: number = 3,
): Promise<Map<string, { items: RssFeedItem[]; error?: string }>> {
  const results = new Map<string, { items: RssFeedItem[]; error?: string }>();

  // Process feeds in batches to limit concurrency
  for (let i = 0; i < sources.length; i += concurrencyLimit) {
    const batch = sources.slice(i, i + concurrencyLimit);

    const batchResults = await Promise.all(
      batch.map(async (source) => {
        const result = await fetchRssFeed(source.url, source.name);
        return { url: source.url, result };
      }),
    );

    for (const { url, result } of batchResults) {
      results.set(url, result);
    }

    // Small delay between batches to be respectful
    if (i + concurrencyLimit < sources.length) {
      await new Promise((resolve) => setTimeout(resolve, 1000));
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
    assertSafeOutboundUrl(url, config.rssAllowedHosts);
    const feed = await parser.parseURL(url);

    return {
      valid: true,
      feedTitle: feed.title,
      itemCount: feed.items?.length || 0,
    };
  } catch (err) {
    return {
      valid: false,
      error: err instanceof Error ? err.message : "Invalid RSS feed",
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
    assertSafeOutboundUrl(url, config.rssAllowedHosts);
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
