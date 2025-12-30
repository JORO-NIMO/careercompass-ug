import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Mail, MessageCircle, LifeBuoy, Clock, ShieldCheck } from "lucide-react";

const Support = () => {
  return (
    <div className="min-h-screen bg-background relative overflow-hidden">
      <Header />

      {/* Background Decorative Elements */}
      <div className="absolute top-0 left-0 w-full h-96 bg-gradient-to-b from-primary/5 to-transparent pointer-events-none" />

      <main className="py-20 relative z-10">
        <div className="container mx-auto px-4 max-w-6xl space-y-16">
          <section className="text-center space-y-6">
            <Badge variant="outline" className="px-4 py-1 text-primary border-primary/20 bg-primary/5 uppercase tracking-widest text-[10px] font-bold">
              Support Center
            </Badge>
            <h1 className="text-4xl md:text-5xl font-extrabold tracking-tight">How can we help you?</h1>
            <p className="text-lg text-muted-foreground max-w-3xl mx-auto">
              Our dedicated team is ready to assist you. Whether you're an individual seeking growth or an organization looking for talent, we've structured our support to get you moving fast.
            </p>
          </section>

          <div className="grid gap-8 md:grid-cols-3">
            <Card className="border-border hover:border-primary/30 transition-all hover:shadow-md bg-card/50 backdrop-blur-sm">
              <CardContent className="pt-8 space-y-4 text-center">
                <div className="w-12 h-12 bg-primary/10 rounded-full flex items-center justify-center mx-auto mb-2">
                  <LifeBuoy className="h-6 w-6 text-primary" />
                </div>
                <h2 className="text-xl font-bold">Resource Hub</h2>
                <p className="text-sm text-muted-foreground leading-relaxed">
                  Self-service walkthroughs on publishing opportunities, building talent profiles, and navigating the platform.
                </p>
                <Button variant="outline" className="w-full" asChild>
                  <a href="/learning">Explore guides</a>
                </Button>
              </CardContent>
            </Card>

            <Card className="border-primary/40 shadow-lg bg-card ring-1 ring-primary/20 scale-105 relative">
              <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                <Badge className="bg-primary text-primary-foreground border-none">Most Responsive</Badge>
              </div>
              <CardContent className="pt-8 space-y-4 text-center">
                <div className="w-12 h-12 bg-primary rounded-full flex items-center justify-center mx-auto mb-2 shadow-lg shadow-primary/20">
                  <Mail className="h-6 w-6 text-primary-foreground" />
                </div>
                <h2 className="text-xl font-bold">Company Info Helpline</h2>
                <p className="text-sm text-muted-foreground leading-relaxed">
                  For organizations requiring assistance with registration, listing upgrades, or partnership inquiries.
                </p>
                <Button className="w-full shadow-lg shadow-primary/20" asChild>
                  <a href="mailto:info@placementbridge.org">Contact Helpline</a>
                </Button>
                <div className="text-[10px] font-bold text-primary/70 uppercase">info@placementbridge.org</div>
              </CardContent>
            </Card>

            <Card className="border-border hover:border-primary/30 transition-all hover:shadow-md bg-card/50 backdrop-blur-sm">
              <CardContent className="pt-8 space-y-4 text-center">
                <div className="w-12 h-12 bg-primary/10 rounded-full flex items-center justify-center mx-auto mb-2">
                  <MessageCircle className="h-6 w-6 text-primary" />
                </div>
                <h2 className="text-xl font-bold">Account Support</h2>
                <p className="text-sm text-muted-foreground leading-relaxed">
                  Facing account-specific issues or need to report concerns? Share your feedback directly with our product team.
                </p>
                <Button variant="outline" className="w-full" asChild>
                  <a href="/feedback">Open Ticket</a>
                </Button>
              </CardContent>
            </Card>
          </div>

          <div className="grid gap-8 md:grid-cols-2">
            <Card className="border-border bg-muted/20">
              <CardContent className="pt-8 space-y-4">
                <h2 className="text-2xl font-bold flex items-center gap-2 text-foreground">
                  <Clock className="w-5 h-5 text-primary" />
                  Response Times
                </h2>
                <div className="space-y-3 text-muted-foreground leading-relaxed">
                  <p>
                    Our support team operates Monday through Friday, 8:00 AM – 5:00 PM (EAT). We typically respond to all inquiries within **two working days**.
                  </p>
                  <div className="p-4 bg-amber-500/10 border border-amber-500/20 rounded-lg">
                    <p className="text-sm font-semibold text-amber-700 dark:text-amber-400">
                      🚨 Urgent Concerns
                    </p>
                    <p className="text-sm mt-1">
                      If you are reporting fraudulent activity or a security breach, please include "URGENT" in your subject line for escalated priority.
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="border-border bg-muted/20">
              <CardContent className="pt-8 space-y-4">
                <h2 className="text-2xl font-bold flex items-center gap-2 text-foreground">
                  <ShieldCheck className="w-5 h-5 text-primary" />
                  Genuinely Structured for You
                </h2>
                <div className="space-y-4 text-muted-foreground text-sm leading-relaxed">
                  <div className="flex gap-3">
                    <div className="w-6 h-6 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0 text-primary font-bold">1</div>
                    <p><strong>Verified Entities:</strong> All company inquiries are cross-referenced with our verification database for security.</p>
                  </div>
                  <div className="flex gap-3">
                    <div className="w-6 h-6 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0 text-primary font-bold">2</div>
                    <p><strong>Secure Data:</strong> We handle all support requests in compliance with our data protection policies.</p>
                  </div>
                  <div className="flex gap-3">
                    <div className="w-6 h-6 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0 text-primary font-bold">3</div>
                    <p><strong>Audit Trail:</strong> All correspondence is logged to ensure consistent service quality across your journey.</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </main>
      <Footer />
    </div>
  );
};

export default Support;
