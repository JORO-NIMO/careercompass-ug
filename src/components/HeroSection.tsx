import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Search, ArrowRight, Users, Building, MapPin } from "lucide-react";
import heroImage from "@/assets/hero-image.jpg";

const HeroSection = () => {
  return (
    <section className="relative min-h-[600px] flex items-center bg-gradient-to-r from-primary/5 to-secondary/30 overflow-hidden">
      {/* Background Image */}
      <div className="absolute inset-0 z-0">
        <img 
          src={heroImage} 
          alt="Uganda students and professionals collaborating" 
          className="w-full h-full object-cover opacity-10"
        />
        <div className="absolute inset-0 bg-gradient-to-r from-background/95 to-background/80"></div>
      </div>

      <div className="container mx-auto px-4 relative z-10">
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
              Connect Uganda's brightest students with leading companies. Find your perfect internship placement by region, industry, and field of study.
            </p>
          </div>

          {/* Quick Search */}
          <div className="max-w-2xl mx-auto">
            <div className="flex flex-col sm:flex-row gap-3 p-2 bg-background border border-primary/20 rounded-lg shadow-lg">
              <div className="flex-1 relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-5 h-5" />
                <Input 
                  placeholder="Search by company, title, or region..."
                  className="pl-10 border-0 bg-transparent text-lg h-12"
                />
              </div>
              <Button variant="hero" size="lg" className="h-12 px-8">
                Find Placements
                <ArrowRight className="w-5 h-5 ml-2" />
              </Button>
            </div>
          </div>

          {/* Stats */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 pt-8">
            <div className="text-center space-y-2">
              <div className="flex items-center justify-center w-16 h-16 bg-primary-light rounded-full mx-auto">
                <Users className="w-8 h-8 text-primary" />
              </div>
              <div className="text-3xl font-bold text-foreground">1000+</div>
              <p className="text-muted-foreground">Active Students</p>
            </div>
            <div className="text-center space-y-2">
              <div className="flex items-center justify-center w-16 h-16 bg-primary-light rounded-full mx-auto">
                <Building className="w-8 h-8 text-primary" />
              </div>
              <div className="text-3xl font-bold text-foreground">200+</div>
              <p className="text-muted-foreground">Partner Companies</p>
            </div>
            <div className="text-center space-y-2">
              <div className="flex items-center justify-center w-16 h-16 bg-primary-light rounded-full mx-auto">
                <MapPin className="w-8 h-8 text-primary" />
              </div>
              <div className="text-3xl font-bold text-foreground">4</div>
              <p className="text-muted-foreground">Regions Covered</p>
            </div>
          </div>

          {/* CTAs */}
          <div className="flex flex-col sm:flex-row gap-4 justify-center pt-8">
            <Button variant="hero" size="lg" className="min-w-[200px]">
              I'm a Student
            </Button>
            <Button variant="outline" size="lg" className="min-w-[200px]">
              I'm a Company
            </Button>
          </div>
        </div>
      </div>
    </section>
  );
};

export default HeroSection;