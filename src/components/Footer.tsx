import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Briefcase, Mail, Phone, MapPin, Twitter, Facebook, Linkedin } from "lucide-react";

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
              <Button variant="ghost" size="icon">
                <Facebook className="w-5 h-5" />
              </Button>
              <Button variant="ghost" size="icon">
                <Twitter className="w-5 h-5" />
              </Button>
              <Button variant="ghost" size="icon">
                <Linkedin className="w-5 h-5" />
              </Button>
            </div>
          </div>

          {/* For Students */}
          <div className="space-y-4">
            <h3 className="text-lg font-semibold text-foreground">For Students</h3>
            <ul className="space-y-2 text-muted-foreground">
              <li><a href="#" className="hover:text-primary transition-colors">Find Placements</a></li>
              <li><a href="#" className="hover:text-primary transition-colors">Create Profile</a></li>
              <li><a href="#" className="hover:text-primary transition-colors">Application Tips</a></li>
              <li><a href="#" className="hover:text-primary transition-colors">CV Builder</a></li>
            </ul>
          </div>

          {/* For Companies */}
          <div className="space-y-4">
            <h3 className="text-lg font-semibold text-foreground">For Companies</h3>
            <ul className="space-y-2 text-muted-foreground">
              <li><a href="#" className="hover:text-primary transition-colors">Post Placements</a></li>
              <li><a href="#" className="hover:text-primary transition-colors">Find Talent</a></li>
              <li><a href="#" className="hover:text-primary transition-colors">Company Verification</a></li>
              <li><a href="#" className="hover:text-primary transition-colors">Pricing</a></li>
            </ul>
          </div>

          {/* Contact & Newsletter */}
          <div className="space-y-4">
            <h3 className="text-lg font-semibold text-foreground">Stay Connected</h3>
            <div className="space-y-3">
              <div className="flex items-center space-x-2 text-muted-foreground">
                <Mail className="w-4 h-4" />
                <span className="text-sm">hello@placementsbridge.ug</span>
              </div>
              <div className="flex items-center space-x-2 text-muted-foreground">
                <Phone className="w-4 h-4" />
                <span className="text-sm">+256 700 000 000</span>
              </div>
              <div className="flex items-center space-x-2 text-muted-foreground">
                <MapPin className="w-4 h-4" />
                <span className="text-sm">Kampala, Uganda</span>
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
            <a href="#" className="hover:text-primary transition-colors">Privacy Policy</a>
            <a href="#" className="hover:text-primary transition-colors">Terms of Service</a>
            <a href="#" className="hover:text-primary transition-colors">Support</a>
          </div>
        </div>
      </div>
    </footer>
  );
};

export default Footer;