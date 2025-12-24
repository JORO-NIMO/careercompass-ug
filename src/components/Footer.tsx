import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Briefcase, Mail, Phone, MapPin, Twitter, Linkedin, MessageCircle, Music4 } from "lucide-react";

const Footer = () => {
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
              <span className="text-xl font-bold text-foreground">PlacementsBridge</span>
            </div>
            <p className="text-muted-foreground">
              Connecting Uganda's brightest students with leading companies for meaningful internship experiences.
            </p>
            <div className="flex space-x-3">
              <Button variant="ghost" size="icon" asChild>
                <a
                  href="https://www.linkedin.com/in/joronimo-amanya-00a516344/"
                  target="_blank"
                  rel="noopener noreferrer"
                  aria-label="LinkedIn"
                >
                  <Linkedin className="w-5 h-5" />
                </a>
              </Button>
              <Button variant="ghost" size="icon" asChild>
                <a
                  href="https://x.com/Ishabarundo"
                  target="_blank"
                  rel="noopener noreferrer"
                  aria-label="X (Twitter)"
                >
                  <Twitter className="w-5 h-5" />
                </a>
              </Button>
              <Button variant="ghost" size="icon" asChild>
                <a
                  href="https://www.tiktok.com/@ishabarundo"
                  target="_blank"
                  rel="noopener noreferrer"
                  aria-label="TikTok"
                >
                  <Music4 className="w-5 h-5" />
                </a>
              </Button>
            </div>
          </div>

          {/* For Students */}
          <div className="space-y-4">
            <h3 className="text-lg font-semibold text-foreground">For Students</h3>
            <ul className="space-y-2 text-muted-foreground">
              <li><a href="/find-placements" className="hover:text-primary transition-colors">Find Placements</a></li>
              <li><a href="/profile" className="hover:text-primary transition-colors">Create Profile</a></li>
              <li><a href="/application-tips" className="hover:text-primary transition-colors">Application Tips</a></li>
              <li><a href="/cv-builder" className="hover:text-primary transition-colors">CV Builder</a></li>
            </ul>
          </div>

          {/* For Companies */}
          <div className="space-y-4">
            <h3 className="text-lg font-semibold text-foreground">For Companies</h3>
            <ul className="space-y-2 text-muted-foreground">
              <li><a href="/for-companies" className="hover:text-primary transition-colors">Post Placements</a></li>
              <li><a href="/find-talent" className="hover:text-primary transition-colors">Find Talent</a></li>
              <li><a href="/for-companies" className="hover:text-primary transition-colors">Company Verification</a></li>
              <li><a href="/pricing" className="hover:text-primary transition-colors">Pricing</a></li>
            </ul>
          </div>

          {/* Contact & Newsletter */}
          <div className="space-y-4">
            <h3 className="text-lg font-semibold text-foreground">Stay Connected</h3>
            <div className="space-y-3">
              <div className="flex items-center space-x-2 text-muted-foreground">
                <Mail className="w-4 h-4" />
                <a href="mailto:joronimoamanya@gmail.com" className="text-sm hover:text-primary transition-colors">
                  joronimoamanya@gmail.com
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
                <span className="text-sm">Kampala, Uganda</span>
              </div>
              <div className="flex items-center space-x-2 text-muted-foreground">
                <Linkedin className="w-4 h-4" />
                <a
                  href="https://www.linkedin.com/in/joronimo-amanya-00a516344/"
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
                  href="https://x.com/Ishabarundo"
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
                  href="https://www.tiktok.com/@ishabarundo"
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
              <div className="flex space-x-2">
                <Input placeholder="Email address" className="flex-1" />
                <Button size="sm" variant="default">Subscribe</Button>
              </div>
            </div>
          </div>
        </div>

        {/* Bottom Section */}
        <div className="border-t border-border mt-8 pt-8 flex flex-col md:flex-row justify-between items-center space-y-4 md:space-y-0">
          <p className="text-muted-foreground text-sm">
            © 2024 PlacementsBridge. All rights reserved.
          </p>
          <div className="flex space-x-6 text-sm text-muted-foreground">
            <a href="/privacy" className="hover:text-primary transition-colors">Privacy Policy</a>
            <a href="/terms" className="hover:text-primary transition-colors">Terms of Service</a>
            <a href="/support" className="hover:text-primary transition-colors">Support</a>
          </div>
        </div>
      </div>
    </footer>
  );
};

export default Footer;