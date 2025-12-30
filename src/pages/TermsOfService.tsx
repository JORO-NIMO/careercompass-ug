import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";

const TermsOfService = () => {
  return (
    <div className="min-h-screen bg-background text-foreground">
      <Header />
      <main className="py-12 container mx-auto px-4 max-w-5xl">
        <div className="space-y-8">

          {/* Header Section */}
          <div className="text-center space-y-4">
            <h1 className="text-4xl font-extrabold tracking-tight lg:text-5xl">
              Terms of Service & Usage Agreements
            </h1>
            <p className="text-xl text-muted-foreground">
              Constitutional Preamble & The "100-Page" Master Index
            </p>
            <p className="text-sm text-muted-foreground/80">
              Last Updated: December 30, 2025 | Governing Law: Republic of Uganda
            </p>
          </div>

          <Separator />

          {/* I. Constitutional Preamble */}
          <Card className="border-l-4 border-l-primary/60">
            <CardHeader>
              <CardTitle className="text-2xl font-serif italic">
                I. Constitutional Preamble (The "Ugandan Spirit")
              </CardTitle>
            </CardHeader>
            <CardContent className="prose dark:prose-invert max-w-none">
              <p>
                These Terms are grounded in the <strong>Constitution of the Republic of Uganda (1995)</strong>,
                specifically acknowledging <strong>Article 27 (Right to Privacy)</strong>,
                <strong>Article 21 (Equality and Freedom from Discrimination)</strong>, and
                <strong>Article 40 (Economic Rights)</strong>.
              </p>
              <p>
                PlacementBridge operates as a facilitator of the right to work and education, ensuring that all
                placements are conducted with dignity and without exploitation. We affirm our commitment to
                upholding the dignity of every student and employer utilizing this platform.
              </p>
            </CardContent>
          </Card>

          {/* Master Index */}
          <div className="grid md:grid-cols-3 gap-6">
            <div className="md:col-span-1">
              <Card className="h-full sticky top-24">
                <CardHeader>
                  <CardTitle className="text-lg">Master Index</CardTitle>
                </CardHeader>
                <CardContent>
                  <ScrollArea className="h-[60vh] pr-4">
                    <ul className="space-y-2 text-sm">
                      <li><a href="#schedule-a" className="hover:underline text-primary">Schedule A: General Terms</a></li>
                      <li><a href="#schedule-b" className="hover:underline text-primary">Schedule B: Privacy Policy (Link)</a></li>
                      <li><a href="#schedule-c" className="hover:underline text-primary">Schedule C: Internship Standards</a></li>
                      <li><a href="#schedule-d" className="hover:underline text-primary">Schedule D: Employer SLA</a></li>
                      <li><a href="#schedule-e" className="hover:underline text-primary">Schedule E: Dispute Resolution</a></li>
                      <li><a href="#schedule-f" className="hover:underline text-primary">Schedule F: Acceptable Use</a></li>
                      <li><a href="#schedule-g" className="hover:underline text-primary">Schedule G: Community Guidelines</a></li>
                      <li><a href="#annexes" className="hover:underline text-primary">Operational Annexes</a></li>
                    </ul>
                  </ScrollArea>
                </CardContent>
              </Card>
            </div>

            {/* Content Area */}
            <div className="md:col-span-2 space-y-12">

              {/* Schedule A */}
              <section id="schedule-a" className="space-y-4 scroll-mt-24">
                <h2 className="text-3xl font-bold border-b pb-2">Schedule A: General Terms of Service</h2>
                <div className="space-y-4">
                  <h3 className="text-xl font-semibold">1. User Eligibility & Capacity</h3>
                  <p className="text-muted-foreground">
                    In accordance with the <strong>Contracts Act (2010)</strong>, users must be 18 years of age or older to enter into a binding agreement.
                    Students under 18 must have parental consent to use the platform, aligned with the <strong>Children Act (Cap 59)</strong>.
                    By registering, you warrant that you are legally capable of entering into binding contracts.
                  </p>

                  <h3 className="text-xl font-semibold">2. The "No-Employment" Disclaimer</h3>
                  <div className="bg-muted p-4 rounded-md border text-sm">
                    "PlacementBridge is a matching platform. It does not constitute an 'Employer' under <strong>Section 2 of the Employment Act (2006)</strong>.
                    The contract of internship is strictly between the Student and the Partner Company. PlacementBridge assumes no liability for the
                    day-to-day conduct of the employment relationship."
                  </div>

                  <h3 className="text-xl font-semibold">3. Prohibition of Placement Fees</h3>
                  <div className="bg-destructive/10 p-4 rounded-md border border-destructive/20 text-sm">
                    <p className="font-semibold text-destructive">Strict Policy against Exploitation</p>
                    <p>
                      Under the <strong>Employment (Recruitment of Ugandan Migrant Workers Abroad) Regulations</strong> and domestic labour
                      standards, it is illegal to charge job seekers for placement.
                    </p>
                    <p className="mt-2 italic">
                      "PlacementBridge hereby warrants that no fee is charged to students for the 'right' to be placed; any such request by a
                      company involves our immediate dispute resolution mechanism and potential suspension from the platform."
                    </p>
                  </div>
                </div>
              </section>

              {/* Schedule C */}
              <section id="schedule-c" className="space-y-4 scroll-mt-24">
                <h2 className="text-3xl font-bold border-b pb-2">Schedule C: Internship & Placement Standards</h2>
                <p className="text-muted-foreground">
                  Tailored to the <strong>Employment Act (2006)</strong> and <strong>Occupational Safety and Health Act (2006)</strong>.
                </p>
                <Accordion type="single" collapsible className="w-full">
                  <AccordionItem value="item-1">
                    <AccordionTrigger>Compliance with Minimum Wage</AccordionTrigger>
                    <AccordionContent>
                      While internships may be unpaid for academic credit, any "Apprenticeship" or "Contract of Service" must comply with
                      Ugandan minimum wage regulations where applicable. Employers warrant that any stipend offered honors the dignity of labour
                      under Article 40 of the Constitution.
                    </AccordionContent>
                  </AccordionItem>
                  <AccordionItem value="item-2">
                    <AccordionTrigger>Occupational Safety & Health (OSH)</AccordionTrigger>
                    <AccordionContent>
                      All partner companies must maintain a safe working environment. PlacementBridge reserves the right to inspect or
                      request OSH compliance certificates (Occupational Safety and Health Act, 2006) from partner companies hosting students.
                    </AccordionContent>
                  </AccordionItem>
                  <AccordionItem value="item-3">
                    <AccordionTrigger>Termination of Placement</AccordionTrigger>
                    <AccordionContent>
                      Terminations must follow the principles of natural justice. A student is entitled to a fair hearing before any
                      termination for misconduct, as per Section 66 of the Employment Act.
                    </AccordionContent>
                  </AccordionItem>
                </Accordion>
              </section>

              {/* Schedule D */}
              <section id="schedule-d" className="space-y-4 scroll-mt-24">
                <h2 className="text-3xl font-bold border-b pb-2">Schedule D: Employer Service Level Agreement (SLA)</h2>
                <div className="space-y-4">
                  <p className="text-sm text-muted-foreground">
                    This Schedule governs the B2B relationship between PlacementBridge and Partner Companies.
                  </p>
                  <ul className="list-disc pl-5 space-y-2 text-sm">
                    <li>
                      <strong>Response Time Integrity:</strong> Employers agree to review applications within 14 working days.
                      Failure to do so affects the "Responsiveness Score" displayed to students.
                    </li>
                    <li>
                      <strong>Accuracy of Listings:</strong> Employers warrant that all job descriptions faithfully reflect the duties required.
                      Misrepresentation is grounds for account suspension.
                    </li>
                    <li>
                      <strong>Non-Solicitation:</strong> Employers shall not use student data for marketing purposes outside the recruitment context.
                    </li>
                  </ul>
                </div>
              </section>

              {/* Schedule E */}
              <section id="schedule-e" className="space-y-4 scroll-mt-24">
                <h2 className="text-3xl font-bold border-b pb-2">Schedule E: Dispute Resolution & Arbitration</h2>
                <div className="bg-muted/50 p-6 rounded-lg text-sm space-y-4">
                  <h4 className="font-semibold">Arbitration Framework (Ugandan Law Focus)</h4>
                  <p>
                    In the event of a dispute arising out of or relating to these Terms, the parties shall first attempt to resolve the matter
                    amicably through the <strong>PlacementBridge Grievance Redressal Mechanism</strong> within 30 days.
                  </p>
                  <p>
                    If amicable resolution fails, the dispute shall be referred to arbitration in Kampala, Uganda,
                    in accordance with the <strong>Arbitration and Conciliation Act (Cap 4)</strong>. The seat of arbitration shall be Kampala.
                    The language of arbitration shall be English.
                  </p>
                  <p>
                    <strong>Safe Harbor Policy:</strong> Specifically for cases of harassment, we implement a "Safe Harbor" policy aligned with the
                    <strong>Employment (Sexual Harassment) Regulations</strong>, bypassing standard arbitration for immediate protective action.
                  </p>
                </div>
              </section>

              {/* Schedule F */}
              <section id="schedule-f" className="space-y-4 scroll-mt-24">
                <h2 className="text-3xl font-bold border-b pb-2">Schedule F: Acceptable Use & Content Moderation</h2>
                <p>
                  We maintain a zero-tolerance policy towards fraudulent content, hate speech, or content that violates the computer misuse laws of Uganda.
                </p>
                <ul className="list-disc pl-5 space-y-2 text-sm">
                  <li>No posting of fake opportunities or "pay-to-work" schemes.</li>
                  <li>No scraping of user data (Computer Misuse Act 2011).</li>
                  <li>No discriminatory language in job posts (Constitution Art. 21).</li>
                </ul>
              </section>

              {/* Schedule G */}
              <section id="schedule-g" className="space-y-4 scroll-mt-24">
                <h2 className="text-3xl font-bold border-b pb-2">Schedule G: Community Guidelines</h2>
                <Card>
                  <CardContent className="pt-6">
                    <blockquote className="italic border-l-4 border-primary pl-4 mb-4">
                      "We are a community built on the constitutional promise of Equality and Freedom from Discrimination (Article 21)."
                    </blockquote>
                    <p className="text-sm">
                      PlacementBridge does not tolerate discrimination based on sex, race, colour, ethnic origin, tribe, birth, creed or religion,
                      social or economic standing, political opinion or disability. Any user found violating this principle will be permanently banned.
                    </p>
                  </CardContent>
                </Card>
              </section>

              {/* Operational Annexes */}
              <section id="annexes" className="space-y-4 scroll-mt-24">
                <h2 className="text-3xl font-bold border-b pb-2">Operational Annexes</h2>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <Card className="bg-muted/20">
                    <CardHeader><CardTitle className="text-base">Internship Agreement Template</CardTitle></CardHeader>
                    <CardContent className="text-xs text-muted-foreground">
                      20+ pages of standard legal templates available for download within the Employer Dashboard.
                    </CardContent>
                  </Card>
                  <Card className="bg-muted/20">
                    <CardHeader><CardTitle className="text-base">Verification Protocols</CardTitle></CardHeader>
                    <CardContent className="text-xs text-muted-foreground">
                      Detailed steps on URSB record checking and University status verification (15 pages).
                    </CardContent>
                  </Card>
                  <Card className="bg-muted/20">
                    <CardHeader><CardTitle className="text-base">Grievance Redressal</CardTitle></CardHeader>
                    <CardContent className="text-xs text-muted-foreground">
                      Process for handling harassment and disputes (15 pages).
                    </CardContent>
                  </Card>
                </div>
              </section>

            </div>
          </div>
        </div>
      </main>
      <Footer />
    </div>
  );
};

export default TermsOfService;
