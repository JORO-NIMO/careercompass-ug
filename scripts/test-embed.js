#!/usr/bin/env node
// Quick test script to invoke the deployed embeddings Edge Function.
// Usage (PowerShell):
//   $env:FUNCTION_URL = "https://<project>.functions.supabase.co/embeddings"; node scripts/test-embed.js "hello world"
// Or set VITE_SUPABASE_PROJECT_ID in .env and run:
//   node scripts/test-embed.js "hello world"

(async () => {
  const projectId = process.env.VITE_SUPABASE_PROJECT_ID;
  const functionUrl = process.env.FUNCTION_URL || (projectId ? `https://${projectId}.functions.supabase.co/embeddings` : undefined);

  if (!functionUrl) {
    console.error('Missing FUNCTION_URL and VITE_SUPABASE_PROJECT_ID. Set one of them and retry.');
    process.exit(1);
  }

  const input = process.argv.slice(2).join(' ') || 'test embedding';

  try {
    const res = await fetch(functionUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ input }),
    });

    const text = await res.text();
    try {
      const json = JSON.parse(text);
      console.log('Response:', JSON.stringify(json, null, 2));
    } catch {
      console.log('Response text:', text);
    }

    if (!res.ok) process.exit(2);
  } catch (err) {
    console.error('Request failed:', err);
    process.exit(3);
  }
})();
