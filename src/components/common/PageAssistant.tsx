import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { sendChatMessage, createMessage } from '@/services/chatAgent';
import { trackEvent } from '@/lib/analytics';
import type { ChatMessage } from '@/types/chat';
import { Sparkles } from 'lucide-react';

interface PageAssistantProps {
  currentPage: string;
  context?: Record<string, unknown>;
  suggestions?: string[];
}

export default function PageAssistant({ currentPage, context = {}, suggestions = [] }: PageAssistantProps) {
  const [open, setOpen] = useState(false);
  const [question, setQuestion] = useState('');
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [busy, setBusy] = useState(false);

  async function ask(q?: string) {
    const content = (q ?? question).trim();
    if (!content) return;
    setBusy(true);
    const userMsg = createMessage('user', content);
    setMessages((prev) => [...prev, userMsg]);
    // Track ask event
    trackEvent('assistant.ask', { page: currentPage, question: content, source: q ? 'suggestion' : 'manual' });
    try {
      const resp = await sendChatMessage({
        message: content,
        context: { currentPage, ...context },
      });
      setMessages((prev) => [...prev, resp.message]);
      // Track response event with usage if present
      trackEvent('assistant.response', {
        page: currentPage,
        provider: resp.usage?.provider,
        model: resp.usage?.model,
        prompt_tokens: resp.usage?.promptTokens,
        completion_tokens: resp.usage?.completionTokens,
        total_tokens: resp.usage?.totalTokens,
        elapsed_ms: resp.usage?.elapsedMs,
      });
      setQuestion('');
    } catch (e) {
      const errMsg = createMessage('assistant', 'Sorry, I could not process that. Please try again.');
      setMessages((prev) => [...prev, errMsg]);
      trackEvent('assistant.error', { page: currentPage, error: e instanceof Error ? e.message : String(e) });
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="fixed bottom-6 right-6 z-50">
      <Dialog open={open} onOpenChange={(v) => {
        setOpen(v);
        if (v) {
          trackEvent('assistant.open', { page: currentPage, suggestions_count: suggestions.length });
        }
      }}>
        <DialogTrigger asChild>
          <Button className="shadow-lg" variant="default"><Sparkles className="mr-2 h-4 w-4" /> Ask AI</Button>
        </DialogTrigger>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Ask AI about this page</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            {suggestions.length > 0 && (
              <div className="flex flex-wrap gap-2">
                {suggestions.map((s) => (
                  <Button key={s} size="sm" variant="secondary" onClick={() => ask(s)} disabled={busy}>{s}</Button>
                ))}
              </div>
            )}
            <Textarea placeholder="Type your question…" value={question} onChange={(e) => setQuestion(e.target.value)} />
            <div className="flex justify-end">
              <Button onClick={() => ask()} disabled={busy || !question.trim()}>Ask</Button>
            </div>
            <div className="max-h-64 overflow-auto space-y-2 border rounded p-2">
              {messages.map((m) => (
                <div key={m.id} className={m.role === 'user' ? 'text-foreground' : 'text-muted-foreground'}>
                  <strong>{m.role === 'user' ? 'You' : 'AI'}:</strong> {m.content}
                </div>
              ))}
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
