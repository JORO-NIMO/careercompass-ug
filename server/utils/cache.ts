/**
 * Redis Cache Service
 * Provides caching for frequently accessed data
 */

import Redis from 'ioredis';
import { createModuleLogger } from './logger.js';

const logger = createModuleLogger('cache');

// Redis client instance
let redisClient: Redis | null = null;
let isConnected = false;

// Cache TTL defaults (in seconds)
export const CACHE_TTL = {
  SEARCH_RESULTS: 5 * 60,      // 5 minutes for search results
  OPPORTUNITY_STATS: 10 * 60,  // 10 minutes for stats
  RSS_SOURCES: 30 * 60,        // 30 minutes for RSS sources list
  OPPORTUNITY_DETAIL: 15 * 60, // 15 minutes for single opportunity
  EMBEDDINGS: 60 * 60,         // 1 hour for embeddings
};

/**
 * Initialize Redis connection
 */
export function initRedisCache(): Redis | null {
  const redisUrl = process.env.REDIS_URL;
  
  if (!redisUrl) {
    logger.info('Redis URL not configured - caching disabled');
    return null;
  }
  
  try {
    redisClient = new Redis(redisUrl, {
      maxRetriesPerRequest: 3,
      retryStrategy: (times) => {
        if (times > 3) {
          logger.error('Redis connection failed after 3 retries');
          return null;
        }
        return Math.min(times * 100, 3000);
      },
      lazyConnect: true,
    });
    
    redisClient.on('connect', () => {
      isConnected = true;
      logger.info('Redis cache connected');
    });
    
    redisClient.on('error', (err) => {
      isConnected = false;
      logger.error('Redis error', { error: err.message });
    });
    
    redisClient.on('close', () => {
      isConnected = false;
      logger.info('Redis connection closed');
    });
    
    // Attempt connection
    redisClient.connect().catch(() => {
      logger.warn('Initial Redis connection failed - will retry');
    });
    
    return redisClient;
  } catch (err) {
    logger.error('Failed to initialize Redis', { 
      error: err instanceof Error ? err.message : 'Unknown error' 
    });
    return null;
  }
}

/**
 * Get Redis client
 */
export function getRedisClient(): Redis | null {
  return redisClient;
}

/**
 * Check if cache is available
 */
export function isCacheAvailable(): boolean {
  return isConnected && redisClient !== null;
}

/**
 * Generate cache key from parameters
 */
export function generateCacheKey(prefix: string, params: Record<string, any>): string {
  const sortedParams = Object.keys(params)
    .sort()
    .filter(k => params[k] !== undefined && params[k] !== null)
    .map(k => `${k}:${params[k]}`)
    .join('|');
  
  return `opp:${prefix}:${sortedParams || 'default'}`;
}

/**
 * Get cached value
 */
export async function getCached<T>(key: string): Promise<T | null> {
  if (!isCacheAvailable()) return null;
  
  try {
    const cached = await redisClient!.get(key);
    
    if (cached) {
      logger.debug('Cache hit', { key });
      return JSON.parse(cached) as T;
    }
    
    logger.debug('Cache miss', { key });
    return null;
  } catch (err) {
    logger.error('Cache get error', { key, error: err });
    return null;
  }
}

/**
 * Set cached value
 */
export async function setCache(
  key: string, 
  value: any, 
  ttlSeconds: number = CACHE_TTL.SEARCH_RESULTS
): Promise<boolean> {
  if (!isCacheAvailable()) return false;
  
  try {
    await redisClient!.setex(key, ttlSeconds, JSON.stringify(value));
    logger.debug('Cache set', { key, ttl: ttlSeconds });
    return true;
  } catch (err) {
    logger.error('Cache set error', { key, error: err });
    return false;
  }
}

/**
 * Delete cached value
 */
export async function deleteCache(key: string): Promise<boolean> {
  if (!isCacheAvailable()) return false;
  
  try {
    await redisClient!.del(key);
    logger.debug('Cache deleted', { key });
    return true;
  } catch (err) {
    logger.error('Cache delete error', { key, error: err });
    return false;
  }
}

/**
 * Delete multiple cached values by pattern
 */
export async function deleteCachePattern(pattern: string): Promise<number> {
  if (!isCacheAvailable()) return 0;
  
  try {
    const keys = await redisClient!.keys(`opp:${pattern}:*`);
    
    if (keys.length > 0) {
      await redisClient!.del(...keys);
      logger.debug('Cache pattern deleted', { pattern, count: keys.length });
    }
    
    return keys.length;
  } catch (err) {
    logger.error('Cache pattern delete error', { pattern, error: err });
    return 0;
  }
}

/**
 * Cache wrapper - get from cache or execute function and cache result
 */
export async function withCache<T>(
  key: string,
  ttlSeconds: number,
  fetchFn: () => Promise<T>
): Promise<T> {
  // Try cache first
  const cached = await getCached<T>(key);
  if (cached !== null) {
    return cached;
  }
  
  // Execute function
  const result = await fetchFn();
  
  // Cache result (fire and forget)
  setCache(key, result, ttlSeconds).catch(() => {});
  
  return result;
}

/**
 * Invalidate search cache (call after new opportunities are added)
 */
export async function invalidateSearchCache(): Promise<void> {
  await deleteCachePattern('search');
  await deleteCachePattern('stats');
  logger.info('Search cache invalidated');
}

/**
 * Close Redis connection
 */
export async function closeRedisCache(): Promise<void> {
  if (redisClient) {
    await redisClient.quit();
    redisClient = null;
    isConnected = false;
    logger.info('Redis cache closed');
  }
}
