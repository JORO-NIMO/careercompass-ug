export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { token } = req.body || {};
  if (!token) {
    return res.status(400).json({ error: 'Missing hCaptcha token' });
  }

  const secret = process.env.HCAPTCHA_SECRET || '';
  if (!secret) {
    return res.status(500).json({ error: 'hCaptcha secret not configured' });
  }

  try {
    const params = new URLSearchParams();
    params.append('response', token);
    params.append('secret', secret);

    const verifyRes = await fetch('https://hcaptcha.com/siteverify', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: params.toString(),
    });

    const data = await verifyRes.json();
    if (data.success) {
      return res.status(200).json({ success: true });
    }
    return res.status(403).json({ success: false, error: data['error-codes'] || data });
  } catch (err) {
    console.error('hCaptcha verification error', err);
    return res.status(500).json({ error: 'hCaptcha verification failed' });
  }
}
