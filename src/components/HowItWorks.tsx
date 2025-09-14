import { Card, CardContent } from "@/components/ui/card";
import { Search, UserCheck, Send, MessageSquare } from "lucide-react";

const HowItWorks = () => {
  const steps = [
    {
      icon: Search,
      title: "Search & Filter",
      description: "Find placements by region, industry, field of study, and year level using our smart filters."
    },
    {
      icon: UserCheck,
      title: "Create Profile",
      description: "Build your student profile with university details, CV, and areas of interest."
    },
    {
      icon: Send,
      title: "Apply Instantly",
      description: "Submit applications with your CV and cover letter directly through the platform."
    },
    {
      icon: MessageSquare,
      title: "Get Connected",
      description: "Receive notifications when companies review your application and want to connect."
    }
  ];

  return (
    <section className="py-16 bg-secondary/20">
      <div className="container mx-auto px-4">
        <div className="text-center space-y-4 mb-12">
          <h2 className="text-3xl md:text-4xl font-bold text-foreground">
            How It Works
          </h2>
          <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
            Simple steps to find and secure your ideal internship placement
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {steps.map((step, index) => {
            const IconComponent = step.icon;
            return (
              <Card key={index} className="text-center border-primary/10 hover:border-primary/30 transition-colors">
                <CardContent className="pt-8 pb-6 space-y-4">
                  <div className="flex items-center justify-center w-16 h-16 bg-primary rounded-full mx-auto">
                    <IconComponent className="w-8 h-8 text-primary-foreground" />
                  </div>
                  <div className="space-y-2">
                    <h3 className="text-xl font-semibold text-foreground">{step.title}</h3>
                    <p className="text-muted-foreground">{step.description}</p>
                  </div>
                  <div className="w-8 h-8 bg-primary text-primary-foreground rounded-full flex items-center justify-center text-sm font-bold mx-auto">
                    {index + 1}
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      </div>
    </section>
  );
};

export default HowItWorks;