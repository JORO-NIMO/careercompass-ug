import { createSupabaseServiceClient } from '../../_shared/sbClient.ts';
import { handleCors } from '../../_shared/auth.ts';
import { jsonError, jsonSuccess } from '../../_shared/responses.ts';
import type { ProfileUpdate } from '../../_shared/types.ts';

export default async function (req: Request) {
    const corsResponse = handleCors(req);
    if (corsResponse) return corsResponse;

    if (req.method !== 'PUT') {
        return jsonError('Method not allowed', 405);
    }

    try {
        const supabase = createSupabaseServiceClient();

        // 1. Authenticate user
        const authHeader = req.headers.get('Authorization');
        if (!authHeader) {
            return jsonError('Unauthorized', 401);
        }

        const { data: { user }, error: authError } = await supabase.auth.getUser(authHeader.replace('Bearer ', ''));
        if (authError || !user) {
            return jsonError('Unauthorized', 401);
        }

        // 2. Parse and Validate Body
        const body = await req.json();
        const {
            full_name,
            areas_of_interest,
            location,
            experience_level,
            availability_status,
            phone
        } = body as ProfileUpdate;

        if (phone && !/^\+[1-9]\d{7,14}$/.test(phone)) {
            return jsonError('Phone number must be in E.164 format, e.g. +256700000000', 400);
        }

        if (!user.email) {
            return jsonError('Authenticated user is missing an email address', 400);
        }

        // 3. Perform an upsert via Service Role (bypassing RLS, though we verified user above).
        // This keeps profile saves working for legacy users whose auth trigger did not create a row.
        const { data, error } = await supabase
            .from('profiles')
            .upsert({
                id: user.id,
                email: user.email,
                full_name,
                areas_of_interest,
                location,
                experience_level,
                availability_status,
                phone,
                updated_at: new Date().toISOString()
            }, { onConflict: 'id' })
            .select()
            .single();

        if (error) {
            console.error('profile update error', error);
            return jsonError('Failed to update profile', 500);
        }

        return jsonSuccess({ item: data });

    } catch (err) {
        console.error('profile update handler error', err);
        return jsonError('Internal server error', 500);
    }
}
