// Run job ingestion from external APIs
// Get your service role key from: Supabase Dashboard > Settings > API > service_role key
const SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || 'YOUR_SERVICE_ROLE_KEY_HERE';

async function ingestJobs() {
  if (SERVICE_KEY === 'YOUR_SERVICE_ROLE_KEY_HERE') {
    console.log('❌ Please set your service role key!');
    console.log('');
    console.log('Option 1: Run with env variable:');
    console.log('  $env:SUPABASE_SERVICE_ROLE_KEY="eyJ..."; node run-ingest.js');
    console.log('');
    console.log('Option 2: Get key from Supabase Dashboard:');
    console.log('  1. Go to: https://supabase.com/dashboard/project/xicdxswrtdassnlurnmp/settings/api');
    console.log('  2. Copy the "service_role" key (NOT the anon key)');
    console.log('  3. Replace YOUR_SERVICE_ROLE_KEY_HERE in this file');
    return;
  }
  
  console.log('Starting job ingestion from Remotive + Arbeitnow...');
  console.log('This may take 30-60 seconds...\n');
  
  const response = await fetch('https://xicdxswrtdassnlurnmp.supabase.co/functions/v1/ingest-jobs', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${SERVICE_KEY}`,
      'Content-Type': 'application/json'
    }
  });
  
  const data = await response.json();
  console.log('Result:', JSON.stringify(data, null, 2));
}

ingestJobs().catch(console.error);
