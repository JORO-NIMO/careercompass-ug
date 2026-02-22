/**
 * Main Entry Point
 * Starts the API server and scheduler
 */

import { startServer } from './api/server.js';
import { startScheduler, runImmediateAndSchedule } from './utils/scheduler.js';
import { checkSupabaseHealth } from './utils/supabase.js';
import { logger } from './utils/logger.js';
import { config } from './config/index.js';

async function main() {
  console.log('╔════════════════════════════════════════════════╗');
  console.log('║     Opportunity Backend - RSS Ingestion        ║');
  console.log('║         with AI Semantic Search                ║');
  console.log('╚════════════════════════════════════════════════╝');
  console.log('');
  
  // Check Supabase connection
  logger.info('Checking Supabase connection...');
  const supabaseHealthy = await checkSupabaseHealth();
  
  if (!supabaseHealthy) {
    logger.error('❌ Failed to connect to Supabase. Check your configuration.');
    process.exit(1);
  }
  
  logger.info('✅ Supabase connection successful');
  
  // Start API server
  logger.info(`Starting API server on port ${config.port}...`);
  startServer();
  
  // Start scheduler (optionally run immediate ingestion first)
  // Schedule embedding refresh job
  try {
    const { runEmbeddingRefreshJob } = await import('./jobs/embeddingRefreshJob');
    const cron = (await import('node-cron')).default;
    cron.schedule('0 3 * * *', runEmbeddingRefreshJob); // Every day at 3am
    logger.info('Scheduled embedding refresh job at 3am daily');
  } catch (err) {
    logger.warn('Failed to schedule embedding refresh job', { error: err });
  }
  const runImmediate = process.argv.includes('--immediate');
  
  if (runImmediate) {
    logger.info('Running immediate ingestion...');
    await runImmediateAndSchedule();
  } else {
    startScheduler();
  }
  
  // Graceful shutdown
  process.on('SIGTERM', () => {
    logger.info('Received SIGTERM, shutting down...');
    process.exit(0);
  });
  
  process.on('SIGINT', () => {
    logger.info('Received SIGINT, shutting down...');
    process.exit(0);
  });
}

// Run
main().catch(err => {
  logger.error('Fatal error', { error: err });
  process.exit(1);
});
