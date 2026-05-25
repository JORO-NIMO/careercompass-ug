// Supabase Edge Function: opportunity-notifications
// Matches new listings with user interests and sends alerts

import { createSupabaseServiceClient } from '../_shared/sbClient.ts';
import { handleCors } from '../_shared/auth.ts';
import { jsonError, jsonSuccess } from '../_shared/responses.ts';

interface RequestPayload {
    listing_id: string;
}

const FIELD_KEYWORDS: Record<string, string[]> = {
    technology: ['software', 'developer', 'engineering', 'ict', 'data', 'ai', 'cloud', 'cyber', 'devops'],
    business_finance: ['finance', 'accounting', 'audit', 'business', 'bank', 'investment', 'economics'],
    engineering: ['engineer', 'mechanical', 'electrical', 'civil', 'manufacturing', 'infrastructure'],
    health_medicine: ['health', 'medical', 'nurse', 'clinical', 'hospital', 'public health', 'pharma'],
    education: ['education', 'teacher', 'lecturer', 'curriculum', 'school', 'university', 'training'],
    development_ngo: ['ngo', 'development', 'humanitarian', 'community', 'livelihoods', 'program officer'],
    agriculture: ['agriculture', 'agri', 'farming', 'crop', 'livestock', 'agronomy', 'food systems'],
    arts_media: ['media', 'content', 'design', 'creative', 'journalism', 'communications', 'brand'],
    law_governance: ['law', 'legal', 'compliance', 'policy', 'governance', 'regulation', 'advocacy'],
    science_research: ['research', 'laboratory', 'scientist', 'analysis', 'innovation', 'evidence'],
};

function normalizeText(value: string): string {
    return value.toLowerCase().replace(/[^a-z0-9\s/_-]/g, ' ').replace(/\s+/g, ' ').trim();
}

function inferListingFields(title: string, description: string | null): string[] {
    const haystack = normalizeText(`${title} ${description || ''}`);
    const inferred: string[] = [];

    for (const [field, keywords] of Object.entries(FIELD_KEYWORDS)) {
        if (keywords.some((keyword) => haystack.includes(keyword))) {
            inferred.push(field);
        }
    }

    return inferred;
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
            .select('id, title, description, field, company_id, companies(name)')
            .eq('id', listing_id)
            .single();

        if (listingError || !listing) {
            console.error('Listing not found:', listingError);
            return jsonError('Listing not found', 404);
        }

        // 2. Structured field matching first, keyword overlap as fallback.
        const inferredFields = inferListingFields(listing.title, listing.description || null);
        const listingField = listing.field ? normalizeText(String(listing.field)).replace(/\s+/g, '_') : null;
        const targetFields = Array.from(new Set([...(listingField ? [listingField] : []), ...inferredFields]));
        const keywords = normalizeText(`${listing.title} ${listing.description || ''}`)
            .split(' ')
            .filter((w) => w.length > 3)
            .slice(0, 30);

        // 3. Fetch potentially interested users (single query, in-memory scoring)
        const { data: usersToNotify, error: usersError } = await supabase
            .from('profiles')
            .select('id, full_name, areas_of_interest')
            .not('areas_of_interest', 'is', null);

        if (usersError) {
            console.error('Error fetching users:', usersError);
            // Fallback: Just notify everyone for now if filter fails? No, let's be targeted.
        }

        const matchedUsers = (usersToNotify || []).filter((user) => {
            const interests = (user.areas_of_interest || []).map((v: string) => normalizeText(v).replace(/\s+/g, '_'));
            if (!interests.length) return false;

            const hasFieldMatch = targetFields.length > 0 && interests.some((interest: string) => targetFields.includes(interest));
            if (hasFieldMatch) return true;

            const tokenizedInterests = interests.flatMap((interest: string) => interest.split('_'));
            const keywordMatches = keywords.filter((keyword) => tokenizedInterests.includes(keyword)).length;
            return keywordMatches >= 1;
        });

        if (matchedUsers.length > 0) {
            const notifications = matchedUsers.map(u => ({
                user_id: u.id,
                type: 'opportunity_match',
                title: 'New Match: ' + listing.title,
                body: `${listing.companies?.name || 'A company'} just posted a new role that matches your interests.`,
                metadata: { listing_id: listing_id, target_fields: targetFields },
                sent_at: new Date().toISOString(),
            }));

            const { error: notifError } = await supabase
                .from('notifications')
                .insert(notifications);

            if (notifError) console.error('Failed to insert notifications:', notifError);
        }

        return jsonSuccess({
            processed: true,
            matchCount: matchedUsers.length,
            targetFields,
            listing: listing.title
        });

    } catch (err) {
        console.error('Error in opportunity-notifications:', err);
        return jsonError(err instanceof Error ? err.message : 'Internal error', 500);
    }
};

Deno.serve(handler);
