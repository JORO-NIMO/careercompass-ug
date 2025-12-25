import PlacementCard from "./PlacementCard";
import { Button } from "@/components/ui/button";
import { ArrowRight } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { supabase } from '@/integrations/supabase/client';
import { fetchListings, type ListingWithCompany } from '@/services/listingsService';
import { CuratedListingCard } from '@/components/CuratedListingCard';

interface PlacementData {
  id: string;
  position_title: string;
  company_name: string;
  description: string;
  region: string;
  industry: string;
  stipend: string | null;
  available_slots: number;
  created_at: string;
  approved?: boolean;
}

interface BoostData {
  entity_id: string;
  ends_at: string;
}

interface FeaturedCardPlacement {
  id: string;
  title: string;
  company: string;
  region: string;
  industry: string;
  stipend?: string;
  slots: number;
  postedDate: string;
  description: string;
  remote: boolean;
  verified: boolean;
  boosted: boolean;
  boostEndsAt: string | null;
}

const FeaturedPlacements = () => {
  const [curatedListings, setCuratedListings] = useState<ListingWithCompany[]>([]);
  const [placements, setPlacements] = useState<FeaturedCardPlacement[]>([]);
  const [loading, setLoading] = useState(true);
  const [fallbackLoading, setFallbackLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const fallbackLoadedRef = useRef(false);

  useEffect(() => {
    let mounted = true;
    const loadCurated = async () => {
      setLoading(true);
      try {
        const listings = await fetchListings();
        if (!mounted) return;
        setCuratedListings(listings);
        setError(null);
      } catch (err: any) {
        console.error('Error loading curated listings', err);
        if (!mounted) return;
        setError(err?.message ?? 'Unable to load featured listings.');
      } finally {
        if (mounted) {
          setLoading(false);
        }
      }
    };

    loadCurated();
    return () => { mounted = false; };
  }, []);

  useEffect(() => {
    let mounted = true;
    const loadFallback = async () => {
      if (fallbackLoadedRef.current) return;
      fallbackLoadedRef.current = true;
      setFallbackLoading(true);
      try {
        const { data, error } = await supabase
          .from('placements')
          .select('id, position_title, company_name, description, region, industry, stipend, available_slots, created_at, approved')
          .order('created_at', { ascending: false })
          .limit(9);

        if (error) throw error;
        if (!mounted) return;

        const placementRows = (data as PlacementData[] | null) ?? [];
        const approvedRows = placementRows.filter((p) => p.approved === true);
        const placementIds = approvedRows.map((p) => p.id);

        const nowIso = new Date().toISOString();
        let boostsByPost = new Map<string, BoostData>();

        if (placementIds.length > 0) {
          const { data: boostRows, error: boostError } = await supabase
            .from('boosts')
            .select('entity_id, ends_at')
            .in('entity_id', placementIds)
            .eq('entity_type', 'listing')
            .eq('is_active', true)
            .lte('starts_at', nowIso)
            .gt('ends_at', nowIso);

          if (boostError) throw boostError;

          const activeBoosts = (boostRows as BoostData[] | null) ?? [];

          for (const boost of activeBoosts) {
            const existing = boostsByPost.get(boost.entity_id);
            if (!existing || new Date(boost.ends_at).getTime() > new Date(existing.ends_at).getTime()) {
              boostsByPost.set(boost.entity_id, boost);
            }
          }
        }

        const mapped = approvedRows.map<FeaturedCardPlacement>((p) => {
          const boostInfo = boostsByPost.get(p.id);
          return {
            id: p.id,
            title: p.position_title,
            company: p.company_name,
            description: p.description,
            region: p.region,
            industry: p.industry,
            stipend: p.stipend || undefined,
            slots: p.available_slots,
            postedDate: p.created_at,
            remote: false,
            verified: false,
            boosted: Boolean(boostInfo),
            boostEndsAt: boostInfo?.ends_at ?? null,
          };
        });

        const sorted = mapped.sort((a, b) => {
          if (a.boosted === b.boosted) {
            return new Date(b.postedDate).getTime() - new Date(a.postedDate).getTime();
          }
          return a.boosted ? -1 : 1;
        });

        setPlacements(sorted);
      } catch (err) {
        console.error('Fallback load failed', err);
      } finally {
        if (mounted) {
          setFallbackLoading(false);
        }
      }
    };

    if (!loading && curatedListings.length === 0) {
      loadFallback();
    }

    return () => {
      mounted = false;
    };
  }, [curatedListings.length, loading]);

  return (
    <section className="py-16 bg-background">
      <div className="container mx-auto px-4">
        <div className="text-center space-y-4 mb-12">
          <h2 className="text-3xl md:text-4xl font-bold text-foreground">
            Featured Placements
          </h2>
          <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
            Discover exciting internship opportunities from top companies across Uganda
          </p>
        </div>

        {/* Placements Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-12">
          {loading ? (
            <div className="col-span-full text-center py-12">Loading curated listings…</div>
          ) : curatedListings.length > 0 ? (
            curatedListings.map((listing) => (
              <CuratedListingCard
                key={listing.id}
                title={listing.title}
                description={listing.description}
                companyName={listing.companies?.name}
                featured={listing.is_featured}
                updatedAt={listing.updated_at}
              />
            ))
          ) : fallbackLoading ? (
            <div className="col-span-full text-center py-12">Loading placements…</div>
          ) : placements.length > 0 ? (
            placements.map((placement) => (
              <PlacementCard key={placement.id} {...placement} />
            ))
          ) : (
            <div className="col-span-full text-center py-12">
              <p className="text-muted-foreground">No placements available yet.</p>
              {error ? <p className="mt-2 text-sm text-destructive">{error}</p> : null}
            </div>
          )}
        </div>

        {/* View All Button */}
        <div className="text-center">
          <Button variant="outline" size="lg" className="min-w-[200px]">
            View All Placements
            <ArrowRight className="w-5 h-5 ml-2" />
          </Button>
        </div>
      </div>
    </section>
  );
};

export default FeaturedPlacements;