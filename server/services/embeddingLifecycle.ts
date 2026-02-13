/**
 * Embedding Lifecycle Service
 * Handles continuous embedding refresh for content and users
 */

import { generateEmbedding, generateBatchEmbeddings } from './embeddingService';
import { logger } from '../utils/logger';

export async function refreshContentEmbedding(contentId: string, content: string) {
  logger.info({ event: 'embedding_refresh', contentId, timestamp: new Date().toISOString() });
  const embedding = await generateEmbedding(content);
  // Save embedding to DB (pseudo-code)
  // await saveEmbedding(contentId, embedding);
  return embedding;
}

export async function refreshUserEmbedding(userId: string, userVector: string) {
  logger.info({ event: 'user_embedding_refresh', userId, timestamp: new Date().toISOString() });
  const embedding = await generateEmbedding(userVector);
  // Save embedding to DB (pseudo-code)
  // await saveUserEmbedding(userId, embedding);
  return embedding;
}

export async function batchRefreshEmbeddings(items: Array<{ id: string; text: string }>) {
  logger.info({ event: 'batch_embedding_refresh', count: items.length, timestamp: new Date().toISOString() });
  const embeddings = await generateBatchEmbeddings(items.map(i => ({ id: i.id, text: i.text })));
  // Save batch embeddings to DB (pseudo-code)
  // await saveBatchEmbeddings(embeddings);
  return embeddings;
}

// Add triggers for content edit, user behavior change, model upgrade as needed
