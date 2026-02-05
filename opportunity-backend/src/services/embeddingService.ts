/**
 * Embedding Service
 * Generates vector embeddings for opportunities using OpenAI
 */

import OpenAI from 'openai';
import { config } from '../config/index.js';
import type { EmbeddingRequest, EmbeddingResponse, Opportunity } from '../types/index.js';
import { createModuleLogger } from '../utils/logger.js';

const logger = createModuleLogger('embeddings');

// OpenAI client
let openaiClient: OpenAI | null = null;

/**
 * Get or create OpenAI client
 */
function getOpenAIClient(): OpenAI | null {
  if (!config.openaiApiKey) {
    logger.warn('OpenAI API key not configured - embeddings will be skipped');
    return null;
  }
  
  if (!openaiClient) {
    openaiClient = new OpenAI({
      apiKey: config.openaiApiKey,
    });
    logger.info('OpenAI client initialized');
  }
  
  return openaiClient;
}

/**
 * Generate embedding text from opportunity data
 * Combines relevant fields for better semantic understanding
 */
export function generateEmbeddingText(opportunity: Opportunity): string {
  const parts = [
    opportunity.title,
    opportunity.organization,
    opportunity.type,
    opportunity.field,
    opportunity.country,
    opportunity.description?.substring(0, 2000), // Limit description length
  ].filter(Boolean);
  
  return parts.join(' | ');
}

/**
 * Generate embedding for a single text
 */
export async function generateEmbedding(text: string): Promise<number[] | null> {
  const client = getOpenAIClient();
  if (!client) return null;
  
  try {
    const response = await client.embeddings.create({
      model: 'text-embedding-3-small', // 1536 dimensions
      input: text,
      encoding_format: 'float',
    });
    
    return response.data[0].embedding;
  } catch (err) {
    logger.error('Failed to generate embedding', { 
      error: err instanceof Error ? err.message : 'Unknown error',
      textLength: text.length,
    });
    return null;
  }
}

/**
 * Generate embeddings for multiple texts in batch
 */
export async function generateBatchEmbeddings(
  requests: EmbeddingRequest[]
): Promise<EmbeddingResponse[]> {
  const client = getOpenAIClient();
  if (!client) return [];
  
  if (requests.length === 0) return [];
  
  try {
    // OpenAI supports batch embedding
    const response = await client.embeddings.create({
      model: 'text-embedding-3-small',
      input: requests.map(r => r.text),
      encoding_format: 'float',
    });
    
    return response.data.map((item, index) => ({
      id: requests[index].id,
      embedding: item.embedding,
    }));
  } catch (err) {
    logger.error('Failed to generate batch embeddings', {
      error: err instanceof Error ? err.message : 'Unknown error',
      batchSize: requests.length,
    });
    return [];
  }
}

/**
 * Generate embeddings for multiple opportunities
 * Processes in batches to respect API limits
 */
export async function generateOpportunityEmbeddings(
  opportunities: Opportunity[],
  batchSize: number = 50
): Promise<Map<string, number[]>> {
  const embeddings = new Map<string, number[]>();
  const client = getOpenAIClient();
  
  if (!client) {
    logger.warn('Skipping embeddings - OpenAI not configured');
    return embeddings;
  }
  
  logger.info(`Generating embeddings for ${opportunities.length} opportunities`);
  
  // Process in batches
  for (let i = 0; i < opportunities.length; i += batchSize) {
    const batch = opportunities.slice(i, i + batchSize);
    
    const requests: EmbeddingRequest[] = batch
      .filter(opp => opp.id) // Only process opportunities with IDs
      .map(opp => ({
        id: opp.id!,
        text: generateEmbeddingText(opp),
      }));
    
    if (requests.length === 0) continue;
    
    try {
      const response = await client.embeddings.create({
        model: 'text-embedding-3-small',
        input: requests.map(r => r.text),
        encoding_format: 'float',
      });
      
      response.data.forEach((item, index) => {
        embeddings.set(requests[index].id, item.embedding);
      });
      
      logger.debug(`Generated ${response.data.length} embeddings (batch ${Math.floor(i / batchSize) + 1})`);
      
      // Rate limiting: small delay between batches
      if (i + batchSize < opportunities.length) {
        await new Promise(resolve => setTimeout(resolve, 200));
      }
    } catch (err) {
      logger.error('Failed to generate embeddings batch', {
        error: err instanceof Error ? err.message : 'Unknown error',
        batchStart: i,
        batchSize: requests.length,
      });
    }
  }
  
  logger.info(`Generated ${embeddings.size} embeddings total`);
  return embeddings;
}

/**
 * Generate embedding for user query (for semantic search)
 */
export async function generateQueryEmbedding(query: string): Promise<number[] | null> {
  return generateEmbedding(query);
}

/**
 * Check if embedding service is available
 */
export function isEmbeddingServiceAvailable(): boolean {
  return !!config.openaiApiKey;
}
