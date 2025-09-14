import { Button } from "@/components/ui/button";
import { Bell, Menu, User, Briefcase, Search } from "lucide-react";
import { useState } from "react";

const Header = () => {
  const [isMenuOpen, setIsMenuOpen] = useState(false);

  return (
    <header className="border-b border-border bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 sticky top-0 z-50">
      <div className="container mx-auto px-4 h-16 flex items-center justify-between">
        {/* Logo */}
        <div className="flex items-center space-x-2">
          <div className="w-8 h-8 bg-primary rounded-lg flex items-center justify-center">
            <Briefcase className="w-5 h-5 text-primary-foreground" />
          </div>
          <span className="text-xl font-bold text-foreground">PlacementsBridge</span>
        </div>

        {/* Desktop Navigation */}
        <nav className="hidden md:flex items-center space-x-6">
          <a href="#" className="text-muted-foreground hover:text-primary transition-colors">
            Find Placements
          </a>
          <a href="#" className="text-muted-foreground hover:text-primary transition-colors">
            For Companies
          </a>
          <a href="#" className="text-muted-foreground hover:text-primary transition-colors">
            About
          </a>
        </nav>

        {/* Desktop Actions */}
        <div className="hidden md:flex items-center space-x-3">
          <Button variant="ghost" size="icon" className="relative">
            <Bell className="w-5 h-5" />
            <span className="absolute -top-1 -right-1 w-2 h-2 bg-accent rounded-full"></span>
          </Button>
          <Button variant="outline">Sign In</Button>
          <Button variant="hero">Post Placement</Button>
        </div>

        {/* Mobile Menu Button */}
        <Button
          variant="ghost"
          size="icon"
          className="md:hidden"
          onClick={() => setIsMenuOpen(!isMenuOpen)}
        >
          <Menu className="w-5 h-5" />
        </Button>
      </div>

      {/* Mobile Menu */}
      {isMenuOpen && (
        <div className="md:hidden border-t border-border bg-background">
          <div className="container mx-auto px-4 py-4 space-y-3">
            <a href="#" className="block py-2 text-muted-foreground hover:text-primary transition-colors">
              Find Placements
            </a>
            <a href="#" className="block py-2 text-muted-foreground hover:text-primary transition-colors">
              For Companies
            </a>
            <a href="#" className="block py-2 text-muted-foreground hover:text-primary transition-colors">
              About
            </a>
            <div className="pt-3 space-y-2 border-t border-border">
              <Button variant="outline" className="w-full">Sign In</Button>
              <Button variant="hero" className="w-full">Post Placement</Button>
            </div>
          </div>
        </div>
      )}
    </header>
  );
};

export default Header;