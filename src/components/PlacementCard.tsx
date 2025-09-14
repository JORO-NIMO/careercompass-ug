import { Button } from "@/components/ui/button";
import { Card, CardContent, CardFooter, CardHeader } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { MapPin, Building, Clock, DollarSign, Users, Bookmark } from "lucide-react";

interface PlacementCardProps {
  id: string;
  title: string;
  company: string;
  location: string;
  region: string;
  industry: string;
  stipend?: string;
  slots: number;
  postedDate: string;
  description: string;
  remote: boolean;
  verified?: boolean;
}

const PlacementCard = ({
  title,
  company,
  location,
  region,
  industry,
  stipend,
  slots,
  postedDate,
  description,
  remote,
  verified = false
}: PlacementCardProps) => {
  return (
    <Card className="hover:shadow-lg transition-all duration-200 border-border hover:border-primary/20 group">
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
          <Button variant="ghost" size="icon">
            <Bookmark className="w-4 h-4" />
          </Button>
        </div>
      </CardHeader>

      <CardContent className="space-y-4">
        {/* Description */}
        <p className="text-muted-foreground text-sm line-clamp-2">
          {description}
        </p>

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
          <span>{postedDate}</span>
        </div>
        <Button size="sm" className="min-w-[80px]">
          Apply Now
        </Button>
      </CardFooter>
    </Card>
  );
};

export default PlacementCard;