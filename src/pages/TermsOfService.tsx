import Header from "@/components/Header";
import Footer from "@/components/Footer";
import { Card, CardContent } from "@/components/ui/card";

const TermsOfService = () => {
  return (
    <div className="min-h-screen bg-background">
      <Header />
      <main className="py-12">
        <div className="container mx-auto px-4 max-w-4xl space-y-10">
          <section className="space-y-4">
            <h1 className="text-4xl font-bold">Terms of Service</h1>
            <p className="text-muted-foreground">
              These Terms govern your use of PlacementsBridge. By accessing our services you agree to comply with the responsibilities outlined here and with all applicable laws in Uganda.
            </p>
            <p className="text-sm text-muted-foreground">Effective date: December 24, 2025</p>
          </section>

          <Card>
            <CardContent className="space-y-6 pt-6">
              <div className="space-y-2">
                <h2 className="text-2xl font-semibold">Using PlacementsBridge</h2>
                <p className="text-muted-foreground">
                  You must provide accurate information when creating an account, posting placements, or applying to opportunities. We reserve the right to moderate content that violates our code of conduct or misrepresents an opportunity.
                </p>
              </div>

              <div className="space-y-2">
                <h2 className="text-2xl font-semibold">User Responsibilities</h2>
                <p className="text-muted-foreground">
                  Candidates agree to apply respectfully and provide truthful qualifications. Employers agree to share legitimate placement opportunities, honour interviews offered, and keep applicant data confidential.
                </p>
              </div>

              <div className="space-y-2">
                <h2 className="text-2xl font-semibold">Prohibited Conduct</h2>
                <p className="text-muted-foreground">
                  You may not use PlacementsBridge for fraudulent listings, spam outreach, or any activity that harms other users. Attempts to bypass security controls or harvest data are strictly prohibited and may lead to legal action.
                </p>
              </div>

              <div className="space-y-2">
                <h2 className="text-2xl font-semibold">Service Changes</h2>
                <p className="text-muted-foreground">
                  We may update or discontinue elements of PlacementsBridge as we improve the platform. Material changes to these Terms will be announced through the site or by email with reasonable notice.
                </p>
              </div>

              <div className="space-y-2">
                <h2 className="text-2xl font-semibold">Contact</h2>
                <p className="text-muted-foreground">
                  For questions about these Terms or to report misuse, email support@placementsbridge.com. We review all reports promptly and work to maintain a safe hiring community.
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

export default TermsOfService;
