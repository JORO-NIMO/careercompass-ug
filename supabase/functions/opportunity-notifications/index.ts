// Supabase Edge Function: opportunity-notifications
// Matches new listings with user interests and sends alerts

import { createSupabaseServiceClient } from '../_shared/sbClient.ts';
import { handleCors } from '../_shared/auth.ts';
import { jsonError, jsonSuccess } from '../_shared/responses.ts';

interface RequestPayload {
    listing_id: string;
}

const handler = async (req: Request) => {
    const corsResponse = handleCors(req);
    if (corsResponse) return corsResponse;

    if (req.method !== 'POST') return jsonError('Method not allowed', 405);

    try {
        const { listing_id } = (await req.json()) as RequestPayload;
        if (!listing_id) return jsonError('listing_id is required', 400);

        const supabase = createSupabaseServiceClient();

        // 1. Fetch listing details
        const { data: listing, error: listingError } = await supabase
            .from('listings')
            .select('title, description, company_id, companies(name)')
            .eq('id', listing_id)
            .single();

        if (listingError || !listing) {
            console.error('Listing not found:', listingError);
            return jsonError('Listing not found', 404);
        }

        // 2. Simple matching: Check title/description against user interests
        // In a real app, you'd use pg_trgm or semantic search.
        // Here we'll find users whose areas_of_interest overlap with words in the title.
        const keywords = listing.title.toLowerCase().split(/\s+/).filter(w => w.length > 3);

        // 3. Fetch potentially interested users
        // Using a simple overlap check with overlap operator && for arrays
        const { data: usersToNotify, error: usersError } = await supabase
            .from('profiles')
            .select('id, full_name')
            .filter('areas_of_interest', 'cs', keywords); // Using containment/overlap logic if possible via filter

        if (usersError) {
            console.error('Error fetching users:', usersError);
            // Fallback: Just notify everyone for now if filter fails? No, let's be targeted.
        }

        const notifiedCount = 0;
        if (usersToNotify && usersToNotify.length > 0) {
            const notifications = usersToNotify.map(u => ({
                user_id: u.id,
                type: 'opportunity_match',
                title: 'New Match: ' + listing.title,
                body: `${listing.companies?.name || 'A company'} just posted a new role that matches your interests.`,
                metadata: { listing_id: listing_id },
                sent_at: new Date().toISOString(),
            }));

            const { error: notifError } = await supabase
                .from('notifications')
                .insert(notifications);

            if (notifError) console.error('Failed to insert notifications:', notifError);
        }

        return jsonSuccess({
            processed: true,
            matchCount: usersToNotify?.length || 0,
            listing: listing.title
        });

    } catch (err) {
        console.error('Error in opportunity-notifications:', err);
        return jsonError(err instanceof Error ? err.message : 'Internal error', 500);
    }
};

Deno.serve(handler);
