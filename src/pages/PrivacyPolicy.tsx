import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

const PrivacyPolicy = () => {
  return (
    <div className="min-h-screen bg-background text-foreground">
      <main className="py-12 container mx-auto px-4 max-w-5xl">
        <div className="space-y-8">

          {/* Header Section */}
          <div className="text-center space-y-4">
            <h1 className="text-4xl font-extrabold tracking-tight lg:text-5xl">
              Privacy Policy & Data Protection
            </h1>
            <p className="text-xl text-muted-foreground">
              Compliance with the Data Protection and Privacy Act (2019)
            </p>
            <p className="text-sm text-muted-foreground/80">
              Part of the PlacementBridge Legal Framework | Schedule B
            </p>
          </div>

          <Separator />

          {/* Master Index */}
          <div className="grid md:grid-cols-3 gap-6">
            <div className="md:col-span-1">
              <Card className="h-full sticky top-24">
                <CardHeader>
                  <CardTitle className="text-lg">Policy Index</CardTitle>
                </CardHeader>
                <CardContent>
                  <ScrollArea className="h-[60vh] pr-4">
                    <ul className="space-y-3 text-sm">
                      <li><a href="#schedule-b" className="hover:underline text-primary font-medium">Schedule B: Core Privacy Policy</a></li>
                      <ul className="pl-4 space-y-1 text-muted-foreground">
                        <li><a href="#controller" className="hover:underline hover:text-foreground">- PDPO Registration</a></li>
                        <li><a href="#legal-basis" className="hover:underline hover:text-foreground">- Legal Basis</a></li>
                        <li><a href="#sensitive-data" className="hover:underline hover:text-foreground">- Sensitive Data</a></li>
                        <li><a href="#localization" className="hover:underline hover:text-foreground">- Data Localization</a></li>
                      </ul>
                      <li><a href="#schedule-h" className="hover:underline text-primary font-medium">Schedule H: Data Subject Rights</a></li>
                      <li><a href="#schedule-i" className="hover:underline text-primary font-medium">Schedule I: Cybersecurity (TOMs)</a></li>
                      <li><a href="#schedule-j" className="hover:underline text-primary font-medium">Schedule J: Cookies & Tracking</a></li>
                      <li><a href="#retention" className="hover:underline text-primary font-medium">Data Retention Schedule</a></li>
                    </ul>
                  </ScrollArea>
                </CardContent>
              </Card>
            </div>

            {/* Content Area */}
            <div className="md:col-span-2 space-y-12">

              {/* Schedule B */}
              <section id="schedule-b" className="space-y-6 scroll-mt-24">
                <h2 className="text-3xl font-bold border-b pb-2">Schedule B: Privacy Policy & Data Agreement</h2>

                <div id="controller" className="bg-primary/5 p-4 rounded-lg border border-primary/20">
                  <h3 className="font-semibold text-lg mb-2">Data Controller Registration</h3>
                  <p className="text-sm">
                    "PlacementBridge is registered with the <strong>Personal Data Protection Office (PDPO)</strong> under NITA-U.
                    Our registration number <strong>[PDPO-PB-2025-X09]</strong> confirms our commitment to the
                    <strong>Data Protection and Privacy Act (2019)</strong>."
                  </p>
                </div>

                <div id="legal-basis" className="space-y-2">
                  <h3 className="text-xl font-semibold">Legal Basis for Processing</h3>
                  <p className="text-muted-foreground">
                    We process data based on <strong>Consent (Section 7)</strong> and <strong>Contractual Necessity (Section 8)</strong> for
                    the purpose of facilitating internships. When you apply for a job, processing is necessary to fulfill the pre-contractual
                    measures requested by you.
                  </p>
                </div>

                <div id="sensitive-data" className="space-y-2">
                  <h3 className="text-xl font-semibold">Sensitive Personal Data</h3>
                  <p className="text-muted-foreground italic">
                    "We do not collect 'Special Personal Data' (as defined in Section 9 of the DPPA) such as political opinion or
                    religious belief unless strictly required for specific affirmative action placements, in which case explicit written consent is obtained."
                  </p>
                </div>

                <div id="localization" className="space-y-2">
                  <h3 className="text-xl font-semibold">Data Localization & Transfer</h3>
                  <p className="text-muted-foreground">
                    "In compliance with <strong>Regulation 30 of the Data Protection and Privacy Regulations (2021)</strong>, all personal data is
                    stored on secure servers. Any cross-border transfer is only to jurisdictions with 'adequate' protection or via
                    Standard Contractual Clauses."
                  </p>
                </div>
              </section>

              {/* Schedule H */}
              <section id="schedule-h" className="space-y-4 scroll-mt-24">
                <h2 className="text-3xl font-bold border-b pb-2">Schedule H: Data Subject Rights Manual</h2>
                <p>
                  You have the following rights under Ugandan Law:
                </p>
                <div className="grid gap-4 md:grid-cols-2">
                  <Card>
                    <CardHeader><CardTitle className="text-base">Right to Access</CardTitle></CardHeader>
                    <CardContent className="text-sm">
                      Request a copy of all personal data we hold about you. We will provide this within 7 days.
                    </CardContent>
                  </Card>
                  <Card>
                    <CardHeader><CardTitle className="text-base">Right to Erasure</CardTitle></CardHeader>
                    <CardContent className="text-sm">
                      Request deletion of your account. We will remove operational data immediately, retaining only legal records.
                    </CardContent>
                  </Card>
                  <Card>
                    <CardHeader><CardTitle className="text-base">Right to Rectification</CardTitle></CardHeader>
                    <CardContent className="text-sm">
                      Correct any inaccurate data via your User Dashboard instantly.
                    </CardContent>
                  </Card>
                  <Card>
                    <CardHeader><CardTitle className="text-base">Right to Prevent Processing</CardTitle></CardHeader>
                    <CardContent className="text-sm">
                      Object to processing for direct marketing purposes at any time.
                    </CardContent>
                  </Card>
                </div>
              </section>

              {/* Schedule I */}
              <section id="schedule-i" className="space-y-4 scroll-mt-24">
                <h2 className="text-3xl font-bold border-b pb-2">Schedule I: Cybersecurity (TOMs)</h2>
                <div className="bg-muted p-6 rounded-lg space-y-4">
                  <h4 className="font-semibold">Technical & Organizational Measures (TOMs)</h4>
                  <p className="text-sm">
                    We implement the following measures to satisfy the "Security Safeguards" requirement of <strong>Section 20 of the DPPA</strong>:
                  </p>
                  <ul className="list-disc pl-5 space-y-2 text-sm">
                    <li><strong>Encryption:</strong> All data in transit is encrypted via TLS 1.2+ (HTTPS). Data at rest is encrypted using AES-256.</li>
                    <li><strong>Access Control:</strong> Strict Role-Based Access Control (RBAC) ensures only authorized personnel access student data.</li>
                    <li><strong>Incident Response:</strong> A documented Incident Response Plan aligned with the <strong>Computer Misuse Act</strong>.</li>
                  </ul>
                </div>
              </section>

              {/* Data Retention Schedule */}
              <section id="retention" className="space-y-4 scroll-mt-24">
                <h2 className="text-3xl font-bold border-b pb-2">Data Retention Schedule</h2>
                <p className="text-sm text-muted-foreground">
                  We retain data only as long as necessary or required by law.
                </p>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Data Type</TableHead>
                      <TableHead>Retention Period</TableHead>
                      <TableHead>Legal Basis</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    <TableRow>
                      <TableCell className="font-medium">User Profile / CV</TableCell>
                      <TableCell>Until account deletion</TableCell>
                      <TableCell>Consent / Service Contract</TableCell>
                    </TableRow>
                    <TableRow>
                      <TableCell className="font-medium">Application History</TableCell>
                      <TableCell>3 Years</TableCell>
                      <TableCell>Limitation Act (Claims)</TableCell>
                    </TableRow>
                    <TableRow>
                      <TableCell className="font-medium">Financial Records</TableCell>
                      <TableCell>7 Years</TableCell>
                      <TableCell>Income Tax Act</TableCell>
                    </TableRow>
                    <TableRow>
                      <TableCell className="font-medium">Server Logs</TableCell>
                      <TableCell>90 Days</TableCell>
                      <TableCell>Security / Diagnostic</TableCell>
                    </TableRow>
                  </TableBody>
                </Table>
              </section>

              {/* Schedule J */}
              <section id="schedule-j" className="space-y-4 scroll-mt-24">
                <h2 className="text-3xl font-bold border-b pb-2">Schedule J: Contact & DPO</h2>
                <p>
                  For any privacy-related inquiries, please contact our Data Protection Officer:
                </p>
                <div className="p-4 border rounded-md">
                  <p className="font-semibold">Data Protection Officer</p>
                  <p>PlacementBridge Legal Team</p>
                  <p>Email: <a href="mailto:admin@placementbridge.org" className="text-primary underline">admin@placementbridge.org</a></p>
                  <p>Address: Kampala, Uganda</p>
                </div>
              </section>

            </div>
          </div>
        </div>
      </main>
    </div>
  );
};

export default PrivacyPolicy;
