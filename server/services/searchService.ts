/**
 * Search Service
 * Provides semantic and text-based search for opportunities
 * Used by AI chat and API endpoints
 */

import type { 
  SearchParams, 
  OpportunitySearchResult,
  OpportunityType,
} from '../types/index.js';
import { searchOpportunities, semanticSearchOpportunities } from './database.js';
import { generateQueryEmbedding, isEmbeddingServiceAvailable } from './embeddingService.js';
import { createModuleLogger } from '../utils/logger.js';

const logger = createModuleLogger('search');

/**
 * Smart search - uses semantic search when available, falls back to text
 */
export async function smartSearch(
  params: SearchParams
): Promise<OpportunitySearchResult[]> {
  const query = params.query?.trim();
  
  // If no query, just return filtered results
  if (!query) {
    return searchOpportunities(params);
  }
  
  // Try semantic search first
  if (isEmbeddingServiceAvailable()) {
    try {
      const embedding = await generateQueryEmbedding(query);
      
      if (embedding) {
        logger.debug('Using semantic search', { query });
        const results = await semanticSearchOpportunities(embedding, params);
        
        if (results.length > 0) {
          return results;
        }
        // Fall through to text search if no semantic results
      }
    } catch (err) {
      logger.warn('Semantic search failed, falling back to text', {
        error: err instanceof Error ? err.message : 'Unknown error',
      });
    }
  }
  
  // Fall back to text search
  logger.debug('Using text search', { query });
  return searchOpportunities(params);
}

/**
 * Extract search intent from natural language query
 */
export function parseSearchIntent(query: string): {
  keywords: string;
  type?: OpportunityType;
  field?: string;
  country?: string;
} {
  const lowerQuery = query.toLowerCase();
  let type: OpportunityType | undefined;
  let field: string | undefined;
  let country: string | undefined;
  
  // Detect opportunity type
  if (/\b(jobs?|positions?|hiring|vacancy|vacancies|career)\b/i.test(lowerQuery)) {
    type = 'job';
  } else if (/\b(intern(ship)?s?|trainee(ship)?)\b/i.test(lowerQuery)) {
    type = 'internship';
  } else if (/\b(scholarships?|bursary|bursaries|study\s+abroad)\b/i.test(lowerQuery)) {
    type = 'scholarship';
  } else if (/\b(fellow(ship)?s?)\b/i.test(lowerQuery)) {
    type = 'fellowship';
  } else if (/\b(training|workshop|bootcamp|course)\b/i.test(lowerQuery)) {
    type = 'training';
  } else if (/\b(grants?|funding|seed\s+fund)\b/i.test(lowerQuery)) {
    type = 'grant';
  }
  
  // Detect field/sector
  if (/\b(tech(nology)?|software|developer|programming|data|ai|it|ict)\b/i.test(lowerQuery)) {
    field = 'ICT / Technology';
  } else if (/\b(engineer(ing)?|mechanical|electrical|civil)\b/i.test(lowerQuery)) {
    field = 'Engineering';
  } else if (/\b(business|marketing|sales|management|admin)\b/i.test(lowerQuery)) {
    field = 'Business';
  } else if (/\b(health|medical|nursing|clinical|hospital)\b/i.test(lowerQuery)) {
    field = 'Health';
  } else if (/\b(education|teaching|teacher|academic)\b/i.test(lowerQuery)) {
    field = 'Education';
  } else if (/\b(ngo|development|humanitarian|nonprofit)\b/i.test(lowerQuery)) {
    field = 'Development / NGO';
  } else if (/\b(finance|banking|accounting|audit)\b/i.test(lowerQuery)) {
    field = 'Finance';
  }
  
  // Detect country/location - common African countries first
  if (/\b(uganda|kampala|ugandan)\b/i.test(lowerQuery)) {
    country = 'Uganda';
  } else if (/\b(kenya|nairobi|kenyan)\b/i.test(lowerQuery)) {
    country = 'Kenya';
  } else if (/\b(nigeria|lagos|nigerian)\b/i.test(lowerQuery)) {
    country = 'Nigeria';
  } else if (/\b(ghana|accra|ghanaian)\b/i.test(lowerQuery)) {
    country = 'Ghana';
  } else if (/\b(south\s*africa|johannesburg|cape\s*town)\b/i.test(lowerQuery)) {
    country = 'South Africa';
  } else if (/\b(tanzania|dar\s*es\s*salaam)\b/i.test(lowerQuery)) {
    country = 'Tanzania';
  } else if (/\b(rwanda|kigali)\b/i.test(lowerQuery)) {
    country = 'Rwanda';
  } else if (/\b(ethiopia|addis\s*ababa)\b/i.test(lowerQuery)) {
    country = 'Ethiopia';
  } else if (/\b(usa|america|united\s*states)\b/i.test(lowerQuery)) {
    country = 'United States';
  } else if (/\b(uk|united\s*kingdom|britain|london)\b/i.test(lowerQuery)) {
    country = 'United Kingdom';
  } else if (/\b(canada|canadian)\b/i.test(lowerQuery)) {
    country = 'Canada';
  } else if (/\b(germany|german|berlin)\b/i.test(lowerQuery)) {
    country = 'Germany';
  } else if (/\b(remote|virtual|work\s*from\s*home)\b/i.test(lowerQuery)) {
    country = 'Remote';
  } else if (/\b(global|worldwide|international|anywhere)\b/i.test(lowerQuery)) {
    country = 'Global';
  } else if (/\b(africa|african)\b/i.test(lowerQuery)) {
    country = 'Africa';
  } else if (/\b(europe|european)\b/i.test(lowerQuery)) {
    country = 'Europe';
  }
  
  // Clean keywords by removing detected filters
  const keywords = query
    .replace(/\b(find|show|search|get|looking\s+for|interested\s+in)\b/gi, '')
    .replace(/\b(me|please|can\s+you|i\s+want)\b/gi, '')
    .trim();
  
  return { keywords, type, field, country };
}

