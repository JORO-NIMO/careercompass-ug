import { FormEvent, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { Briefcase, Mail, Phone, MapPin, Twitter, Linkedin, MessageCircle, Music4 } from "lucide-react";

const Footer = () => {
  const { toast } = useToast();
  const [newsletterEmail, setNewsletterEmail] = useState("");
  const [subscribing, setSubscribing] = useState(false);

  const handleNewsletterSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const email = newsletterEmail.trim();
    if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      toast({
        title: "Enter a valid email",
        description: "Add a work or personal email so we can reach you.",
        variant: "destructive",
      });
      return;
    }

    try {
      setSubscribing(true);
      const { error } = await supabase.from("newsletter_subscribers").insert({
        email,
        source: "footer",
      });

      if (error) {
        if (error.code === "23505") {
          toast({ title: "Already subscribed", description: "You're on the list — we'll keep the updates coming." });
          return;
        }
        throw error;
      }

      setNewsletterEmail("");
      toast({ title: "Subscribed", description: "Thanks! Look out for the next PlacementBridge digest." });
    } catch (caught) {
      console.error("Newsletter subscribe failed", caught);
      toast({ title: "Unable to subscribe", description: "Please try again shortly.", variant: "destructive" });
    } finally {
      setSubscribing(false);
    }
  };

  return (
    <footer className="bg-muted/30 border-t border-border">
      <div className="container mx-auto px-4 py-12">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
          {/* Brand Section */}
          <div className="space-y-4">
            <div className="flex items-center space-x-2">
              <div className="w-8 h-8 bg-primary rounded-lg flex items-center justify-center">
                <Briefcase className="w-5 h-5 text-primary-foreground" />
              </div>
              <span className="text-xl font-bold text-foreground">PlacementBridge</span>
            </div>
            <p className="text-muted-foreground">
              Connecting Uganda's learners, professionals, and organizations with opportunities that power lifelong growth.
            </p>
            <div className="flex space-x-3">
              <Button variant="ghost" size="icon" asChild>
                <a
                  href="https://www.linkedin.com/company/placementbridge/"
                  target="_blank"
                  rel="noopener noreferrer"
                  aria-label="LinkedIn"
                >
                  <Linkedin className="w-5 h-5" />
                </a>
              </Button>
              <Button variant="ghost" size="icon" asChild>
                <a
                  href="https://x.com/placementbridge"
                  target="_blank"
                  rel="noopener noreferrer"
                  aria-label="X (Twitter)"
                >
                  <Twitter className="w-5 h-5" />
                </a>
              </Button>
              <Button variant="ghost" size="icon" asChild>
                <a
                  href="https://www.tiktok.com/@placementbridge"
                  target="_blank"
                  rel="noopener noreferrer"
                  aria-label="TikTok"
                >
                  <Music4 className="w-5 h-5" />
                </a>
              </Button>
            </div>
          </div>

          {/* For Individuals */}
          <div className="space-y-4">
            <h3 className="text-lg font-semibold text-foreground">For Individuals</h3>
            <ul className="space-y-2 text-muted-foreground">
              <li><a href="/find-placements" className="hover:text-primary transition-colors">Explore Opportunities</a></li>
              <li><a href="/profile" className="hover:text-primary transition-colors">Create Profile</a></li>
              <li><a href="/application-tips" className="hover:text-primary transition-colors">Career Resources</a></li>
              <li><a href="/cv-builder" className="hover:text-primary transition-colors">Build Your CV</a></li>
            </ul>
          </div>

          {/* For Organizations */}
          <div className="space-y-4">
            <h3 className="text-lg font-semibold text-foreground">For Organizations</h3>
            <ul className="space-y-2 text-muted-foreground">
              <li><a href="/for-companies" className="hover:text-primary transition-colors">Share Opportunities</a></li>
              <li><a href="/find-talent" className="hover:text-primary transition-colors">Discover Talent</a></li>
              <li>
                <a
                  href="mailto:partnerships@placementbridge.org?subject=Request%20for%20partnership&body=Hello%20PlacementBridge%20team%2C%0A%0AI%20would%20love%20to%20partner%20with%20you%20to%20support%20learners%20and%20employers.%20Here%20are%20the%20details%3A%0A-%20Organisation%20name%3A%0A-%20Partnership%20goal%3A%0A-%20Preferred%20start%20date%3A%0A-%20Key%20contacts%3A%0A%0ALooking%20forward%20to%20hearing%20from%20you.%0A"
                  className="hover:text-primary transition-colors"
                >
                  Partner With Us
                </a>
              </li>
              <li><a href="/pricing" className="hover:text-primary transition-colors">Pricing & Plans</a></li>
            </ul>
          </div>

          {/* Contact & Newsletter */}
          <div className="space-y-4">
            <h3 className="text-lg font-semibold text-foreground">Stay Connected</h3>
            <div className="space-y-3">
              <div className="flex items-center space-x-2 text-muted-foreground">
                <Mail className="w-4 h-4" />
                <a href="mailto:info@placementbridge.org" className="text-sm hover:text-primary transition-colors">
                  info@placementbridge.org
                </a>
              </div>
              <div className="flex items-center space-x-2 text-muted-foreground">
                <Phone className="w-4 h-4" />
                <a href="tel:+256726128513" className="text-sm hover:text-primary transition-colors">
                  +256 726 128 513
                </a>
              </div>
              <div className="flex items-center space-x-2 text-muted-foreground">
                <MessageCircle className="w-4 h-4" />
                <a 
                  href="https://wa.me/256726128513" 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="text-sm hover:text-primary transition-colors"
                >
                  WhatsApp Us
                </a>
              </div>
              <div className="flex items-center space-x-2 text-muted-foreground">
                <MapPin className="w-4 h-4" />
                <span className="text-sm">Anywhere in Uganda</span>
              </div>
              <div className="flex items-center space-x-2 text-muted-foreground">
                <Linkedin className="w-4 h-4" />
                <a
                  href="https://www.linkedin.com/company/placementbridge/"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-sm hover:text-primary transition-colors"
                >
                  LinkedIn
                </a>
              </div>
              <div className="flex items-center space-x-2 text-muted-foreground">
                <Twitter className="w-4 h-4" />
                <a
                  href="https://x.com/placementbridge"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-sm hover:text-primary transition-colors"
                >
                  X (Twitter)
                </a>
              </div>
              <div className="flex items-center space-x-2 text-muted-foreground">
                <Music4 className="w-4 h-4" />
                <a
                  href="https://www.tiktok.com/@placementbridge"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-sm hover:text-primary transition-colors"
                >
                  TikTok
                </a>
              </div>
            </div>
            <div className="space-y-2">
              <p className="text-sm text-muted-foreground">Subscribe for updates</p>
              <form className="flex space-x-2" onSubmit={handleNewsletterSubmit}>
                <Input
                  placeholder="Email address"
                  className="flex-1"
                  value={newsletterEmail}
                  onChange={(event) => setNewsletterEmail(event.target.value)}
                  disabled={subscribing}
                  type="email"
                  required
                />
                <Button size="sm" variant="default" type="submit" disabled={subscribing}>
                  {subscribing ? "Sending..." : "Subscribe"}
                </Button>
              </form>
            </div>
          </div>
        </div>

        {/* Bottom Section */}
        <div className="border-t border-border mt-8 pt-8 space-y-4">
          <nav className="flex flex-wrap justify-center gap-4 text-sm text-muted-foreground">
            <a href="/find-placements" className="hover:text-primary transition-colors">Find Placements</a>
            <a href="/find-talent" className="hover:text-primary transition-colors">Find Talent</a>
            <a href="/application-tips" className="hover:text-primary transition-colors">Resources</a>
            <a href="/for-companies" className="hover:text-primary transition-colors">For Companies</a>
            <a href="/pricing" className="hover:text-primary transition-colors">Pricing</a>
          </nav>
          <div className="flex flex-col md:flex-row justify-between items-center space-y-4 md:space-y-0">
            <p className="text-muted-foreground text-sm">
              © 2026 PlacementBridge. All rights reserved.
            </p>
            <div className="flex space-x-6 text-sm text-muted-foreground">
              <a href="/privacy" className="hover:text-primary transition-colors">Privacy Policy</a>
              <a href="/terms" className="hover:text-primary transition-colors">Terms of Service</a>
              <a href="/support" className="hover:text-primary transition-colors">Support</a>
            </div>
          </div>
        </div>
      </div>
    </footer>
  );
};

export default Footer;