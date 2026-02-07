/**
 * Unit tests for Cache utility
 */

import { describe, it, expect } from 'vitest';
import { generateCacheKey, CACHE_TTL } from '../utils/cache.js';

// Note: Full redis tests would require mocking or integration tests
// These tests cover the pure utility functions

describe('Cache Utility', () => {
  describe('generateCacheKey', () => {
    it('should generate consistent keys for same params', () => {
      const params = { query: 'test', type: 'job', limit: 10 };
      const key1 = generateCacheKey('search', params);
      const key2 = generateCacheKey('search', params);
      expect(key1).toBe(key2);
    });

    it('should generate different keys for different params', () => {
      const key1 = generateCacheKey('search', { query: 'test1' });
      const key2 = generateCacheKey('search', { query: 'test2' });
      expect(key1).not.toBe(key2);
    });

    it('should ignore undefined and null values', () => {
      const key1 = generateCacheKey('search', { query: 'test', type: undefined });
      const key2 = generateCacheKey('search', { query: 'test', type: null });
      const key3 = generateCacheKey('search', { query: 'test' });
      expect(key1).toBe(key2);
      expect(key2).toBe(key3);
    });

    it('should sort parameters for consistency', () => {
      const key1 = generateCacheKey('search', { a: '1', b: '2', c: '3' });
      const key2 = generateCacheKey('search', { c: '3', a: '1', b: '2' });
      expect(key1).toBe(key2);
    });

    it('should include prefix in key', () => {
      const key = generateCacheKey('search', { query: 'test' });
      expect(key).toContain('opp:search:');
    });

    it('should handle empty params', () => {
      const key = generateCacheKey('prefix', {});
      expect(key).toBe('opp:prefix:default');
    });
  });

  describe('CACHE_TTL', () => {
    it('should have expected TTL values', () => {
      expect(CACHE_TTL.SEARCH_RESULTS).toBe(5 * 60); // 5 minutes
      expect(CACHE_TTL.OPPORTUNITY_STATS).toBe(10 * 60); // 10 minutes
      expect(CACHE_TTL.RSS_SOURCES).toBe(30 * 60); // 30 minutes
      expect(CACHE_TTL.OPPORTUNITY_DETAIL).toBe(15 * 60); // 15 minutes
      expect(CACHE_TTL.EMBEDDINGS).toBe(60 * 60); // 1 hour
    });

    it('should have sensible relative values', () => {
      // Search results should expire faster than embeddings
      expect(CACHE_TTL.SEARCH_RESULTS).toBeLessThan(CACHE_TTL.EMBEDDINGS);
      // Stats can be cached longer than search results
      expect(CACHE_TTL.OPPORTUNITY_STATS).toBeGreaterThan(CACHE_TTL.SEARCH_RESULTS);
    });
  });
});
