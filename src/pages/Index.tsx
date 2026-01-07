import { Link } from "react-router-dom";
import HeroSection from "@/components/HeroSection";
import SearchFilters from "@/components/SearchFilters";
import FeaturedPlacements from "@/components/FeaturedPlacements";
import HowItWorks from "@/components/HowItWorks";
import QuickNavigation from "@/components/QuickNavigation";
import SEO from "@/components/SEO";
import { HomepageAdsBanner } from "@/components/HomepageAdsBanner";

import { PlatformNews } from "@/components/PlatformNews";
import { SmartJobSearch } from "@/components/SmartJobSearch";


const AUDIENCE_SEGMENTS = [
  {
    title: "I'm building my career",
    description: "Explore internships, fellowships, and learning paths curated for students and graduates across Uganda.",
    cta: "Browse opportunities",
    href: "/find-placements",
  },
  {
    title: "I need talented hires",
    description: "Post roles, feature listings, and review verified talent profiles ready to contribute from day one.",
    cta: "Post an opportunity",
    href: "/for-companies",
  },
  {
    title: "I support learners",
    description: "Partner with PlacementBridge to share programmes, scholarships, and mentorship across our network.",
    cta: "Share a resource",
    href: "/learning",
  },
];

const Index = () => {
  const baseUrl = typeof window !== "undefined" ? window.location.origin : "https://placementbridge.org";

  return (
    <div className="min-h-screen bg-background">
      <SEO
        title="PlacementBridge Uganda | Discover Placements, Internships, and Career Growth"
        description="PlacementBridge connects students, graduates, and employers to verified placements, CV guides, interview tips, and industry learning resources tailored to the local hiring landscape."
        keywords={[
          "Uganda internships platform",
          "graduate placements Uganda",
          "hire interns Uganda",
          "career resources Uganda",
          "Uganda CV writing guide",
          "Uganda interview tips",
          "learning hub Uganda",
          "career trends Uganda",
          "talent marketplace Uganda",
          "student mentorship Uganda",
        ]}
        canonical="/"
        jsonLd={{
          "@context": "https://schema.org",
          "@type": "WebSite",
          name: "PlacementBridge",
          url: `${baseUrl}/`,
          description:
            "PlacementBridge connects students, graduates, and employers to placements, talent, and tailored career resources across the country.",
          publisher: {
            "@type": "Organization",
            name: "PlacementBridge",
            url: baseUrl,
          },
          potentialAction: {
            "@type": "SearchAction",
            target: `${baseUrl}/find-placements?keywords={search_term_string}`,
            "query-input": "required name=search_term_string",
          },
        }}
      />
      <main className="flex-grow">
        <HeroSection />
        <div className="container mx-auto px-4 -mt-16 relative z-20">
          <div className="mb-6 max-w-2xl mx-auto">
            <SmartJobSearch />
          </div>
          <SearchFilters />
        </div>
        <PlatformNews />
        <HomepageAdsBanner />
        <FeaturedPlacements />
        <HowItWorks />
        <section className="container mx-auto px-4 mt-12">
          <div className="grid gap-4 md:grid-cols-3">
            {AUDIENCE_SEGMENTS.map((segment) => (
              <Link
                key={segment.title}
                to={segment.href}
                className="group flex h-full flex-col justify-between rounded-2xl border border-border/70 bg-background/90 p-6 shadow-sm backdrop-blur transition hover:border-primary hover:bg-primary/5"
              >
                <div className="space-y-3">
                  <h3 className="text-2xl font-semibold text-foreground">{segment.title}</h3>
                  <p className="text-base text-muted-foreground">{segment.description}</p>
                </div>
                <span className="mt-6 inline-flex items-center gap-2 text-base font-medium text-primary group-hover:translate-x-1 group-hover:underline">
                  {segment.cta}
                  <span aria-hidden>→</span>
                </span>
              </Link>
            ))}
          </div>
        </section>
        <div className="container mx-auto px-4 mt-12">
          <QuickNavigation />
        </div>
      </main>
    </div>
  );
};

export default Index;
