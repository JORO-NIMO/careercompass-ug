import { useEffect, useState } from "react";
import DOMPurify from 'dompurify';
import { useParams, Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ArrowLeft, Calendar, Share2, Megaphone } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import SEO from "@/components/SEO";

interface Post {
    id: string;
    title: string;
    content: string;
    category: 'Placements' | 'Announcements' | 'Updates';
    published_at: string;
    image_url: string | null;
    cta_text: string | null;
    cta_link: string | null;
}

const UpdateDetails = () => {
    const { id } = useParams<{ id: string }>();
    const [post, setPost] = useState<Post | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        const fetchPost = async () => {
            if (!id) return;
            try {
                setLoading(true);
                const { data, error } = await (supabase.from('posts' as any) as any)
                    .select('id, title, content, category, published_at, image_url, cta_text, cta_link')
                    .eq('id', id)
                    .single();

                if (error) throw error;
                setPost(data as Post);
            } catch (err) {
                console.error("Failed to fetch post", err);
                setError("We couldn't find the update you're looking for.");
            } finally {
                setLoading(false);
            }
        };

        fetchPost();
    }, [id]);

    const handleShare = async () => {
        if (!post) return;
        const shareData = {
            title: post.title,
            text: `Check out this update from PlacementBridge: ${post.title}`,
            url: window.location.href,
        };

        if (navigator.share) {
            try {
                await navigator.share(shareData);
            } catch (err) {
                // Ignore abort errors
            }
        } else {
            await navigator.clipboard.writeText(window.location.href);
            alert("Link copied to clipboard!");
        }
    };

    if (loading) {
        return (
            <div className="container mx-auto px-4 py-12 max-w-3xl">
                <Skeleton className="h-8 w-32 mb-4" />
                <Skeleton className="h-12 w-3/4 mb-4" />
                <Skeleton className="h-6 w-1/2 mb-8" />
                <Skeleton className="h-64 w-full rounded-lg" />
            </div>
        );
    }

    if (error || !post) {
        return (
            <div className="container mx-auto px-4 py-12 max-w-3xl text-center">
                <Megaphone className="h-16 w-16 mx-auto text-muted-foreground mb-4" />
                <h1 className="text-2xl font-bold mb-2">Update Not Found</h1>
                <p className="text-muted-foreground mb-6">{error || "This post might have been removed."}</p>
                <Button asChild>
                    <Link to="/">Back to Home</Link>
                </Button>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-background pb-12">
            <SEO
                title={`${post.title} - PlacementBridge Updates`}
                description={post.content.slice(0, 160).replace(/<[^>]*>/g, '')}
                siteName="All jobs in one place"
            />

            <div className="container mx-auto px-4 py-8 max-w-3xl">
                <Link to="/" className="inline-flex items-center text-sm text-muted-foreground hover:text-primary mb-6 transition-colors">
                    <ArrowLeft className="mr-2 h-4 w-4" />
                    Back to Home
                </Link>

                <article className="space-y-6">
                    <header className="space-y-4">
                        <div className="flex items-center gap-3">
                            <Badge variant="secondary" className="px-3 py-1 text-sm font-medium">
                                {post.category}
                            </Badge>
                            {post.published_at && (
                                <div className="flex items-center text-sm text-muted-foreground">
                                    <Calendar className="mr-2 h-4 w-4" />
                                    {new Date(post.published_at).toLocaleDateString(undefined, {
                                        year: 'numeric',
                                        month: 'long',
                                        day: 'numeric'
                                    })}
                                </div>
                            )}
                        </div>

                        <h1 className="text-3xl md:text-4xl font-bold tracking-tight text-foreground">
                            {post.title}
                        </h1>
                    </header>

                    <div className="rounded-lg border border-border/50 bg-card p-6 md:p-8 shadow-sm">
                        <div
                            className="prose prose-stone dark:prose-invert max-w-none prose-headings:font-bold prose-a:text-primary"
                            dangerouslySetInnerHTML={{ __html: DOMPurify.sanitize(post.content || '') }}
                        />

                        {post.cta_link && (
                            <div className="mt-8 pt-6 border-t border-border flex justify-center">
                                <Button size="lg" className="w-full sm:w-auto" asChild>
                                    <a href={(() => { try { const u = new URL(post.cta_link); return (u.protocol === 'http:' || u.protocol === 'https:') ? u.toString() : '#'; } catch { return '#'; } })()} target="_blank" rel="noopener noreferrer">
                                        {post.cta_text || "Learn More"}
                                    </a>
                                </Button>
                            </div>
                        )}
                    </div>

                    <div className="flex justify-between items-center pt-8 border-t border-border">
                        <p className="text-sm text-muted-foreground font-medium">
                            Share this update
                        </p>
                        <Button variant="outline" size="sm" onClick={handleShare}>
                            <Share2 className="mr-2 h-4 w-4" />
                            Share Link
                        </Button>
                    </div>
                </article>
            </div>
        </div>
    );
};

export default UpdateDetails;
