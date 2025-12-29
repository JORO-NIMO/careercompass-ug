import { supabase } from '@/integrations/supabase/client';
import type { Tables } from '@/integrations/supabase/types';

export type Profile = Tables<'profiles'>;

export interface Candidate {
    id: string;
    name: string;
    title: string;
    location: string;
    field: string;
    education: string;
    skills: string[];
    experience: string;
    email?: string;
    phone?: string;
    availability: string;
    verified: boolean;
    updatedAt?: string | null;
}

// Helper for authenticated requests (similar to listingsService)
async function authorizedFetch(input: RequestInfo, init: RequestInit = {}) {
    const {
        data: { session },
    } = await supabase.auth.getSession();

    if (!session?.access_token) {
        throw new Error('Authentication required');
    }

    const headers = new Headers(init.headers ?? {});
    headers.set('Authorization', `Bearer ${session.access_token}`);
    headers.set('Accept', 'application/json');
    if (!headers.has('Content-Type') && init.body && !(init.body instanceof FormData)) {
        headers.set('Content-Type', 'application/json');
    }

    return fetch(input, { ...init, headers });
}

async function parseJsonResponse<T>(response: Response) {
    const contentType = response.headers.get('Content-Type') ?? '';
    const rawBody = await response.text();

    if (!rawBody) return { success: response.ok, data: undefined };

    if (!contentType.includes('application/json')) {
        return { success: false, error: 'Invalid response type' };
    }

    try {
        const parsed = JSON.parse(rawBody);
        return {
            success: response.ok,
            data: parsed as T,
            error: response.ok ? undefined : (parsed as any)?.error
        };
    } catch {
        return { success: false, error: 'Invalid JSON' };
    }
}

export const mapProfileToCandidate = (profile: Profile): Candidate => {
    const interests = profile.areas_of_interest ?? [];
    const primaryInterest = interests[0] ?? 'Open to opportunities';

    return {
        id: profile.id,
        name: profile.full_name ?? 'Unnamed Candidate',
        title: primaryInterest,
        location: profile.location ?? 'Location not specified',
        field: primaryInterest,
        education: profile.experience_level ?? 'Background details not provided',
        skills: interests,
        experience: profile.experience_level ?? 'Experience not specified',
        email: profile.email,
        phone: undefined,
        availability: profile.availability_status ?? 'Available upon request',
        verified: false,
        updatedAt: profile.updated_at,
    };
};

export async function fetchCandidates(limit = 100): Promise<Candidate[]> {
    const { data, error } = await supabase
        .from('profiles')
        .select(
            'id, full_name, email, areas_of_interest, updated_at, location, experience_level, availability_status'
        )
        .order('updated_at', { ascending: false })
        .limit(limit);

    if (error) {
        console.error('Error fetching candidates:', error);
        throw error;
    }

    return (data ?? []).map(mapProfileToCandidate);
}

export async function updateProfile(profile: Partial<Profile>): Promise<Profile> {
    const response = await authorizedFetch('/api/profiles', {
        method: 'PUT',
        body: JSON.stringify({
            full_name: profile.full_name,
            areas_of_interest: profile.areas_of_interest,
            location: profile.location,
            experience_level: profile.experience_level,
            availability_status: profile.availability_status
        }),
    });

    const { success, data, error } = await parseJsonResponse<{ item: Profile }>(response);

    if (!success || !data?.item) {
        throw new Error(error ?? 'Failed to update profile');
    }

    return data.item;
}
