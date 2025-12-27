import { Button } from "@/components/ui/button";
import { Menu, Briefcase, LogOut, Shield } from "lucide-react";
import NotificationBell from "@/components/NotificationBell";
import { useEffect, useState } from "react";
import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";

const Header = () => {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const { user, signOut, isAdmin } = useAuth();
  const [unread, setUnread] = useState(0);

  useEffect(() => {
    if (!user) return;
    fetch('/api/notifications?unread=1', { credentials: 'include' })
      .then((r) => r.json())
      .then((data) => setUnread(data.unread ?? 0))
      .catch(() => setUnread(0));
  }, [user]);
  const navigate = useNavigate();

  const handleSignOut = async () => {
    await signOut();
    navigate('/');
  };

  return (
    <header className="border-b border-border bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 sticky top-0 z-50">
      <div className="container mx-auto px-4 h-16 flex items-center justify-between">
        {/* Logo */}
        <Link to="/" className="flex items-center space-x-2">
          <img src="/favicon.ico" alt="PlacementBridge" className="w-8 h-8 rounded-md object-cover" />
          <span className="text-xl font-bold text-foreground">PlacementBridge</span>
        </Link>

        {/* Desktop Navigation */}
        <nav className="hidden md:flex items-center space-x-6">
          <Link to="/find-placements" className="text-muted-foreground hover:text-primary transition-colors">
            Find Placements
          </Link>
          <Link to="/find-talent" className="text-muted-foreground hover:text-primary transition-colors">
            Find Talent
          </Link>
          <Link to="/application-tips" className="text-muted-foreground hover:text-primary transition-colors">
            Resources
          </Link>
          <Link to="/for-companies" className="text-muted-foreground hover:text-primary transition-colors">
            For Companies
          </Link>
          <Link to="/pricing" className="text-muted-foreground hover:text-primary transition-colors">
            Pricing
          </Link>
          {isAdmin && (
            <Link to="/admin" className="text-muted-foreground hover:text-primary transition-colors flex items-center gap-1">
              <Shield className="w-4 h-4" />
              Admin
            </Link>
          )}
        </nav>

        {/* Desktop Actions */}
        <div className="hidden md:flex items-center space-x-3">
          {user ? (
            <>
              <NotificationBell unread={unread} onClick={() => navigate('/notifications')} />
              <Link to="/profile">
                <Button variant="outline">Profile</Button>
              </Link>
              <Button variant="ghost" onClick={handleSignOut}>
                <LogOut className="w-4 h-4 mr-2" />
                Sign Out
              </Button>
            </>
          ) : (
            <>
              <Link to="/signin">
                <Button variant="outline">Sign In</Button>
              </Link>
              <Link to="/for-companies">
                <Button variant="hero">Post Placement</Button>
              </Link>
            </>
          )}
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
            <Link to="/find-placements" className="block py-2 text-muted-foreground hover:text-primary transition-colors">
              Find Placements
            </Link>
            <Link to="/find-talent" className="block py-2 text-muted-foreground hover:text-primary transition-colors">
              Find Talent
            </Link>
            <Link to="/application-tips" className="block py-2 text-muted-foreground hover:text-primary transition-colors">
              Resources
            </Link>
            <Link to="/for-companies" className="block py-2 text-muted-foreground hover:text-primary transition-colors">
              For Companies
            </Link>
            <Link to="/pricing" className="block py-2 text-muted-foreground hover:text-primary transition-colors">
              Pricing
            </Link>
            {isAdmin && (
              <Link to="/admin" className="block py-2 text-muted-foreground hover:text-primary transition-colors">
                Admin Dashboard
              </Link>
            )}
            <div className="pt-3 space-y-2 border-t border-border">
              {user ? (
                <>
                  <Link to="/profile" className="block">
                    <Button variant="outline" className="w-full">Profile</Button>
                  </Link>
                  <Button variant="ghost" className="w-full" onClick={handleSignOut}>
                    Sign Out
                  </Button>
                </>
              ) : (
                <>
                  <Link to="/signin" className="block">
                    <Button variant="outline" className="w-full">Sign In</Button>
                  </Link>
                  <Link to="/for-companies" className="block">
                    <Button variant="hero" className="w-full">Post Placement</Button>
                  </Link>
                </>
              )}
            </div>
          </div>
        </div>
      )}
    </header>
  );
};

export default Header;
