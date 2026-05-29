// Supabase Edge Function: opportunity-notifications
// Routes listing notifications through the canonical SQL matching engine.

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

        const { data: listing, error: listingError } = await supabase
            .from('listings')
            .select('id, title')
            .eq('id', listing_id)
            .single();

        if (listingError || !listing) {
            console.error('Listing not found:', listingError);
            return jsonError('Listing not found', 404);
        }

        const { data: matches, error: matchError } = await supabase.rpc('match_profiles_for_listing', {
            p_listing_id: listing_id,
        });

        if (matchError) {
            console.error('Listing match failed:', matchError);
            return jsonError('Failed to match listing interests', 500);
        }

        const { data: insertedCount, error: notifyError } = await supabase.rpc('notify_listing_interest_matches', {
            p_listing_id: listing_id,
        });

        if (notifyError) {
            console.error('Listing notification insert failed:', notifyError);
            return jsonError('Failed to insert listing notifications', 500);
        }

        const targetFields = Array.from(new Set((matches || []).flatMap((match: { matched_fields?: string[] | null }) => match.matched_fields || [])));

        return jsonSuccess({
            processed: true,
            matchCount: insertedCount ?? matches?.length ?? 0,
            targetFields,
            listing: listing.title,
            routingEngine: 'match_profiles_for_listing',
        });
    } catch (err) {
        console.error('Error in opportunity-notifications:', err);
        return jsonError(err instanceof Error ? err.message : 'Internal error', 500);
    }
};

Deno.serve(handler);
