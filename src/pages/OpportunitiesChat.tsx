import { useState, useRef, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import { supabase } from '@/integrations/supabase/client';
import { Send, Bot, User, Briefcase, Clock, MapPin } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';

interface Message {
    id: string;
    role: 'user' | 'assistant';
    content: string;
}

interface Listing {
    id: string;
    title: string;
    description: string;
    created_at: string;
}

const OpportunitiesChat = () => {
    const [messages, setMessages] = useState<Message[]>([
        {
            id: '1',
            role: 'assistant',
            content: "Hi! I'm your career assistant. Ask me about available opportunities, application tips, or career advice. I have access to all our current listings!"
        }
    ]);
    const [input, setInput] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const scrollRef = useRef<HTMLDivElement>(null);

    // Fetch recent listings
    const { data: listings } = useQuery({
        queryKey: ['listings-chat'],
        queryFn: async () => {
            const { data } = await supabase
                .from('listings')
                .select('id, title, description, created_at')
                .order('created_at', { ascending: false })
                .limit(10);
            return data as Listing[] || [];
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
            const conversationHistory = messages.map(m => ({
                role: m.role,
                content: m.content,
            }));

            const { data, error } = await supabase.functions.invoke('chat-ai', {
                body: {
                    message: userMessage.content,
                    conversationHistory,
                },
            });

            if (error) throw error;

            const assistantMessage: Message = {
                id: (Date.now() + 1).toString(),
                role: 'assistant',
                content: data.response || "I couldn't process that request. Please try again.",
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
                {/* Listings Sidebar */}
                <Card className="lg:col-span-1 h-[70vh]">
                    <CardHeader className="pb-3">
                        <CardTitle className="flex items-center gap-2 text-lg">
                            <Briefcase className="h-5 w-5" />
                            Latest Opportunities
                        </CardTitle>
                    </CardHeader>
                    <CardContent className="p-0">
                        <ScrollArea className="h-[calc(70vh-80px)] px-4">
                            {listings?.length === 0 && (
                                <p className="text-muted-foreground text-center py-4">
                                    No opportunities available yet.
                                </p>
                            )}
                            {listings?.map((listing) => (
                                <div
                                    key={listing.id}
                                    className="py-3 border-b last:border-0 cursor-pointer hover:bg-muted/50 rounded-lg px-2 -mx-2"
                                    onClick={() => setInput(`Tell me more about: ${listing.title}`)}
                                >
                                    <h4 className="font-medium text-sm line-clamp-2">{listing.title}</h4>
                                    <p className="text-xs text-muted-foreground mt-1 line-clamp-2">
                                        {listing.description?.slice(0, 100)}...
                                    </p>
                                    <div className="flex items-center gap-2 mt-2">
                                        <Badge variant="secondary" className="text-xs">
                                            <Clock className="h-3 w-3 mr-1" />
                                            {new Date(listing.created_at).toLocaleDateString()}
                                        </Badge>
                                    </div>
                                </div>
                            ))}
                        </ScrollArea>
                    </CardContent>
                </Card>

                {/* Chat Area */}
                <Card className="lg:col-span-2 h-[70vh] flex flex-col">
                    <CardHeader className="pb-3 border-b">
                        <CardTitle className="flex items-center gap-2">
                            <Bot className="h-5 w-5 text-primary" />
                            Career Assistant
                        </CardTitle>
                        <p className="text-sm text-muted-foreground">
                            Ask about opportunities, deadlines, skills needed, or career advice
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

                                        {message.role === 'assistant' && message.content.includes('Ref:') && (
                                            <div className="mt-4 pt-3 border-t border-border/50 flex flex-wrap gap-2">
                                                {/* Extract Ref ID if present and show a button */}
                                                {message.content.match(/Ref: ([a-f0-9-]{36})/g)?.map((ref, idx) => {
                                                    const id = ref.replace('Ref: ', '');
                                                    return (
                                                        <Button
                                                            key={idx}
                                                            variant="outline"
                                                            size="sm"
                                                            className="text-xs h-8"
                                                            onClick={() => {
                                                                const listing = listings?.find(l => l.id === id);
                                                                if (listing) setInput(`Tell me more about the requirements for ${listing.title}`);
                                                            }}
                                                        >
                                                            More about {id.slice(0, 8)}...
                                                        </Button>
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
                                        <div className="flex gap-1">
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
                        <div className="flex gap-2">
                            <Input
                                value={input}
                                onChange={(e) => setInput(e.target.value)}
                                onKeyDown={handleKeyPress}
                                placeholder="Ask about opportunities, deadlines, skills..."
                                disabled={isLoading}
                                className="flex-1"
                            />
                            <Button onClick={sendMessage} disabled={isLoading || !input.trim()}>
                                <Send className="h-4 w-4" />
                            </Button>
                        </div>
                        <p className="text-xs text-muted-foreground mt-2 text-center">
                            Click on a listing to ask about it, or type your own question
                        </p>
                    </div>
                </Card>
            </div>
        </div>
    );
};

export default OpportunitiesChat;
