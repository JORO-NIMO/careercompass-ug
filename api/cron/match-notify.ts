// Vercel Cron Job: Match & Notify
import type { VercelRequest, VercelResponse } from '@vercel/node';

const SUPABASE_URL = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL;
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

export default async function handler(req: VercelRequest, res: VercelResponse) {
  // Verify cron secret
  const authHeader = req.headers.authorization;
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  try {
    const response = await fetch(`${SUPABASE_URL}/functions/v1/match-notify`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${SUPABASE_SERVICE_KEY}`,
      },
    });

    const data = await response.json();
    
    return res.status(200).json({
      success: true,
      timestamp: new Date().toISOString(),
      result: data,
    });
  } catch (error) {
    console.error('Cron job error:', error);
    return res.status(500).json({ error: (error as Error).message });
  }
}
