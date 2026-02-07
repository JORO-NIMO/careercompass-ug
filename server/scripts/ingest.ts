/**
 * Manual Ingestion Script
 * Run: npm run ingest
 */

import { runFullIngestion } from '../services/ingestion.js';
import { logger } from '../utils/logger.js';

async function main() {
  console.log('');
  console.log('═══════════════════════════════════════');
  console.log('   RSS Feed Ingestion - Manual Run     ');
  console.log('═══════════════════════════════════════');
  console.log('');
  
  logger.info('Starting manual ingestion run...');
  
  const startTime = Date.now();
  
  try {
    const result = await runFullIngestion();
    const duration = ((Date.now() - startTime) / 1000).toFixed(1);
    
    console.log('');
    console.log('═══════════════════════════════════════');
    console.log('           Ingestion Complete          ');
    console.log('═══════════════════════════════════════');
    console.log('');
    console.log(`  Duration:           ${duration}s`);
    console.log(`  Sources Processed:  ${result.results.length}`);
    console.log(`  Items Inserted:     ${result.totalInserted}`);
    console.log(`  Items Skipped:      ${result.totalSkipped}`);
    console.log(`  Items Failed:       ${result.totalFailed}`);
    console.log(`  Embeddings:         ${result.embeddingsGenerated}`);
    console.log('');
    
    // Show per-source breakdown
    if (result.results.length > 0) {
      console.log('Per-Source Results:');
      console.log('─────────────────────────────────────');
      result.results.forEach(r => {
        const status = r.errors.length > 0 ? '⚠️' : '✅';
        console.log(`  ${status} ${r.source}: ${r.inserted} new, ${r.skipped} skipped`);
      });
      console.log('');
    }
    
    process.exit(0);
  } catch (err) {
    logger.error('Ingestion failed', { error: err });
    console.error('');
    console.error('❌ Ingestion failed:', err instanceof Error ? err.message : 'Unknown error');
    process.exit(1);
  }
}

main();
