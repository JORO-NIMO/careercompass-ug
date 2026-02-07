/**
 * Rate Limiter Middleware
 * Configurable rate limiting for API endpoints
 */

import rateLimit from 'express-rate-limit';
import { config } from '../config/index.js';
import { createModuleLogger } from './logger.js';

const logger = createModuleLogger('rate-limiter');

/**
 * Default rate limiter for general API endpoints
 */
export const defaultRateLimiter = rateLimit({
  windowMs: config.rateLimitWindowMs, // Default: 1 minute
  max: config.rateLimitRequests, // Default: 100 requests per window
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    error: 'Too many requests, please try again later.',
  },
  handler: (req, res, next, options) => {
    logger.warn('Rate limit exceeded', {
      ip: req.ip,
      path: req.path,
      limit: options.max,
    });
    res.status(429).json(options.message);
  },
});

/**
 * Strict rate limiter for ingestion endpoints (admin)
 */
export const ingestionRateLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 10, // 10 ingestion runs per hour
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    error: 'Ingestion rate limit exceeded. Max 10 runs per hour.',
  },
  handler: (req, res, next, options) => {
    logger.warn('Ingestion rate limit exceeded', { ip: req.ip });
    res.status(429).json(options.message);
  },
});

/**
 * Lenient rate limiter for search endpoints
 */
export const searchRateLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: 60, // 60 searches per minute
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    error: 'Search rate limit exceeded. Please slow down.',
  },
});

/**
 * Very strict rate limiter for embedding generation
 */
export const embeddingRateLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 5, // 5 embedding batch runs per hour
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    error: 'Embedding generation rate limit exceeded.',
  },
});

/**
 * Create a custom rate limiter
 */
export function createRateLimiter(options: {
  windowMs: number;
  max: number;
  message?: string;
}) {
  return rateLimit({
    windowMs: options.windowMs,
    max: options.max,
    standardHeaders: true,
    legacyHeaders: false,
    message: {
      success: false,
      error: options.message || 'Rate limit exceeded.',
    },
  });
}
