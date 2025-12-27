import Header from "@/components/Header";
import HeroSection from "@/components/HeroSection";
import SearchFilters from "@/components/SearchFilters";
import FeaturedPlacements from "@/components/FeaturedPlacements";
import HowItWorks from "@/components/HowItWorks";
import Footer from "@/components/Footer";
import SEO from "@/components/SEO";
import { HomepageAdsBanner } from "@/components/HomepageAdsBanner";

const Index = () => {
  const baseUrl = typeof window !== "undefined" ? window.location.origin : "https://careercompass.ug";

  return (
    <div className="min-h-screen bg-background">
      <SEO
        title="CareerCompass Uganda | Discover Placements, Internships, and Career Growth"
        description="CareerCompass connects Ugandan students and early-career professionals to internships, mentorship, and career resources tailored to the local hiring landscape."
        keywords={[
          "Uganda internships",
          "career compass Uganda",
          "graduate placements",
          "student placements Kampala",
          "early career growth Uganda",
        ]}
        canonical="/"
        jsonLd={{
          "@context": "https://schema.org",
          "@type": "WebSite",
          name: "CareerCompass Uganda",
          url: `${baseUrl}/`,
          potentialAction: {
            "@type": "SearchAction",
            target: `${baseUrl}/find-placements?keywords={search_term_string}`,
            "query-input": "required name=search_term_string",
          },
        }}
      />
      <Header />
      <main>
        <HeroSection />
        <div className="container mx-auto px-4 -mt-16 relative z-20">
          <SearchFilters />
        </div>
        <HomepageAdsBanner />
        <FeaturedPlacements />
        <HowItWorks />
      </main>
      <Footer />
    </div>
  );
};

export default Index;
