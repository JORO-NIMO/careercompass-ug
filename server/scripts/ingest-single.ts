/**
 * Single Feed Ingestion Script
 * Run: npm run ingest:single -- --url=<RSS_URL> --name=<FEED_NAME>
 */

import { processRssUrl } from '../services/ingestion.js';
import { validateRssFeed } from '../services/rssFetcher.js';
import { logger } from '../utils/logger.js';

async function main() {
  // Parse command line arguments
  const args = process.argv.slice(2);
  let url = '';
  let name = '';
  
  for (const arg of args) {
    if (arg.startsWith('--url=')) {
      url = arg.substring(6);
    } else if (arg.startsWith('--name=')) {
      name = arg.substring(7);
    } else if (!arg.startsWith('--')) {
      // Positional argument - treat as URL
      url = arg;
    }
  }
  
  if (!url) {
    console.error('Usage: npm run ingest:single -- --url=<RSS_URL> [--name=<FEED_NAME>]');
    console.error('');
    console.error('Example:');
    console.error('  npm run ingest:single -- --url=https://opportunitydesk.org/feed/');
    console.error('  npm run ingest:single -- --url=https://example.com/feed --name="Example Feed"');
    process.exit(1);
  }
  
  console.log('');
  console.log('═══════════════════════════════════════');
  console.log('     Single Feed Ingestion             ');
  console.log('═══════════════════════════════════════');
  console.log('');
  console.log(`  URL:  ${url}`);
  console.log(`  Name: ${name || '(auto-detect)'}`);
  console.log('');
  
  // Validate feed first
  console.log('Validating feed...');
  const validation = await validateRssFeed(url);
  
  if (!validation.valid) {
    console.error(`❌ Invalid RSS feed: ${validation.error}`);
    process.exit(1);
  }
  
  console.log(`✅ Valid feed: "${validation.feedTitle}" (${validation.itemCount} items)`);
  console.log('');
  
  // Process the feed
  console.log('Processing feed...');
  const startTime = Date.now();
  
  try {
    const result = await processRssUrl(url, name || validation.feedTitle);
    const duration = ((Date.now() - startTime) / 1000).toFixed(1);
    
    console.log('');
    console.log('═══════════════════════════════════════');
    console.log('           Results                     ');
    console.log('═══════════════════════════════════════');
    console.log('');
    console.log(`  Duration:       ${duration}s`);
    console.log(`  Items Fetched:  ${result.fetched}`);
    console.log(`  Items Inserted: ${result.inserted}`);
    console.log(`  Items Skipped:  ${result.skipped}`);
    console.log(`  Items Failed:   ${result.failed}`);
    
    if (result.errors.length > 0) {
      console.log('');
      console.log('Errors:');
      result.errors.forEach(e => console.log(`  - ${e}`));
    }
    
    console.log('');
    process.exit(0);
  } catch (err) {
    logger.error('Ingestion failed', { error: err });
    console.error('');
    console.error('❌ Processing failed:', err instanceof Error ? err.message : 'Unknown error');
    process.exit(1);
  }
}

main();
