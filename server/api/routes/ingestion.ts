/**
 * Ingestion Routes
 * API endpoints for RSS feed ingestion management
 */

import { Router, Request, Response } from 'express';
import { z } from 'zod';
import { 
  runFullIngestion, 
  processRssUrl, 
  generateEmbeddingsForNew 
} from '../../services/ingestion.js';
import { 
  getActiveRssSources, 
  addRssSource 
} from '../../services/database.js';
import { validateRssFeed, getFeedMetadata } from '../../services/rssFetcher.js';
import { createModuleLogger } from '../../utils/logger.js';
import {
  ingestionRateLimiter,
  embeddingRateLimiter,
} from '../../utils/rateLimiter.js';

const logger = createModuleLogger('ingestion-api');

const router = Router();

// Apply ingestion rate limiter to all routes in this router
router.use(ingestionRateLimiter);

const logger = createModuleLogger('ingestion-api');

const router = Router();

// Simple API key auth middleware (for admin endpoints)
const authMiddleware = (req: Request, res: Response, next: Function) => {
  const apiKey = req.headers['x-api-key'] || req.query.apiKey;
  const expectedKey = process.env.ADMIN_API_KEY;
  
  if (!expectedKey) {
    // If no key configured, allow in development
    if (process.env.NODE_ENV === 'development') {
      return next();
    }
    return res.status(500).json({
      success: false,
      error: 'Server not configured for admin access',
    });
  }
  
  if (apiKey !== expectedKey) {
    return res.status(401).json({
      success: false,
      error: 'Unauthorized',
    });
  }
  
  next();
};

/**
 * POST /ingestion/run
 * Trigger a full ingestion run
 */
router.post('/run', authMiddleware, async (req: Request, res: Response) => {
  try {
    logger.info('Manual ingestion triggered via API');
    
    // Run ingestion (may take a while)
    const result = await runFullIngestion();
    
    res.json({
      success: true,
      data: {
        sourcesProcessed: result.results.length,
        totalInserted: result.totalInserted,
        totalSkipped: result.totalSkipped,
        totalFailed: result.totalFailed,
        embeddingsGenerated: result.embeddingsGenerated,
        results: result.results,
      },
    });
  } catch (err) {
    logger.error('Ingestion run failed', { error: err });
    res.status(500).json({
      success: false,
      error: 'Ingestion run failed',
      details: err instanceof Error ? err.message : 'Unknown error',
    });
  }
});

/**
 * POST /ingestion/feed
 * Process a single RSS feed URL
 */
router.post('/feed', authMiddleware, async (req: Request, res: Response) => {
  try {
    const schema = z.object({
      url: z.string().url(),
      name: z.string().optional(),
    });
    
    const parsed = schema.safeParse(req.body);
    
    if (!parsed.success) {
      return res.status(400).json({
        success: false,
        error: 'Invalid request body',
        details: parsed.error.errors,
      });
    }
    
    const { url, name } = parsed.data;
    
    logger.info('Processing single feed', { url, name });
    
    const result = await processRssUrl(url, name);
    
    res.json({
      success: true,
      data: result,
    });
  } catch (err) {
    logger.error('Feed processing failed', { error: err });
    res.status(500).json({
      success: false,
      error: 'Feed processing failed',
    });
  }
});

/**
 * POST /ingestion/embeddings
 * Generate embeddings for opportunities without them
 */
router.post('/embeddings', authMiddleware, async (req: Request, res: Response) => {
  try {
    const limit = req.body.limit || 200;
    
    logger.info('Generating embeddings via API', { limit });
    
    const count = await generateEmbeddingsForNew(limit);
    
    res.json({
      success: true,
      data: {
        embeddingsGenerated: count,
      },
    });
  } catch (err) {
    logger.error('Embedding generation failed', { error: err });
    res.status(500).json({
      success: false,
      error: 'Embedding generation failed',
    });
  }
});

/**
 * GET /ingestion/sources
 * List all RSS sources
 */
router.get('/sources', async (req: Request, res: Response) => {
  try {
    const sources = await getActiveRssSources();
    
    res.json({
      success: true,
      data: sources,
      meta: {
        count: sources.length,
      },
    });
  } catch (err) {
    logger.error('Failed to fetch sources', { error: err });
    res.status(500).json({
      success: false,
      error: 'Failed to fetch sources',
    });
  }
});

/**
 * POST /ingestion/sources
 * Add a new RSS source
 */
router.post('/sources', authMiddleware, async (req: Request, res: Response) => {
  try {
    const schema = z.object({
      name: z.string().min(1),
      url: z.string().url(),
      is_active: z.boolean().default(true),
    });
    
    const parsed = schema.safeParse(req.body);
    
    if (!parsed.success) {
      return res.status(400).json({
        success: false,
        error: 'Invalid request body',
        details: parsed.error.errors,
      });
    }
    
    const { name, url, is_active } = parsed.data;
    
    // Validate the feed first
    const validation = await validateRssFeed(url);
    
    if (!validation.valid) {
      return res.status(400).json({
        success: false,
        error: 'Invalid RSS feed',
        details: validation.error,
      });
    }
    
    // Add the source
    const source = await addRssSource({ name, url, is_active });
    
    logger.info('Added new RSS source', { name, url });
    
    res.status(201).json({
      success: true,
      data: source,
      meta: {
        feedTitle: validation.feedTitle,
        itemCount: validation.itemCount,
      },
    });
  } catch (err) {
    logger.error('Failed to add source', { error: err });
    
    // Check for duplicate
    if (err && (err as any).code === '23505') {
      return res.status(409).json({
        success: false,
        error: 'RSS source with this URL already exists',
      });
    }
    
    res.status(500).json({
      success: false,
      error: 'Failed to add source',
    });
  }
});

/**
 * POST /ingestion/validate
 * Validate an RSS feed URL
 */
router.post('/validate', async (req: Request, res: Response) => {
  try {
    const { url } = req.body;
    
    if (!url || typeof url !== 'string') {
      return res.status(400).json({
        success: false,
        error: 'URL is required',
      });
    }
    
    const validation = await validateRssFeed(url);
    const metadata = validation.valid ? await getFeedMetadata(url) : null;
    
    res.json({
      success: true,
      data: {
        ...validation,
        metadata,
      },
    });
  } catch (err) {
    res.status(500).json({
      success: false,
      error: 'Validation failed',
    });
  }
});

export default router;
