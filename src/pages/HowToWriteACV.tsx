import QuickNavigation from "@/components/QuickNavigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { CheckCircle2, FileText, Pencil, Sparkles } from "lucide-react";
import SEO from "@/components/SEO";
import { Button } from "@/components/ui/button";
import { Link } from "react-router-dom";
import PageAssistant from "@/components/PageAssistant";

const coreSections = [
  {
    title: "Contact & Personal brand",
    tips: [
      "Use a professional email address with your own domain or a clean Gmail variant.",
      "Add your LinkedIn and portfolio links so recruiters can verify your work.",
      "Include a concise headline that summarises your skills and desired opportunity.",
    ],
  },
  {
    title: "Career summary",
    tips: [
      "Two to three sentences focusing on impact, not just responsibilities.",
      "Mention years of experience or training, your strongest tools, and any achievements.",
      "Tailor the summary to each internship or placement so the match feels intentional.",
    ],
  },
  {
    title: "Experience",
    tips: [
      "List roles in reverse chronological order with quantifiable achievements.",
      "Use action verbs: led, designed, analysed, accelerated.",
      "Highlight local impact, community projects, or campus initiatives to show relevance.",
    ],
  },
  {
    title: "Skills & certifications",
    tips: [
      "Group core technical skills, digital tools, and soft skills separately for easy scanning.",
      "Add certifications from reputable platforms such as Google, Cisco, or Coursera.",
      "Reference language proficiency relevant to your target roles (e.g., English, French, Spanish, Mandarin).",
    ],
  },
];

const accomplishmentChecklist = [
  "Saved the employer time or money? Mention the exact metric.",
  "Improved a process? Describe the before and after.",
  "Led a team or student organisation? Quantify the members and outcomes.",
  "Delivered a research project? Add statistics, sample size, and published results.",
];

