import { Card, CardContent, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Sparkles } from 'lucide-react';

interface CuratedListingCardProps {
  title: string;
  description: string;
  companyName?: string | null;
  featured?: boolean;
  updatedAt: string;
}

export function CuratedListingCard({ title, description, companyName, featured = false, updatedAt }: CuratedListingCardProps) {
  const formattedUpdatedAt = new Date(updatedAt).toLocaleDateString(undefined, {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });

  return (
    <Card className="h-full border-border hover:border-primary/30 hover:shadow-lg transition-colors">
      <CardHeader>
        <div className="flex items-start justify-between gap-2">
          <div>
            <CardTitle className="text-xl leading-tight text-foreground">{title}</CardTitle>
            {companyName ? <p className="text-sm text-muted-foreground">{companyName}</p> : null}
          </div>
          {featured ? (
            <Badge variant="outline" className="flex items-center gap-1 border-primary text-primary bg-primary/10">
              <Sparkles className="h-3 w-3" />
              Featured
            </Badge>
          ) : null}
        </div>
      </CardHeader>
      <CardContent>
        <p className="text-sm text-muted-foreground leading-relaxed line-clamp-5">{description}</p>
      </CardContent>
      <CardFooter className="flex items-center justify-between text-xs text-muted-foreground">
        <span>Updated {formattedUpdatedAt}</span>
        <Button asChild size="sm" variant="outline">
          <a href="/find-placements">Explore roles</a>
        </Button>
      </CardFooter>
    </Card>
  );
}
