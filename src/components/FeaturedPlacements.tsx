import PlacementCard from "./PlacementCard";
import { Button } from "@/components/ui/button";
import { ArrowRight } from "lucide-react";

const FeaturedPlacements = () => {
  // Sample placement data
  const placements = [
    {
      id: "1",
      title: "Software Engineering Intern",
      company: "Andela Uganda",
      location: "Kampala",
      region: "Central Region",
      industry: "Technology",
      stipend: "800,000 UGX/month",
      slots: 5,
      postedDate: "2 days ago",
      description: "Join our engineering team to build world-class software solutions. You'll work with modern technologies and contribute to real projects.",
      remote: true,
      verified: true
    },
    {
      id: "2",
      title: "Financial Analyst Intern",
      company: "Stanbic Bank Uganda",
      location: "Kampala",
      region: "Central Region", 
      industry: "Banking & Finance",
      stipend: "600,000 UGX/month",
      slots: 3,
      postedDate: "1 week ago",
      description: "Gain hands-on experience in financial analysis, risk assessment, and banking operations in one of Uganda's leading banks.",
      remote: false,
      verified: true
    },
    {
      id: "3",
      title: "Agricultural Research Intern",
      company: "NARO Uganda",
      location: "Entebbe",
      region: "Central Region",
      industry: "Agriculture",
      stipend: "400,000 UGX/month",
      slots: 8,
      postedDate: "3 days ago",
      description: "Support agricultural research initiatives focused on crop improvement and sustainable farming practices across Uganda.",
      remote: false,
      verified: true
    },
    {
      id: "4",
      title: "Marketing Intern",
      company: "MTN Uganda",
      location: "Kampala",
      region: "Central Region",
      industry: "Telecommunications",
      stipend: "500,000 UGX/month",
      slots: 4,
      postedDate: "5 days ago",
      description: "Join our marketing team to develop creative campaigns and gain experience in brand management and digital marketing.",
      remote: true,
      verified: true
    },
    {
      id: "5",
      title: "Healthcare Administration Intern",
      company: "Mulago Hospital",
      location: "Kampala",
      region: "Central Region",
      industry: "Healthcare",
      stipend: "300,000 UGX/month",
      slots: 6,
      postedDate: "1 week ago",
      description: "Support hospital administration and gain insights into healthcare management and patient care coordination.",
      remote: false,
      verified: true
    },
    {
      id: "6",
      title: "Education Program Intern",
      company: "Teach for Uganda",
      location: "Gulu",
      region: "Northern Region",
      industry: "Education",
      slots: 10,
      postedDate: "4 days ago",
      description: "Support educational programs and teaching initiatives in rural communities across Northern Uganda.",
      remote: false,
      verified: true
    }
  ];

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
          {placements.map((placement) => (
            <PlacementCard key={placement.id} {...placement} />
          ))}
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