import SearchFilters from "@/components/common/SearchFilters";
import FeaturedPlacements from "@/components/placements/FeaturedPlacements";
import SEO from "@/components/seo/SEO";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import type { PlacementFilters } from "@/types/placements";

const FindPlacements = () => {
  const baseUrl = typeof window !== "undefined" ? window.location.origin : "https://placementbridge.org";

  const handleSearch = (filters: PlacementFilters) => {
    // Current search updates filtered listings directly or triggers a navigation
    // The previous automated query bot logic is removed.
    // Search filters are applied through the FeaturedPlacements component
  };

  return (
    <div className="min-h-screen bg-background">
      <SEO
        title="Find Internships and Graduate Placements Worldwide | PlacementBridge"
        description="Search internships, apprenticeships, and early-career placements across the globe. Filter by sector, location, study field, and programme type to uncover roles tailored to you."
        keywords={[
          "internships search",
          "graduate job placements",
          "student apprenticeships",
          "entry level jobs",
        ]}
        canonical="https://www.placementbridge.org/find-placements"
        jsonLd={{
          "@context": "https://schema.org",
          "@type": "CollectionPage",
          name: "Find Placements",
          url: `${baseUrl}/find-placements`,
          description: "Discover curated internships, fellowships, and placements worldwide.",
        }}
        siteName="All jobs in one place"
      />
      <main>
        <div className="bg-gradient-to-br from-primary via-primary-glow to-primary-dark text-primary-foreground">
          <div className="container mx-auto px-4 py-16">
            <div className="text-center space-y-6">
              <h1 className="text-4xl md:text-5xl font-bold">
                Discover Your Next Opportunity
              </h1>
              <p className="text-xl text-primary-foreground/90 max-w-2xl mx-auto">
                Search curated internships, projects, fellowships, and roles worldwide
              </p>
            </div>
          </div>
        </div>

        <div className="container mx-auto px-4 -mt-16 relative z-20">
          <SearchFilters onSearch={handleSearch} />
        </div>

        <FeaturedPlacements />
      </main>
    </div>
  );
};

export default FindPlacements;