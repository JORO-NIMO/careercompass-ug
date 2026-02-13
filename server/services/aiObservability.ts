/**
 * AI Observability Service
 * Logs AI prompts, responses, latency, token usage, errors, and user feedback
 */

import { logger } from '../utils/logger';

export interface AIInteractionLog {
  userId: string;
  feature: string;
  model: string;
  prompt: string;
  response: string;
  latencyMs: number;
  tokensUsed?: number;
  error?: string;
  feedback?: 'up' | 'down' | 'retry' | 'abandon';
  timestamp: string;
}

export function logAIInteraction(log: AIInteractionLog) {
  logger.info({
    ...log,
    event: 'ai_interaction',
  });
}

export function logAIError(userId: string, feature: string, model: string, error: string) {
  logger.error({
    userId,
    feature,
    model,
    error,
    event: 'ai_error',
    timestamp: new Date().toISOString(),
  });
}

// Example: logAIInteraction({ userId, feature, model, prompt, response, latencyMs, tokensUsed, feedback, timestamp })
