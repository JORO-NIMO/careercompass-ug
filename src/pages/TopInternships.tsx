import QuickNavigation from "@/components/QuickNavigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Building2, MapPin, Rocket } from "lucide-react";
import { useMemo } from "react";
import { useParams } from "react-router-dom";
import SEO from "@/components/SEO";

interface IndustryData {
  title: string;
  description: string;
  highlights: Array<{
    organisation: string;
    location: string;
    program: string;
    stipend?: string;
  }>;
  skills: string[];
  keywords: string[];
}

const INDUSTRY_DATA: Record<string, IndustryData> = {
  technology: {
    title: "Technology & Software Development",
    description:
      "Fast-growing Ugandan and Pan-African startups recruit engineers who can ship features quickly, analyse data, and explain insights to business teams.",
    highlights: [
      {
        organisation: "Andela Kampala",
        location: "Remote-first with Kampala community hub",
        program: "Software Engineering Apprenticeship focused on Node.js, React, and Python.",
        stipend: "Monthly stipend + laptop programme",
      },
      {
        organisation: "Hamwe East Africa",
        location: "Kampala, Uganda",
        program: "Product analytics internship supporting agritech dashboards for SACCO partners.",
      },
      {
        organisation: "Innovation Village",
        location: "Kampala & Gulu",
        program: "Startup support residency covering UI/UX research, low-code solutions, and digital marketing.",
      },
    ],
    skills: ["JavaScript/TypeScript", "SQL & data visualisation", "Product thinking", "Agile collaboration"],
    keywords: [
      "top technology internships uganda",
      "software engineering placements kampala",
      "ugandan startups hiring interns",
      "product design apprenticeship uganda",
    ],
  },
  healthcare: {
    title: "Healthcare & Medical",
    description:
      "Hospitals and healthtech NGOs need interns who combine clinical knowledge with patient empathy and digital record skills.",
    highlights: [
      {
        organisation: "Mulago National Referral Hospital",
        location: "Kampala, Uganda",
        program: "Clinical rotations for nursing, pharmacy, and biomedical students with mentorship from senior consultants.",
      },
      {
        organisation: "Rocket Health",
        location: "Kampala, Uganda",
        program: "Telemedicine coordination internship supporting remote consultations and laboratory logistics.",
      },
      {
        organisation: "Living Goods",
        location: "Wakiso & Mukono",
        program: "Community health internship focused on data quality, digital tools, and field research.",
      },
    ],
    skills: ["Patient communication", "EMR systems", "Public health analytics", "Community outreach"],
    keywords: [
      "healthcare internships uganda",
      "nursing student placements kampala",
      "telemedicine internships east africa",
      "public health attachments uganda",
    ],
  },
  finance: {
    title: "Finance & Commerce",
    description:
      "Banks, fintechs, and consultancies offer rotational internships that strengthen quantitative analysis, compliance, and customer engagement.",
    highlights: [
      {
        organisation: "Stanbic Bank Uganda",
        location: "Kampala & regional branches",
        program: "Graduate trainee stream covering corporate banking, risk, and digital innovation.",
      },
      {
        organisation: "Yellow Card",
        location: "Remote across Africa",
        program: "Fintech operations internship focusing on compliance reviews and customer success operations.",
      },
      {
        organisation: "Deloitte Uganda",
        location: "Kampala, Uganda",
        program: "Audit and financial advisory internship with exposure to blue-chip clients in East Africa.",
      },
    ],
    skills: ["Financial modelling", "Excel & Power BI", "Regulatory compliance", "Customer success"],
    keywords: [
      "finance internships uganda",
      "bank graduate trainee programmes uganda",
      "fintech placements east africa",
      "audit internship kampala",
    ],
  },
};

const fallbackIndustry: IndustryData = {
  title: "Emerging Opportunities",
  description:
    "Explore placements across agribusiness, tourism, renewable energy, and creative industries. PlacementBridge curates fresh opportunities weekly.",
  highlights: [
    {
      organisation: "PlacementBridge Community",
      location: "Nationwide",
      program: "Subscribe to our job alerts for curated internships, fellowships, and apprenticeships across Uganda.",
    },
  ],
  skills: ["Career exploration", "Networking", "Professional branding"],
  keywords: [
    "internships uganda",
    "graduate trainee opportunities uganda",
    "placements in uganda",
  ],
};

