import Header from "@/components/Header";
import HeroSection from "@/components/HeroSection";
import SearchFilters from "@/components/SearchFilters";
import FeaturedPlacements from "@/components/FeaturedPlacements";
import HowItWorks from "@/components/HowItWorks";
import Footer from "@/components/Footer";
import { HomepageAdsBanner } from "@/components/HomepageAdsBanner";

const Index = () => {
  return (
    <div className="min-h-screen bg-background">
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
