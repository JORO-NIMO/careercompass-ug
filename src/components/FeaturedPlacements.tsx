import PlacementCard from "./PlacementCard";
import { Button } from "@/components/ui/button";
import { ArrowRight } from "lucide-react";
import { useEffect, useState } from "react";
import { supabase } from '@/integrations/supabase/client';

interface PlacementData {
  id: string;
  position_title: string;
  company_name: string;
  description: string;
  region: string;
  industry: string;
  stipend: string;
  available_slots: number;
  created_at: string;
}

const FeaturedPlacements = () => {
  const [placements, setPlacements] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let mounted = true;
    const load = async () => {
      setLoading(true);
      try {
        const { data, error } = await supabase
          .from('placements')
          .select('id, position_title, company_name, description, region, industry, stipend, available_slots, created_at, approved')
          .order('created_at', { ascending: false })
          .limit(9);

        if (error) throw error;

        if (!mounted) return;

        // Filter approved placements and map to card format
        const mapped = ((data as (PlacementData & { approved?: boolean })[]) || [])
          .filter((p) => p.approved === true)
          .map((p) => ({
            id: p.id,
            title: p.position_title,
            company: p.company_name,
            description: p.description,
            region: p.region,
            industry: p.industry,
            stipend: p.stipend,
            slots: p.available_slots,
            postedDate: p.created_at,
            remote: false,
            verified: false,
          }));

        setPlacements(mapped);
      } catch (err) {
        console.error('Error loading featured placements', err);
      } finally {
        setLoading(false);
      }
    };

    load();
    return () => { mounted = false; };
  }, []);

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
            <div className="col-span-full text-center py-12">Loading...</div>
          ) : placements.length === 0 ? (
            <div className="col-span-full text-center py-12">
              <p className="text-muted-foreground">No placements available yet.</p>
            </div>
          ) : (
            placements.map((placement) => (
              <PlacementCard key={placement.id} {...placement} />
            ))
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