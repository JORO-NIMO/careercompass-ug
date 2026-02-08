// Test chat-agent function
const ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InhpY2R4c3dydGRhc3NubHVybm1wIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjY0Njg2MDQsImV4cCI6MjA4MjA0NDYwNH0.btnHAaqOVa3p3hx1AYdsanXztsjjb_K_6uIevP7ORIA';

async function testChat() {
  console.log('Testing chat-agent...');
  
  const response = await fetch('https://xicdxswrtdassnlurnmp.supabase.co/functions/v1/chat-agent', {
    method: 'POST',
    headers: {
      'apikey': ANON_KEY,
      'Authorization': `Bearer ${ANON_KEY}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({ message: 'Find software jobs' })
  });
  
  const data = await response.json();
  console.log('Response:', JSON.stringify(data, null, 2));
}

testChat().catch(console.error);
