/**
 * Unit tests for Classifier
 */

import { describe, it, expect } from 'vitest';
import {
  classifyOpportunity,
  detectCountry,
  classifyType,
  classifyField,
} from '../services/classifier.js';

describe('Classifier', () => {
  describe('classifyType', () => {
    it('should detect scholarship type', () => {
      const result = classifyType('Full Scholarship for Graduate Students', '');
      expect(result.type).toBe('scholarship');
    });

    it('should detect internship type', () => {
      const result = classifyType('Summer Internship at Google', '');
      expect(result.type).toBe('internship');
    });

    it('should detect job type', () => {
      const result = classifyType('Software Engineer Position', 'We are hiring engineers');
      expect(result.type).toBe('job');
    });

    it('should detect conference/event type', () => {
      const result = classifyType('Annual Tech Conference 2025', 'Join the summit');
      expect(result.type).toBe('conference');
    });

    it('should detect competition type', () => {
      const result = classifyType('Hackathon for Students', 'Join the challenge');
      expect(result.type).toBe('competition');
    });

    it('should return other for unknown types', () => {
      const result = classifyType('Random news article', '');
      // Classifier returns 'other' as default type
      expect(result.type === null || result.type === 'other').toBe(true);
    });
  });

  describe('detectCountry', () => {
    it('should detect country from text', () => {
      const result = detectCountry('Study in Germany at top universities');
      expect(result.country?.toLowerCase()).toContain('germany');
    });

    it('should detect Uganda', () => {
      const result = detectCountry('Jobs available in Kampala, Uganda');
      expect(result.country?.toLowerCase()).toContain('uganda');
    });

    it('should return global for generic text', () => {
      const result = detectCountry('International scholarship open worldwide');
      expect(result.country?.toLowerCase()).toBe('global');
    });
  });

  describe('classifyField', () => {
    it('should extract technology field', () => {
      const result = classifyField('Software Development Internship in AI/ML');
      expect(result.field?.toLowerCase()).toMatch(/technology|engineering|computer/i);
    });

    it('should extract healthcare field', () => {
      const result = classifyField('Nursing scholarship for medical students');
      expect(result.field?.toLowerCase()).toMatch(/health|medicine/i);
    });

    it('should extract business field', () => {
      const result = classifyField('MBA Fellowship in Finance and Banking');
      expect(result.field?.toLowerCase()).toMatch(/business|finance/i);
    });

    it('should handle generic text', () => {
      const result = classifyField('Something for everyone interested');
      // May return null or a field if keywords match
      expect(result.field === null || typeof result.field === 'string').toBe(true);
    });
  });

  describe('classifyOpportunity', () => {
    it('should return full classification object', () => {
      const result = classifyOpportunity(
        'Full Scholarship for Computer Science Students in Germany',
        'Apply by 2025-06-30. Full funding for master degree.'
      );

      expect(result).toHaveProperty('type');
      expect(result).toHaveProperty('country');
      expect(result).toHaveProperty('field');
      expect(result.type).toBe('scholarship');
    });

    it('should handle empty description', () => {
      const result = classifyOpportunity('Internship at Microsoft', '');
      expect(result).toHaveProperty('type');
      expect(result.type).toBe('internship');
    });
  });
});
