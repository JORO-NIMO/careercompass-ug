// Usage: node scripts/test_send_push.mjs <admin_jwt> <user_id>
import fetch from 'node-fetch';

const [,, adminJwt, userId] = process.argv;
if (!adminJwt || !userId) {
  console.error('Usage: node scripts/test_send_push.mjs <admin_jwt> <user_id>');
  process.exit(1);
}

const payload = {
  title: 'Test Push',
  body: 'This is a test push notification.',
  url: 'https://careercompass.ug/'
};

async function sendPush() {
  const res = await fetch('http://localhost:3000/api/send-push', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${adminJwt}`
    },
    body: JSON.stringify({ userIds: [userId], payload })
  });
  const data = await res.json();
  if (!res.ok) {
    console.error('Error:', data);
    process.exit(1);
  }
  console.log('Push send result:', data);
}

sendPush();
