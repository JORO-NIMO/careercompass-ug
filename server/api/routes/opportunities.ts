/**
 * Opportunities Routes
 * REST API endpoints for opportunities search and retrieval
 */

import { Router, Request, Response } from 'express';
import { z } from 'zod';
import { 
  searchOpportunities, 
  getOpportunitiesStats 
} from '../../services/database.js';
import { smartSearch, searchForChat, parseSearchIntent } from '../../services/searchService.js';
import type { OpportunityType } from '../../types/index.js';
import { createModuleLogger } from '../../utils/logger.js';
import { searchRateLimiter } from '../../utils/rateLimiter.js';
import { 
  withCache, 
  generateCacheKey, 
  CACHE_TTL,
  isCacheAvailable,
} from '../../utils/cache.js';

const logger = createModuleLogger('opportunities-api');

const router = Router();

// Validation schemas
const SearchQuerySchema = z.object({
  query: z.string().optional(),
  keyword: z.string().optional(), // Alias for query
  type: z.enum(['job', 'internship', 'scholarship', 'fellowship', 'training', 'grant', 'competition', 'volunteer', 'conference', 'other']).optional(),
  field: z.string().optional(),
  country: z.string().optional(),
  limit: z.coerce.number().min(1).max(100).default(20),
  offset: z.coerce.number().min(0).default(0),
});

/**
 * GET /opportunities
 * List opportunities with optional filters
 */
router.get('/', async (req: Request, res: Response) => {
  try {
    const parsed = SearchQuerySchema.safeParse(req.query);
    
    if (!parsed.success) {
      return res.status(400).json({
        success: false,
        error: 'Invalid query parameters',
        details: parsed.error.errors,
      });
    }
    
    const { query, keyword, type, field, country, limit, offset } = parsed.data;
    
    const results = await searchOpportunities({
      query: query || keyword,
      type: type as OpportunityType,
      field,
      country,
      limit,
      offset,
    });
    
    res.json({
      success: true,
      data: results,
      meta: {
        count: results.length,
        limit,
        offset,
      },
    });
  } catch (err) {
    logger.error('Failed to list opportunities', { error: err });
    res.status(500).json({
      success: false,
      error: 'Failed to fetch opportunities',
    });
  }
});

/**
 * GET /opportunities/search
 * Advanced search endpoint with AI-powered semantic search
 */
router.get('/search', searchRateLimiter, async (req: Request, res: Response) => {
  try {
    const parsed = SearchQuerySchema.safeParse(req.query);
    
    if (!parsed.success) {
      return res.status(400).json({
        success: false,
        error: 'Invalid query parameters',
        details: parsed.error.errors,
      });
    }
    
    const { query, keyword, type, field, country, limit, offset } = parsed.data;
    const searchQuery = query || keyword || '';
    
    // Generate cache key
    const cacheKey = generateCacheKey('search', { 
      q: searchQuery, type, field, country, limit, offset 
    });
    
    // Use cache if available
    const results = await withCache(
      cacheKey,
      CACHE_TTL.SEARCH_RESULTS,
      () => smartSearch({
        query: searchQuery,
        type: type as OpportunityType,
        field,
        country,
        limit,
        offset,
      })
    );
    
    // Parse intent for additional context
    const intent = searchQuery ? parseSearchIntent(searchQuery) : null;
    
    res.json({
      success: true,
      data: results,
      meta: {
        count: results.length,
        limit,
        cached: isCacheAvailable(),
        offset,
        query: searchQuery,
        detectedFilters: intent ? {
          type: intent.type,
          field: intent.field,
          country: intent.country,
        } : null,
      },
    });
  } catch (err) {
    logger.error('Search failed', { error: err });
    res.status(500).json({
      success: false,
      error: 'Search failed',
    });
  }
});

/**
 * POST /opportunities/chat-search
 * AI chat-oriented search endpoint
 */
router.post('/chat-search', async (req: Request, res: Response) => {
  try {
    const { query, type, field, country, limit } = req.body;
    
    if (!query || typeof query !== 'string') {
      return res.status(400).json({
        success: false,
        error: 'Query is required',
      });
    }
    
    const { results, formattedResponse, intent } = await searchForChat(query, {
      type,
      field,
      country,
      limit,
    });
    
    res.json({
      success: true,
      data: {
        results,
        formattedResponse,
        intent,
      },
    });
  } catch (err) {
    logger.error('Chat search failed', { error: err });
    res.status(500).json({
      success: false,
      error: 'Chat search failed',
    });
  }
});

/**
 * GET /opportunities/stats
 * Get statistics about opportunities
 */
router.get('/stats', async (req: Request, res: Response) => {
  try {
    const stats = await getOpportunitiesStats();
    
    res.json({
      success: true,
      data: stats,
    });
  } catch (err) {
    logger.error('Failed to get stats', { error: err });
    res.status(500).json({
      success: false,
      error: 'Failed to get statistics',
    });
  }
});

/**
 * GET /opportunities/types
 * Get list of valid opportunity types
 */
router.get('/types', (req: Request, res: Response) => {
  res.json({
    success: true,
    data: [
      { value: 'job', label: 'Job' },
      { value: 'internship', label: 'Internship' },
      { value: 'scholarship', label: 'Scholarship' },
      { value: 'fellowship', label: 'Fellowship' },
      { value: 'training', label: 'Training' },
      { value: 'grant', label: 'Grant' },
      { value: 'competition', label: 'Competition' },
      { value: 'volunteer', label: 'Volunteer' },
      { value: 'conference', label: 'Conference' },
    ],
  });
});

/**
 * GET /opportunities/fields
 * Get list of valid fields/sectors
 */
router.get('/fields', (req: Request, res: Response) => {
  res.json({
    success: true,
    data: [
      { value: 'ICT / Technology', label: 'ICT / Technology' },
      { value: 'Engineering', label: 'Engineering' },
      { value: 'Business', label: 'Business' },
      { value: 'Health', label: 'Health' },
      { value: 'Agriculture', label: 'Agriculture' },
      { value: 'Education', label: 'Education' },
      { value: 'Development / NGO', label: 'Development / NGO' },
      { value: 'Finance', label: 'Finance' },
      { value: 'Law', label: 'Law' },
      { value: 'Media / Communications', label: 'Media / Communications' },
      { value: 'Arts / Creative', label: 'Arts / Creative' },
      { value: 'Science / Research', label: 'Science / Research' },
      { value: 'Environment', label: 'Environment' },
      { value: 'Government / Policy', label: 'Government / Policy' },
      { value: 'General', label: 'General' },
    ],
  });
});

export default router;
