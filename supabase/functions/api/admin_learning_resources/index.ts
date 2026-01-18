import { createSupabaseServiceClient } from '../_shared/sbClient.ts';
import { verifyAuth, unauthorizedResponse, handleCors } from '../_shared/auth.ts';
import { jsonError, jsonSuccess } from '../_shared/responses.ts';

function getSegments(url: URL): string[] {
    const parts = url.pathname.split('/').filter(Boolean);
    const adminIdx = parts.indexOf('admin');
    const resIdx = parts.indexOf('learning_resources');

    if (adminIdx !== -1 && resIdx !== -1 && resIdx > adminIdx) {
        return parts.slice(resIdx + 1);
    }

    const legacyIdx = parts.indexOf('admin_learning_resources');
    return legacyIdx === -1 ? [] : parts.slice(legacyIdx + 1);
}

async function ensureAdmin(userId: string, supabase: ReturnType<typeof createSupabaseServiceClient>) {
    const { data, error } = await supabase
        .from('user_roles')
        .select('role')
        .eq('user_id', userId)
        .eq('role', 'admin')
        .maybeSingle();

    return !error && data !== null;
}

export default async function (req: Request) {
    const corsResponse = handleCors(req);
    if (corsResponse) return corsResponse;

    const { user, error } = await verifyAuth(req);
    if (error || !user) {
        return unauthorizedResponse(error || 'Authentication required');
    }

    const supabase = createSupabaseServiceClient();
    const isAdmin = await ensureAdmin(user.id, supabase);
    if (!isAdmin) {
        return jsonError('Admin role required', 403);
    }

    const url = new URL(req.url);
    const segments = getSegments(url);
    const resourceId = segments[0] ?? null;

    try {
        if (req.method === 'GET' && !resourceId) {
            const { data, error: fetchError } = await supabase
                .from('learning_resources')
                .select('*')
                .order('display_order', { ascending: true })
                .order('created_at', { ascending: false });

            if (fetchError) return jsonError(fetchError.message, 500);
            return jsonSuccess({ items: data ?? [] });
        }

        if (req.method === 'POST' && !resourceId) {
            const payload = await req.json();
            const { data, error: insertError } = await supabase
                .from('learning_resources')
                .insert({
                    title: payload.title,
                    description: payload.description,
                    type: payload.type,
                    url: payload.url,
                    image_url: payload.image_url,
                    display_order: payload.display_order ?? 0,
                    is_active: payload.is_active ?? true,
                })
                .select('*')
                .maybeSingle();

            if (insertError) return jsonError(insertError.message, 500);
            return jsonSuccess({ item: data }, 201);
        }

        if (req.method === 'PUT' && resourceId) {
            const payload = await req.json();
            const { data, error: updateError } = await supabase
                .from('learning_resources')
                .update({
                    title: payload.title,
                    description: payload.description,
                    type: payload.type,
                    url: payload.url,
                    image_url: payload.image_url,
                    display_order: payload.display_order,
                    is_active: payload.is_active,
                })
                .eq('id', resourceId)
                .select('*')
                .maybeSingle();

            if (updateError) return jsonError(updateError.message, 500);
            return jsonSuccess({ item: data });
        }

        if (req.method === 'DELETE' && resourceId) {
            const { error: deleteError } = await supabase
                .from('learning_resources')
                .delete()
                .eq('id', resourceId);

            if (deleteError) return jsonError(deleteError.message, 500);
            return jsonSuccess({});
        }

        return jsonError('Method not allowed', 405);
    } catch (err) {
        return jsonError(err instanceof Error ? err.message : String(err), 500);
    }
}
