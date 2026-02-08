import { Button } from "@/components/ui/button";
import { Menu, Briefcase, LogOut, Shield, Search } from "lucide-react";
import NotificationBell from "@/components/common/NotificationBell";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Link, useNavigate } from "react-router-dom";
import { trackAction } from "@/lib/analytics";
import { useAuth } from "@/hooks/useAuth";
import { useLocale } from "@/hooks/LocaleProvider";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

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
  const { locale, setLocale } = useLocale();

  const handleSignOut = async () => {
    await signOut();
    navigate('/');
  };

  return (
    <header className="border-b border-border bg-background sticky top-0 z-50">
      <div className="container mx-auto px-4 h-16 flex items-center justify-between">
        {/* Logo */}
        <Link to="/" className="flex items-center space-x-2 shrink-0">
          <img src="/favicon.ico" alt="PlacementBridge" className="w-8 h-8 rounded-md object-cover" />
          <span className="text-xl font-bold text-foreground">PlacementBridge</span>
        </Link>

        {/* Desktop Navigation */}
        <nav className="hidden md:flex items-center space-x-4 ml-8">
          <Link to="/find-placements" className="text-sm text-muted-foreground hover:text-primary transition-colors whitespace-nowrap">
            Find Placements
          </Link>
          <Link to="/find-talent" className="text-sm text-muted-foreground hover:text-primary transition-colors whitespace-nowrap">
            Find Talent
          </Link>
          <Link to="/application-tips" className="text-sm text-muted-foreground hover:text-primary transition-colors whitespace-nowrap">
            Resources
          </Link>
{user && (
            <Link to="/opportunities-chat" className="text-sm text-muted-foreground hover:text-primary transition-colors whitespace-nowrap">
              AI Chat
            </Link>
          )}
          <Link to="/for-companies" className="text-sm text-muted-foreground hover:text-primary transition-colors whitespace-nowrap">
            For Companies
          </Link>
          {isAdmin && (
            <>
              <Link to="/admin" className="text-sm text-muted-foreground hover:text-primary transition-colors flex items-center gap-1 whitespace-nowrap">
                <Shield className="w-4 h-4" />
                Admin
              </Link>
              <Link to="/admin/security" className="text-sm text-muted-foreground hover:text-primary transition-colors whitespace-nowrap">
                Security
              </Link>
            </>
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
              trackAction('search.query', { query });
              const target = window.location.pathname.includes('find-talent') ? '/find-talent' : '/find-placements';
              window.location.href = `${target}?q=${encodeURIComponent(query)}`;
            }
          }} className="relative w-full">
            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
            <input
              name="q"
              type="search"
              placeholder="Search All Items Here..."
              className="w-full bg-muted/50 border border-input rounded-md pl-9 pr-4 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-primary"
            />
          </form>
        </div>

        {/* Desktop Actions */}
        <div className="hidden md:flex items-center space-x-3">
          <div className="flex items-center gap-2 mr-2">
            <span className="text-xs text-muted-foreground">Locale</span>
            <Select value={locale} onValueChange={(v) => setLocale(v as any)}>
              <SelectTrigger className="h-8 w-[130px]">
                <SelectValue placeholder="Global" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="global">Global</SelectItem>
                <SelectItem value="uganda">Uganda</SelectItem>
              </SelectContent>
            </Select>
          </div>
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
              <Link to="/signin" onClick={() => trackAction('cta.click', { cta_id: 'nav.signin', context: { location: 'header' } })}>
                <Button variant="outline">Sign In</Button>
              </Link>
              <Link to="/for-companies" onClick={() => trackAction('cta.click', { cta_id: 'nav.post_placement', context: { location: 'header' } })}>
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
        <div className="md:hidden fixed inset-0 top-16 z-40 bg-background border-t border-border overflow-y-auto">
          <div className="container mx-auto px-4 py-6 space-y-4">
            <div className="flex items-center gap-3 pb-4 border-b border-border/50">
              <span className="text-xs text-muted-foreground">Locale</span>
              <Select value={locale} onValueChange={(v) => { setLocale(v as any); }}>
                <SelectTrigger className="h-9 w-[160px]">
                  <SelectValue placeholder="Global" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="global">Global</SelectItem>
                  <SelectItem value="uganda">Uganda</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <Link
              to="/find-placements"
              className="block py-3 text-lg font-medium text-muted-foreground hover:text-primary transition-colors border-b border-border/50"
              onClick={() => setIsMenuOpen(false)}
            >
              Find Placements
            </Link>
            <Link
              to="/find-talent"
              className="block py-3 text-lg font-medium text-muted-foreground hover:text-primary transition-colors border-b border-border/50"
              onClick={() => setIsMenuOpen(false)}
            >
              Find Talent
            </Link>
            <Link
              to="/application-tips"
              className="block py-3 text-lg font-medium text-muted-foreground hover:text-primary transition-colors border-b border-border/50"
              onClick={() => setIsMenuOpen(false)}
            >
              Resources
            </Link>
            <Link
              to="/opportunities-chat"
              className="block py-3 text-lg font-medium text-muted-foreground hover:text-primary transition-colors border-b border-border/50"
              onClick={() => setIsMenuOpen(false)}
            >
              Opportunities Chat
            </Link>
            <Link
              to="/for-companies"
              className="block py-3 text-lg font-medium text-muted-foreground hover:text-primary transition-colors border-b border-border/50"
              onClick={() => setIsMenuOpen(false)}
            >
              For Companies
            </Link>
            {isAdmin && (
              <>
                <Link
                  to="/admin"
                  className="block py-3 text-lg font-medium text-muted-foreground hover:text-primary transition-colors border-b border-border/50"
                  onClick={() => setIsMenuOpen(false)}
                >
                  Admin Dashboard
                </Link>
                <Link
                  to="/admin/security"
                  className="block py-3 text-lg font-medium text-muted-foreground hover:text-primary transition-colors border-b border-border/50"
                  onClick={() => setIsMenuOpen(false)}
                >
                  Security
                </Link>
              </>
            )}
            <div className="pt-6 space-y-3">
              {user ? (
                <>
                  <Link to="/profile" className="block" onClick={() => setIsMenuOpen(false)}>
                    <Button variant="outline" className="w-full h-12 text-base">Profile</Button>
                  </Link>
                  <Button variant="ghost" className="w-full h-12 text-base justify-start" onClick={() => { handleSignOut(); setIsMenuOpen(false); }}>
                    Sign Out
                  </Button>
                </>
              ) : (
                <>
                  <Link to="/signin" className="block" onClick={() => setIsMenuOpen(false)}>
                    <Button variant="outline" className="w-full h-12 text-base">Sign In</Button>
                  </Link>
                  <Link to="/for-companies" className="block" onClick={() => setIsMenuOpen(false)}>
                    <Button variant="hero" className="w-full h-12 text-base">Post Placement</Button>
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
