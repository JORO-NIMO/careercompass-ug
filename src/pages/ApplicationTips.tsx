import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { CheckCircle, FileText, Target, Users, Briefcase, Mail, Phone } from "lucide-react";

const ApplicationTips = () => {
  const tipCategories = [
    {
      icon: <FileText className="h-5 w-5" />,
      title: "Resume & CV Tips",
      tips: [
        "Keep your CV to 1-2 pages maximum",
        "Use clear, professional fonts (Arial, Calibri, Times New Roman)",
        "Include relevant skills and keywords from the job description",
        "Quantify achievements with numbers and percentages",
        "Tailor your CV for each application",
        "Proofread multiple times - no spelling or grammar errors"
      ]
    },
    {
      icon: <Mail className="h-5 w-5" />,
      title: "Cover Letter Best Practices",
      tips: [
        "Address the hiring manager by name if possible",
        "Show enthusiasm for the specific role and company",
        "Explain why you're a great fit with specific examples",
        "Keep it concise - 3-4 paragraphs maximum",
        "Close with a clear call to action",
        "Match the tone to the company culture"
      ]
    },
    {
      icon: <Users className="h-5 w-5" />,
      title: "Interview Preparation",
      tips: [
        "Research the company thoroughly - mission, values, recent news",
        "Prepare answers using the STAR method (Situation, Task, Action, Result)",
        "Practice common questions out loud",
        "Prepare 3-5 thoughtful questions to ask the interviewer",
        "Dress appropriately for the company culture",
        "Arrive 10-15 minutes early (or test tech for virtual interviews)"
      ]
    },
    {
      icon: <Target className="h-5 w-5" />,
      title: "Application Strategy",
      tips: [
        "Apply early - don't wait until the deadline",
        "Follow up 1-2 weeks after applying",
        "Network with employees at target companies",
        "Track your applications in a spreadsheet",
        "Customize each application - avoid mass applying",
        "Apply even if you don't meet 100% of requirements"
      ]
    },
    {
      icon: <Phone className="h-5 w-5" />,
      title: "Virtual Interview Tips",
      tips: [
        "Test your tech (camera, mic, internet) beforehand",
        "Choose a quiet, well-lit location with a clean background",
        "Look at the camera, not the screen, when speaking",
        "Dress professionally from head to toe",
        "Have notes handy but don't read from them",
        "Minimize distractions - close other apps and silence phone"
      ]
    },
    {
      icon: <Briefcase className="h-5 w-5" />,
      title: "Professional Etiquette",
      tips: [
        "Send a thank-you email within 24 hours of the interview",
        "Use a professional email address (firstname.lastname@email.com)",
        "Maintain professional social media profiles",
        "Be polite and professional with everyone you encounter",
        "Respond to emails promptly (within 24-48 hours)",
        "Be honest about your skills and experience"
      ]
    }
  ];

  const commonQuestions = [
    {
      question: "Tell me about yourself",
      guidance: "Focus on your professional journey, key skills, and why you're interested in this role. Keep it to 2-3 minutes. Structure: Present situation → Past experience → Future goals."
    },
    {
      question: "Why do you want to work here?",
      guidance: "Show you've researched the company. Mention specific projects, values, or culture aspects that align with your goals. Connect it to how you can contribute."
    },
    {
      question: "What are your strengths and weaknesses?",
      guidance: "For strengths: Pick 2-3 relevant to the job with examples. For weaknesses: Choose something genuine you're actively working to improve, and explain how."
    },
    {
      question: "Where do you see yourself in 5 years?",
      guidance: "Show ambition but be realistic. Focus on skills you want to develop and impact you want to make. Demonstrate commitment to growth within their field."
    },
    {
      question: "Tell me about a challenge you've overcome",
      guidance: "Use STAR method: Describe the Situation, your Task, the Action you took, and the positive Result. Choose a story that shows problem-solving and resilience."
    },
    {
      question: "Why should we hire you?",
      guidance: "Summarize your top 3-4 qualifications that match the job. Show enthusiasm and confidence. Explain what unique value you'll bring to the team."
    }
  ];

  return (
    <div className="min-h-screen bg-gradient-to-b from-blue-50 to-white py-12">
      <div className="container mx-auto px-4 max-w-6xl">
        {/* Header */}
        <div className="text-center mb-12">
          <Badge className="mb-4" variant="secondary">Career Resources</Badge>
          <h1 className="text-4xl font-bold mb-4">Application Tips & Career Guidance</h1>
          <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
            Expert advice to help you land your next learning, training, or career opportunity—from crafting the perfect CV to acing your interviews.
          </p>
        </div>

        {/* Quick Tips Grid */}
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6 mb-12">
          {tipCategories.map((category, index) => (
            <Card key={index} className="hover:shadow-lg transition-shadow">
              <CardHeader>
                <div className="flex items-center gap-3 mb-2">
                  <div className="p-2 bg-blue-100 rounded-lg text-blue-600">
                    {category.icon}
                  </div>
                  <CardTitle className="text-lg">{category.title}</CardTitle>
                </div>
              </CardHeader>
              <CardContent>
                <ul className="space-y-2">
                  {category.tips.map((tip, tipIndex) => (
                    <li key={tipIndex} className="flex items-start gap-2 text-sm">
                      <CheckCircle className="h-4 w-4 text-green-600 mt-0.5 flex-shrink-0" />
                      <span>{tip}</span>
                    </li>
                  ))}
                </ul>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Common Interview Questions */}
        <Card className="mb-12">
          <CardHeader>
            <CardTitle className="text-2xl">Common Interview Questions & How to Answer</CardTitle>
            <CardDescription>
              Prepare for these frequently asked questions with our expert guidance
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Accordion type="single" collapsible className="w-full">
              {commonQuestions.map((item, index) => (
                <AccordionItem key={index} value={`item-${index}`}>
                  <AccordionTrigger className="text-left font-medium">
                    {item.question}
                  </AccordionTrigger>
                  <AccordionContent className="text-muted-foreground">
                    {item.guidance}
                  </AccordionContent>
                </AccordionItem>
              ))}
            </Accordion>
          </CardContent>
        </Card>

        {/* Additional Resources */}
        <Card className="bg-blue-50 border-blue-200">
          <CardHeader>
            <CardTitle>Ready to Apply?</CardTitle>
            <CardDescription>
              Use our tools to create a standout application
            </CardDescription>
          </CardHeader>
          <CardContent className="flex flex-col sm:flex-row gap-4">
            <a
              href="/cv-builder"
              className="flex-1 bg-white p-4 rounded-lg border hover:shadow-md transition-shadow cursor-pointer"
            >
              <div className="flex items-center gap-3 mb-2">
                <FileText className="h-5 w-5 text-blue-600" />
                <h3 className="font-semibold">CV Builder</h3>
              </div>
              <p className="text-sm text-muted-foreground">
                Create a professional CV with our easy-to-use builder
              </p>
            </a>
            <a
              href="/find-placements"
              className="flex-1 bg-white p-4 rounded-lg border hover:shadow-md transition-shadow cursor-pointer"
            >
              <div className="flex items-center gap-3 mb-2">
                <Briefcase className="h-5 w-5 text-blue-600" />
                <h3 className="font-semibold">Find Opportunities</h3>
              </div>
              <p className="text-sm text-muted-foreground">
                Browse opportunities across education and employment
              </p>
            </a>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default ApplicationTips;
