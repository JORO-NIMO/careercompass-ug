import { Link } from "react-router-dom";
import HeroSection from "@/components/HeroSection";
import SearchFilters from "@/components/SearchFilters";
import FeaturedPlacements from "@/components/FeaturedPlacements";
import HowItWorks from "@/components/HowItWorks";
import QuickNavigation from "@/components/QuickNavigation";
import SEO from "@/components/SEO";
import { HomepageAdsBanner } from "@/components/HomepageAdsBanner";

import { PlatformNews } from "@/components/PlatformNews";

const RESOURCE_HIGHLIGHTS = [
  {
    href: "/guides/how-to-write-a-cv",
    category: "Career guide",
    title: "Craft a competitive Ugandan CV",
    description: "Step-by-step advice, templates, and recruiter-backed insights tailored to local hiring teams.",
  },
  {
    href: "/guides/interview-tips-uganda",
    category: "Interview prep",
    title: "Ace interviews with confidence",
    description: "Master panel etiquette, storytelling, and follow-up habits that resonate with employers across Uganda.",
  },
  {
    href: "/insights/career-trends",
    category: "Market insights",
    title: "Track emerging career trends",
    description: "Quarterly research on high-growth sectors, in-demand skills, and hiring forecasts nationwide.",
  },
  {
    href: "/learning",
    category: "Learning hub",
    title: "Level up with curated learning",
    description: "Browse vetted courses, mentorship programmes, and scholarships aligned to your goals.",
  },
];

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
        description="PlacementBridge connects students, graduates, and employers to verified placements, talent matching, CV guides, interview tips, and industry learning resources tailored to the local hiring landscape."
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
                  <h3 className="text-xl font-semibold text-foreground">{segment.title}</h3>
                  <p className="text-sm text-muted-foreground">{segment.description}</p>
                </div>
                <span className="mt-6 inline-flex items-center gap-2 text-sm font-medium text-primary group-hover:translate-x-1 group-hover:underline">
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
        <section className="container mx-auto px-4 mt-12">
          <div className="text-center space-y-3">
            <h2 className="text-2xl font-semibold text-foreground">Explore our resources and insights</h2>
            <p className="text-sm text-muted-foreground">
              Deepen your search with career guides, interview preparation, labour market research, and curated learning pathways for Uganda.
            </p>
          </div>
          <div className="mt-8 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
            {RESOURCE_HIGHLIGHTS.map((item) => (
              <Link
                key={item.href}
                to={item.href}
                className="group flex h-full flex-col rounded-lg border border-border/70 bg-background/80 p-6 shadow-sm transition hover:border-primary hover:bg-primary/5"
              >
                <span className="text-xs font-semibold uppercase tracking-wide text-primary/80">
                  {item.category}
                </span>
                <span className="mt-3 text-lg font-semibold text-foreground">{item.title}</span>
                <p className="mt-2 flex-1 text-sm text-muted-foreground">{item.description}</p>
                <span className="mt-4 text-sm font-medium text-primary group-hover:underline">
                  View resource
                </span>
              </Link>
            ))}
          </div>
        </section>
      </main>
    </div>
  );
};

export default Index;
