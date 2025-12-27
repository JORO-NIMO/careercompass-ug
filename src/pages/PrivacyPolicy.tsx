import Header from "@/components/Header";
import Footer from "@/components/Footer";
import { Card, CardContent } from "@/components/ui/card";

const PrivacyPolicy = () => {
  return (
    <div className="min-h-screen bg-background">
      <Header />
      <main className="py-12">
        <div className="container mx-auto px-4 max-w-4xl space-y-10">
          <section className="space-y-4">
            <h1 className="text-4xl font-bold">Privacy Policy</h1>
            <p className="text-muted-foreground">
              This Privacy Policy explains how PlacementsBridge collects, uses, and protects your information when you interact with our platform. We are committed to safeguarding your privacy while helping you discover opportunities and talent across Uganda.
            </p>
            <p className="text-sm text-muted-foreground">Last updated: December 24, 2025</p>
          </section>

          <Card>
            <CardContent className="space-y-6 pt-6">
              <div className="space-y-2">
                <h2 className="text-2xl font-semibold">Information We Collect</h2>
                <p className="text-muted-foreground">
                  We collect the information you provide when creating an account, completing a profile, publishing an opportunity, or contacting our team. This includes identifiers such as your name, email address, and organisation details, as well as optional profile data like experience level, skills, and availability.
                </p>
              </div>

              <div className="space-y-2">
                <h2 className="text-2xl font-semibold">How We Use Your Information</h2>
                <p className="text-muted-foreground">
                  We use your information to operate and improve PlacementsBridge, facilitate matches between candidates and employers, send service updates, and provide support. We may also use aggregated, anonymised data for insights that help our community understand hiring trends.
                </p>
              </div>

              <div className="space-y-2">
                <h2 className="text-2xl font-semibold">Sharing Your Data</h2>
                <p className="text-muted-foreground">
                  We only share personal information with your consent, to deliver opportunity introductions, or when required by law. Employers can view candidate profiles that have opted into discovery, and candidates can view organization details included in published opportunities.
                </p>
              </div>

              <div className="space-y-2">
                <h2 className="text-2xl font-semibold">Your Choices</h2>
                <p className="text-muted-foreground">
                  You can update or delete your profile at any time from the account dashboard. To request a full export or deletion of your data, contact support@placementsbridge.com and we will respond within ten working days.
                </p>
              </div>

              <div className="space-y-2">
                <h2 className="text-2xl font-semibold">Security</h2>
                <p className="text-muted-foreground">
                  We use Supabase authentication, row-level policies, and encryption in transit to keep your information safe. While no system is perfectly secure, we continuously monitor for vulnerabilities and follow best practices to protect your data.
                </p>
              </div>
            </CardContent>
          </Card>
        </div>
      </main>
      <Footer />
    </div>
  );
};

export default PrivacyPolicy;
