import Header from "@/components/Header";
import Footer from "@/components/Footer";
import { Card, CardContent } from "@/components/ui/card";
import { Users, Target, Globe, Award } from "lucide-react";

const About = () => {
  return (
    <div className="min-h-screen bg-background">
      <Header />
      <main>
        {/* Hero Section */}
        <div className="bg-gradient-to-br from-primary via-primary-glow to-primary-dark text-primary-foreground">
          <div className="container mx-auto px-4 py-16">
            <div className="text-center space-y-6">
              <h1 className="text-4xl md:text-5xl font-bold">
                About PlacementsBridge
              </h1>
              <p className="text-xl text-primary-foreground/90 max-w-3xl mx-auto">
                Connecting Uganda's brightest students with leading companies to build the future together
              </p>
            </div>
          </div>
        </div>

        {/* Mission Section */}
        <section className="py-16">
          <div className="container mx-auto px-4">
            <div className="max-w-4xl mx-auto text-center space-y-6">
              <h2 className="text-3xl font-bold">Our Mission</h2>
              <p className="text-lg text-muted-foreground">
                PlacementsBridge was created to solve the gap between talented university students in Uganda 
                and companies seeking fresh talent. We believe that every student deserves access to quality 
                internship opportunities, and every company should be able to find the right candidates easily.
              </p>
            </div>
          </div>
        </section>

        {/* Statistics */}
        <section className="py-16 bg-secondary/20">
          <div className="container mx-auto px-4">
            <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
              <Card className="text-center">
                <CardContent className="pt-8 pb-6">
                  <Users className="w-12 h-12 text-primary mx-auto mb-4" />
                  <div className="text-3xl font-bold text-foreground">1000+</div>
                  <p className="text-muted-foreground">Students Registered</p>
                </CardContent>
              </Card>
              <Card className="text-center">
                <CardContent className="pt-8 pb-6">
                  <Target className="w-12 h-12 text-primary mx-auto mb-4" />
                  <div className="text-3xl font-bold text-foreground">200+</div>
                  <p className="text-muted-foreground">Companies</p>
                </CardContent>
              </Card>
              <Card className="text-center">
                <CardContent className="pt-8 pb-6">
                  <Globe className="w-12 h-12 text-primary mx-auto mb-4" />
                  <div className="text-3xl font-bold text-foreground">50+</div>
                  <p className="text-muted-foreground">Universities</p>
                </CardContent>
              </Card>
              <Card className="text-center">
                <CardContent className="pt-8 pb-6">
                  <Award className="w-12 h-12 text-primary mx-auto mb-4" />
                  <div className="text-3xl font-bold text-foreground">500+</div>
                  <p className="text-muted-foreground">Successful Placements</p>
                </CardContent>
              </Card>
            </div>
          </div>
        </section>

        {/* Values Section */}
        <section className="py-16">
          <div className="container mx-auto px-4">
            <h2 className="text-3xl font-bold text-center mb-12">Our Values</h2>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
              <div className="text-center space-y-4">
                <h3 className="text-xl font-semibold">Accessibility</h3>
                <p className="text-muted-foreground">
                  Making internship opportunities accessible to students from all backgrounds across Uganda
                </p>
              </div>
              <div className="text-center space-y-4">
                <h3 className="text-xl font-semibold">Quality</h3>
                <p className="text-muted-foreground">
                  Ensuring high-quality placements that provide real learning and growth opportunities
                </p>
              </div>
              <div className="text-center space-y-4">
                <h3 className="text-xl font-semibold">Innovation</h3>
                <p className="text-muted-foreground">
                  Using technology to create smarter matching between students and companies
                </p>
              </div>
            </div>
          </div>
        </section>
      </main>
      <Footer />
    </div>
  );
};

export default About;