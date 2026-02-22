import { useState, useRef, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import { supabase } from '@/integrations/supabase/client';
import { Send, Bot, User, Briefcase, Clock, ExternalLink, GraduationCap, Trophy, Building2, Sparkles, Globe } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import type { OpportunityType } from '@/types/opportunities';

interface Message {
    id: string;
    role: 'user' | 'assistant';
    content: string;
    opportunities?: Opportunity[];
}

interface Opportunity {
    id: string;
    title: string;
    description?: string;
    url: string;
    type?: OpportunityType;
    field?: string;
    country?: string;
    organization?: string;
    deadline?: string;
    published_at?: string;
}

const TYPE_ICONS: Record<string, React.ElementType> = {
    scholarship: GraduationCap,
    internship: Briefcase,
    job: Building2,
    fellowship: Sparkles,
    competition: Trophy,
    default: Briefcase,
};

const TYPE_COLORS: Record<string, string> = {
    scholarship: 'bg-purple-100 text-purple-700 border-purple-200',
    internship: 'bg-blue-100 text-blue-700 border-blue-200',
    job: 'bg-green-100 text-green-700 border-green-200',
    fellowship: 'bg-amber-100 text-amber-700 border-amber-200',
    competition: 'bg-red-100 text-red-700 border-red-200',
    grant: 'bg-teal-100 text-teal-700 border-teal-200',
    training: 'bg-indigo-100 text-indigo-700 border-indigo-200',
    default: 'bg-gray-100 text-gray-700 border-gray-200',
};

const OpportunitiesChat = () => {
    const [messages, setMessages] = useState<Message[]>([
        {
            id: '1',
            role: 'assistant',
            content: "Hi! I'm your career assistant. I can help you find scholarships, internships, jobs, fellowships, and more. Try asking:\n\n• \"Find scholarships in Germany\"\n• \"Show me tech internships in Uganda\"\n• \"What grants are available for research?\"\n• \"Find remote software jobs\""
        }
    ]);
    const [input, setInput] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [activeFilter, setActiveFilter] = useState<string | null>(null);
    const scrollRef = useRef<HTMLDivElement>(null);

    // Fetch recent opportunities
    const { data: opportunities } = useQuery({
        queryKey: ['opportunities-chat', activeFilter],
        queryFn: async () => {
            let query = supabase
                .from('opportunities')
                .select('id, title, description, url, type, field, country, organization, deadline, published_at')
                .order('published_at', { ascending: false })
                .limit(15);
            
            if (activeFilter) {
                query = query.eq('type', activeFilter);
            }
            
            const { data } = await query;
            return data as Opportunity[] || [];
        },
    });

    // Auto-scroll on new messages
    useEffect(() => {
        if (scrollRef.current) {
            scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
        }
    }, [messages]);

    const sendMessage = async () => {
        if (!input.trim() || isLoading) return;

        const userMessage: Message = {
            id: Date.now().toString(),
            role: 'user',
            content: input.trim(),
        };

        setMessages(prev => [...prev, userMessage]);
        setInput('');
        setIsLoading(true);

        try {
            // Gather user context
            const session = await supabase.auth.getSession();
            const userId = session.data.session?.user?.id;
            const profile = session.data.session?.user?.user_metadata || {};
            const preferences = {
                preferred_tone: profile.preferred_tone || 'practical and concise',
                interests: profile.interests || [],
                experience_level: profile.experience_level || 'intermediate',
                location: profile.location || '',
            };
            const recentSearches = messages.filter(m => m.role === 'user').slice(-5).map(m => m.content);
            const userContext = {
                userId,
                ...preferences,
                recent_searches: recentSearches,
                currentPage: 'opportunities-chat',
            };

            // Observability: log prompt
            // Optionally send to backend or monitoring service
            // window.logAIInteraction && window.logAIInteraction({ userId, feature: 'chat', prompt: userMessage.content, userContext });

            // Use chat-agent Edge Function for semantic search
            const { data, error } = await supabase.functions.invoke('chat-agent', {
                body: {
                    message: userMessage.content,
                    context: userContext,
                },
            });

            if (error) {
                // Observability: log error
                // window.logAIError && window.logAIError({ userId, feature: 'chat', error });
                throw error;
            }

            // Parse opportunities from the response if present
            let parsedOpportunities: Opportunity[] = [];
            if (data.toolResults && Array.isArray(data.toolResults)) {
                for (const result of data.toolResults) {
                    if (Array.isArray(result) && result.length > 0 && result[0]?.title && result[0]?.url) {
                        parsedOpportunities = result;
                        break;
                    }
                }
            }

            const assistantMessage: Message = {
                id: (Date.now() + 1).toString(),
                role: 'assistant',
                content: data.message?.content || data.response || "I couldn't find any matching opportunities. Try a different search term.",
                opportunities: parsedOpportunities.length > 0 ? parsedOpportunities : undefined,
            };

            setMessages(prev => [...prev, assistantMessage]);
        } catch (error) {
            // Observability: log error
            // window.logAIError && window.logAIError({ feature: 'chat', error });
            console.error('Chat error:', error);
            setMessages(prev => [...prev, {
                id: (Date.now() + 1).toString(),
                role: 'assistant',
                content: "Sorry, I'm having trouble connecting. Please try again later.",
            }]);
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="flex flex-col h-screen">
            <div className="flex items-center justify-between p-4 border-b border-border/50">
                <h1 className="text-xl font-bold">Opportunities Chat</h1>
                <div className="flex gap-2">
                    <Button variant="outline" size="sm" onClick={() => setActiveFilter('scholarship')}>
                        Scholarship
                    </Button>
                    <Button variant="outline" size="sm" onClick={() => setActiveFilter('internship')}>
                        Internship
                    </Button>
                    <Button variant="outline" size="sm" onClick={() => setActiveFilter('job')}>
                        Job
                    </Button>
                    <Button variant="outline" size="sm" onClick={() => setActiveFilter('fellowship')}>
                        Fellowship
                    </Button>
                    <Button variant="outline" size="sm" onClick={() => setActiveFilter('competition')}>
                        Competition
                    </Button>
                    <Button variant="outline" size="sm" onClick={() => setActiveFilter('grant')}>
                        Grant
                    </Button>
                    <Button variant="outline" size="sm" onClick={() => setActiveFilter('training')}>
                        Training
                    </Button>
                    <Button variant="outline" size="sm" onClick={() => setActiveFilter('default')}>
                        Default
                    </Button>
                </div>
            </div>
            <div className="flex-1 overflow-auto">
                <div className="flex flex-col gap-4 p-4">
                    {messages.map(message => (
                        <div key={message.id}>
                            <div className="flex items-center gap-2">
                                <div className="flex-1">
                                    <p className="text-sm leading-relaxed whitespace-pre-wrap">{message.content}</p>
                                </div>
                                <div className="flex gap-2">
                                    <Button variant="outline" size="sm" onClick={() => setActiveFilter(message.opportunities?.[0]?.type || 'default')}>
                                        {message.opportunities?.[0]?.type}
                                    </Button>
                                </div>
                            </div>
                            {message.opportunities && message.opportunities.length > 0 && (
                                <div className="mt-4 pt-3 border-t border-border/50 space-y-3">
                                    {message.opportunities.slice(0, 5).map((opp) => {
                                        const Icon = TYPE_ICONS[opp.type || 'default'] || TYPE_ICONS.default;
                                        const colorClass = TYPE_COLORS[opp.type || 'default'] || TYPE_COLORS.default;
                                        return (
                                            <div
                                                key={opp.id}
                                                className="bg-background rounded-lg p-3 border shadow-sm hover:shadow-md transition-shadow"
                                            >
                                                <div className="flex items-start gap-3">
                                                    <div className={`p-2 rounded-lg ${colorClass}`}>
                                                        <Icon className="h-4 w-4" />
                                                    </div>
                                                    <div className="flex-1 min-w-0">
                                                        <h4 className="font-semibold text-sm line-clamp-2">{opp.title}</h4>
                                                        {opp.organization && (
                                                            <p className="text-xs text-muted-foreground mt-0.5">
                                                                <Building2 className="h-3 w-3 inline mr-1" />
                                                                {opp.organization}
                                                            </p>
                                                        )}
                                                        <div className="flex flex-wrap gap-1.5 mt-2">
                                                            {opp.type && (
                                                                <Badge variant="outline" className={`text-[10px] capitalize ${colorClass}`}>
                                                                    {opp.type}
                                                                </Badge>
                                                            )}
                                                            {opp.country && (
                                                                <Badge variant="secondary" className="text-[10px]">
                                                                    <Globe className="h-2.5 w-2.5 mr-0.5" />
                                                                    {opp.country}
                                                                </Badge>
                                                            )}
                                                        </div>
                                                    </div>
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>
                            )}
                        </div>
                    ))}
                </div>
            </div>
            <div className="flex items-center justify-between p-4 border-t border-border/50">
                <div className="flex gap-2">
                    <Button variant="outline" size="sm" onClick={() => setInput('')}>
                        Clear
                    </Button>
                </div>
                <div className="flex gap-2">
                    <Button variant="outline" size="sm" onClick={sendMessage}>
                        Send
                    </Button>
                </div>
            </div>
        </div>
    );
};

export default OpportunitiesChat;