/**
 * Format search results for AI chat display
 */
export function formatResultsForChat(
  results: OpportunitySearchResult[],
  maxResults: number = 5
): string {
  if (results.length === 0) {
    return 'No opportunities found matching your criteria. Try broadening your search or using different keywords.';
  }
  
  const displayResults = results.slice(0, maxResults);
  
  let response = `Found ${results.length} opportunities. Here are the top ${displayResults.length}:\n\n`;
  
  displayResults.forEach((opp, index) => {
    const similarity = opp.similarity 
      ? ` (${Math.round(opp.similarity * 100)}% match)` 
      : '';
    
    response += `**${index + 1}. ${opp.title}**${similarity}\n`;
    
    if (opp.organization) {
      response += `   🏢 ${opp.organization}\n`;
    }
    
    const details = [];
    if (opp.type) details.push(`📋 ${capitalizeFirst(opp.type)}`);
    if (opp.field) details.push(`🎯 ${opp.field}`);
    if (opp.country) details.push(`📍 ${opp.country}`);
    
    if (details.length > 0) {
      response += `   ${details.join(' | ')}\n`;
    }
    
    if (opp.description) {
      const snippet = opp.description.substring(0, 150);
      response += `   ${snippet}${opp.description.length > 150 ? '...' : ''}\n`;
    }
    
    response += `   🔗 [Read more](${opp.url})\n\n`;
  });
  
  if (results.length > maxResults) {
    response += `_... and ${results.length - maxResults} more opportunities._`;
  }
  
  return response;
}

/**
 * Search and format for AI chat
 */
export async function searchForChat(
  query: string,
  options?: {
    type?: OpportunityType;
    field?: string;
    country?: string;
    limit?: number;
  }
): Promise<{
  results: OpportunitySearchResult[];
  formattedResponse: string;
  intent: ReturnType<typeof parseSearchIntent>;
}> {
  // Parse the query to extract intent
  const intent = parseSearchIntent(query);
  
  // Merge detected intent with explicit options
  const searchParams: SearchParams = {
    query: intent.keywords || query,
    type: options?.type || intent.type,
    field: options?.field || intent.field,
    country: options?.country || intent.country,
    limit: options?.limit || 10,
  };
  
  logger.info('Searching for chat', { 
    originalQuery: query, 
    searchParams,
    detectedIntent: intent,
  });
  
  // Perform search
  const results = await smartSearch(searchParams);
  
  // Format for display
  const formattedResponse = formatResultsForChat(results);
  
  return {
    results,
    formattedResponse,
    intent,
  };
}

/**
 * Get related/similar opportunities
 */
export async function getRelatedOpportunities(
  opportunityId: string,
  limit: number = 5
): Promise<OpportunitySearchResult[]> {
  const { getSupabaseClient } = await import('../utils/supabase.js');
  const supabase = getSupabaseClient();
  
  // Get the opportunity's embedding
  const { data: opp, error } = await supabase
    .from('opportunities')
    .select('embedding, type, field, country')
    .eq('id', opportunityId)
    .single();
  
  if (error || !opp?.embedding) {
    logger.warn('Could not find opportunity or embedding', { opportunityId });
    return [];
  }
  
  // Search for similar opportunities
  return semanticSearchOpportunities(opp.embedding, {
    type: opp.type,
    limit: limit + 1, // Get one extra since we'll filter out the original
  }).then(results => 
    results.filter(r => r.id !== opportunityId).slice(0, limit)
  );
}

// Helper function
function capitalizeFirst(str: string): string {
  return str.charAt(0).toUpperCase() + str.slice(1);
}
