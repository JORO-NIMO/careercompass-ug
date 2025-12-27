import Header from "@/components/Header";
import Footer from "@/components/Footer";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Mail, MessageCircle, LifeBuoy } from "lucide-react";

const Support = () => {
  return (
    <div className="min-h-screen bg-background">
      <Header />
      <main className="py-12">
        <div className="container mx-auto px-4 max-w-5xl space-y-12">
          <section className="text-center space-y-4">
            <h1 className="text-4xl font-bold">Support</h1>
            <p className="text-lg text-muted-foreground">
              Need help navigating PlacementsBridge? Reach out to our team for platform guidance, account questions, or reporting concerns across learning and employment journeys.
            </p>
          </section>

          <div className="grid gap-6 md:grid-cols-3">
            <Card>
              <CardContent className="pt-6 space-y-3 text-center">
                <LifeBuoy className="h-8 w-8 text-primary mx-auto" />
                <h2 className="text-xl font-semibold">Help Centre</h2>
                <p className="text-sm text-muted-foreground">
                  Browse walkthroughs on publishing opportunities, managing applications, and building talent profiles.
                </p>
                <Button variant="outline" asChild>
                  <a href="/learning">Visit the resource hub</a>
                </Button>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-6 space-y-3 text-center">
                <Mail className="h-8 w-8 text-primary mx-auto" />
                <h2 className="text-xl font-semibold">Email Support</h2>
                <p className="text-sm text-muted-foreground">
                  For account-specific issues or data requests, contact our support inbox and include your account email.
                </p>
                <Button asChild>
                  <a href="mailto:support@placementsbridge.com">Email us</a>
                </Button>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-6 space-y-3 text-center">
                <MessageCircle className="h-8 w-8 text-primary mx-auto" />
                <h2 className="text-xl font-semibold">Feedback</h2>
                <p className="text-sm text-muted-foreground">
                  Share product ideas or report bugs so we can keep improving the experience for learners, professionals, and partners.
                </p>
                <Button variant="ghost" asChild>
                  <a href="/feedback">Submit feedback</a>
                </Button>
              </CardContent>
            </Card>
          </div>

          <Card>
            <CardContent className="pt-6 space-y-3">
              <h2 className="text-2xl font-semibold">Response Times</h2>
              <p className="text-muted-foreground">
                Our support team replies within two working days. If your request is urgent—such as reporting fraudulent activity—include "URGENT" in the subject line so we can prioritise it.
              </p>
              <p className="text-muted-foreground">
                For routine questions, please check the help centre first. Most common issues, like resetting a password or updating opportunity details, have step-by-step guides available.
              </p>
            </CardContent>
          </Card>
        </div>
      </main>
      <Footer />
    </div>
  );
};

export default Support;
