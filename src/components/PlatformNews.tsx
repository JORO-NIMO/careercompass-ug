import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Megaphone, ArrowRight, Calendar } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

interface Announcement {
    id: string;
    title: string;
    content: string; // Supports rich text but we'll strip tags for preview
    category: 'Placements' | 'Announcements' | 'Updates';
    published_at: string;
    image_url: string | null;
    cta_text: string | null;
    cta_link: string | null;
}

export const PlatformNews = () => {
    const [news, setNews] = useState<Announcement[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchNews = async () => {
            try {
                const { data, error } = await (supabase.from('posts' as any) as any)
                    .select('id, title, content, category, published_at, image_url, cta_text, cta_link')
                    .eq('status', 'published')
                    .order('published_at', { ascending: false })
                    .limit(3);

                if (error) {
                    console.error("Error fetching news:", error);
                    return;
                }

                setNews((data as Announcement[]) || []);
            } catch (err) {
                console.error("Failed to load news", err);
            } finally {
                setLoading(false);
            }
        };

        fetchNews();
    }, []);

    if (!loading && news.length === 0) {
        return null;
    }

    return (
        <section className="container mx-auto px-4 mt-12 mb-8">
            <div className="flex items-center justify-between mb-6">
                <h2 className="text-2xl font-semibold flex items-center gap-2">
                    <Megaphone className="h-6 w-6 text-primary" />
                    Latest Updates
                </h2>

            </div>

            {loading ? (
                <div className="grid gap-6 md:grid-cols-3">
                    {[1, 2, 3].map((i) => (
                        <div key={i} className="h-48 rounded-lg bg-muted/20 animate-pulse" />
                    ))}
                </div>
            ) : (
                <div className="grid gap-6 md:grid-cols-3">
                    {news.map((item) => (
                        <Card key={item.id} className="flex flex-col h-full hover:shadow-md transition-all border-l-4 border-l-primary/60">
                            <CardHeader className="pb-3">
                                <div className="flex justify-between items-start mb-2">
                                    <Badge variant="secondary" className="text-xs uppercase tracking-wider">
                                        {item.category}
                                    </Badge>
                                    {item.published_at && (
                                        <span className="text-xs text-muted-foreground flex items-center gap-1">
                                            <Calendar className="h-3 w-3" />
                                            {new Date(item.published_at).toLocaleDateString()}
                                        </span>
                                    )}
                                </div>
                                <CardTitle className="text-lg leading-tight line-clamp-2">
                                    {item.title}
                                </CardTitle>
                            </CardHeader>
                            <CardContent className="flex-grow flex flex-col justify-between pt-0">
                                <div className="text-sm text-muted-foreground line-clamp-3 mb-4">
                                    {item.content.replace(/<[^>]*>/g, '')}
                                </div>

                                {item.cta_link && (
                                    <Button variant="ghost" className="self-start pl-0 hover:pl-2 transition-all group" asChild>
                                        <a href={item.cta_link} target="_blank" rel="noopener noreferrer">
                                            {item.cta_text || "Learn More"}
                                            <ArrowRight className="ml-2 h-4 w-4 group-hover:translate-x-1 transition-transform" />
                                        </a>
                                    </Button>
                                )}
                            </CardContent>
                        </Card>
                    ))}
                </div>
            )}
        </section>
    );
};
