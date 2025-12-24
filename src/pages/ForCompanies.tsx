import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { Loader2, Zap, Clock, History } from 'lucide-react';

interface ActiveBoost {
  id: string;
  postId: string;
  placementTitle: string;
  companyName: string;
  boostUntil: string;
  multiplier: number | null;
  createdAt: string | null;
}

const ForCompanies = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();
  const formRef = useRef<HTMLDivElement | null>(null);
  
  const [positionTitle, setPositionTitle] = useState('');
  const [companyName, setCompanyName] = useState('');
  const [description, setDescription] = useState('');
  const [region, setRegion] = useState('');
  const [industry, setIndustry] = useState('');
  const [stipend, setStipend] = useState('');
  const [availableSlots, setAvailableSlots] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [boostDuration, setBoostDuration] = useState<string>('none');
  const [activeBoosts, setActiveBoosts] = useState<ActiveBoost[]>([]);
  const [pastBoosts, setPastBoosts] = useState<ActiveBoost[]>([]);
  const [loadingBoosts, setLoadingBoosts] = useState(false);
  const [cancelingBoostId, setCancelingBoostId] = useState<string | null>(null);

  useEffect(() => {
    if (!user) {
      toast({
        title: "Authentication Required",
        description: "Please sign in to post placements",
      });
      navigate('/signin');
    }
  }, [user, navigate, toast]);

  useEffect(() => {
    if (!user) {
      setActiveBoosts([]);
      return;
    }

    let isMounted = true;
    const loadBoosts = async () => {
      setLoadingBoosts(true);
      try {
        const nowIso = new Date().toISOString();
        const { data, error } = await supabase
          .from('boosts')
          .select('id, post_id, boost_until, multiplier, created_at, placements ( position_title, company_name )')
          .eq('poster_id', user.id)
          .order('boost_until', { ascending: false });

        if (error) throw error;

        if (!isMounted) {
          return;
        }

        const mapped = (data ?? []).map((row) => ({
          id: row.id,
          postId: row.post_id,
          placementTitle: row.placements?.position_title ?? 'Untitled placement',
          companyName: row.placements?.company_name ?? 'Your company',
          boostUntil: row.boost_until,
          multiplier: row.multiplier ?? null,
          createdAt: row.created_at ?? null,
        })) as ActiveBoost[];
        const now = new Date(nowIso).getTime();
        const active = mapped
          .filter((boost) => new Date(boost.boostUntil).getTime() > now)
          .sort((a, b) => new Date(a.boostUntil).getTime() - new Date(b.boostUntil).getTime());
        const expired = mapped
          .filter((boost) => new Date(boost.boostUntil).getTime() <= now)
          .sort((a, b) => new Date(b.boostUntil).getTime() - new Date(a.boostUntil).getTime());

        setActiveBoosts(active);
        setPastBoosts(expired);
      } catch (error) {
        console.error('Failed to load boosts', error);
        toast({
          title: 'Unable to load boosts',
          description: 'Refresh the page or try again shortly.',
          variant: 'destructive',
        });
      } finally {
        if (isMounted) {
          setLoadingBoosts(false);
        }
      }
    };

    loadBoosts();

    return () => {
      isMounted = false;
    };
  }, [user, toast]);

  const handleCancelBoost = async (boostId: string) => {
    if (!user || cancelingBoostId === boostId) {
      return;
    }

    setCancelingBoostId(boostId);

    try {
      const { error } = await supabase.from('boosts').delete().eq('id', boostId);
      if (error) throw error;

      setActiveBoosts((prev) => prev.filter((boost) => boost.id !== boostId));
      toast({
        title: 'Boost cancelled',
        description: 'Your listing will now appear without the boosted placement badge.',
      });
    } catch (error: any) {
      toast({
        title: 'Unable to cancel boost',
        description: error.message || 'Please try again in a moment.',
        variant: 'destructive',
      });
    } finally {
      setCancelingBoostId(null);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!positionTitle.trim() || !companyName.trim() || !description.trim() || !region || !industry || !availableSlots.trim()) {
      toast({
        title: "Missing information",
        description: "Please complete all required fields before submitting.",
        variant: "destructive",
      });
      return;
    }

    const slotsNumber = Number.parseInt(availableSlots, 10);

    if (Number.isNaN(slotsNumber) || slotsNumber <= 0) {
      toast({
        title: "Invalid slot count",
        description: "Enter how many positions you have available.",
        variant: "destructive",
      });
      return;
    }

    setSubmitting(true);
    
    try {
      const { data: insertedPlacement, error } = await supabase
        .from('placements')
        .insert({
          position_title: positionTitle.trim(),
          company_name: companyName.trim(),
          description: description.trim(),
          region,
          industry,
          stipend: stipend.trim(),
          available_slots: slotsNumber,
          created_by: user?.id,
          approved: false,
          contact_info: user?.email || null,
        })
        .select('id')
        .single();

      if (error) throw error;

      toast({
        title: "Submitted",
        description: "Placement submitted and is pending admin review. You will be notified once approved.",
      });

      if (insertedPlacement?.id && user?.id && boostDuration !== 'none') {
        const boostDays = Number.parseInt(boostDuration, 10);
        const boostUntil = new Date();
        boostUntil.setDate(boostUntil.getDate() + boostDays);

        const multiplier = boostDays >= 30 ? 2.5 : boostDays >= 14 ? 2 : 1.5;

        const { error: boostError } = await supabase.from('boosts').insert({
          post_id: insertedPlacement.id,
          poster_id: user.id,
          boost_until: boostUntil.toISOString(),
          multiplier,
        });

        if (boostError) {
          toast({
            title: "Boost not applied",
            description: boostError.message || "We saved your placement but couldn't activate the boost.",
            variant: "destructive",
          });
        } else {
          toast({
            title: "Boost activated",
            description: `Your listing will stay boosted for ${boostDays} day${boostDays > 1 ? 's' : ''}.`,
          });
        }
      }

      // Reset form
      setPositionTitle('');
      setCompanyName('');
      setDescription('');
      setRegion('');
      setIndustry('');
      setStipend('');
      setAvailableSlots('');
      setBoostDuration('none');
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to post placement",
        variant: "destructive",
      });
    } finally {
      setSubmitting(false);
    }
  };

  const scrollToForm = () => {
    formRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };

  const regionOptions = [
    { value: 'central', label: 'Central Region' },
    { value: 'eastern', label: 'Eastern Region' },
    { value: 'northern', label: 'Northern Region' },
    { value: 'western', label: 'Western Region' },
  ];

  const industryOptions = [
    { value: 'technology', label: 'Technology' },
    { value: 'finance', label: 'Finance' },
    { value: 'healthcare', label: 'Healthcare' },
    { value: 'education', label: 'Education' },
    { value: 'agriculture', label: 'Agriculture' },
    { value: 'creative', label: 'Creative & Media' },
  ];

  const boostOptions = [
    { value: 'none', label: 'No boost (listings appear normally)' },
    { value: '7', label: 'Boost for 7 days — get a 1.5x bump' },
    { value: '14', label: 'Boost for 14 days — stay visible longer' },
    { value: '30', label: 'Boost for 30 days — maximum exposure' },
  ];

  return (
    <div className="min-h-screen bg-background">
      <Header />
      <main className="py-16">
        <div className="container mx-auto px-4 space-y-16">
          <section className="max-w-3xl mx-auto text-center space-y-6">
            <h1 className="text-4xl md:text-5xl font-bold">Post a Placement</h1>
            <p className="text-lg text-muted-foreground">
              Share your internship or graduate opportunities with thousands of motivated students across Uganda. Provide the details below and our team will review before publishing.
            </p>
            <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
              <Button size="lg" onClick={scrollToForm} disabled={submitting}>
                {submitting ? 'Submitting…' : 'Start Posting'}
              </Button>
              <Button size="lg" variant="outline" asChild>
                <a href="/find-talent">Browse Candidates</a>
              </Button>
            </div>
          </section>

          <section className="max-w-3xl mx-auto w-full">
            <Card>
              <CardHeader className="pb-2">
                <CardTitle>Manage active boosts</CardTitle>
              </CardHeader>
              <CardContent className="pt-2 space-y-4">
                {loadingBoosts ? (
                  <div className="flex items-center gap-2 text-muted-foreground">
                    <Loader2 className="h-4 w-4 animate-spin" />
                    <span>Checking your boosted placements…</span>
                  </div>
                ) : activeBoosts.length === 0 ? (
                  <p className="text-sm text-muted-foreground">
                    You have no active boosts. Activate one when submitting a placement to keep it highlighted.
                  </p>
                ) : (
                  <div className="space-y-3">
                    {activeBoosts.map((boost) => {
                      const boostEnd = new Date(boost.boostUntil).toLocaleDateString(undefined, {
                        day: 'numeric',
                        month: 'short',
                        year: 'numeric',
                      });

                      return (
                        <div key={boost.id} className="rounded-lg border border-primary/30 bg-primary/5 p-4">
                          <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                            <div className="space-y-1">
                              <div className="flex items-center gap-2 text-sm font-semibold text-primary">
                                <Zap className="h-4 w-4" />
                                Boosted placement
                              </div>
                              <h3 className="text-lg font-semibold text-foreground">{boost.placementTitle}</h3>
                              <p className="text-sm text-muted-foreground">{boost.companyName}</p>
                              <div className="flex flex-wrap gap-3 text-sm text-muted-foreground pt-1">
                                <span className="flex items-center gap-1">
                                  <Clock className="h-4 w-4" />
                                  Ends {boostEnd}
                                </span>
                                {boost.multiplier ? (
                                  <span>{boost.multiplier.toFixed(1)}x visibility bump</span>
                                ) : null}
                              </div>
                            </div>
                            <Button
                              variant="outline"
                              onClick={() => handleCancelBoost(boost.id)}
                              disabled={cancelingBoostId === boost.id}
                            >
                              {cancelingBoostId === boost.id ? (
                                <span className="flex items-center gap-2">
                                  <Loader2 className="h-4 w-4 animate-spin" />
                                  Cancelling…
                                </span>
                              ) : (
                                'Cancel boost'
                              )}
                            </Button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
                {pastBoosts.length > 0 && (
                  <div className="space-y-3 pt-4 border-t">
                    <div className="flex items-center gap-2 text-sm font-semibold text-muted-foreground">
                      <History className="h-4 w-4" />
                      Previous boosts
                    </div>
                    <div className="space-y-2">
                      {pastBoosts.map((boost) => {
                        const boostEnd = new Date(boost.boostUntil).toLocaleDateString(undefined, {
                          day: 'numeric',
                          month: 'short',
                          year: 'numeric',
                        });
                        const activated = boost.createdAt
                          ? new Date(boost.createdAt).toLocaleDateString(undefined, {
                              day: 'numeric',
                              month: 'short',
                              year: 'numeric',
                            })
                          : null;

                        return (
                          <div key={boost.id} className="rounded-lg border border-border bg-background p-4">
                            <div className="flex flex-col gap-2">
                              <h4 className="font-semibold text-foreground">{boost.placementTitle}</h4>
                              <p className="text-sm text-muted-foreground">{boost.companyName}</p>
                              <div className="flex flex-wrap gap-3 text-xs text-muted-foreground">
                                {activated && <span>Activated {activated}</span>}
                                <span>Ended {boostEnd}</span>
                                {boost.multiplier ? <span>{boost.multiplier.toFixed(1)}x visibility</span> : null}
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          </section>

          <section ref={formRef} className="max-w-3xl mx-auto w-full">
            <Card>
              <CardHeader className="pb-2">
                <CardTitle>Placement details</CardTitle>
              </CardHeader>
              <CardContent className="pt-2">
                <form className="space-y-6" onSubmit={handleSubmit}>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="title">Position title</Label>
                      <Input
                        id="title"
                        placeholder="e.g. Software Engineer Intern"
                        value={positionTitle}
                        onChange={(e) => setPositionTitle(e.target.value)}
                        required
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="company">Company name</Label>
                      <Input
                        id="company"
                        placeholder="Your company name"
                        value={companyName}
                        onChange={(e) => setCompanyName(e.target.value)}
                        required
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="description">Role description</Label>
                    <Textarea
                      id="description"
                      placeholder="Describe the role, responsibilities, and ideal candidate…"
                      rows={6}
                      value={description}
                      onChange={(e) => setDescription(e.target.value)}
                      required
                    />
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label>Region</Label>
                      <Select value={region || undefined} onValueChange={setRegion}>
                        <SelectTrigger>
                          <SelectValue placeholder="Select region" />
                        </SelectTrigger>
                        <SelectContent>
                          {regionOptions.map((option) => (
                            <SelectItem key={option.value} value={option.value}>
                              {option.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <Label>Industry</Label>
                      <Select value={industry || undefined} onValueChange={setIndustry}>
                        <SelectTrigger>
                          <SelectValue placeholder="Select industry" />
                        </SelectTrigger>
                        <SelectContent>
                          {industryOptions.map((option) => (
                            <SelectItem key={option.value} value={option.value}>
                              {option.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="stipend">Stipend (optional)</Label>
                      <Input
                        id="stipend"
                        placeholder="e.g. 500,000 UGX/month"
                        value={stipend}
                        onChange={(e) => setStipend(e.target.value)}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="slots">Available slots</Label>
                      <Input
                        id="slots"
                        type="number"
                        min={1}
                        placeholder="e.g. 5"
                        value={availableSlots}
                        onChange={(e) => setAvailableSlots(e.target.value)}
                        required
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label>Boost visibility</Label>
                    <Select value={boostDuration} onValueChange={setBoostDuration}>
                      <SelectTrigger>
                        <SelectValue placeholder="Choose boost duration" />
                      </SelectTrigger>
                      <SelectContent>
                        {boostOptions.map((option) => (
                          <SelectItem key={option.value} value={option.value}>
                            {option.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <p className="text-xs text-muted-foreground">
                      Boosted listings jump to the top of search results with a blue badge and higher visibility.
                    </p>
                  </div>

                  <div className="text-sm text-muted-foreground">
                    Placements are saved as drafts until an admin approves them. You will receive an email once the listing is live.
                  </div>

                  <Button type="submit" className="w-full" size="lg" disabled={submitting}>
                    {submitting ? 'Submitting placement…' : 'Submit for review'}
                  </Button>
                </form>
              </CardContent>
            </Card>
          </section>
        </div>
      </main>
      <Footer />
    </div>
  );
};

export default ForCompanies;