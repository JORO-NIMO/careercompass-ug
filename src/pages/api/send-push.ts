
import { getUserFromRequest } from '@/lib/api-auth';

const VAPID_PUBLIC_KEY = process.env.VAPID_PUBLIC_KEY || '';
const VAPID_PRIVATE_KEY = process.env.VAPID_PRIVATE_KEY || '';
const VAPID_SUBJECT = process.env.VAPID_SUBJECT || 'mailto:admin@careercompass.ug';
webpush.setVapidDetails(VAPID_SUBJECT, VAPID_PUBLIC_KEY, VAPID_PRIVATE_KEY);

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') return res.status(405).end();

  // Authenticate and authorize admin
  const user = await getUserFromRequest(req);
  if (!user || user.role !== 'admin') return res.status(403).json({ error: 'Forbidden: Admins only' });

  const { userIds, payload } = req.body;
  if (!Array.isArray(userIds) || userIds.length === 0 || typeof payload !== 'object') {
    return res.status(400).json({ error: 'Missing or invalid userIds or payload' });
  }

  // Fetch push subscriptions for the given users
  const { data: subs, error } = await supabase
    .from('push_subscriptions')
    .select('*')
    .in('user_id', userIds);
  if (error) return res.status(500).json({ error: error.message });

  const results = [];
  for (const sub of subs || []) {
    try {
      await webpush.sendNotification(sub, JSON.stringify(payload));
      results.push({ userId: sub.user_id, success: true });
    } catch (e) {
      results.push({ userId: sub.user_id, success: false, error: e?.message });
    }
  }

  res.status(200).json({ results });
}
