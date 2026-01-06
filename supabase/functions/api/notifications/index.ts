import { createSupabaseServiceClient } from '../../_shared/sbClient.ts';
import { verifyAuth, unauthorizedResponse, handleCors } from '../../_shared/auth.ts';
import { jsonError, jsonSuccess } from '../../_shared/responses.ts';

interface RoleRow {
  role: string;
}

export default async function (req: Request) {
  const corsResponse = handleCors(req);
  if (corsResponse) return corsResponse;

  if (req.method !== 'GET') {
    return jsonError('Method not allowed', 405);
  }

  const { user, error } = await verifyAuth(req);
  if (error || !user) {
    return unauthorizedResponse(error || 'Authentication required');
  }

  const supabase = createSupabaseServiceClient();

  const { data: roleRows } = await supabase
    .from('user_roles')
    .select('role')
    .eq('user_id', user.id);

  const roles = new Set<string>((roleRows as RoleRow[] | null)?.map((r) => r.role) ?? []);
  roles.add('user');

  const { data: notifications, error: fetchError } = await supabase
    .from('notifications')
    .select('id, title, message, created_at, target_role, user_id, created_by')
    .or(`user_id.eq.${user.id},user_id.is.null`)
    .order('created_at', { ascending: false })
    .limit(100);

  if (fetchError) {
    console.error('notifications fetch error', fetchError);
    return jsonError('Failed to load notifications', 500);
  }

  const visible = (notifications ?? []).filter((n) => {
    if (n.user_id && n.user_id !== user.id) return false;
    if (!n.user_id) {
      if (!n.target_role || n.target_role === 'all') return true;
      return roles.has(n.target_role);
    }
    return true;
  });

  const ids = visible.map((n) => n.id);

  const { data: reads } = ids.length === 0
    ? { data: [] }
    : await supabase
        .from('notification_reads')
        .select('notification_id, read_at')
        .eq('user_id', user.id)
        .in('notification_id', ids);

  const readMap = new Map<string, string | null>();
  (reads || []).forEach((row: { notification_id: string; read_at: string | null }) => {
    readMap.set(row.notification_id, row.read_at);
  });

  const items = visible.map((n) => ({
    id: n.id,
    title: n.title,
    message: n.message,
    created_at: n.created_at,
    target_role: n.target_role,
    read_at: readMap.get(n.id) ?? null,
    read: readMap.has(n.id),
  }));

  return jsonSuccess({ items });
}
