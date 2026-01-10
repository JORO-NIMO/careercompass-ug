import { useEffect, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Megaphone, Search, ArrowRight, Calendar, User, Share2, Loader2 } from "lucide-react";
import SEO from "@/components/SEO";
import { supabase } from "@/integrations/supabase/client";

interface Announcement {
    id: string;
    title: string;
    content: string;
    category: 'Placements' | 'Announcements' | 'Updates';
    published_at: string;
    image_url: string | null;
    cta_text: string | null;
    cta_link: string | null;
}

const Updates = () => {
    const [searchParams, setSearchParams] = useSearchParams();
    const query = searchParams.get("q") || "";
    const [news, setNews] = useState<Announcement[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchNews = async () => {
            setLoading(true);
            try {
                let request = (supabase.from('posts' as any) as any)
                    .select('id, title, content, category, published_at, image_url, cta_text, cta_link')
                    .eq('status', 'published')
                    .order('published_at', { ascending: false });

                if (query) {
                    request = request.ilike('title', `%${query}%`);
                }

                const { data, error } = await request;

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
    }, [query]);

    const handleSearch = (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault();
        const formData = new FormData(e.currentTarget);
        const searchQuery = formData.get("q") as string;
        setSearchParams({ q: searchQuery });
    };

    return (
        <div className="min-h-screen bg-background">
            <SEO
                title="Latest Platform Updates & Announcements | PlacementBridge"
                description="Stay updated with the latest news, placement opportunities, and platform announcements from PlacementBridge."
                canonical="/updates"
            />

            <section className="bg-gradient-to-br from-primary via-primary-glow to-primary-dark text-primary-foreground py-16">
                <div className="container mx-auto px-4 text-center space-y-4">
                    <h1 className="text-4xl md:text-5xl font-bold flex items-center justify-center gap-3">
                        <Megaphone className="h-10 w-10" />
                        Platform Updates
                    </h1>
                    <p className="text-xl text-primary-foreground/90 max-w-2xl mx-auto">
                        News, verified placements, and community announcements.
                    </p>

                    <div className="max-w-md mx-auto mt-8 relative">
                        <form onSubmit={handleSearch} className="relative">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground w-4 h-4" />
                            <Input
                                name="q"
                                defaultValue={query}
                                placeholder="Search updates..."
                                className="pl-10 bg-background text-foreground border-0 h-12 shadow-lg"
                            />
                        </form>
                    </div>
                </div>
            </section>

            <main className="container mx-auto px-4 py-12">
                {loading ? (
                    <div className="flex justify-center py-20">
                        <Loader2 className="h-8 w-8 animate-spin text-primary" />
                    </div>
                ) : news.length === 0 ? (
                    <div className="text-center py-20 bg-secondary/20 rounded-lg">
                        <p className="text-muted-foreground text-lg">No updates found matching your search.</p>
                        {query && (
                            <Button variant="link" onClick={() => setSearchParams({})}>
                                Clear search
                            </Button>
                        )}
                    </div>
                ) : (
                    <div className="grid gap-8 md:grid-cols-2 lg:grid-cols-3">
                        {news.map((item) => (
                            <Card key={item.id} className="flex flex-col h-full hover:shadow-lg transition-all border-l-4 border-l-primary/60 group">
                                {item.image_url && (
                                    <div className="h-48 w-full overflow-hidden rounded-t-lg bg-secondary/10">
                                        <img
                                            src={item.image_url}
                                            alt={item.title}
                                            className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
                                        />
                                    </div>
                                )}
                                <CardHeader className="pb-3">
                                    <div className="flex justify-between items-start mb-2">
                                        <Badge variant="secondary" className="text-sm uppercase tracking-wider">
                                            {item.category}
                                        </Badge>
                                        {item.published_at && (
                                            <span className="text-sm text-muted-foreground flex items-center gap-1">
                                                <Calendar className="h-3 w-3" />
                                                {new Date(item.published_at).toLocaleDateString()}
                                            </span>
                                        )}
                                    </div>
                                    <CardTitle className="text-xl leading-tight line-clamp-2">
                                        <Link to={`/updates/${item.id}`} className="hover:text-primary transition-colors">
                                            {item.title}
                                        </Link>
                                    </CardTitle>
                                </CardHeader>
                                <CardContent className="flex-grow pt-0 flex flex-col">
                                    <div className="text-muted-foreground line-clamp-3 mb-6 flex-grow">
                                        {item.content.replace(/<[^>]*>/g, '')}
                                    </div>

                                    <div className="flex gap-2 items-center mt-auto pt-4 border-t border-border/50">
                                        {item.cta_link ? (
                                            <Button className="flex-1" asChild>
                                                <a href={item.cta_link} target="_blank" rel="noopener noreferrer">
                                                    {item.cta_text || 'Learn More'}
                                                    <ArrowRight className="ml-2 h-4 w-4" />
                                                </a>
                                            </Button>
                                        ) : (
                                            <Button variant="outline" className="flex-1" asChild>
                                                <Link to={`/updates/${item.id}`}>
                                                    Read More
                                                </Link>
                                            </Button>
                                        )}

                                        <Button
                                            variant="ghost"
                                            size="icon"
                                            onClick={async () => {
                                                const shareUrl = `${window.location.origin}/updates/${item.id}`;
                                                const shareData = {
                                                    title: item.title,
                                                    text: item.content.replace(/<[^>]*>/g, '').slice(0, 100),
                                                    url: shareUrl,
                                                };
                                                if (navigator.share) {
                                                    try {
                                                        await navigator.share(shareData);
                                                    } catch (err) {
                                                        // Ignore aborts
                                                    }
                                                } else {
                                                    if (navigator.clipboard && navigator.clipboard.writeText) {
                                                        try {
                                                            await navigator.clipboard.writeText(shareUrl);
                                                        } catch (err) {
                                                            window.alert("Unable to copy the link to your clipboard. Please copy it manually from the address bar.");
                                                        }
                                                    } else {
                                                        window.alert("Sharing is not supported in this browser. Please copy the link from the address bar.");
                                                    }
                                                    alert("Link copied to clipboard");
                                                }
                                            }}
                                        >
                                            <Share2 className="h-4 w-4 text-muted-foreground" />
                                        </Button>
                                    </div>
                                </CardContent>
                            </Card>
                        ))}
                    </div>
                )}
            </main>
        </div>
    );
};

export default Updates;
