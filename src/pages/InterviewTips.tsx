import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { CheckCircle, FileText, Target, Users, Mail, Phone, Video, Timer, Sparkles } from "lucide-react";
import SEO from "@/components/seo/SEO";

const InterviewTips = () => {
  const baseUrl = typeof window !== "undefined" ? window.location.origin : "https://placementbridge.org";

  const prepTips = [
    { title: "Research deeply", detail: "Study the company's products, users, values, and recent news." },
    { title: "Clarify role fit", detail: "Map your past experiences to requirements with 2-3 concrete stories." },
    { title: "Practice STAR", detail: "Structure answers as Situation, Task, Action, Result for clarity." },
    { title: "Know your metrics", detail: "Quantify outcomes: savings, growth, quality, throughput, satisfaction." },
    { title: "Prepare questions", detail: "Ask about team workflows, success measures, and onboarding expectations." },
  ];

  const virtualTips = [
    { title: "Environment", detail: "Quiet, well-lit space; neutral background; stable internet." },
    { title: "Tech check", detail: "Test camera, mic, and screenshare; close distracting apps." },
    { title: "Presence", detail: "Look at camera when answering; keep notes discreet and brief." },
    { title: "Timing", detail: "Join 5 minutes early; keep answers concise (60–120 seconds)." },
  ];

  const commonQuestions = [
    { q: "Tell me about yourself", a: "Connect your journey to the role. 2–3 highlights + motivation." },
    { q: "Why this company?", a: "Reference real initiatives, user impact, and how you add value." },
    { q: "Strengths & weaknesses", a: "Pick role-relevant strengths; share a genuine weakness with your plan." },
    { q: "A challenge you solved", a: "Use STAR; show decision-making, collaboration, and measurable outcomes." },
    { q: "Where do you see yourself?", a: "Skills you aim to grow, problems you want to solve, learning mindset." },
  ];

  return (
    <div className="min-h-screen bg-gradient-to-b from-indigo-50 to-white py-12">
      <SEO
        title="Global Interview Tips & Preparation Guide | PlacementBridge"
        description="Essential interview preparation covering research, storytelling (STAR), technical setup, presence, and follow-up—designed for global opportunities."
        keywords={[
          "interview tips",
          "STAR method",
          "virtual interview checklist",
          "common interview questions",
          "global job preparation",
        ]}
        canonical="https://www.placementbridge.org/guides/interview-tips"
        jsonLd={[
          {
            "@context": "https://schema.org",
            "@type": "BreadcrumbList",
            itemListElement: [
              { "@type": "ListItem", position: 1, name: "Home", item: "https://www.placementbridge.org/" },
              { "@type": "ListItem", position: 2, name: "Guides", item: "https://www.placementbridge.org/guides" },
              { "@type": "ListItem", position: 3, name: "Interview Tips", item: "https://www.placementbridge.org/guides/interview-tips" }
            ]
          },
          {
            "@context": "https://schema.org",
            "@type": "Article",
            headline: "Global Interview Tips & Preparation Guide",
            description:
              "Practical interview preparation advice for students and professionals seeking opportunities globally, including virtual setup and storytelling frameworks.",
            mainEntityOfPage: {
              "@type": "WebPage",
              "@id": `${baseUrl}/guides/interview-tips`,
            },
            keywords: ["Interview tips", "STAR method", "Virtual interviews"]
          }
        ]}
        siteName="All jobs in one place"
      />

      <div className="container mx-auto px-4 max-w-6xl">
        <div className="text-center mb-12">
          <Badge className="mb-4" variant="secondary">Career Resources</Badge>
          <h1 className="text-4xl font-bold mb-4">Interview Tips & Preparation (Global)</h1>
          <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
            Stand out in interviews with clear stories, solid research, and strong presence—whether on-site or virtual.
          </p>
        </div>

        <div className="grid md:grid-cols-2 gap-6 mb-12">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Users className="h-5 w-5 text-primary" /> Before the interview
              </CardTitle>
              <CardDescription>Foundational prep to boost your confidence</CardDescription>
            </CardHeader>
            <CardContent>
              <ul className="space-y-2">
                {prepTips.map((tip) => (
                  <li key={tip.title} className="flex items-start gap-2 text-sm">
                    <CheckCircle className="h-4 w-4 text-green-600 mt-0.5 flex-shrink-0" />
                    <span><strong>{tip.title}:</strong> {tip.detail}</span>
                  </li>
                ))}
              </ul>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Video className="h-5 w-5 text-primary" /> Virtual interview tips
              </CardTitle>
              <CardDescription>Look and sound professional online</CardDescription>
            </CardHeader>
            <CardContent>
              <ul className="space-y-2">
                {virtualTips.map((tip) => (
                  <li key={tip.title} className="flex items-start gap-2 text-sm">
                    <CheckCircle className="h-4 w-4 text-green-600 mt-0.5 flex-shrink-0" />
                    <span><strong>{tip.title}:</strong> {tip.detail}</span>
                  </li>
                ))}
              </ul>
            </CardContent>
          </Card>
        </div>

        <Card className="mb-12">
          <CardHeader>
            <CardTitle className="text-2xl flex items-center gap-2">
              <Sparkles className="h-5 w-5 text-primary" /> Common questions & how to answer
            </CardTitle>
            <CardDescription>Use concise stories and measurable outcomes</CardDescription>
          </CardHeader>
          <CardContent>
            <Accordion type="single" collapsible className="w-full">
              {commonQuestions.map((item, index) => (
                <AccordionItem key={index} value={`q-${index}`}>
                  <AccordionTrigger className="text-left font-medium">{item.q}</AccordionTrigger>
                  <AccordionContent className="text-muted-foreground">{item.a}</AccordionContent>
                </AccordionItem>
              ))}
            </Accordion>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-2xl flex items-center gap-2">
              <Timer className="h-5 w-5 text-primary" /> Follow-up & next steps
            </CardTitle>
            <CardDescription>Professional habits that compound over time</CardDescription>
          </CardHeader>
          <CardContent>
            <ul className="space-y-2 text-sm">
              <li className="flex items-start gap-2"><CheckCircle className="h-4 w-4 text-green-600 mt-0.5" /><span>Send a concise thank-you within 24 hours summarizing fit and enthusiasm.</span></li>
              <li className="flex items-start gap-2"><CheckCircle className="h-4 w-4 text-green-600 mt-0.5" /><span>Reflect on questions you found tough and outline how you’ll improve.</span></li>
              <li className="flex items-start gap-2"><CheckCircle className="h-4 w-4 text-green-600 mt-0.5" /><span>Keep a log of applications, interviewers, and outcomes to iterate.</span></li>
            </ul>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default InterviewTips;
