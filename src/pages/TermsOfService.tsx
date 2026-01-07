import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";

const TermsOfService = () => {
  return (
    <div className="min-h-screen bg-background text-foreground flex flex-col">
      <main className="flex-1 container mx-auto max-w-7xl px-4 py-2">
        <div className="flex flex-col h-[calc(100vh-100px)]">
          <div className="space-y-2 text-center flex-shrink-0 mb-2">
            <h1 className="text-2xl font-bold tracking-tight lg:text-3xl text-primary">Terms of Service User Agreement</h1>
            <div className="flex flex-col md:flex-row justify-center items-center gap-2 text-xs text-muted-foreground">
              <span><strong>Last Updated:</strong> Jan 6, 2026</span>
              <span className="hidden md:inline">•</span>
              <span><strong>Jurisdiction:</strong> Uganda</span>
              <span className="hidden md:inline">•</span>
              <span><strong>Admin:</strong> info@placementbridge.org</span>
            </div>
            <p className="max-w-3xl mx-auto text-muted-foreground text-xs">
              Please read these administrative protocols carefully. They define the legal boundaries of your relationship with PlacementBridge.
            </p>
          </div>

          <Separator className="mb-6" />

          <ScrollArea className="flex-grow pr-6 -mr-6">
            <article className="prose dark:prose-invert max-w-none text-foreground/90 pb-12">
              <section className="mb-10">
                <p className="text-lg leading-relaxed">
                  Welcome to <strong>PlacementBridge</strong>. This document serves as the comprehensive administrative contract between you ("the User") and PlacementBridge ("the Platform"). By accessing our services, you agree to submit to the administrative procedures, liability limitations, and community standards outlined below.
                </p>
              </section>

              <div className="grid md:grid-cols-1 gap-10">
                <section>
                  <h2 className="text-2xl font-bold text-primary mb-4 border-b border-border pb-2">1. Platform Administration & Intermediary Role</h2>
                  <div className="space-y-3">
                    <p>
                      <strong>1.1 Digital Intermediary Status:</strong> PlacementBridge acts exclusively as a data processor and digital intermediary. We provide the infrastructure to host profiles and opportunities but do not function as a recruitment agency, employer of record, or guarantor of employment. Our role is strictly administrative: to verify entity existence and facilitate communication.
                    </p>
                    <p>
                      <strong>1.2 Verification Limits:</strong> While we employ administrative checks (e.g., verifying partner domains, reviewing student IDs), we cannot digitally guarantee the absolute intent or capacity of any user. Users engage in off-platform contracts (employment, internships) at their own risk.
                    </p>
                    <p>
                      <strong>1.3 Service Continuity:</strong> We reserve the administrative right to modify, suspend, or discontinue any feature (e.g., Scholarship Search, CV Builder) for maintenance, legal compliance, or business pivots without liability for lost data or opportunities.
                    </p>
                  </div>
                </section>

                <section>
                  <h2 className="text-2xl font-bold text-primary mb-4 border-b border-border pb-2">2. Account Administration & Protocols</h2>
                  <div className="space-y-3">
                    <p>
                      <strong>2.1 Identity Integrity:</strong> To maintain a trusted ecosystem, we enforce a strict "Real Identity" policy. Pseudonyms, shared accounts, and impersonation are administratively prohibited. Partners must use official organization domains for registration where possible.
                    </p>
                    <p>
                      <strong>2.2 Credential Liability:</strong> You are the sole administrator of your account credentials. You accept full administrative responsibility for all actions logged under your session. If a third party uses your account to violate these terms, your account will be suspended regardless of intent.
                    </p>
                    <p>
                      <strong>2.3 Dormancy Policy:</strong> To optimize platform performance, accounts that remain inactive for a period exceeding 12 consecutive months may be administratively archived or permanently deleted. We will attempt to notify the registered email prior to deletion.
                    </p>
                  </div>
                </section>

                <section>
                  <h2 className="text-2xl font-bold text-primary mb-4 border-b border-border pb-2">3. Content Moderation & Compliance</h2>
                  <div className="space-y-3">
                    <p>
                      <strong>3.1 Job Posting Standards:</strong> All notices posted by Partners undergo administrative review. We strictly remove listings that:
                    </p>
                    <ul className="list-disc pl-6 space-y-1">
                      <li>Require payment from applicants (scam protection).</li>
                      <li>Violate the <em>Employment Act of Uganda</em> regarding discrimination or minimum wage.</li>
                      <li>Contain vague descriptions or misleading promises of "easy wealth".</li>
                    </ul>
                    <p>
                      <strong>3.2 User-Generated Content:</strong> By engaging in our community forums or messaging systems, you grant us the administrative right to moderate, hide, or delete content that contains harassment, hate speech, or commercial spam. This moderation decision is final and not subject to appeal.
                    </p>
                  </div>
                </section>

                <section>
                  <h2 className="text-2xl font-bold text-primary mb-4 border-b border-border pb-2">4. Intellectual Property & Data Licensing</h2>
                  <div className="space-y-3">
                    <p>
                      <strong>4.1 Platform Rights:</strong> The underlying code, matching algorithms, UI design, and "PlacementBridge" trademark are the exclusive intellectual property of the Platform. Reverse engineering or scraping our database is a violation of our Terms and liable for prosecution.
                    </p>
                    <p>
                      <strong>4.2 User License:</strong> When you upload a CV or Company Logo, you retain copyright but grant PlacementBridge a worldwide, royalty-free administrative license to display, parse, format, and share this content with verified matches to fulfill the service's purpose.
                    </p>
                  </div>
                </section>

                <section>
                  <h2 className="text-2xl font-bold text-primary mb-4 border-b border-border pb-2">5. Data Privacy & Administrative Processing</h2>
                  <div className="space-y-3">
                    <p>
                      <strong>5.1 Compliance:</strong> Our administrative data handling procedures are designed to comply with the <em>Data Protection and Privacy Act, 2019</em>. We act as Data Controllers for account info and Data Processors for CV contents.
                    </p>
                    <p>
                      <strong>5.2 Data Minimization:</strong> We administratively enforce data minimization. We do not sell user data to advertisers. Contact details are only revealed when a mutual interest is established (e.g., applying for a job or accepting a connection request).
                    </p>
                  </div>
                </section>

                <section>
                  <h2 className="text-2xl font-bold text-primary mb-4 border-b border-border pb-2">6. Limitation of Liability & Indemnity</h2>
                  <div className="space-y-3">
                    <p>
                      <strong>6.1 "As Is" Provision:</strong> The Platform is provided on an "as is" and "as available" basis. We administratively disclaim all warranties regarding the accuracy of partner data or the success of any job application.
                    </p>
                    <p>
                      <strong>6.2 Indemnification:</strong> You agree to indemnify and hold PlacementBridge harmless from any claims, legal fees, or damages arising from your violation of these terms, your posted content, or your off-platform conduct with other users.
                    </p>
                  </div>
                </section>

                <section>
                  <h2 className="text-2xl font-bold text-primary mb-4 border-b border-border pb-2">7. Termination & Appeals</h2>
                  <div className="space-y-3">
                    <p>
                      <strong>7.1 Involuntary Termination:</strong> We reserve the administrative right to immediately terminate access for "Major Violations," including fraud, harassment, or security breaches.
                    </p>
                    <p>
                      <strong>7.2 Appeals Process:</strong> If your account is suspended, you may submit a formal administrative appeal to <em>info@placementbridge.org</em> within 14 days. Our legal team's decision on reinstatement is final.
                    </p>
                  </div>
                </section>

                <section>
                  <h2 className="text-2xl font-bold text-primary mb-4 border-b border-border pb-2">8. Governing Law</h2>
                  <div className="space-y-3">
                    <p>
                      These Administrative Terms shall be governed, construed, and enforced in accordance with the laws of the <strong>Republic of Uganda</strong>. Any disputes that cannot be resolved through our internal administrative resolution channels shall be subject to the exclusive jurisdiction of the Ugandan courts.
                    </p>
                  </div>
                </section>

                <section className="bg-secondary/10 p-6 rounded-xl border border-secondary">
                  <h2 className="text-2xl font-bold text-primary mb-4">9. Administrative Contact</h2>
                  <p className="mb-4">
                    For legal notices, data erasure requests, or formal administrative inquiries, please direct your correspondence to our dedicated support channel:
                  </p>
                  <div className="flex flex-col sm:flex-row gap-8">
                    <div>
                      <h3 className="font-semibold text-foreground">General Administration</h3>
                      <a href="mailto:info@placementbridge.org" className="text-primary hover:underline text-lg">info@placementbridge.org</a>
                    </div>
                    <div>
                      <h3 className="font-semibold text-foreground">Registered Location</h3>
                      <p className="text-muted-foreground">Kampala, Uganda</p>
                    </div>
                  </div>
                </section>
              </div>
            </article>
          </ScrollArea>
        </div>
      </main>
    </div>
  );
};

export default TermsOfService;
