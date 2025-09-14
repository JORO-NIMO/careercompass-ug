import Header from "@/components/Header";
import Footer from "@/components/Footer";
import SearchFilters from "@/components/SearchFilters";
import FeaturedPlacements from "@/components/FeaturedPlacements";

const FindPlacements = () => {
  return (
    <div className="min-h-screen bg-background">
      <Header />
      <main>
        <div className="bg-gradient-to-br from-primary via-primary-glow to-primary-dark text-primary-foreground">
          <div className="container mx-auto px-4 py-16">
            <div className="text-center space-y-6">
              <h1 className="text-4xl md:text-5xl font-bold">
                Find Your Perfect Placement
              </h1>
              <p className="text-xl text-primary-foreground/90 max-w-2xl mx-auto">
                Search through available internship opportunities across Uganda
              </p>
            </div>
          </div>
        </div>
        
        <div className="container mx-auto px-4 -mt-16 relative z-20">
          <SearchFilters />
        </div>
        
        <FeaturedPlacements />
      </main>
      <Footer />
    </div>
  );
};

export default FindPlacements;