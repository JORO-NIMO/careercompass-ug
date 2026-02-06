/**
 * Opportunity Classifier
 * Classifies opportunities by type, field, and country using keyword matching
 */

import countryListModule from 'country-list';
import { 
  TYPE_KEYWORDS, 
  FIELD_KEYWORDS, 
  COUNTRY_PATTERNS 
} from '../config/index.js';
import type { 
  OpportunityType, 
  OpportunityField, 
  ClassificationResult 
} from '../types/index.js';
import { createModuleLogger } from '../utils/logger.js';

const logger = createModuleLogger('classifier');

// Get all country names for matching (handle both ESM and CJS)
const countries = countryListModule.getNames?.() 
  || (countryListModule as any).default?.getNames?.() 
  || [];
const countryNames = Array.isArray(countries) ? countries : Object.values(countries);

/**
 * Classify opportunity type based on keywords
 */
export function classifyType(
  title: string,
  description: string
): { type: OpportunityType | null; confidence: number } {
  
  let bestMatch: OpportunityType | null = null;
  let bestScore = 0;
  
  for (const [type, keywords] of Object.entries(TYPE_KEYWORDS)) {
    let score = 0;
    let titleMatches = 0;
    let descMatches = 0;
    
    for (const keyword of keywords) {
      // Title matches are worth more
      if (title.toLowerCase().includes(keyword)) {
        titleMatches++;
        score += 3;
      }
      // Description matches
      if (description.toLowerCase().includes(keyword)) {
        descMatches++;
        score += 1;
      }
    }
    
    // Bonus for multiple matches
    if (titleMatches > 0 && descMatches > 0) {
      score += 2;
    }
    
    if (score > bestScore) {
      bestScore = score;
      bestMatch = type as OpportunityType;
    }
  }
  
  // Calculate confidence (0-1)
  const confidence = Math.min(bestScore / 10, 1);
  
  // Only return if confidence is reasonable
  if (confidence < 0.2) {
    return { type: 'other', confidence: 0.5 };
  }
  
  return { type: bestMatch, confidence };
}

/**
 * Classify opportunity field/sector based on keywords
 */
export function classifyField(
  title: string,
  description: string
): { field: OpportunityField | null; confidence: number } {
  
  let bestMatch: OpportunityField | null = null;
  let bestScore = 0;
  
  for (const [field, keywords] of Object.entries(FIELD_KEYWORDS)) {
    let score = 0;
    
    for (const keyword of keywords) {
      // Check for whole word match to avoid false positives
      const regex = new RegExp(`\\b${keyword.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\b`, 'i');
      
      // Title matches are worth more
      if (regex.test(title)) {
        score += 3;
      }
      // Description matches
      if (regex.test(description)) {
        score += 1;
      }
    }
    
    if (score > bestScore) {
      bestScore = score;
      bestMatch = field as OpportunityField;
    }
  }
  
  // Calculate confidence (0-1)
  const confidence = Math.min(bestScore / 8, 1);
  
  // Only return if confidence is reasonable
  if (confidence < 0.15) {
    return { field: 'General', confidence: 0.5 };
  }
  
  return { field: bestMatch, confidence };
}

/**
 * Detect country or region from text
 */
export function detectCountry(
  title: string,
  description: string
): { country: string | null; confidence: number } {
  const text = `${title} ${description}`.toLowerCase();
  
  // First check our predefined patterns (includes Global, Remote, regions)
  for (const [country, patterns] of Object.entries(COUNTRY_PATTERNS)) {
    for (const pattern of patterns) {
      const regex = new RegExp(`\\b${pattern.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\b`, 'i');
      if (regex.test(text)) {
        // Higher confidence for title matches
        const confidence = regex.test(title.toLowerCase()) ? 0.9 : 0.7;
        return { country, confidence };
      }
    }
  }
  
  // Check against full country list
  for (const countryName of countryNames) {
    if (countryName.length < 4) continue; // Skip very short names to avoid false matches
    
    const regex = new RegExp(`\\b${countryName.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\b`, 'i');
    if (regex.test(text)) {
      const confidence = regex.test(title.toLowerCase()) ? 0.85 : 0.65;
      return { country: countryName, confidence };
    }
  }
  
  // Default to Global if no specific country found
  return { country: 'Global', confidence: 0.5 };
}

/**
 * Full classification of an opportunity
 */
export function classifyOpportunity(
  title: string,
  description: string
): ClassificationResult {
  const typeResult = classifyType(title, description);
  const fieldResult = classifyField(title, description);
  const countryResult = detectCountry(title, description);
  
  // Overall confidence is weighted average
  const confidence = (
    typeResult.confidence * 0.4 +
    fieldResult.confidence * 0.3 +
    countryResult.confidence * 0.3
  );
  
  logger.debug('Classification result', {
    title: title.substring(0, 50),
    type: typeResult.type,
    field: fieldResult.field,
    country: countryResult.country,
    confidence,
  });
  
  return {
    type: typeResult.type,
    field: fieldResult.field,
    country: countryResult.country,
    confidence,
  };
}

/**
 * Batch classify multiple opportunities
 */
export function batchClassify(
  items: Array<{ title: string; description: string }>
): ClassificationResult[] {
  return items.map(item => classifyOpportunity(item.title, item.description));
}
