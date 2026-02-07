import { useEffect, useState } from 'react';
import { fetchPublicAds, Ad } from '@/services/adsService';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';

export function HomepageAdsBanner() {
  const [ads, setAds] = useState<Ad[]>([]);

  useEffect(() => {
    let mounted = true;
    fetchPublicAds()
      .then((items) => {
        if (mounted) setAds(items);
      })
      .catch(() => {
        if (mounted) setAds([]);
      });
    return () => {
      mounted = false;
    };
  }, []);

  if (ads.length === 0) {
    return null;
  }

  return (
    <div className="bg-muted/20">
      <div className="container mx-auto px-4 py-10">
        <div className="space-y-6">
          {ads.map((ad) => (
            <Card key={ad.id} className="overflow-hidden">
              <div className="grid gap-6 md:grid-cols-[minmax(0,1.1fr)_minmax(0,0.9fr)] md:items-center">
                <div className="relative h-48 w-full md:h-full">
                  <img
                    src={ad.image_url}
                    alt={ad.title}
                    className="h-full w-full object-cover"
                  />
                </div>
                <div className="px-6 py-6">
                  <h3 className="text-2xl font-semibold text-foreground">{ad.title}</h3>
                  {ad.description && (
                    <p className="mt-3 text-muted-foreground">{ad.description}</p>
                  )}
                  {ad.link && (
                    <Button className="mt-6" asChild>
                      <a href={ad.link} target="_blank" rel="noreferrer">
                        Learn more
                      </a>
                    </Button>
                  )}
                </div>
              </div>
            </Card>
          ))}
        </div>
      </div>
    </div>
  );
}
