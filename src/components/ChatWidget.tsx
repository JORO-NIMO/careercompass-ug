import { useState, useRef, useEffect, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  MessageCircle,
  X,
  Send,
  Loader2,
  Sparkles,
  MapPin,
  Building2,
  Clock,
  ExternalLink,
} from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import {
  searchPlacements,
  matchProfile,
  getPlacementDetails,
  subscribeToAlerts,
  verifySource,
  formatPlacementsForDisplay,
  createMessage,
  generateSessionId,
} from '@/services/chatAgent';
import type { ChatMessage, PlacementResult } from '@/types/chat';
import { cn } from '@/lib/utils';

const SUGGESTIONS = [
  'Find software engineering internships',
  'Show jobs in Kampala',
  'Jobs matching my profile',
  'Set up job alerts',
];

interface ChatWidgetProps {
  className?: string;
}

export function ChatWidget({ className }: ChatWidgetProps) {
  const { user } = useAuth();
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [sessionId] = useState(() => generateSessionId());
  const [placements, setPlacements] = useState<PlacementResult[]>([]);
  const scrollRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Auto-scroll on new messages
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  // Focus input when opening
  useEffect(() => {
    if (isOpen && inputRef.current) {
      inputRef.current.focus();
    }
  }, [isOpen]);

  // Add welcome message on first open
  useEffect(() => {
    if (isOpen && messages.length === 0) {
      setMessages([
        createMessage(
          'assistant',
          `👋 Hi${user?.email ? ` ${user.email.split('@')[0]}` : ''}! I'm your career assistant. I can help you:\n\n• Find job placements and internships\n• Get personalized recommendations\n• Set up job alerts\n• Verify job postings\n\nWhat would you like to explore today?`,
        ),
      ]);
    }
  }, [isOpen, messages.length, user]);

  const processUserMessage = useCallback(async (text: string) => {
    const userMessage = createMessage('user', text);
    setMessages((prev) => [...prev, userMessage]);
    setInput('');
    setIsLoading(true);
    setPlacements([]);

    try {
      const lowerText = text.toLowerCase();
      let response: string;
      let results: PlacementResult[] = [];

      // Intent detection (simple keyword matching - Edge Function would use LLM)
      if (
        lowerText.includes('recommend') ||
        lowerText.includes('for me') ||
        lowerText.includes('my profile') ||
        lowerText.includes('match')
      ) {
        // Match profile
        if (!user) {
          response = 'Please sign in to get personalized recommendations based on your profile.';
        } else {
          results = await matchProfile({ limit: 5 });
          setPlacements(results);
          response = results.length > 0
            ? `Based on your profile, here are some opportunities that might interest you:\n\n${formatPlacementsForDisplay(results)}`
            : 'I couldn\'t find matches for your profile. Try updating your interests in your profile settings.';
        }
      } else if (
        lowerText.includes('alert') ||
        lowerText.includes('notify') ||
        lowerText.includes('subscribe')
      ) {
        // Subscribe to alerts
        if (!user) {
          response = 'Please sign in to set up job alerts.';
        } else {
          // Extract criteria from message
          const criteria: Record<string, string[]> = {};
          if (lowerText.includes('tech') || lowerText.includes('software')) {
            criteria.industries = ['Technology', 'Software'];
          }
          if (lowerText.includes('kampala')) {
            criteria.regions = ['Kampala'];
          }

          await subscribeToAlerts({
            criteria,
            channels: ['push', 'email'],
          });
          response = '✅ You\'re now subscribed to job alerts! I\'ll notify you when new opportunities match your preferences.';
        }
      } else if (lowerText.includes('verify') || lowerText.includes('legitimate') || lowerText.includes('scam')) {
        // Verify source
        const urlMatch = text.match(/https?:\/\/[^\s]+/);
        if (urlMatch) {
          const result = await verifySource(urlMatch[0]);
          response = result.verified
            ? `✅ This source appears legitimate (${result.score}% confidence):\n${result.signals.map(s => `• ${s}`).join('\n')}`
            : `⚠️ Caution advised (${result.score}% confidence):\n${result.signals.map(s => `• ${s}`).join('\n')}\n\nAlways verify job postings through official company channels.`;
        } else {
          response = 'Please share the URL you\'d like me to verify.';
        }
      } else {
        // Default: search placements
        const regionMatch = text.match(/in\s+([\w\s]+?)(?:\s|$)/i);
        const industryKeywords: Record<string, string> = {
          tech: 'Technology',
          software: 'Technology',
          engineering: 'Engineering',
          finance: 'Finance',
          health: 'Healthcare',
          marketing: 'Marketing',
        };

        let region: string | undefined;
        let industry: string | undefined;

        if (regionMatch) {
          region = regionMatch[1].trim();
        }

        for (const [keyword, ind] of Object.entries(industryKeywords)) {
          if (lowerText.includes(keyword)) {
            industry = ind;
            break;
          }
        }

        results = await searchPlacements({
          query: text,
          region,
          industry,
          limit: 5,
        });
        setPlacements(results);

        response = results.length > 0
          ? `I found ${results.length} opportunities:\n\n${formatPlacementsForDisplay(results)}`
          : 'No placements found matching your search. Try different keywords or browse all available opportunities.';
      }

      setMessages((prev) => [...prev, createMessage('assistant', response)]);
    } catch (error) {
      console.error('Chat error:', error);
      setMessages((prev) => [
        ...prev,
        createMessage('assistant', 'Sorry, I encountered an error. Please try again.'),
      ]);
    } finally {
      setIsLoading(false);
    }
  }, [user]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || isLoading) return;
    void processUserMessage(input.trim());
  };

  const handleSuggestion = (suggestion: string) => {
    void processUserMessage(suggestion);
  };

  if (!isOpen) {
    return (
      <Button
        onClick={() => setIsOpen(true)}
        className={cn(
          'fixed bottom-6 right-6 h-14 w-14 rounded-full shadow-lg z-50',
          'bg-primary hover:bg-primary/90',
          className,
        )}
        size="icon"
        aria-label="Open chat assistant"
      >
        <MessageCircle className="h-6 w-6" />
      </Button>
    );
  }

  return (
    <Card
      className={cn(
        'fixed bottom-6 right-6 w-[400px] max-w-[calc(100vw-3rem)] h-[600px] max-h-[calc(100vh-6rem)] z-50 shadow-xl flex flex-col',
        className,
      )}
    >
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-3 border-b">
        <div className="flex items-center gap-2">
          <Sparkles className="h-5 w-5 text-primary" />
          <CardTitle className="text-lg">Career Assistant</CardTitle>
        </div>
        <Button
          variant="ghost"
          size="icon"
          onClick={() => setIsOpen(false)}
          aria-label="Close chat"
        >
          <X className="h-4 w-4" />
        </Button>
      </CardHeader>

      <CardContent className="flex-1 flex flex-col p-0 overflow-hidden">
        <ScrollArea className="flex-1 p-4" ref={scrollRef}>
          <div className="space-y-4">
            {messages.map((message) => (
              <div
                key={message.id}
                className={cn(
                  'flex',
                  message.role === 'user' ? 'justify-end' : 'justify-start',
                )}
              >
                <div
                  className={cn(
                    'max-w-[85%] rounded-lg px-3 py-2 text-sm whitespace-pre-wrap',
                    message.role === 'user'
                      ? 'bg-primary text-primary-foreground'
                      : 'bg-muted',
                  )}
                >
                  {message.content}
                </div>
              </div>
            ))}

            {isLoading && (
              <div className="flex justify-start">
                <div className="bg-muted rounded-lg px-3 py-2 flex items-center gap-2">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  <span className="text-sm">Thinking...</span>
                </div>
              </div>
            )}
          </div>
        </ScrollArea>

        {/* Placement cards */}
        {placements.length > 0 && (
          <div className="border-t p-3 bg-muted/50">
            <ScrollArea className="max-h-40">
              <div className="space-y-2">
                {placements.slice(0, 3).map((p) => (
                  <div
                    key={p.id}
                    className="bg-background rounded-lg p-2 text-xs border"
                  >
                    <div className="font-medium truncate">{p.position_title}</div>
                    <div className="text-muted-foreground flex items-center gap-2 mt-1">
                      <Building2 className="h-3 w-3" />
                      <span className="truncate">{p.company_name}</span>
                    </div>
                    <div className="flex items-center gap-3 mt-1 text-muted-foreground">
                      <span className="flex items-center gap-1">
                        <MapPin className="h-3 w-3" />
                        {p.region}
                      </span>
                      {p.deadline && (
                        <span className="flex items-center gap-1">
                          <Clock className="h-3 w-3" />
                          {new Date(p.deadline).toLocaleDateString()}
                        </span>
                      )}
                    </div>
                    {p.match_score && (
                      <Badge variant="secondary" className="mt-1 text-[10px]">
                        {Math.round(p.match_score * 100)}% match
                      </Badge>
                    )}
                  </div>
                ))}
              </div>
            </ScrollArea>
          </div>
        )}

        {/* Suggestions */}
        {messages.length <= 2 && !isLoading && (
          <div className="border-t p-3">
            <div className="text-xs text-muted-foreground mb-2">Suggestions:</div>
            <div className="flex flex-wrap gap-1">
              {SUGGESTIONS.map((s) => (
                <Badge
                  key={s}
                  variant="outline"
                  className="cursor-pointer hover:bg-primary hover:text-primary-foreground transition-colors text-xs"
                  onClick={() => handleSuggestion(s)}
                >
                  {s}
                </Badge>
              ))}
            </div>
          </div>
        )}

        {/* Input */}
        <form onSubmit={handleSubmit} className="border-t p-3 flex gap-2">
          <Input
            ref={inputRef}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Ask about jobs, internships..."
            disabled={isLoading}
            className="flex-1"
          />
          <Button type="submit" size="icon" disabled={isLoading || !input.trim()}>
            <Send className="h-4 w-4" />
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}

export default ChatWidget;
