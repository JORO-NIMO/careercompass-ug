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
            availability_status
        } = body as ProfileUpdate;

        // 3. Perform Update via Service Role (bypassing RLS, though we verified user above)
        // Using service role here allows us to potentially add server-side logic/logging that users can't trigger directly
        const { data, error } = await supabase
            .from('profiles')
            .update({
                full_name,
                areas_of_interest,
                location,
                experience_level,
                availability_status,
                updated_at: new Date().toISOString()
            })
            .eq('id', user.id)
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
