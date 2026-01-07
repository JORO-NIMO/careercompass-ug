import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Search, ArrowRight, Users, Building, MapPin } from "lucide-react";
import heroImage from "@/assets/hero-image.jpg";
import { Link } from "react-router-dom";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

const HeroSection = () => {
  const [memberCount, setMemberCount] = useState(0);
  const [partnerCount, setPartnerCount] = useState(0);

  useEffect(() => {
    const fetchStats = async () => {
      const { count: profiles } = await supabase.from("profiles").select("*", { count: "exact", head: true });
      const { count: companies } = await supabase.from("companies").select("*", { count: "exact", head: true });

      if (profiles) setMemberCount(profiles);
      if (companies) setPartnerCount(companies);
    };
    fetchStats();
  }, []);

  return (
    <section className="relative min-h-[500px] flex items-center bg-gradient-to-r from-primary/5 to-secondary/30 overflow-hidden">
      {/* Background Image */}
      <div className="absolute inset-0 z-0">
        <img
          src={heroImage}
          alt="Uganda learners, professionals, and employers collaborating"
          className="w-full h-full object-cover opacity-10"
        />
        <div className="absolute inset-0 bg-gradient-to-r from-background/95 to-background/80"></div>
      </div>

      <div className="container mx-auto px-4 relative z-10 py-12">
        <div className="max-w-4xl mx-auto text-center space-y-8">
          {/* Main Heading */}
          <div className="space-y-4">
            <h1 className="text-4xl md:text-6xl font-bold text-foreground leading-tight">
              Bridge to Your{" "}
              <span className="text-primary bg-gradient-to-r from-primary to-primary-dark bg-clip-text text-transparent">
                Future Career
              </span>
            </h1>
            <p className="text-xl md:text-2xl text-muted-foreground max-w-3xl mx-auto">
              Bridge Uganda's learners, professionals, and employers with opportunities that span education and careers. Discover internships, training, and roles curated by region, industry, and focus area.
            </p>
          </div>

          {/* Quick Search */}
          <div className="max-w-2xl mx-auto">
            <div className="flex flex-col sm:flex-row gap-3 p-2 bg-background border border-primary/40 rounded-lg shadow-lg">
              <div className="flex-1 relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-5 h-5" />
                <Input
                  placeholder="Search by company, title, or region..."
                  className="pl-10 border-0 bg-transparent text-lg h-12"
                />
              </div>
              <Link to="/find-placements">
                <Button variant="hero" size="lg" className="h-12 px-8">
                  Browse Opportunities
                  <ArrowRight className="w-5 h-5 ml-2" />
                </Button>
              </Link>
            </div>
          </div>

          {/* Stats */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 pt-8">
            <div className="text-center space-y-3">
              <div className="flex items-center justify-center w-20 h-20 bg-white shadow-sm rounded-full mx-auto border border-primary/20">
                <Users className="w-10 h-10 text-primary" />
              </div>
              <div className="text-4xl font-bold text-gray-900">{memberCount > 0 ? memberCount.toLocaleString() + '+' : '1000+'}</div>
              <p className="text-base font-medium text-gray-700">Active Members</p>
            </div>
            <div className="text-center space-y-3">
              <div className="flex items-center justify-center w-20 h-20 bg-white shadow-sm rounded-full mx-auto border border-primary/20">
                <Building className="w-10 h-10 text-primary" />
              </div>
              <div className="text-4xl font-bold text-gray-900">{partnerCount > 0 ? partnerCount.toLocaleString() + '+' : '200+'}</div>
              <p className="text-base font-medium text-gray-700">Partner Organizations</p>
            </div>
            <div className="text-center space-y-3">
              <div className="flex items-center justify-center w-20 h-20 bg-white shadow-sm rounded-full mx-auto border border-primary/20">
                <MapPin className="w-10 h-10 text-primary" />
              </div>
              <div className="text-4xl font-bold text-gray-900">Nationwide</div>
              <p className="text-base font-medium text-gray-700">Aggregating Accredited Info</p>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};

export default HeroSection;