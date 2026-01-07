import { Button } from "@/components/ui/button";
import { Card, CardContent, CardFooter, CardHeader } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { MapPin, Building, Clock, DollarSign, Users, Bookmark, Sparkles } from "lucide-react";
import { Link } from "react-router-dom";
import { useAuth } from '@/hooks/useAuth';

interface PlacementCardProps {
  id: string;
  title: string;
  company: string;
  region: string;
  industry: string;
  stipend?: string;
  slots: number;
  postedDate: string;
  description: string;
  remote: boolean;
  verified?: boolean;
  boosted?: boolean;
  boostEndsAt?: string | null;
  deadline?: string;
  applicationLink?: string;
}

const PlacementCard = ({
  id,
  title,
  company,
  region,
  industry,
  stipend,
  slots,
  postedDate,
  description,
  remote,
  verified = false,
  boosted = false,
  boostEndsAt,
  deadline,
  applicationLink,
}: PlacementCardProps) => {
  const { user } = useAuth();

  const isAuthenticated = !!user;
  const formattedPostedDate = postedDate
    ? new Date(postedDate).toLocaleDateString(undefined, { day: 'numeric', month: 'short', year: 'numeric' })
    : 'Recently posted';
  const boostEndsLabel = boostEndsAt
    ? new Date(boostEndsAt).toLocaleDateString(undefined, { day: 'numeric', month: 'short' })
    : null;

  return (
    <Card className="hover:shadow-lg transition-all duration-200 border-primary/20 hover:border-primary/40 group">
      <CardHeader className="pb-3">
        <div className="flex justify-between items-start">
          <div className="space-y-1">
            <h3 className="font-semibold text-lg text-foreground group-hover:text-primary transition-colors">
              {title}
            </h3>
            <div className="flex items-center gap-2">
              <p className="text-muted-foreground font-medium">{company}</p>
              {verified && (
                <Badge variant="secondary" className="text-xs">
                  Verified
                </Badge>
              )}
            </div>
          </div>
          <div className="flex flex-col items-end gap-2">
            {boosted && (
              <Badge variant="outline" className="border-primary text-primary bg-primary/10 flex items-center gap-1">
                <Sparkles className="w-3 h-3" />
                Featured
              </Badge>
            )}
            <Button variant="ghost" size="icon">
              <Bookmark className="w-4 h-4" />
            </Button>
          </div>
        </div>
      </CardHeader>

      <CardContent className="space-y-4">
        {/* Description */}
        {isAuthenticated ? (
          <p className="text-muted-foreground text-sm line-clamp-2">{description}</p>
        ) : (
          <p className="text-muted-foreground text-sm line-clamp-1">Sign in to view full details and application instructions.</p>
        )}

        {/* Details Grid */}
        <div className="grid grid-cols-2 gap-3 text-sm">
          <div className="flex items-center gap-2 text-muted-foreground">
            <MapPin className="w-4 h-4 text-primary" />
            <span>{region}</span>
          </div>
          <div className="flex items-center gap-2 text-muted-foreground">
            <Building className="w-4 h-4 text-primary" />
            <span>{industry}</span>
          </div>
          {stipend && (
            <div className="flex items-center gap-2 text-muted-foreground">
              <DollarSign className="w-4 h-4 text-primary" />
              <span>{stipend}</span>
            </div>
          )}
          <div className="flex items-center gap-2 text-muted-foreground">
            <Users className="w-4 h-4 text-primary" />
            <span>{slots} {slots === 1 ? 'slot' : 'slots'}</span>
          </div>
        </div>

        {/* Tags */}
        <div className="flex flex-wrap gap-2">
          <Badge variant="secondary" className="bg-primary-light text-primary-dark">
            {industry}
          </Badge>
          {remote && (
            <Badge variant="outline" className="border-accent text-accent-foreground">
              Remote
            </Badge>
          )}
          <Badge variant="outline" className="text-muted-foreground">
            {region}
          </Badge>
        </div>
      </CardContent>

      <CardFooter className="flex justify-between items-center pt-4 border-t border-border">
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Clock className="w-4 h-4" />
          <span>{formattedPostedDate}</span>
        </div>
        {boosted && boostEndsLabel ? (
          <div className="flex items-center gap-2 text-sm text-primary">
            <Sparkles className="w-4 h-4" />
            <span>Featured until {boostEndsLabel}</span>
          </div>
        ) : null}
        {isAuthenticated ? (
          <div className="flex gap-2 w-full sm:w-auto">
            {deadline && (
              <div className="flex items-center gap-1 text-xs text-muted-foreground mr-2">
                <span className={new Date(deadline) < new Date() ? "text-destructive font-bold" : ""}>
                  Deadline: {new Date(deadline).toLocaleDateString()}
                </span>
              </div>
            )}
            {applicationLink ? (
              <Button size="sm" className="min-w-[80px]" asChild>
                <a href={applicationLink} target="_blank" rel="noopener noreferrer">
                  Apply External <Sparkles className="ml-1 w-3 h-3" />
                </a>
              </Button>
            ) : (
              <Button size="sm" className="min-w-[80px]" asChild>
                <Link to={`/placements/${id}`}>Apply Now</Link>
              </Button>
            )}
          </div>
        ) : (
          <Button size="sm" className="min-w-[80px]" onClick={() => { window.location.href = '/signin'; }}>
            Sign in
          </Button>
        )}
      </CardFooter>
    </Card>
  );
};

export default PlacementCard;