import { Card, CardContent, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Sparkles, Calendar, MapPin, Briefcase, ExternalLink, Mail, MessageSquare } from 'lucide-react';
import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { useNavigate } from 'react-router-dom';
import { submitApplication } from '@/services/applicationsService';

interface CuratedListingCardProps {
  id: string;
  title: string;
  description: string;
  companyName?: string | null;
  featured?: boolean;
  updatedAt: string;
  opportunityType?: string | null;
  applicationDeadline?: string | null;
  region?: string | null;
  applicationMethod?: string | null;
  whatsappNumber?: string | null;
  applicationEmail?: string | null;
  applicationUrl?: string | null;
}

export function CuratedListingCard({
  id,
  title,
  description,
  companyName,
  featured = false,
  updatedAt,
  opportunityType,
  applicationDeadline,
  region,
  applicationMethod,
  whatsappNumber,
  applicationEmail,
  applicationUrl
}: CuratedListingCardProps) {
  const { toast } = useToast();
  const navigate = useNavigate();
  const [isApplying, setIsApplying] = useState(false);
  const [profileComplete, setProfileComplete] = useState<boolean | null>(null);

  const formattedUpdatedAt = new Date(updatedAt).toLocaleDateString(undefined, {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });

  const formattedDeadline = applicationDeadline
    ? new Date(applicationDeadline).toLocaleDateString(undefined, {
      month: 'short',
      day: 'numeric',
    })
    : null;

  const isExpired = applicationDeadline ? new Date(applicationDeadline) < new Date() : false;

  const [cvUrl, setCvUrl] = useState<string | null>(null);

  useEffect(() => {
    async function checkProfile() {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data: profile } = await supabase
        .from('profiles')
        .select('full_name, school_name, cv_url')
        .eq('id', user.id)
        .single();

      if (profile) {
        const isComplete = !!(profile.full_name && profile.school_name && profile.cv_url);
        setProfileComplete(isComplete);
        setCvUrl(profile.cv_url);
      }
    }
    checkProfile();
  }, []);

  const handleApply = async () => {
    // Check if there's a direct external link (Priority 1)
    if (applicationUrl) {
      window.open(applicationUrl, '_blank');
      return;
    }

    // Check if there's a direct email (Priority 2)
    if (applicationEmail) {
      window.location.href = `mailto:${applicationEmail}?subject=Application for ${title}&body=Hello, I am interested in the ${title} position I saw on PlacementBridge.`;
      return;
    }

    // Fallback to internal application flow (Priority 3)
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      toast({
        title: "Sign in required",
        description: "Please log in as a student to apply via the platform.",
        variant: "destructive"
      });
      navigate('/auth');
      return;
    }

    if (profileComplete === false) {
      toast({
        title: "Incomplete profile",
        description: "Please complete your profile (ensure your Name, School, and CV Link are added) before applying.",
        variant: "warning",
      });
      navigate('/profile');
      return;
    }

    if (isExpired) {
      toast({
        title: "Deadline passed",
        description: "This opportunity is no longer accepting applications.",
        variant: "destructive"
      });
      return;
    }

    setIsApplying(true);
    try {
      // Internal application
      await submitApplication(id, cvUrl);
      toast({
        title: "Application submitted",
        description: "Your profile has been shared with the recruiter.",
      });
    } catch (error: any) {
      toast({
        title: "Application error",
        description: error.message || "Failed to submit application",
        variant: "destructive"
      });
    } finally {
      setIsApplying(false);
    }
  };

  return (
    <Card className="h-full border-primary/20 hover:border-primary/40 hover:shadow-lg transition-all flex flex-col">
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between gap-2">
          <div className="space-y-1">
            <CardTitle className="text-xl leading-tight text-primary">{title}</CardTitle>
            {companyName ? <p className="text-sm font-medium text-muted-foreground">{companyName}</p> : null}
          </div>
          {featured ? (
            <Badge variant="outline" className="flex items-center gap-1 border-primary text-primary bg-primary/10 shrink-0">
              <Sparkles className="h-3 w-3" />
              Featured
            </Badge>
          ) : null}
        </div>
        <div className="flex flex-wrap gap-3 pt-2">
          {opportunityType && (
            <Badge variant="secondary" className="bg-secondary/50 text-xs font-normal capitalize">
              <Briefcase className="mr-1 h-3 w-3" />
              {opportunityType}
            </Badge>
          )}
          {region && (
            <Badge variant="secondary" className="bg-secondary/50 text-xs font-normal">
              <MapPin className="mr-1 h-3 w-3" />
              {region}
            </Badge>
          )}
          {formattedDeadline && (
            <Badge variant={isExpired ? "destructive" : "outline"} className="text-xs font-normal">
              <Calendar className="mr-1 h-3 w-3" />
              {isExpired ? 'Expired' : `Ends ${formattedDeadline}`}
            </Badge>
          )}
        </div>
      </CardHeader>
      <CardContent className="flex-1">
        <p className="text-sm text-muted-foreground leading-relaxed line-clamp-4">{description}</p>
      </CardContent>
      <CardFooter className="flex items-center justify-between border-t border-border/50 pt-4">
        <span className="text-[10px] uppercase tracking-wider text-muted-foreground mr-auto">Updated {formattedUpdatedAt}</span>

        <Button
          size="sm"
          onClick={handleApply}
          disabled={isApplying || isExpired}
          className={featured ? "bg-primary hover:bg-primary-dark" : ""}
        >
          {isApplying ? 'Applying...' : isExpired ? 'Closed' : (
            <>
              {applicationMethod === 'whatsapp' && <MessageSquare className="mr-2 h-4 w-4" />}
              {applicationMethod === 'email' && <Mail className="mr-2 h-4 w-4" />}
              {applicationMethod === 'url' && <ExternalLink className="mr-2 h-4 w-4" />}
              Apply Now
            </>
          )}
        </Button>
      </CardFooter>
    </Card>
  );
}
