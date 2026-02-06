/**
 * Data Cleaning Utilities
 * Functions for normalizing and sanitizing opportunity data
 */

import * as cheerio from 'cheerio';
import he from 'he';
import { config } from '../config/index.js';

/**
 * Remove HTML tags from text
 */
export function stripHtml(html: string | null | undefined): string {
  if (!html) return '';
  
  // Use cheerio to parse and extract text
  const $ = cheerio.load(html);
  
  // Remove script and style tags first
  $('script, style, noscript').remove();
  
  // Get text content
  let text = $.text();
  
  // Decode HTML entities
  text = he.decode(text);
  
  return text;
}

/**
 * Normalize whitespace in text
 */
export function normalizeWhitespace(text: string): string {
  if (!text) return '';
  
  return text
    // Replace multiple spaces with single space
    .replace(/\s+/g, ' ')
    // Remove leading/trailing whitespace
    .trim();
}

/**
 * Remove tracking parameters from URLs
 */
export function cleanUrl(url: string): string {
  if (!url) return '';
  
  try {
    const urlObj = new URL(url);
    
    // Common tracking parameters to remove
    const trackingParams = [
      'utm_source', 'utm_medium', 'utm_campaign', 'utm_term', 'utm_content',
      'fbclid', 'gclid', 'msclkid', 'dclid',
      'ref', 'source', 'mc_cid', 'mc_eid',
      '_ga', '_gl', 'ns_mchannel', 'ns_source',
    ];
    
    trackingParams.forEach(param => {
      urlObj.searchParams.delete(param);
    });
    
    // Remove trailing slash if present (normalize)
    let cleanedUrl = urlObj.toString();
    if (cleanedUrl.endsWith('/') && urlObj.pathname !== '/') {
      cleanedUrl = cleanedUrl.slice(0, -1);
    }
    
    return cleanedUrl;
  } catch (err) {
    // If URL parsing fails, return original
    return url;
  }
}

/**
 * Ensure text is UTF-8 safe
 */
export function sanitizeUtf8(text: string | null | undefined): string {
  if (!text) return '';
  
  // Remove null bytes and other problematic characters
  return text
    .replace(/\0/g, '') // null bytes
    .replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g, '') // control characters
    .normalize('NFC'); // normalize unicode
}

/**
 * Trim description to max length while preserving words
 */
export function truncateDescription(
  text: string,
  maxLength: number = config.maxDescriptionLength
): string {
  if (!text || text.length <= maxLength) return text;
  
  // Find last space before maxLength
  const truncated = text.substring(0, maxLength);
  const lastSpace = truncated.lastIndexOf(' ');
  
  if (lastSpace > maxLength * 0.8) {
    return truncated.substring(0, lastSpace) + '...';
  }
  
  return truncated + '...';
}

/**
 * Extract organization name from various formats
 */
export function extractOrganization(
  text: string | null | undefined,
  fallback: string = ''
): string {
  if (!text) return fallback;
  
  // Common patterns for organization names
  const patterns = [
    /(?:at|@)\s+([A-Z][A-Za-z0-9\s&\-.']+?)(?:\s+[-–—]|\s*$|,)/,
    /(?:with|for)\s+([A-Z][A-Za-z0-9\s&\-.']+?)(?:\s+[-–—]|\s*$|,)/,
    /^([A-Z][A-Za-z0-9\s&\-.']+?)\s+(?:is\s+)?(?:hiring|seeking|looking)/i,
    /(?:organization|company|employer):\s*([A-Za-z0-9\s&\-.']+)/i,
  ];
  
  for (const pattern of patterns) {
    const match = text.match(pattern);
    if (match && match[1]) {
      return normalizeWhitespace(match[1]);
    }
  }
  
  return fallback;
}

/**
 * Clean and normalize RSS item data
 */
export function cleanRssItem(item: {
  title?: string;
  link?: string;
  content?: string;
  contentSnippet?: string;
  summary?: string;
  description?: string;
  creator?: string;
  pubDate?: string;
  isoDate?: string;
}): {
  title: string;
  url: string;
  description: string;
  organization: string | null;
  publishedAt: string | null;
} {
  // Clean title
  const title = normalizeWhitespace(
    sanitizeUtf8(stripHtml(item.title))
  );
  
  // Clean URL
  const url = cleanUrl(item.link || '');
  
  // Get best description source
  const rawDescription = item.content 
    || item.contentSnippet 
    || item.summary 
    || item.description 
    || '';
  
  // Clean and truncate description
  const description = truncateDescription(
    normalizeWhitespace(
      sanitizeUtf8(stripHtml(rawDescription))
    )
  );
  
  // Extract organization
  const organization = extractOrganization(title) 
    || extractOrganization(description) 
    || (item.creator ? normalizeWhitespace(sanitizeUtf8(item.creator)) : null);
  
  // Parse date
  let publishedAt: string | null = null;
  if (item.isoDate) {
    publishedAt = item.isoDate;
  } else if (item.pubDate) {
    try {
      publishedAt = new Date(item.pubDate).toISOString();
    } catch {
      publishedAt = null;
    }
  }
  
  return {
    title,
    url,
    description,
    organization,
    publishedAt,
  };
}

/**
 * Validate URL format
 */
export function isValidUrl(url: string): boolean {
  if (!url) return false;
  
  try {
    const urlObj = new URL(url);
    return ['http:', 'https:'].includes(urlObj.protocol);
  } catch {
    return false;
  }
}

/**
 * Check if opportunity appears to be expired
 */
export function isLikelyExpired(
  title: string,
  description: string,
  publishedAt: string | null
): boolean {
  const text = `${title} ${description}`.toLowerCase();
  
  // Check for deadline patterns
  const deadlinePatterns = [
    /deadline:\s*(\w+\s+\d{1,2},?\s+\d{4})/i,
    /closes?\s+on\s+(\w+\s+\d{1,2},?\s+\d{4})/i,
    /apply\s+by\s+(\w+\s+\d{1,2},?\s+\d{4})/i,
  ];
  
  for (const pattern of deadlinePatterns) {
    const match = text.match(pattern);
    if (match && match[1]) {
      try {
        const deadlineDate = new Date(match[1]);
        if (deadlineDate < new Date()) {
          return true;
        }
      } catch {
        // Ignore parsing errors
      }
    }
  }
  
  // Check if published more than 90 days ago (likely stale for jobs)
  if (publishedAt) {
    const publishedDate = new Date(publishedAt);
    const daysOld = (Date.now() - publishedDate.getTime()) / (1000 * 60 * 60 * 24);
    if (daysOld > 90) {
      return true;
    }
  }
  
  return false;
}
