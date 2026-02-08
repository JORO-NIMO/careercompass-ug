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
            // Use chat-agent Edge Function for semantic search
            const { data, error } = await supabase.functions.invoke('chat-agent', {
                body: {
                    message: userMessage.content,
                    context: {
                        currentPage: 'opportunities-chat',
                    },
                },
            });

            if (error) throw error;

            // Parse opportunities from the response if present
            let parsedOpportunities: Opportunity[] = [];
            if (data.toolResults && Array.isArray(data.toolResults)) {
                // toolResults is an array of results, find any that looks like opportunities
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

    const handleKeyPress = (e: React.KeyboardEvent) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            sendMessage();
        }
    };

    return (
        <div className="container mx-auto py-8 px-4">
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Opportunities Sidebar */}
                <Card className="lg:col-span-1 h-[75vh]">
                    <CardHeader className="pb-3">
                        <CardTitle className="flex items-center gap-2 text-lg">
                            <Sparkles className="h-5 w-5 text-primary" />
                            Latest Opportunities
                        </CardTitle>
                        {/* Type Filters */}
                        <div className="flex flex-wrap gap-1.5 pt-2">
                            <Button
                                variant={activeFilter === null ? "default" : "outline"}
                                size="sm"
                                className="h-7 text-xs"
                                onClick={() => setActiveFilter(null)}
                            >
                                All
                            </Button>
                            {['scholarship', 'internship', 'job', 'fellowship', 'grant'].map((type) => {
                                const Icon = TYPE_ICONS[type] || TYPE_ICONS.default;
                                return (
                                    <Button
                                        key={type}
                                        variant={activeFilter === type ? "default" : "outline"}
                                        size="sm"
                                        className="h-7 text-xs capitalize"
                                        onClick={() => setActiveFilter(type)}
                                    >
                                        <Icon className="h-3 w-3 mr-1" />
                                        {type}
                                    </Button>
                                );
                            })}
                        </div>
                    </CardHeader>
                    <CardContent className="p-0">
                        <ScrollArea className="h-[calc(75vh-140px)] px-4">
                            {opportunities?.length === 0 && (
                                <p className="text-muted-foreground text-center py-4">
                                    No opportunities available yet.
                                </p>
                            )}
                            {opportunities?.map((opp) => {
                                const Icon = TYPE_ICONS[opp.type || 'default'] || TYPE_ICONS.default;
                                const colorClass = TYPE_COLORS[opp.type || 'default'] || TYPE_COLORS.default;
                                return (
                                    <div
                                        key={opp.id}
                                        className="py-3 border-b last:border-0 cursor-pointer hover:bg-muted/50 rounded-lg px-2 -mx-2 transition-colors"
                                        onClick={() => setInput(`Tell me about: ${opp.title}`)}
                                    >
                                        <div className="flex items-start gap-2">
                                            <div className={`p-1.5 rounded-md mt-0.5 ${colorClass}`}>
                                                <Icon className="h-3.5 w-3.5" />
                                            </div>
                                            <div className="flex-1 min-w-0">
                                                <h4 className="font-medium text-sm line-clamp-2">{opp.title}</h4>
                                                {opp.organization && (
                                                    <p className="text-xs text-muted-foreground mt-0.5">{opp.organization}</p>
                                                )}
                                            </div>
                                        </div>
                                        <div className="flex items-center gap-2 mt-2 flex-wrap">
                                            {opp.type && (
                                                <Badge variant="outline" className={`text-[10px] px-1.5 py-0 h-5 capitalize ${colorClass}`}>
                                                    {opp.type}
                                                </Badge>
                                            )}
                                            {opp.country && (
                                                <Badge variant="secondary" className="text-[10px] px-1.5 py-0 h-5">
                                                    <Globe className="h-2.5 w-2.5 mr-0.5" />
                                                    {opp.country}
                                                </Badge>
                                            )}
                                            {opp.deadline && (
                                                <Badge variant="secondary" className="text-[10px] px-1.5 py-0 h-5">
                                                    <Clock className="h-2.5 w-2.5 mr-0.5" />
                                                    {new Date(opp.deadline).toLocaleDateString()}
                                                </Badge>
                                            )}
                                        </div>
                                    </div>
                                );
                            })}
                        </ScrollArea>
                    </CardContent>
                </Card>

                {/* Chat Area */}
                <Card className="lg:col-span-2 h-[75vh] flex flex-col">
                    <CardHeader className="pb-3 border-b">
                        <CardTitle className="flex items-center gap-2">
                            <Bot className="h-5 w-5 text-primary" />
                            Opportunity Assistant
                        </CardTitle>
                        <p className="text-sm text-muted-foreground">
                            Search scholarships, jobs, internships, fellowships & more with AI
                        </p>
                    </CardHeader>

                    {/* Messages */}
                    <ScrollArea ref={scrollRef} className="flex-1 p-4">
                        <div className="space-y-4">
                            {messages.map((message) => (
                                <div
                                    key={message.id}
                                    className={`flex gap-3 ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}
                                >
                                    {message.role === 'assistant' && (
                                        <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center shrink-0 mt-1">
                                            <Bot className="h-4 w-4 text-primary" />
                                        </div>
                                    )}
                                    <div
                                        className={`max-w-[85%] rounded-2xl px-4 py-3 shadow-sm ${message.role === 'user'
                                            ? 'bg-primary text-primary-foreground rounded-tr-none'
                                            : 'bg-muted rounded-tl-none border border-border/50'
                                            }`}
                                    >
                                        <p className="text-sm leading-relaxed whitespace-pre-wrap">{message.content}</p>

                                        {/* Rich Opportunity Cards */}
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
                                                                        {opp.field && (
                                                                            <Badge variant="secondary" className="text-[10px]">
                                                                                {opp.field}
                                                                            </Badge>
                                                                        )}
                                                                        {opp.deadline && (
                                                                            <Badge variant="secondary" className="text-[10px]">
                                                                                <Clock className="h-2.5 w-2.5 mr-0.5" />
                                                                                Due: {new Date(opp.deadline).toLocaleDateString()}
                                                                            </Badge>
                                                                        )}
                                                                    </div>
                                                                </div>
                                                            </div>
                                                            {opp.description && (
                                                                <p className="text-xs text-muted-foreground mt-2 line-clamp-2">
                                                                    {opp.description}
                                                                </p>
                                                            )}
                                                            <div className="flex gap-2 mt-3">
                                                                <Button
                                                                    variant="default"
                                                                    size="sm"
                                                                    className="h-7 text-xs"
                                                                    onClick={() => window.open(opp.url, '_blank')}
                                                                >
                                                                    <ExternalLink className="h-3 w-3 mr-1" />
                                                                    Apply Now
                                                                </Button>
                                                                <Button
                                                                    variant="outline"
                                                                    size="sm"
                                                                    className="h-7 text-xs"
                                                                    onClick={() => setInput(`Tell me more about ${opp.title}`)}
                                                                >
                                                                    Learn More
                                                                </Button>
                                                            </div>
                                                        </div>
                                                    );
                                                })}
                                            </div>
                                        )}
                                    </div>
                                    {message.role === 'user' && (
                                        <div className="h-8 w-8 rounded-full bg-primary flex items-center justify-center shrink-0 mt-1">
                                            <User className="h-4 w-4 text-primary-foreground" />
                                        </div>
                                    )}
                                </div>
                            ))}
                            {isLoading && (
                                <div className="flex gap-3">
                                    <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center mt-1">
                                        <Bot className="h-4 w-4 text-primary animate-pulse" />
                                    </div>
                                    <div className="bg-muted rounded-2xl rounded-tl-none px-4 py-3 border border-border/50 shadow-sm">
                                        <div className="flex gap-1 items-center">
                                            <span className="text-xs text-muted-foreground mr-2">Searching opportunities</span>
                                            <span className="w-1.5 h-1.5 bg-primary/50 rounded-full animate-bounce [animation-delay:-0.3s]" />
                                            <span className="w-1.5 h-1.5 bg-primary/50 rounded-full animate-bounce [animation-delay:-0.15s]" />
                                            <span className="w-1.5 h-1.5 bg-primary/50 rounded-full animate-bounce" />
                                        </div>
                                    </div>
                                </div>
                            )}
                        </div>
                    </ScrollArea>

                    {/* Input */}
                    <div className="p-4 border-t">
                        {/* Quick Actions */}
                        <div className="flex flex-wrap gap-2 mb-3">
                            <Button
                                variant="outline"
                                size="sm"
                                className="h-7 text-xs"
                                onClick={() => setInput('Find scholarships for African students')}
                            >
                                <GraduationCap className="h-3 w-3 mr-1" />
                                Scholarships
                            </Button>
                            <Button
                                variant="outline"
                                size="sm"
                                className="h-7 text-xs"
                                onClick={() => setInput('Show tech internships in Uganda')}
                            >
                                <Briefcase className="h-3 w-3 mr-1" />
                                Internships
                            </Button>
                            <Button
                                variant="outline"
                                size="sm"
                                className="h-7 text-xs"
                                onClick={() => setInput('Find remote software developer jobs')}
                            >
                                <Building2 className="h-3 w-3 mr-1" />
                                Remote Jobs
                            </Button>
                            <Button
                                variant="outline"
                                size="sm"
                                className="h-7 text-xs"
                                onClick={() => setInput('Show research fellowships and grants')}
                            >
                                <Sparkles className="h-3 w-3 mr-1" />
                                Fellowships
                            </Button>
                        </div>
                        <div className="flex gap-2">
                            <Input
                                value={input}
                                onChange={(e) => setInput(e.target.value)}
                                onKeyDown={handleKeyPress}
                                placeholder="Search scholarships, jobs, internships..."
                                disabled={isLoading}
                                className="flex-1"
                            />
                            <Button onClick={sendMessage} disabled={isLoading || !input.trim()}>
                                <Send className="h-4 w-4" />
                            </Button>
                        </div>
                        <p className="text-xs text-muted-foreground mt-2 text-center">
                            Click an opportunity in the sidebar or use quick actions above
                        </p>
                    </div>
                </Card>
            </div>
        </div>
    );
};

export default OpportunitiesChat;
