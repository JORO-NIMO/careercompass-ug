import Header from "@/components/Header";
import Footer from "@/components/Footer";
import SearchFilters from "@/components/SearchFilters";
import FeaturedPlacements from "@/components/FeaturedPlacements";
import SEO from "@/components/SEO";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { buildPlacementQueries } from "@/lib/placementBot";
import type { PlacementFilters, PlacementQuery } from "@/types/placements";
import { useState } from "react";

const FindPlacements = () => {
  const [queries, setQueries] = useState<PlacementQuery[]>([]);
  const baseUrl = typeof window !== "undefined" ? window.location.origin : "https://placementbridge.org";

  const handleSearch = (filters: PlacementFilters) => {
    const built = buildPlacementQueries({
      keywords: filters.keywords,
      sector: filters.sector,
      region: filters.region,
      placementType: filters.placementType,
      field: filters.field,
      year: filters.year,
    });
    setQueries(built);
  };

  return (
    <div className="min-h-screen bg-background">
      <SEO
        title="Find Internships and Graduate Placements in Uganda | PlacementBridge"
        description="Search internships, apprenticeships, and early-career placements across Uganda. Filter by sector, region, study field, and programme type to uncover roles tailored to you."
        keywords={[
          "Uganda internships search",
          "graduate job placements Uganda",
          "student apprenticeships Kampala",
          "entry level jobs Uganda",
        ]}
        canonical="/find-placements"
        jsonLd={{
          "@context": "https://schema.org",
          "@type": "CollectionPage",
          name: "Find Placements",
          url: `${baseUrl}/find-placements`,
          description: "Discover curated internships, fellowships, and placements across Uganda.",
        }}
      />
      <Header />
      <main>
        <div className="bg-gradient-to-br from-primary via-primary-glow to-primary-dark text-primary-foreground">
          <div className="container mx-auto px-4 py-16">
            <div className="text-center space-y-6">
              <h1 className="text-4xl md:text-5xl font-bold">
                Discover Your Next Opportunity
              </h1>
              <p className="text-xl text-primary-foreground/90 max-w-2xl mx-auto">
                Search curated internships, projects, fellowships, and roles across Uganda
              </p>
            </div>
          </div>
        </div>
        
        <div className="container mx-auto px-4 -mt-16 relative z-20">
          <SearchFilters onSearch={handleSearch} />
        </div>

        {queries.length > 0 && (
          <div className="container mx-auto px-4 mt-8 grid grid-cols-1 md:grid-cols-2 gap-4">
            {queries.map((q) => (
              <Card key={q.label} className="bg-secondary/30 border-primary/10">
                <CardHeader>
                  <CardTitle className="text-lg">{q.label}</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <p className="text-sm text-muted-foreground">{q.notes}</p>
                  <Button asChild variant="outline" className="w-full" aria-label={`Open ${q.label}`}>
                    <a href={q.url} target="_blank" rel="noreferrer noopener">
                      Open search in new tab
                    </a>
                  </Button>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
        
        <FeaturedPlacements />
      </main>
      <Footer />
    </div>
  );
};

export default FindPlacements;