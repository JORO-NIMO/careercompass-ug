import QuickNavigation from "@/components/layout/QuickNavigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { TrendingUp, BarChart3, Globe2, Users } from "lucide-react";
import SEO from "@/components/seo/SEO";

const trendSections = [
  {
    title: "Digital roles outpace traditional employment",
    description:
      "Data analysts, cloud support associates, and product managers are among the fastest-growing roles across global startups and tech hubs.",
    insightPoints: [
      "SaaS and fintech scale-ups prioritise interns who can query SQL databases and visualise KPIs in Looker Studio or Power BI.",
      "Remote-first teams increasingly hire graduates as product analysts and QA engineers across time zones.",
    ],
  },
  {
    title: "Sustainability and climate-tech internships surge",
    description:
      "NGOs and green energy companies are onboarding fellows to support carbon accounting, clean cooking initiatives, and circular economy pilots.",
    insightPoints: [
      "Expect hybrid roles requiring field work combined with data reporting from regional offices.",
      "Applicants with GIS, data storytelling, or community mobilisation experience stand out in interviews.",
    ],
  },
  {
    title: "Creative economy builds recurring gigs",
    description:
      "Content studios, podcast platforms, and tourism collectives now hire social media and storytelling interns throughout the year.",
    insightPoints: [
      "Multilingual skills add value for localisation projects.",
      "Short-form video, motion graphics, and audio editing remain high-demand skill sets.",
    ],
  },
];

const labourStats = [
  { label: "Graduate talent entering labour market annually", value: "200k+", icon: Users },
  { label: "Average internship listings tracked monthly", value: "850", icon: BarChart3 },
  { label: "Top industries hiring interns in 2025", value: "Tech, Energy, Healthcare", icon: Globe2 },
];

const CareerTrendsBlog = () => {
  return (
    <>
      <SEO
        title="Global Career Trends 2025 | PlacementBridge Insights"
        description="Quarterly report tracking internship and placement trends worldwide including tech, sustainability, and creative economy opportunities."
        keywords={[
          "career trends",
          "internship statistics",
          "graduate employment insights",
          "placementbridge career report",
        ]}
        canonical="https://www.placementbridge.org/insights/career-trends"
        jsonLd={{
          "@context": "https://schema.org",
          "@type": "BlogPosting",
          headline: "Global Career Trends 2025",
          description:
            "Insights from PlacementBridge on the fastest-growing internship sectors, in-demand skills, and hiring signals for graduates worldwide.",
          author: {
            "@type": "Organization",
            name: "PlacementBridge",
          },
          datePublished: "2025-12-27",
          mainEntityOfPage: {
            "@type": "WebPage",
            "@id": "https://www.placementbridge.org/insights/career-trends",
          },
        }}
        siteName="All jobs in one place"
      />
      <main className="py-16">
        <div className="container mx-auto px-4">
          <div className="max-w-5xl mx-auto space-y-10">
            <div className="space-y-4 text-center">
              <Badge variant="secondary" className="mx-auto w-fit">PlacementBridge Insights</Badge>
              <h1 className="text-4xl font-bold text-foreground">Global career trends reshaping internships</h1>
              <p className="text-lg text-muted-foreground">
                Our quarterly insights blend marketplace data, employer interviews, and student surveys. Use these signals to tailor your skills, CV, and opportunity pipeline.
              </p>
            </div>

            <div className="grid gap-6 md:grid-cols-3">
              {labourStats.map(({ label, value, icon: Icon }) => (
                <Card key={label} className="text-center">
                  <CardHeader>
                    <Icon className="mx-auto h-6 w-6 text-primary" />
                  </CardHeader>
                  <CardContent className="space-y-2">
                    <p className="text-3xl font-bold text-foreground">{value}</p>
                    <p className="text-sm text-muted-foreground">{label}</p>
                  </CardContent>
                </Card>
              ))}
            </div>

            {trendSections.map((trend) => (
              <Card key={trend.title}>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-2xl">
                    <TrendingUp className="h-5 w-5 text-primary" /> {trend.title}
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4 text-muted-foreground">
                  <p>{trend.description}</p>
                  <ul className="list-disc list-inside space-y-2 text-sm">
                    {trend.insightPoints.map((point) => (
                      <li key={point}>{point}</li>
                    ))}
                  </ul>
                </CardContent>
              </Card>
            ))}

            <Card>
              <CardHeader>
                <CardTitle className="text-2xl">Action plan for students & graduates</CardTitle>
              </CardHeader>
              <CardContent className="space-y-6 text-sm text-muted-foreground">
                <div className="rounded-xl border border-primary/20 bg-primary/5 p-4">
                  <h3 className="font-semibold text-primary-dark">1. Upskill intentionally</h3>
                  <p className="mt-2">
                    Enrol in short courses covering data storytelling, customer experience, and sustainability reporting. Coursera, Refactory, and Innovation Village all host cohort-based programmes.
                  </p>
                </div>
                <div className="rounded-xl border border-primary/20 bg-primary/5 p-4">
                  <h3 className="font-semibold text-primary-dark">2. Build projects that matter</h3>
                  <p className="mt-2">
                    Prototype community solutions—think clean energy dashboards, agriculture price trackers, or creative tourism campaigns. Document them via case studies on your portfolio.
                  </p>
                </div>
                <div className="rounded-xl border border-primary/20 bg-primary/5 p-4">
                  <h3 className="font-semibold text-primary-dark">3. Network across ecosystems</h3>
                  <p className="mt-2">
                    Join WhatsApp and Slack communities for your industry, volunteer at hackathons, and attend career fairs hosted by universities, NGOs, and tech hubs.
                  </p>
                </div>
              </CardContent>
            </Card>

            <Separator />
            <div className="rounded-2xl border border-border/70 bg-background/80 p-6 text-sm text-muted-foreground">
              <p>
                PlacementBridge aggregates opportunities from verified organisations. Subscribe to our newsletter for fresh internships, fellowships, and graduate programmes worldwide every Monday morning.
              </p>
            </div>

            <QuickNavigation />
          </div>
        </div>
      </main>
    </>
  );
};

export default CareerTrendsBlog;
