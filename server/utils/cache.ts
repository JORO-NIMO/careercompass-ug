/**
 * Redis Cache Service
 * Provides caching for frequently accessed data
 * Supports both standard Redis (ioredis) and Upstash REST API
 */

import { Redis } from 'ioredis';
import { Redis as UpstashRedis } from '@upstash/redis';
import { createModuleLogger } from './logger.js';

const logger = createModuleLogger('cache');

// Client types
type RedisClientType = 'ioredis' | 'upstash' | 'none';

// Redis client instances
let ioredisClient: Redis | null = null;
let upstashClient: UpstashRedis | null = null;
let clientType: RedisClientType = 'none';
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
 * Tries Upstash REST first (better for serverless), then falls back to ioredis
 */
export function initRedisCache(): void {
  // Try Upstash REST API first (recommended for serverless)
  const upstashUrl = process.env.UPSTASH_REDIS_REST_URL;
  const upstashToken = process.env.UPSTASH_REDIS_REST_TOKEN;
  
  if (upstashUrl && upstashToken) {
    try {
      upstashClient = new UpstashRedis({
        url: upstashUrl,
        token: upstashToken,
      });
      clientType = 'upstash';
      isConnected = true;
      logger.info('Upstash Redis (REST) initialized');
      return;
    } catch (err) {
      logger.error('Failed to initialize Upstash', {
        error: err instanceof Error ? err.message : 'Unknown error',
      });
    }
  }
  
  // Fall back to standard Redis URL (ioredis)
  const redisUrl = process.env.REDIS_URL;
  
  if (!redisUrl) {
    logger.info('No Redis configured - caching disabled');
    clientType = 'none';
    return;
  }
  
  try {
    ioredisClient = new Redis(redisUrl, {
      maxRetriesPerRequest: 3,
      retryStrategy: (times: number) => {
        if (times > 3) {
          logger.error('Redis connection failed after 3 retries');
          return null;
        }
        return Math.min(times * 100, 3000);
      },
      lazyConnect: true,
      tls: redisUrl.startsWith('rediss://') ? {} : undefined,
    });
    
    ioredisClient.on('connect', () => {
      isConnected = true;
      logger.info('ioredis cache connected');
    });
    
    ioredisClient.on('error', (err: Error) => {
      isConnected = false;
      logger.error('Redis error', { error: err.message });
    });
    
    ioredisClient.on('close', () => {
      isConnected = false;
      logger.info('Redis connection closed');
    });
    
    // Attempt connection
    ioredisClient.connect().catch(() => {
      logger.warn('Initial Redis connection failed - will retry');
    });
    
    clientType = 'ioredis';
  } catch (err) {
    logger.error('Failed to initialize Redis', { 
      error: err instanceof Error ? err.message : 'Unknown error' 
    });
    clientType = 'none';
  }
}

/**
 * Get ioredis client (for backward compatibility)
 */
export function getRedisClient(): Redis | null {
  return ioredisClient;
}

/**
 * Check if cache is available
 */
export function isCacheAvailable(): boolean {
  if (clientType === 'upstash') return isConnected && upstashClient !== null;
  if (clientType === 'ioredis') return isConnected && ioredisClient !== null;
  return false;
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
    let cached: string | null = null;
    
    if (clientType === 'upstash' && upstashClient) {
      cached = await upstashClient.get<string>(key);
    } else if (clientType === 'ioredis' && ioredisClient) {
      cached = await ioredisClient.get(key);
    }
    
    if (cached) {
      logger.debug('Cache hit', { key });
      // Upstash may return parsed JSON, ioredis returns string
      if (typeof cached === 'string') {
        return JSON.parse(cached) as T;
      }
      return cached as T;
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
    const stringValue = JSON.stringify(value);
    
    if (clientType === 'upstash' && upstashClient) {
      await upstashClient.setex(key, ttlSeconds, stringValue);
    } else if (clientType === 'ioredis' && ioredisClient) {
      await ioredisClient.setex(key, ttlSeconds, stringValue);
    }
    
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
    if (clientType === 'upstash' && upstashClient) {
      await upstashClient.del(key);
    } else if (clientType === 'ioredis' && ioredisClient) {
      await ioredisClient.del(key);
    }
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
    let keys: string[] = [];
    const fullPattern = `opp:${pattern}:*`;
    
    if (clientType === 'upstash' && upstashClient) {
      // Upstash uses scan for pattern matching
      let cursor = 0;
      let done = false;
      while (!done) {
        const result = await upstashClient.scan(cursor, { match: fullPattern, count: 100 });
        cursor = Number(result[0]);
        keys = keys.concat(result[1] as string[]);
        done = cursor === 0;
      }
      
      if (keys.length > 0) {
        await upstashClient.del(...keys);
      }
    } else if (clientType === 'ioredis' && ioredisClient) {
      keys = await ioredisClient.keys(fullPattern);
      
      if (keys.length > 0) {
        await ioredisClient.del(...keys);
      }
    }
    
    if (keys.length > 0) {
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

// ============================================================================
// RATE LIMITING FUNCTIONS (for AI rate limiter)
// ============================================================================

/**
 * Get rate limit counter value
 */
export async function getRateLimitCount(key: string): Promise<number> {
  if (!isCacheAvailable()) return 0;
  
  try {
    let count: string | number | null = null;
    
    if (clientType === 'upstash' && upstashClient) {
      count = await upstashClient.get<number>(key);
    } else if (clientType === 'ioredis' && ioredisClient) {
      count = await ioredisClient.get(key);
    }
    
    if (count !== null) {
      return typeof count === 'number' ? count : parseInt(count, 10);
    }
    return 0;
  } catch (err) {
    logger.error('Rate limit get error', { key, error: err });
    return 0;
  }
}

/**
 * Increment rate limit counter
 */
export async function incrementRateLimit(key: string, ttlSeconds: number): Promise<number> {
  if (!isCacheAvailable()) return 0;
  
  try {
    let newCount = 0;
    
    if (clientType === 'upstash' && upstashClient) {
      newCount = await upstashClient.incr(key);
      // Set expiry if this is the first request
      if (newCount === 1) {
        await upstashClient.expire(key, ttlSeconds);
      }
    } else if (clientType === 'ioredis' && ioredisClient) {
      newCount = await ioredisClient.incr(key);
      if (newCount === 1) {
        await ioredisClient.expire(key, ttlSeconds);
      }
    }
    
    return newCount;
  } catch (err) {
    logger.error('Rate limit increment error', { key, error: err });
    return 0;
  }
}

/**
 * Get TTL for rate limit key
 */
export async function getRateLimitTTL(key: string): Promise<number> {
  if (!isCacheAvailable()) return -1;
  
  try {
    let ttl = -1;
    
    if (clientType === 'upstash' && upstashClient) {
      ttl = await upstashClient.ttl(key);
    } else if (clientType === 'ioredis' && ioredisClient) {
      ttl = await ioredisClient.ttl(key);
    }
    
    return ttl;
  } catch (err) {
    logger.error('Rate limit TTL error', { key, error: err });
    return -1;
  }
}

/**
 * Close Redis connection
 */
export async function closeRedisCache(): Promise<void> {
  if (clientType === 'ioredis' && ioredisClient) {
    await ioredisClient.quit();
    ioredisClient = null;
  }
  
  // Upstash REST client doesn't need explicit close
  if (clientType === 'upstash') {
    upstashClient = null;
  }
  
  isConnected = false;
  clientType = 'none';
  logger.info('Redis cache closed');
}
