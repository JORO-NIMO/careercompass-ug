import { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import SEO from '@/components/seo/SEO';
import SingleJobPostingJsonLd from '@/components/seo/SingleJobPostingJsonLd';
import { supabase } from '@/integrations/supabase/client';
import { fetchListings, type ListingWithCompany } from '@/services/listingsService';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Button } from '@/components/ui/button';

type FallbackPlacement = {
  id: string;
  position_title: string;
  company_name: string;
  description: string;
  region: string | null;
  industry: string | null;
  stipend: string | null;
  available_slots: number | null;
  created_at: string;
  approved?: boolean;
  deadline?: string | null;
  application_link?: string | null;
};

export default function PlacementDetails() {
  const { id } = useParams();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [listing, setListing] = useState<ListingWithCompany | null>(null);
  const [fallback, setFallback] = useState<FallbackPlacement | null>(null);

  useEffect(() => {
    let mounted = true;
    async function load() {
      if (!id) return;
      setLoading(true);
      try {
        // Try curated listings first
        const curated = await fetchListings();
        const found = curated.find((l) => l.id === id) || null;
        if (found) {
          if (!mounted) return;
          setListing(found);
          setFallback(null);
          setError(null);
        } else {
          // Fallback to placements table
          const { data, error } = await supabase
            .from('placements')
            .select('id, position_title, company_name, description, region, industry, stipend, available_slots, created_at, approved, deadline, application_link')
            .eq('id', id)
            .single();

          if (error) throw error;
          if (!mounted) return;
          setFallback(data as FallbackPlacement);
          setListing(null);
          setError(null);
        }
      } catch (err: any) {
        console.error('PlacementDetails load failed', err);
        if (!mounted) return;
        setError(err?.message || 'Failed to load placement');
      } finally {
        if (mounted) setLoading(false);
      }
    }

    load();
    return () => { mounted = false; };
  }, [id]);

  const title = listing?.title || fallback?.position_title || 'Opportunity';
  const description = listing?.description || fallback?.description || '';
  const companyName = listing?.companies?.name || fallback?.company_name || null;
  const companyWebsite = listing?.companies?.website_url || null;
  const region = listing?.region || fallback?.region || null;
  const updatedAt = listing?.updated_at || null;
  const createdAt = listing?.created_at || fallback?.created_at || null;
  const deadline = listing?.application_deadline || fallback?.deadline || null;
  const opportunityType = listing?.opportunity_type || null;
  const applicationMethod = listing?.application_method || null;
  const applicationEmail = listing?.application_email || null;
  const applicationUrl = listing?.application_url || fallback?.application_link || null;

  const baseUrl = typeof window !== 'undefined' ? window.location.origin : 'https://placementbridge.org';
  const canonical = `${baseUrl}/placements/${id}`;

  return (
    <div className="min-h-screen bg-background">
      <SEO
        title={`${title} | PlacementBridge`}
        description={description.slice(0, 160)}
        canonical={canonical}
        siteName="All jobs in one place"
      />
      {!loading && (
        <SingleJobPostingJsonLd
          title={title}
          description={description}
          companyName={companyName}
          companyWebsite={companyWebsite}
          updatedAt={updatedAt}
          createdAt={createdAt}
          applicationDeadline={deadline}
          expiresAt={listing?.expires_at || null}
          opportunityType={opportunityType}
          region={region}
          applicationMethod={applicationMethod}
          applicationEmail={applicationEmail}
          applicationUrl={applicationUrl}
        />
      )}
      <main className="container mx-auto px-4 py-10">
        {loading ? (
          <div className="text-center py-20">Loading opportunity…</div>
        ) : error ? (
          <div className="text-center py-20 text-destructive">{error}</div>
        ) : (
          <Card className="max-w-3xl mx-auto">
            <CardHeader>
              <h1 className="text-3xl font-bold">{title}</h1>
              {companyName && <p className="text-muted-foreground">{companyName}</p>}
            </CardHeader>
            <CardContent className="space-y-4">
              {region && <p className="text-sm text-muted-foreground">Region: {region}</p>}
              {deadline && (
                <p className="text-sm text-muted-foreground">
                  Deadline: {new Date(deadline).toLocaleDateString()}
                </p>
              )}
              <div className="prose prose-sm max-w-none">
                <p>{description}</p>
              </div>
              <div className="flex gap-3 pt-2">
                {applicationUrl ? (
                  <Button asChild>
                    <a href={applicationUrl} target="_blank" rel="noopener noreferrer">Apply External</a>
                  </Button>
                ) : applicationEmail ? (
                  <Button asChild>
                    <a href={`mailto:${applicationEmail}?subject=Application: ${title}`}>Apply via Email</a>
                  </Button>
                ) : (
                  <Button disabled>Application Instructions Unavailable</Button>
                )}
                <Button variant="outline" asChild>
                  <Link to="/find-placements">Back to listings</Link>
                </Button>
              </div>
            </CardContent>
          </Card>
        )}
      </main>
    </div>
  );
}
