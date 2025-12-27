import type { NextApiRequest, NextApiResponse } from 'next';

export default function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method === 'POST') {
    // Accept and log analytics events
    const events = req.body.events || [];
    // You can add DB storage or further processing here
    console.log('[Analytics] Received events:', events);
    return res.status(200).json({ ok: true });
  }
  res.setHeader('Allow', ['POST']);
  res.status(405).end('Method Not Allowed');
}
