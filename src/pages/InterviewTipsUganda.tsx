import QuickNavigation from "@/components/QuickNavigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { AlertTriangle, CheckCircle2, Mic, Timer } from "lucide-react";
import SEO from "@/components/SEO";

const InterviewTipsUganda = () => {
  return (
    <>
      <SEO
        title="Interview Tips for preparation of employment | PlacementBridge"
        description="Practical interview preparation advice for students and graduates pursuing internships, apprenticeships, and entry-level roles."
        keywords={[
          "interview tips",
          "internship interview questions",
          "campus career interview preparation",
          "how to prepare for interviews",
        ]}
        canonical="https://www.placementbridge.org/guides/interview-tips"
        jsonLd={{
          "@context": "https://schema.org",
          "@type": "HowTo",
          name: "Interview Tips for Students",
          description:
            "Step-by-step interview preparation guidance covering research, confidence, and culture-specific expectations for internships.",
          totalTime: "PT3H",
          supply: "Internet connection, company research notes, resume, sample questions",
          step: [
            {
              "@type": "HowToStep",
              name: "Research the employer",
              text: "Understand mission, products, and latest news from sources.",
            },
            {
              "@type": "HowToStep",
              name: "Practise behavioural answers",
              text: "Use the STAR method with examples from campus, community, or freelance experiences.",
            },
          ],
        }}
        siteName="All jobs in one place"
      />
      <main className="py-16">
        <div className="container mx-auto px-4">
          <div className="max-w-4xl mx-auto space-y-10">
            <div className="space-y-4 text-center">
              <Badge variant="secondary" className="mx-auto w-fit">Interview Coaching</Badge>
              <h1 className="text-4xl font-bold text-foreground">Interview tips</h1>
              <p className="text-lg text-muted-foreground">
                Impress hiring managers with culturally-aware preparation. These tips are based on feedback from HR teams, innovation hubs, and graduate trainee coordinators.
              </p>
            </div>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-2xl">
                  <CheckCircle2 className="h-5 w-5 text-primary" /> Three-part preparation framework
                </CardTitle>
              </CardHeader>
              <CardContent className="grid gap-6 md:grid-cols-3">
                <div className="rounded-xl border border-primary/30 bg-primary/5 p-4">
                  <h3 className="text-lg font-semibold text-primary-dark">Know the organisation</h3>
                  <p className="mt-2 text-sm text-muted-foreground">
                    Use LinkedIn, company blogs, and national news to understand mission and latest programmes. Mention local impact projects in your answers.
                  </p>
                </div>
                <div className="rounded-xl border border-primary/30 bg-primary/5 p-4">
                  <h3 className="text-lg font-semibold text-primary-dark">Know yourself</h3>
                  <p className="mt-2 text-sm text-muted-foreground">
                    Prepare story-driven responses using the STAR method. Align your achievements with the competencies the job advert highlights.
                  </p>
                </div>
                <div className="rounded-xl border border-primary/30 bg-primary/5 p-4">
                  <h3 className="text-lg font-semibold text-primary-dark">Know the logistics</h3>
                  <p className="mt-2 text-sm text-muted-foreground">
                    Confirm interview format, dial-in links, transport time, and attire expectations. Aim to arrive 15 minutes early or log into virtual rooms 10 minutes before.
                  </p>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-2xl">
                  <Mic className="h-5 w-5 text-primary" /> Sample questions & strong responses
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4 text-muted-foreground">
                <div className="space-y-2">
                  <h3 className="text-lg font-semibold text-foreground">“Tell us about yourself.”</h3>
                  <p>
                    Structure: education background → relevant project → reason you want this opportunity. Keep it under two minutes and tie back to the role's mission within.
                  </p>
                </div>
                <div className="space-y-2">
                  <h3 className="text-lg font-semibold text-foreground">“Describe a time you solved a challenge.”</h3>
                  <p>
                    Choose examples from campus innovation challenges, community volunteer work, or freelance gigs. Highlight teamwork, creativity, and the positive outcome for community members.
                  </p>
                </div>
                <div className="space-y-2">
                  <h3 className="text-lg font-semibold text-foreground">“What do you know about our organisation?”</h3>
                  <p>
                    Reference current programmes, beneficiaries, awards, or international partnerships. Mention how your long-term goals align with expanding impact in or the region.
                  </p>
                </div>
              </CardContent>
            </Card>

            <Alert>
              <AlertTitle className="flex items-center gap-2">
                <AlertTriangle className="h-5 w-5 text-warning" /> Avoid these common pitfalls
              </AlertTitle>
              <AlertDescription className="space-y-2 text-sm text-muted-foreground">
                <p>Showing up late without notification, reading directly from a script, or ignoring follow-up instructions can cost you the offer.</p>
                <p>Carry printed copies of your CV, academic transcripts, and any recommendation letters—manyn employers still request physical documents.</p>
              </AlertDescription>
            </Alert>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-2xl">
                  <Timer className="h-5 w-5 text-primary" /> 48-hour interview countdown
                </CardTitle>
              </CardHeader>
              <CardContent className="grid gap-4 md:grid-cols-2">
                <div className="rounded-xl border border-border/70 bg-background/80 p-4 space-y-2">
                  <h3 className="text-sm font-semibold text-foreground/90 uppercase tracking-wide">Day before</h3>
                  <ul className="list-disc list-inside text-sm text-muted-foreground space-y-1">
                    <li>Rehearse key stories with a friend or mentor.</li>
                    <li>Test your internet connection and webcam if the interview is virtual.</li>
                    <li>Prepare transport funds or request facilitation where applicable.</li>
                  </ul>
                </div>
                <div className="rounded-xl border border-border/70 bg-background/80 p-4 space-y-2">
                  <h3 className="text-sm font-semibold text-foreground/90 uppercase tracking-wide">Interview day</h3>
                  <ul className="list-disc list-inside text-sm text-muted-foreground space-y-1">
                    <li>Eat light meals to stay energised.</li>
                    <li>Bring copies of mandatory documents in a neat folder.</li>
                    <li>Send a thank-you email within 24 hours referencing specific discussion points.</li>
                  </ul>
                </div>
              </CardContent>
            </Card>

            <div className="flex flex-col items-center gap-4 rounded-2xl border border-primary/20 bg-primary/5 p-6 text-center">
              <h2 className="text-2xl font-semibold text-foreground">Need interview coaching?</h2>
              <p className="text-sm text-muted-foreground">
                Book a mock interview with PlacementBridge mentors and receive personalised feedback tailored to hiring expectations.
              </p>
              <Button variant="hero" asChild>
                <a href="mailto:joronimoamanya@gmail.com?subject=Interview%20Coaching%20Request">Request a session</a>
              </Button>
            </div>

            <QuickNavigation />
          </div>
        </div>
      </main>
    </>
  );
};

export default InterviewTipsUganda;
