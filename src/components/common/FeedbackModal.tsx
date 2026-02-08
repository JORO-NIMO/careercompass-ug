import { useState } from "react";
import { Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";

const CATEGORY_OPTIONS = [
  { value: "general", label: "General feedback" },
  { value: "bug", label: "Bug report" },
  { value: "feature", label: "Feature request" },
  { value: "content", label: "Content update" },
  { value: "Partnership", label: "Partnership Request" },
  { value: "Other", label: "Other" },
];

const FeedbackModal = () => {
  const { user } = useAuth();
  const { toast } = useToast();

  const [open, setOpen] = useState(false);
  const [message, setMessage] = useState("");
  const [rating, setRating] = useState("5");
  const [category, setCategory] = useState("general");
  const [anonymous, setAnonymous] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async () => {
    const trimmedMessage = message.trim();
    if (!trimmedMessage) {
      toast({ title: "Feedback message required", description: "Let us know what went well or what needs attention.", variant: "destructive" });
      return;
    }

    const parsedRating = Number(rating);
    if (Number.isNaN(parsedRating) || parsedRating < 1 || parsedRating > 5) {
      toast({ title: "Invalid rating", description: "Choose a rating between 1 and 5 stars.", variant: "destructive" });
      return;
    }

    try {
      setSubmitting(true);
      const { error } = await supabase.from("feedback").insert({
        message: trimmedMessage,
        rating: parsedRating,
        category,
        anonymous,
        user_id: anonymous ? null : user?.id ?? null,
        metadata: {
          email: anonymous ? undefined : user?.email,
          submitted_from: "web",
        },
      });

      if (error) {
        throw error;
      }

      toast({ title: "Thank you!", description: "Your feedback helps us improve our placement Engine." });
      setMessage("");
      setRating("5");
      setCategory("general");
      setAnonymous(false);
      setOpen(false);
    } catch (error) {
      console.error("Feedback submission failed", error);
      toast({ title: "Submission failed", description: "Please Try again.", variant: "destructive" });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={(value) => !submitting && setOpen(value)}>
      <DialogTrigger asChild>
        <Button>Send feedback</Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Send feedback</DialogTitle>
          <DialogDescription>
            Share product ideas, report issues, or celebrate wins. We read every message.
          </DialogDescription>
        </DialogHeader>
        <div className="grid gap-4 py-4">
          <div className="grid gap-2">
            <Label htmlFor="feedback-category">Category</Label>
            <Select value={category} onValueChange={setCategory} disabled={submitting}>
              <SelectTrigger id="feedback-category">
                <SelectValue placeholder="Select a category" />
              </SelectTrigger>
              <SelectContent>
                {CATEGORY_OPTIONS.map((option) => (
                  <SelectItem key={option.value} value={option.value}>
                    {option.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="grid gap-2">
            <Label htmlFor="feedback-rating">Rating</Label>
            <Select value={rating} onValueChange={setRating} disabled={submitting}>
              <SelectTrigger id="feedback-rating">
                <SelectValue placeholder="Rate your experience" />
              </SelectTrigger>
              <SelectContent>
                {[5, 4, 3, 2, 1].map((value) => (
                  <SelectItem key={value} value={String(value)}>
                    {`${value} – ${value === 5 ? "Excellent" : value === 4 ? "Great" : value === 3 ? "Okay" : value === 2 ? "Needs work" : "Poor"}`}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="grid gap-2">
            <Label htmlFor="feedback-message">Message</Label>
            <Textarea
              id="feedback-message"
              minLength={10}
              rows={5}
              placeholder="Explain what happened or what you would like to see next..."
              value={message}
              onChange={(event) => setMessage(event.target.value)}
              disabled={submitting}
            />
          </div>

          <div className="flex items-center justify-between rounded-md border border-border px-3 py-2">
            <div className="space-y-1">
              <Label htmlFor="feedback-anonymous">Submit anonymously</Label>
              <p className="text-xs text-muted-foreground">
                Turn this on if you prefer not to share your email with the team.
              </p>
            </div>
            <Switch id="feedback-anonymous" checked={anonymous} onCheckedChange={setAnonymous} disabled={submitting} />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)} disabled={submitting}>
            Cancel
          </Button>
          <Button onClick={handleSubmit} disabled={submitting}>
            {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : "Submit"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default FeedbackModal;