const formatIndustryParam = (param?: string) => {
  if (!param) return "";
  return param.toLowerCase();
};

const NormalisedIndustryTitle = (param?: string) => {
  if (!param) return "Uganda";
  return param
    .split("-")
    .map((segment) => segment.charAt(0).toUpperCase() + segment.slice(1))
    .join(" ");
};

const TopInternships = () => {
  const { industry } = useParams();
  const key = formatIndustryParam(industry);

  const data = useMemo(() => {
    if (!key) return fallbackIndustry;
    return INDUSTRY_DATA[key] ?? fallbackIndustry;
  }, [key]);

  const locationName = NormalisedIndustryTitle(industry);
  const pageTitle = `Top internships in ${locationName} | PlacementBridge`;
  const pageDescription = `${data.title} internships you can apply to in Uganda. Discover programmes offering mentorship, real projects, and pathways to full-time roles.`;

  return (
    <>
      <SEO
        title={pageTitle}
        description={pageDescription}
        keywords={[`top internships in ${locationName}`, ...data.keywords]}
        canonical={`/insights/top-internships/${industry ?? ""}`}
        jsonLd={{
          "@context": "https://schema.org",
          "@type": "ItemList",
          name: `Top internships in ${locationName}`,
          description: pageDescription,
          itemListElement: data.highlights.map((highlight, index) => ({
            "@type": "ListItem",
            position: index + 1,
            name: highlight.organisation,
            item: {
              "@type": "Organization",
              name: highlight.organisation,
              address: highlight.location,
              description: highlight.program,
            },
          })),
        }}
      />
      <main className="py-16">
        <div className="container mx-auto px-4">
          <div className="max-w-5xl mx-auto space-y-10">
            <div className="space-y-4 text-center">
              <Badge variant="secondary" className="mx-auto w-fit">Opportunity Spotlight</Badge>
              <h1 className="text-4xl font-bold text-foreground">Top internships in {locationName}</h1>
              <p className="text-lg text-muted-foreground">{data.description}</p>
            </div>

            <div className="grid gap-6 md:grid-cols-2">
              {data.highlights.map((highlight) => (
                <Card key={highlight.organisation}>
                  <CardHeader>
                    <CardTitle className="text-2xl flex items-center gap-2">
                      <Building2 className="h-5 w-5 text-primary" /> {highlight.organisation}
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3 text-sm text-muted-foreground">
                    <div className="flex items-center gap-2 text-foreground/80">
                      <MapPin className="h-4 w-4 text-primary" />
                      <span>{highlight.location}</span>
                    </div>
                    <p>{highlight.program}</p>
                    {highlight.stipend && (
                      <p className="text-foreground/80"><strong>Stipend:</strong> {highlight.stipend}</p>
                    )}
                  </CardContent>
                </Card>
              ))}
            </div>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-2xl">
                  <Rocket className="h-5 w-5 text-primary" /> Skills employers ask for
                </CardTitle>
              </CardHeader>
              <CardContent className="flex flex-wrap gap-2">
                {data.skills.map((skill) => (
                  <Badge key={skill} variant="outline" className="border-primary/40 text-primary-dark">
                    {skill}
                  </Badge>
                ))}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-2xl">Where to search weekly</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3 text-sm text-muted-foreground">
                <p>
                  Subscribe to PlacementBridge alerts, monitor LinkedIn job posts, and follow sector associations. Attend career fairs hosted by innovation hubs such as Refactory, Design Hub Kampala, or Industry-specific accelerators.
                </p>
                <Separator />
                <p>
                  Need access to more leads? Email <a href="mailto:admin@placementbridge.org" className="text-primary underline">admin@placementbridge.org</a> to join our premium internship intelligence brief.
                </p>
              </CardContent>
            </Card>

            <QuickNavigation />
          </div>
        </div>
      </main>
    </>
  );
};

export default TopInternships;
