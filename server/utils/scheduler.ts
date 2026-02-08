/**
 * Scheduler Service
 * Automated RSS ingestion and maintenance jobs using node-cron
 * Replaces n8n workflows with internal backend jobs
 */

import cron from 'node-cron';
import { runFullIngestion, generateEmbeddingsForNew } from '../services/ingestion.js';
import { config } from '../config/index.js';
import { createModuleLogger } from '../utils/logger.js';
import { getSupabaseClient } from '../utils/supabase.js';

const logger = createModuleLogger('scheduler');

let ingestionTask: cron.ScheduledTask | null = null;
let embeddingTask: cron.ScheduledTask | null = null;
let cleanupTask: cron.ScheduledTask | null = null;
let chatHistoryCleanupTask: cron.ScheduledTask | null = null;

/**
 * Cleanup old opportunities (older than 90 days and expired)
 */
async function cleanupOldOpportunities(): Promise<void> {
  const supabase = getSupabaseClient();
  
  try {
    // Delete opportunities older than 90 days
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - 90);
    
    const { error, count } = await supabase
      .from('opportunities')
      .delete({ count: 'exact' })
      .lt('created_at', cutoffDate.toISOString());
    
    if (error) {
      logger.error('Failed to cleanup old opportunities', { error: error.message });
    } else {
      logger.info(`Cleaned up ${count || 0} old opportunities`);
    }
  } catch (err) {
    logger.error('Cleanup job failed', {
      error: err instanceof Error ? err.message : 'Unknown error',
    });
  }
}

/**
 * Cleanup old chat messages (keep last 100 per user)
 */
async function cleanupChatHistory(): Promise<void> {
  const supabase = getSupabaseClient();
  
  try {
    // Call RPC to cleanup old chat messages
    const { error } = await supabase.rpc('cleanup_old_chat_messages', {
      p_keep_count: 100,
    });
    
    if (error) {
      // RPC might not exist yet, log but don't fail
      logger.debug('Chat cleanup RPC not available', { error: error.message });
    } else {
      logger.info('Chat history cleanup completed');
    }
  } catch (err) {
    logger.error('Chat history cleanup failed', {
      error: err instanceof Error ? err.message : 'Unknown error',
    });
  }
}

/**
 * Start the scheduled ingestion task
 */
export function startScheduler(): void {
  const intervalHours = config.ingestionIntervalHours;
  
  // Run ingestion every N hours
  const ingestionCron = `0 */${intervalHours} * * *`;
  
  logger.info(`Starting scheduler with ${intervalHours}-hour interval`, {
    cron: ingestionCron,
  });
  
  // Schedule ingestion task
  ingestionTask = cron.schedule(ingestionCron, async () => {
    logger.info('Scheduled ingestion starting...');
    
    try {
      const result = await runFullIngestion();
      
      logger.info('Scheduled ingestion completed', {
        inserted: result.totalInserted,
        skipped: result.totalSkipped,
        failed: result.totalFailed,
        embeddings: result.embeddingsGenerated,
        notifications: result.notificationsQueued,
      });
    } catch (err) {
      logger.error('Scheduled ingestion failed', {
        error: err instanceof Error ? err.message : 'Unknown error',
      });
    }
  }, {
    scheduled: true,
    timezone: 'Africa/Kampala', // UTC+3
  });
  
  // Schedule embedding generation (every hour to catch any missed)
  embeddingTask = cron.schedule('30 * * * *', async () => {
    try {
      const count = await generateEmbeddingsForNew(50);
      if (count > 0) {
        logger.info(`Generated ${count} embeddings via scheduled task`);
      }
    } catch (err) {
      logger.error('Scheduled embedding generation failed', {
        error: err instanceof Error ? err.message : 'Unknown error',
      });
    }
  }, {
    scheduled: true,
    timezone: 'Africa/Kampala',
  });
  
  // Schedule cleanup (daily at 3 AM)
  cleanupTask = cron.schedule('0 3 * * *', async () => {
    logger.info('Running daily cleanup...');
    await cleanupOldOpportunities();
  }, {
    scheduled: true,
    timezone: 'Africa/Kampala',
  });
  
  // Schedule chat history cleanup (daily at 4 AM)
  chatHistoryCleanupTask = cron.schedule('0 4 * * *', async () => {
    logger.info('Running chat history cleanup...');
    await cleanupChatHistory();
  }, {
    scheduled: true,
    timezone: 'Africa/Kampala',
  });
  
  logger.info('Scheduler started successfully with all jobs');
}

/**
 * Stop the scheduler
 */
export function stopScheduler(): void {
  if (ingestionTask) {
    ingestionTask.stop();
    ingestionTask = null;
    logger.info('Ingestion task stopped');
  }
  
  if (embeddingTask) {
    embeddingTask.stop();
    embeddingTask = null;
    logger.info('Embedding task stopped');
  }
  
  if (cleanupTask) {
    cleanupTask.stop();
    cleanupTask = null;
    logger.info('Cleanup task stopped');
  }
  
  if (chatHistoryCleanupTask) {
    chatHistoryCleanupTask.stop();
    chatHistoryCleanupTask = null;
    logger.info('Chat history cleanup task stopped');
  }
}

/**
 * Check if scheduler is running
 */
export function isSchedulerRunning(): boolean {
  return ingestionTask !== null;
}

/**
 * Get next scheduled run time
 */
export function getNextRunTime(): Date | null {
  if (!ingestionTask) return null;
  
  // node-cron doesn't have a built-in method for this,
  // so we calculate manually
  const now = new Date();
  const hours = config.ingestionIntervalHours;
  const nextHour = Math.ceil(now.getHours() / hours) * hours;
  
  const nextRun = new Date(now);
  nextRun.setHours(nextHour, 0, 0, 0);
  
  if (nextRun <= now) {
    nextRun.setDate(nextRun.getDate() + 1);
    nextRun.setHours(0, 0, 0, 0);
  }
  
  return nextRun;
}

/**
 * Run immediate ingestion and schedule next
 */
export async function runImmediateAndSchedule(): Promise<void> {
  logger.info('Running immediate ingestion before scheduling...');
  
  try {
    await runFullIngestion();
  } catch (err) {
    logger.error('Initial ingestion failed, but continuing with scheduler', {
      error: err instanceof Error ? err.message : 'Unknown error',
    });
  }
  
  startScheduler();
}
