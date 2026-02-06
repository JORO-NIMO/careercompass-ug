/**
 * Scheduler Service
 * Automated RSS ingestion using node-cron
 */

import cron from 'node-cron';
import { runFullIngestion, generateEmbeddingsForNew } from '../services/ingestion.js';
import { config } from '../config/index.js';
import { createModuleLogger } from '../utils/logger.js';

const logger = createModuleLogger('scheduler');

let ingestionTask: cron.ScheduledTask | null = null;
let embeddingTask: cron.ScheduledTask | null = null;

/**
 * Start the scheduled ingestion task
 */
export function startScheduler(): void {
  const intervalHours = config.ingestionIntervalHours;
  
  // Run ingestion every N hours
  // Cron format: minute hour * * * (e.g., "0 */6 * * *" for every 6 hours)
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
  
  logger.info('Scheduler started successfully');
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
