import type { NextApiRequest, NextApiResponse } from 'next';

const HCAPTCHA_SECRET = process.env.HCAPTCHA_SECRET || '';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }
  const { token } = req.body;
  if (!token) {
    return res.status(400).json({ error: 'Missing hCaptcha token' });
  }
  try {
    const verifyRes = await fetch('https://hcaptcha.com/siteverify', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: `response=${token}&secret=${HCAPTCHA_SECRET}`,
    });
    const data = await verifyRes.json();
    if (data.success) {
      return res.status(200).json({ success: true });
    } else {
      return res.status(403).json({ success: false, error: data['error-codes'] });
    }
  } catch (err) {
    return res.status(500).json({ error: 'hCaptcha verification failed' });
  }
}
