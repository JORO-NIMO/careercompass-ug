import { createSupabaseServiceClient } from '../_shared/sbClient.ts';
import { verifyAuth, unauthorizedResponse, handleCors } from '../_shared/auth.ts';
import { jsonError, jsonSuccess, withRateLimitHeaders, withRequestIdHeaders, jsonErrorWithId } from '../_shared/responses.ts';
import { getRequestId } from '../../_shared/request.ts';
import {
    checkRateLimitUnified as checkRateLimit,
    getClientIdentifier,
    rateLimitExceededResponse,
    RATE_LIMITS,
} from '../../_shared/rateLimit.ts';

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

    // Rate limit admin operations per user/IP
    const clientId = getClientIdentifier(req, user.id);
    const rl = await checkRateLimit(clientId, RATE_LIMITS.admin);
    if (!rl.allowed) {
        const reqId = getRequestId(req);
        return rateLimitExceededResponse(rl.resetAt, reqId);
    }
    const reqId = getRequestId(req);
    const rateHeaders = withRequestIdHeaders(withRateLimitHeaders({}, rl.remaining, rl.resetAt), reqId);

    const url = new URL(req.url);
    const segments = getSegments(url);
    const resourceId = segments[0] ?? null;
    const limitParam = Number(url.searchParams.get('limit') || '0');
    const pageLimit = Number.isFinite(limitParam) && limitParam > 0 ? Math.min(limitParam, 200) : null;

    try {
        if (req.method === 'GET' && !resourceId) {
            let query = supabase
                .from('learning_resources')
                .select('*')
                .order('display_order', { ascending: true })
                .order('created_at', { ascending: false });
            if (pageLimit) {
                query = query.limit(pageLimit);
            }
            const { data, error: fetchError } = await query;

            if (fetchError) return jsonErrorWithId(fetchError.message, 500, {}, rateHeaders, reqId);
            return jsonSuccess({ items: data ?? [] }, 200, rateHeaders);
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

            if (insertError) return jsonErrorWithId(insertError.message, 500, {}, rateHeaders, reqId);
            return jsonSuccess({ item: data }, 201, rateHeaders);
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

            if (updateError) return jsonErrorWithId(updateError.message, 500, {}, rateHeaders, reqId);
            return jsonSuccess({ item: data }, 200, rateHeaders);
        }

        if (req.method === 'DELETE' && resourceId) {
            const { error: deleteError } = await supabase
                .from('learning_resources')
                .delete()
                .eq('id', resourceId);

            if (deleteError) return jsonErrorWithId(deleteError.message, 500, {}, rateHeaders, reqId);
            return jsonSuccess({}, 200, rateHeaders);
        }

        return jsonErrorWithId('Method not allowed', 405, {}, rateHeaders, reqId);
    } catch (err) {
        return jsonErrorWithId(err instanceof Error ? err.message : String(err), 500, {}, rateHeaders, reqId);
    }
}
