/**
 * AI Rate Limiter Middleware
 * Redis-backed rate limiting for AI endpoints
 * Protects against abuse and cost explosion
 */

import { Request, Response, NextFunction } from 'express';
import { isCacheAvailable, getRateLimitCount, incrementRateLimit, getRateLimitTTL } from './cache.js';
import { createModuleLogger } from './logger.js';
import { getSupabaseClient } from './supabase.js';

const logger = createModuleLogger('ai-rate-limiter');

// Rate limits by user type (requests per day)
const RATE_LIMITS = {
  anonymous: 5,
  authenticated: 25,
  admin: Infinity, // Unlimited for admins
};

// Redis key prefix
const KEY_PREFIX = 'ai_rate_limit:';
const KEY_EXPIRY_SECONDS = 24 * 60 * 60; // 24 hours

/**
 * Get user identifier from request
 * Returns userId if authenticated, IP if anonymous
 */
async function getUserIdentifier(req: Request): Promise<{
  id: string;
  type: 'anonymous' | 'authenticated' | 'admin';
}> {
  // Check for auth header
  const authHeader = req.headers.authorization;
  
  if (authHeader && authHeader.startsWith('Bearer ')) {
    const token = authHeader.replace('Bearer ', '');
    
    try {
      const supabase = getSupabaseClient();
      const { data: { user } } = await supabase.auth.getUser(token);
      
      if (user) {
        // Check if user is admin
        const { data: roleData } = await supabase
          .from('user_roles')
          .select('role')
          .eq('user_id', user.id)
          .eq('role', 'admin')
          .maybeSingle();
        
        const isAdmin = Boolean(roleData);
        
        return {
          id: user.id,
          type: isAdmin ? 'admin' : 'authenticated',
        };
      }
    } catch (err) {
      logger.warn('Failed to get user from token', {
        error: err instanceof Error ? err.message : 'Unknown error',
      });
    }
  }
  
  // Fall back to IP for anonymous users
  const ip = req.ip || req.socket.remoteAddress || 'unknown';
  return {
    id: `ip:${ip}`,
    type: 'anonymous',
  };
}

/**
 * Get current usage count from Redis
 */
async function getUsageCount(key: string): Promise<number> {
  if (!isCacheAvailable()) {
    // If Redis is not available, allow the request but log warning
    logger.warn('Redis unavailable for rate limiting - allowing request');
    return 0;
  }
  
  try {
    return await getRateLimitCount(key);
  } catch (err) {
    logger.error('Failed to get rate limit count', {
      error: err instanceof Error ? err.message : 'Unknown error',
    });
    return 0;
  }
}

/**
 * Increment usage count in Redis
 */
async function incrementUsage(key: string): Promise<number> {
  if (!isCacheAvailable()) {
    return 0;
  }
  
  try {
    return await incrementRateLimit(key, KEY_EXPIRY_SECONDS);
  } catch (err) {
    logger.error('Failed to increment rate limit count', {
      error: err instanceof Error ? err.message : 'Unknown error',
    });
    return 0;
  }
}

/**
 * Get remaining time until rate limit resets (in seconds)
 */
async function getTTL(key: string): Promise<number> {
  if (!isCacheAvailable()) {
    return KEY_EXPIRY_SECONDS;
  }
  
  try {
    const ttl = await getRateLimitTTL(key);
    return ttl > 0 ? ttl : KEY_EXPIRY_SECONDS;
  } catch {
    return KEY_EXPIRY_SECONDS;
  }
}

/**
 * AI Rate Limiter Middleware
 * Usage: Apply to AI-powered endpoints (chat, semantic search)
 */
export async function aiRateLimiter(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const { id, type } = await getUserIdentifier(req);
    const limit = RATE_LIMITS[type];
    
    // Admins have unlimited access
    if (limit === Infinity) {
      return next();
    }
    
    const key = `${KEY_PREFIX}${id}`;
    const currentCount = await getUsageCount(key);
    
    // Check if limit exceeded
    if (currentCount >= limit) {
      const ttl = await getTTL(key);
      const resetTime = new Date(Date.now() + ttl * 1000);
      
      logger.warn('AI rate limit exceeded', {
        userType: type,
        userId: id,
        limit,
        currentCount,
      });
      
      res.status(429).json({
        success: false,
        error: 'AI request limit exceeded',
        message: type === 'anonymous'
          ? `Anonymous users are limited to ${limit} AI requests per day. Sign in for more requests.`
          : `You have reached your daily limit of ${limit} AI requests. Your limit resets at ${resetTime.toISOString()}.`,
        limit,
        used: currentCount,
        resetAt: resetTime.toISOString(),
        upgradeInfo: type === 'anonymous' 
          ? 'Sign in for 25 requests/day'
          : 'Contact support for higher limits',
      });
      return;
    }
    
    // Increment usage
    const newCount = await incrementUsage(key);
    
    // Add rate limit headers
    res.set({
      'X-RateLimit-Limit': String(limit),
      'X-RateLimit-Remaining': String(Math.max(0, limit - newCount)),
      'X-RateLimit-Reset': String(Math.floor(Date.now() / 1000) + KEY_EXPIRY_SECONDS),
    });
    
    logger.debug('AI request allowed', {
      userType: type,
      userId: id,
      used: newCount,
      limit,
    });
    
    next();
  } catch (err) {
    logger.error('AI rate limiter error', {
      error: err instanceof Error ? err.message : 'Unknown error',
    });
    // On error, allow the request to proceed
    next();
  }
}

/**
 * Get current usage for a user (for UI display)
 */
export async function getAiUsage(userId: string, isAdmin: boolean): Promise<{
  used: number;
  limit: number;
  remaining: number;
  resetAt: Date;
}> {
  const type = isAdmin ? 'admin' : 'authenticated';
  const limit = RATE_LIMITS[type];
  const key = `${KEY_PREFIX}${userId}`;
  
  const used = await getUsageCount(key);
  const ttl = await getTTL(key);
  
  return {
    used,
    limit: limit === Infinity ? -1 : limit,
    remaining: limit === Infinity ? -1 : Math.max(0, limit - used),
    resetAt: new Date(Date.now() + ttl * 1000),
  };
}
