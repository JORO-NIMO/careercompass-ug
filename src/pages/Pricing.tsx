import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Check, Sparkles, Crown, Star } from "lucide-react";

const Pricing = () => {
  const plans = [
    {
      name: "Basic Listing",
      price: "Free",
      period: "",
      description: "Perfect for posting standard job openings and internships",
      features: [
        "Post unlimited jobs",
        "Standard listing visibility",
        "Access to candidate database",
        "Email notifications",
        "Basic analytics"
      ],
      cta: "Get Started",
      variant: "outline" as const,
      popular: false
    },
    {
      name: "Featured Listing",
      price: "UGX 50,000",
      period: "/week",
      description: "Increase visibility and reach more qualified candidates faster",
      features: [
        "All Basic features",
        "3x visibility lift",
        "Featured placement in search",
        "Priority support",
        "Advanced analytics",
        "Highlighted border & badge"
      ],
      cta: "Feature Your Listing",
      variant: "default" as const,
      popular: true,
      badge: <Sparkles className="h-4 w-4" />
    },
    {
      name: "Premium Package",
      price: "UGX 200,000",
      period: "/month",
      description: "Complete recruitment solution for active hiring companies",
      features: [
        "All Featured Listing features",
        "Unlimited featured listings",
        "Company verification badge",
        "Dedicated account manager",
        "Priority candidate matching",
        "Custom branding options",
        "Monthly recruitment report"
      ],
      cta: "Go Premium",
      variant: "default" as const,
      popular: false,
      badge: <Crown className="h-4 w-4 text-yellow-500" />
    }
  ];

  return (
    <div className="min-h-screen bg-gradient-to-b from-purple-50 to-white py-12">
      <div className="container mx-auto px-4 max-w-7xl">
        {/* Header */}
        <div className="text-center mb-12">
          <Badge className="mb-4" variant="secondary">Pricing Plans</Badge>
          <h1 className="text-4xl font-bold mb-4">Feature Your Job Listings</h1>
          <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
            Choose the perfect plan to reach qualified candidates faster. Pay only for what you need.
          </p>
        </div>

        {/* Pricing Cards */}
        <div className="grid md:grid-cols-3 gap-8 mb-12">
          {plans.map((plan, index) => (
            <Card
              key={index}
              className={`relative ${
                plan.popular ? "border-blue-500 border-2 shadow-xl" : ""
              }`}
            >
              {plan.popular && (
                <div className="absolute -top-4 left-0 right-0 flex justify-center">
                  <Badge className="bg-blue-500 text-white px-4 py-1">
                    <Star className="h-3 w-3 mr-1" />
                    Most Popular
                  </Badge>
                </div>
              )}
              <CardHeader className="text-center pb-8 pt-8">
                {plan.badge && (
                  <div className="flex justify-center mb-4">
                    <div className="p-3 bg-blue-100 rounded-full">
                      {plan.badge}
                    </div>
                  </div>
                )}
                <CardTitle className="text-2xl mb-2">{plan.name}</CardTitle>
                <div className="mb-4">
                  <span className="text-4xl font-bold">{plan.price}</span>
                  {plan.period && (
                    <span className="text-muted-foreground">{plan.period}</span>
                  )}
                </div>
                <CardDescription>{plan.description}</CardDescription>
              </CardHeader>
              <CardContent>
                <ul className="space-y-3 mb-6">
                  {plan.features.map((feature, featureIndex) => (
                    <li key={featureIndex} className="flex items-start gap-2">
                      <Check className="h-5 w-5 text-green-600 flex-shrink-0 mt-0.5" />
                      <span className="text-sm">{feature}</span>
                    </li>
                  ))}
                </ul>
                <Button
                  className="w-full"
                  variant={plan.variant}
                  size="lg"
                >
                  {plan.cta}
                </Button>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* How Featuring Works */}
        <Card className="mb-12">
          <CardHeader>
            <CardTitle className="text-2xl">How Featuring Works</CardTitle>
            <CardDescription>
              Get maximum visibility for your job listings
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid md:grid-cols-3 gap-8">
              <div className="text-center">
                <div className="bg-blue-100 rounded-full w-16 h-16 flex items-center justify-center mx-auto mb-4">
                  <span className="text-2xl font-bold text-blue-600">1</span>
                </div>
                <h3 className="font-semibold mb-2">Choose Your Feature</h3>
                <p className="text-sm text-muted-foreground">
                  Select the featuring duration that works for your hiring timeline
                </p>
              </div>
              <div className="text-center">
                <div className="bg-blue-100 rounded-full w-16 h-16 flex items-center justify-center mx-auto mb-4">
                  <span className="text-2xl font-bold text-blue-600">2</span>
                </div>
                <h3 className="font-semibold mb-2">Increased Visibility</h3>
                <p className="text-sm text-muted-foreground">
                  Your listing appears at the top of search results with a special badge
                </p>
              </div>
              <div className="text-center">
                <div className="bg-blue-100 rounded-full w-16 h-16 flex items-center justify-center mx-auto mb-4">
                  <span className="text-2xl font-bold text-blue-600">3</span>
                </div>
                <h3 className="font-semibold mb-2">Get More Applications</h3>
                <p className="text-sm text-muted-foreground">
                  Reach 3x more qualified candidates and hire faster
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Payment Methods */}
        <Card className="mb-12">
          <CardHeader>
            <CardTitle>Accepted Payment Methods</CardTitle>
            <CardDescription>
              We support multiple payment options for your convenience
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid md:grid-cols-2 gap-6">
              <div className="flex items-center gap-4 p-4 border rounded-lg">
                <div className="bg-blue-100 p-3 rounded-lg">
                  <svg className="h-8 w-8 text-blue-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" />
                  </svg>
                </div>
                <div>
                  <h3 className="font-semibold">Credit/Debit Cards</h3>
                  <p className="text-sm text-muted-foreground">Visa, Mastercard, American Express</p>
                </div>
              </div>
              <div className="flex items-center gap-4 p-4 border rounded-lg">
                <div className="bg-green-100 p-3 rounded-lg">
                  <svg className="h-8 w-8 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 18h.01M8 21h8a2 2 0 002-2V5a2 2 0 00-2-2H8a2 2 0 00-2 2v14a2 2 0 002 2z" />
                  </svg>
                </div>
                <div>
                  <h3 className="font-semibold">Mobile Money</h3>
                  <p className="text-sm text-muted-foreground">MTN Mobile Money, Airtel Money</p>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* FAQ */}
        <Card>
          <CardHeader>
            <CardTitle>Frequently Asked Questions</CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            <div>
              <h3 className="font-semibold mb-2">Can I cancel or change my feature?</h3>
              <p className="text-sm text-muted-foreground">
                Yes, you can cancel your feature at any time. Refunds are prorated based on the remaining time.
              </p>
            </div>
            <div>
              <h3 className="font-semibold mb-2">How long does verification take?</h3>
              <p className="text-sm text-muted-foreground">
                Company verification typically takes 1-2 business days. You'll receive an email once approved.
              </p>
            </div>
            <div>
              <h3 className="font-semibold mb-2">Can I feature multiple listings?</h3>
              <p className="text-sm text-muted-foreground">
                Yes! You can feature as many listings as needed. Premium plan includes unlimited featured placements.
              </p>
            </div>
            <div>
              <h3 className="font-semibold mb-2">What payment methods do you accept?</h3>
              <p className="text-sm text-muted-foreground">
                We accept credit/debit cards (Visa, Mastercard, Amex) and mobile money (MTN, Airtel).
              </p>
            </div>
          </CardContent>
        </Card>

        {/* Contact CTA */}
        <div className="mt-12 text-center">
          <h2 className="text-2xl font-bold mb-4">Need a Custom Solution?</h2>
          <p className="text-muted-foreground mb-6">
            Contact us for enterprise pricing and custom recruitment packages
          </p>
          <Button size="lg" variant="outline">
            Contact Sales
          </Button>
        </div>
      </div>
    </div>
  );
};

export default Pricing;
