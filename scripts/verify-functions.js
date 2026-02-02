// Quick verification for deployed Supabase Edge Functions
// Uses unauthenticated requests to confirm endpoints respond

const BASE_URL = 'https://xicdxswrtdassnlurnmp.supabase.co';

async function callJson(url, options = {}) {
  const res = await fetch(url, options);
  const text = await res.text().catch(() => '');
  let body;
  try { body = JSON.parse(text); } catch { body = text; }
  return { status: res.status, ok: res.ok, body };
}

async function main() {
  const headers = { 'Content-Type': 'application/json' };

  const results = {};

  // 1) access-control (GET)
  results.accessControl = await callJson(`${BASE_URL}/functions/v1/access-control`, { method: 'GET', headers });

  // 2) ai-usage-alerts (GET)
  results.aiUsageAlerts = await callJson(`${BASE_URL}/functions/v1/ai-usage-alerts`, { method: 'GET', headers });

  // 3) chat-agent (POST)
  results.chatAgent = await callJson(`${BASE_URL}/functions/v1/chat-agent`, {
    method: 'POST',
    headers,
    body: JSON.stringify({ message: 'Hello there! Find engineering internships.' })
  });

  // Print concise summary
  for (const [name, r] of Object.entries(results)) {
    const preview = typeof r.body === 'string' ? r.body.slice(0, 200) : JSON.stringify(r.body).slice(0, 200);
    console.log(`\n[${name}] status=${r.status} ok=${r.ok}\n${preview}`);
  }
}

main().catch((err) => {
  console.error('Verification script error:', err);
  process.exit(1);
});
