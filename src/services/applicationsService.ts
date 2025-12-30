import { supabase } from '@/integrations/supabase/client';
import { Tables } from '@/integrations/supabase/types';

export type Application = Tables<'applications_registry'>;

export async function submitApplication(listingId: string, cvSnapshotUrl?: string | null): Promise<Application> {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('Authentication required to apply');

    const { data, error } = await supabase
        .from('applications_registry')
        .insert({
            user_id: user.id,
            listing_id: listingId,
            cv_snapshot_url: cvSnapshotUrl || null,
        })
        .select('*')
        .single();

    if (error) {
        console.error('submitApplication error:', error);
        if (error.code === '23505') {
            throw new Error('You have already applied to this opportunity.');
        }
        throw new Error(error.message || 'Failed to submit application');
    }

    return data;
}

export async function fetchMyApplications(): Promise<Application[]> {
    const { data, error } = await supabase
        .from('applications_registry')
        .select('*, listings:listings(*)');

    if (error) {
        console.error('fetchMyApplications error:', error);
        throw new Error(error.message || 'Failed to load applications');
    }

    return data;
}

export async function fetchApplicationsForListing(listingId: string): Promise<Application[]> {
    const { data, error } = await supabase
        .from('applications_registry')
        .select('*, profiles:profiles(*)')
        .eq('listing_id', listingId);

    if (error) {
        console.error('fetchApplicationsForListing error:', error);
        throw new Error(error.message || 'Failed to load applications for this listing');
    }

    return data;
}

export async function fetchRecruiterApplications(companyIds: string[]): Promise<any[]> {
    if (companyIds.length === 0) return [];

    const { data, error } = await supabase
        .from('applications_registry')
        .select(`
            *,
            listings!inner (
                id,
                title,
                company_id
            ),
            profiles:profiles!inner (
                id,
                full_name,
                school_name,
                course_of_study,
                cv_url,
                portfolio_url
            )
        `)
        .in('listings.company_id', companyIds)
        .order('created_at', { ascending: false });

    if (error) {
        console.error('fetchRecruiterApplications error:', error);
        throw new Error(error.message || 'Failed to load recruiter applications');
    }

    return data;
}
