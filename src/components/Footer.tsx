import { FormEvent, useState } from "react";
import { Button } from "@/components/ui/button";
import { PageVisitCounter } from "./PageVisitCounter";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { Facebook, Instagram, Twitter, Linkedin, Github, Send, MessageCircle, Phone, Mail, MapPin, Video, Briefcase } from "lucide-react";

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
      // @ts-ignore - Table likely missing in types
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
            <p className="text-muted-foreground text-sm">
              Connecting Uganda's learners, professionals, and organizations with opportunities that power lifelong growth.
            </p>
            <div className="space-y-2">
              <p className="text-sm font-medium text-foreground">Subscribe for updates</p>
              <form className="flex space-x-2" onSubmit={handleNewsletterSubmit}>
                <Input
                  placeholder="Email address"
                  className="flex-1 h-9"
                  value={newsletterEmail}
                  onChange={(event) => setNewsletterEmail(event.target.value)}
                  disabled={subscribing}
                  type="email"
                  required
                />
                <Button size="sm" variant="default" type="submit" disabled={subscribing} className="h-9 px-3">
                  <Send className="w-4 h-4" />
                </Button>
              </form>
            </div>
          </div>

          {/* For Individuals */}
          <div className="space-y-4">
            <h3 className="text-lg font-semibold text-foreground">For Individuals</h3>
            <ul className="space-y-2 text-sm text-muted-foreground">
              <li><a href="/find-placements" className="hover:text-primary transition-colors">Explore Opportunities</a></li>
              <li><a href="/profile" className="hover:text-primary transition-colors">Create Profile</a></li>
              <li><a href="/application-tips" className="hover:text-primary transition-colors">Career Resources</a></li>
              <li><a href="/cv-builder" className="hover:text-primary transition-colors">Build Your CV</a></li>
            </ul>
          </div>

          {/* For Organizations */}
          <div className="space-y-4">
            <h3 className="text-lg font-semibold text-foreground">For Organizations</h3>
            <ul className="space-y-2 text-sm text-muted-foreground">
              <li><a href="/for-companies" className="hover:text-primary transition-colors">Share Opportunities</a></li>
              <li><a href="/find-talent" className="hover:text-primary transition-colors">Discover Talent</a></li>
              <li>
                <a
                  href="mailto:admin@placementbridge.org?subject=Request%20for%20partnership"
                  className="hover:text-primary transition-colors"
                >
                  Partner With Us
                </a>
              </li>
            </ul>
          </div>

          {/* Stay Connected */}
          <div className="space-y-4">
            <h3 className="text-lg font-semibold text-foreground">Stay Connected</h3>
            <div className="space-y-3 text-sm text-muted-foreground">
              <div className="flex items-center gap-2">
                <Phone className="w-4 h-4 text-primary" />
                <div>
                  <div className="text-xs text-muted-foreground/80">Company Info Helpline</div>
                  <a href="tel:+256726128513" className="font-medium text-foreground hover:text-primary transition-colors">+256 726 128 513</a>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <Mail className="w-4 h-4 text-primary" />
                <a href="mailto:info@placementbridge.org" className="hover:text-primary transition-colors">
                  info@placementbridge.org
                </a>
              </div>
              <div className="flex items-center gap-2">
                <MapPin className="w-4 h-4 text-primary" />
                <span>Anywhere in Uganda</span>
              </div>
              <div className="flex items-center gap-2 pt-2">
                <a href="https://wa.me/256726128513" target="_blank" rel="noopener noreferrer" className="text-muted-foreground hover:text-[#25D366] transition-colors p-2 bg-muted rounded-full hover:bg-muted/80">
                  <MessageCircle className="w-5 h-5" />
                  <span className="sr-only">WhatsApp Us</span>
                </a>
                <a href="https://linkedin.com" target="_blank" rel="noopener noreferrer" className="text-muted-foreground hover:text-[#0077b5] transition-colors p-2 bg-muted rounded-full hover:bg-muted/80">
                  <Linkedin className="w-5 h-5" />
                  <span className="sr-only">LinkedIn</span>
                </a>
                <a href="https://twitter.com" target="_blank" rel="noopener noreferrer" className="text-muted-foreground hover:text-foreground transition-colors p-2 bg-muted rounded-full hover:bg-muted/80">
                  <Twitter className="w-5 h-5" />
                  <span className="sr-only">X (Twitter)</span>
                </a>
                <a href="https://tiktok.com" target="_blank" rel="noopener noreferrer" className="text-muted-foreground hover:text-[#ff0050] transition-colors p-2 bg-muted rounded-full hover:bg-muted/80">
                  <Video className="w-5 h-5" />
                  <span className="sr-only">TikTok</span>
                </a>
              </div>
            </div>
          </div>
        </div>

        {/* Bottom Section */}
        <div className="border-t border-border mt-8 pt-8 space-y-4">
          <PageVisitCounter />
          <div className="flex flex-col md:flex-row justify-between items-center gap-4">
            <p className="text-muted-foreground text-sm order-2 md:order-1">
              © 2026 PlacementBridge. All rights reserved.
            </p>
            <nav className="flex flex-wrap justify-center gap-6 text-sm text-muted-foreground order-1 md:order-2">
              <a href="/privacy" className="hover:text-primary transition-colors">Privacy Policy</a>
              <a href="/terms" className="hover:text-primary transition-colors">Terms of Service</a>
              <a href="/support" className="hover:text-primary transition-colors">Support</a>
            </nav>
          </div>
        </div>
      </div>
    </footer>
  );
};

export default Footer;