const HowToWriteACV = () => {
  return (
    <>
      <SEO
        title="How to Write a CV that Lands Internships Worldwide | PlacementBridge"
        description="Step-by-step CV writing guide for students and graduates seeking internships, apprenticeships, and early-career roles across the globe."
        keywords={[
          "how to write a cv",
          "cv tips for interns",
          "global internship cv guide",
          "placement cv template",
          "apprenticeship resume advice",
          "resume writing",
          "student cv structure",
        ]}
        canonical="https://www.placementbridge.org/guides/how-to-write-a-cv"
        jsonLd={[
          {
            "@context": "https://schema.org",
            "@type": "BreadcrumbList",
            itemListElement: [
              { "@type": "ListItem", position: 1, name: "Home", item: "https://www.placementbridge.org/" },
              { "@type": "ListItem", position: 2, name: "Guides", item: "https://www.placementbridge.org/guides" },
              { "@type": "ListItem", position: 3, name: "How to Write a CV", item: "https://www.placementbridge.org/guides/how-to-write-a-cv" }
            ]
          },
          {
            "@context": "https://schema.org",
            "@type": "Article",
            headline: "How to Write a CV that Lands Internships Worldwide",
            description:
              "Practical CV writing advice for students and graduates covering structure, tone, and impact-driven bullet points for global opportunities.",
            author: {
              "@type": "Organization",
              name: "PlacementBridge",
            },
            mainEntityOfPage: {
              "@type": "WebPage",
              "@id": "https://www.placementbridge.org/guides/how-to-write-a-cv",
            },
            keywords: [
              "CV writing",
              "Internship resume tips",
              "Student CV structure",
            ]
          }
        ]}
        siteName="All jobs in one place"
      />

      <main className="py-16">
        <div className="container mx-auto px-4 space-y-10">
          <div className="text-center space-y-6">
            <Badge variant="secondary" className="mx-auto w-fit">Career Guides</Badge>
            <h1 className="text-4xl font-bold text-foreground">
              How to write a CV that lands internships worldwide
            </h1>
            <p className="text-lg text-muted-foreground">
              This blueprint shows how students, graduates, and career switchers can craft a compelling CV for internships, attachments, graduate trainee roles, and freelance gigs globally.
            </p>
          </div>

          <QuickNavigation
            title="On this page"
            subtitle="Jump to a section"
            sticky
            stickyOffsetClass="top-20"
            links={[
              { title: "Sections recruiters expect", href: "#sections", description: "Core structure to include" },
              { title: "Turn duties into accomplishments", href: "#accomplishments", description: "Write impact-driven bullets" },
              { title: "Recommended length & layout", href: "#layout", description: "Keep it clear and concise" },
            ]}
          />

          <Card id="sections" className="scroll-mt-24">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-2xl">
                <FileText className="h-5 w-5 text-primary" /> Sections recruiters expect
              </CardTitle>
            </CardHeader>
            <CardContent className="grid gap-6 sm:grid-cols-2">
              {coreSections.map((section) => (
                <div key={section.title} className="rounded-xl border border-primary/20 bg-primary/5 p-4">
                  <h2 className="text-lg font-semibold text-primary-dark">{section.title}</h2>
                  <ul className="mt-3 space-y-2 text-sm text-muted-foreground">
                    {section.tips.map((tip) => (
                      <li key={tip} className="flex gap-2">
                        <CheckCircle2 className="h-4 w-4 text-primary mt-0.5" />
                        <span>{tip}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              ))}
            </CardContent>
          </Card>

          <Card id="accomplishments" className="scroll-mt-24">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-2xl">
                <Pencil className="h-5 w-5 text-primary" /> Turn duties into accomplishments
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-5">
              <p className="text-muted-foreground">
                Convert every bullet point into a result statement: action verb + task + measurable outcome. Recruiters scanning dozens of CVs for internships will pause on tangible results.
              </p>
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="rounded-xl border border-border/70 bg-background/80 p-4">
                  <h3 className="text-sm font-semibold text-foreground/90 uppercase tracking-wide">Before</h3>
                  <p className="mt-2 text-sm text-muted-foreground">Responsible for social media for campus business club.</p>
                </div>
                <div className="rounded-xl border border-primary/40 bg-primary/5 p-4">
                  <h3 className="text-sm font-semibold text-primary-dark uppercase tracking-wide">After</h3>
                  <p className="mt-2 text-sm text-foreground">
                    Grew the campus business club Instagram community by 320% in one semester by launching peer-led content series and WhatsApp referral challenges.
                  </p>
                </div>
              </div>
              <Separator />
              <div id="impact" className="space-y-3 scroll-mt-24">
                <h3 className="text-lg font-semibold text-foreground">Impact checklist</h3>
                <ul className="space-y-2 text-sm text-muted-foreground">
                  {accomplishmentChecklist.map((item) => (
                    <li key={item} className="flex gap-2">
                      <Sparkles className="h-4 w-4 text-accent mt-0.5" />
                      <span>{item}</span>
                    </li>
                  ))}
                </ul>
              </div>
            </CardContent>
          </Card>

          <Card id="layout" className="scroll-mt-24">
            <CardHeader>
              <CardTitle className="text-2xl">Recommended CV length & layout</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4 text-muted-foreground">
              <p>
                Most internship CVs should fit on one page. Experienced professionals can stretch to two pages only if each section delivers measurable value. Use clean fonts (Inter, Calibri, Lato) in 10–11pt size with consistent spacing.
              </p>
              <p>
                Save and share your CV as PDF to preserve formatting. Use file names such as <em>Stephen-Aine-Data-Analytics-Intern-CV.pdf</em> so hiring managers can retrieve your profile quickly.
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-2xl">Ready to polish your CV?</CardTitle>
            </CardHeader>
            <CardContent className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <p className="text-muted-foreground">
                Use our CV Builder to structure sections, word impact bullets, and export a clean PDF.
              </p>
              <div className="flex gap-3">
                <Button asChild>
                  <Link to="/cv-builder">Build your CV</Link>
                </Button>
                <Button variant="outline" asChild>
                  <Link to="/application-tips">See application tips</Link>
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      </main>
      <PageAssistant
        currentPage="guide-how-to-write-a-cv"
        context={{ sections: coreSections.map((s) => s.title) }}
        suggestions={[
          'Can you critique my CV summary?',
          'Turn this duty into an accomplishment bullet',
          'What layout is best for internships?'
        ]}
      />
    </>
  );
};

export default HowToWriteACV;
