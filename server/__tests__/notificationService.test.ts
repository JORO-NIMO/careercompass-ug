/**
 * Unit tests for Notification Service
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { matchesCriteria, type SubscriptionCriteria } from '../services/notificationService.js';
import type { Opportunity } from '../types/index.js';

describe('Notification Service', () => {
  describe('matchesCriteria', () => {
    let baseOpportunity: Opportunity;

    beforeEach(() => {
      baseOpportunity = {
        id: 'test-id',
        title: 'Software Engineering Internship at Google',
        description: 'Exciting internship opportunity for computer science students',
        url: 'https://example.com/job',
        type: 'internship',
        field: 'Technology',
        country: 'United States',
        organization: 'Google',
        source_url: 'https://rss.example.com',
        published_at: new Date().toISOString(),
      };
    });

    describe('type filtering', () => {
      it('should match when type is in criteria', () => {
        const criteria: SubscriptionCriteria = {
          types: ['internship', 'job'],
        };
        expect(matchesCriteria(baseOpportunity, criteria)).toBe(true);
      });

      it('should not match when type is not in criteria', () => {
        const criteria: SubscriptionCriteria = {
          types: ['scholarship', 'conference'],
        };
        expect(matchesCriteria(baseOpportunity, criteria)).toBe(false);
      });

      it('should match when no type filter specified', () => {
        const criteria: SubscriptionCriteria = {};
        expect(matchesCriteria(baseOpportunity, criteria)).toBe(true);
      });

      it('should not match when opportunity has no type', () => {
        const criteria: SubscriptionCriteria = { types: ['internship'] };
        const noTypeOpp = { ...baseOpportunity, type: undefined };
        expect(matchesCriteria(noTypeOpp, criteria)).toBe(false);
      });
    });

    describe('field filtering', () => {
      it('should match when field matches criteria', () => {
        const criteria: SubscriptionCriteria = {
          fields: ['Technology', 'Engineering'],
        };
        expect(matchesCriteria(baseOpportunity, criteria)).toBe(true);
      });

      it('should match case-insensitively', () => {
        const criteria: SubscriptionCriteria = {
          fields: ['technology'],
        };
        expect(matchesCriteria(baseOpportunity, criteria)).toBe(true);
      });

      it('should not match when field does not match', () => {
        const criteria: SubscriptionCriteria = {
          fields: ['Healthcare', 'Finance'],
        };
        expect(matchesCriteria(baseOpportunity, criteria)).toBe(false);
      });

      it('should not match when opportunity has no field', () => {
        const criteria: SubscriptionCriteria = { fields: ['Technology'] };
        const noFieldOpp = { ...baseOpportunity, field: undefined };
        expect(matchesCriteria(noFieldOpp, criteria)).toBe(false);
      });
    });

    describe('country filtering', () => {
      it('should match when country matches criteria', () => {
        const criteria: SubscriptionCriteria = {
          countries: ['United States', 'Canada'],
        };
        expect(matchesCriteria(baseOpportunity, criteria)).toBe(true);
      });

      it('should match case-insensitively', () => {
        const criteria: SubscriptionCriteria = {
          countries: ['united states'],
        };
        expect(matchesCriteria(baseOpportunity, criteria)).toBe(true);
      });

      it('should match global for any opportunity', () => {
        const criteria: SubscriptionCriteria = {
          countries: ['Global'],
        };
        expect(matchesCriteria(baseOpportunity, criteria)).toBe(true);
      });

      it('should not match when country does not match', () => {
        const criteria: SubscriptionCriteria = {
          countries: ['Germany', 'France'],
        };
        expect(matchesCriteria(baseOpportunity, criteria)).toBe(false);
      });
    });

    describe('keyword filtering', () => {
      it('should match when keyword found in title', () => {
        const criteria: SubscriptionCriteria = {
          keywords: ['Engineering', 'Development'],
        };
        expect(matchesCriteria(baseOpportunity, criteria)).toBe(true);
      });

      it('should match when keyword found in description', () => {
        const criteria: SubscriptionCriteria = {
          keywords: ['computer science'],
        };
        expect(matchesCriteria(baseOpportunity, criteria)).toBe(true);
      });

      it('should match when keyword found in organization', () => {
        const criteria: SubscriptionCriteria = {
          keywords: ['Google'],
        };
        expect(matchesCriteria(baseOpportunity, criteria)).toBe(true);
      });

      it('should not match when no keywords match', () => {
        const criteria: SubscriptionCriteria = {
          keywords: ['healthcare', 'nursing'],
        };
        expect(matchesCriteria(baseOpportunity, criteria)).toBe(false);
      });

      it('should match case-insensitively', () => {
        const criteria: SubscriptionCriteria = {
          keywords: ['GOOGLE', 'INTERNSHIP'],
        };
        expect(matchesCriteria(baseOpportunity, criteria)).toBe(true);
      });
    });

    describe('combined filtering', () => {
      it('should match when all criteria match', () => {
        const criteria: SubscriptionCriteria = {
          types: ['internship'],
          fields: ['Technology'],
          countries: ['United States'],
          keywords: ['Google'],
        };
        expect(matchesCriteria(baseOpportunity, criteria)).toBe(true);
      });

      it('should not match when any criteria fails', () => {
        const criteria: SubscriptionCriteria = {
          types: ['internship'],      // matches
          fields: ['Technology'],     // matches
          countries: ['Germany'],     // does not match
          keywords: ['Google'],       // matches
        };
        expect(matchesCriteria(baseOpportunity, criteria)).toBe(false);
      });

      it('should match empty criteria', () => {
        const criteria: SubscriptionCriteria = {};
        expect(matchesCriteria(baseOpportunity, criteria)).toBe(true);
      });

      it('should match criteria with empty arrays', () => {
        const criteria: SubscriptionCriteria = {
          types: [],
          fields: [],
          countries: [],
          keywords: [],
        };
        expect(matchesCriteria(baseOpportunity, criteria)).toBe(true);
      });
    });
  });
});
