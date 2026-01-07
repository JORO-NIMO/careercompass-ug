import { Button } from "@/components/ui/button";
import { Menu, Briefcase, LogOut, Shield, Search } from "lucide-react";
import NotificationBell from "@/components/NotificationBell";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";

const Header = () => {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const { user, signOut, isAdmin } = useAuth();
  const [unread, setUnread] = useState(0);

  useEffect(() => {
    if (!user) return;
    const loadUnread = async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        if (!session?.access_token) return;

        const response = await fetch('/api/notifications?unread=1', {
          headers: {
            'Authorization': `Bearer ${session.access_token}`
          }
        });
        const data = await response.json();
        setUnread(data.unread ?? 0);
      } catch (err) {
        console.error('Failed to fetch unread notifications:', err);
        setUnread(0);
      }
    };
    loadUnread();
  }, [user]);
  const navigate = useNavigate();

  const handleSignOut = async () => {
    await signOut();
    navigate('/');
  };

  return (
    <header className="border-b border-border bg-background sticky top-0 z-50">
      <div className="container mx-auto px-4 h-16 flex items-center justify-between">
        {/* Logo */}
        {/* Logo */}
        <Link to="/" className="flex items-center space-x-3 mr-8">
          <img src="/favicon.ico" alt="PlacementBridge" className="w-12 h-12 rounded-md object-cover" />
          <span className="text-3xl font-bold text-foreground">PlacementBridge</span>
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
          {isAdmin && (
            <Link to="/admin" className="text-muted-foreground hover:text-primary transition-colors flex items-center gap-1">
              <Shield className="w-4 h-4" />
              Admin
            </Link>
          )}
        </nav>

        {/* Search Bar */}
        <div className="hidden md:flex items-center flex-1 max-w-sm mx-6">
          <form onSubmit={(e) => {
            e.preventDefault();
            const form = e.target as HTMLFormElement;
            const input = form.elements.namedItem('q') as HTMLInputElement;
            const query = input.value.trim();
            if (query) {
              const target = window.location.pathname.includes('find-talent') ? '/find-talent' : '/find-placements';
              window.location.href = `${target}?q=${encodeURIComponent(query)}`;
            }
          }} className="relative w-full">
            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
            <input
              name="q"
              type="search"
              placeholder="Search..."
              className="w-full bg-muted/50 border border-input rounded-md pl-9 pr-4 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-primary"
            />
          </form>
        </div>

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
